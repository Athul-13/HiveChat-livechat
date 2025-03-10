const User = require('../models/User');
const {generateAccessToken, generateRefreshToken} = require('../utils/tokenUtils');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        const {firstName, lastName, username, phoneNo, email, password} = req.body;
        
        if(!email) {
            return res.status(400).json({message: 'Email is required'})
        }

        if(!username) {
            return res.status(400).json({message: 'Username is required'})
        }

        const userEmailExist = await User.findOne({email});
        const userUsernameExist = await User.findOne({username});

        if(userEmailExist) {
            return res.status(400).json({message: "User already exists"})
        }

        if(userUsernameExist) {
            return res.status(400).json({message: "User already exists"})
        }

        const user = new User({
            firstName,
            lastName,
            username,
            phoneNo,
            email,
            password,
            status: 'active',
            role: 'user'
        });

        await user.save();

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                phoneNo: user.phoneNo,
                email: user.email,
                status: user.status,
                role: user.role
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({message: err.message});
    }
}

exports.login = async(req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({email});

        if (user.status === 'inactive') {
            return res.status(403).json({
                message: 'User has been blocked from logging in',
                showToast: true, 
            });
        }

        if(!user || !(await user.matchPassword(password))) {
            return res.status(401).json({message: 'Invalid email or password'});
        }

        const accessToken = generateAccessToken(user._id, user.role);
        const refreshToken = generateRefreshToken(user._id);

        user.refreshToken = refreshToken;
        await user.save();

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: false, 
            sameSite: 'Strict', 
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePicture: user.profilePicture,
            username: user.username,
            about: user.about,
            phoneNo: user.phoneNo,
            email: user.email,
            status: user.status,
            role: user.role,
            accessToken
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({message: err.message});
    }
}

exports.logout = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        user.refreshToken = null;
        
        await user.save();

        res.clearCookie('refreshToken', { path: '/' });
        
        res.json({message: 'logout successfull'});
    } catch (err) {
        res.status(500).json({message: err.message});
    }
};

exports.refreshToken = async (req, res) => {
    try {
        const {refreshToken} = req.body;

        if(!refreshToken) {
            return res.status(401).json({message: 'token not provided'});
        }

        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decoded.userId);

        if(!user || user.refreshToken !== refreshToken) {
            return res.status(401).json({message: 'invalid token'});
        }

        const accessToken = generateAccessToken(user._id, user.role);
        const newRefreshToken = generateRefreshToken(user._id);

        user.refreshToken = newRefreshToken;
        await user.save();

        res.json({accessToken, refreshToken: newRefreshToken});
    } catch (err) {
        res.status(401).json({message: 'invalid token'});
    }
}
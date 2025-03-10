const jwt = require('jsonwebtoken');

const generateAccessToken = (userId, role) => {
    try {
        return jwt.sign(
            {userId, role},
            process.env.ACCESS_TOKEN_SECRET,
            {expiresIn: '35m'}
        );
    } catch (err) {
        console.error('Error generating access token:', error);
    }
};

const generateRefreshToken = (userId, role) => {
    return jwt.sign(
        {userId, role},
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn: '7d'}
    );
};

module.exports = {generateAccessToken, generateRefreshToken};
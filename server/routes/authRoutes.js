const express = require('express');
const { register, login, refreshToken, logout } = require('../controllers/authController');
const validateSignup = require('../middleware/validateMiddleware');
const {protect} =require('../middleware/authMiddleware');
const router = express.Router();

router.post('/signup', validateSignup, register);
router.post('/login', login);
router.post('/refresh', protect, refreshToken);
router.post('/logout', protect, logout);

module.exports = router;
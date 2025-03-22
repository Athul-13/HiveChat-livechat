const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { initiateCall, joinCall, endCall } = require('../controllers/agoraController');
const router = express.Router();

router.post('/initiate', protect, initiateCall);
router.put('/:callId/join', protect, joinCall);
router.put('/:callId/end', protect, endCall);

module.exports = router;
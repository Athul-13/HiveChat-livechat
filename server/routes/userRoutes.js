const express = require('express');
const { search, pending, sendRequest, fetchAllFriends, fetchFriendRequests, acceptRequest, rejectRequest, getChats, createChat, getMessages, createGroupChat } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();


router.get('/search/:query', protect, search);
router.get('/pending', protect, pending);
router.post('/send-request', protect, sendRequest);

router.get('/contacts', protect, fetchAllFriends);
router.get('/requests', protect ,fetchFriendRequests);

router.post('/accept', protect, acceptRequest);
router.post('/reject', protect, rejectRequest);

router.post('/create-chat', protect, createChat)
router.get('/getchats', protect, getChats);
router.get('/chat/:chatId', protect, getMessages);

router.post('/create-group', protect, createGroupChat)

module.exports = router;
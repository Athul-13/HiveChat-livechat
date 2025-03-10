const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

// Get all notifications for the logged-in user
router.get('/', protect, async (req, res) => {
  try {
    const notifications = await notificationController.getUserNotifications(req.user.id);
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unread notification count
router.get('/unread/count', protect, async (req, res) => {
  try {
    const count = await notificationController.getUnreadCount(req.user.id);
    res.json({ count });
  } catch (error) {
    console.error('Error counting unread notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark specific notifications as read
router.put('/read', protect, async (req, res) => {
  try {
    const { notificationIds } = req.body;
    
    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({ message: 'Notification IDs array is required' });
    }
    
    const modifiedCount = await notificationController.markAsRead(notificationIds);
    res.json({ success: true, modifiedCount });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark all notifications as read
router.put('/read/all', protect, async (req, res) => {
  try {
    const modifiedCount = await notificationController.markAllAsRead(req.user.id);
    res.json({ success: true, modifiedCount });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a notification
router.delete('/:id', protect, async (req, res) => {
  try {
    const deletedNotification = await notificationController.deleteNotification(
      req.params.id,
      req.user.id
    );
    
    if (!deletedNotification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
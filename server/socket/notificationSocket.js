const { EVENTS } = require('./socketConfig');
const notificationController = require('../controllers/notificationController');
const User = require('../models/User');

// Reference to userSocketMap from chatSocket
const { userSocketMap } = require('./chatSocket');

module.exports = function(io, socket) {
  // Handle marking notifications as read
  socket.on('markNotificationsRead', async (data) => {
    try {
      const { notificationIds, userId } = data;
      
      if (!userId) {
        return socket.emit('error', { message: 'User ID is required' });
      }
      
      let modifiedCount;
      
      if (notificationIds && notificationIds.length > 0) {
        // Mark specific notifications as read
        modifiedCount = await notificationController.markAsRead(notificationIds);
      } else {
        // Mark all notifications as read
        modifiedCount = await notificationController.markAllAsRead(userId);
      }
      
      // Emit event back to the user to confirm
      socket.emit('notificationsMarkedRead', { 
        success: true, 
        modifiedCount 
      });
      
      // Emit updated unread count
      const unreadCount = await notificationController.getUnreadCount(userId);
      socket.emit('unreadNotificationsCount', { count: unreadCount });
      
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      socket.emit('error', { message: 'Failed to mark notifications as read' });
    }
  });
  
  // Send notification
  socket.on('sendNotification', async (notificationData) => {
    try {
      const savedNotification = await notificationController.createNotification(notificationData);
      
      // Confirmation to sender
      socket.emit('notificationSent', { 
        success: true, 
        notificationId: savedNotification._id 
      });
      
    } catch (error) {
      console.error('Error sending notification:', error);
      socket.emit('error', { message: 'Failed to send notification' });
    }
  });
  
  // Request unread notification count
  socket.on('getUnreadNotificationsCount', async (userId) => {
    try {
      const count = await notificationController.getUnreadCount(userId);
      socket.emit('unreadNotificationsCount', { count });
    } catch (error) {
      console.error('Error getting unread count:', error);
      socket.emit('error', { message: 'Failed to get unread notifications count' });
    }
  });
};
const Notification = require('../models/Notification');
const { getIO } = require('../socket/socket');

class NotificationController {
  // Create and send notification
  async createNotification(notificationData) {
    try {
      const { recipient, sender, type, content, resourceId, resourceModel } = notificationData;
      
      const notification = new Notification({
        recipient,
        sender,
        type,
        content,
        resourceId,
        resourceModel,
      });
      
      const savedNotification = await notification.save();
      
      // Emit socket event for real-time notification
      const io = getIO();
      
      // Import userSocketMap here to avoid circular dependency
      const { userSocketMap } = require('../socket/chatSocket');
      
      // Get the recipient's socket ID
      const recipientSocketId = userSocketMap.get(recipient.toString());
      
      if (recipientSocketId) {
        // Populate sender info before sending
        const populatedNotification = await Notification.findById(savedNotification._id)
          .populate('sender', 'firstName lastName profilePicture')
          .populate('recipient', 'firstName lastName');
        
        io.to(recipientSocketId).emit('newNotification', populatedNotification);
      }
      
      return savedNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }
  
  // Get all notifications for a user
  async getUserNotifications(userId) {
    try {
      return await Notification.find({ recipient: userId })
        .populate('sender', 'firstName lastName profilePicture')
        .sort({ createdAt: -1 })
        .limit(50);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }
  
  // Get unread notifications count
  async getUnreadCount(userId) {
    try {
      return await Notification.countDocuments({ 
        recipient: userId,
        isRead: false
      });
    } catch (error) {
      console.error('Error counting unread notifications:', error);
      throw error;
    }
  }
  
  // Mark notifications as read
  async markAsRead(notificationIds) {
    try {
      const result = await Notification.updateMany(
        { _id: { $in: notificationIds } },
        { $set: { isRead: true } }
      );
      
      return result.modifiedCount;
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      throw error;
    }
  }
  
  // Mark all notifications as read for a user
  async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { recipient: userId, isRead: false },
        { $set: { isRead: true } }
      );
      
      return result.modifiedCount;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }
  
  // Delete a notification
  async deleteNotification(notificationId, userId) {
    try {
      return await Notification.findOneAndDelete({
        _id: notificationId,
        recipient: userId
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }
}

module.exports = new NotificationController();
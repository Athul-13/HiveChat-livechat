const notificationController = require('../controllers/notificationController');
const User = require('../models/User');

// Utility class for creating different types of notifications
class NotificationUtil {
  // Send friend request notification
  static async createFriendRequestNotification(senderId, recipientId) {
    try {
      const sender = await User.findById(senderId, 'firstName lastName');
      
      return await notificationController.createNotification({
        recipient: recipientId,
        sender: senderId,
        type: 'friendRequest',
        content: `${sender.firstName} ${sender.lastName} sent you a friend request`,
        resourceId: senderId,
        resourceModel: 'User'
      });
    } catch (error) {
      console.error('Error creating friend request notification:', error);
      throw error;
    }
  }
  
  // Send friend request accepted notification
  static async createFriendAcceptedNotification(senderId, recipientId) {
    try {
      const sender = await User.findById(senderId, 'firstName lastName');
      
      return await notificationController.createNotification({
        recipient: recipientId,
        sender: senderId,
        type: 'friendAccepted',
        content: `${sender.firstName} ${sender.lastName} accepted your friend request`,
        resourceId: senderId,
        resourceModel: 'User'
      });
    } catch (error) {
      console.error('Error creating friend accepted notification:', error);
      throw error;
    }
  }
  
  // Send added to group notification
  static async createAddedToGroupNotification(senderId, recipientId, chatId, chatName) {
    try {
      const sender = await User.findById(senderId, 'firstName lastName');
      
      return await notificationController.createNotification({
        recipient: recipientId,
        sender: senderId,
        type: 'addedToGroup',
        content: `${sender.firstName} ${sender.lastName} added you to the group "${chatName}"`,
        resourceId: chatId,
        resourceModel: 'Chat'
      });
    } catch (error) {
      console.error('Error creating added to group notification:', error);
      throw error;
    }
  }
  
  // Send new message notification
  static async createMessageNotification(senderId, recipientId, chatId, messagePreview) {
    try {
      const sender = await User.findById(senderId, 'firstName lastName');
      const truncatedMessage = messagePreview.length > 50 
        ? messagePreview.substring(0, 50) + '...' 
        : messagePreview;
      
      return await notificationController.createNotification({
        recipient: recipientId,
        sender: senderId,
        type: 'newMessage',
        content: `${sender.firstName} ${sender.lastName}: ${truncatedMessage}`,
        resourceId: chatId,
        resourceModel: 'Chat'
      });
    } catch (error) {
      console.error('Error creating message notification:', error);
      throw error;
    }
  }
}

module.exports = NotificationUtil;
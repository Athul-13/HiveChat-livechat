const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['friendRequest', 'friendAccepted', 'newMessage', 'addedToGroup'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  resourceId: {
    type: Schema.Types.ObjectId,
    refPath: 'resourceModel'
  },
  resourceModel: {
    type: String,
    enum: ['Chat', 'User', 'Message'],
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster querying of unread notifications
NotificationSchema.index({ recipient: 1, isRead: 1 });

// Create a text index for searching in content
NotificationSchema.index({ content: 'text' });

module.exports = mongoose.model('Notification', NotificationSchema);
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
}, { timestamps: true });

messageSchema.index({ chat: 1, createdAt: 1 })
messageSchema.index({ sender: 1 })

module.exports = mongoose.model('Message', messageSchema);
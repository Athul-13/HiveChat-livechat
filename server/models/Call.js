const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  initiator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  status: {
    type: String,
    enum: ['initiated', 'ringing', 'ongoing', 'ended', 'missed'],
    default: 'initiated'
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  callType: {
    type: String,
    enum: ['voice', 'video'],
    required: true
  },
  channel: {
      type: String, 
      required: true,
      unique: true,
  }
}, { timestamps: true });

callSchema.index({ chat: 1, createdAt: -1 });
callSchema.index({ initiator: 1 });
callSchema.index({ participants: 1 });

module.exports = mongoose.model('Call', callSchema);
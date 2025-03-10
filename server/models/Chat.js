const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  name: {
    type: String,
    required: function () { return this.type === 'group'; }
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  type: {
      type: String,
      enum: ['individual', 'group'],
      default: 'individual'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

chatSchema.index({ participants: 1 });
chatSchema.index({ updatedAt: -1 });
chatSchema.index({ participants: 1 }, { partialFilterExpression: { type: 'individual' } });

module.exports = mongoose.model("Chat", chatSchema);

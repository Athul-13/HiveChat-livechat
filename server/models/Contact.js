const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Ensure a user can't add the same contact multiple times
contactSchema.index({ userId: 1, contactId: 1 }, { unique: true });

module.exports = mongoose.model('Contact', contactSchema);

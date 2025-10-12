const mongoose = require('mongoose');

const streamMessageSchema = new mongoose.Schema({
  streamRoom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StreamRoom',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  senderAvatar: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['text', 'gift', 'system'],
    default: 'text'
  },
  giftData: {
    giftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gift'
    },
    giftName: String,
    giftImage: String,
    giftValue: Number
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster queries
streamMessageSchema.index({ streamRoom: 1, createdAt: -1 });
streamMessageSchema.index({ sender: 1 });

// Auto-delete old messages after 24 hours
streamMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('StreamMessage', streamMessageSchema);


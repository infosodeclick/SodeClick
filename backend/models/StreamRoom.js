const mongoose = require('mongoose');

const streamRoomSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  streamer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  streamerName: {
    type: String,
    required: true
  },
  streamerAvatar: {
    type: String,
    default: ''
  },
  streamKey: {
    type: String,
    required: true,
    unique: true
  },
  isLive: {
    type: Boolean,
    default: false
  },
  viewerCount: {
    type: Number,
    default: 0
  },
  viewers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    displayName: String,
    avatar: String,
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  thumbnail: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['music', 'talk', 'gaming', 'lifestyle', 'other'],
    default: 'talk'
  },
  tags: [{
    type: String
  }],
  startTime: {
    type: Date,
    default: null
  },
  endTime: {
    type: Date,
    default: null
  },
  totalViews: {
    type: Number,
    default: 0
  },
  likeCount: {
    type: Number,
    default: 0
  },
  settings: {
    allowComments: {
      type: Boolean,
      default: true
    },
    slowMode: {
      type: Boolean,
      default: true
    },
    slowModeDelay: {
      type: Number,
      default: 5 // seconds
    },
    requireFollowToChat: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Index for faster queries
streamRoomSchema.index({ isLive: 1, createdAt: -1 });
streamRoomSchema.index({ streamer: 1 });
// streamKey already has unique index from schema definition

// Generate unique stream key
streamRoomSchema.statics.generateStreamKey = function() {
  return `stream_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

module.exports = mongoose.model('StreamRoom', streamRoomSchema);


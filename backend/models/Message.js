const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // ข้อมูลพื้นฐานของข้อความ
  content: {
    type: String,
    required: function() {
      // ไม่ต้องการ content สำหรับรูปภาพ
      return this.messageType !== 'image';
    },
    maxlength: 2000
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chatRoom: {
    type: mongoose.Schema.Types.Mixed, // รองรับทั้ง ObjectId และ String
    required: true
  },
  
  // ประเภทของข้อความ
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'file', 'link', 'system'],
    default: 'text'
  },
  
  // สำหรับข้อความที่มีไฟล์แนบ
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'video', 'audio', 'file']
    },
    url: String,
    filename: String,
    size: Number, // bytes
    mimeType: String
  }],
  
  // สำหรับไฟล์แนบ (ใหม่)
  fileUrl: String,
  fileName: String,
  fileSize: Number,
  fileType: String,
  
  // สำหรับ link preview
  linkPreview: {
    url: String,
    title: String,
    description: String,
    image: String,
    siteName: String
  },
  
  // Reactions (หัวใจ, อีโมจิ)
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['heart', 'like', 'love', 'laugh', 'wow', 'sad', 'angry'],
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // สถานะข้อความ
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  
  // สถานะการอ่านข้อความ
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // สำหรับการตอบกลับข้อความ
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  
  // สถิติ
  stats: {
    totalReactions: {
      type: Number,
      default: 0
    },
    heartCount: {
      type: Number,
      default: 0
    },
    likeCount: {
      type: Number,
      default: 0
    }
  },
  
  // ข้อมูลการสร้าง
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// เพิ่ม index เพื่อความเร็วในการค้นหาข้อความในห้องแชท
messageSchema.index({ chatRoom: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ 'reactions.user': 1 });
messageSchema.index({ replyTo: 1 });

// Virtual สำหรับจำนวน reactions
messageSchema.virtual('reactionCount').get(function() {
  return this.reactions.length;
});

// Method สำหรับเพิ่ม reaction
messageSchema.methods.addReaction = function(userId, reactionType) {
  if (!userId) return;
  
  // ตรวจสอบว่าผู้ใช้เคย react แล้วหรือไม่
  const existingReaction = this.reactions.find(
    reaction => reaction.user && userId && reaction.user.toString() === userId.toString()
  );
  
  if (existingReaction) {
    if (existingReaction.type === reactionType) {
      // ถ้า react แบบเดิม ให้ลบออก (toggle)
      this.reactions = this.reactions.filter(
        reaction => reaction.user && userId && reaction.user.toString() !== userId.toString()
      );
    } else {
      // ถ้า react แบบใหม่ ให้เปลี่ยนประเภท
      existingReaction.type = reactionType;
      existingReaction.createdAt = new Date();
    }
  } else {
    // เพิ่ม reaction ใหม่
    this.reactions.push({
      user: userId,
      type: reactionType,
      createdAt: new Date()
    });
  }
  
  // อัปเดตสถิติ
  this.updateReactionStats();
};

// Method สำหรับลบ reaction
messageSchema.methods.removeReaction = function(userId, reactionType) {
  if (!userId) return;
  
  this.reactions = this.reactions.filter(
    reaction => !(reaction.user && userId && reaction.user.toString() === userId.toString() && reaction.type === reactionType)
  );
  this.updateReactionStats();
};

// Method สำหรับอัปเดตสถิติ reactions
messageSchema.methods.updateReactionStats = function() {
  this.stats.totalReactions = this.reactions.length;
  this.stats.heartCount = this.reactions.filter(r => r.type === 'heart').length;
  this.stats.likeCount = this.reactions.filter(r => r.type === 'like').length;
};

// Method สำหรับตรวจสอบว่าผู้ใช้ react แล้วหรือไม่
messageSchema.methods.hasUserReacted = function(userId) {
  if (!userId) return false;
  
  return this.reactions.some(
    reaction => reaction.user && userId && reaction.user.toString() === userId.toString()
  );
};

// Method สำหรับดึงประเภท reaction ของผู้ใช้
messageSchema.methods.getUserReactionType = function(userId) {
  if (!userId) return null;
  
  const reaction = this.reactions.find(
    reaction => reaction.user && userId && reaction.user.toString() === userId.toString()
  );
  return reaction ? reaction.type : null;
};

// Pre-save middleware สำหรับอัปเดต updatedAt
messageSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method สำหรับ soft delete
messageSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// Method สำหรับแก้ไขข้อความ
messageSchema.methods.editMessage = function(newContent) {
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

// Static method สำหรับดึงข้อความในห้องแชท
messageSchema.statics.getMessagesInRoom = function(roomId, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  
  return this.find({ 
    chatRoom: roomId, 
    isDeleted: false 
  })
  .populate('sender', 'username displayName membership membershipTier profileImages')
  .populate('replyTo', 'content sender')
  .populate('reactions.user', 'username displayName')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

module.exports = mongoose.model('Message', messageSchema);
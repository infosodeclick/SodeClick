const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  // สำหรับห้องแชทแบบปิด
  entryFee: {
    type: Number,
    default: 0,
    min: 0
  },
  // เงื่อนไขการเข้าห้องแชท
  entryConditions: {
    // จำนวนเหรียญที่ต้องมี
    requiredCoins: {
      type: Number,
      default: 0,
      min: 0
    },
    // เงื่อนไขพิเศษ (เช่น ต้องเป็น Premium, ต้องมีอายุขั้นต่ำ)
    specialConditions: {
      type: String,
      default: ''
    },
    // ต้องเสียเงินจริงหรือไม่
    requireRealPayment: {
      type: Boolean,
      default: false
    },
    // จำนวนเงินที่ต้องเสีย (บาท)
    realPaymentAmount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  ageRestriction: {
    minAge: {
      type: Number,
      default: 18,
      min: 18
    },
    maxAge: {
      type: Number,
      default: 100,
      max: 100
    }
  },
  // สมาชิกในห้อง
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member'
    }
  }],
  // ข้อความในห้อง
  messages: [{
    id: {
      type: mongoose.Schema.Types.ObjectId,
      default: mongoose.Types.ObjectId
    },
    sender: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      username: String,
      displayName: String,
      membershipTier: String,
      verificationBadge: Boolean
    },
    content: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'gift'],
      default: 'text'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  // สถิติ
  stats: {
    totalMembers: {
      type: Number,
      default: 0
    },
    totalMessages: {
      type: Number,
      default: 0
    },
    totalCoinsReceived: {
      type: Number,
      default: 0
    },
    totalGiftsReceived: {
      type: Number,
      default: 0
    }
  },
  // การตั้งค่า
  settings: {
    maxMembers: {
      type: Number,
      default: 100,
      min: 1,
      max: 1000
    },
    allowGifts: {
      type: Boolean,
      default: true
    },
    allowCoinGifts: {
      type: Boolean,
      default: true
    },
    moderationEnabled: {
      type: Boolean,
      default: false
    }
  },
  // Invite link
  inviteLink: {
    code: {
      type: String,
      unique: true,
      sparse: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    expiresAt: {
      type: Date
    },
    maxUses: {
      type: Number,
      default: -1 // -1 = ไม่จำกัด
    },
    usedCount: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // ข้อมูลการสร้าง
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index
chatRoomSchema.index({ owner: 1 });
chatRoomSchema.index({ type: 1 });
chatRoomSchema.index({ isActive: 1 });
chatRoomSchema.index({ 'members.user': 1 });
chatRoomSchema.index({ lastActivity: -1 });

// Virtual สำหรับจำนวนสมาชิก
chatRoomSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Method สำหรับเช็คว่าผู้ใช้เป็นสมาชิกหรือไม่
chatRoomSchema.methods.isMember = function(userId) {
  // สำหรับห้องสาธารณะ - ถือว่าเป็นสมาชิกเสมอ
  if (this.type === 'public') {
    return true;
  }
  
  // สำหรับห้องส่วนตัว - ตรวจสอบจากรายการสมาชิก
  return this.members.some(member => member.user && member.user.toString() === userId.toString());
};

// Method สำหรับเช็คว่าผู้ใช้เป็นเจ้าของหรือไม่
chatRoomSchema.methods.isOwner = function(userId) {
  return this.owner && this.owner.toString() === userId.toString();
};

// Method สำหรับเพิ่มสมาชิก
chatRoomSchema.methods.addMember = function(userId, role = 'member') {
  if (!this.isMember(userId)) {
    this.members.push({
      user: userId,
      role: role,
      joinedAt: new Date()
    });
    this.stats.totalMembers = this.members.length;
  }
};

// Method สำหรับลบสมาชิก
chatRoomSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(member => member.user && member.user.toString() !== userId.toString());
  this.stats.totalMembers = this.members.length;
};

module.exports = mongoose.model('ChatRoom', chatRoomSchema);

const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');
const User = require('../models/User');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');
const { getSocketInstance } = require('../socket'); // เพิ่ม Socket.IO
const { chatFileStorage } = require('../config/cloudinary'); // เพิ่ม Cloudinary storage

// ใช้ Cloudinary storage สำหรับการอัพโหลดไฟล์แชท
const upload = multer({ 
  storage: chatFileStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|mp3|wav|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// POST /api/messages/upload - อัปโหลดรูปภาพสำหรับแชท
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { senderId, chatRoomId } = req.body;
    
    if (!senderId || !chatRoomId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // ใช้ URL จาก Cloudinary โดยตรง
    const fileUrl = req.file.path; // Cloudinary จะให้ URL มาพร้อมแล้ว

    console.log('📤 Image uploaded successfully to Cloudinary:', {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      url: fileUrl,
      cloudinaryUrl: req.file.path
    });

    res.json({
      success: true,
      message: 'File uploaded successfully to Cloudinary',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: fileUrl,
        fileUrl: fileUrl, // เพิ่ม fileUrl เพื่อให้ frontend ใช้ได้
        path: fileUrl, // ใช้ Cloudinary URL แทน local path
        cloudinaryUrl: fileUrl
      }
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error.message
    });
  }
});

// GET /api/messages/:roomId - ดึงข้อความในห้องแชท
router.get('/:roomId', async (req, res) => {
  try {
  const { roomId } = req.params;
  const { page = 1, limit = 30, userId } = req.query; // limit default 30 เพื่อความเร็ว

    // สำหรับ private chat ที่ไม่ใช่ ChatRoom
    if (roomId.startsWith('private_')) {
      console.log('🔒 Fetching messages for private chat:', roomId);
      // ดึงข้อความล่าสุด (ใหม่ -> เก่า)
      const messages = await Message.find({ chatRoom: roomId })
        .populate('sender', 'username displayName membership membershipTier profileImages')
        .populate('replyTo', 'content sender')
        .sort({ createdAt: -1 }) // ใหม่ -> เก่า
        .limit(parseInt(limit));
        
      console.log('🔍 [messages.js] Private messages loaded:', messages.length);
      messages.forEach(msg => {
        if (msg.messageType === 'image') {
          console.log('🖼️ [messages.js] Image message found:', {
            _id: msg._id,
            fileUrl: msg.fileUrl,
            imageUrl: msg.imageUrl,
            hasFileUrl: !!msg.fileUrl,
            hasImageUrl: !!msg.imageUrl
          });
        }
      });
      // reverse ที่ backend เพื่อให้ frontend ได้ array จากเก่า -> ใหม่
      const orderedMessages = [...messages].reverse();
      // เพิ่มข้อมูลว่าผู้ใช้ปัจจุบัน react หรือไม่
      const messagesWithUserReactions = orderedMessages.map(message => {
        const messageObj = message.toObject();
        if (userId) {
          messageObj.userReaction = message.getUserReactionType(userId);
          messageObj.hasUserReacted = message.hasUserReacted(userId);
        }
        return messageObj;
      });
      res.json({
        success: true,
        data: {
          messages: messagesWithUserReactions,
          pagination: {
            current: parseInt(page),
            limit: parseInt(limit),
            hasMore: messages.length === parseInt(limit)
          }
        }
      });
      return;
    }

    // ตรวจสอบว่าห้องแชทมีอยู่จริง (สำหรับ ChatRoom ปกติ)
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }

    // ตรวจสอบว่าผู้ใช้เป็นสมาชิกของห้องหรือไม่ (ยกเว้นห้องสาธารณะ)
    if (userId && chatRoom.type === 'private' && !chatRoom.isMember(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this private chat room'
      });
    }

    // สำหรับห้องสาธารณะ - เพิ่มเป็นสมาชิกอัตโนมัติ
    if (userId && chatRoom.type === 'public' && !chatRoom.isMember(userId)) {
      chatRoom.addMember(userId);
      await chatRoom.save();
    }

    const messages = await Message.getMessagesInRoom(roomId, parseInt(page), parseInt(limit));
    
    console.log('🔍 [messages.js] Room messages loaded:', messages.length);
    messages.forEach(msg => {
      if (msg.messageType === 'image') {
        console.log('🖼️ [messages.js] Image message found:', {
          _id: msg._id,
          fileUrl: msg.fileUrl,
          imageUrl: msg.imageUrl,
          hasFileUrl: !!msg.fileUrl,
          hasImageUrl: !!msg.imageUrl
        });
      }
    });
    
    // เพิ่มข้อมูลว่าผู้ใช้ปัจจุบัน react หรือไม่
    const messagesWithUserReactions = messages.map(message => {
      const messageObj = message.toObject();
      if (userId) {
        messageObj.userReaction = message.getUserReactionType(userId);
        messageObj.hasUserReacted = message.hasUserReacted(userId);
      }
      return messageObj;
    });

    res.json({
      success: true,
      data: {
        messages: messagesWithUserReactions.reverse(), // เรียงจากเก่าไปใหม่
        pagination: {
          current: parseInt(page),
          limit: parseInt(limit),
          hasMore: messages.length === parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
});

// POST /api/messages - ส่งข้อความใหม่
router.post('/', auth, upload.array('attachments', 5), async (req, res) => {
  try {
    const { content, senderId, chatRoomId, messageType = 'text', replyToId } = req.body;
    const authenticatedUserId = req.user._id; // ใช้ userId จาก authentication
    
    console.log('📤 Message creation request:', {
      content: content?.substring(0, 50),
      senderId,
      chatRoomId,
      messageType,
      authenticatedUserId,
      'senderId === authenticatedUserId': senderId === authenticatedUserId.toString()
    });
    
    // ตรวจสอบว่า senderId ตรงกับ authenticated user หรือไม่
    const senderIdStr = senderId.toString();
    const authenticatedUserIdStr = authenticatedUserId.toString();
    
    console.log('🔍 ID Comparison:', {
      senderId,
      senderIdStr,
      authenticatedUserId,
      authenticatedUserIdStr,
      'senderId === authenticatedUserId': senderId === authenticatedUserId,
      'senderIdStr === authenticatedUserIdStr': senderIdStr === authenticatedUserIdStr
    });
    
    if (senderIdStr !== authenticatedUserIdStr) {
      console.log('❌ Sender ID mismatch:', { senderId, authenticatedUserId });
      return res.status(403).json({
        success: false,
        message: 'You can only send messages as yourself'
      });
    }

    if (!senderId || !chatRoomId) {
      return res.status(400).json({
        success: false,
        message: 'Sender ID and Chat Room ID are required'
      });
    }

    // ตรวจสอบว่าผู้ส่งมีอยู่จริง
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Sender not found'
      });
    }

    // ตรวจสอบว่าเป็น private chat หรือไม่
    let chatRoom = null;
    if (chatRoomId.startsWith('private_')) {
      // สำหรับ private chat ตรวจสอบสิทธิ์
      console.log('🔒 Processing private chat message:', chatRoomId);
      console.log('🔒 Sender ID:', senderId, 'Type:', typeof senderId);
      
      const chatParts = chatRoomId.split('_');
      console.log('🔒 Chat parts:', chatParts);
      
      if (chatParts.length >= 3) {
        const userId1 = chatParts[1];
        const userId2 = chatParts[2];
        console.log('🔒 User IDs in chat:', { userId1, userId2 });
        console.log('🔒 Comparison:', {
          'senderId === userId1': senderId === userId1,
          'senderId === userId2': senderId === userId2,
          'senderId.toString() === userId1': senderId.toString() === userId1,
          'senderId.toString() === userId2': senderId.toString() === userId2
        });
        
        // เปรียบเทียบทั้ง string และ ObjectId
        const senderIdStr = senderId.toString();
        const isAuthorized = senderIdStr === userId1 || senderIdStr === userId2;
        
        if (!isAuthorized) {
          console.log('❌ Sender not authorized for private chat');
          return res.status(403).json({
            success: false,
            message: 'You are not authorized to send messages to this private chat'
          });
        }
        
        console.log('✅ Sender authorized for private chat');
      }
    } else {
      // สำหรับ ChatRoom ปกติ
      chatRoom = await ChatRoom.findById(chatRoomId);
      if (!chatRoom) {
        return res.status(404).json({
          success: false,
          message: 'Chat room not found'
        });
      }

      // ตรวจสอบว่าผู้ส่งเป็นสมาชิกของห้องหรือไม่
      if (!chatRoom.isMember(senderId)) {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this chat room'
        });
      }
    }

    // ตรวจสอบข้อจำกัดการส่งข้อความตาม membership
    sender.resetDailyUsage();
    if (!sender.canPerformAction('chat')) {
      const limits = sender.getMembershipLimits();
      return res.status(403).json({
        success: false,
        message: `Daily chat limit reached. Your limit: ${limits.dailyChats} messages per day`,
        currentUsage: sender.dailyUsage.chatCount,
        limit: limits.dailyChats
      });
    }

    // จัดการไฟล์แนบ
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => ({
        type: file.mimetype.startsWith('image/') ? 'image' : 
              file.mimetype.startsWith('video/') ? 'video' :
              file.mimetype.startsWith('audio/') ? 'audio' : 'file',
        url: `/uploads/messages/${file.filename}`,
        filename: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      }));
    }

    // สร้างข้อความใหม่
    const message = new Message({
      content: content || '',
      sender: senderId,
      chatRoom: chatRoomId,
      messageType,
      attachments,
      replyTo: replyToId || null
    });

    await message.save();

    // อัปเดต lastActive ของผู้ส่งข้อความ
    await User.findByIdAndUpdate(userId, {
      lastActive: new Date()
    });

    // อัปเดตสถิติผู้ใช้
    sender.dailyUsage.chatCount += 1;

    // อัปเดตสถิติห้องแชท (เฉพาะ ChatRoom ปกติ)
    if (chatRoom) {
      chatRoom.stats.totalMessages += 1;
      chatRoom.lastActivity = new Date();
      await chatRoom.save();
    }

    await sender.save();

    // Populate ข้อมูลก่อนส่งกลับ
    await message.populate([
      { path: 'sender', select: 'username displayName membership membershipTier profileImages mainProfileImageIndex' },
      { path: 'replyTo', select: 'content sender', populate: { path: 'sender', select: 'username displayName' } }
    ]);

    // 🚀 Broadcast ข้อความผ่าน Socket.IO ไปหาทุกคนในห้อง
    try {
      const io = getSocketInstance();
      if (io) {
        console.log('📤 [messages.js] Broadcasting message to room:', chatRoomId);
        console.log('📤 [messages.js] Message ID:', message._id);
        
        // ส่งข้อความไปยังทุกคนในห้อง
        io.to(chatRoomId).emit('new-message', message);
        
        // Log จำนวนคนที่อยู่ในห้อง
        const roomSize = io.sockets.adapter.rooms.get(chatRoomId)?.size || 0;
        console.log('✅ [messages.js] Broadcasted to', roomSize, 'client(s) in room', chatRoomId);
      } else {
        console.warn('⚠️ [messages.js] Socket.IO instance not available');
      }
    } catch (socketError) {
      console.error('❌ [messages.js] Error broadcasting message:', socketError);
      // ไม่ให้ socket error รบกวนการตอบกลับ API
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
});

// POST /api/messages/:messageId/react - เพิ่ม/ลบ reaction
router.post('/:messageId/react', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reactionType = 'heart' } = req.body;
    const userId = req.user._id; // ใช้ userId จาก authentication

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // ตรวจสอบว่าผู้ใช้เป็นสมาชิกของห้องแชทหรือไม่
    // สำหรับ private chat ที่ไม่ใช่ ChatRoom
    if (message.chatRoom.startsWith('private_')) {
      console.log('🔒 Processing reaction for private chat:', message.chatRoom);
      console.log('🔒 User ID from auth:', userId, 'Type:', typeof userId);
      
      // ตรวจสอบว่า userId อยู่ใน private chat ID หรือไม่
      const chatParts = message.chatRoom.split('_');
      console.log('🔒 Chat parts:', chatParts);
      
      if (chatParts.length >= 3) {
        const userId1 = chatParts[1];
        const userId2 = chatParts[2];
        console.log('🔒 User IDs in chat:', { userId1, userId2 });
        console.log('🔒 Comparison:', {
          'userId === userId1': userId === userId1,
          'userId === userId2': userId === userId2,
          'userId.toString() === userId1': userId.toString() === userId1,
          'userId.toString() === userId2': userId.toString() === userId2
        });
        
        // เปรียบเทียบทั้ง string และ ObjectId
        const userIdStr = userId.toString();
        const isAuthorized = userIdStr === userId1 || userIdStr === userId2;
        
        if (!isAuthorized) {
          console.log('❌ User not authorized for private chat');
          return res.status(403).json({
            success: false,
            message: 'You are not authorized to react to this message'
          });
        }
        
        console.log('✅ User authorized for private chat');
      }
    } else {
      // สำหรับ ChatRoom ปกติ
      const chatRoom = await ChatRoom.findById(message.chatRoom);
      if (!chatRoom || !chatRoom.isMember(userId)) {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this chat room'
        });
      }
    }

    // เพิ่ม/ลบ reaction
    const hadReaction = message.hasUserReacted(userId);
    const previousReactionType = message.getUserReactionType(userId);
    
    message.addReaction(userId, reactionType);
    await message.save();

    // ตรวจสอบสถานะหลังการเปลี่ยนแปลง
    const hasReactionNow = message.hasUserReacted(userId);
    const currentReactionType = message.getUserReactionType(userId);

    let action = 'added';
    if (hadReaction && !hasReactionNow) {
      action = 'removed';
    } else if (hadReaction && hasReactionNow && previousReactionType !== currentReactionType) {
      action = 'changed';
    }

    // 🚀 Broadcast reaction update ผ่าน Socket.IO
    try {
      const io = getSocketInstance();
      if (io) {
        console.log('💖 [messages.js] Broadcasting reaction update for message:', messageId);
        io.to(message.chatRoom.toString()).emit('message-reaction-updated', {
          messageId: message._id,
          userId,
          reactionType: currentReactionType,
          action: hasReactionNow ? action : 'removed',
          reactions: message.reactions,
          stats: message.stats,
          chatRoomId: message.chatRoom
        });
        console.log('✅ [messages.js] Reaction broadcasted');
      }
    } catch (socketError) {
      console.error('❌ [messages.js] Error broadcasting reaction:', socketError);
    }

    res.json({
      success: true,
      message: `Reaction ${action} successfully`,
      data: {
        messageId: message._id,
        action,
        reactionType: currentReactionType,
        hasReaction: hasReactionNow,
        stats: message.stats
      }
    });

  } catch (error) {
    console.error('Error reacting to message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to react to message',
      error: error.message
    });
  }
});

// PUT /api/messages/:messageId - แก้ไขข้อความ
router.put('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content, userId } = req.body;

    if (!userId || !content) {
      return res.status(400).json({
        success: false,
        message: 'User ID and content are required'
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // ตรวจสอบว่าเป็นเจ้าของข้อความหรือไม่
    if (message.sender.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own messages'
      });
    }

    // ตรวจสอบว่าข้อความไม่เก่าเกินไป (เช่น 15 นาที)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (message.createdAt < fifteenMinutesAgo) {
      return res.status(403).json({
        success: false,
        message: 'Cannot edit messages older than 15 minutes'
      });
    }

    await message.editMessage(content);

    // 🚀 Broadcast message edit ผ่าน Socket.IO
    try {
      const io = getSocketInstance();
      if (io) {
        console.log('✏️ [messages.js] Broadcasting message edit:', messageId);
        io.to(message.chatRoom.toString()).emit('message-edited', {
          messageId: message._id,
          content: message.content,
          isEdited: message.isEdited,
          editedAt: message.editedAt
        });
        console.log('✅ [messages.js] Edit broadcasted');
      }
    } catch (socketError) {
      console.error('❌ [messages.js] Error broadcasting edit:', socketError);
    }

    res.json({
      success: true,
      message: 'Message edited successfully',
      data: message
    });

  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to edit message',
      error: error.message
    });
  }
});

// DELETE /api/messages/:messageId - ลบข้อความ
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // ตรวจสอบสิทธิ์ในการลบ (เจ้าของข้อความหรือเจ้าของห้อง)
    const chatRoom = await ChatRoom.findById(message.chatRoom);
    const isOwner = message.sender.toString() === userId;
    const isRoomOwner = chatRoom.isOwner(userId);

    if (!isOwner && !isRoomOwner) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages or you must be the room owner'
      });
    }

    await message.softDelete();

    // 🚀 Broadcast message deletion ผ่าน Socket.IO
    try {
      const io = getSocketInstance();
      if (io) {
        console.log('🗑️ [messages.js] Broadcasting message deletion:', messageId);
        io.to(message.chatRoom.toString()).emit('message-deleted', {
          messageId: message._id,
          deletedAt: message.deletedAt,
          isDeleted: message.isDeleted
        });
        console.log('✅ [messages.js] Deletion broadcasted');
      }
    } catch (socketError) {
      console.error('❌ [messages.js] Error broadcasting deletion:', socketError);
    }

    res.json({
      success: true,
      message: 'Message deleted successfully',
      data: {
        messageId: message._id,
        deletedAt: message.deletedAt
      }
    });

  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: error.message
    });
  }
});

// GET /api/messages/:messageId/reactions - ดูรายละเอียด reactions
router.get('/:messageId/reactions', async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId)
      .populate('reactions.user', 'username displayName profileImages membershipTier');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // จัดกลุ่ม reactions ตามประเภท
    const reactionsByType = {};
    message.reactions.forEach(reaction => {
      if (!reactionsByType[reaction.type]) {
        reactionsByType[reaction.type] = [];
      }
      reactionsByType[reaction.type].push({
        user: reaction.user,
        createdAt: reaction.createdAt
      });
    });

    res.json({
      success: true,
      data: {
        messageId: message._id,
        totalReactions: message.reactions.length,
        reactionsByType,
        stats: message.stats
      }
    });

  } catch (error) {
    console.error('Error fetching message reactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch message reactions',
      error: error.message
    });
  }
});

// GET /api/messages/private-chats/:userId - ดึงรายการแชทส่วนตัวของผู้ใช้
router.get('/private-chats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // ตรวจสอบว่าผู้ใช้มีอยู่จริง
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // ดึงห้องแชทส่วนตัวที่ผู้ใช้เป็นสมาชิก (ChatRoom ปกติ)
    const privateChatRooms = await ChatRoom.find({
      type: 'private',
      'members.user': userId,
      isActive: true
    })
    .populate('members.user', 'username displayName firstName lastName membershipTier profileImages isOnline')
    .sort({ lastActivity: -1 })
    .lean();

    // ดึง private chats ที่ใช้ string format จาก Message collection
    const privateChatMessages = await Message.find({
      chatRoom: { $regex: /^private_.*_/ }, // หา private chat IDs
      $or: [
        { sender: userId }, // ข้อความที่ผู้ใช้ส่ง
        { chatRoom: { $regex: new RegExp(`private_.*_${userId}_.*`) } }, // private chat ที่มี userId
        { chatRoom: { $regex: new RegExp(`private_${userId}_.*_.*`) } } // private chat ที่เริ่มต้นด้วย userId
      ]
    })
    .populate('sender', 'username displayName firstName lastName membership membershipTier profileImages isOnline')
    .sort({ createdAt: -1 })
    .lean();

    // สร้าง unique private chat IDs
    const privateChatIds = new Set();
    console.log('🔍 Found private chat messages:', privateChatMessages.length);
    privateChatMessages.forEach(msg => {
      if (msg.chatRoom && msg.chatRoom.startsWith('private_')) {
        privateChatIds.add(msg.chatRoom);
        console.log('📝 Private chat ID:', msg.chatRoom);
      }
    });
    console.log('📊 Unique private chat IDs:', Array.from(privateChatIds));

    // ประมวลผลข้อมูลแชทส่วนตัวจาก ChatRoom
    const chatRoomChats = await Promise.all(
      privateChatRooms.map(async (room) => {
        // หาผู้ใช้ที่คุยด้วย (ไม่ใช่ผู้ใช้ปัจจุบัน)
        const otherMember = room.members.find(member => 
          member.user && member.user._id.toString() !== userId
        );
        
        if (!otherMember || !otherMember.user) {
          return null; // ข้ามห้องที่ไม่มีผู้ใช้คนอื่น
        }

        const otherUser = otherMember.user;

        // ดึงข้อความล่าสุด
        const lastMessage = await Message.findOne({
          chatRoom: room._id,
          isDeleted: false
        })
        .populate('sender', 'username displayName')
        .sort({ createdAt: -1 })
        .lean();

        // นับจำนวนข้อความที่ยังไม่อ่าน (ใช้ readBy array)
        const unreadCount = await Message.countDocuments({
          chatRoom: room._id,
          sender: { $ne: userId },
          readBy: { $ne: userId },
          isDeleted: false
        });

        // เลือก url รูปโปรไฟล์หลัก
        let profileImageUrl = '';
        if (Array.isArray(otherUser.profileImages) && otherUser.profileImages.length > 0) {
          const mainIdx = typeof otherUser.mainProfileImageIndex === 'number' ? otherUser.mainProfileImageIndex : 0;
          profileImageUrl = otherUser.profileImages[mainIdx] || otherUser.profileImages[0];
        } else {
          profileImageUrl = '/uploads/profiles/default-avatar.png'; // path นี้ควรตรงกับ default จริง
        }
        return {
          id: room._id,
          roomId: room._id,
          otherUser: {
            _id: otherUser._id,
            id: otherUser._id,
            username: otherUser.username || 'Unknown',
            displayName: otherUser.displayName || otherUser.username || 'Unknown',
            firstName: otherUser.firstName || '',
            lastName: otherUser.lastName || '',
            membershipTier: otherUser.membershipTier || 'member',
            profileImages: otherUser.profileImages || [],
            profileImageUrl,
            isOnline: otherUser.isOnline || false
          },
          lastMessage: lastMessage ? {
            _id: lastMessage._id,
            content: lastMessage.content || '',
            messageType: lastMessage.messageType || 'text',
            senderId: lastMessage.sender._id,
            senderName: lastMessage.sender.displayName || lastMessage.sender.username || 'Unknown',
            timestamp: lastMessage.createdAt,
            isRead: lastMessage.isRead || false
          } : null,
          unreadCount: unreadCount || 0,
          lastActivity: room.lastActivity || room.createdAt,
          createdAt: room.createdAt
        };
      })
    );

    // ประมวลผลข้อมูลแชทส่วนตัวจาก string format
    console.log('🔄 Processing string format chats:', Array.from(privateChatIds).length);
    const stringFormatChats = await Promise.all(
      Array.from(privateChatIds).map(async (chatId) => {
        console.log('🔍 Processing chat ID:', chatId);
        // ดึงข้อความล่าสุดสำหรับ private chat นี้
        const lastMessage = await Message.findOne({
          chatRoom: chatId,
          isDeleted: false
        })
        .populate('sender', 'username displayName firstName lastName membership membershipTier profileImages isOnline')
        .sort({ createdAt: -1 })
        .lean();

        if (!lastMessage) return null;

        // หาผู้ใช้ที่คุยด้วย (ไม่ใช่ผู้ใช้ปัจจุบัน)
        const otherUserId = chatId.split('_').find(id => id !== userId && id !== 'private');
        if (!otherUserId) return null;

        const otherUser = await User.findById(otherUserId)
          .select('username displayName firstName lastName membershipTier profileImages isOnline')
          .lean();

        if (!otherUser) return null;

        // นับจำนวนข้อความที่ยังไม่อ่าน (ใช้ readBy array)
        const unreadCount = await Message.countDocuments({
          chatRoom: chatId,
          sender: { $ne: userId },
          readBy: { $ne: userId },
          isDeleted: false
        });

        // เลือก url รูปโปรไฟล์หลัก
        let profileImageUrl = '';
        if (Array.isArray(otherUser.profileImages) && otherUser.profileImages.length > 0) {
          const mainIdx = typeof otherUser.mainProfileImageIndex === 'number' ? otherUser.mainProfileImageIndex : 0;
          profileImageUrl = otherUser.profileImages[mainIdx] || otherUser.profileImages[0];
        } else {
          profileImageUrl = '/uploads/profiles/default-avatar.png';
        }
        return {
          id: chatId,
          roomId: chatId,
          otherUser: {
            _id: otherUser._id,
            id: otherUser._id,
            username: otherUser.username || 'Unknown',
            displayName: otherUser.displayName || otherUser.username || 'Unknown',
            firstName: otherUser.firstName || '',
            lastName: otherUser.lastName || '',
            membershipTier: otherUser.membershipTier || 'member',
            profileImages: otherUser.profileImages || [],
            profileImageUrl,
            isOnline: otherUser.isOnline || false
          },
          lastMessage: lastMessage ? {
            _id: lastMessage._id,
            content: lastMessage.content || '',
            messageType: lastMessage.messageType || 'text',
            senderId: lastMessage.sender._id,
            senderName: lastMessage.sender.displayName || lastMessage.sender.username || 'Unknown',
            timestamp: lastMessage.createdAt,
            isRead: lastMessage.isRead || false
          } : null,
          unreadCount: unreadCount || 0,
          lastActivity: lastMessage.createdAt,
          createdAt: lastMessage.createdAt
        };
      })
    );

    // รวมข้อมูลแชทจากทั้งสองแหล่ง
    const chatRoomValidChats = chatRoomChats.filter(chat => chat !== null);
    const stringFormatValidChats = stringFormatChats.filter(chat => chat !== null);
    
    console.log('📊 ChatRoom chats:', chatRoomValidChats.length);
    console.log('📊 String format chats:', stringFormatValidChats.length);
    
    const allChats = [
      ...chatRoomValidChats,
      ...stringFormatValidChats
    ];

    // เรียงตาม lastActivity
    allChats.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

    // กรองเฉพาะแชทที่มีผู้ใช้คนอื่น
    const validChats = allChats;
    
    console.log('📊 Total valid chats:', validChats.length);

    res.json({
      success: true,
      data: {
        privateChats: validChats,
        total: validChats.length
      }
    });

  } catch (error) {
    console.error('Error fetching private chats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST /api/messages/create-private-chat - สร้างแชทส่วนตัวใหม่
router.post('/create-private-chat', async (req, res) => {
  try {
    const { userId1, userId2 } = req.body;
    
    if (!userId1 || !userId2) {
      return res.status(400).json({
        success: false,
        message: 'Both user IDs are required'
      });
    }

    if (userId1 === userId2) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create chat with yourself'
      });
    }

    // ตรวจสอบว่าผู้ใช้ทั้งสองมีอยู่จริง
    const [user1, user2] = await Promise.all([
      User.findById(userId1),
      User.findById(userId2)
    ]);

    if (!user1 || !user2) {
      return res.status(404).json({
        success: false,
        message: 'One or both users not found'
      });
    }

    // สำหรับ private chat เราไม่ต้องตรวจสอบใน ChatRoom เพราะเราไม่สร้าง ChatRoom
    // แต่เราจะสร้าง private chat ID ที่สม่ำเสมอสำหรับผู้ใช้สองคนเดียวกัน

    // สร้าง private chat ID ที่สม่ำเสมอ (เรียงลำดับ user ID เพื่อให้ได้ ID เดียวกันเสมอ)
    const sortedUserIds = [userId1, userId2].sort();
    const privateChatId = `private_${sortedUserIds[0]}_${sortedUserIds[1]}`;

    // ตรวจสอบว่ามีข้อความใน private chat นี้อยู่แล้วหรือไม่
    const existingMessages = await Message.find({
      chatRoom: privateChatId
    }).limit(1);

    const isNew = existingMessages.length === 0;

    res.status(201).json({
      success: true,
      message: 'Private chat created successfully',
      data: {
        chatId: privateChatId,
        isNew: true,
        chatRoom: {
          id: privateChatId,
          name: `Private Chat: ${user1.displayName || user1.username} & ${user2.displayName || user2.username}`,
          type: 'private',
          members: [
            {
              id: user1._id,
              username: user1.username,
              displayName: user1.displayName,
              firstName: user1.firstName,
              lastName: user1.lastName,
              membershipTier: user1.membershipTier,
              profileImages: user1.profileImages,
              isOnline: user1.isOnline,
              role: 'owner'
            },
            {
              id: user2._id,
              username: user2.username,
              displayName: user2.displayName,
              firstName: user2.firstName,
              lastName: user2.lastName,
              membershipTier: user2.membershipTier,
              profileImages: user2.profileImages,
              isOnline: user2.isOnline,
              role: 'member'
            }
          ]
        }
      }
    });

  } catch (error) {
    console.error('Error creating private chat:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST /api/messages/update-recipient-chat-list - อัปเดตรายการแชทฝั่งผู้รับ
router.post('/update-recipient-chat-list', async (req, res) => {
  try {
    const { chatId, message, senderId, recipientId } = req.body;
    
    if (!chatId || !message || !senderId || !recipientId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    console.log('🔄 Updating recipient chat list:', { chatId, senderId, recipientId });

    // ตรวจสอบว่าผู้ใช้ทั้งสองมีอยู่จริง
    const [sender, recipient] = await Promise.all([
      User.findById(senderId),
      User.findById(recipientId)
    ]);

    if (!sender || !recipient) {
      return res.status(404).json({
        success: false,
        message: 'Sender or recipient not found'
      });
    }

    // สร้าง private chat ID สำหรับผู้รับ (สลับลำดับ user IDs)
    const sortedUserIds = [senderId, recipientId].sort();
    const recipientChatId = `private_${sortedUserIds[0]}_${sortedUserIds[1]}`;

    console.log('📋 Recipient chat ID:', recipientChatId);

    // ตรวจสอบว่ามีข้อความใน private chat นี้อยู่แล้วหรือไม่
    const existingMessages = await Message.find({
      chatRoom: recipientChatId
    }).limit(1);

    if (existingMessages.length === 0) {
      console.log('📝 Creating new private chat for recipient');
      // สร้างข้อความแรกใน private chat สำหรับผู้รับ
      const firstMessage = new Message({
        content: message.content || '',
        sender: senderId,
        chatRoom: recipientChatId,
        messageType: message.messageType || 'text',
        attachments: message.attachments || [],
        replyTo: message.replyTo || null
      });

      await firstMessage.save();
      console.log('✅ First message created for recipient');
    }

    res.status(200).json({
      success: true,
      message: 'Recipient chat list updated successfully',
      data: {
        chatId: recipientChatId,
        message: message
      }
    });

  } catch (error) {
    console.error('Error updating recipient chat list:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// DELETE /api/messages/private-chat/:chatId - ลบแชทส่วนตัว (Soft Delete)
router.delete('/private-chat/:chatId', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    console.log('🗑️ Soft deleting private chat:', chatId, 'for user:', userId);

    // ตรวจสอบว่า chatId เป็น private chat ID หรือไม่
    if (!chatId.includes('private_')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid private chat ID'
      });
    }

    // แยก chat ID เพื่อหา user IDs
    const parts = chatId.replace('private_', '').split('_');
    if (parts.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'Invalid private chat ID format'
      });
    }

    const [user1Id, user2Id] = parts;

    // ตรวจสอบว่าผู้ใช้เป็นส่วนหนึ่งของแชทนี้หรือไม่
    if (user1Id !== userId && user2Id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this chat'
      });
    }

    // หาผู้ใช้ที่ลบและผู้ใช้อีกฝั่ง
    const deleterId = userId;
    const otherUserId = user1Id === userId ? user2Id : user1Id;

    // สร้าง chat ID ใหม่สำหรับผู้ที่ลบ (สลับลำดับ user IDs)
    const newChatId = `private_${deleterId}_${otherUserId}`;

    console.log('🔄 Creating new chat ID for deleter:', newChatId);
    console.log('📋 Old chat ID remains for other user:', chatId);

    // อัปเดต privateChats ของผู้ใช้ที่ลบให้ใช้ chat ID ใหม่
    await User.findByIdAndUpdate(
      deleterId,
      { 
        $pull: { privateChats: { chatId: chatId } },
        $push: { 
          privateChats: { 
            chatId: newChatId,
            otherUserId: otherUserId,
            lastMessage: null,
            lastMessageTime: null,
            isDeleted: true // เพิ่ม flag เพื่อระบุว่าเป็น chat ที่ถูก soft delete
          }
        }
      }
    );

    // ผู้ใช้อีกฝั่งยังใช้ chat ID เดิม (ไม่ต้องอัปเดตอะไร)

    console.log('✅ Private chat soft deleted successfully');
    console.log('📝 User', deleterId, 'now uses chat ID:', newChatId);
    console.log('📝 User', otherUserId, 'still uses chat ID:', chatId);

    res.json({
      success: true,
      message: 'Private chat deleted successfully (soft delete)',
      data: {
        oldChatId: chatId,
        newChatId: newChatId,
        deleterId: deleterId,
        otherUserId: otherUserId,
        messagesPreserved: true
      }
    });

  } catch (error) {
    console.error('Error soft deleting private chat:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST /api/messages/mark-as-read - ทำเครื่องหมายข้อความว่าอ่านแล้ว
router.post('/mark-as-read', auth, async (req, res) => {
  try {
    const { chatRoomId, userId } = req.body;
    const currentUserId = req.user.id;

    if (!chatRoomId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Chat room ID and user ID are required'
      });
    }

    // ตรวจสอบว่าผู้ใช้มีสิทธิ์เข้าถึงแชทนี้
    let hasAccess = false;
    
    // สำหรับ private chat
    if (chatRoomId.startsWith('private_')) {
      const userParts = chatRoomId.split('_');
      if (userParts.length >= 3) {
        const userId1 = userParts[1];
        const userId2 = userParts[2];
        hasAccess = currentUserId === userId1 || currentUserId === userId2;
      }
    } else {
      // สำหรับ ChatRoom ปกติ
      const chatRoom = await ChatRoom.findById(chatRoomId);
      if (chatRoom) {
        hasAccess = chatRoom.members.some(member => 
          member.user.toString() === currentUserId
        );
      }
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat room'
      });
    }

    // อัปเดตข้อความที่ยังไม่ได้อ่านให้เป็นอ่านแล้ว
    const result = await Message.updateMany(
      {
        chatRoom: chatRoomId,
        sender: { $ne: currentUserId }, // ไม่นับข้อความที่ตัวเองส่ง
        readBy: { $ne: currentUserId } // ยังไม่ได้อ่านโดยผู้ใช้ปัจจุบัน
      },
      {
        $addToSet: { readBy: currentUserId }
      }
    );

    console.log(`✅ Marked ${result.modifiedCount} messages as read for user ${currentUserId} in chat ${chatRoomId}`);

    res.json({
      success: true,
      message: 'Messages marked as read successfully',
      data: {
        modifiedCount: result.modifiedCount
      }
    });

  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/messages/unread-count/:userId - ดึงจำนวนข้อความที่ยังไม่ได้อ่าน
router.get('/unread-count/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // ตรวจสอบสิทธิ์
    if (currentUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // ดึงจำนวนข้อความที่ยังไม่ได้อ่านสำหรับ private chats
    const privateChatUnreadCount = await Message.aggregate([
      {
        $match: {
          chatRoom: { $regex: /^private_.*_/ },
          sender: { $ne: new mongoose.Types.ObjectId(userId) },
          readBy: { $ne: new mongoose.Types.ObjectId(userId) },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$chatRoom',
          count: { $sum: 1 },
          lastMessage: { $last: '$$ROOT' }
        }
      },
      {
        $project: {
          chatRoom: '$_id',
          unreadCount: '$count',
          lastMessage: 1,
          _id: 0
        }
      }
    ]);

    // ดึงจำนวนข้อความที่ยังไม่ได้อ่านสำหรับ ChatRoom ปกติ
    const chatRoomUnreadCount = await Message.aggregate([
      {
        $lookup: {
          from: 'chatrooms',
          localField: 'chatRoom',
          foreignField: '_id',
          as: 'room'
        }
      },
      {
        $match: {
          'room.members.user': new mongoose.Types.ObjectId(userId),
          sender: { $ne: new mongoose.Types.ObjectId(userId) },
          readBy: { $ne: new mongoose.Types.ObjectId(userId) },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$chatRoom',
          count: { $sum: 1 },
          lastMessage: { $last: '$$ROOT' }
        }
      },
      {
        $project: {
          chatRoom: '$_id',
          unreadCount: '$count',
          lastMessage: 1,
          _id: 0
        }
      }
    ]);

    // รวมผลลัพธ์
    const allUnreadCounts = [...privateChatUnreadCount, ...chatRoomUnreadCount];
    
    // คำนวณจำนวนรวม
    const totalUnreadCount = allUnreadCounts.reduce((sum, item) => sum + item.unreadCount, 0);

    res.json({
      success: true,
      data: {
        totalUnreadCount,
        chatUnreadCounts: allUnreadCounts
      }
    });

  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/messages/private-chats-unread/:userId - ดึงจำนวนข้อความที่ยังไม่ได้อ่านสำหรับแชทส่วนตัวเท่านั้น
router.get('/private-chats-unread/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // ตรวจสอบสิทธิ์
    if (currentUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // ดึงจำนวนข้อความที่ยังไม่ได้อ่านสำหรับ private chats เท่านั้น
    const privateChatUnreadCount = await Message.aggregate([
      {
        $match: {
          chatRoom: { $regex: /^private_.*_/ },
          sender: { $ne: new mongoose.Types.ObjectId(userId) },
          readBy: { $ne: new mongoose.Types.ObjectId(userId) },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$chatRoom',
          count: { $sum: 1 },
          lastMessage: { $last: '$$ROOT' }
        }
      },
      {
        $project: {
          chatRoom: '$_id',
          unreadCount: '$count',
          lastMessage: 1,
          _id: 0
        }
      }
    ]);

    // คำนวณจำนวนรวม
    const totalUnreadCount = privateChatUnreadCount.reduce((sum, item) => sum + item.unreadCount, 0);

    res.json({
      success: true,
      data: {
        totalUnreadCount,
        chatUnreadCounts: privateChatUnreadCount
      }
    });

  } catch (error) {
    console.error('Error getting private chat unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
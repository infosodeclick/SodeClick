const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ChatMessage = require('../models/ChatMessage');
const mongoose = require('mongoose');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-development-2025';

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบ token การยืนยันตัวตน'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token ไม่ถูกต้อง'
    });
  }
};

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get chat messages between two users
router.get('/messages/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID ผู้ใช้ไม่ถูกต้อง'
      });
    }

    // Check if the other user exists
    const otherUser = await User.findById(userId).select('username firstName lastName');
    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    // TODO: Implement actual message retrieval from database
    // For now, return empty array
    res.json({
      success: true,
      messages: [],
      otherUser: {
        id: otherUser._id,
        username: otherUser.username,
        firstName: otherUser.firstName,
        lastName: otherUser.lastName
      }
    });

  } catch (error) {
    console.error('Error getting chat messages:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อความ'
    });
  }
});

// Send a message
router.post('/send', async (req, res) => {
  try {
    const { recipientId, message, messageType = 'text' } = req.body;
    const senderId = req.user._id;

    // Validate required fields
    if (!recipientId || !message) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
      });
    }

    // Validate recipientId
    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({
        success: false,
        message: 'ID ผู้รับไม่ถูกต้อง'
      });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId).select('username firstName lastName');
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้รับข้อความ'
      });
    }

    // TODO: Implement actual message saving to database
    // For now, return success response
    res.json({
      success: true,
      message: 'ส่งข้อความสำเร็จ',
      data: {
        messageId: new mongoose.Types.ObjectId(),
        senderId,
        recipientId,
        message,
        messageType,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการส่งข้อความ'
    });
  }
});

// Get chat list (conversations)
router.get('/conversations', async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // TODO: Implement actual conversation list retrieval from database
    // For now, return empty array
    res.json({
      success: true,
      conversations: []
    });

  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงรายการแชท'
    });
  }
});

// Mark messages as read
router.put('/mark-read/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID ผู้ใช้ไม่ถูกต้อง'
      });
    }

    // TODO: Implement actual mark as read functionality
    // For now, return success response
    res.json({
      success: true,
      message: 'ทำเครื่องหมายว่าอ่านแล้ว'
    });

  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการทำเครื่องหมายว่าอ่านแล้ว'
    });
  }
});

// Upload chat file (image, video, etc.)
router.post('/upload-file', async (req, res) => {
  try {
    // TODO: Implement file upload functionality
    // This would typically use multer middleware for file handling
    res.json({
      success: true,
      message: 'อัปโหลดไฟล์สำเร็จ',
      data: {
        fileUrl: '',
        fileName: '',
        fileType: ''
      }
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์'
    });
  }
});

// Get messages from public or community room
router.get('/rooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    // Validate roomId (only allow 'public' or 'community')
    if (roomId !== 'public' && roomId !== 'community') {
      return res.status(400).json({
        success: false,
        message: 'Invalid room ID'
      });
    }

    // Get messages from database
    const messages = await ChatMessage.find({
      chatRoom: roomId,
      isDeleted: false
    })
      .populate('sender', 'username displayName profileImages membershipTier membership')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    // Reverse to show oldest first
    const reversedMessages = messages.reverse();

    res.json({
      success: true,
      messages: reversedMessages,
      roomId
    });

  } catch (error) {
    console.error('Error getting room messages:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อความ'
    });
  }
});

module.exports = router;


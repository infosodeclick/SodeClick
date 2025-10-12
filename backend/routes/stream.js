const express = require('express');
const router = express.Router();
const StreamRoom = require('../models/StreamRoom');
const StreamMessage = require('../models/StreamMessage');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Get all live streams
router.get('/live', async (req, res) => {
  try {
    const liveStreams = await StreamRoom.find({ isLive: true })
      .sort({ viewerCount: -1, startTime: -1 })
      .populate('streamer', 'username displayName profileImages mainProfileImageIndex gender')
      .lean();

    res.json({
      success: true,
      data: liveStreams
    });
  } catch (error) {
    console.error('Error fetching live streams:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลไลฟ์สตรีม'
    });
  }
});

// Get stream by ID
router.get('/:streamId', async (req, res) => {
  try {
    const stream = await StreamRoom.findById(req.params.streamId)
      .populate('streamer', 'username displayName profileImages mainProfileImageIndex gender membership')
      .lean();

    if (!stream) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบห้องไลฟ์สตรีมนี้'
      });
    }

    res.json({
      success: true,
      data: stream
    });
  } catch (error) {
    console.error('Error fetching stream:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลไลฟ์สตรีม'
    });
  }
});

// Create new stream (requires auth + admin)
router.post('/create', auth, async (req, res) => {
  try {
    const { title, description, category, tags } = req.body;
    const userId = req.user.id;
    
    // Check if user is admin
    if (!req.user.isAdmin && !req.user.isSuperAdmin && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์สร้างห้องไลฟ์สตรีม'
      });
    }

    // Check if user already has an active stream
    const existingStream = await StreamRoom.findOne({
      streamer: userId,
      isLive: true
    });

    if (existingStream) {
      return res.status(400).json({
        success: false,
        message: 'คุณมีไลฟ์สตรีมที่กำลังออนไลน์อยู่แล้ว'
      });
    }

    // Get user info
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    // Generate stream key
    const streamKey = StreamRoom.generateStreamKey();

    // Create new stream room
    const newStream = new StreamRoom({
      title,
      description,
      category: category || 'talk',
      tags: tags || [],
      streamer: userId,
      streamerName: user.displayName || user.username,
      streamerAvatar: user.profileImages?.[0] || '',
      streamKey,
      isLive: false
    });

    await newStream.save();

    res.json({
      success: true,
      data: newStream,
      message: 'สร้างห้องไลฟ์สตรีมสำเร็จ'
    });
  } catch (error) {
    console.error('Error creating stream:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างห้องไลฟ์สตรีม'
    });
  }
});

// Start stream (go live) - Admin only
router.post('/:streamId/start', auth, async (req, res) => {
  try {
    const { streamId } = req.params;
    const userId = req.user.id;
    
    // Check if user is admin
    if (!req.user.isAdmin && !req.user.isSuperAdmin && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์เริ่มไลฟ์สตรีม'
      });
    }

    const stream = await StreamRoom.findById(streamId);
    if (!stream) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบห้องไลฟ์สตรีมนี้'
      });
    }

    // Check if user is the streamer
    if (stream.streamer.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์เริ่มไลฟ์สตรีมนี้'
      });
    }

    // Start stream
    stream.isLive = true;
    stream.startTime = new Date();
    stream.viewerCount = 0;
    stream.viewers = [];

    await stream.save();

    // Emit socket event (will be handled by socket.js)
    if (req.app.get('io')) {
      req.app.get('io').emit('stream-started', {
        streamId: stream._id,
        title: stream.title,
        streamer: stream.streamerName,
        thumbnail: stream.thumbnail
      });
    }

    res.json({
      success: true,
      data: stream,
      message: 'เริ่มไลฟ์สตรีมสำเร็จ'
    });
  } catch (error) {
    console.error('Error starting stream:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเริ่มไลฟ์สตรีม'
    });
  }
});

// End stream - Admin only
router.post('/:streamId/end', auth, async (req, res) => {
  try {
    const { streamId } = req.params;
    const userId = req.user.id;
    
    // Check if user is admin
    if (!req.user.isAdmin && !req.user.isSuperAdmin && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์จบไลฟ์สตรีม'
      });
    }

    const stream = await StreamRoom.findById(streamId);
    if (!stream) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบห้องไลฟ์สตรีมนี้'
      });
    }

    // Check if user is the streamer
    if (stream.streamer.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์จบไลฟ์สตรีมนี้'
      });
    }

    // End stream
    stream.isLive = false;
    stream.endTime = new Date();

    await stream.save();

    // Emit socket event
    if (req.app.get('io')) {
      req.app.get('io').to(`stream-${streamId}`).emit('stream-ended', {
        streamId: stream._id,
        message: 'ไลฟ์สตรีมสิ้นสุดแล้ว'
      });
    }

    res.json({
      success: true,
      data: stream,
      message: 'จบไลฟ์สตรีมสำเร็จ'
    });
  } catch (error) {
    console.error('Error ending stream:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการจบไลฟ์สตรีม'
    });
  }
});

// Get stream messages
router.get('/:streamId/messages', async (req, res) => {
  try {
    const { streamId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const messages = await StreamMessage.find({
      streamRoom: streamId,
      isDeleted: false
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'username displayName profileImages membership')
      .lean();

    res.json({
      success: true,
      data: messages.reverse()
    });
  } catch (error) {
    console.error('Error fetching stream messages:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลข้อความ'
    });
  }
});

// Send message (via Socket.IO, but also provide REST endpoint)
router.post('/:streamId/message', auth, async (req, res) => {
  try {
    const { streamId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'กรุณาใส่ข้อความ'
      });
    }

    const stream = await StreamRoom.findById(streamId);
    if (!stream) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบห้องไลฟ์สตรีมนี้'
      });
    }

    if (!stream.isLive) {
      return res.status(400).json({
        success: false,
        message: 'ไลฟ์สตรีมนี้ไม่ได้ออนไลน์อยู่'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    // Create message
    const newMessage = new StreamMessage({
      streamRoom: streamId,
      sender: userId,
      senderName: user.displayName || user.username,
      senderAvatar: user.profileImages?.[0] || '',
      message: message.trim(),
      type: 'text'
    });

    await newMessage.save();

    const populatedMessage = await StreamMessage.findById(newMessage._id)
      .populate('sender', 'username displayName profileImages membership')
      .lean();

    res.json({
      success: true,
      data: populatedMessage
    });
  } catch (error) {
    console.error('Error sending stream message:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการส่งข้อความ'
    });
  }
});

// Get user's streams
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const streams = await StreamRoom.find({ streamer: userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({
      success: true,
      data: streams
    });
  } catch (error) {
    console.error('Error fetching user streams:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลไลฟ์สตรีม'
    });
  }
});

// Update stream settings - Admin only
router.put('/:streamId/settings', auth, async (req, res) => {
  try {
    const { streamId } = req.params;
    const userId = req.user.id;
    const { settings } = req.body;
    
    // Check if user is admin
    if (!req.user.isAdmin && !req.user.isSuperAdmin && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์แก้ไขการตั้งค่าไลฟ์สตรีม'
      });
    }

    const stream = await StreamRoom.findById(streamId);
    if (!stream) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบห้องไลฟ์สตรีมนี้'
      });
    }

    // Check if user is the streamer
    if (stream.streamer.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์แก้ไขการตั้งค่านี้'
      });
    }

    // Update settings
    if (settings) {
      stream.settings = { ...stream.settings, ...settings };
    }

    await stream.save();

    res.json({
      success: true,
      data: stream,
      message: 'อัปเดตการตั้งค่าสำเร็จ'
    });
  } catch (error) {
    console.error('Error updating stream settings:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปเดตการตั้งค่า'
    });
  }
});

// Get stream analytics - Admin only
router.get('/:streamId/analytics', auth, async (req, res) => {
  try {
    const { streamId } = req.params;
    const userId = req.user.id;
    
    // Check if user is admin
    if (!req.user.isAdmin && !req.user.isSuperAdmin && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์ดูข้อมูลสถิติไลฟ์สตรีม'
      });
    }

    const stream = await StreamRoom.findById(streamId);
    if (!stream) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบห้องไลฟ์สตรีมนี้'
      });
    }

    // Check if user is the streamer
    if (stream.streamer.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์ดูข้อมูลนี้'
      });
    }

    // Get message count
    const messageCount = await StreamMessage.countDocuments({
      streamRoom: streamId,
      isDeleted: false
    });

    const analytics = {
      totalViews: stream.totalViews || 0,
      currentViewers: stream.viewerCount || 0,
      totalMessages: messageCount,
      likeCount: stream.likeCount || 0,
      duration: stream.startTime ? Date.now() - stream.startTime.getTime() : 0,
      peakViewers: stream.viewerCount || 0, // This could be tracked separately
      avgViewTime: 0 // This would need to be calculated from viewer join/leave times
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching stream analytics:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ'
    });
  }
});

module.exports = router;


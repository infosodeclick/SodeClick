const express = require('express');
const router = express.Router();
const StreamRoom = require('../models/StreamRoom');
const StreamMessage = require('../models/StreamMessage');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

// Get all streams (live + offline)
router.get('/all', async (req, res) => {
  try {
    const streams = await StreamRoom.find({})
      .sort({ isLive: -1, viewerCount: -1, startTime: -1 })
      .populate('streamer', 'username displayName profileImages mainProfileImageIndex gender')
      .lean();

    res.json({
      success: true,
      data: streams
    });
  } catch (error) {
    console.error('Error fetching streams:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลไลฟ์สตรีม'
    });
  }
});

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
        message: 'คุณมีไลฟ์สตรีมที่กำลังออนไลน์อยู่แล้ว กรุณาหยุดสตรีมเก่าก่อน'
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

    // Emit message to stream room via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`stream_${streamId}`).emit('stream-message', {
        ...populatedMessage,
        timestamp: populatedMessage.createdAt
      });
    }

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
    const { title, settings } = req.body;
    
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

    // Update title if provided
    if (title !== undefined) {
      stream.title = title;
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

// Delete stream room - Admin only
router.delete('/:streamId', auth, async (req, res) => {
  try {
    const { streamId } = req.params;
    const userId = req.user.id;
    
    // Check if user is admin
    if (!req.user.isAdmin && !req.user.isSuperAdmin && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์ลบห้องไลฟ์สตรีม'
      });
    }

    const stream = await StreamRoom.findById(streamId);
    if (!stream) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบห้องไลฟ์สตรีมนี้'
      });
    }

    // Check if user is the streamer or admin
    if (stream.streamer.toString() !== userId.toString() && !req.user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์ลบห้องไลฟ์สตรีมนี้'
      });
    }

    // Delete stream and all related messages
    await StreamRoom.findByIdAndDelete(streamId);
    await StreamMessage.deleteMany({ streamRoom: streamId });

    console.log(`🗑️ Stream room ${streamId} deleted by user ${userId}`);

    res.json({
      success: true,
      message: 'ลบห้องไลฟ์สตรีมสำเร็จ'
    });
  } catch (error) {
    console.error('Error deleting stream:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบห้องไลฟ์สตรีม'
    });
  }
});

// HLS endpoint for testing (mock data)
router.get('/hls/:streamKey.m3u8', (req, res) => {
  const { streamKey } = req.params;
  
  // Check if it's a test stream key
  if (streamKey.startsWith('test_')) {
    // Generate mock HLS playlist with working video segments
    const mockHlsContent = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:EVENT
#EXTINF:10.0,
/api/stream/test/${streamKey}/segment0.ts
#EXTINF:10.0,
/api/stream/test/${streamKey}/segment1.ts
#EXTINF:10.0,
/api/stream/test/${streamKey}/segment2.ts
#EXT-X-ENDLIST`;

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(mockHlsContent);
  } else {
    // For real streams, check if HLS file exists
    const hlsPath = path.join(__dirname, '../hls', `${streamKey}.m3u8`);
    
    if (fs.existsSync(hlsPath)) {
      res.sendFile(hlsPath);
    } else {
      res.status(404).json({
        success: false,
        message: 'Stream not found or not live'
      });
    }
  }
});

// Mock video segment endpoint for testing
router.get('/test/:streamKey/segment:segmentNumber.ts', (req, res) => {
  const { streamKey, segmentNumber } = req.params;
  
  // Check if it's a test stream key
  if (streamKey.startsWith('test_')) {
    // Create a minimal MPEG-TS segment (just for testing)
    // This is a very basic TS segment that won't play but won't cause errors
    const tsHeader = Buffer.from([
      0x47, 0x40, 0x00, 0x10, 0x00, 0x00, 0xB0, 0x0D, 0x00, 0x00, 0xC1, 0x00, 0x00, 0x00, 0x01, 0xE0,
      0x00, 0x00, 0x80, 0x80, 0x05, 0x21, 0x00, 0x01, 0x00, 0x01, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF
    ]);
    
    // Create a simple test pattern (188 bytes per TS packet)
    const segmentData = Buffer.alloc(188 * 10); // 10 TS packets
    for (let i = 0; i < 10; i++) {
      tsHeader.copy(segmentData, i * 188);
    }
    
    res.setHeader('Content-Type', 'video/mp2t');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(segmentData);
  } else {
    res.status(404).json({
      success: false,
      message: 'Test segment not found'
    });
  }
});

// DASH endpoint for testing (mock data)
router.get('/dash/:streamKey.mpd', (req, res) => {
  const { streamKey } = req.params;
  
  // Check if it's a test stream key
  if (streamKey.startsWith('test_')) {
    // Generate mock DASH manifest
    const mockDashContent = `<?xml version="1.0" encoding="UTF-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="dynamic" mediaPresentationDuration="PT30S" minBufferTime="PT3S" profiles="urn:mpeg:dash:profile:isoff-live:2011">
  <Period id="0" start="PT0S">
    <AdaptationSet id="0" contentType="video" segmentAlignment="true">
      <Representation id="0" mimeType="video/mp4" codecs="avc1.640028" width="1920" height="1080" frameRate="30" bandwidth="5000000">
        <SegmentTemplate media="segment_$Number$.m4s" initialization="init.m4s" timescale="1000" startNumber="1">
          <SegmentTimeline>
            <S t="0" d="10000"/>
            <S t="10000" d="10000"/>
            <S t="20000" d="10000"/>
          </SegmentTimeline>
        </SegmentTemplate>
      </Representation>
    </AdaptationSet>
  </Period>
</MPD>`;

    res.setHeader('Content-Type', 'application/dash+xml');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(mockDashContent);
  } else {
    // For real streams, check if DASH file exists
    const dashPath = path.join(__dirname, '../dash', `${streamKey}.mpd`);
    
    if (fs.existsSync(dashPath)) {
      res.sendFile(dashPath);
    } else {
      res.status(404).json({
        success: false,
        message: 'Stream not found or not live'
      });
    }
  }
});

// Test stream status endpoint
router.get('/test/:streamKey/status', (req, res) => {
  const { streamKey } = req.params;
  
  if (streamKey.startsWith('test_')) {
    res.json({
      success: true,
      data: {
        streamKey,
        isLive: true,
        status: 'mock_stream',
        message: 'This is a mock stream for testing purposes'
      }
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'Test stream not found'
    });
  }
});

module.exports = router;


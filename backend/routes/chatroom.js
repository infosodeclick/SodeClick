const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ChatRoom = require('../models/ChatRoom');
const User = require('../models/User');
const { auth, chatroomAccess } = require('../middleware/auth');

// GET /api/chatroom - ดูรายการห้องแชท (ไม่ต้องการ auth สำหรับการดูรายการ)
router.get('/', async (req, res) => {
  try {
    const { type = 'all', page = 1, limit = 20, search, includeActiveMembers = false } = req.query;

    console.log('🔍 Chat room request params:', { type, page, limit, search, includeActiveMembers });

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = { isActive: true };
    
    if (type !== 'all') {
      query.type = type;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const [chatRooms, total] = await Promise.all([
      ChatRoom.find(query)
        .populate('owner', 'username displayName membershipTier verificationBadge')
        .populate('members.user', 'username displayName membershipTier verificationBadge')
        .sort({ lastActivity: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ChatRoom.countDocuments(query)
    ]);

    // คำนวณจำนวนสมาชิกที่ใช้งานจริง (มีการพิมพ์ในห้องแชท)
    const roomsWithActiveMembers = await Promise.all(
      chatRooms.map(async (room) => {
        if (includeActiveMembers === 'true' || includeActiveMembers === true) {
          console.log(`🔍 Calculating active members for room: ${room.name} (${room._id})`);
          // นับจำนวนสมาชิกที่มีการส่งข้อความในห้องแชทนี้ (unique senders)
          const Message = require('../models/Message');
          const uniqueSenders = await Message.distinct('sender', {
            chatRoom: room._id, // แก้ไขจาก roomId เป็น chatRoom
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // 30 วันล่าสุด
            isDeleted: { $ne: true } // ไม่นับข้อความที่ถูกลบ
          });
          
          const activeMemberCount = uniqueSenders.length;
          
          console.log(`📝 Room "${room.name}": activeMemberCount = ${activeMemberCount} (unique senders)`);
          
          return {
            ...room,
            activeMemberCount
          };
        }
        return room;
      })
    );

    res.json({
      success: true,
      data: {
        chatRooms: roomsWithActiveMembers.map(room => ({
          id: room._id,
          name: room.name,
          description: room.description,
          type: room.type,
          owner: room.owner ? {
            id: room.owner._id,
            username: room.owner.username || 'Unknown',
            displayName: room.owner.displayName || room.owner.username || 'Unknown',
            membershipTier: room.owner.membershipTier || 'member',
            verificationBadge: room.owner.verificationBadge || false
          } : null,
          members: room.members ? room.members
            .filter(member => member.user && member.user._id) // กรองเฉพาะ member ที่มี user และ _id
            .map(member => ({
              id: member.user._id,
              username: member.user.username || 'Unknown',
              displayName: member.user.displayName || member.user.username || 'Unknown',
              membershipTier: member.user.membershipTier || 'member',
              verificationBadge: member.user.verificationBadge || false,
              role: member.role || 'member',
              joinedAt: member.joinedAt
            })) : [],
          memberCount: room.memberCount || room.stats?.totalMembers || 0,
          activeMemberCount: room.activeMemberCount || 0, // จำนวนสมาชิกที่มีการพิมพ์
          entryFee: room.entryFee || 0,
          ageRestriction: room.ageRestriction || { minAge: 18, maxAge: 100 },
          stats: room.stats || { totalMembers: 0, totalMessages: 0, totalCoinsReceived: 0, totalGiftsReceived: 0 },
          lastActivity: room.lastActivity || room.createdAt,
          createdAt: room.createdAt
        })),
        pagination: {
          current: pageNum,
          total: Math.ceil(total / limitNum),
          totalItems: total
        }
      }
    });

  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat rooms',
      error: error.message
    });
  }
});

// POST /api/chatroom - สร้างห้องแชท
router.post('/', async (req, res) => {
  try {
    const { 
      name, 
      description, 
      type, 
      entryFee, 
      ageRestriction, 
      ownerId,
      settings 
    } = req.body;

    if (!name || !ownerId) {
      return res.status(400).json({
        success: false,
        message: 'Room name and owner ID are required'
      });
    }

    const owner = await User.findById(ownerId);
    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'Owner not found'
      });
    }

    // ตรวจสอบสิทธิ์การสร้างห้อง (SuperAdmin ข้ามการตรวจสอบ)
    const limits = owner.getMembershipLimits();
    
    // SuperAdmin สามารถสร้างห้องได้ไม่จำกัด
    if (!owner.isSuperAdmin()) {
      const currentRooms = await ChatRoom.countDocuments({ 
        owner: ownerId, 
        isActive: true 
      });

      if (limits.chatRoomLimit !== -1 && currentRooms >= limits.chatRoomLimit) {
        return res.status(403).json({
          success: false,
          message: `You can only create ${limits.chatRoomLimit} chat rooms with your current membership`,
          currentRooms,
          limit: limits.chatRoomLimit
        });
      }
    }

    // สร้างห้องแชท
    const chatRoom = new ChatRoom({
      name: name.trim(),
      description: description?.trim(),
      type: type || 'public',
      owner: ownerId,
      entryFee: type === 'private' ? (entryFee || 0) : 0,
      ageRestriction: {
        minAge: ageRestriction?.minAge || 18,
        maxAge: ageRestriction?.maxAge || 100
      },
      settings: {
        maxMembers: settings?.maxMembers || 100,
        allowGifts: settings?.allowGifts !== false,
        allowCoinGifts: settings?.allowCoinGifts !== false,
        moderationEnabled: settings?.moderationEnabled || false
      }
    });

    // เพิ่มเจ้าของเป็นสมาชิกแรก
    chatRoom.addMember(ownerId, 'owner');

    await chatRoom.save();

    // อัปเดต User ที่สร้างห้อง
    owner.createdChatRooms.push(chatRoom._id);
    await owner.save();

    // Populate ข้อมูลก่อนส่งกลับ
    await chatRoom.populate('owner', 'username displayName membershipTier verificationBadge');

    res.status(201).json({
      success: true,
      message: 'Chat room created successfully',
      data: {
        id: chatRoom._id,
        name: chatRoom.name,
        description: chatRoom.description,
        type: chatRoom.type,
        owner: {
          id: chatRoom.owner._id,
          username: chatRoom.owner.username,
          displayName: chatRoom.owner.displayName,
          membershipTier: chatRoom.owner.membershipTier
        },
        entryFee: chatRoom.entryFee,
        ageRestriction: chatRoom.ageRestriction,
        settings: chatRoom.settings,
        memberCount: chatRoom.memberCount
      }
    });

  } catch (error) {
    console.error('Error creating chat room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create chat room',
      error: error.message
    });
  }
});

// GET /api/chatroom/:roomId - ดูรายละเอียดห้องแชท
router.get('/:roomId', auth, chatroomAccess, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.query;

    // ตรวจสอบว่า roomId เป็น null หรือไม่
    if (!roomId || roomId === 'null') {
      console.log('❌ Chatroom API: Invalid roomId:', roomId);
      return res.status(400).json({
        success: false,
        message: 'Invalid room ID'
      });
    }

    console.log('🔍 Chatroom API: Fetching room info for:', roomId);

    const chatRoom = await ChatRoom.findById(roomId)
      .populate('owner', 'username displayName membershipTier verificationBadge')
      .populate('members.user', 'username displayName membershipTier verificationBadge isOnline lastSeen');

    if (!chatRoom) {
      console.log('❌ Chatroom API: Room not found:', roomId);
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }

    const isMember = userId ? chatRoom.isMember(userId) : false;
    const isOwner = userId ? chatRoom.isOwner(userId) : false;

    res.json({
      success: true,
      data: {
        id: chatRoom._id,
        name: chatRoom.name,
        description: chatRoom.description,
        type: chatRoom.type,
        owner: chatRoom.owner ? {
          id: chatRoom.owner._id,
          username: chatRoom.owner.username || 'Unknown',
          displayName: chatRoom.owner.displayName || chatRoom.owner.username || 'Unknown',
          membershipTier: chatRoom.owner.membershipTier || 'member',
          verificationBadge: chatRoom.owner.verificationBadge || false
        } : null,
        members: chatRoom.members.map(member => ({
          id: member.user?._id,
          username: member.user?.username || 'Unknown',
          displayName: member.user?.displayName || member.user?.username || 'Unknown',
          membershipTier: member.user?.membershipTier || 'member',
          verificationBadge: member.user?.verificationBadge || false,
          role: member.role || 'member',
          joinedAt: member.joinedAt,
          isOnline: member.user?.isOnline || false,
          lastSeen: member.user?.lastSeen
        })),
        memberCount: chatRoom.memberCount || 0,
        entryFee: chatRoom.entryFee || 0,
        ageRestriction: chatRoom.ageRestriction || { minAge: 18, maxAge: 100 },
        settings: chatRoom.settings || { maxMembers: 100, allowGifts: true, allowCoinGifts: true, moderationEnabled: false },
        stats: chatRoom.stats || { totalMembers: 0, totalMessages: 0, totalCoinsReceived: 0, totalGiftsReceived: 0 },
        userStatus: {
          isMember,
          isOwner,
          canJoin: !isMember && (chatRoom.type === 'public' || userId)
        },
        createdAt: chatRoom.createdAt,
        lastActivity: chatRoom.lastActivity || chatRoom.createdAt
      }
    });

  } catch (error) {
    console.error('Error fetching chat room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat room',
      error: error.message
    });
  }
});

// GET /api/chatroom/:roomId/online-users - ดึงข้อมูลคนออนไลน์ (อนุญาตให้ดูได้โดยไม่ต้องเป็นสมาชิก)
router.get('/:roomId/online-users', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, includeSystemUsers = false } = req.query;

    console.log(`📊 Fetching online users for room ${roomId}, user ${userId}, includeSystemUsers: ${includeSystemUsers}`);

    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      console.log(`❌ Room ${roomId} not found`);
      return res.status(404).json({ success: false, message: 'Chat room not found' });
    }

    console.log(`✅ Room ${roomId} found - Type: ${chatRoom.type}, Members: ${chatRoom.members.length}`);

    // ตรวจสอบสิทธิ์ - ให้ดูข้อมูลคนออนไลน์ได้เลย (ไม่ตรวจสอบสิทธิ์)
    console.log(`🔍 Room ${roomId} (${chatRoom.type}) - User ${userId} - Allowing access to online users`);

    let onlineCount = 0;
    
    // คำนวณจำนวนคนออนไลน์ที่ใช้งานจริงในห้องแชทนี้ (มีการส่งข้อความใน 30 นาทีล่าสุด)
    const Message = require('../models/Message');
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    // นับจำนวนผู้ใช้ที่ไม่ซ้ำกันที่ส่งข้อความในห้องนี้ในช่วง 30 นาทีล่าสุด
    const activeUsers = await Message.distinct('sender', {
      chatRoom: roomId,
      createdAt: { $gte: thirtyMinutesAgo },
      isDeleted: { $ne: true }
    });
    
    onlineCount = activeUsers.length;
    console.log(`📝 Room "${chatRoom.name}": ${onlineCount} active users in last 30 minutes`);

    res.json({
      success: true,
      data: {
        roomId,
        onlineCount,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/chatroom/:roomId/pay-entry - จ่ายเหรียญเพื่อเข้าห้องแชท
router.post('/:roomId/pay-entry', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, amount } = req.body;

    console.log(`💰 Payment request: Room ${roomId}, User ${userId}, Amount ${amount}`);

    if (!userId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'User ID and amount are required'
      });
    }

    // ตรวจสอบห้องแชท
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }

    // ตรวจสอบว่าเป็นห้องส่วนตัวที่มีค่าธรรมเนียม
    if (chatRoom.type !== 'private' || chatRoom.entryFee <= 0) {
      return res.status(400).json({
        success: false,
        message: 'This room does not require payment'
      });
    }

    // ตรวจสอบจำนวนเหรียญที่จ่าย
    if (amount !== chatRoom.entryFee) {
      return res.status(400).json({
        success: false,
        message: `Invalid amount. Required: ${chatRoom.entryFee} coins`
      });
    }

    // ตรวจสอบผู้ใช้
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // ตรวจสอบเหรียญของผู้ใช้
    if (user.coins < amount) {
      return res.status(400).json({
        success: false,
        message: 'เหรียญของคุณไม่เพียงพอ'
      });
    }

    // ตรวจสอบว่าเคยจ่ายแล้วหรือยัง
    if (chatRoom.isMember(userId)) {
      return res.status(400).json({
        success: false,
        message: 'คุณได้จ่ายเหรียญแล้ว'
      });
    }

    // หักเหรียญจากผู้ใช้
    user.coins -= amount;
    await user.save();

    // เพิ่มผู้ใช้เป็นสมาชิกห้องแชท
    chatRoom.addMember(userId, 'member');
    await chatRoom.save();

    // บันทึกประวัติการจ่าย
    const PaymentHistory = require('../models/PaymentHistory');
    const paymentRecord = new PaymentHistory({
      userId: userId,
      roomId: roomId,
      amount: amount,
      type: 'room_entry',
      description: `จ่ายเหรียญเข้าห้องแชท: ${chatRoom.name}`,
      status: 'completed'
    });
    await paymentRecord.save();

    console.log(`✅ Payment successful: User ${userId} paid ${amount} coins for room ${roomId}`);

    res.json({
      success: true,
      message: 'จ่ายเหรียญสำเร็จ',
      data: {
        roomId: chatRoom._id,
        roomName: chatRoom.name,
        amount: amount,
        remainingCoins: user.coins,
        paymentId: paymentRecord._id
      }
    });

  } catch (error) {
    console.error('Error processing room entry payment:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการจ่ายเหรียญ',
      error: error.message
    });
  }
});
router.post('/:roomId/join', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    console.log('Join room request:', { roomId, userId });

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const [chatRoom, user] = await Promise.all([
      ChatRoom.findById(roomId),
      User.findById(userId)
    ]);

    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // สำหรับห้องสาธารณะ - เข้าได้เลยโดยไม่ต้องเป็นสมาชิก
    if (chatRoom.type === 'public') {
      // เพิ่มเป็นสมาชิกถ้ายังไม่ได้เป็น
      if (!chatRoom.isMember(userId)) {
        chatRoom.addMember(userId);
        await chatRoom.save();
      }
      
      return res.json({
        success: true,
        message: 'Successfully joined the public chat room',
        data: {
          roomId: chatRoom._id,
          roomName: chatRoom.name,
          memberCount: chatRoom.memberCount
        }
      });
    }

    // ตรวจสอบว่าเป็นสมาชิกอยู่แล้วหรือไม่ (สำหรับห้องส่วนตัว)
    if (chatRoom.isMember(userId)) {
      return res.json({
        success: true,
        message: 'Already a member of this chat room',
        data: {
          roomId: chatRoom._id,
          roomName: chatRoom.name,
          memberCount: chatRoom.memberCount
        }
      });
    }

    // ตรวจสอบข้อจำกัดอายุ - SuperAdmin ข้ามการตรวจสอบ
    console.log('Age check:', { 
      userAge: user.age, 
      minAge: chatRoom.ageRestriction?.minAge, 
      maxAge: chatRoom.ageRestriction?.maxAge 
    });
    
    if (!user.isSuperAdmin() && chatRoom.ageRestriction && (user.age < chatRoom.ageRestriction.minAge || user.age > chatRoom.ageRestriction.maxAge)) {
      console.log('Age restriction failed');
      return res.status(403).json({
        success: false,
        message: `Age restriction: ${chatRoom.ageRestriction.minAge}-${chatRoom.ageRestriction.maxAge} years old`
      });
    }

    // ตรวจสอบจำนวนสมาชิกสูงสุด - SuperAdmin ข้ามการตรวจสอบ
    console.log('Member count check:', { 
      currentCount: chatRoom.memberCount, 
      maxMembers: chatRoom.settings?.maxMembers 
    });
    
    if (!user.isSuperAdmin() && chatRoom.settings && chatRoom.memberCount >= chatRoom.settings.maxMembers) {
      console.log('Room is full');
      return res.status(403).json({
        success: false,
        message: 'Chat room is full'
      });
    }

    // ตรวจสอบค่าเข้าห้อง (สำหรับห้องแบบปิด) - SuperAdmin ข้ามการตรวจสอบ
    if (chatRoom.type === 'private' && chatRoom.entryFee > 0 && !user.isSuperAdmin()) {
      if (user.coins < chatRoom.entryFee) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient coins to join this room',
          required: chatRoom.entryFee,
          current: user.coins
        });
      }

      // หักเหรียญและโอนให้เจ้าของห้อง
      user.coins -= chatRoom.entryFee;
      
      const owner = await User.findById(chatRoom.owner);
      if (owner) {
        owner.coins += chatRoom.entryFee;
        chatRoom.stats.totalCoinsReceived += chatRoom.entryFee;
        await owner.save();
      }
    }

    // เพิ่มเป็นสมาชิก
    chatRoom.addMember(userId);
    chatRoom.lastActivity = new Date();

    await Promise.all([
      chatRoom.save(),
      user.save()
    ]);

    res.json({
      success: true,
      message: 'Successfully joined the chat room',
      data: {
        roomId: chatRoom._id,
        roomName: chatRoom.name,
        memberCount: chatRoom.memberCount,
        entryFeePaid: chatRoom.type === 'private' ? chatRoom.entryFee : 0,
        remainingCoins: user.coins
      }
    });

  } catch (error) {
    console.error('Error joining chat room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join chat room',
      error: error.message
    });
  }
});

// POST /api/chatroom/:roomId/message - ส่งข้อความในห้องแชท
router.post('/:roomId/message', auth, chatroomAccess, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, message, type = 'text' } = req.body;

    if (!userId || !message) {
      return res.status(400).json({
        success: false,
        message: 'User ID and message are required'
      });
    }

    const [chatRoom, user] = await Promise.all([
      ChatRoom.findById(roomId),
      User.findById(userId)
    ]);

    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // ตรวจสอบว่าเป็นสมาชิกในห้องหรือไม่
    if (!chatRoom.isMember(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member of this chat room to send messages'
      });
    }

    // ตรวจสอบสิทธิ์การแชทตาม membership
    const limits = user.getMembershipLimits();
    
    if (limits.dailyChats !== -1 && user.dailyUsage.chatCount >= limits.dailyChats) {
      return res.status(403).json({
        success: false,
        message: `Daily chat limit reached. You can send ${limits.dailyChats} messages per day.`,
        limit: limits.dailyChats,
        current: user.dailyUsage.chatCount
      });
    }

    // สร้างข้อความ
    const newMessage = {
      id: new mongoose.Types.ObjectId(),
      sender: {
        id: user._id,
        username: user.username || 'Unknown',
        displayName: user.displayName || user.username || 'Unknown',
        membershipTier: user.membership.tier || 'member',
        verificationBadge: user.verificationBadge || false
      },
      content: message,
      type: type,
      timestamp: new Date()
    };

    // เพิ่มข้อความลงในห้อง
    chatRoom.messages = chatRoom.messages || [];
    chatRoom.messages.push(newMessage);
    chatRoom.lastActivity = new Date();
    chatRoom.stats.totalMessages += 1;

    // อัปเดตการใช้งานรายวันของผู้ใช้
    user.dailyUsage.chatCount += 1;

    await Promise.all([
      chatRoom.save(),
      user.save()
    ]);

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: {
        id: newMessage.id,
        sender: newMessage.sender,
        content: newMessage.content,
        type: newMessage.type,
        timestamp: newMessage.timestamp,
        roomId: chatRoom._id,
        roomName: chatRoom.name
      }
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

// POST /api/chatroom/:roomId/gift-coins - มอบเหรียญให้เจ้าของห้อง
router.post('/:roomId/gift-coins', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { senderId, amount } = req.body;

    if (!senderId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Sender ID and valid amount are required'
      });
    }

    // ตรวจสอบจำนวนที่อนุญาต
    const allowedAmounts = [1000, 2000, 3000, 5000, 10000];
    if (!allowedAmounts.includes(amount)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount. Allowed amounts: ' + allowedAmounts.join(', ')
      });
    }

    const [chatRoom, sender] = await Promise.all([
      ChatRoom.findById(roomId).populate('owner'),
      User.findById(senderId)
    ]);

    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }

    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Sender not found'
      });
    }

    // ตรวจสอบว่าไม่ใช่เจ้าของห้องเอง
    if (chatRoom.isOwner(senderId)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot gift coins to yourself'
      });
    }

    // ตรวจสอบยอดเหรียญ
    if (sender.coins < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient coins',
        required: amount,
        current: sender.coins
      });
    }

    // โอนเหรียญ
    sender.coins -= amount;
    chatRoom.owner.coins += amount;
    chatRoom.stats.totalCoinsReceived += amount;
    chatRoom.lastActivity = new Date();

    await Promise.all([
      sender.save(),
      chatRoom.owner.save(),
      chatRoom.save()
    ]);

    res.json({
      success: true,
      message: `Successfully gifted ${amount} coins to ${chatRoom.owner.displayName}`,
      data: {
        amount,
        sender: {
          remainingCoins: sender.coins
        },
        receiver: {
          username: chatRoom.owner.username,
          displayName: chatRoom.owner.displayName,
          totalCoins: chatRoom.owner.coins
        },
        room: {
          totalCoinsReceived: chatRoom.stats.totalCoinsReceived
        }
      }
    });

  } catch (error) {
    console.error('Error gifting coins to room owner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to gift coins',
      error: error.message
    });
  }
});

// DELETE /api/chatroom/:roomId/leave - ออกจากห้องแชท
router.delete('/:roomId/leave', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }

    // ตรวจสอบว่าเป็นสมาชิกหรือไม่
    if (!chatRoom.isMember(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Not a member of this chat room'
      });
    }

    // ตรวจสอบว่าเป็นเจ้าของห้องหรือไม่
    if (chatRoom.isOwner(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Room owner cannot leave the room. Delete the room instead.'
      });
    }

    // ลบออกจากสมาชิก
    chatRoom.removeMember(userId);
    chatRoom.lastActivity = new Date();

    await chatRoom.save();

    res.json({
      success: true,
      message: 'Successfully left the chat room',
      data: {
        roomId: chatRoom._id,
        memberCount: chatRoom.memberCount
      }
    });

  } catch (error) {
    console.error('Error leaving chat room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave chat room',
      error: error.message
    });
  }
});

// GET /api/chatroom/user/:userId - ดูห้องแชทของผู้ใช้
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type = 'all' } = req.query;

    let query = {};
    
    if (type === 'owned') {
      query.owner = userId;
    } else if (type === 'joined') {
      query['members.user'] = userId;
      query.owner = { $ne: userId };
    } else {
      query = {
        $or: [
          { owner: userId },
          { 'members.user': userId }
        ]
      };
    }

    query.isActive = true;

    const chatRooms = await ChatRoom.find(query)
      .populate('owner', 'username displayName membershipTier')
      .sort({ lastActivity: -1 });

    res.json({
      success: true,
      data: {
        chatRooms: chatRooms.map(room => ({
          id: room._id,
          name: room.name,
          type: room.type,
          owner: {
            id: room.owner._id,
            username: room.owner.username,
            displayName: room.owner.displayName,
            membershipTier: room.owner.membershipTier
          },
          memberCount: room.memberCount,
          userRole: room.isOwner(userId) ? 'owner' : 'member',
          lastActivity: room.lastActivity,
          stats: room.stats
        })),
        summary: {
          total: chatRooms.length,
          owned: chatRooms.filter(room => room.isOwner(userId)).length,
          joined: chatRooms.filter(room => !room.isOwner(userId)).length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user chat rooms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user chat rooms',
      error: error.message
    });
  }
});

// POST /api/chatroom/upload - อัปโหลดไฟล์
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// สร้างโฟลเดอร์สำหรับเก็บไฟล์
const uploadDir = path.join(__dirname, '../uploads/chat-files');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ตั้งค่า multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: function (req, file, cb) {
    // อนุญาตเฉพาะรูปภาพ
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('อนุญาตเฉพาะไฟล์รูปภาพเท่านั้น'), false);
    }
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('📤 Upload request received');
    console.log('📁 File:', req.file);
    console.log('📝 Body:', req.body);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบไฟล์ที่อัปโหลด'
      });
    }

    const { chatRoomId, senderId } = req.body;

    if (!chatRoomId || !senderId) {
      return res.status(400).json({
        success: false,
        message: 'chatRoomId และ senderId จำเป็น'
      });
    }

    // ตรวจสอบสิทธิ์
    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบห้องแชท'
      });
    }

    // ตรวจสอบว่าเป็นสมาชิกในห้องหรือไม่
    if (!chatRoom.isMember(senderId) && !chatRoom.isOwner(senderId)) {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์อัปโหลดไฟล์ในห้องนี้'
      });
    }

    // สร้าง URL สำหรับไฟล์
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`
      : `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/chat-files/${req.file.filename}`;

    const response = {
      success: true,
      message: 'อัปโหลดไฟล์สำเร็จ',
      data: {
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype
      }
    };

    console.log('✅ Upload response:', response);
    res.json(response);

  } catch (error) {
    console.error('❌ Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์',
      error: error.message
    });
  }
});

module.exports = router;

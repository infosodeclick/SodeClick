const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const MembershipPlan = require('../models/MembershipPlan');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const { requireAdmin, requireSuperAdmin } = require('../middleware/adminAuth');
const { requireAdminPermissions, ADMIN_PERMISSIONS } = require('../middleware/adminPermissions');

// Get all users with pagination
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const role = req.query.role || '';
    const status = req.query.status || '';
    const premium = req.query.premium || '';
    const sort = req.query.sort || '-createdAt';

    const query = {};
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
    }

    if (status === 'active') {
      query.isActive = true;
      query.isBanned = false;
    } else if (status === 'banned') {
      query.isBanned = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    // Filter for premium users only
    if (premium === 'true') {
      query['membership.tier'] = { 
        $in: ['platinum', 'diamond', 'vip2', 'vip1', 'vip', 'gold', 'silver'] 
      };
    }

    // ซ่อน admin และ superadmin จากรายการทั้งหมด (ไม่ว่าจะเป็น admin หรือ superadmin)
    query.role = { $nin: ['admin', 'superadmin'] };

    const skip = (page - 1) * limit;
    
    const users = await User.find(query)
      .select('-password -phoneVerificationCode -phoneVerificationExpires')
      .populate('membership.planId')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get premium statistics
router.get('/premium/stats', requireAdmin, async (req, res) => {
  try {
    const membershipTiers = ['platinum', 'diamond', 'vip2', 'vip1', 'vip', 'gold', 'silver'];
    const stats = {};

    // Count users by membership tier (ไม่รวม SuperAdmin)
    for (const tier of membershipTiers) {
      const count = await User.countDocuments({
        'membership.tier': tier,
        isActive: true,
        role: { $ne: 'superadmin' } // ไม่รวม SuperAdmin ในสถิติ
      });
      stats[tier] = count;
    }

    // Calculate total premium users
    stats.totalPremium = membershipTiers.reduce((total, tier) => total + stats[tier], 0);

    // Calculate revenue based on membership prices
    const prices = {
      platinum: 1000,
      diamond: 500,
      vip2: 300,
      vip1: 150,
      vip: 100,
      gold: 50,
      silver: 20
    };

    // Calculate total revenue
    stats.totalRevenue = membershipTiers.reduce((total, tier) => {
      return total + (stats[tier] * prices[tier]);
    }, 0);

    // Calculate monthly revenue (assuming all memberships are monthly)
    const monthlyTiers = ['platinum', 'diamond', 'vip2', 'vip1', 'vip'];
    stats.monthlyRevenue = monthlyTiers.reduce((total, tier) => {
      return total + (stats[tier] * prices[tier]);
    }, 0);

    // Add Gold and Silver revenue (they have different durations)
    stats.monthlyRevenue += stats.gold * prices.gold * 2; // 15 days = 2 per month
    stats.monthlyRevenue += stats.silver * prices.silver * 4; // 7 days = 4 per month

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get banned users with pagination
router.get('/banned-users', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const sort = req.query.sort || '-createdAt';

    const query = { isBanned: true };
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { banReason: { $regex: search, $options: 'i' } }
      ];
    }

    // ซ่อน admin และ superadmin จากรายการผู้ใช้ที่ถูกแบน
    query.role = { $nin: ['admin', 'superadmin'] };

    const skip = (page - 1) * limit;
    
    const users = await User.find(query)
      .select('-password -phoneVerificationCode -phoneVerificationExpires')
      .populate('membership.planId')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user by ID
router.get('/users/:id', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -phoneVerificationCode -phoneVerificationExpires')
      .populate('membership.planId');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Admin ไม่สามารถดูรายละเอียด SuperAdmin ได้
    if (req.user.role === 'admin' && user.role === 'superadmin') {
      return res.status(403).json({ 
        message: 'Cannot view SuperAdmin details',
        error: 'Admin users cannot view SuperAdmin account details'
      });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user
router.put('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { role, membership, isActive, isBanned, banReason, coins, votePoints, profileImages, firstName, lastName, email } = req.body;
    
    // ตรวจสอบว่าผู้ใช้ที่จะแก้ไขเป็น SuperAdmin หรือไม่
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Admin ไม่สามารถแก้ไข SuperAdmin ได้
    if (req.user.role === 'admin' && targetUser.role === 'superadmin') {
      return res.status(403).json({ 
        message: 'Cannot modify SuperAdmin user',
        error: 'Admin users cannot modify SuperAdmin accounts'
      });
    }
    
    const updateData = {};
    
    if (role && ['user', 'admin', 'superadmin'].includes(role)) {
      updateData.role = role;
    }
    
    if (membership) {
      updateData.membership = membership;
    }
    
    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
    }
    
    if (typeof isBanned === 'boolean') {
      updateData.isBanned = isBanned;
    }
    
    if (banReason !== undefined) {
      updateData.banReason = banReason;
    }
    
    if (typeof coins === 'number') {
      updateData.coins = coins;
    }
    
    if (typeof votePoints === 'number') {
      updateData.votePoints = votePoints;
    }
    
    if (profileImages && Array.isArray(profileImages)) {
      updateData.profileImages = profileImages;
    }
    
    if (firstName) {
      updateData.firstName = firstName;
    }
    
    if (lastName) {
      updateData.lastName = lastName;
    }
    
    if (email) {
      updateData.email = email;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-password -phoneVerificationCode -phoneVerificationExpires')
     .populate('membership.planId');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Ban/Unban user
router.patch('/users/:id/ban', requireAdmin, async (req, res) => {
  try {
    const { isBanned, banReason } = req.body;
    
    // ตรวจสอบว่าผู้ใช้ที่จะแบนเป็น SuperAdmin หรือไม่
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Admin ไม่สามารถแบน SuperAdmin ได้
    if (req.user.role === 'admin' && targetUser.role === 'superadmin') {
      return res.status(403).json({ 
        message: 'Cannot ban SuperAdmin user',
        error: 'Admin users cannot ban SuperAdmin accounts'
      });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        isBanned: isBanned,
        banReason: isBanned ? banReason : null
      },
      { new: true }
    ).select('-password -phoneVerificationCode -phoneVerificationExpires')
     .populate('membership.planId');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Ban user with duration
router.patch('/users/:id/ban-duration', requireAdmin, async (req, res) => {
  try {
    const { isBanned, banReason, banDuration, banDurationType } = req.body;
    
    // ตรวจสอบว่าผู้ใช้ที่จะแบนเป็น SuperAdmin หรือไม่
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Admin ไม่สามารถแบน SuperAdmin ได้
    if (req.user.role === 'admin' && targetUser.role === 'superadmin') {
      return res.status(403).json({ 
        message: 'Cannot ban SuperAdmin user',
        error: 'Admin users cannot ban SuperAdmin accounts'
      });
    }
    
    let banExpiresAt = null;
    if (isBanned && banDuration && banDurationType) {
      const now = new Date();
      switch (banDurationType) {
        case 'hours':
          banExpiresAt = new Date(now.getTime() + (banDuration * 60 * 60 * 1000));
          break;
        case 'days':
          banExpiresAt = new Date(now.getTime() + (banDuration * 24 * 60 * 60 * 1000));
          break;
        case 'months':
          banExpiresAt = new Date(now.getTime() + (banDuration * 30 * 24 * 60 * 60 * 1000));
          break;
        case 'permanent':
          banExpiresAt = null; // Permanent ban
          break;
      }
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        isBanned: isBanned,
        banReason: isBanned ? banReason : null,
        banExpiresAt: banExpiresAt
      },
      { new: true }
    ).select('-password -phoneVerificationCode -phoneVerificationExpires')
     .populate('membership.planId');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new user (admin only)
router.post('/users', requireAdmin, async (req, res) => {
  try {
    console.log('Creating user with data:', req.body);
    
    const { 
      username, 
      email, 
      password, 
      firstName, 
      lastName, 
      dateOfBirth, 
      gender, 
      lookingFor, 
      location,
      role = 'user',
      membership = { tier: 'member' }
    } = req.body;

    // Validate required fields
    if (!username || !email || !password || !firstName || !lastName || !dateOfBirth || !gender || !lookingFor || !location) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['username', 'email', 'password', 'firstName', 'lastName', 'dateOfBirth', 'gender', 'lookingFor', 'location']
      });
    }

    // Validate username length
    if (username.length < 3) {
      return res.status(400).json({ 
        message: 'Username must be at least 3 characters long' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Invalid email format' 
      });
    }

    // Validate date format
    const parsedDate = new Date(dateOfBirth);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ 
        message: 'Invalid date format for dateOfBirth' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: 'User with this email or username already exists' 
      });
    }

    // Create new user with proper data structure
    // Note: User model will hash password automatically via pre-save middleware
    const newUser = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: password, // Send plain password, model will hash it
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      displayName: `${firstName} ${lastName}`,
      dateOfBirth: parsedDate,
      gender,
      lookingFor,
      location: location.trim(),
      role,
      membership: {
        tier: membership?.tier || 'member',
        startDate: new Date(),
        endDate: membership?.tier === 'member' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now for paid tiers
        autoRenew: false,
        planId: null
      },
      isActive: true,
      isBanned: false,
      gpsLocation: {
        lat: 13.7563, // Default to Bangkok
        lng: 100.5018
      },
      coordinates: {
        type: 'Point',
        coordinates: [100.5018, 13.7563]
      },
      dailyUsage: {
        chatCount: 0,
        imageUploadCount: 0,
        videoUploadCount: 0,
        lastReset: new Date(),
        lastDailyBonusClaim: null,
        lastSpinWheelTime: null
      },
      lastActive: new Date(),
      // เพิ่มข้อมูลเริ่มต้นสำหรับ fields ที่อาจจำเป็น
      profileImages: [],
      likes: [],
      blurredPhotosViewed: [],
      pinnedPosts: [],
      blurredPrivatePhotos: [],
      createdChatRooms: [],
      loginHistory: []
    });

    console.log('Saving user with data:', {
      username: newUser.username,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      membership: newUser.membership
    });
    
    await newUser.save();

    const userResponse = await User.findById(newUser._id)
      .select('-password -phoneVerificationCode -phoneVerificationExpires')
      .populate('membership.planId');

    console.log('User created successfully:', userResponse._id);
    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Error creating user:', error);
    // Duplicate key (email/username) error
    if (error && (error.code === 11000 || error.code === 'E11000')) {
      const dupField = Object.keys(error.keyValue || {})[0] || 'field'
      return res.status(400).json({
        message: 'Duplicate value',
        error: `${dupField} already exists`,
        keyValue: error.keyValue
      });
    }
    // Mongoose validation error details
    if (error && error.name === 'ValidationError') {
      console.log('❌ Validation Error Details:', error.errors);
      console.log('❌ Validation Error Name:', error.name);
      console.log('❌ Validation Error Message:', error.message);
      
      const details = Object.keys(error.errors || {}).map(k => ({
        field: k,
        message: error.errors[k]?.message,
        value: error.errors[k]?.value,
        kind: error.errors[k]?.kind,
        path: error.errors[k]?.path
      }))
      console.log('❌ Validation Error Details Formatted:', details);
      return res.status(400).json({
        message: 'Validation failed',
        errors: details
      });
    }
    // Default
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message
    });
  }
});

// Get user profile details
router.get('/users/:id/profile', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -phoneVerificationCode -phoneVerificationExpires')
      .populate('membership.planId');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Admin ไม่สามารถดูรายละเอียดโปรไฟล์ SuperAdmin ได้
    if (req.user.role === 'admin' && user.role === 'superadmin') {
      return res.status(403).json({ 
        message: 'Cannot view SuperAdmin profile',
        error: 'Admin users cannot view SuperAdmin profile details'
      });
    }

    // Calculate age
    const age = user.age;

    res.json({
      ...user.toObject(),
      age
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user role
router.patch('/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['user', 'admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // ตรวจสอบว่าผู้ใช้ที่จะแก้ไขเป็น SuperAdmin หรือไม่
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Admin ไม่สามารถแก้ไข role ของ SuperAdmin ได้
    if (req.user.role === 'admin' && targetUser.role === 'superadmin') {
      return res.status(403).json({ 
        message: 'Cannot modify SuperAdmin role',
        error: 'Admin users cannot modify SuperAdmin roles'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password -phoneVerificationCode -phoneVerificationExpires')
     .populate('membership.planId');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user membership
router.patch('/users/:id/membership', requireAdmin, async (req, res) => {
  try {
    const { membership } = req.body;
    
    // ตรวจสอบว่าผู้ใช้ที่จะแก้ไขเป็น SuperAdmin หรือไม่
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Admin ไม่สามารถแก้ไข membership ของ SuperAdmin ได้
    if (req.user.role === 'admin' && targetUser.role === 'superadmin') {
      return res.status(403).json({ 
        message: 'Cannot modify SuperAdmin membership',
        error: 'Admin users cannot modify SuperAdmin memberships'
      });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { membership },
      { new: true }
    ).select('-password -phoneVerificationCode -phoneVerificationExpires')
     .populate('membership.planId');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete user (admin only)
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    console.log('🗑️ Delete user request - Admin:', req.user.username, 'Target ID:', req.params.id);
    
    // ตรวจสอบว่าผู้ใช้ที่จะลบมีอยู่หรือไม่
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      console.log('❌ Target user not found');
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('🎯 Target user found:', targetUser.username, 'Role:', targetUser.role);

    // Admin ปกติไม่สามารถลบ SuperAdmin ได้
    if (targetUser.role === 'superadmin' && req.user.role !== 'superadmin') {
      console.log('❌ Cannot delete SuperAdmin');
      return res.status(403).json({ 
        message: 'Cannot delete SuperAdmin user',
        error: 'Only SuperAdmin can delete SuperAdmin users'
      });
    }

    // Admin ไม่สามารถลบตัวเองได้
    if (targetUser._id.toString() === req.user._id.toString()) {
      console.log('❌ Cannot delete self');
      return res.status(403).json({ 
        message: 'Cannot delete yourself',
        error: 'You cannot delete your own account'
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    console.log('✅ User deleted successfully:', targetUser.username);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.log('❌ Delete user error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get dashboard statistics
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    // 1. ผู้ใช้ทั้งหมด (ไม่รวม SuperAdmin)
    const totalUsers = await User.countDocuments({ role: { $ne: 'superadmin' } });
    
    // 2. ข้อความทั้งหมด (จาก chat messages)
    const totalMessages = await User.aggregate([
      {
        $group: {
          _id: null,
          totalMessages: { $sum: { $ifNull: ['$dailyUsage.chatCount', 0] } }
        }
      }
    ]);
    
    // 3. ผู้ใช้ออนไลน์ (ผู้ใช้ที่ active และไม่ถูกแบน) - ไม่รวม SuperAdmin
    const onlineUsers = await User.countDocuments({ 
      isActive: true, 
      isBanned: false,
      role: { $ne: 'superadmin' }
    });
    
    // 4. สมาชิก Premium (ผู้ใช้ที่มี membership tier เป็น premium หรือสูงกว่า) - ไม่รวม SuperAdmin
    const premiumUsers = await User.countDocuments({
      'membership.tier': { $in: ['premium', 'vip', 'diamond'] },
      isActive: true,
      isBanned: false,
      role: { $ne: 'superadmin' }
    });

    // สถิติตามระดับชั้นสมาชิก (ไม่รวม SuperAdmin)
    const membershipStats = await User.aggregate([
      {
        $match: { role: { $ne: 'superadmin' } }
      },
      {
        $group: {
          _id: '$membership.tier',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // สถิติตาม role (ไม่รวม SuperAdmin)
    const roleStats = await User.aggregate([
      {
        $match: { role: { $ne: 'superadmin' } }
      },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // ผู้ใช้ที่ถูกแบน (ไม่รวม SuperAdmin)
    const bannedUsers = await User.countDocuments({ 
      isBanned: true,
      role: { $ne: 'superadmin' }
    });
    
    // ผู้ใช้ที่ยืนยันแล้ว (ไม่รวม SuperAdmin)
    const verifiedUsers = await User.countDocuments({ 
      isVerified: true,
      role: { $ne: 'superadmin' }
    });

    // ผู้ใช้ใหม่ในเดือนนี้ (ไม่รวม SuperAdmin)
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: currentMonth },
      role: { $ne: 'superadmin' }
    });

    // ผู้ใช้ที่ active ในเดือนนี้ (ไม่รวม SuperAdmin)
    const activeUsersThisMonth = await User.countDocuments({
      isActive: true,
      isBanned: false,
      lastLoginAt: { $gte: currentMonth },
      role: { $ne: 'superadmin' }
    });

    res.json({
      totalUsers,
      totalMessages: totalMessages[0]?.totalMessages || 0,
      onlineUsers,
      premiumUsers,
      bannedUsers,
      verifiedUsers,
      newUsersThisMonth,
      activeUsersThisMonth,
      membershipStats,
      roleStats
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get membership plans
router.get('/membership-plans', requireAdmin, async (req, res) => {
  try {
    const plans = await MembershipPlan.find().sort({ order: 1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== ADMIN CHAT MANAGEMENT ====================

// GET /api/admin/chatrooms - ดูรายการห้องแชททั้งหมด
router.get('/chatrooms', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const type = req.query.type || '';
    const sort = req.query.sort || '-createdAt';

    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (type) {
      query.type = type;
    }

    const skip = (page - 1) * limit;
    
    const chatRooms = await ChatRoom.find(query)
      .populate('owner', 'username displayName membershipTier')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await ChatRoom.countDocuments(query);

    res.json({
      chatRooms,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/admin/chatrooms/:roomId - ลบห้องแชท
router.delete('/chatrooms/:roomId', requireAdmin, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    // ลบข้อความทั้งหมดในห้อง
    await Message.deleteMany({ chatRoom: roomId });

    // ลบห้องแชท
    await ChatRoom.findByIdAndDelete(roomId);

    res.json({ 
      message: 'Chat room deleted successfully',
      deletedRoom: {
        id: chatRoom._id,
        name: chatRoom.name,
        type: chatRoom.type
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/admin/messages - ดูรายการข้อความทั้งหมด
router.get('/messages', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    const roomId = req.query.roomId || '';
    const type = req.query.type || '';
    const sort = req.query.sort || '-createdAt';

    const query = { isDeleted: false };
    
    if (search) {
      query.content = { $regex: search, $options: 'i' };
    }

    if (roomId) {
      query.chatRoom = roomId;
    }

    if (type) {
      query.messageType = type;
    }

    const skip = (page - 1) * limit;
    
    const messages = await Message.find(query)
      .populate('sender', 'username displayName membership membershipTier')
      .populate('chatRoom', 'name type')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments(query);

    res.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/admin/messages/:messageId - ลบข้อความ
router.delete('/messages/:messageId', requireAdmin, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // ลบข้อความ
    await Message.findByIdAndDelete(messageId);

    res.json({ 
      message: 'Message deleted successfully',
      deletedMessage: {
        id: message._id,
        content: message.content,
        messageType: message.messageType
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/admin/messages/room/:roomId - ลบข้อความทั้งหมดในห้อง
router.delete('/messages/room/:roomId', requireAdmin, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    // ลบข้อความทั้งหมดในห้อง
    const result = await Message.deleteMany({ chatRoom: roomId });

    res.json({ 
      message: 'All messages in room deleted successfully',
      deletedCount: result.deletedCount,
      roomName: chatRoom.name
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/admin/images/:messageId - ลบรูปภาพจากข้อความ
router.delete('/images/:messageId', requireAdmin, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.messageType !== 'image') {
      return res.status(400).json({ message: 'Message is not an image' });
    }

    // ลบไฟล์รูปภาพถ้ามี
    if (message.fileUrl) {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '..', message.fileUrl);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // ลบข้อความรูปภาพ
    await Message.findByIdAndDelete(messageId);

    res.json({ 
      message: 'Image deleted successfully',
      deletedImage: {
        id: message._id,
        fileName: message.fileName,
        fileUrl: message.fileUrl
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/admin/images/room/:roomId - ลบรูปภาพทั้งหมดในห้อง
router.delete('/images/room/:roomId', requireAdmin, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    // หาข้อความรูปภาพทั้งหมดในห้อง
    const imageMessages = await Message.find({ 
      chatRoom: roomId, 
      messageType: 'image',
      isDeleted: false 
    });

    // ลบไฟล์รูปภาพ
    const fs = require('fs');
    const path = require('path');
    
    for (const message of imageMessages) {
      if (message.fileUrl) {
        const filePath = path.join(__dirname, '..', message.fileUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    // ลบข้อความรูปภาพทั้งหมด
    const result = await Message.deleteMany({ 
      chatRoom: roomId, 
      messageType: 'image' 
    });

    res.json({ 
      message: 'All images in room deleted successfully',
      deletedCount: result.deletedCount,
      roomName: chatRoom.name
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== ADMIN CHAT ROOM CREATION ====================

// POST /api/admin/chatrooms/create - สร้างห้องแชทใหม่
router.post('/chatrooms/create', requireAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      type = 'private',
      entryFee = 0,
      entryConditions = {},
      ageRestriction = {},
      settings = {},
      inviteLink = {}
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Room name is required' });
    }

    // สร้าง invite code ถ้ามีการตั้งค่า
    let inviteCode = null;
    if (inviteLink.generateLink) {
      inviteCode = generateInviteCode();
    }

    // สร้างห้องแชท
    const chatRoom = new ChatRoom({
      name: name.trim(),
      description: description?.trim(),
      type,
      owner: req.user._id, // Admin เป็นเจ้าของ
      entryFee,
      entryConditions: {
        requiredCoins: entryConditions.requiredCoins || 0,
        specialConditions: entryConditions.specialConditions || '',
        requireRealPayment: entryConditions.requireRealPayment || false,
        realPaymentAmount: entryConditions.realPaymentAmount || 0
      },
      ageRestriction: {
        minAge: ageRestriction.minAge || 18,
        maxAge: ageRestriction.maxAge || 100
      },
      settings: {
        maxMembers: settings.maxMembers || 100,
        allowGifts: settings.allowGifts !== false,
        allowCoinGifts: settings.allowCoinGifts !== false,
        moderationEnabled: settings.moderationEnabled || false
      },
      inviteLink: inviteCode ? {
        code: inviteCode,
        isActive: true,
        expiresAt: inviteLink.expiresAt ? new Date(inviteLink.expiresAt) : null,
        maxUses: inviteLink.maxUses || -1,
        usedCount: 0
      } : undefined
    });

    await chatRoom.save();

    res.json({
      message: 'Chat room created successfully',
      chatRoom: {
        id: chatRoom._id,
        name: chatRoom.name,
        type: chatRoom.type,
        entryFee: chatRoom.entryFee,
        entryConditions: chatRoom.entryConditions,
        inviteLink: chatRoom.inviteLink
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/admin/chatrooms/:roomId/invite-link - สร้าง invite link
router.post('/chatrooms/:roomId/invite-link', requireAdmin, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { expiresAt, maxUses } = req.body;

    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    const inviteCode = generateInviteCode();
    
    chatRoom.inviteLink = {
      code: inviteCode,
      isActive: true,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      maxUses: maxUses || -1,
      usedCount: 0
    };

    await chatRoom.save();

    res.json({
      message: 'Invite link created successfully',
      inviteLink: chatRoom.inviteLink
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/admin/chatrooms/:roomId/invite-link - ดู invite link
router.get('/chatrooms/:roomId/invite-link', requireAdmin, async (req, res) => {
  try {
    const { roomId } = req.params;

    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    if (!chatRoom.inviteLink || !chatRoom.inviteLink.code) {
      return res.status(404).json({ message: 'No invite link found' });
    }

    res.json({
      inviteLink: chatRoom.inviteLink,
      fullUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/join/${chatRoom.inviteLink.code}`
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/admin/chatrooms/:roomId/invite-link - ลบ invite link
router.delete('/chatrooms/:roomId/invite-link', requireAdmin, async (req, res) => {
  try {
    const { roomId } = req.params;

    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    chatRoom.inviteLink = undefined;
    await chatRoom.save();

    res.json({ message: 'Invite link deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/admin/chatrooms/join-by-invite - เข้าร่วมห้องด้วย invite link
router.post('/chatrooms/join-by-invite', async (req, res) => {
  try {
    const { inviteCode, userId } = req.body;

    if (!inviteCode || !userId) {
      return res.status(400).json({ message: 'Invite code and user ID are required' });
    }

    const chatRoom = await ChatRoom.findOne({ 'inviteLink.code': inviteCode });
    if (!chatRoom) {
      return res.status(404).json({ message: 'Invalid invite link' });
    }

    // ตรวจสอบว่า invite link ยังใช้งานได้หรือไม่
    if (!chatRoom.inviteLink.isActive) {
      return res.status(400).json({ message: 'Invite link is inactive' });
    }

    if (chatRoom.inviteLink.expiresAt && new Date() > chatRoom.inviteLink.expiresAt) {
      return res.status(400).json({ message: 'Invite link has expired' });
    }

    if (chatRoom.inviteLink.maxUses !== -1 && chatRoom.inviteLink.usedCount >= chatRoom.inviteLink.maxUses) {
      return res.status(400).json({ message: 'Invite link usage limit reached' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // ตรวจสอบเงื่อนไขการเข้าห้อง
    const canJoin = await checkEntryConditions(chatRoom, user);
    if (!canJoin.success) {
      return res.status(403).json({ message: canJoin.message });
    }

    // เพิ่มผู้ใช้เป็นสมาชิก
    if (!chatRoom.isMember(userId)) {
      chatRoom.addMember(userId);
      chatRoom.inviteLink.usedCount += 1;
      await chatRoom.save();
    }

    res.json({
      message: 'Successfully joined chat room',
      chatRoom: {
        id: chatRoom._id,
        name: chatRoom.name,
        type: chatRoom.type
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper function สำหรับสร้าง invite code
function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper function สำหรับตรวจสอบเงื่อนไขการเข้าห้อง
async function checkEntryConditions(chatRoom, user) {
  // ตรวจสอบจำนวนเหรียญ
  if (chatRoom.entryConditions.requiredCoins > 0) {
    if (user.coins < chatRoom.entryConditions.requiredCoins) {
      return {
        success: false,
        message: `ต้องมีเหรียญอย่างน้อย ${chatRoom.entryConditions.requiredCoins} เหรียญ`
      };
    }
  }

  // ตรวจสอบเงื่อนไขพิเศษ
  if (chatRoom.entryConditions.specialConditions) {
    const conditions = chatRoom.entryConditions.specialConditions.toLowerCase();
    
    if (conditions.includes('premium') && user.membership.tier === 'member') {
      return {
        success: false,
        message: 'ต้องเป็นสมาชิก Premium'
      };
    }
    
    if (conditions.includes('gold') && user.membership.tier !== 'gold') {
      return {
        success: false,
        message: 'ต้องเป็นสมาชิก Gold'
      };
    }
  }

  // ตรวจสอบการเสียเงินจริง
  if (chatRoom.entryConditions.requireRealPayment) {
    // ตรวจสอบว่าผู้ใช้มีเงินเพียงพอหรือไม่
    // (ต้องเชื่อมต่อกับระบบการชำระเงินจริง)
    return {
      success: false,
      message: `ต้องชำระเงิน ${chatRoom.entryConditions.realPaymentAmount} บาท`
    };
  }

  return { success: true };
}

// Get analytics data
router.get('/analytics', requireAdmin, async (req, res) => {
  try {
    const { period = '6months' } = req.query;
    
    // Calculate date range based on period
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '3months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case '6months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case '12months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 12, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    }

    // Generate monthly data
    const monthlyData = {
      users: [],
      revenue: [],
      performance: []
    };

    const months = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= now) {
      const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      const monthName = currentDate.toLocaleDateString('th-TH', { month: 'short' });
      months.push({ key: monthKey, name: monthName, date: new Date(currentDate) });
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Calculate monthly statistics
    for (const month of months) {
      const monthStart = new Date(month.date.getFullYear(), month.date.getMonth(), 1);
      const monthEnd = new Date(month.date.getFullYear(), month.date.getMonth() + 1, 0, 23, 59, 59);

      // Users count for this month (ไม่รวม SuperAdmin)
      const usersCount = await User.countDocuments({
        createdAt: { $gte: monthStart, $lte: monthEnd },
        isActive: true,
        role: { $ne: 'superadmin' }
      });

      // Total users up to this month (ไม่รวม SuperAdmin)
      const totalUsers = await User.countDocuments({
        createdAt: { $lte: monthEnd },
        isActive: true,
        role: { $ne: 'superadmin' }
      });

      // Revenue calculation - should connect to real payment system - ไม่รวม SuperAdmin
      const premiumUsers = await User.countDocuments({
        'membership.tier': { $in: ['platinum', 'diamond', 'vip2', 'vip1', 'vip', 'gold', 'silver'] },
        'membership.updatedAt': { $gte: monthStart, $lte: monthEnd },
        role: { $ne: 'superadmin' }
      });
      
      // Revenue calculation - placeholder for future payment system integration
      const revenue = 0; // Note: Would calculate from actual payment records when payment system is implemented

      // Performance calculation - placeholder for future monitoring system integration
      const performance = 0; // Note: Would calculate from actual system metrics when monitoring is implemented

      monthlyData.users.push({
        month: month.name,
        value: totalUsers,
        growth: month.key === months[0].key ? 0 : Math.floor(Math.random() * 20) + 5
      });

      monthlyData.revenue.push({
        month: month.name,
        value: revenue,
        growth: month.key === months[0].key ? 0 : Math.floor(Math.random() * 25) + 10
      });

      monthlyData.performance.push({
        month: month.name,
        value: Math.round(performance),
        growth: month.key === months[0].key ? 0 : Math.floor(Math.random() * 5) + 1
      });
    }

    // Calculate summary statistics (ไม่รวม SuperAdmin)
    const totalUsers = await User.countDocuments({ 
      isActive: true,
      role: { $ne: 'superadmin' }
    });
    const premiumUsers = await User.countDocuments({
      'membership.tier': { $in: ['platinum', 'diamond', 'vip2', 'vip1', 'vip', 'gold', 'silver'] },
      role: { $ne: 'superadmin' }
    });
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { 
        $gte: new Date(now.getFullYear(), now.getMonth(), 1),
        $lte: now
      },
      isActive: true,
      role: { $ne: 'superadmin' }
    });

    // Revenue calculation - placeholder for future payment system integration
    const totalRevenue = 0; // Note: Would sum from actual payment transactions when payment system is implemented

    // Performance calculation - placeholder for future monitoring system integration
    const avgPerformance = 0; // Note: Would calculate from actual system metrics when monitoring is implemented

    const summary = {
      totalUsers,
      totalRevenue,
      avgPerformance,
      newUsersThisMonth,
      premiumUsers
    };

    res.json({
      monthlyData,
      summary,
      period
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get recent activities
router.get('/activities', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // ดึงข้อมูลกิจกรรมล่าสุดแบบง่าย
    const allActivities = [];

    // 1. Recent registrations (ไม่รวม SuperAdmin)
    const recentUsers = await User.find({ role: { $ne: 'superadmin' } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('firstName lastName createdAt');

    recentUsers.forEach(user => {
      allActivities.push({
        id: `${user._id}-register-${user.createdAt.getTime()}`,
        type: 'account_created',
        message: `ผู้ใช้ใหม่สมัครสมาชิก: ${user.firstName} ${user.lastName}`,
        timestamp: user.createdAt,
        status: 'success'
      });
    });

    // 2. Premium users (ไม่รวม SuperAdmin)
    const premiumUsers = await User.find({
      'membership.tier': { $in: ['platinum', 'diamond', 'vip2', 'vip1', 'vip', 'gold', 'silver'] },
      role: { $ne: 'superadmin' }
    })
      .sort({ 'membership.updatedAt': -1 })
      .limit(5)
      .select('firstName lastName membership');

    premiumUsers.forEach(user => {
      if (user.membership && user.membership.updatedAt) {
        allActivities.push({
          id: `${user._id}-upgrade-${user.membership.updatedAt.getTime()}`,
          type: 'membership_upgrade',
          message: `อัพเกรดเป็น Premium: ${user.firstName} ${user.lastName}`,
          timestamp: user.membership.updatedAt,
          status: 'premium'
        });
      }
    });

    // 3. Banned users (ไม่รวม SuperAdmin)
    const bannedUsers = await User.find({ 
      isBanned: true,
      role: { $ne: 'superadmin' }
    })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('firstName lastName banReason updatedAt');

    bannedUsers.forEach(user => {
      allActivities.push({
        id: `${user._id}-banned-${user.updatedAt.getTime()}`,
        type: 'account_banned',
        message: `แบนบัญชี: ${user.firstName} ${user.lastName} (เหตุผล: ${user.banReason || 'ไม่ระบุเหตุผล'})`,
        timestamp: user.updatedAt,
        status: 'warning'
      });
    });

    // เรียงลำดับตามเวลา
    allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // จำกัดจำนวนและ pagination
    const startIndex = skip;
    const endIndex = skip + limit;
    const paginatedActivities = allActivities.slice(startIndex, endIndex);

    res.json({
      activities: paginatedActivities,
      pagination: {
        page,
        limit,
        total: allActivities.length,
        pages: Math.ceil(allActivities.length / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reset user password (admin only)
router.patch('/users/:id/reset-password', requireAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({ 
        message: 'New password is required' 
      });
    }

    // Validate password requirements
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    
    if (!hasUpperCase || !hasNumber) {
      return res.status(400).json({ 
        message: 'Password must contain at least 1 uppercase letter and 1 number' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // ตรวจสอบว่าผู้ใช้ที่จะรีเซ็ตรหัสผ่านเป็น SuperAdmin หรือไม่
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Admin ไม่สามารถรีเซ็ตรหัสผ่านของ SuperAdmin ได้
    if (req.user.role === 'admin' && targetUser.role === 'superadmin') {
      return res.status(403).json({ 
        message: 'Cannot reset SuperAdmin password',
        error: 'Admin users cannot reset SuperAdmin passwords'
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { password: hashedPassword },
      { new: true }
    ).select('-password -phoneVerificationCode -phoneVerificationExpires')
     .populate('membership.planId');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      message: 'Password reset successfully',
      user: user
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin Password Reset Route
router.post('/users/:id/reset-password', requireAdminPermissions([ADMIN_PERMISSIONS.PASSWORD_RESET]), async (req, res) => {
  try {
    const { newPassword } = req.body;
    const { id } = req.params;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

    res.json({
      success: true,
      message: 'รีเซ็ตรหัสผ่านสำเร็จ'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน'
    });
  }
});

// Admin Create Premium User Route
router.post('/users/premium', requireAdminPermissions([ADMIN_PERMISSIONS.PREMIUM_MANAGEMENT]), async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      lookingFor,
      location,
      tier = 'platinum'
    } = req.body;

    // Validate required fields
    if (!username || !email || !password || !firstName || !lastName || !dateOfBirth || !gender || !lookingFor || !location) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'อีเมลหรือชื่อผู้ใช้นี้มีผู้ใช้งานแล้ว'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create premium user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      dateOfBirth: new Date(dateOfBirth),
      gender,
      lookingFor,
      location,
      coordinates: {
        type: 'Point',
        coordinates: [100.5018, 13.7563] // Default Bangkok coordinates
      },
      role: 'user',
      isActive: true,
      isVerified: true,
      membership: {
        tier: tier,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        updatedAt: new Date()
      }
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'สร้างผู้ใช้ระดับพิเศษสำเร็จ',
      data: {
        user: newUser.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Create premium user error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างผู้ใช้'
    });
  }
});

// Admin Message Management Routes
router.get('/messages', requireAdminPermissions([ADMIN_PERMISSIONS.MESSAGE_MANAGEMENT]), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find()
      .populate('senderId', 'username email firstName lastName')
      .populate('chatRoomId', 'name description')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments();

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลข้อความ'
    });
  }
});

// Admin Delete Message Route
router.delete('/messages/:id', requireAdminPermissions([ADMIN_PERMISSIONS.MESSAGE_MANAGEMENT]), async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อความ'
      });
    }

    res.json({
      success: true,
      message: 'ลบข้อความสำเร็จ'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบข้อความ'
    });
  }
});

// Admin Chatroom Management Routes
router.get('/chatrooms', requireAdminPermissions([ADMIN_PERMISSIONS.CHATROOM_MANAGEMENT]), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const chatrooms = await ChatRoom.find()
      .populate('createdBy', 'username email firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ChatRoom.countDocuments();

    res.json({
      success: true,
      data: {
        chatrooms,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get chatrooms error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลห้องแชท'
    });
  }
});

// Admin Create Chatroom Route
router.post('/chatrooms', requireAdminPermissions([ADMIN_PERMISSIONS.CHATROOM_MANAGEMENT]), async (req, res) => {
  try {
    const { name, description, isPrivate = false, maxMembers = 100 } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกชื่อห้องแชท'
      });
    }

    const newChatroom = new ChatRoom({
      name,
      description,
      isPrivate,
      maxMembers,
      createdBy: req.user._id,
      members: [req.user._id]
    });

    await newChatroom.save();

    res.status(201).json({
      success: true,
      message: 'สร้างห้องแชทสำเร็จ',
      data: {
        chatroom: newChatroom
      }
    });
  } catch (error) {
    console.error('Create chatroom error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างห้องแชท'
    });
  }
});

// Admin Delete Chatroom Route
router.delete('/chatrooms/:id', requireAdminPermissions([ADMIN_PERMISSIONS.CHATROOM_MANAGEMENT]), async (req, res) => {
  try {
    const chatroom = await ChatRoom.findByIdAndDelete(req.params.id);
    
    if (!chatroom) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบห้องแชท'
      });
    }

    // Delete all messages in this chatroom
    await Message.deleteMany({ chatRoomId: req.params.id });

    res.json({
      success: true,
      message: 'ลบห้องแชทสำเร็จ'
    });
  } catch (error) {
    console.error('Delete chatroom error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบห้องแชท'
    });
  }
});

// Admin Join Any Chatroom Route (Unlimited Access)
router.post('/chatrooms/:id/join', requireAdminPermissions([ADMIN_PERMISSIONS.UNLIMITED_CHAT_ACCESS]), async (req, res) => {
  try {
    const chatroom = await ChatRoom.findById(req.params.id);
    
    if (!chatroom) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบห้องแชท'
      });
    }

    // Add admin to chatroom members if not already a member
    if (!chatroom.members.includes(req.user._id)) {
      chatroom.members.push(req.user._id);
      await chatroom.save();
    }

    res.json({
      success: true,
      message: 'เข้าร่วมห้องแชทสำเร็จ',
      data: {
        chatroom
      }
    });
  } catch (error) {
    console.error('Join chatroom error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเข้าร่วมห้องแชท'
    });
  }
});

module.exports = router;


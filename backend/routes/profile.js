const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const { profileImageStorage, deleteImage, getPublicIdFromUrl, CLOUDINARY_ENABLED } = require('../config/cloudinary');

// JWT Secret - use the actual secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-development-2025';

// Middleware to verify JWT token and get user from database
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
    
    // ดึงข้อมูล user จาก database เพื่อให้ได้ข้อมูล role ที่อัพเดท
    const User = require('../models/User');
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'บัญชีถูกปิดใช้งาน'
      });
    }

    // ใช้ข้อมูล user จาก database แทนข้อมูลจาก JWT
    req.user = {
      id: user._id,
      userId: user._id,
      role: user.role,
      username: user.username,
      isSuperAdmin: user.role === 'superadmin',
      isAdmin: ['admin', 'superadmin'].includes(user.role)
    };
    
    console.log('🔍 Authenticated user:', {
      id: req.user.id,
      role: req.user.role,
      isSuperAdmin: req.user.isSuperAdmin,
      isAdmin: req.user.isAdmin
    });
    
    next();
  } catch (error) {
    console.error('❌ Authentication error:', error);
    return res.status(403).json({
      success: false,
      message: 'Token ไม่ถูกต้อง'
    });
  }
};

// Configure multer for Cloudinary upload
const upload = multer({ 
  storage: profileImageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit (Cloudinary supports larger files)
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    // ตรวจสอบขนาดไฟล์ขั้นต่ำ (100KB) เพื่อป้องกันไฟล์ว่างหรือขนาดเล็กเกินไป
    const minSize = 100 * 1024; // 100KB
    if (file.size < minSize) {
      return cb(new Error('ไฟล์รูปภาพมีขนาดเล็กเกินไป (ขั้นต่ำ 100KB)'));
    }

    // ตรวจสอบขนาดไฟล์สูงสุด
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return cb(new Error('ไฟล์รูปภาพมีขนาดใหญ่เกินไป (สูงสุด 10MB)'));
    }

    // ตรวจสอบนามสกุลและ MIME type ต้องตรงกัน
    if (mimetype && extname) {
      // เพิ่มการตรวจสอบพิเศษสำหรับ PNG และ JPEG
      if (file.mimetype.includes('png') && !file.originalname.toLowerCase().endsWith('.png')) {
        return cb(new Error('ไฟล์ PNG ต้องมีนามสกุล .png'));
      }
      if ((file.mimetype.includes('jpeg') || file.mimetype.includes('jpg')) &&
          !file.originalname.toLowerCase().endsWith('.jpg') &&
          !file.originalname.toLowerCase().endsWith('.jpeg')) {
        return cb(new Error('ไฟล์ JPEG ต้องมีนามสกุล .jpg หรือ .jpeg'));
      }

      console.log('✅ Image file validation passed:', {
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        extension: path.extname(file.originalname).toLowerCase()
      });

      return cb(null, true);
    } else {
      console.warn('❌ Image file validation failed:', {
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        extension: path.extname(file.originalname).toLowerCase()
      });
      cb(new Error('รองรับเฉพาะไฟล์รูปภาพ (JPEG, JPG, PNG, GIF, WebP) และต้องมีนามสกุลที่ถูกต้อง'));
    }
  }
});

// Multer error handling middleware
const handleMulterError = (err, req, res, next) => {
  console.error('❌ Multer Error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'ไฟล์ไม่ถูกต้อง กรุณาเลือกไฟล์รูปภาพ'
      });
    }
  }
  
  if (err.message === 'รองรับเฉพาะไฟล์รูปภาพ (JPEG, JPG, PNG, GIF)') {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  next(err);
};

// GET /api/profile/me/coins - ดึงข้อมูลเหรียญของผู้ใช้ที่ login อยู่
router.get('/me/coins', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('coins votePoints membership');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    res.json({
      success: true,
      data: {
        coins: user.coins || 0,
        votePoints: user.votePoints || 0,
        membership: user.membership
      }
    });

  } catch (error) {
    console.error('Error fetching user coins:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงข้อมูลเหรียญได้',
      error: error.message
    });
  }
});

// GET /api/profile/search - ค้นหาโปรไฟล์ (ต้องมาก่อน :userId)
router.get('/search', async (req, res) => {
  try {
    const {
      ageMin = 18,
      ageMax = 100,
      gender,
      province,
      location,
      lookingFor,
      distanceKm,
      lat,
      lng,
      interests,
      relationship,
      lifestyle,
      page = 1,
      limit = 20
    } = req.query;

    const query = {
      isActive: true,
      isBanned: false
    };

    if (gender) {
      query.gender = gender;
    }
    // province/location filter (supports either 'province' or 'location')
    const loc = province || location;
    if (loc) {
      query.location = { $regex: loc, $options: 'i' };
    }
    if (lookingFor) {
      query.lookingFor = lookingFor;
    }
    if (relationship) {
      // store relationship in bio/interests later; for now accept as passthrough filter key
      query['preferences.relationship'] = relationship;
    }
    if (interests) {
      const interestArray = interests.split(',');
      query['interests.category'] = { $in: interestArray };
    }
    if (lifestyle) {
      const lifestyleFilters = JSON.parse(lifestyle);
      Object.keys(lifestyleFilters).forEach(key => {
        query[`lifestyle.${key}`] = lifestyleFilters[key];
      });
    }

    const skip = (page - 1) * limit;

    // Distance filter using GeoJSON point & sphere (if lat/lng and distanceKm provided)
    let geoFilter = null;
    const latNum = lat !== undefined ? Number(lat) : undefined;
    const lngNum = lng !== undefined ? Number(lng) : undefined;
    const distNum = distanceKm !== undefined ? Number(distanceKm) : undefined;
    if (
      typeof latNum === 'number' && !Number.isNaN(latNum) &&
      typeof lngNum === 'number' && !Number.isNaN(lngNum) &&
      typeof distNum === 'number' && !Number.isNaN(distNum) && distNum > 0
    ) {
      geoFilter = {
        coordinates: {
          $geoWithin: {
            $centerSphere: [[lngNum, latNum], distNum / 6378.1] // Earth radius in km
          }
        }
      };
    }

    const finalMatch = geoFilter ? { ...query, ...geoFilter } : query;

    const users = await User.find(finalMatch)
      .select('firstName lastName username nickname dateOfBirth age gender location profileImages bio interests lifestyle membership')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ lastActive: -1 });

    // Calculate age for each user and filter by age range
    const usersWithAge = users.map(user => {
      const userObj = user.toObject ? user.toObject() : user;
      return {
        ...userObj,
        age: userObj.age || (userObj.dateOfBirth ? 
          Math.floor((new Date() - new Date(userObj.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000)) : null)
      };
    });

    const filteredUsers = usersWithAge.filter(user => {
      const userAge = user.age;
      return userAge >= ageMin && userAge <= ageMax;
    });

    const total = await User.countDocuments(finalMatch);

    res.json({
      success: true,
      data: {
        users: filteredUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error searching profiles:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถค้นหาโปรไฟล์ได้',
      error: error.message
    });
  }
});

// GET /api/profile/premium - รายชื่อสมาชิกระดับ Premium ตามลำดับ tier
router.get('/premium', async (req, res) => {
  try {
    // แสดงเฉพาะ Platinum และ Diamond เท่านั้น
    const tiers = ['platinum', 'diamond']
    const limit = parseInt(req.query.limit || '20')
    
    // ตรวจสอบ token ถ้ามี (สำหรับการตรวจสอบสิทธิ์)
    let currentUserId = null;
    const authHeader = req.headers['authorization'];
    console.log('🔍 Premium API - Auth header:', authHeader ? 'Present' : 'Not present');
    
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        currentUserId = decoded.id;
        console.log('✅ Premium API - Current user ID:', currentUserId);
      } catch (error) {
        // Token ไม่ถูกต้อง แต่ยังสามารถดูโปรไฟล์ได้
        console.log('❌ Premium API - Invalid token, but allowing profile view');
      }
    }

    // สร้าง match query
    const matchQuery = {
      isActive: true,
      isBanned: false,
      'membership.tier': { $in: tiers },
      role: { $nin: ['admin', 'superadmin'] } // ไม่แสดง admin และ superadmin
    };
    
    // ถ้ามี currentUserId ให้ไม่รวมตัวเอง
    if (currentUserId) {
      matchQuery._id = { $ne: new mongoose.Types.ObjectId(currentUserId) };
      console.log('🚫 Premium API - Excluding current user:', currentUserId);
    }

    console.log('🔍 Premium API - Match query:', JSON.stringify(matchQuery, null, 2));

    const users = await User.aggregate([
      {
        $match: matchQuery
      },
      {
        $addFields: {
          tierRank: { $indexOfArray: [ tiers, '$membership.tier' ] }
        }
      },
      { $sort: { tierRank: 1, lastActive: -1 } },
      { $limit: limit },
      {
        $project: {
          username: 1,
          firstName: 1,
          lastName: 1,
          displayName: 1,
          nickname: 1,
          location: 1,
          profileImages: 1,
          mainProfileImageIndex: 1,
          membership: 1,
          membershipTier: '$membership.tier',
          lastActive: 1,
          gender: 1,
          dateOfBirth: 1,
          bio: 1,
          interests: 1,
          isOnline: 1
        }
      }
    ])

    // Calculate age for each user using virtual field or manual calculation
    const usersWithAge = users.map(user => {
      const userObj = user.toObject ? user.toObject() : user;
      return {
        ...userObj,
        age: userObj.age || (userObj.dateOfBirth ? 
          Math.floor((new Date() - new Date(userObj.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000)) : null)
      };
    });

    res.json({ success: true, data: { users: usersWithAge } })
  } catch (error) {
    console.error('Error fetching premium profiles:', error)
    res.status(500).json({ success: false, message: 'ไม่สามารถดึงรายชื่อพรีเมียมได้', error: error.message })
  }
})

// GET /api/profile/discover - รายชื่อสมาชิกสำหรับหน้า Discover Amazing People (VIP, Gold, Silver, Member)
router.get('/discover', async (req, res) => {
  try {
    // แสดง VIP, Gold, Silver, Member สำหรับหน้า Discover Amazing People
    const tiers = ['vip2', 'vip1', 'vip', 'gold', 'silver', 'member']
    const limit = parseInt(req.query.limit || '20')
    
    // ตรวจสอบ token ถ้ามี (สำหรับการตรวจสอบสิทธิ์)
    let currentUserId = null;
    const authHeader = req.headers['authorization'];
    console.log('🔍 Discover API - Auth header:', authHeader ? 'Present' : 'Not present');
    
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        currentUserId = decoded.id;
        console.log('✅ Discover API - Current user ID:', currentUserId);
        console.log('🔍 Discover API - Decoded token:', JSON.stringify(decoded, null, 2));
      } catch (error) {
        // Token ไม่ถูกต้อง แต่ยังสามารถดูโปรไฟล์ได้
        console.log('❌ Discover API - Invalid token, but allowing profile view');
        console.log('❌ Discover API - Token error:', error.message);
      }
    }

    // สร้าง match query - รองรับ user ที่ไม่มี membership tier (ยกเว้น admin และ superadmin)
    const matchQuery = {
      isActive: true,
      isBanned: false,
      role: { $nin: ['admin', 'superadmin'] },
      $or: [
        { 'membership.tier': { $in: tiers } },
        { 'membership.tier': { $exists: false } },
        { 'membership.tier': null },
        { 'membership': { $exists: false } }
      ]
    };
    
    // ถ้ามี currentUserId ให้ไม่รวมตัวเอง
    if (currentUserId) {
      matchQuery._id = { $ne: new mongoose.Types.ObjectId(currentUserId) };
      console.log('🚫 Discover API - Excluding current user:', currentUserId);
      console.log('🔍 Discover API - Match query after exclusion:', JSON.stringify(matchQuery, null, 2));
    }

    console.log('🔍 Discover API - Match query:', JSON.stringify(matchQuery, null, 2));

    const users = await User.aggregate([
      {
        $match: matchQuery
      },
      {
        $addFields: {
          tierRank: {
            $cond: {
              if: { $and: [{ $ne: ['$membership.tier', null] }, { $ne: ['$membership', null] }] },
              then: { $indexOfArray: [ tiers, '$membership.tier' ] },
              else: tiers.length // ให้ user ที่ไม่มี membership tier อยู่ลำดับสุดท้าย
            }
          },
          membershipTier: {
            $cond: {
              if: { $and: [{ $ne: ['$membership.tier', null] }, { $ne: ['$membership', null] }] },
              then: '$membership.tier',
              else: 'member' // กำหนด default เป็น member
            }
          }
        }
      },
      { $sort: { tierRank: 1, lastActive: -1 } },
      { $limit: limit },
      {
        $project: {
          username: 1,
          firstName: 1,
          lastName: 1,
          displayName: 1,
          nickname: 1,
          location: 1,
          profileImages: 1,
          membership: 1,
          membershipTier: 1,
          lastActive: 1,
          gender: 1,
          dateOfBirth: 1,
          isOnline: 1,
          bio: 1,
          interests: 1
        }
      }
    ]);

    // Calculate age for each user using virtual field or manual calculation
    const usersWithAge = users.map(user => {
      const userObj = user.toObject ? user.toObject() : user;
      return {
        ...userObj,
        age: userObj.age || (userObj.dateOfBirth ? 
          Math.floor((new Date() - new Date(userObj.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000)) : null)
      };
    });

    // Debug: ตรวจสอบว่าผลลัพธ์มีผู้ใช้ปัจจุบันรวมอยู่หรือไม่
    if (currentUserId) {
      const currentUserInResults = usersWithAge.find(user => user._id.toString() === currentUserId);
      if (currentUserInResults) {
        console.log('⚠️ Discover API - Current user found in results:', currentUserInResults.username);
      } else {
        console.log('✅ Discover API - Current user successfully excluded from results');
      }
    }

    // Debug: แสดงจำนวน user ในแต่ละ tier
    const tierCounts = {};
    usersWithAge.forEach(user => {
      const tier = user.membershipTier || 'no-tier';
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    });
    console.log('📊 Discover API - User counts by tier:', tierCounts);
    console.log('📊 Discover API - Total users found:', usersWithAge.length);

    res.json({ success: true, data: { users: usersWithAge } })
  } catch (error) {
    console.error('Error fetching discover profiles:', error)
    res.status(500).json({ success: false, message: 'ไม่สามารถดึงรายชื่อสำหรับหน้า Discover ได้', error: error.message })
  }
})

// GET /api/profile/members - รายชื่อสมาชิก role member สำหรับหน้า Discover (สุ่ม 20 คน)
router.get('/members', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '20')
    const page = parseInt(req.query.page || '1')
    const skip = (page - 1) * limit

    // ตรวจสอบ token ถ้ามี (สำหรับการตรวจสอบสิทธิ์)
    let currentUserId = null;
    const authHeader = req.headers['authorization'];
    console.log('🔍 Members API - Auth header:', authHeader ? 'Present' : 'Not present');
    
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        currentUserId = decoded.id;
        console.log('✅ Members API - Current user ID:', currentUserId);
      } catch (error) {
        // Token ไม่ถูกต้อง แต่ยังสามารถดูโปรไฟล์ได้
        console.log('❌ Members API - Invalid token, but allowing profile view');
      }
    }

    // สร้าง match query - เฉพาะ membership tier member เท่านั้น (ยกเว้น admin และ superadmin)
    const matchQuery = {
      isActive: true,
      isBanned: false,
      'membership.tier': 'member',
      role: { $nin: ['admin', 'superadmin'] }
    };
    
    // ถ้ามี currentUserId ให้ไม่รวมตัวเอง
    if (currentUserId) {
      matchQuery._id = { $ne: new mongoose.Types.ObjectId(currentUserId) };
      console.log('🚫 Members API - Excluding current user:', currentUserId);
    }

    console.log('🔍 Members API - Match query:', JSON.stringify(matchQuery, null, 2));

    // ดึง user ทั้งหมดที่ตรงตามเงื่อนไข
    const allMatchingUsers = await User.aggregate([
      {
        $match: matchQuery
      },
      {
        $project: {
          username: 1,
          firstName: 1,
          lastName: 1,
          displayName: 1,
          nickname: 1,
          location: 1,
          profileImages: 1,
          membership: 1,
          lastActive: 1,
          gender: 1,
          dateOfBirth: 1,
          bio: 1,
          interests: 1,
          lifestyle: 1,
          isOnline: 1,
          isVerified: 1
        }
      }
    ])

    // สุ่ม user จากทั้งหมด
    const shuffledUsers = allMatchingUsers.sort(() => Math.random() - 0.5)
    
    // แบ่งตาม pagination
    const users = shuffledUsers.slice(skip, skip + limit)

    // Calculate age for each user using virtual field or manual calculation
    const usersWithAge = users.map(user => {
      const userObj = user.toObject ? user.toObject() : user;
      return {
        ...userObj,
        age: userObj.age || (userObj.dateOfBirth ? 
          Math.floor((new Date() - new Date(userObj.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000)) : null)
      };
    });

    // นับจำนวนผู้ใช้ทั้งหมด
    const totalUsers = allMatchingUsers.length

    res.json({ 
      success: true, 
      data: { 
        users: usersWithAge,
        pagination: {
          page,
          limit,
          total: totalUsers,
          pages: Math.ceil(totalUsers / limit)
        }
      } 
    })
  } catch (error) {
    console.error('Error fetching member profiles:', error)
    res.status(500).json({ success: false, message: 'ไม่สามารถดึงรายชื่อสมาชิกได้', error: error.message })
  }
})

// GET /api/profile/members-with-likes - รายชื่อสมาชิกพร้อมจำนวนการกดไลค์
router.get('/members-with-likes', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '20')
    const page = parseInt(req.query.page || '1')
    const skip = (page - 1) * limit

    // ตรวจสอบ token ถ้ามี (สำหรับการตรวจสอบสิทธิ์)
    let currentUserId = null;
    const authHeader = req.headers['authorization'];
    console.log('🔍 Members with likes API - Auth header:', authHeader ? 'Present' : 'Not present');
    
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        currentUserId = decoded.id;
        console.log('✅ Members with likes API - Current user ID:', currentUserId);
      } catch (error) {
        // Token ไม่ถูกต้อง แต่ยังสามารถดูโปรไฟล์ได้
        console.log('❌ Members with likes API - Invalid token, but allowing profile view');
      }
    }

    // สร้าง match query - เฉพาะ membership tier member เท่านั้น (ยกเว้น admin และ superadmin)
    const matchQuery = {
      isActive: true,
      isBanned: false,
      'membership.tier': 'member',
      role: { $nin: ['admin', 'superadmin'] }
    };
    
    // ถ้ามี currentUserId ให้ไม่รวมตัวเอง
    if (currentUserId) {
      matchQuery._id = { $ne: new mongoose.Types.ObjectId(currentUserId) };
      console.log('🚫 Members with likes API - Excluding current user:', currentUserId);
    }

    console.log('🔍 Members with likes API - Match query:', JSON.stringify(matchQuery, null, 2));

    // ดึง user ทั้งหมดที่ตรงตามเงื่อนไข
    const allMatchingUsers = await User.aggregate([
      {
        $match: matchQuery
      },
      {
        $lookup: {
          from: 'users',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$$userId', { $ifNull: ['$likes', []] }]
                }
              }
            }
          ],
          as: 'likedByUsers'
        }
      },
      {
        $project: {
          username: 1,
          firstName: 1,
          lastName: 1,
          displayName: 1,
          nickname: 1,
          location: 1,
          profileImages: 1,
          membership: 1,
          lastActive: 1,
          gender: 1,
          dateOfBirth: 1,
          bio: 1,
          interests: 1,
          lifestyle: 1,
          isOnline: 1,
          isVerified: 1,
          likeCount: { $size: '$likedByUsers' }
        }
      }
    ])

    // สุ่ม user จากทั้งหมด
    const shuffledUsers = allMatchingUsers.sort(() => Math.random() - 0.5)
    
    // แบ่งตาม pagination
    const users = shuffledUsers.slice(skip, skip + limit)

    // นับจำนวนผู้ใช้ทั้งหมด
    const totalUsers = allMatchingUsers.length

    res.json({ 
      success: true, 
      data: { 
        users,
        pagination: {
          page,
          limit,
          total: totalUsers,
          pages: Math.ceil(totalUsers / limit)
        }
      } 
    })
  } catch (error) {
    console.error('Error fetching member profiles with likes:', error)
    res.status(500).json({ success: false, message: 'ไม่สามารถดึงรายชื่อสมาชิกได้', error: error.message })
  }
})

// GET /api/profile/all - รายชื่อผู้ใช้ทั้งหมดสำหรับหน้า Discover (สุ่ม 20 คน)
router.get('/all', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '20') // เปลี่ยนจาก 100 เป็น 20
    const page = parseInt(req.query.page || '1')
    const skip = (page - 1) * limit

    // ตรวจสอบ token ถ้ามี (สำหรับการตรวจสอบสิทธิ์)
    let currentUserId = null;
    const authHeader = req.headers['authorization'];
    console.log('🔍 All API - Auth header:', authHeader ? 'Present' : 'Not present');
    
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        currentUserId = decoded.id;
        console.log('✅ All API - Current user ID:', currentUserId);
      } catch (error) {
        // Token ไม่ถูกต้อง แต่ยังสามารถดูโปรไฟล์ได้
        console.log('❌ All API - Invalid token, but allowing profile view');
      }
    }

    // สร้าง match query - เฉพาะ membership tier member เท่านั้น (ยกเว้น admin และ superadmin)
    const matchQuery = {
      isActive: true,
      isBanned: false,
      'membership.tier': 'member',
      role: { $nin: ['admin', 'superadmin'] }
    };
    
    // ถ้ามี currentUserId ให้ไม่รวมตัวเอง
    if (currentUserId) {
      matchQuery._id = { $ne: new mongoose.Types.ObjectId(currentUserId) };
      console.log('🚫 All API - Excluding current user:', currentUserId);
    }

    console.log('🔍 All API - Match query:', JSON.stringify(matchQuery, null, 2));

    // ดึง user ทั้งหมดที่ตรงตามเงื่อนไข
    const allMatchingUsers = await User.aggregate([
      {
        $match: matchQuery
      },
      {
        $project: {
          username: 1,
          firstName: 1,
          lastName: 1,
          displayName: 1,
          nickname: 1,
          location: 1,
          profileImages: 1,
          membership: 1,
          lastActive: 1,
          gender: 1,
          dateOfBirth: 1,
          bio: 1,
          interests: 1,
          lifestyle: 1,
          isOnline: 1,
          isVerified: 1
        }
      }
    ])

    // สุ่ม user จากทั้งหมด
    const shuffledUsers = allMatchingUsers.sort(() => Math.random() - 0.5)
    
    // แบ่งตาม pagination
    const users = shuffledUsers.slice(skip, skip + limit)

    // Calculate age for each user using virtual field or manual calculation
    const usersWithAge = users.map(user => {
      const userObj = user.toObject ? user.toObject() : user;
      return {
        ...userObj,
        age: userObj.age || (userObj.dateOfBirth ? 
          Math.floor((new Date() - new Date(userObj.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000)) : null)
      };
    });

    // นับจำนวนผู้ใช้ทั้งหมด
    const totalUsers = allMatchingUsers.length

    res.json({ 
      success: true, 
      data: { 
        users: usersWithAge,
        pagination: {
          page,
          limit,
          total: totalUsers,
          pages: Math.ceil(totalUsers / limit)
        }
      } 
    })
  } catch (error) {
    console.error('Error fetching all profiles:', error)
    res.status(500).json({ success: false, message: 'ไม่สามารถดึงรายชื่อผู้ใช้ได้', error: error.message })
  }
})

// GET /api/profile/:userId - ดึงข้อมูลโปรไฟล์ผู้ใช้
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // ตรวจสอบ token ถ้ามี (สำหรับการตรวจสอบสิทธิ์)
    let currentUser = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        currentUser = decoded;
      } catch (error) {
        // Token ไม่ถูกต้อง แต่ยังสามารถดูโปรไฟล์ได้
        console.log('Invalid token, but allowing profile view');
      }
    }
    
    const user = await User.findById(userId).select('-password -phoneVerificationCode -phoneVerificationExpires -loginHistory -coordinates');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    // อัปเดต lastActive เมื่อมีคนดูโปรไฟล์
    await User.findByIdAndUpdate(userId, {
      lastActive: new Date()
    });

    // ตรวจสอบสิทธิ์การเข้าถึงโปรไฟล์
    const isOwnProfile = currentUser && currentUser.id === userId;
    const isAdmin = currentUser && ['admin', 'superadmin'].includes(currentUser.role);

    // ถ้าไม่ใช่โปรไฟล์ของตัวเองและไม่ใช่ admin ให้ซ่อนข้อมูลส่วนตัวบางส่วน
    let profileData = user.toObject();
    if (!isOwnProfile && !isAdmin) {
      delete profileData.email;
      delete profileData.phone;
      delete profileData.preferences;
      delete profileData.dailyUsage;
      delete profileData.coins;
      delete profileData.votePoints;
    }

    console.log('📤 Backend sending profile data:', {
      userId,
      isOwnProfile,
      isAdmin,
      hasProfileData: !!profileData,
      profileDataKeys: Object.keys(profileData),
      profileImagesCount: profileData.profileImages?.length || 0
    });

    res.json({
      success: true,
      data: {
        profile: profileData,
        isOwnProfile,
        age: user.age
      }
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงข้อมูลโปรไฟล์ได้',
      error: error.message
    });
  }
});

// PUT /api/profile/:userId - อัปเดตข้อมูลโปรไฟล์
router.put('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // ตรวจสอบสิทธิ์ - แปลงเป็น string เพื่อเปรียบเทียบ
    const authUserId = req.user.id.toString();
    const targetUserId = userId.toString();
    
    if (authUserId !== targetUserId && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์แก้ไขโปรไฟล์นี้'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    const {
      displayName,
      nickname,
      bio,
      location,
      occupation,
      education,
      physicalAttributes,
      religion,
      languages,
      pets,
      lifestyle,
      interests,
      promptAnswers,
      coordinates // เพิกเฉย - ไม่บันทึก GPS coordinates
    } = req.body;

    // อัปเดตข้อมูลที่อนุญาต
    const updateData = {};
    
    if (displayName !== undefined && displayName.trim() !== '') updateData.displayName = displayName.trim();
    if (nickname !== undefined) updateData.nickname = nickname;
    if (bio !== undefined) updateData.bio = bio;
    // ตรวจสอบว่า location ไม่ใช่พิกัด GPS (ต้องไม่เป็นรูปแบบ "13.123,100.456")
    if (location !== undefined) {
      const isCoordinates = /^\d+\.?\d*,\s*\d+\.?\d*$/.test(location);
      if (!isCoordinates && location.trim() !== '') {
        updateData.location = location;
      }
    }
    if (occupation !== undefined) updateData.occupation = occupation;
    if (education !== undefined) updateData.education = education;
    if (physicalAttributes !== undefined) updateData.physicalAttributes = physicalAttributes;
    if (religion !== undefined) {
      if (religion === '') {
        // Don't set religion if it's empty string
      } else {
        updateData.religion = religion;
      }
    }
    if (languages !== undefined) updateData.languages = languages;
    if (pets !== undefined) updateData.pets = pets;
    if (lifestyle !== undefined) updateData.lifestyle = lifestyle;
    if (interests !== undefined) updateData.interests = interests;
    if (promptAnswers !== undefined) updateData.promptAnswers = promptAnswers;

    // ทำความสะอาดข้อมูลก่อนอัปเดต
    if (updateData.physicalAttributes) {
      // แปลง height และ weight เป็น Number
      if (updateData.physicalAttributes.height !== undefined && updateData.physicalAttributes.height !== '') {
        updateData.physicalAttributes.height = Number(updateData.physicalAttributes.height);
      }
      if (updateData.physicalAttributes.weight !== undefined && updateData.physicalAttributes.weight !== '') {
        updateData.physicalAttributes.weight = Number(updateData.physicalAttributes.weight);
      }
    }

    // แปลง religion enum values
    if (updateData.religion) {
      const religionMapping = {
        'buddhism': 'buddhist',
        'christianity': 'christian',
        'islam': 'muslim',
        'hinduism': 'hindu',
        'other': 'other',
        'none': 'none'
      };
      if (religionMapping[updateData.religion]) {
        updateData.religion = religionMapping[updateData.religion];
      }
    }

    // เก็บภาษาตามที่ผู้ใช้พิมพ์ (ไม่แปลงค่า)
    // ถ้า languages เป็น array จะบันทึกตามเดิมโดยไม่เปลี่ยนแปลง

    // แปลง education level enum values
    if (updateData.education && updateData.education.level && updateData.education.level !== '') {
      const educationMapping = {
        'high_school': 'high_school',
        'bachelor': 'bachelor',
        'master': 'master',
        'phd': 'doctorate',
        'vocational': 'diploma',
        'other': 'other'
      };
      if (educationMapping[updateData.education.level]) {
        updateData.education.level = educationMapping[updateData.education.level];
      }
    } else if (updateData.education && updateData.education.level === '') {
      // ลบ education level ถ้าเป็นค่าว่าง
      delete updateData.education.level;
    }

    // แปลง lifestyle enum values
    if (updateData.lifestyle) {
      if (updateData.lifestyle.smoking && updateData.lifestyle.smoking !== '') {
        const smokingMapping = {
          'no': 'never',
          'yes': 'regularly',
          'occasionally': 'occasionally',
          'quit': 'trying_to_quit'
        };
        if (smokingMapping[updateData.lifestyle.smoking]) {
          updateData.lifestyle.smoking = smokingMapping[updateData.lifestyle.smoking];
        }
      } else if (updateData.lifestyle.smoking === '') {
        delete updateData.lifestyle.smoking;
      }

      if (updateData.lifestyle.drinking && updateData.lifestyle.drinking !== '') {
        const drinkingMapping = {
          'no': 'never',
          'yes': 'regularly',
          'socially': 'socially',
          'occasionally': 'occasionally',
          'quit': 'never'
        };
        if (drinkingMapping[updateData.lifestyle.drinking]) {
          updateData.lifestyle.drinking = drinkingMapping[updateData.lifestyle.drinking];
        }
      } else if (updateData.lifestyle.drinking === '') {
        delete updateData.lifestyle.drinking;
      }

      if (updateData.lifestyle.exercise && updateData.lifestyle.exercise !== '') {
        const exerciseMapping = {
          'never': 'never',
          'rarely': 'rarely',
          'sometimes': 'sometimes',
          'regularly': 'regularly',
          'daily': 'daily',
          // map legacy UI values
          'weekly': 'regularly',
          'monthly': 'sometimes'
        };
        if (exerciseMapping[updateData.lifestyle.exercise]) {
          updateData.lifestyle.exercise = exerciseMapping[updateData.lifestyle.exercise];
        }
      } else if (updateData.lifestyle.exercise === '') {
        delete updateData.lifestyle.exercise;
      }

      if (updateData.lifestyle.diet && updateData.lifestyle.diet !== '') {
        const dietMapping = {
          'regular': 'omnivore',
          'vegetarian': 'vegetarian',
          'vegan': 'vegan',
          'halal': 'other',
          'other': 'other'
        };
        if (dietMapping[updateData.lifestyle.diet]) {
          updateData.lifestyle.diet = dietMapping[updateData.lifestyle.diet];
        }
      } else if (updateData.lifestyle.diet === '') {
        delete updateData.lifestyle.diet;
      }
    }

    console.log('Updating user profile with data:', updateData);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -phoneVerificationCode -phoneVerificationExpires -loginHistory -coordinates');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้หลังจากอัปเดต'
      });
    }

    res.json({
      success: true,
      message: 'อัปเดตโปรไฟล์สำเร็จ',
      data: {
        profile: updatedUser
      }
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    
    // จัดการ validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ถูกต้อง',
        errors: validationErrors
      });
    }
    
    // จัดการ cast errors (เช่น invalid ObjectId)
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ถูกต้อง',
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถอัปเดตโปรไฟล์ได้',
      error: error.message
    });
  }
});

// POST /api/profile/:userId/upload-image - อัปโหลดรูปโปรไฟล์
router.post('/:userId/upload-image', authenticateToken, (req, res, next) => {
  console.log('📤 Upload request received for user:', req.params.userId);
  console.log('📤 Auth user:', req.user?.id);
  console.log('📤 Content-Type:', req.headers['content-type']);
  next();
}, upload.single('profileImage'), handleMulterError, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('📤 Processing upload for user:', userId);
    console.log('📤 File received:', req.file ? 'Yes' : 'No');
    
    // ตรวจสอบสิทธิ์ - แปลงเป็น string เพื่อเปรียบเทียบ
    const authUserId = req.user.id.toString();
    const targetUserId = userId.toString();
    
    if (authUserId !== targetUserId && !['admin', 'superadmin'].includes(req.user.role)) {
      console.log('❌ Permission denied for user:', authUserId, 'trying to upload for:', targetUserId);
      console.log('❌ User role:', req.user.role);
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์อัปโหลดรูปภาพสำหรับโปรไฟล์นี้'
      });
    }
    
    console.log('✅ Permission granted for user:', authUserId, 'role:', req.user.role);
    
    if (!req.file) {
      console.log('❌ No file received in request');
      return res.status(400).json({
        success: false,
        message: 'กรุณาเลือกไฟล์รูปภาพ'
      });
    }

    console.log('📤 File details:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path,
      cloudinaryEnabled: CLOUDINARY_ENABLED
    });

    const user = await User.findById(userId);
    
    // Debug: ตรวจสอบข้อมูล user และ membership
    if (user) {
      console.log('👤 User membership info:', {
        userId: user._id,
        tier: user.membership?.tier,
        endDate: user.membership?.endDate,
        isActive: user.isMembershipActive,
        limits: user.getMembershipLimits()
      });
    }
    if (!user) {
      // ถ้าไม่พบ user ให้ลบรูปที่อัพโหลด
      if (req.file) {
        if (CLOUDINARY_ENABLED && req.file.filename) {
          try {
            await deleteImage(req.file.filename);
            console.log('🗑️ Deleted orphaned image from Cloudinary');
          } catch (err) {
            console.error('❌ Error deleting orphaned image:', err);
          }
        } else if (req.file.path) {
          // ลบจาก local storage
          try {
            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
              console.log('🗑️ Deleted orphaned local file');
            }
          } catch (err) {
            console.error('❌ Error deleting local file:', err);
          }
        }
      }
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    // เพิ่มรูปภาพใหม่เข้าไปใน profileImages array
    let imageUrl, imagePathToSave;
    
    if (CLOUDINARY_ENABLED) {
      // ใช้ Cloudinary
      imageUrl = req.file.path; // Full Cloudinary URL with CDN
      imagePathToSave = imageUrl;
      const publicId = req.file.filename;
      
      console.log('☁️ Cloudinary upload result:', {
        url: imageUrl,
        publicId: publicId
      });
    } else {
      // ใช้ local storage
      const imagePath = req.file.filename;
      imagePathToSave = `users/${userId}/${imagePath}`;
      
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`
        : `${req.protocol}://${req.get('host')}`;
      imageUrl = `${baseUrl}/uploads/${imagePathToSave}`;
      
      console.log('💾 Local storage upload:', {
        path: imagePathToSave,
        url: imageUrl
      });
    }
    
    // เก็บ path/URL ลงใน database
    user.profileImages.push(imagePathToSave);

    // ถ้าเป็นรูปภาพแรก ให้ตั้งเป็นรูปโปรไฟล์หลักอัตโนมัติ
    if (user.profileImages.length === 1) {
      user.mainProfileImageIndex = 0;
      console.log('🎯 Auto-setting first image as main profile image');
    }

    // จำกัดจำนวนรูปภาพตามระดับสมาชิก
    const limits = user.getMembershipLimits();
    const maxImages = limits.dailyImages === -1 ? 10 : Math.min(limits.dailyImages, 10);
    
    // ถ้าเกินจำนวนที่กำหนด ให้ลบรูปเก่าออก
    if (user.profileImages.length > maxImages) {
      const imagesToDelete = user.profileImages.slice(0, user.profileImages.length - maxImages);
      
      // ลบรูปเก่า
      for (const imageItem of imagesToDelete) {
        if (imageItem && typeof imageItem === 'string' && !imageItem.startsWith('data:image')) {
          try {
            if (CLOUDINARY_ENABLED && imageItem.includes('cloudinary.com')) {
              // ลบจาก Cloudinary
              const publicIdToDelete = getPublicIdFromUrl(imageItem);
              if (publicIdToDelete) {
                await deleteImage(publicIdToDelete);
                console.log('🗑️ Deleted old image from Cloudinary:', publicIdToDelete);
              }
            } else if (imageItem.startsWith('users/')) {
              // ลบจาก local storage
              const fullPath = path.join(__dirname, '..', 'uploads', imageItem);
              if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
                console.log('🗑️ Deleted old local file:', fullPath);
              }
            }
          } catch (err) {
            console.error('❌ Error deleting old image:', err);
          }
        }
      }
      
      user.profileImages = user.profileImages.slice(-maxImages);
    }

    await user.save();

    console.log('✅ Image uploaded successfully:', {
      userId,
      imageUrl,
      storage: CLOUDINARY_ENABLED ? 'Cloudinary' : 'Local',
      totalImages: user.profileImages.length
    });

    res.json({
      success: true,
      message: CLOUDINARY_ENABLED 
        ? 'อัปโหลดรูปภาพสำเร็จ (Cloudinary + CDN)' 
        : 'อัปโหลดรูปภาพสำเร็จ',
      data: {
        imageUrl: imageUrl,
        imagePath: imagePathToSave,
        profileImages: user.profileImages,
        mainProfileImageIndex: user.mainProfileImageIndex,
        cdn: CLOUDINARY_ENABLED,
        storage: CLOUDINARY_ENABLED ? 'cloudinary' : 'local'
      }
    });

  } catch (error) {
    console.error('Error uploading profile image:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถอัปโหลดรูปภาพได้',
      error: error.message
    });
  }
});

// DELETE /api/profile/:userId/image/:imageIndex - ลบรูปโปรไฟล์
router.delete('/:userId/image/:imageIndex', authenticateToken, async (req, res) => {
  try {
    const { userId, imageIndex } = req.params;
    
    console.log('🗑️ Delete image request:', { userId, imageIndex, authUserId: req.user.id });
    
    // ตรวจสอบสิทธิ์ - แปลงเป็น string เพื่อเปรียบเทียบ
    const authUserId = req.user.id.toString();
    const targetUserId = userId.toString();
    
    if (authUserId !== targetUserId && !['admin', 'superadmin'].includes(req.user.role)) {
      console.log('❌ Permission denied for user:', authUserId, 'trying to delete for:', targetUserId);
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์ลบรูปภาพสำหรับโปรไฟล์นี้'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    const index = parseInt(imageIndex);
    console.log('🗑️ Parsed index:', index, 'Profile images length:', user.profileImages.length);
    console.log('🗑️ Profile images:', user.profileImages);
    
    if (isNaN(index) || index < 0 || index >= user.profileImages.length) {
      console.log('❌ Invalid image index:', index);
      return res.status(400).json({
        success: false,
        message: `ไม่พบรูปภาพที่ต้องการลบ (index: ${index}, total: ${user.profileImages.length})`
      });
    }

    // ตรวจสอบว่าต้องการลบรูป default avatar หรือไม่
    const imageToDelete = user.profileImages[index];
    if (imageToDelete && imageToDelete.startsWith('data:image/svg+xml')) {
      console.log('❌ Cannot delete default avatar');
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถลบรูป default avatar ได้'
      });
    }

    // ลบรูปภาพจาก Cloudinary
    if (imageToDelete && !imageToDelete.startsWith('data:image/svg+xml')) {
      try {
        // Extract public_id from Cloudinary URL or use path directly
        let publicIdToDelete;
        
        if (typeof imageToDelete === 'string' && imageToDelete.includes('cloudinary.com')) {
          // It's a Cloudinary URL
          publicIdToDelete = getPublicIdFromUrl(imageToDelete);
        } else if (typeof imageToDelete === 'string' && imageToDelete.startsWith('users/')) {
          // Old format: users/{userId}/{filename}
          // Check if file exists locally, otherwise skip
          const fullImagePath = path.join(__dirname, '..', 'uploads', imageToDelete);
          if (fs.existsSync(fullImagePath)) {
            fs.unlinkSync(fullImagePath);
            console.log('🗑️ Deleted old local file:', fullImagePath);
          }
        } else if (typeof imageToDelete === 'object' && imageToDelete.url) {
          // Blurred image object
          const imageUrl = imageToDelete.url;
          if (imageUrl.includes('cloudinary.com')) {
            publicIdToDelete = getPublicIdFromUrl(imageUrl);
          }
        }
        
        // Delete from Cloudinary if publicId found
        if (publicIdToDelete) {
          await deleteImage(publicIdToDelete);
          console.log('🗑️ Deleted image from Cloudinary:', publicIdToDelete);
        }
      } catch (error) {
        console.error('❌ Error deleting image from Cloudinary:', error);
        // Continue anyway - image removed from DB
      }
    }

    // ลบรูปภาพออกจาก array
    user.profileImages.splice(index, 1);
    
    console.log('🗑️ Deleted image:', imageToDelete);
    console.log('🗑️ Remaining images:', user.profileImages.length);
    
    // ไม่ต้องใส่ default avatar - ให้ผู้ใช้อัปโหลดรูปเอง
    // profileImages จะเป็น array ว่าง [] ถ้าไม่มีรูป
    
    await user.save();

    res.json({
      success: true,
      message: 'ลบรูปภาพสำเร็จ',
      data: {
        profileImages: user.profileImages,
        deletedIndex: index
      }
    });

  } catch (error) {
    console.error('❌ Error deleting profile image:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถลบรูปภาพได้',
      error: error.message
    });
  }
});

// PUT /api/profile/:userId/blur-images - เบลอรูปโปรไฟล์
router.put('/:userId/blur-images', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { imageIndices } = req.body; // array ของ index ที่ต้องการเบลอ
    
    console.log('🔒 Blur images request:', { userId, imageIndices, authUserId: req.user.id });
    
    // ตรวจสอบสิทธิ์ - แปลงเป็น string เพื่อเปรียบเทียบ
    const authUserId = req.user.id.toString();
    const targetUserId = userId.toString();
    
    if (authUserId !== targetUserId && !['admin', 'superadmin'].includes(req.user.role)) {
      console.log('❌ Permission denied for user:', authUserId, 'trying to blur for:', targetUserId);
      console.log('❌ User role:', req.user.role);
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์เบลอรูปภาพสำหรับโปรไฟล์นี้'
      });
    }

    // ตรวจสอบว่าเป็น array หรือไม่
    if (!Array.isArray(imageIndices) || imageIndices.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ index ของรูปภาพที่ต้องการเบลอ'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    // ตรวจสอบสิทธิ์การเบลอรูปตาม membership - ดึงจาก MembershipPlan
    const membership = user.membership;
    const isSuperAdmin = req.user.role === 'superadmin';
    
    // ดึง blurredImages limit จาก MembershipPlan
    let blurredImagesLimit = 0;
    if (membership?.planId) {
      try {
        const MembershipPlan = require('../models/MembershipPlan');
        const plan = await MembershipPlan.findById(membership.planId);
        blurredImagesLimit = plan?.features?.blurredImages || 0;
        console.log('🔒 Found membership plan:', {
          planId: membership.planId,
          tier: plan?.tier,
          blurredImages: plan?.features?.blurredImages
        });
      } catch (error) {
        console.error('❌ Error fetching membership plan:', error);
      }
    } else {
      // ถ้าไม่มี planId ให้ใช้ tier เป็นตัวกำหนด
      const tierLimits = {
        member: 0,
        silver: 0,
        gold: 0,  // Gold member ไม่มีสิทธิ์เบลอรูป
        vip: 3,
        vip1: 5,
        vip2: 10,
        diamond: 15,
        platinum: 15
      };
      blurredImagesLimit = tierLimits[membership?.tier] || 0;
      console.log('🔒 Using tier-based limit:', {
        tier: membership?.tier,
        blurredImagesLimit
      });
    }
    
    console.log('🔒 Blur permission check:', {
      userId,
      membership,
      blurredImagesLimit,
      tier: membership?.tier,
      isSuperAdmin,
      userRole: req.user.role,
      authUserId: req.user.id
    });
    
    // Superadmin สามารถเบลอรูปได้ไม่จำกัด - ข้ามการตรวจสอบ membership
    if (isSuperAdmin) {
      console.log('🔒 Superadmin bypass - skipping membership check');
    } else if (blurredImagesLimit <= 0) {
      return res.status(403).json({
        success: false,
        message: 'สมาชิกประเภทนี้ไม่สามารถเบลอรูปได้ กรุณาอัพเกรดสมาชิก'
      });
    }

    // แปลง profileImages ให้เป็น array ที่สม่ำเสมอ
    if (user.profileImages && Array.isArray(user.profileImages)) {
      user.profileImages = user.profileImages.map((img, idx) => {
        if (typeof img === 'string') {
          return img; // เก็บเป็น string ไว้ก่อน
        } else if (typeof img === 'object' && img !== null) {
          return img; // เก็บ object ไว้
        } else {
          console.log('🔒 Invalid image at index', idx, ':', img);
          return null; // แปลงเป็น null ถ้าไม่ถูกต้อง
        }
      }).filter(img => img !== null); // ลบ null ออก
    }

    console.log('🔒 ProfileImages after cleanup:', user.profileImages);

    // ตรวจสอบ index ที่ถูกต้อง
    const validIndices = imageIndices.filter(index => {
      const numIndex = parseInt(index);
      return !isNaN(numIndex) && numIndex >= 0 && numIndex < user.profileImages.length;
    });

    if (validIndices.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบรูปภาพที่ต้องการเบลอ'
      });
    }

    // ตรวจสอบว่าไม่ใช่รูปโปรไฟล์หลัก
    const mainImageIndex = user.mainProfileImageIndex || 0;
    const mainImageInSelection = validIndices.some(index => parseInt(index) === mainImageIndex);
    
    if (mainImageInSelection) {
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถเบลอรูปโปรไฟล์หลักได้ กรุณาเลือกรูปอื่น'
      });
    }

    // ตรวจสอบจำนวนรูปที่เบลอแล้ว (superadmin ไม่จำกัด)
    if (!isSuperAdmin) {
      const currentBlurredCount = user.profileImages.filter(img => 
        typeof img === 'object' && img.isBlurred
      ).length;
      
      const newBlurredCount = currentBlurredCount + validIndices.length;
      
      console.log('🔒 Blur count check:', {
        currentBlurredCount,
        newBlurredCount,
        blurredImagesLimit,
        validIndices
      });
      
      if (newBlurredCount > blurredImagesLimit) {
        return res.status(400).json({
          success: false,
          message: `เบลอรูปได้สูงสุด ${blurredImagesLimit} รูป (เบลอแล้ว ${currentBlurredCount} รูป)`
        });
      }
    } else {
      console.log('🔒 Superadmin blur - no limit check');
    }

    // เบลอรูปภาพที่เลือก
    let blurredCount = 0;
    console.log('🔒 Starting blur process for validIndices:', validIndices);
    console.log('🔒 User profileImages before blur:', user.profileImages);
    
    validIndices.forEach(index => {
      const numIndex = parseInt(index);
      const imagePath = user.profileImages[numIndex];
      
      console.log('🔒 Processing image at index:', numIndex, 'Type:', typeof imagePath, 'Value:', imagePath);
      
      // ตรวจสอบว่าไม่ใช่ default avatar
      if (imagePath && !imagePath.startsWith('data:image/svg+xml')) {
        try {
          // เพิ่ม flag isBlurred ใน profileImages (ถ้าเป็น string path)
          // หรือสร้าง object ใหม่ถ้าเป็น object
          if (typeof imagePath === 'string') {
            // สร้าง object ใหม่สำหรับรูปที่เบลอ
            user.profileImages[numIndex] = {
              url: imagePath,
              isBlurred: true,
              blurredAt: new Date()
            };
            console.log('🔒 Converted string to object:', user.profileImages[numIndex]);
            blurredCount++;
          } else if (typeof imagePath === 'object' && imagePath !== null) {
            // อัพเดท object ที่มีอยู่
            user.profileImages[numIndex].isBlurred = true;
            user.profileImages[numIndex].blurredAt = new Date();
            console.log('🔒 Updated existing object:', user.profileImages[numIndex]);
            blurredCount++;
          }
        } catch (error) {
          console.error('❌ Error processing image at index', numIndex, ':', error);
        }
      } else {
        console.log('🔒 Skipping image at index', numIndex, 'because it is default avatar or invalid');
      }
    });
    
    console.log('🔒 Blurred count after processing:', blurredCount);
    console.log('🔒 User profileImages after blur:', user.profileImages);

    console.log('🔒 About to save user to database...');
    await user.save();
    console.log('✅ User saved to database successfully');

    // Verify the save by fetching the user again
    const savedUser = await User.findById(userId);
    console.log('🔍 Verification - saved user profileImages:', savedUser.profileImages);

    console.log('✅ Images blurred successfully:', {
      userId,
      blurredCount,
      totalImages: user.profileImages.length
    });

    const responseData = {
      success: true,
      message: `เบลอรูปภาพสำเร็จ ${blurredCount} รูป`,
      data: {
        profileImages: user.profileImages,
        blurredCount,
        blurredIndices: validIndices
      }
    };

    console.log('🔒 Sending response:', responseData);
    res.json(responseData);

  } catch (error) {
    console.error('❌ Error blurring profile images:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถเบลอรูปภาพได้',
      error: error.message
    });
  }
});

// PUT /api/profile/:userId/unblur-images - ยกเลิกการเบลอรูปโปรไฟล์
router.put('/:userId/unblur-images', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { imageIndices } = req.body; // array ของ index ที่ต้องการยกเลิกการเบลอ
    
    console.log('🔓 Unblur images request:', { userId, imageIndices, authUserId: req.user.id });
    
    // ตรวจสอบสิทธิ์ - แปลงเป็น string เพื่อเปรียบเทียบ
    const authUserId = req.user.id.toString();
    const targetUserId = userId.toString();
    
    if (authUserId !== targetUserId && !['admin', 'superadmin'].includes(req.user.role)) {
      console.log('❌ Permission denied for user:', authUserId, 'trying to unblur for:', targetUserId);
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์ยกเลิกการเบลอรูปภาพสำหรับโปรไฟล์นี้'
      });
    }

    // ตรวจสอบว่าเป็น array หรือไม่
    if (!Array.isArray(imageIndices) || imageIndices.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ index ของรูปภาพที่ต้องการยกเลิกการเบลอ'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    // ตรวจสอบ index ที่ถูกต้อง
    const validIndices = imageIndices.filter(index => {
      const numIndex = parseInt(index);
      return !isNaN(numIndex) && numIndex >= 0 && numIndex < user.profileImages.length;
    });

    if (validIndices.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบรูปภาพที่ต้องการยกเลิกการเบลอ'
      });
    }

    // ยกเลิกการเบลอรูปภาพที่เลือก
    let unblurredCount = 0;
    validIndices.forEach(index => {
      const numIndex = parseInt(index);
      const imageData = user.profileImages[numIndex];
      
      if (imageData && typeof imageData === 'object' && imageData.isBlurred) {
        // เปลี่ยนกลับเป็น string path
        user.profileImages[numIndex] = imageData.url;
        unblurredCount++;
      }
    });

    await user.save();

    console.log('✅ Images unblurred successfully:', {
      userId,
      unblurredCount,
      totalImages: user.profileImages.length
    });

    res.json({
      success: true,
      message: `ยกเลิกการเบลอรูปภาพสำเร็จ ${unblurredCount} รูป`,
      data: {
        profileImages: user.profileImages,
        unblurredCount,
        unblurredIndices: validIndices
      }
    });

  } catch (error) {
    console.error('❌ Error unblurring profile images:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถยกเลิกการเบลอรูปภาพได้',
      error: error.message
    });
  }
});

// PUT /api/profile/:userId/main-image/:imageIndex - ตั้งรูปโปรไฟล์หลัก
router.put('/:userId/main-image/:imageIndex', authenticateToken, async (req, res) => {
  try {
    const { userId, imageIndex } = req.params;
    
    // ตรวจสอบสิทธิ์ - แปลงเป็น string เพื่อเปรียบเทียบ
    const authUserId = req.user.id.toString();
    const targetUserId = userId.toString();
    
    if (authUserId !== targetUserId && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์ตั้งรูปโปรไฟล์หลักสำหรับโปรไฟล์นี้'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    const index = parseInt(imageIndex);
    if (index < 0 || index >= user.profileImages.length) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบรูปภาพที่ต้องการตั้งเป็นรูปหลัก'
      });
    }

    // ย้ายรูปที่เลือกไปเป็นรูปแรก (รูปหลัก)
    const selectedImage = user.profileImages[index];
    user.profileImages.splice(index, 1); // ลบรูปออกจากตำแหน่งเดิม
    user.profileImages.unshift(selectedImage); // เพิ่มรูปไปที่ตำแหน่งแรก
    await user.save();

    res.json({
      success: true,
      message: 'ตั้งรูปโปรไฟล์หลักสำเร็จ',
      data: {
        profileImages: user.profileImages
      }
    });

  } catch (error) {
    console.error('Error setting main profile image:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถตั้งรูปโปรไฟล์หลักได้',
      error: error.message
    });
  }
});

// GET /api/profile/:userId/compatibility/:targetUserId - ตรวจสอบความเข้ากันได้
router.get('/:userId/compatibility/:targetUserId', authenticateToken, async (req, res) => {
  try {
    const { userId, targetUserId } = req.params;
    
    // ตรวจสอบสิทธิ์ - แปลงเป็น string เพื่อเปรียบเทียบ
    const authUserId = req.user.id.toString();
    const requestUserId = userId.toString();
    
    if (authUserId !== requestUserId && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้'
      });
    }

    const [user, targetUser] = await Promise.all([
      User.findById(userId),
      User.findById(targetUserId)
    ]);

    if (!user || !targetUser) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    // คำนวณความเข้ากันได้
    let compatibilityScore = 0;
    const factors = [];

    // ตรวจสอบความเข้ากันได้ด้านอายุ
    const ageDiff = Math.abs(user.age - targetUser.age);
    if (ageDiff <= 5) {
      compatibilityScore += 20;
      factors.push({ factor: 'อายุใกล้เคียงกัน', score: 20 });
    } else if (ageDiff <= 10) {
      compatibilityScore += 10;
      factors.push({ factor: 'อายุค่อนข้างใกล้เคียง', score: 10 });
    }

    // ตรวจสอบความเข้ากันได้ด้านไลฟ์สไตล์
    if (user.lifestyle && targetUser.lifestyle) {
      if (user.lifestyle.smoking === targetUser.lifestyle.smoking) {
        compatibilityScore += 15;
        factors.push({ factor: 'ทัศนคติเรื่องการสูบบุหรี่เหมือนกัน', score: 15 });
      }
      
      if (user.lifestyle.drinking === targetUser.lifestyle.drinking) {
        compatibilityScore += 15;
        factors.push({ factor: 'ทัศนคติเรื่องการดื่มสุราเหมือนกัน', score: 15 });
      }

      if (user.lifestyle.exercise === targetUser.lifestyle.exercise) {
        compatibilityScore += 10;
        factors.push({ factor: 'รูปแบบการออกกำลังกายเหมือนกัน', score: 10 });
      }
    }

    // ตรวจสอบความเข้ากันได้ด้านความสนใจ
    if (user.interests && targetUser.interests && user.interests.length > 0 && targetUser.interests.length > 0) {
      const userInterestCategories = user.interests.map(i => i.category);
      const targetInterestCategories = targetUser.interests.map(i => i.category);
      const commonInterests = userInterestCategories.filter(cat => targetInterestCategories.includes(cat));
      
      const interestScore = Math.min(commonInterests.length * 5, 25);
      compatibilityScore += interestScore;
      if (interestScore > 0) {
        factors.push({ factor: `มีความสนใจร่วมกัน ${commonInterests.length} ด้าน`, score: interestScore });
      }
    }

    // ตรวจสอบความเข้ากันได้ด้านศาสนา
    if (user.religion && targetUser.religion && user.religion === targetUser.religion) {
      compatibilityScore += 15;
      factors.push({ factor: 'ศาสนาเดียวกัน', score: 15 });
    }

    // จำกัดคะแนนสูงสุดที่ 100
    compatibilityScore = Math.min(compatibilityScore, 100);

    res.json({
      success: true,
      data: {
        compatibilityScore,
        factors,
        level: compatibilityScore >= 80 ? 'excellent' : 
               compatibilityScore >= 60 ? 'good' : 
               compatibilityScore >= 40 ? 'fair' : 'low'
      }
    });

  } catch (error) {
    console.error('Error calculating compatibility:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถคำนวณความเข้ากันได้',
      error: error.message
    });
  }
});

// Set main profile image
router.put('/:userId/main-image/:imageIndex', authenticateToken, async (req, res) => {
  try {
    const { userId, imageIndex } = req.params;
    
    // ตรวจสอบว่า user เป็นเจ้าของโปรไฟล์หรือไม่ - แปลงเป็น string เพื่อเปรียบเทียบ
    const authUserId = req.user.id.toString();
    const targetUserId = userId.toString();
    
    if (authUserId !== targetUserId) {
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์แก้ไขโปรไฟล์นี้'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    const index = parseInt(imageIndex);
    
    // ตรวจสอบว่า index อยู่ในขอบเขตที่ถูกต้อง
    if (index < 0 || index >= user.profileImages.length) {
      return res.status(400).json({
        success: false,
        message: 'ดัชนีรูปภาพไม่ถูกต้อง'
      });
    }

    // อัปเดต mainProfileImageIndex
    user.mainProfileImageIndex = index;
    await user.save();

    res.json({
      success: true,
      message: 'ตั้งรูปโปรไฟล์หลักสำเร็จ',
      data: {
        mainProfileImageIndex: user.mainProfileImageIndex,
        profileImages: user.profileImages
      }
    });

  } catch (error) {
    console.error('Set main profile image error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตั้งรูปโปรไฟล์หลัก',
      error: error.message
    });
  }
});

// (moved to top to avoid route conflict with :userId)

module.exports = router;
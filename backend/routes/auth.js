const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('../config/passport');
const User = require('../models/User');
const router = express.Router();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-development-2024';

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email,
      username: user.username 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Register new user
router.post('/register', async (req, res) => {
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
      location 
    } = req.body;

    // Validate required fields
    if (!username || !email || !password || !firstName || !lastName || !dateOfBirth || !gender || !lookingFor || !location) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
      });
    }

    // Validate username: ต้องเป็นภาษาอังกฤษเท่านั้น และมีความยาวไม่ต่ำกว่า 6 ตัวอักษร
    const usernameRegex = /^[a-zA-Z0-9]+$/
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        success: false,
        message: 'ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษและตัวเลขเท่านั้น'
      });
    }

    if (username.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'ชื่อผู้ใช้ต้องมีความยาวไม่ต่ำกว่า 6 ตัวอักษร'
      });
    }

    // Validate password: ต้องมี 8 ตัวอักษรขึ้นไป, มีตัวอักษรใหญ่ ตัวเล็ก และตัวเลข, ต้องเป็นภาษาอังกฤษเท่านั้น
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'
      });
    }

    // ตรวจสอบรหัสผ่านต้องเป็นภาษาอังกฤษเท่านั้น
    const passwordEnglishRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/
    if (!passwordEnglishRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านต้องเป็นภาษาอังกฤษและตัวเลขเท่านั้น'
      });
    }

    // ตรวจสอบรหัสผ่านต้องมีตัวอักษรใหญ่ ตัวเล็ก และตัวเลข
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านต้องมีตัวอักษรใหญ่ ตัวเล็ก และตัวเลข'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email }, 
        { username: { $regex: new RegExp(`^${username}$`, 'i') } }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'อีเมลหรือชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว'
      });
    }

    // Validate age (must be 18+)
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;

    if (actualAge < 18) {
      return res.status(400).json({
        success: false,
        message: 'คุณต้องมีอายุ 18 ปีขึ้นไป'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      lookingFor,
      location,
      role: 'user', // กำหนดสิทธิ์เป็น user เท่านั้น
      coordinates: {
        type: 'Point',
        coordinates: [0, 0] // Default coordinates, can be updated later
      },
      displayName: `${firstName} ${lastName}`,
      profileImages: [], // ไม่มีรูปโปรไฟล์เริ่มต้น - ให้ผู้ใช้อัปโหลดเอง
      lifestyle: {
        smoking: null, // เลือก
        drinking: null, // เลือก
        exercise: null, // เลือก
        diet: null // เลือก
      },
      membership: {
        tier: 'member',
        startDate: new Date()
      }
    });

    await user.save();

    // Generate token
    const token = generateToken(user);

    // Update login history
    if (!user.loginHistory) {
      user.loginHistory = [];
    }
    user.loginHistory.push({
      timestamp: new Date(),
      method: 'email',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    user.lastLogin = new Date();
    await user.save();

    res.status(201).json({
      success: true,
      message: 'ลงทะเบียนสำเร็จ',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลงทะเบียน',
      error: error.message
    });
  }
});

// Register with phone (ไม่ต้องใช้ OTP)
router.post('/register-phone', async (req, res) => {
  try {
    const { 
      phone, 
      password,
      firstName, 
      lastName, 
      dateOfBirth, 
      gender, 
      lookingFor, 
      location 
    } = req.body;

    // Validate required fields
    if (!phone || !password || !firstName || !lastName || !dateOfBirth || !gender || !lookingFor || !location) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
      });
    }

    // Validate password: ต้องมี 8 ตัวอักษรขึ้นไป, มีตัวอักษรใหญ่ ตัวเล็ก และตัวเลข, ต้องเป็นภาษาอังกฤษเท่านั้น
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'
      });
    }

    // ตรวจสอบรหัสผ่านต้องเป็นภาษาอังกฤษเท่านั้น
    const passwordEnglishRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/
    if (!passwordEnglishRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านต้องเป็นภาษาอังกฤษและตัวเลขเท่านั้น'
      });
    }

    // ตรวจสอบรหัสผ่านต้องมีตัวอักษรใหญ่ ตัวเล็ก และตัวเลข
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านต้องมีตัวอักษรใหญ่ ตัวเล็ก และตัวเลข'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ phone });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'เบอร์โทรนี้ได้ถูกใช้งานแล้ว'
      });
    }

    // Generate username from phone (remove first 0, add prefix)
    const username = 'user_' + phone.replace(/^0/, '');

    // Create new user
    const newUser = new User({
      username,
      email: `${username}@temp.com`, // Generate temporary email
      password,
      phone,
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`, // เพิ่ม displayName จากชื่อจริง-นามสกุล
      dateOfBirth: new Date(dateOfBirth),
      gender,
      lookingFor,
      location,
      role: 'user', // กำหนดสิทธิ์เป็น user เท่านั้น
      coordinates: {
        type: 'Point',
        coordinates: [100.5018, 13.7563] // Default Bangkok coordinates
      },
      profileImages: [], // ไม่มีรูปโปรไฟล์เริ่มต้น - ให้ผู้ใช้อัปโหลดเอง
      lifestyle: {
        smoking: null, // เลือก
        drinking: null, // เลือก
        exercise: null, // เลือก
        diet: null // เลือก
      },
      coins: 1000, // เริ่มต้น 1000 coins
      votes: 100,  // เริ่มต้น 100 votes
      membership: {
        tier: 'member',
        startDate: new Date(),
        endDate: null,
        autoRenew: false,
        planId: null
      },
      dailyUsage: {
        chatCount: 0,
        imageUploadCount: 0,
        videoUploadCount: 0,
        lastReset: new Date()
      }
    });

    await newUser.save();

    // Generate JWT token
    const token = generateToken(newUser);

    // Return success response
    res.status(201).json({
      success: true,
      message: 'ลงทะเบียนสำเร็จ',
      data: {
        token,
        user: newUser.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Phone register error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์'
    });
  }
});

// Login with email/password
// Login with phone (ไม่ต้องใช้ OTP)
router.post('/login-phone', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกเบอร์โทรศัพท์'
      });
    }

    // Find user by phone
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบบัญชีผู้ใช้นี้'
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Update login history and online status
    if (!user.loginHistory) {
      user.loginHistory = [];
    }
    user.loginHistory.push({
      timestamp: new Date(),
      method: 'phone',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    user.lastLogin = new Date();
    user.lastActive = new Date(); // อัปเดต lastActive เมื่อเข้าสู่ระบบ
    user.isOnline = true; // ตั้งค่าสถานะออนไลน์
    await user.save();

    // Return success response
    res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      data: {
        token,
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Phone login error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์'
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    console.log('🔐 Login attempt:', { email, username, hasPassword: !!password });
    console.log('🔐 Request body:', req.body);
    console.log('🔐 Request headers:', req.headers);

    if (!password) {
      console.log('❌ No password provided');
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกรหัสผ่าน'
      });
    }

    if (!email && !username) {
      console.log('❌ No email or username provided');
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกอีเมลหรือชื่อผู้ใช้'
      });
    }

    // Find user by email or username
    let user;
    if (email) {
      user = await User.findOne({ email });
      console.log('🔍 Finding user by email:', email, 'Found:', !!user);
    } else {
      // Search username case-insensitive
      user = await User.findOne({ 
        username: { $regex: new RegExp(`^${username}$`, 'i') }
      });
      console.log('🔍 Finding user by username (case-insensitive):', username, 'Found:', !!user);
    }

    if (!user) {
      console.log('❌ User not found');
      console.log('❌ Searched for:', email ? `email: ${email}` : `username: ${username}`);
      return res.status(401).json({
        success: false,
        message: 'อีเมล/ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
      });
    }

    // Check if user is banned
    if (user.isBanned) {
      console.log('❌ User is banned:', user._id);
      return res.status(403).json({
        success: false,
        message: 'บัญชีของคุณถูกระงับการใช้งาน',
        reason: user.banReason
      });
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('❌ User is inactive:', user._id);
      return res.status(403).json({
        success: false,
        message: 'บัญชีของคุณไม่สามารถใช้งานได้'
      });
    }

    // Verify password
    console.log('🔑 Verifying password for user:', user._id);
    const isPasswordValid = await user.comparePassword(password);
    console.log('🔑 Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', user._id);
      console.log('❌ User details:', { username: user.username, email: user.email, isActive: user.isActive, isBanned: user.isBanned });
      return res.status(401).json({
        success: false,
        message: 'อีเมล/ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
      });
    }

    // Generate token
    const token = generateToken(user);
    console.log('✅ Login successful for user:', user._id, 'Token generated:', !!token);

    // Update login history
    if (!user.loginHistory) {
      user.loginHistory = [];
    }
    user.loginHistory.push({
      timestamp: new Date(),
      method: 'email',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    user.lastLogin = new Date();
    user.lastActive = new Date(); // อัปเดต lastActive เมื่อเข้าสู่ระบบ
    user.isOnline = true; // ตั้งค่าสถานะออนไลน์
    await user.save();

    res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ',
      error: error.message
    });
  }
});


// Phone verification - Send OTP
router.post('/phone/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกเบอร์โทรศัพท์'
      });
    }

    // Validate phone number format (Thai)
    const phoneRegex = /^(\+66|66|0)[0-9]{8,9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง'
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Check if user exists
    let user = await User.findOne({ phone });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้ที่ลงทะเบียนด้วยเบอร์โทรศัพท์นี้'
      });
    }

    // Update OTP
    user.phoneVerificationCode = otp;
    user.phoneVerificationExpires = expiresAt;
    await user.save();

    // OTP SMS sending - placeholder for future SMS service integration
    // Note: Would send OTP via SMS service in production environment
    console.log(`OTP for ${phone}: ${otp}`);

    res.json({
      success: true,
      message: 'ส่งรหัส OTP ไปยังเบอร์โทรศัพท์ของคุณแล้ว',
      data: {
        phone,
        expiresIn: 10 * 60 * 1000 // 10 minutes in milliseconds
      }
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการส่ง OTP',
      error: error.message
    });
  }
});

// Phone verification - Verify OTP
router.post('/phone/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกเบอร์โทรศัพท์และรหัส OTP'
      });
    }

    // Find user
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    // Check if OTP is valid
    if (user.phoneVerificationCode !== otp) {
      return res.status(400).json({
        success: false,
        message: 'รหัส OTP ไม่ถูกต้อง'
      });
    }

    // Check if OTP is expired
    if (user.phoneVerificationExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'รหัส OTP หมดอายุแล้ว'
      });
    }

    // Verify phone
    user.phoneVerified = true;
    user.phoneVerificationCode = null;
    user.phoneVerificationExpires = null;

    // Generate token
    const token = generateToken(user);

    // Update login history
    if (!user.loginHistory) {
      user.loginHistory = [];
    }
    user.loginHistory.push({
      timestamp: new Date(),
      method: 'phone',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    user.lastLogin = new Date();
    user.lastActive = new Date(); // อัปเดต lastActive เมื่อเข้าสู่ระบบ
    user.isOnline = true; // ตั้งค่าสถานะออนไลน์
    await user.save();

    res.json({
      success: true,
      message: 'ยืนยันเบอร์โทรศัพท์สำเร็จ',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการยืนยัน OTP',
      error: error.message
    });
  }
});

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบ token'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('🔍 JWT decoded:', { id: decoded.id, email: decoded.email, username: decoded.username });
    
    const user = await User.findById(decoded.id);
    console.log('🔍 User found:', { 
      _id: user?._id, 
      email: user?.email, 
      username: user?.username,
      displayName: user?.displayName,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'บัญชีของคุณไม่สามารถใช้งานได้'
      });
    }

    const userProfile = user.getPublicProfile();
    console.log('👤 User profile data being sent:', {
      _id: userProfile._id,
      id: userProfile.id,
      email: userProfile.email,
      username: userProfile.username,
      displayName: userProfile.displayName,
      coins: userProfile.coins, // เพิ่มการ log coins
      allKeys: Object.keys(userProfile)
    });

    res.json({
      success: true,
      data: {
        user: userProfile
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(401).json({
      success: false,
      message: 'Token ไม่ถูกต้อง',
      error: error.message
    });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (user) {
          user.isOnline = false;
          user.lastActive = new Date();
          await user.save();
          console.log(`🔴 User ${user._id} logged out - online status set to false`);
        }
      } catch (jwtError) {
        console.error('JWT verification failed during logout:', jwtError);
        // Continue with logout even if JWT is invalid
      }
    }

    res.json({
      success: true,
      message: 'ออกจากระบบสำเร็จ'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการออกจากระบบ',
      error: error.message
    });
  }
});

// Check if username is available
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    // Check username case-insensitive
    const existingUser = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });
    
    res.json({
      success: true,
      data: {
        available: !existingUser
      }
    });

  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบชื่อผู้ใช้',
      error: error.message
    });
  }
});

// Check if email is available
router.get('/check-email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const existingUser = await User.findOne({ email });
    
    res.json({
      success: true,
      data: {
        available: !existingUser
      }
    });

  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบอีเมล',
      error: error.message
    });
  }
});

// ============ GOOGLE OAUTH ROUTES ============

// Only setup Google OAuth routes if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  // Google OAuth - Initiate authentication
  router.get('/google', 
    passport.authenticate('google', {
      scope: ['profile', 'email']
    })
  );

  // Google OAuth - Callback handler
  router.get('/google/callback', 
    passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=auth_failed&reason=passport_failed` }),
    async (req, res) => {
      try {
        console.log('🔍 Google OAuth callback received');
        console.log('🔍 Request user:', req.user);
        console.log('🔍 Request query:', req.query);
        console.log('🔍 Request body:', req.body);
        
        const user = req.user;
        
        if (!user) {
          console.log('❌ Google OAuth: No user returned from passport');
          console.log('❌ This usually means the Google OAuth strategy failed');
          return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=auth_failed&reason=no_user`);
        }

        console.log('✅ Google OAuth user found:', {
          id: user._id,
          email: user.email,
          googleId: user.googleId,
          username: user.username
        });

        // Generate JWT token
        const token = generateToken(user);
        console.log('✅ JWT token generated:', !!token);

        // Update login history
        if (!user.loginHistory) {
          user.loginHistory = [];
        }
        user.loginHistory.push({
          timestamp: new Date(),
          method: 'google',
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        user.lastLogin = new Date();
        user.lastActive = new Date();
        user.isOnline = true;
        await user.save();

        console.log('✅ Google OAuth successful for user:', user._id);

        // Redirect to frontend with token
        const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}?token=${token}&login_success=true`;
        console.log('🔄 Redirecting to:', redirectUrl);
        res.redirect(redirectUrl);

      } catch (error) {
        console.error('❌ Google OAuth callback error:', error);
        console.error('❌ Error stack:', error.stack);
        const errorUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=auth_failed&reason=callback_error&message=${encodeURIComponent(error.message)}`;
        res.redirect(errorUrl);
      }
    }
  );

  // Google OAuth - Get auth URL for frontend
  router.get('/google/url', (req, res) => {
    try {
      const authUrl = `${req.protocol}://${req.get('host')}/api/auth/google`;
      res.json({
        success: true,
        data: {
          authUrl
        }
      });
    } catch (error) {
      console.error('❌ Get Google auth URL error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้าง URL สำหรับ Google OAuth',
        error: error.message
      });
    }
  });
} else {
  // Provide fallback routes when Google OAuth is not configured
  router.get('/google', (req, res) => {
    res.status(501).json({
      success: false,
      message: 'Google OAuth is not configured on this server'
    });
  });

  router.get('/google/callback', (req, res) => {
    res.status(501).json({
      success: false,
      message: 'Google OAuth is not configured on this server'
    });
  });

  router.get('/google/url', (req, res) => {
    res.status(501).json({
      success: false,
      message: 'Google OAuth is not configured on this server'
    });
  });
}

module.exports = router;

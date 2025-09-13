const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const { DEFAULT_AVATAR_BASE64 } = require('./defaultAvatar');

// Google OAuth Strategy
// ตรวจสอบและตั้งค่า backend URL เพื่อป้องกัน undefined
let backendUrl;
if (process.env.BACKEND_URL && process.env.BACKEND_URL !== 'undefined' && process.env.BACKEND_URL.trim() !== '') {
  backendUrl = process.env.BACKEND_URL.trim();
} else if (process.env.NODE_ENV === 'production') {
  backendUrl = 'https://sodeclick-backend-production.up.railway.app';
} else {
  backendUrl = 'http://localhost:5000';
}

console.log('🔧 Google OAuth Configuration:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- Raw BACKEND_URL:', process.env.BACKEND_URL);
console.log('- Final Backend URL:', backendUrl);
console.log('- Client ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Not set');
console.log('- Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Not set');
console.log('- Callback URL:', `${backendUrl}/api/auth/google/callback`);

// ตรวจสอบว่ามี credentials หรือไม่
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('❌ Google OAuth credentials are missing!');
  console.error('- GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Missing');
  console.error('- GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Missing');
}

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${backendUrl}/api/auth/google/callback`,
  passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists
    let user = await User.findOne({ googleId: profile.id });

    if (user) {
      // User exists, update last login
      user.lastLogin = new Date();
      user.isOnline = true;
      await user.save();
      return done(null, user);
    }

    // Check if email already exists
    user = await User.findOne({ email: profile.emails[0].value });

    if (user) {
      // Email exists but no Google ID, link accounts
      user.googleId = profile.id;
      user.googleEmail = profile.emails[0].value;
      user.googleName = profile.displayName;
      user.googlePicture = profile.photos[0]?.value;
      user.lastLogin = new Date();
      user.isOnline = true;
      await user.save();
      return done(null, user);
    }

    // Create new user
    const [firstName, ...lastNameParts] = profile.displayName.split(' ');
    const lastName = lastNameParts.join(' ') || '';

    user = new User({
      googleId: profile.id,
      googleEmail: profile.emails[0].value,
      googleName: profile.displayName,
      googlePicture: profile.photos[0]?.value,
      email: profile.emails[0].value,
      username: `user_${Date.now()}`, // Generate unique username
      firstName: firstName || 'User',
      lastName: lastName || 'Google',
      displayName: profile.displayName,
      profileImages: [DEFAULT_AVATAR_BASE64], // เพิ่มรูปโปรไฟล์เริ่มต้น
      role: 'user', // กำหนดสิทธิ์เป็น user เท่านั้น
      dateOfBirth: new Date('1990-01-01'), // Default date, user can update later
      gender: 'other', // Default, user can update later
      lookingFor: 'both', // Default, user can update later
      location: 'Bangkok', // Default, user can update later
      coordinates: {
        type: 'Point',
        coordinates: [0, 0]
      },
      membership: {
        tier: 'member',
        startDate: new Date()
      },
      isVerified: true, // Google accounts are considered verified
      lastLogin: new Date(),
      isOnline: true
    });

    await user.save();
    return done(null, user);

  } catch (error) {
    console.error('Google OAuth error:', error);
    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;

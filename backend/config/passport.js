const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const { DEFAULT_AVATAR_BASE64 } = require('./defaultAvatar');

// Configure Google OAuth Strategy only if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    console.log('🔧 Configuring Google OAuth Strategy');
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            console.log('🔍 Google OAuth Profile:', profile);

            // Check if user already exists with this Google ID
            let user = await User.findOne({ googleId: profile.id });
            
            if (user) {
                console.log('✅ Existing Google user found:', user._id);
                return done(null, user);
            }

            // Check if user exists with the same email
            user = await User.findOne({ email: profile.emails[0].value });
            
            if (user) {
                // Link Google account to existing user
                user.googleId = profile.id;
                await user.save();
                console.log('🔗 Linked Google account to existing user:', user._id);
                return done(null, user);
            }

            // Create new user
            const newUser = new User({
                googleId: profile.id,
                email: profile.emails[0].value,
                firstName: profile.name.givenName || 'User',
                lastName: profile.name.familyName || '',
                username: `google_${profile.id}`,
                profileImages: profile.photos && profile.photos.length > 0 ? [profile.photos[0].value] : [DEFAULT_AVATAR_BASE64],
                isVerified: true, // Google accounts are considered verified
                // Set default required fields
                dateOfBirth: new Date('1990-01-01'), // Default date - user will need to update
                gender: 'other', // Default - user will need to update
                lookingFor: 'both', // Default - user will need to update
                location: 'ไม่ระบุ', // Default - user will need to update
                coordinates: {
                    type: 'Point',
                    coordinates: [100.5018, 13.7563] // Default Bangkok coordinates
                }
            });

            await newUser.save();
            console.log('✅ New Google user created:', newUser._id);
            return done(null, newUser);

        } catch (error) {
            console.error('❌ Google OAuth Error:', error);
            return done(error, null);
        }
    }));
} else {
    console.log('⚠️  Google OAuth credentials not provided, skipping Google authentication setup');
}

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user._id);
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

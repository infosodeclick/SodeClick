const fs = require('fs');
const path = require('path');

/**
 * Script to verify that all profile images have been migrated to the new structure
 */

const uploadsDir = path.join(__dirname, '../uploads');
const profilesDir = path.join(uploadsDir, 'profiles');
const usersDir = path.join(uploadsDir, 'users');

console.log('🔍 Verifying profile image migration...');
console.log('📁 Profiles directory:', profilesDir);
console.log('📁 Users directory:', usersDir);

// Get all profile images from old location
const profileFiles = fs.readdirSync(profilesDir).filter(file => {
  return file.startsWith('profile-') && (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png'));
});

console.log(`📸 Found ${profileFiles.length} profile images in old location`);

let verifiedCount = 0;
let missingCount = 0;
let errors = [];

profileFiles.forEach(file => {
  try {
    // Extract userId from filename
    const userIdMatch = file.match(/profile-([a-f0-9]{24})-/);
    
    if (!userIdMatch) {
      console.log(`⚠️ Cannot extract userId from: ${file}`);
      missingCount++;
      return;
    }
    
    const userId = userIdMatch[1];
    const userDir = path.join(usersDir, userId);
    const destPath = path.join(userDir, file);
    
    if (fs.existsSync(destPath)) {
      console.log(`✅ Verified: ${file} exists in ${userDir}`);
      verifiedCount++;
    } else {
      console.log(`❌ Missing: ${file} not found in ${userDir}`);
      missingCount++;
      errors.push(`Missing: ${file} for user ${userId}`);
    }
    
  } catch (error) {
    console.error(`❌ Error checking ${file}:`, error.message);
    errors.push(`Error checking ${file}: ${error.message}`);
    missingCount++;
  }
});

console.log('\n📊 Verification Summary:');
console.log(`✅ Verified: ${verifiedCount} files`);
console.log(`❌ Missing: ${missingCount} files`);
console.log(`📸 Total checked: ${profileFiles.length} files`);

if (missingCount > 0) {
  console.log('\n⚠️ Missing files:');
  errors.forEach(error => console.log(`  - ${error}`));
}

if (missingCount === 0) {
  console.log('\n🎉 All profile images have been successfully migrated!');
  console.log('✅ You can now safely use the new URL structure in production.');
} else {
  console.log('\n⚠️ Some files are missing. Please run the migration script again.');
}

const fs = require('fs');
const path = require('path');

/**
 * Script to migrate profile images from /uploads/profiles/ to /uploads/users/{userId}/
 * This ensures consistent file structure between development and production
 */

const uploadsDir = path.join(__dirname, '../uploads');
const profilesDir = path.join(uploadsDir, 'profiles');
const usersDir = path.join(uploadsDir, 'users');

console.log('🚀 Starting profile image migration...');
console.log('📁 Profiles directory:', profilesDir);
console.log('📁 Users directory:', usersDir);

// Ensure users directory exists
if (!fs.existsSync(usersDir)) {
  fs.mkdirSync(usersDir, { recursive: true });
  console.log('✅ Created users directory');
}

// Get all profile images
const profileFiles = fs.readdirSync(profilesDir).filter(file => {
  return file.startsWith('profile-') && (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png'));
});

console.log(`📸 Found ${profileFiles.length} profile images to migrate`);

let migratedCount = 0;
let skippedCount = 0;
let errorCount = 0;

profileFiles.forEach(file => {
  try {
    // Extract userId from filename: profile-{userId}-{timestamp}-{random}.{ext}
    const userIdMatch = file.match(/profile-([a-f0-9]{24})-/);
    
    if (!userIdMatch) {
      console.log(`⚠️ Skipping ${file}: Cannot extract userId`);
      skippedCount++;
      return;
    }
    
    const userId = userIdMatch[1];
    const userDir = path.join(usersDir, userId);
    
    // Create user directory if it doesn't exist
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
      console.log(`📁 Created directory for user: ${userId}`);
    }
    
    const sourcePath = path.join(profilesDir, file);
    const destPath = path.join(userDir, file);
    
    // Check if file already exists in destination
    if (fs.existsSync(destPath)) {
      console.log(`⏭️ Skipping ${file}: Already exists in ${userDir}`);
      skippedCount++;
      return;
    }
    
    // Copy file
    fs.copyFileSync(sourcePath, destPath);
    console.log(`✅ Migrated ${file} to ${userDir}`);
    migratedCount++;
    
  } catch (error) {
    console.error(`❌ Error migrating ${file}:`, error.message);
    errorCount++;
  }
});

console.log('\n📊 Migration Summary:');
console.log(`✅ Migrated: ${migratedCount} files`);
console.log(`⏭️ Skipped: ${skippedCount} files`);
console.log(`❌ Errors: ${errorCount} files`);
console.log(`📸 Total processed: ${profileFiles.length} files`);

if (errorCount === 0) {
  console.log('\n🎉 Migration completed successfully!');
} else {
  console.log('\n⚠️ Migration completed with errors. Please review the logs above.');
}

#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing permissions for all binaries...');

const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.join(rootDir, 'frontend');
const backendDir = path.join(rootDir, 'backend');

// Function to fix permissions for a directory
function fixPermissions(dir, name) {
  const binDir = path.join(dir, 'node_modules', '.bin');
  
  if (fs.existsSync(binDir)) {
    try {
      const files = fs.readdirSync(binDir);
      let fixedCount = 0;
      
      files.forEach(file => {
        const filePath = path.join(binDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile() && !stats.isDirectory()) {
          // Fix permissions to 755 (rwxr-xr-x)
          fs.chmodSync(filePath, '755');
          fixedCount++;
        }
      });
      
      console.log(`✅ Fixed ${fixedCount} binaries in ${name}`);
    } catch (error) {
      console.error(`❌ Error fixing permissions in ${name}:`, error.message);
    }
  } else {
    console.log(`⚠️  No .bin directory found in ${name}`);
  }
}

// Fix permissions for all directories
fixPermissions(rootDir, 'root');
fixPermissions(frontendDir, 'frontend');
fixPermissions(backendDir, 'backend');

console.log('✅ Permission fixing completed!');

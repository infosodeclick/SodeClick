#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing macOS permissions for project binaries...');

const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.join(rootDir, 'frontend');
const backendDir = path.join(rootDir, 'backend');

// List of binaries that need executable permissions
const binaries = [
  // Root level
  path.join(rootDir, 'node_modules', '.bin', 'concurrently'),
  path.join(rootDir, 'node_modules', '.bin', 'shx'),
  
  // Frontend
  path.join(frontendDir, 'node_modules', '.bin', 'shx'),
  path.join(frontendDir, 'node_modules', '.bin', 'vite'),
  path.join(frontendDir, 'node_modules', '.bin', 'tsc'),
  
  // Backend
  path.join(backendDir, 'node_modules', '.bin', 'shx'),
  path.join(backendDir, 'node_modules', '.bin', 'nodemon'),
  path.join(backendDir, 'node_modules', '.bin', 'node')
];

let fixedCount = 0;
let skippedCount = 0;

binaries.forEach(binary => {
  if (fs.existsSync(binary)) {
    try {
      fs.chmodSync(binary, '755');
      console.log(`✅ Fixed permissions for ${path.basename(binary)}`);
      fixedCount++;
    } catch (error) {
      console.warn(`⚠️  Could not fix permissions for ${path.basename(binary)}: ${error.message}`);
    }
  } else {
    console.log(`⏭️  Skipped ${path.basename(binary)} (not found)`);
    skippedCount++;
  }
});

console.log(`\n📊 Summary:`);
console.log(`✅ Fixed: ${fixedCount} binaries`);
console.log(`⏭️  Skipped: ${skippedCount} binaries`);
console.log(`🎉 Permission fixing completed!`);

// Also fix the script files themselves
const scriptFiles = [
  path.join(rootDir, 'scripts', 'dev-macos.js'),
  path.join(rootDir, 'scripts', 'dev.js'),
  path.join(rootDir, 'scripts', 'dev-smart.js')
];

console.log('\n🔧 Fixing script file permissions...');
scriptFiles.forEach(script => {
  if (fs.existsSync(script)) {
    try {
      fs.chmodSync(script, '755');
      console.log(`✅ Fixed permissions for ${path.basename(script)}`);
    } catch (error) {
      console.warn(`⚠️  Could not fix permissions for ${path.basename(script)}: ${error.message}`);
    }
  }
});

console.log('\n🚀 Ready to run npm run dev:macos!');

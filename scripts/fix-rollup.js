#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

console.log('🔧 Fixing Rollup native module issues for macOS ARM64...');

const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.join(rootDir, 'frontend');
const backendDir = path.join(rootDir, 'backend');

// Function to check if we're on macOS ARM64
function isMacOSARM64() {
  return os.platform() === 'darwin' && os.arch() === 'arm64';
}

// Function to run npm install in a directory
function runNpmInstall(dir, name) {
  return new Promise((resolve, reject) => {
    console.log(`📦 Reinstalling dependencies in ${name}...`);
    
    const npm = spawn('npm', ['install'], { 
      cwd: dir, 
      stdio: 'inherit',
      shell: false
    });
    
    npm.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Dependencies reinstalled in ${name}`);
        resolve();
      } else {
        reject(new Error(`Failed to reinstall dependencies in ${name}`));
      }
    });
  });
}

// Function to clean and reinstall dependencies
async function cleanAndReinstall(dir, name) {
  const nodeModulesPath = path.join(dir, 'node_modules');
  const packageLockPath = path.join(dir, 'package-lock.json');
  
  console.log(`🧹 Cleaning ${name}...`);
  
  // Remove node_modules and package-lock.json
  if (fs.existsSync(nodeModulesPath)) {
    fs.rmSync(nodeModulesPath, { recursive: true, force: true });
    console.log(`✅ Removed ${name}/node_modules`);
  }
  
  if (fs.existsSync(packageLockPath)) {
    fs.unlinkSync(packageLockPath);
    console.log(`✅ Removed ${name}/package-lock.json`);
  }
  
  // Reinstall dependencies
  await runNpmInstall(dir, name);
}

async function main() {
  try {
    if (!isMacOSARM64()) {
      console.log('ℹ️  This script is designed for macOS ARM64. Current platform:', os.platform(), os.arch());
      return;
    }
    
    console.log('🍎 macOS ARM64 detected - fixing Rollup native module issues...');
    
    // Clean and reinstall frontend dependencies
    await cleanAndReinstall(frontendDir, 'frontend');
    
    // Clean and reinstall backend dependencies (optional, but good practice)
    await cleanAndReinstall(backendDir, 'backend');
    
    // Fix permissions after reinstall
    console.log('🔧 Fixing permissions after reinstall...');
    const fixPermissions = spawn('node', ['scripts/fix-permissions.js'], {
      cwd: rootDir,
      stdio: 'inherit',
      shell: false
    });
    
    fixPermissions.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Rollup fix completed successfully!');
        console.log('🚀 You can now run: npm run dev');
      } else {
        console.error('❌ Permission fixing failed');
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

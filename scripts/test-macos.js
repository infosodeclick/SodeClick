#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

console.log('🧪 Testing macOS compatibility...');
console.log(`Platform: ${os.platform()}`);
console.log(`Architecture: ${os.arch()}`);

// Test directory structure
const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.join(rootDir, 'frontend');
const backendDir = path.join(rootDir, 'backend');

console.log('📁 Checking directories...');
console.log(`Frontend exists: ${fs.existsSync(frontendDir)}`);
console.log(`Backend exists: ${fs.existsSync(backendDir)}`);

// Test environment file copying
if (os.platform() === 'darwin') {
  console.log('🍎 Testing environment file copying...');
  const frontendEnvSource = path.join(frontendDir, 'env.development');
  const backendEnvSource = path.join(backendDir, 'env.development');
  
  console.log(`Frontend env exists: ${fs.existsSync(frontendEnvSource)}`);
  console.log(`Backend env exists: ${fs.existsSync(backendEnvSource)}`);
  
  if (fs.existsSync(frontendEnvSource)) {
    try {
      fs.copyFileSync(frontendEnvSource, path.join(frontendDir, '.env'));
      console.log('✅ Frontend env copied successfully');
    } catch (error) {
      console.log('❌ Frontend env copy failed:', error.message);
    }
  }
  
  if (fs.existsSync(backendEnvSource)) {
    try {
      fs.copyFileSync(backendEnvSource, path.join(backendDir, '.env'));
      console.log('✅ Backend env copied successfully');
    } catch (error) {
      console.log('❌ Backend env copy failed:', error.message);
    }
  }
}

// Test concurrently availability
console.log('🔧 Testing concurrently...');
try {
  const concurrently = spawn('npx', ['concurrently', '--version'], {
    stdio: 'pipe',
    shell: false
  });
  
  concurrently.stdout.on('data', (data) => {
    console.log(`✅ Concurrently version: ${data.toString().trim()}`);
  });
  
  concurrently.stderr.on('data', (data) => {
    console.log(`❌ Concurrently error: ${data.toString().trim()}`);
  });
  
  concurrently.on('close', (code) => {
    console.log(`Concurrently test completed with code: ${code}`);
  });
} catch (error) {
  console.log('❌ Concurrently test failed:', error.message);
}

console.log('✅ macOS compatibility test completed!');

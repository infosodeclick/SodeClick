#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Cross-platform file copy function
function copyEnvFile(source, target) {
  try {
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, target);
      console.log(`✅ Copied ${path.basename(source)} to ${path.basename(target)}`);
      return true;
    } else {
      console.warn(`⚠️  Source file ${source} not found`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error copying ${source}:`, error.message);
    return false;
  }
}

function main() {
  const rootDir = path.resolve(__dirname, '..');
  const frontendDir = path.join(rootDir, 'frontend');
  const backendDir = path.join(rootDir, 'backend');

  console.log('🪟 Windows Development Server Starter');
  console.log('📁 Copying environment files...');
  
  copyEnvFile(path.join(frontendDir, 'env.development'), path.join(frontendDir, '.env'));
  copyEnvFile(path.join(backendDir, 'env.development'), path.join(backendDir, '.env'));
  
  console.log('🚀 Starting development servers...\n');

  // Start Backend
  console.log('🔵 Starting backend server...');
  const backend = spawn('npm', ['run', 'dev'], {
    cwd: backendDir,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  // Give backend a moment to start, then start frontend
  setTimeout(() => {
    console.log('🟢 Starting frontend server...');
    const frontend = spawn('npm', ['run', 'dev'], {
      cwd: frontendDir,
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    // Handle frontend process errors
    frontend.on('error', (error) => {
      console.error('❌ Frontend error:', error);
      backend.kill();
      process.exit(1);
    });

    frontend.on('close', (code) => {
      if (code !== 0) {
        console.log(`Frontend exited with code ${code}`);
        backend.kill();
        process.exit(code);
      }
    });
  }, 2000);

  // Handle backend process errors
  backend.on('error', (error) => {
    console.error('❌ Backend error:', error);
    process.exit(1);
  });

  backend.on('close', (code) => {
    if (code !== 0) {
      console.log(`Backend exited with code ${code}`);
      process.exit(code);
    }
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping development servers...');
    backend.kill();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Stopping development servers...');
    backend.kill();
    process.exit(0);
  });
}

main();


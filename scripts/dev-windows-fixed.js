#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Function to copy environment files
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

async function main() {
  try {
    const rootDir = path.resolve(__dirname, '..');
    const frontendDir = path.join(rootDir, 'frontend');
    const backendDir = path.join(rootDir, 'backend');

    console.log('🪟 Starting Windows development environment...');

    // Copy environment files
    copyEnvFile(path.join(frontendDir, 'env.development'), path.join(frontendDir, '.env'));
    copyEnvFile(path.join(backendDir, 'env.development'), path.join(backendDir, '.env'));

    console.log('🚀 Starting backend server...');
    
    // Start backend server
    const backend = spawn('npm', ['run', 'dev'], {
      cwd: backendDir,
      stdio: 'inherit',
      shell: true,
      env: { ...process.env }
    });

    // Wait a moment for backend to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🚀 Starting frontend server...');
    
    // Start frontend server
    const frontend = spawn('npm', ['run', 'dev'], {
      cwd: frontendDir,
      stdio: 'inherit',
      shell: true,
      env: { ...process.env }
    });

    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping development servers...');
      backend.kill('SIGINT');
      frontend.kill('SIGINT');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Stopping development servers...');
      backend.kill('SIGTERM');
      frontend.kill('SIGTERM');
      process.exit(0);
    });

    // Handle process exits
    backend.on('exit', (code) => {
      console.log(`Backend process exited with code ${code}`);
    });

    frontend.on('exit', (code) => {
      console.log(`Frontend process exited with code ${code}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
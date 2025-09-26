#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Function to check if directory exists
function checkDirectory(dir) {
  return fs.existsSync(dir);
}

// Function to check if node_modules exists
function checkNodeModules(dir) {
  return fs.existsSync(path.join(dir, 'node_modules'));
}

// Function to copy environment file (cross-platform alternative to shx)
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

// Function to run npm install in a directory
function runNpmInstall(dir) {
  return new Promise((resolve, reject) => {
    console.log(`📦 Installing dependencies in ${path.basename(dir)}...`);
    
    const npm = spawn('npm', ['install'], { 
      cwd: dir, 
      stdio: 'inherit',
      shell: false
    });
    
    npm.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Dependencies installed in ${path.basename(dir)}`);
        resolve();
      } else {
        reject(new Error(`Failed to install dependencies in ${path.basename(dir)}`));
      }
    });
  });
}

// Function to run dev server with environment file copying
function runDevServer(dir, script, envSource) {
  console.log(`🚀 Starting ${script} in ${path.basename(dir)}...`);
  
  // Copy environment file first
  if (envSource) {
    const envTarget = path.join(dir, '.env');
    copyEnvFile(envSource, envTarget);
  }
  
  return spawn('npm', ['run', script], { 
    cwd: dir, 
    stdio: 'inherit',
    shell: false 
  });
}

async function main() {
  try {
    const rootDir = path.resolve(__dirname, '..');
    const frontendDir = path.join(rootDir, 'frontend');
    const backendDir = path.join(rootDir, 'backend');

    console.log('🔍 Checking project structure...');

    // Check if directories exist
    if (!checkDirectory(frontendDir)) {
      console.error('❌ Frontend directory not found');
      process.exit(1);
    }

    if (!checkDirectory(backendDir)) {
      console.error('❌ Backend directory not found');
      process.exit(1);
    }

    console.log('✅ Project structure verified');

    // Install dependencies if needed
    if (!checkNodeModules(frontendDir)) {
      await runNpmInstall(frontendDir);
    } else {
      console.log('✅ Frontend dependencies already installed');
    }

    if (!checkNodeModules(backendDir)) {
      await runNpmInstall(backendDir);
    } else {
      console.log('✅ Backend dependencies already installed');
    }

    // Copy environment files
    const frontendEnvSource = path.join(frontendDir, 'env.development');
    const backendEnvSource = path.join(backendDir, 'env.development');
    
    copyEnvFile(frontendEnvSource, path.join(frontendDir, '.env'));
    copyEnvFile(backendEnvSource, path.join(backendDir, '.env'));
    
    // Fix permissions for binaries
    console.log('🔧 Fixing permissions for binaries...');
    try {
      const binaries = [
        path.join(frontendDir, 'node_modules', '.bin', 'shx'),
        path.join(backendDir, 'node_modules', '.bin', 'shx'),
        path.join(rootDir, 'node_modules', '.bin', 'concurrently'),
        path.join(frontendDir, 'node_modules', '.bin', 'vite'),
        path.join(backendDir, 'node_modules', '.bin', 'nodemon')
      ];
      
      binaries.forEach(binary => {
        if (fs.existsSync(binary)) {
          fs.chmodSync(binary, '755');
          console.log(`✅ Fixed permissions for ${path.basename(binary)}`);
        }
      });
    } catch (error) {
      console.warn('⚠️  Could not fix binary permissions:', error.message);
    }

    // Start both servers using concurrently
    console.log('🚀 Starting development servers...');
    
    const concurrentlyArgs = [
      'concurrently',
      '--kill-others',
      '--prefix-colors', 'blue,green',
      '--prefix', '[{name}]',
      '--names', 'frontend,backend',
      'npm run dev:frontend',
      'npm run dev:backend'
    ];
    
    const concurrently = spawn('npx', concurrentlyArgs, {
      cwd: rootDir,
      stdio: 'inherit',
      shell: false,
      env: { ...process.env, PATH: process.env.PATH }
    });

    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping development servers...');
      concurrently.kill('SIGINT');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Stopping development servers...');
      concurrently.kill('SIGTERM');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

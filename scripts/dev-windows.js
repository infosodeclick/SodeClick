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

// Cross-platform file copy function (Windows-compatible)
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
      shell: true, // Always use shell on Windows
      env: { ...process.env, PATH: process.env.PATH }
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

// Windows-specific environment setup
function setupWindowsEnvironment(frontendDir, backendDir) {
  console.log('🪟 Windows detected - setting up environment files...');
  
  // Copy environment files for frontend
  const frontendEnvSource = path.join(frontendDir, 'env.development');
  copyEnvFile(frontendEnvSource, path.join(frontendDir, '.env'));
  
  // Copy environment files for backend
  const backendEnvSource = path.join(backendDir, 'env.development');
  copyEnvFile(backendEnvSource, path.join(backendDir, '.env'));
}

// Create Windows-compatible scripts for frontend and backend
function createWindowsScripts(frontendDir, backendDir) {
  console.log('🔧 Creating Windows-compatible scripts...');
  
  // Create Windows-compatible frontend dev script
  const frontendPackagePath = path.join(frontendDir, 'package.json');
  if (fs.existsSync(frontendPackagePath)) {
    const frontendPackage = JSON.parse(fs.readFileSync(frontendPackagePath, 'utf8'));
    
    // Add Windows-compatible dev script
    if (!frontendPackage.scripts['dev:windows']) {
      frontendPackage.scripts['dev:windows'] = 'node -e "require(\'fs\').copyFileSync(\'env.development\', \'.env\')" && vite';
      fs.writeFileSync(frontendPackagePath, JSON.stringify(frontendPackage, null, 2));
      console.log('✅ Added Windows-compatible frontend dev script');
    }
  }
  
  // Create Windows-compatible backend dev script
  const backendPackagePath = path.join(backendDir, 'package.json');
  if (fs.existsSync(backendPackagePath)) {
    const backendPackage = JSON.parse(fs.readFileSync(backendPackagePath, 'utf8'));
    
    // Add Windows-compatible dev script
    if (!backendPackage.scripts['dev:windows']) {
      backendPackage.scripts['dev:windows'] = 'node -e "require(\'fs\').copyFileSync(\'env.development\', \'.env\')" && nodemon server.js';
      fs.writeFileSync(backendPackagePath, JSON.stringify(backendPackage, null, 2));
      console.log('✅ Added Windows-compatible backend dev script');
    }
  }
}

async function main() {
  try {
    const rootDir = path.resolve(__dirname, '..');
    const frontendDir = path.join(rootDir, 'frontend');
    const backendDir = path.join(rootDir, 'backend');
    const platform = os.platform();

    console.log(`🔍 Checking project structure on ${platform}...`);

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

    // Setup environment files for Windows
    if (platform === 'win32') {
      setupWindowsEnvironment(frontendDir, backendDir);
      createWindowsScripts(frontendDir, backendDir);
    }

    // Start both servers using concurrently with Windows-compatible settings
    console.log('🚀 Starting development servers...');
    
    const concurrentlyArgs = [
      'concurrently',
      '--kill-others',
      '--prefix-colors', 'blue,green',
      '--prefix', '[{name}]',
      '--names', 'frontend,backend',
      'cd frontend && npm run dev:windows',
      'cd backend && npm run dev:windows'
    ];
    
    const concurrently = spawn('npx', concurrentlyArgs, {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true, // Always use shell on Windows
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

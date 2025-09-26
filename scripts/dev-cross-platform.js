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

// Function to run npm install in a directory
function runNpmInstall(dir) {
  return new Promise((resolve, reject) => {
    console.log(`📦 Installing dependencies in ${path.basename(dir)}...`);
    
    const npm = spawn('npm', ['install'], { 
      cwd: dir, 
      stdio: 'inherit',
      shell: os.platform() === 'win32', // Use shell on Windows
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

// macOS-specific setup
function setupMacOSEnvironment(frontendDir, backendDir) {
  console.log('🍎 macOS detected - setting up environment...');
  
  // Copy environment files
  copyEnvFile(path.join(frontendDir, 'env.development'), path.join(frontendDir, '.env'));
  copyEnvFile(path.join(backendDir, 'env.development'), path.join(backendDir, '.env'));
  
  // Fix permissions for binaries
  console.log('🔧 Fixing permissions for binaries...');
  try {
    const binaries = [
      path.join(frontendDir, 'node_modules', '.bin', 'shx'),
      path.join(backendDir, 'node_modules', '.bin', 'shx'),
      path.join(path.resolve(__dirname, '..'), 'node_modules', '.bin', 'concurrently'),
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
}

// Windows-specific setup
function setupWindowsEnvironment(frontendDir, backendDir) {
  console.log('🪟 Windows detected - setting up environment...');
  
  // Copy environment files
  copyEnvFile(path.join(frontendDir, 'env.development'), path.join(frontendDir, '.env'));
  copyEnvFile(path.join(backendDir, 'env.development'), path.join(backendDir, '.env'));
  
  // Create Windows-compatible scripts
  console.log('🔧 Creating Windows-compatible scripts...');
  
  // Create Windows-compatible frontend dev script
  const frontendPackagePath = path.join(frontendDir, 'package.json');
  if (fs.existsSync(frontendPackagePath)) {
    const frontendPackage = JSON.parse(fs.readFileSync(frontendPackagePath, 'utf8'));
    
    // Add Windows-compatible dev script if it doesn't exist
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
    
    // Add Windows-compatible dev script if it doesn't exist
    if (!backendPackage.scripts['dev:windows']) {
      backendPackage.scripts['dev:windows'] = 'node -e "require(\'fs\').copyFileSync(\'env.development\', \'.env\')" && nodemon server.js';
      fs.writeFileSync(backendPackagePath, JSON.stringify(backendPackage, null, 2));
      console.log('✅ Added Windows-compatible backend dev script');
    }
  }
}

// Start development servers with platform-specific configuration
function startDevServers(rootDir, platform) {
  console.log('🚀 Starting development servers...');
  
  let concurrentlyArgs;
  
  if (platform === 'win32') {
    // Windows-specific concurrently configuration
    concurrentlyArgs = [
      'concurrently',
      '--kill-others',
      '--prefix-colors', 'blue,green',
      '--prefix', '[{name}]',
      '--names', 'frontend,backend',
      '"npm run dev:frontend"',
      '"npm run dev:backend"'
    ];
  } else {
    // macOS/Unix-specific concurrently configuration
    concurrentlyArgs = [
      'concurrently',
      '--kill-others',
      '--prefix-colors', 'blue,green',
      '--prefix', '[{name}]',
      '--names', 'frontend,backend',
      'npm run dev:frontend',
      'npm run dev:backend'
    ];
  }
  
  const concurrently = spawn('npx', concurrentlyArgs, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: platform === 'win32', // Use shell on Windows
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

    // Platform-specific setup
    if (platform === 'darwin') {
      setupMacOSEnvironment(frontendDir, backendDir);
    } else if (platform === 'win32') {
      setupWindowsEnvironment(frontendDir, backendDir);
    } else {
      console.log(`⚠️  Unsupported platform: ${platform}. Using default configuration.`);
      // Copy environment files for other platforms
      copyEnvFile(path.join(frontendDir, 'env.development'), path.join(frontendDir, '.env'));
      copyEnvFile(path.join(backendDir, 'env.development'), path.join(backendDir, '.env'));
    }

    // Start development servers
    startDevServers(rootDir, platform);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

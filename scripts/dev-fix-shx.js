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

// Replace shx commands with Node.js native commands
function replaceShxCommands(frontendDir, backendDir) {
  console.log('🔧 Replacing shx commands with Node.js native commands...');
  
  // Replace frontend dev script
  const frontendPackagePath = path.join(frontendDir, 'package.json');
  if (fs.existsSync(frontendPackagePath)) {
    const frontendPackage = JSON.parse(fs.readFileSync(frontendPackagePath, 'utf8'));
    
    // Replace shx cp with Node.js copy
    if (frontendPackage.scripts.dev && frontendPackage.scripts.dev.includes('shx cp')) {
      frontendPackage.scripts.dev = frontendPackage.scripts.dev.replace(
        'shx cp env.development .env && vite',
        'node -e "require(\'fs\').copyFileSync(\'env.development\', \'.env\')" && vite'
      );
      fs.writeFileSync(frontendPackagePath, JSON.stringify(frontendPackage, null, 2));
      console.log('✅ Replaced frontend shx command');
    }
    
    if (frontendPackage.scripts.build && frontendPackage.scripts.build.includes('shx cp')) {
      frontendPackage.scripts.build = frontendPackage.scripts.build.replace(
        'shx cp env.production .env && tsc -b && vite build',
        'node -e "require(\'fs\').copyFileSync(\'env.production\', \'.env\')" && tsc -b && vite build'
      );
      fs.writeFileSync(frontendPackagePath, JSON.stringify(frontendPackage, null, 2));
      console.log('✅ Replaced frontend build shx command');
    }
  }
  
  // Replace backend dev script
  const backendPackagePath = path.join(backendDir, 'package.json');
  if (fs.existsSync(backendPackagePath)) {
    const backendPackage = JSON.parse(fs.readFileSync(backendPackagePath, 'utf8'));
    
    // Replace shx cp with Node.js copy
    if (backendPackage.scripts.dev && backendPackage.scripts.dev.includes('shx cp')) {
      backendPackage.scripts.dev = backendPackage.scripts.dev.replace(
        'shx cp env.development .env && nodemon server.js',
        'node -e "require(\'fs\').copyFileSync(\'env.development\', \'.env\')" && nodemon server.js'
      );
      fs.writeFileSync(backendPackagePath, JSON.stringify(backendPackage, null, 2));
      console.log('✅ Replaced backend dev shx command');
    }
    
    if (backendPackage.scripts.start && backendPackage.scripts.start.includes('shx cp')) {
      backendPackage.scripts.start = backendPackage.scripts.start.replace(
        'shx cp env.production .env && node server.js',
        'node -e "require(\'fs\').copyFileSync(\'env.production\', \'.env\')" && node server.js'
      );
      fs.writeFileSync(backendPackagePath, JSON.stringify(backendPackage, null, 2));
      console.log('✅ Replaced backend start shx command');
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
      console.log('🪟 Windows detected - setting up environment files...');
      
      // Copy environment files for frontend
      const frontendEnvSource = path.join(frontendDir, 'env.development');
      copyEnvFile(frontendEnvSource, path.join(frontendDir, '.env'));
      
      // Copy environment files for backend
      const backendEnvSource = path.join(backendDir, 'env.development');
      copyEnvFile(backendEnvSource, path.join(backendDir, '.env'));
      
      // Replace shx commands with Node.js native commands
      replaceShxCommands(frontendDir, backendDir);
    }

    // Start both servers using concurrently with Windows-compatible settings
    console.log('🚀 Starting development servers...');
    
    const concurrentlyArgs = [
      'concurrently',
      '--kill-others',
      '--prefix-colors', 'blue,green',
      '--prefix', '[{name}]',
      '--names', 'frontend,backend',
      'cd frontend && node -e "require(\'fs\').copyFileSync(\'env.development\', \'.env\')" && vite',
      'cd backend && node -e "require(\'fs\').copyFileSync(\'env.development\', \'.env\')" && nodemon server.js'
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

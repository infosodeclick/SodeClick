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
      shell: platform === 'win32' ? true : false
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

    // Copy environment files for cross-platform compatibility
    if (platform === 'darwin') {
      console.log('🍎 macOS detected - copying environment files...');
      const frontendEnvSource = path.join(frontendDir, 'env.development');
      const backendEnvSource = path.join(backendDir, 'env.development');
      
      copyEnvFile(frontendEnvSource, path.join(frontendDir, '.env'));
      copyEnvFile(backendEnvSource, path.join(backendDir, '.env'));
      
      // Fix permissions for shx binaries
      console.log('🔧 Fixing permissions for shx binaries...');
      try {
        const frontendShx = path.join(frontendDir, 'node_modules', '.bin', 'shx');
        const backendShx = path.join(backendDir, 'node_modules', '.bin', 'shx');
        
        if (fs.existsSync(frontendShx)) {
          fs.chmodSync(frontendShx, '755');
          console.log('✅ Fixed frontend shx permissions');
        }
        
        if (fs.existsSync(backendShx)) {
          fs.chmodSync(backendShx, '755');
          console.log('✅ Fixed backend shx permissions');
        }
      } catch (error) {
        console.warn('⚠️  Could not fix shx permissions:', error.message);
      }
      
      // Check for Rollup native module issues on ARM64
      if (os.arch() === 'arm64') {
        console.log('🔍 Checking for Rollup native module issues...');
        const rollupNativePath = path.join(frontendDir, 'node_modules', '@rollup', 'rollup-darwin-arm64');
        if (!fs.existsSync(rollupNativePath)) {
          console.log('⚠️  Rollup native module missing - this may cause issues');
          console.log('💡 Run "npm run fix-rollup" to fix this issue');
        } else {
          console.log('✅ Rollup native module found');
        }
      }
    } else if (platform === 'win32') {
      console.log('🪟 Windows detected - copying environment files...');
      const frontendEnvSource = path.join(frontendDir, 'env.development');
      const backendEnvSource = path.join(backendDir, 'env.development');
      
      copyEnvFile(frontendEnvSource, path.join(frontendDir, '.env'));
      copyEnvFile(backendEnvSource, path.join(backendDir, '.env'));
    }

    // Start both servers using concurrently
    console.log('🚀 Starting development servers...');
    
    // Use different approach for Windows
    if (platform === 'win32') {
      console.log('🪟 Windows detected - using windows-simple approach...');
      const windowsSimpleScript = path.join(rootDir, 'scripts', 'dev-windows-simple.js');
      if (fs.existsSync(windowsSimpleScript)) {
        require(windowsSimpleScript);
        return;
      }
    }
    
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
      shell: platform === 'win32' ? true : false,
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

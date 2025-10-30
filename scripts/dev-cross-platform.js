#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

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

// Function to check if concurrently is available
function checkConcurrently(rootDir) {
  const concurrentlyPath = path.join(rootDir, 'node_modules', '.bin', 'concurrently');
  const isWindows = process.platform === 'win32';
  const concurrentlyCmd = isWindows ? concurrentlyPath + '.cmd' : concurrentlyPath;
  return fs.existsSync(concurrentlyCmd) ? concurrentlyCmd : null;
}

async function main() {
  try {
    const rootDir = path.resolve(__dirname, '..');
    const frontendDir = path.join(rootDir, 'frontend');
    const backendDir = path.join(rootDir, 'backend');

    console.log('🚀 Starting development environment...\n');
    console.log(`Platform: ${os.platform()} (${os.arch()})\n`);

    // Check if directories exist
    if (!fs.existsSync(frontendDir)) {
      console.error('❌ Frontend directory not found');
      process.exit(1);
    }

    if (!fs.existsSync(backendDir)) {
      console.error('❌ Backend directory not found');
      process.exit(1);
    }

    // Copy environment files
    console.log('📝 Copying environment files...');
    copyEnvFile(path.join(frontendDir, 'env.development'), path.join(frontendDir, '.env'));
    copyEnvFile(path.join(backendDir, 'env.development'), path.join(backendDir, '.env'));

    // Check if concurrently is available
    const concurrentlyCmd = checkConcurrently(rootDir);
    
    if (concurrentlyCmd) {
      console.log('\n🚀 Starting servers with concurrently...');
      console.log('Backend will run on http://localhost:5000');
      console.log('Frontend will run on http://localhost:5173');
      console.log('Press Ctrl+C to stop all servers\n');
      
      // Use concurrently to start both servers
      const isWindows = process.platform === 'win32';
      const concurrently = spawn(concurrentlyCmd, [
        '-n', 'backend,frontend',
        '-c', 'blue,green',
        '"cd backend && npm run dev"',
        '"cd frontend && npm run dev"'
      ], {
        cwd: rootDir,
        stdio: 'inherit',
        shell: true
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

      concurrently.on('exit', (code) => {
        console.log(`\nDevelopment servers exited with code ${code}`);
        process.exit(code);
      });

      concurrently.on('error', (error) => {
        console.error('❌ Error starting concurrently:', error.message);
        process.exit(1);
      });
    } else {
      // Fallback: start servers sequentially if concurrently is not available
      console.log('\n⚠️  concurrently not found, starting servers sequentially...');
      console.log('Installing concurrently first...');
      
      const npm = spawn('npm', ['install', 'concurrently', '--save-dev'], {
        cwd: rootDir,
        stdio: 'inherit',
        shell: process.platform === 'win32'
      });

      npm.on('close', (code) => {
        if (code === 0) {
          console.log('✅ concurrently installed, restarting...');
          // Restart with concurrently
          main();
        } else {
          console.error('❌ Failed to install concurrently');
          process.exit(1);
        }
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();


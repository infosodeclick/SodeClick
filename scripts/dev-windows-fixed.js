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

// Function to spawn a process with better error handling
function spawnProcess(command, args, options, label) {
  console.log(`🚀 Starting ${label}...`);
  const proc = spawn(command, args, options);

  proc.stdout.on('data', (data) => {
    console.log(`[${label}] ${data.toString().trim()}`);
  });

  proc.stderr.on('data', (data) => {
    console.error(`[${label}] ${data.toString().trim()}`);
  });

  proc.on('error', (error) => {
    console.error(`❌ Error starting ${label}:`, error.message);
  });

  proc.on('exit', (code) => {
    console.log(`[${label}] Process exited with code ${code}`);
  });

  return proc;
}

async function main() {
  try {
    const rootDir = path.resolve(__dirname, '..');
    const frontendDir = path.join(rootDir, 'frontend');
    const backendDir = path.join(rootDir, 'backend');

    console.log('🪟 Starting Windows development environment...');
    console.log(`📁 Root directory: ${rootDir}`);
    console.log(`📁 Frontend directory: ${frontendDir}`);
    console.log(`📁 Backend directory: ${backendDir}`);

    // Check if directories exist
    if (!fs.existsSync(frontendDir)) {
      console.error('❌ Frontend directory not found!');
      process.exit(1);
    }
    if (!fs.existsSync(backendDir)) {
      console.error('❌ Backend directory not found!');
      process.exit(1);
    }

    // Copy environment files
    console.log('\n📝 Copying environment files...');
    copyEnvFile(path.join(frontendDir, 'env.development'), path.join(frontendDir, '.env'));
    copyEnvFile(path.join(backendDir, 'env.development'), path.join(backendDir, '.env'));

    console.log('\n🚀 Starting servers...\n');
    
    // Start backend server with better output handling
    const backend = spawnProcess('npm', ['run', 'dev'], {
      cwd: backendDir,
      shell: true,
      env: { ...process.env, FORCE_COLOR: '1' }
    }, 'Backend');

    // Wait a moment for backend to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Start frontend server with better output handling
    const frontend = spawnProcess('npm', ['run', 'dev'], {
      cwd: frontendDir,
      shell: true,
      env: { ...process.env, FORCE_COLOR: '1' }
    }, 'Frontend');

    console.log('\n✅ Development servers are starting...');
    console.log('Press Ctrl+C to stop both servers\n');

    // Handle process termination
    const cleanup = () => {
      console.log('\n\n🛑 Stopping development servers...');
      try {
        backend.kill('SIGINT');
        frontend.kill('SIGINT');
        setTimeout(() => {
          backend.kill('SIGKILL');
          frontend.kill('SIGKILL');
          process.exit(0);
        }, 2000);
      } catch (error) {
        console.error('Error during cleanup:', error.message);
        process.exit(1);
      }
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', cleanup);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

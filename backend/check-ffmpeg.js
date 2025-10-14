const { exec } = require('child_process');

console.log('🔍 Checking FFmpeg installation...\n');

// Check FFmpeg
exec('ffmpeg -version', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ FFmpeg is NOT installed or not in PATH');
    console.log('\n📝 Installation Instructions:\n');
    console.log('Windows (using Chocolatey):');
    console.log('  choco install ffmpeg\n');
    console.log('Windows (manual):');
    console.log('  1. Download from: https://www.gyan.dev/ffmpeg/builds/');
    console.log('  2. Extract to C:\\ffmpeg');
    console.log('  3. Add C:\\ffmpeg\\bin to system PATH\n');
    console.log('macOS:');
    console.log('  brew install ffmpeg\n');
    console.log('Linux (Ubuntu/Debian):');
    console.log('  sudo apt update && sudo apt install ffmpeg\n');
    console.log('Linux (CentOS/RHEL):');
    console.log('  sudo yum install ffmpeg\n');
    process.exit(1);
  }

  console.log('✅ FFmpeg is installed!\n');
  console.log('Version Info:');
  console.log(stdout.split('\n')[0]); // Show only the version line
  
  console.log('\n✅ System is ready for live streaming!');
  console.log('\n📺 Next steps:');
  console.log('1. Start the backend server: npm start');
  console.log('2. Create a live room in the frontend');
  console.log('3. Configure OBS Studio with RTMP settings');
  console.log('4. Start streaming from OBS');
  console.log('5. Watch the live stream in the frontend');
  
  process.exit(0);
});


const { spawn } = require('child_process');
const path = require('path');

// Test FFmpeg transcoding manually
console.log('🎬 Testing FFmpeg Transcoding...\n');

const ffmpegPath = 'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe';
const outputDir = path.join(__dirname, 'media', 'live');

// Create test command (similar to what Node Media Server should run)
const command = [
  '-i', 'rtmp://localhost:1935/live/test_stream',
  '-c:v', 'libx264',
  '-c:a', 'aac',
  '-f', 'hls',
  '-hls_time', '6',
  '-hls_list_size', '6',
  '-hls_flags', 'delete_segments',
  '-hls_segment_filename', path.join(outputDir, 'test_stream_%03d.ts'),
  path.join(outputDir, 'test_stream.m3u8')
];

console.log('🔧 FFmpeg Command:', ffmpegPath, command.join(' '));
console.log('📁 Output Directory:', outputDir);
console.log('⏳ This is just a test - press Ctrl+C to stop\n');

// Note: This won't actually work without a real RTMP stream
// But it will show if FFmpeg can be executed
const ffmpeg = spawn(ffmpegPath, command, {
  stdio: ['ignore', 'pipe', 'pipe']
});

ffmpeg.stdout.on('data', (data) => {
  console.log('FFmpeg stdout:', data.toString());
});

ffmpeg.stderr.on('data', (data) => {
  console.log('FFmpeg stderr:', data.toString());
});

ffmpeg.on('close', (code) => {
  console.log(`\n✅ FFmpeg process exited with code ${code}`);
});

ffmpeg.on('error', (error) => {
  console.error('❌ FFmpeg error:', error);
});

// Stop after 5 seconds
setTimeout(() => {
  console.log('\n⏹️  Stopping test...');
  ffmpeg.kill();
}, 5000);

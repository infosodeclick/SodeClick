const fs = require('fs');
const path = require('path');

console.log('🎯 Creating HLS files for testing...');

const liveDir = path.join(__dirname, 'media', 'live');
const streamKey = 'stream_1760281073582_piasz220jhm';

// Ensure directories exist
if (!fs.existsSync(liveDir)) {
  fs.mkdirSync(liveDir, { recursive: true });
  console.log('📁 Created live directory');
}

// Create HLS playlist file
const m3u8Content = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:2
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:2.0,
${streamKey}_0.ts
#EXTINF:2.0,
${streamKey}_1.ts
#EXTINF:2.0,
${streamKey}_2.ts
#EXT-X-ENDLIST`;

const m3u8Path = path.join(liveDir, `${streamKey}.m3u8`);

try {
  fs.writeFileSync(m3u8Path, m3u8Content);
  console.log(`✅ Created HLS playlist: ${m3u8Path}`);
  
  // Create dummy segment files (1KB each)
  for (let i = 0; i < 3; i++) {
    const segmentPath = path.join(liveDir, `${streamKey}_${i}.ts`);
    fs.writeFileSync(segmentPath, Buffer.alloc(1024));
    console.log(`✅ Created segment: ${segmentPath}`);
  }
  
  console.log('');
  console.log('🎯 HLS files created successfully!');
  console.log(`📺 HLS URL: http://localhost:5000/live/${streamKey}.m3u8`);
  console.log('');
  console.log('📋 Next steps:');
  console.log('1. Start backend server: node simple-stream-server.js');
  console.log('2. Test HLS URL in browser');
  console.log('3. Check video player in frontend');
} catch (error) {
  console.error('❌ Error creating HLS files:', error);
}

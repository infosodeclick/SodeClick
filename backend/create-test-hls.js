const fs = require('fs');
const path = require('path');

console.log('🧪 Creating test HLS files...');

const liveDir = path.join(__dirname, 'media', 'live');
const streamKey = 'stream_1760281073582_piasz220jhm';

// Create test .m3u8 file
const m3u8Content = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:2
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:2.0,
segment_0.ts
#EXTINF:2.0,
segment_1.ts
#EXTINF:2.0,
segment_2.ts
#EXT-X-ENDLIST`;

const m3u8Path = path.join(liveDir, `${streamKey}.m3u8`);

try {
  fs.writeFileSync(m3u8Path, m3u8Content);
  console.log(`✅ Created test HLS playlist: ${m3u8Path}`);
  
  // Create test segment files (empty for testing)
  for (let i = 0; i < 3; i++) {
    const segmentPath = path.join(liveDir, `${streamKey}_${i}.ts`);
    fs.writeFileSync(segmentPath, Buffer.alloc(1024)); // 1KB dummy file
    console.log(`✅ Created test segment: ${segmentPath}`);
  }
  
  console.log('🎯 Test HLS files created successfully!');
  console.log('📺 You can now test the HLS URL in your browser or video player');
  console.log(`📺 HLS URL: http://localhost:8000/live/${streamKey}.m3u8`);
} catch (error) {
  console.error('❌ Error creating test HLS files:', error);
}

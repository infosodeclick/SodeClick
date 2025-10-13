const express = require('express');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting Simple Stream Server...');

const app = express();
const PORT = 5000;
const mediaDir = path.join(__dirname, 'media');
const liveDir = path.join(mediaDir, 'live');

// Ensure directories exist
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
  console.log('📁 Created media directory');
}

if (!fs.existsSync(liveDir)) {
  fs.mkdirSync(liveDir, { recursive: true });
  console.log('📁 Created live directory');
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Simple Stream Server is running'
  });
});

// HLS files
app.use('/live', (req, res, next) => {
  if (req.path.endsWith('.m3u8')) {
    res.header('Content-Type', 'application/vnd.apple.mpegurl');
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  } else if (req.path.endsWith('.ts')) {
    res.header('Content-Type', 'video/mp2t');
    res.header('Cache-Control', 'public, max-age=60');
  }
  next();
}, express.static(liveDir));

// Stream API endpoints
app.get('/api/stream/all', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        _id: '68ebc1f17ba39783531c40a3',
        title: 'วัยวัย',
        description: '',
        streamKey: 'stream_1760281073582_piasz220jhm',
        isLive: true,
        viewers: [],
        viewerCount: 0,
        streamer: {
          _id: '68cc3ebdd785753a72d371c9',
          username: 'admin',
          displayName: 'Admin ระบบ'
        }
      }
    ]
  });
});

app.post('/api/stream/:id/start', (req, res) => {
  const { id } = req.params;
  console.log(`📺 Starting stream: ${id}`);
  
  // Create HLS files for testing
  const streamKey = 'stream_1760281073582_piasz220jhm';
  const m3u8Path = path.join(liveDir, `${streamKey}.m3u8`);
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

  try {
    fs.writeFileSync(m3u8Path, m3u8Content);
    console.log(`✅ Created HLS playlist: ${m3u8Path}`);
    
    // Create dummy segment files
    for (let i = 0; i < 3; i++) {
      const segmentPath = path.join(liveDir, `${streamKey}_${i}.ts`);
      fs.writeFileSync(segmentPath, Buffer.alloc(1024));
    }
    console.log(`✅ Created HLS segments for: ${streamKey}`);
    
    res.json({ success: true, message: 'Stream started successfully' });
  } catch (error) {
    console.error('❌ Error creating HLS files:', error);
    res.status(500).json({ success: false, message: 'Failed to start stream' });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log('🚀 ============================================');
  console.log(`🚀 Simple Stream Server running on port ${PORT}`);
  console.log(`📁 Media directory: ${mediaDir}`);
  console.log(`📁 Live directory: ${liveDir}`);
  console.log(`📺 HLS URL: http://localhost:${PORT}/live/`);
  console.log('🚀 ============================================');
});

const express = require('express');
const app = express();
const PORT = 5000;

console.log('🚀 Starting Test Server...');

app.use(express.json());

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
    message: 'Test Server is running',
    timestamp: new Date().toISOString()
  });
});

// Stream API
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

// Test HLS endpoint
app.get('/live/stream_1760281073582_piasz220jhm.m3u8', (req, res) => {
  const m3u8Content = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:2
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:2.0,
stream_1760281073582_piasz220jhm_0.ts
#EXTINF:2.0,
stream_1760281073582_piasz220jhm_1.ts
#EXTINF:2.0,
stream_1760281073582_piasz220jhm_2.ts
#EXT-X-ENDLIST`;

  res.header('Content-Type', 'application/vnd.apple.mpegurl');
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.send(m3u8Content);
});

app.listen(PORT, () => {
  console.log(`🚀 Test Server running on port ${PORT}`);
  console.log(`📺 HLS URL: http://localhost:${PORT}/live/stream_1760281073582_piasz220jhm.m3u8`);
});

const NodeMediaServer = require('node-media-server');
const path = require('path');
const fs = require('fs');

console.log('🧪 Testing OBS Connection...');

// Ensure media directory exists
const mediaDir = path.join(__dirname, 'media');
const liveDir = path.join(mediaDir, 'live');

if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
  console.log('📁 Created media directory');
}

if (!fs.existsSync(liveDir)) {
  fs.mkdirSync(liveDir, { recursive: true });
  console.log('📁 Created live directory');
}

const config = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8000,
    allow_origin: '*',
    mediaroot: mediaDir,
    cors: true
  },
  relay: {
    ffmpeg: 'ffmpeg',
    tasks: []
  }
};

console.log('📺 Config:', JSON.stringify(config, null, 2));

const nms = new NodeMediaServer(config);

// Event handlers
nms.on('preConnect', (id, args) => {
  console.log(`📺 RTMP Client connecting: ${id}`);
  console.log(`📺 Connection args:`, args);
});

nms.on('postConnect', (id, args) => {
  console.log(`📺 RTMP Client connected: ${id}`);
  console.log(`📺 Client info:`, args);
});

nms.on('doneConnect', (id, args) => {
  console.log(`📺 RTMP Client disconnected: ${id}`);
});

nms.on('prePublish', (id, StreamPath, args) => {
  console.log(`📺 RTMP Stream starting: ${StreamPath}`);
  console.log(`📺 Stream args:`, args);
});

nms.on('postPublish', (id, StreamPath, args) => {
  console.log(`📺 RTMP Stream started: ${StreamPath}`);
  console.log(`📺 Stream info:`, args);
  
  // Check if HLS file is created
  setTimeout(() => {
    const streamKey = StreamPath.split('/').pop();
    const m3u8Path = path.join(liveDir, `${streamKey}.m3u8`);
    if (fs.existsSync(m3u8Path)) {
      console.log(`✅ HLS file created: ${m3u8Path}`);
    } else {
      console.log(`❌ HLS file not found: ${m3u8Path}`);
    }
  }, 5000);
});

nms.on('donePublish', (id, StreamPath, args) => {
  console.log(`📺 RTMP Stream ended: ${StreamPath}`);
});

nms.on('error', (id, err) => {
  console.error(`📺 NodeMediaServer error:`, err);
});

try {
  nms.run();
  console.log('✅ RTMP Server started successfully');
  console.log('📺 RTMP Server: rtmp://localhost:1935/live');
  console.log('📺 HLS Server: http://localhost:8000/live');
  console.log('📁 Media directory:', mediaDir);
  console.log('');
  console.log('🎯 Now try connecting OBS with these settings:');
  console.log('   Service: Custom');
  console.log('   Server: rtmp://localhost:1935/live');
  console.log('   Stream Key: stream_1760278385030_plckcvnkces');
  console.log('');
  console.log('⏹️  Press Ctrl+C to stop');
} catch (error) {
  console.error(`❌ Failed to start RTMP Server:`, error);
}

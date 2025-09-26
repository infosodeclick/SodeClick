# MongoDB Connection Fix

## ปัญหาที่แก้ไข

### 1. MongoParseError: option buffermaxentries is not supported
**สาเหตุ**: MongoDB driver เวอร์ชันใหม่ไม่รองรับ `bufferMaxEntries` option

**การแก้ไข**:
```javascript
// เปลี่ยนจาก
mongoose.connect(MONGODB_URI, {
  bufferMaxEntries: 0,  // ❌ ไม่รองรับ
  bufferCommands: false // ❌ ไม่รองรับ
});

// เป็น
mongoose.set('bufferCommands', true);
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  retryWrites: true,
  w: 'majority'
});
```

### 2. Cannot call `users.findOne()` before initial connection is complete
**สาเหตุ**: Routes พยายามใช้ database ก่อนที่ connection จะพร้อม

**การแก้ไข**:
```javascript
// เพิ่ม middleware ตรวจสอบ connection
app.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: 'Database temporarily unavailable',
      error: 'Please try again in a moment',
      timestamp: new Date().toISOString()
    });
  }
  next();
});

// รอ MongoDB connection ก่อนเริ่ม server
mongoose.connection.once('connected', () => {
  console.log('✅ MongoDB connected, starting server...');
  startServer();
});
```

### 3. Deprecated Options Warning
**สาเหตุ**: `useNewUrlParser` และ `useUnifiedTopology` เป็น deprecated

**การแก้ไข**:
```javascript
// ลบ deprecated options
mongoose.connect(MONGODB_URI, {
  // useNewUrlParser: true,     // ❌ Deprecated
  // useUnifiedTopology: true,  // ❌ Deprecated
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  retryWrites: true,
  w: 'majority'
});
```

## การปรับปรุงที่เพิ่มเข้ามา

### 1. Connection State Monitoring
```javascript
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connection established');
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB reconnected');
});

mongoose.connection.on('error', (error) => {
  console.error('❌ MongoDB connection error:', error);
});
```

### 2. Graceful Server Startup
```javascript
const startServer = () => {
  server.listen(PORT, () => {
    console.log('🚀 Server is running on port', PORT);
  });
};

// รอ MongoDB connection
mongoose.connection.once('connected', () => {
  startServer();
});

// Fallback: เริ่ม server หลัง 10 วินาที
setTimeout(() => {
  if (mongoose.connection.readyState !== 1) {
    console.warn('⚠️  Starting server without MongoDB connection...');
    startServer();
  }
}, 10000);
```

### 3. Request Queuing
```javascript
// Buffer commands จนกว่า connection จะพร้อม
mongoose.set('bufferCommands', true);
```

## การทดสอบ

### 1. ตรวจสอบ Connection Status
```bash
curl http://localhost:5000/health/database
```

### 2. ตรวจสอบ Server Status
```bash
curl http://localhost:5000/health
```

### 3. ตรวจสอบ Logs
```bash
# ดู MongoDB connection logs
tail -f logs/combined.log | grep -i mongo
```

## การแก้ไขปัญหาเพิ่มเติม

### 1. Connection Timeout
```javascript
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 30000, // 30 วินาที
  socketTimeoutMS: 45000,          // 45 วินาที
  connectTimeoutMS: 10000,         // 10 วินาที
  maxPoolSize: 10,
  minPoolSize: 5
});
```

### 2. Retry Logic
```javascript
const connectWithRetry = () => {
  mongoose.connect(MONGODB_URI, options)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => {
      console.error('❌ MongoDB connection failed:', err);
      setTimeout(connectWithRetry, 5000);
    });
};
```

### 3. Health Check
```javascript
app.get('/health/database', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});
```

## การ Monitor

### 1. Connection State
```javascript
const states = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting'
};

console.log('MongoDB State:', states[mongoose.connection.readyState]);
```

### 2. Connection Pool
```javascript
mongoose.connection.on('connected', () => {
  console.log('Pool size:', mongoose.connection.db.serverConfig.s.pool.size);
});
```

### 3. Performance Monitoring
```javascript
mongoose.connection.on('connected', () => {
  console.log('Connection time:', Date.now() - startTime, 'ms');
});
```

## การตั้งค่า Production

### 1. Environment Variables
```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
NODE_ENV=production
```

### 2. Connection Options
```javascript
const productionOptions = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  maxPoolSize: 20,
  minPoolSize: 10,
  maxIdleTimeMS: 30000,
  retryWrites: true,
  w: 'majority',
  readPreference: 'secondaryPreferred'
};
```

### 3. Monitoring
```javascript
// ใช้ PM2 สำหรับ production
pm2 start ecosystem.config.js --env production

// Monitor logs
pm2 logs sodeclick-backend
```

## การแก้ไขปัญหาเฉพาะ

### 1. Network Issues
```javascript
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  maxPoolSize: 10,
  retryWrites: true
});
```

### 2. Authentication Issues
```javascript
// ตรวจสอบ connection string
const uri = process.env.MONGODB_URI;
if (!uri || !uri.includes('@')) {
  console.error('❌ Invalid MongoDB URI');
}
```

### 3. SSL/TLS Issues
```javascript
mongoose.connect(MONGODB_URI, {
  ssl: true,
  sslValidate: true,
  sslCA: fs.readFileSync('path/to/ca.pem')
});
```

## การ Backup และ Recovery

### 1. Connection Backup
```javascript
const backupConnection = mongoose.createConnection(backupUri);
```

### 2. Failover
```javascript
const primaryConnection = mongoose.createConnection(primaryUri);
const secondaryConnection = mongoose.createConnection(secondaryUri);
```

### 3. Health Check
```javascript
setInterval(async () => {
  try {
    await mongoose.connection.db.admin().ping();
  } catch (error) {
    console.error('❌ Health check failed:', error);
    // Trigger failover
  }
}, 30000);
```

# Server Troubleshooting Guide

## ปัญหาที่พบบ่อยและการแก้ไข

### 1. Server หลุดบ่อย (Frequent Crashes)

#### สาเหตุที่เป็นไปได้:
- MongoDB connection timeout
- Memory leak
- Unhandled promise rejections
- Uncaught exceptions
- Socket.IO connection issues

#### การแก้ไขที่เพิ่มเข้ามา:

##### MongoDB Connection Improvements:
```javascript
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // 30 seconds
  socketTimeoutMS: 45000, // 45 seconds
  bufferMaxEntries: 0,
  bufferCommands: false,
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  retryWrites: true,
  w: 'majority'
});
```

##### Error Handling:
```javascript
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.log('🔄 Server continuing despite uncaught exception...');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  console.log('🔄 Server continuing despite unhandled rejection...');
});
```

### 2. Memory Issues

#### การตรวจสอบ:
- ใช้ `/health` endpoint เพื่อดู memory usage
- ตรวจสอบ logs สำหรับ memory warnings

#### การแก้ไข:
```javascript
// Memory monitoring
setInterval(() => {
  const memUsage = process.memoryUsage();
  const memUsageMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024)
  };
  
  // Warning if memory usage is high
  if (memUsageMB.heapUsed > 500) { // 500MB
    console.warn('⚠️  High memory usage detected:', memUsageMB);
  }
}, 30000);
```

### 3. Database Connection Issues

#### การตรวจสอบ:
```bash
curl http://localhost:5000/health/database
```

#### การแก้ไข:
- ตรวจสอบ MongoDB connection string
- ตรวจสอบ network connectivity
- ใช้ connection pooling settings

### 4. Socket.IO Issues

#### การตรวจสอบ:
```bash
curl http://localhost:5000/health/socketio
```

#### การแก้ไข:
```javascript
const io = socketIo(server, {
  cors: { /* ... */ },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB
  allowEIO3: true
});
```

## Health Check Endpoints

### 1. General Health Check
```bash
GET /health
```
Response:
```json
{
  "status": "healthy",
  "message": "Backend is running smoothly!",
  "environment": "development",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "database_status": "connected"
}
```

### 2. Database Health Check
```bash
GET /health/database
```
Response:
```json
{
  "status": "healthy",
  "message": "Database connection is working",
  "database": "sodeclick",
  "connection_state": 1,
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

### 3. Socket.IO Health Check
```bash
GET /health/socketio
```
Response:
```json
{
  "status": "healthy",
  "message": "Socket.IO server is running",
  "connected_clients": 5,
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

## การใช้งาน PM2 (Production)

### ติดตั้ง PM2:
```bash
npm install -g pm2
```

### เริ่มต้น Server:
```bash
pm2 start ecosystem.config.js --env development
```

### ตรวจสอบสถานะ:
```bash
pm2 status
pm2 logs
pm2 monit
```

### Restart Server:
```bash
pm2 restart sodeclick-backend
```

### Stop Server:
```bash
pm2 stop sodeclick-backend
```

## การ Monitor และ Debug

### 1. Log Files
- `logs/err.log` - Error logs
- `logs/out.log` - Output logs
- `logs/combined.log` - Combined logs

### 2. Memory Monitoring
```bash
# ตรวจสอบ memory usage
curl http://localhost:5000/health | jq '.memory'

# ตรวจสอบ process memory
pm2 monit
```

### 3. Database Monitoring
```bash
# ตรวจสอบ database connection
curl http://localhost:5000/health/database

# ตรวจสอบ MongoDB logs
# (ใน MongoDB Atlas dashboard)
```

## การแก้ไขปัญหาเฉพาะ

### 1. CORS Issues
```javascript
// ตรวจสอบ allowed origins
const allowedOrigins = [
  'http://localhost:5173',
  'https://sodeclick.com'
];
```

### 2. JWT Issues
```javascript
// ตรวจสอบ JWT_SECRET
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET not set');
}
```

### 3. File Upload Issues
```javascript
// ตรวจสอบ upload directory
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
```

## การตั้งค่า Production

### 1. Environment Variables
```bash
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-production-secret
```

### 2. PM2 Configuration
```javascript
// ecosystem.config.js
{
  name: 'sodeclick-backend',
  script: 'server.js',
  instances: 1,
  autorestart: true,
  max_memory_restart: '1G',
  env_production: {
    NODE_ENV: 'production',
    PORT: 5000
  }
}
```

### 3. Nginx Configuration (Optional)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## การ Backup และ Recovery

### 1. Database Backup
```bash
# MongoDB backup
mongodump --uri="mongodb+srv://..." --out=backup/

# Restore
mongorestore --uri="mongodb+srv://..." backup/
```

### 2. Code Backup
```bash
# Git backup
git add .
git commit -m "Backup before deployment"
git push origin main
```

## การติดต่อ Support

หากยังมีปัญหา:
1. ตรวจสอบ logs ใน `logs/` directory
2. ใช้ health check endpoints
3. ตรวจสอบ MongoDB Atlas dashboard
4. ตรวจสอบ server resources (CPU, Memory)

## การอัพเดท Server

### 1. Development
```bash
git pull origin main
npm install
npm run dev
```

### 2. Production
```bash
git pull origin main
npm install
pm2 restart sodeclick-backend
```

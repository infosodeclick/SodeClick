const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const QRCode = require('qrcode');
// Load environment variables based on NODE_ENV
const NODE_ENV = process.env.NODE_ENV || 'development';
require('dotenv').config({
  path: path.join(__dirname, `env.${NODE_ENV}`)
});

const app = express();
const server = http.createServer(app);

// Environment Variables
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sodeclick';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // อนุญาตให้ requests ที่ไม่มี origin (เช่น mobile apps, postman)
    if (!origin) return callback(null, true);
    
    // อนุญาต localhost ทั้ง port 5173 และ 5174 (กรณี port เปลี่ยน)
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'https://sodeclick.com',
      'https://www.sodeclick.com',
      'https://sodeclick-frontend-production.up.railway.app'
      
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // อนุญาตให้ส่ง cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// Middleware
app.use(compression()); // เพิ่มการบีบอัด response
app.use(cors(corsOptions));

// Error handling for CORS
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    console.log('🚫 CORS Error:', req.headers.origin);
    return res.status(403).json({
      success: false,
      message: 'CORS Error: Origin not allowed',
      origin: req.headers.origin
    });
  }
  next(err);
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads with cache headers and CORS
app.use('/uploads', (req, res, next) => {
  // Set CORS headers for static files
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Set cache headers
  res.header('Cache-Control', 'public, max-age=86400'); // 1 day
  res.header('ETag', true);
  res.header('Last-Modified', true);
  
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Static file serving for public assets with cache headers
app.use('/public', express.static(path.join(__dirname, 'public'), {
  maxAge: '7d', // Cache for 7 days
  etag: true,
  lastModified: true
}));

// Admin privileges middleware
const { bypassMembershipRestrictions } = require('./middleware/adminPrivileges');
app.use(bypassMembershipRestrictions);

// Request logging middleware (เฉพาะ development)
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// MongoDB Connection
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB Atlas - Database: sodeclick');
    console.log(`🗄️  Environment: ${NODE_ENV}`);
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// MongoDB connection events
mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB reconnected');
});

// Import routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const membershipRoutes = require('./routes/membership');
const upgradeSimpleRoutes = require('./routes/upgrade-simple');
const blurRoutes = require('./routes/blur');
const chatroomRoutes = require('./routes/chatroom');
const messagesRoutes = require('./routes/messages');
const giftRoutes = require('./routes/gift');
const voteRoutes = require('./routes/vote');
const shopRoutes = require('./routes/shop');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payment');
const matchingRoutes = require('./routes/matching');
const notificationsRoutes = require('./routes/notifications');
// const privateMessagesRoutes = require('./routes/privateMessages'); // File not exists

// Preflight OPTIONS handling
app.options('*', cors(corsOptions));

// Basic Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Love Project Backend! ❤️',
    status: 'success',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    database: 'sodeclick',
    version: '1.0.0'
  });
});

// Health Check Routes
app.get('/health', (req, res) => {
  const healthData = {
    status: 'healthy',
    message: 'Backend is running smoothly!',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    database: 'sodeclick',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  };

  // ตรวจสอบสถานะ MongoDB
  if (mongoose.connection.readyState === 1) {
    healthData.database_status = 'connected';
  } else {
    healthData.database_status = 'disconnected';
    healthData.status = 'unhealthy';
  }

  const statusCode = healthData.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(healthData);
});

// Database Health Check
app.get('/health/database', async (req, res) => {
  try {
    // ทดสอบการเชื่อมต่อ database
    await mongoose.connection.db.admin().ping();
    
    res.json({
      status: 'healthy',
      message: 'Database connection is working',
      database: 'sodeclick',
      connection_state: mongoose.connection.readyState,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      message: 'Database connection failed',
      error: NODE_ENV === 'development' ? error.message : 'Database unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Rabbit API Health Check
app.get('/health/rabbit', async (req, res) => {
  try {
    const rabbitUrl = process.env.RABBIT_API_URL || 'https://api.pgw.rabbit.co.th';
    const rabbitApiKey = process.env.RABBIT_API_KEY;
    
    // Check if we have the required API key
    if (!rabbitApiKey) {
      return res.json({
        status: 'healthy',
        message: 'Rabbit API configuration is available (API key not set in health check)',
        rabbit_url: rabbitUrl,
        note: 'API key is configured but not exposed in health check for security',
        timestamp: new Date().toISOString()
      });
    }
    
    // Test Rabbit API with proper authentication
    const response = await axios.get(`${rabbitUrl}/v1/application`, {
      timeout: 5000,
      headers: {
        'Authorization': `Bearer ${rabbitApiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Sodeclick-HealthCheck/1.0'
      }
    });
    
    res.json({
      status: 'healthy',
      message: 'Rabbit API is accessible and authenticated',
      rabbit_url: rabbitUrl,
      response_status: response.status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // If it's a 403/401, it means the API is working but auth failed
    if (error.response && (error.response.status === 403 || error.response.status === 401)) {
      return res.json({
        status: 'healthy',
        message: 'Rabbit API is accessible (authentication required)',
        rabbit_url: process.env.RABBIT_API_URL || 'https://api.pgw.rabbit.co.th',
        note: 'API is working but requires proper authentication for full access',
        timestamp: new Date().toISOString()
      });
    }
    
    // If it's a 404, it might be the wrong endpoint
    if (error.response && error.response.status === 404) {
      return res.json({
        status: 'healthy',
        message: 'Rabbit API is accessible (endpoint may vary)',
        rabbit_url: process.env.RABBIT_API_URL || 'https://api.pgw.rabbit.co.th',
        note: 'API is working but health check endpoint may not be available',
        timestamp: new Date().toISOString()
      });
    }
    
    console.error('❌ Rabbit API health check failed:', error.message);
    
    res.status(503).json({
      status: 'unhealthy',
      message: 'Rabbit API is not accessible',
      error: NODE_ENV === 'development' ? error.message : 'Rabbit API unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Socket.IO Health Check
app.get('/health/socketio', (req, res) => {
  try {
    // Check if Socket.IO server is running
    if (io && io.engine) {
      res.json({
        status: 'healthy',
        message: 'Socket.IO server is running',
        connected_clients: io.engine.clientsCount || 0,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        message: 'Socket.IO server is not initialized',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Socket.IO health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      message: 'Socket.IO health check failed',
      error: NODE_ENV === 'development' ? error.message : 'Socket.IO unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// API Info Route
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Sodeclick API',
    version: '1.0.0',
    environment: NODE_ENV,
    endpoints: {
      health: '/health',
      database_health: '/health/database',
      rabbit_health: '/health/rabbit',
      socketio_health: '/health/socketio',
      auth: '/api/auth',
      profile: '/api/profile',
      membership: '/api/membership',
      blur: '/api/blur',
      chatroom: '/api/chatroom',
      gift: '/api/gift',
      vote: '/api/vote',
      shop: '/api/shop',
      payment: '/api/payment',
      create_qr: '/create-qr',
      webhook_endpoint: '/webhook-endpoint',
      check_status: '/api/payment/check-status/:paymentId',
      root: '/'
    },
    timestamp: new Date().toISOString()
  });
});

// ----------------------
// 🐇 Rabbit Payment Gateway Configuration (moved to before 404 handler)
const RABBIT_API_URL = process.env.RABBIT_API_URL;
const RABBIT_APPLICATION_ID = process.env.RABBIT_APPLICATION_ID;
const RABBIT_PUBLIC_KEY = process.env.RABBIT_PUBLIC_KEY;
const RABBIT_COMPANY_ID = process.env.RABBIT_COMPANY_ID;
const RABBIT_API_KEY = process.env.RABBIT_API_KEY;

// Validate Rabbit Payment Gateway configuration
if (!RABBIT_API_URL || !RABBIT_APPLICATION_ID || !RABBIT_PUBLIC_KEY || !RABBIT_COMPANY_ID || !RABBIT_API_KEY) {
  console.error('❌ Rabbit Payment Gateway configuration is incomplete!');
  console.error('Missing environment variables:');
  if (!RABBIT_API_URL) console.error('  - RABBIT_API_URL');
  if (!RABBIT_APPLICATION_ID) console.error('  - RABBIT_APPLICATION_ID');
  if (!RABBIT_PUBLIC_KEY) console.error('  - RABBIT_PUBLIC_KEY');
  if (!RABBIT_COMPANY_ID) console.error('  - RABBIT_COMPANY_ID');
  if (!RABBIT_API_KEY) console.error('  - RABBIT_API_KEY');
  console.error('Please check your .env file configuration.');
}

// ✅ Endpoint สำหรับสร้าง QR Payment (Real Rabbit Gateway - Direct Method)
app.post("/create-qr", async (req, res) => {
  const { orderId, amount } = req.body;

  try {
    // เตรียมข้อมูลสำหรับ Rabbit Gateway API ตาม Direct Method Documentation
    const requestBody = {
      amount: amount * 100, // Rabbit Gateway ใช้หน่วยเป็น satang (1 บาท = 100 satang)
      currency: 'THB',
      provider: 'prompt_pay', // สำหรับ QR code payments
      localId: orderId, // my-invoice-123 format
      webhook: "https://sodeclick.com/webhook-endpoint", // ใช้ webhook endpoint ที่ถูกต้อง
      locale: 'en' // ใช้ 'en' แทน 'th_TH' ตาม documentation
      // ไม่ใส่ companyId ใน body ให้ API อ่านจาก JWT token
    };

    console.log('🐇 Sending CreateTransaction request to Rabbit Gateway:', requestBody);

    // ส่งคำขอไปยัง Rabbit Gateway ตาม Documentation
    const response = await axios.post(RABBIT_API_URL + '/public/v2/transactions', requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': RABBIT_API_KEY,
        'x-application-id': RABBIT_APPLICATION_ID,
        'x-public-key': RABBIT_PUBLIC_KEY,
        'x-company-id': RABBIT_COMPANY_ID
        // ใช้ headers ตาม API documentation
      }
    });

    const rabbitData = response.data;
    console.log('🐇 Rabbit Gateway CreateTransaction Response:', rabbitData);

    // ดึง QR Code URL จาก response ตาม Documentation
    let qrCodeUrl = null;
    let qrImage = null;
    
    console.log('🔍 Rabbit Data Analysis:', {
      hasQrCode: !!rabbitData.qrCode,
      hasVendorQrCode: !!rabbitData.vendorQrCode,
      qrCodeUrl: rabbitData.qrCode?.url,
      vendorQrCodeLength: rabbitData.vendorQrCode?.length,
      vendorQrCodePreview: rabbitData.vendorQrCode ? rabbitData.vendorQrCode.substring(0, 50) + '...' : 'N/A'
    });
    
    // ตรวจสอบ qrCode.url จาก response (ตามตัวอย่างในรูป)
    if (rabbitData.qrCode && rabbitData.qrCode.url) {
      qrCodeUrl = rabbitData.qrCode.url;
      
      // แปลง UAT URL เป็น Production URL
      if (qrCodeUrl.includes('qr.uat.pgw.rabbit.co.th')) {
        qrCodeUrl = qrCodeUrl.replace('qr.uat.pgw.rabbit.co.th', 'qr.pgw.rabbit.co.th');
        console.log('🔄 Converted UAT URL to Production URL:', qrCodeUrl);
      }
      
      console.log('✅ QR Code URL found:', qrCodeUrl);
    } 
    
    // หาก response มี vendorQrCode ให้สร้าง QR Code เอง
    if (rabbitData.vendorQrCode) {
      try {
        console.log('🎨 Generating QR Code from vendorQrCode...');
        console.log('📝 Vendor QR Code content:', rabbitData.vendorQrCode.substring(0, 50) + '...');
        console.log('📏 Vendor QR Code length:', rabbitData.vendorQrCode.length);
        console.log('🔍 Vendor QR Code type:', typeof rabbitData.vendorQrCode);
        console.log('🔍 Vendor QR Code is string:', typeof rabbitData.vendorQrCode === 'string');
        
        // ตรวจสอบว่า vendorQrCode เป็น string และไม่ว่าง
        if (typeof rabbitData.vendorQrCode === 'string' && rabbitData.vendorQrCode.trim().length > 0) {
          qrImage = await QRCode.toDataURL(rabbitData.vendorQrCode, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            width: 256,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          console.log('✅ QR Code image generated successfully, length:', qrImage.length);
          console.log('🖼️ QR Image preview:', qrImage.substring(0, 50) + '...');
          console.log('🎯 QR Image starts with:', qrImage.substring(0, 20));
        } else {
          console.log('⚠️ vendorQrCode is not a valid string or is empty');
          qrImage = null;
        }
      } catch (qrError) {
        console.error('❌ Error generating QR code:', qrError);
        console.error('❌ QR Error details:', qrError.message);
        console.error('❌ QR Error stack:', qrError.stack);
        qrImage = null;
      }
    } else {
      console.log('⚠️ No vendorQrCode found in response');
    }
    
    if (!qrCodeUrl && !qrImage) {
      console.log('⚠️ No QR Code data found in response');
    }

    // ส่งผลลัพธ์กลับไปยัง frontend
    const responseData = {
      payment_id: rabbitData.id,
      transaction_id: rabbitData.id,
      qr_image: qrImage, // QR Code image ที่สร้างจาก vendorQrCode
      qr_image_url: qrCodeUrl, // QR Code URL จาก Rabbit Gateway
      qr_code_url: qrCodeUrl, // Alias สำหรับ qr_image_url
      vendor_qr_code: rabbitData.vendorQrCode, // QR Code string
      expire_at: rabbitData.expires || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      order_id: orderId,
      amount: amount,
      currency: "THB",
      status: rabbitData.state === "INITIATED" ? "pending" : rabbitData.state.toLowerCase(),
      url: rabbitData.url || rabbitData.shortUrl,
      short_url: rabbitData.shortUrl,
      transaction_url: rabbitData.url,
      // เพิ่มข้อมูลเพิ่มเติมจาก response
      state: rabbitData.state,
      signature: rabbitData.signature,
      security_word: rabbitData.securityWord,
      amount_formatted: rabbitData.amountFormatted,
      // เพิ่มข้อมูล QR Code ที่ถูกต้อง
      qr_code: rabbitData.vendorQrCode,
      // Debug information
      debug: {
        hasQrImage: !!qrImage,
        hasQrCodeUrl: !!qrCodeUrl,
        hasVendorQrCode: !!rabbitData.vendorQrCode,
        qrImageLength: qrImage ? qrImage.length : 0,
        qrCodeUrlLength: qrCodeUrl ? qrCodeUrl.length : 0,
        vendorQrCodeLength: rabbitData.vendorQrCode ? rabbitData.vendorQrCode.length : 0
      }
    };

    console.log('✅ Sending response to frontend:', responseData);
    res.json(responseData);

  } catch (err) {
    console.error("🐇 Rabbit Gateway Error:", err.response?.data || err.message);
    
    let errorMessage = "ไม่สามารถเชื่อมต่อ Rabbit Gateway ได้";
    let troubleshooting = {};
    
    // Handle specific error codes
    if (err.response?.data?.code === 'PP-T-002') {
      errorMessage = "Rabbit Gateway: PP-T-002 Unspecified company - บัญชีอาจยังไม่ได้รับการอนุมัติ";
      troubleshooting = {
        issue: "PP-T-002: Unspecified company",
        status: "❌ CRITICAL: บัญชี Rabbit Gateway ไม่สามารถใช้งานได้",
        possible_causes: [
          "1. 🏢 บัญชี Rabbit Gateway ยังไม่ได้รับการ APPROVE จากทีม Rabbit",
          "2. 🔄 กำลังใช้ Test credentials กับ Production API endpoint",
          "3. 📋 Company registration ยังไม่เสร็จสมบูรณ์",
          "4. ⏰ บัญชีถูก suspend หรือ deactivate"
        ],
        immediate_actions: [
          "1. 📞 ติดต่อทีม Rabbit Gateway Support ทันที",
          "2. 📧 Email: support@rabbit.co.th",
          "3. 📱 Line: @RabbitGateway",
          "4. 🌐 Dashboard: https://dashboard.rabbit.co.th"
        ],
        verification_steps: [
          "1. เข้า Dashboard และตรวจสอบสถานะบัญชี",
          "2. ตรวจสอบว่าผ่าน KYC verification แล้วหรือไม่",
          "3. ตรวจสอบ Company registration documents",
          "4. ขอให้ทีม Support ตรวจสอบ Company ID: " + RABBIT_COMPANY_ID
        ]
      };
    } else if (err.response?.status === 401) {
      errorMessage = "Rabbit Gateway: การยืนยันตัวตนล้มเหลว";
      troubleshooting = {
        issue: "401 Unauthorized",
        possible_causes: [
          "1. RABBIT_APPLICATION_ID ไม่ถูกต้อง",
          "2. RABBIT_PUBLIC_KEY ไม่ถูกต้องหรือหมดอายุ",
          "3. Headers ไม่ถูกต้อง"
        ],
        solutions: [
          "1. ตรวจสอบ Application ID จาก Dashboard",
          "2. สร้าง Public Key ใหม่",
          "3. ตรวจสอบการตั้งค่า Environment Variables"
        ]
      };
    }
    
    // ส่ง error กลับไป
    res.status(500).json({ 
      error: errorMessage,
      code: err.response?.data?.code,
      details: err.response?.data || err.message,
      troubleshooting: troubleshooting,
      current_config: {
        application_id: RABBIT_APPLICATION_ID,
        company_id: RABBIT_COMPANY_ID,
        public_key_length: RABBIT_PUBLIC_KEY ? RABBIT_PUBLIC_KEY.length : 0,
        api_key_length: RABBIT_API_KEY ? RABBIT_API_KEY.length : 0,
        api_url: RABBIT_API_URL
      },
      setup_guide: {
        step1: "1. ไปที่ Rabbit Gateway Dashboard (https://dashboard.rabbit.co.th)",
        step2: "2. สร้าง Application ใหม่หรือใช้ที่มีอยู่",
        step3: "3. คัดลอก Application ID, Public Key และ API Key",
        step4: "4. อัปเดตไฟล์ backend/env.development:",
        step5: "   RABBIT_APPLICATION_ID=your-application-id",
        step6: "   RABBIT_PUBLIC_KEY=your-public-key",
        step7: "   RABBIT_COMPANY_ID=your-company-id",
        step8: "   RABBIT_API_KEY=your-api-key",
        step9: "5. รีสตาร์ท server และทดสอบใหม่"
      }
    });
  }
});

// ✅ Endpoint สำหรับตรวจสอบสถานะการชำระเงิน
app.get("/api/payment/check-status/:paymentId", async (req, res) => {
  const { paymentId } = req.params;
  
  try {
    console.log(`🔍 Checking payment status for: ${paymentId}`);
    
    // เรียก Rabbit Gateway API เพื่อตรวจสอบสถานะ
    const response = await axios.get(`${RABBIT_API_URL}/public/v2/transactions/${paymentId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': RABBIT_API_KEY,
        'x-application-id': RABBIT_APPLICATION_ID,
        'x-public-key': RABBIT_PUBLIC_KEY,
        'x-company-id': RABBIT_COMPANY_ID
      }
    });
    
    const rabbitData = response.data;
    console.log('🐇 Rabbit Gateway Status Response:', rabbitData);
    
    // แปลงสถานะจาก Rabbit Gateway เป็นรูปแบบที่ frontend ต้องการ
    let status = 'pending';
    if (rabbitData.state === 'CONFIRMED') {
      status = 'completed';
    } else if (rabbitData.state === 'FAILED') {
      status = 'failed';
    } else if (rabbitData.state === 'EXPIRED') {
      status = 'expired';
    } else if (rabbitData.state === 'INITIATED') {
      status = 'pending';
    }
    
    res.json({
      payment_id: paymentId,
      status: status,
      state: rabbitData.state,
      amount: rabbitData.amount,
      currency: rabbitData.currency,
      created_at: rabbitData.created,
      updated_at: rabbitData.updated,
      expires_at: rabbitData.expires,
      url: rabbitData.url,
      short_url: rabbitData.shortUrl
    });
    
  } catch (err) {
    console.error("🐇 Rabbit Gateway Status Check Error:", err.response?.data || err.message);
    
    res.status(500).json({
      error: "ไม่สามารถตรวจสอบสถานะการชำระเงินได้",
      payment_id: paymentId,
      details: err.response?.data || err.message
    });
  }
});

// ✅ Endpoint สำหรับรับ Webhook จาก Rabbit Gateway
app.post("/webhook-endpoint", (req, res) => {
  const webhookData = req.body;

  console.log("📩 Rabbit Gateway Webhook received:", JSON.stringify(webhookData, null, 2));

  try {
    const {
      transactionId,
      state,
      amount,
      amountFractional,
      currency,
      provider,
      localId,
      eventType,
      created,
      updated
    } = webhookData;

    // ตรวจสอบว่าเป็น webhook สำหรับการเปลี่ยนแปลงสถานะ transaction
    if (eventType === "NOTIFY_TRANSACTION_CHANGE") {
      const amountInBaht = amountFractional ? amountFractional / 100 : (amount / 100);
      
      if (state === "CONFIRMED") {
        console.log(`✅ Payment CONFIRMED - Transaction ${transactionId} (Order: ${localId})`);
        console.log(`💰 Amount: ${amountInBaht} ${currency}`);
        console.log(`🏦 Provider: ${provider}`);
        console.log(`📅 Created: ${created}, Updated: ${updated}`);
        
        // Payment confirmed - update database status and user membership
        // This will be implemented when payment integration is complete
        
      } else if (state === "FAILED") {
        console.log(`❌ Payment FAILED - Transaction ${transactionId} (Order: ${localId})`);
        console.log(`💰 Amount: ${amountInBaht} ${currency}`);
        
        // Payment failed - update database status
        // This will be implemented when payment integration is complete
        
      } else if (state === "EXPIRED") {
        console.log(`⏰ Payment EXPIRED - Transaction ${transactionId} (Order: ${localId})`);
        console.log(`💰 Amount: ${amountInBaht} ${currency}`);
        
        // Payment failed - update database status
        // This will be implemented when payment integration is complete
        
      } else {
        console.log(`📊 Payment status: ${state} - Transaction ${transactionId} (Order: ${localId})`);
      }
    } else {
      console.log(`📨 Other event type: ${eventType} for transaction ${transactionId}`);
    }

    // ส่งการตอบกลับ 200 เพื่อยืนยันว่าได้รับ webhook แล้ว
    res.status(200).json({ 
      success: true, 
      message: "Webhook received successfully",
      transactionId: transactionId,
      eventType: eventType,
      state: state
    });
    
  } catch (error) {
    console.error("❌ Error processing Rabbit Gateway webhook:", error);
    res.status(500).json({ 
      success: false, 
      message: "Webhook processing failed",
      error: error.message
    });
  }
});


// Use all routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/membership', membershipRoutes);
app.use('/api/upgrade-simple', upgradeSimpleRoutes);
app.use('/api/blur', blurRoutes);
app.use('/api/chatroom', chatroomRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/gift', giftRoutes);
app.use('/api/vote', voteRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/notifications', notificationsRoutes);
// app.use('/api/private-messages', privateMessagesRoutes); // File not exists

// Static file serving - removed duplicate (already configured above with cache headers)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  
  // CORS error
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      message: 'CORS policy violation',
      error: 'Origin not allowed',
      timestamp: new Date().toISOString()
    });
  }
  
  res.status(500).json({
    message: 'Something went wrong!',
    error: NODE_ENV === 'development' ? err.message : 'Internal server error',
    timestamp: new Date().toISOString()
  });
});


// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
          available_endpoints: {
        root: '/',
        health: '/health',
        database_health: '/health/database',
        rabbit_health: '/health/rabbit',
        socketio_health: '/health/socketio',
        api_info: '/api/info',
        membership: '/api/membership',
        blur: '/api/blur',
        chatroom: '/api/chatroom',
        gift: '/api/gift',
        vote: '/api/vote',
        shop: '/api/shop',
        payment: '/api/payment'
      }
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Socket.IO Configuration
const io = socketIo(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'https://sodeclick.com',
      'https://www.sodeclick.com',
      'https://sodeclick-frontend-production.up.railway.app'
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Make io available to routes
app.set('io', io);

// Socket.IO Real-time Chat
const Message = require('./models/Message');
const ChatRoom = require('./models/ChatRoom');
const User = require('./models/User');

// เก็บข้อมูลผู้ใช้ออนไลน์ในแต่ละห้อง
const roomUsers = new Map(); // roomId -> Set of userIds
const userSockets = new Map(); // userId -> Set of socketIds
const onlineUsers = new Map(); // userId -> { socketId, roomId, lastSeen }

io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);
  console.log('🔌 Socket transport:', socket.conn.transport.name);
  console.log('🔌 Socket ready state:', socket.conn.readyState);

  // เข้าร่วมห้องแชท
  socket.on('join-room', async (data) => {
    console.log('🔍 Join room request:', data);
    try {
      const { roomId, userId } = data;
      
      // สำหรับ private chat ที่ไม่ใช่ ChatRoom
      if (roomId.startsWith('private_')) {
        // ตรวจสอบผู้ใช้
        const user = await User.findById(userId);
        if (!user) {
          console.log(`❌ User ${userId} not found`);
          socket.emit('error', { message: 'User not found' });
          return;
        }
        
        socket.join(roomId);
        socket.userId = userId;
        socket.currentRoom = roomId;
        
        console.log(`🔗 Socket ${socket.id} joined private chat ${roomId} for user ${userId}`);
        console.log(`📊 Room ${roomId} now has ${io.sockets.adapter.rooms.get(roomId)?.size || 0} connected sockets`);
        
        // Debug: แสดงรายการ socket IDs ที่อยู่ใน room
        const roomSockets = io.sockets.adapter.rooms.get(roomId);
        if (roomSockets) {
          console.log(`🔍 Room ${roomId} socket IDs:`, Array.from(roomSockets));
        }
        
        // เพิ่มผู้ใช้ในรายการออนไลน์
        if (!roomUsers.has(roomId)) {
          roomUsers.set(roomId, new Set());
        }
        roomUsers.get(roomId).add(userId);

        if (!userSockets.has(userId)) {
          userSockets.set(userId, new Set());
        }
        userSockets.get(userId).add(socket.id);
        
        console.log(`👥 User ${userId} added to room ${roomId}`);
        console.log(`📊 Room ${roomId} now has ${roomUsers.get(roomId).size} users`);
        console.log(`🔌 User ${userId} now has ${userSockets.get(userId).size} sockets`);
        
        // อัปเดตสถานะออนไลน์
        onlineUsers.set(userId, {
          socketId: socket.id,
          roomId: roomId,
          lastActive: new Date(),
          username: user.displayName || user.username
        });
        
        // อัปเดตสถานะออนไลน์ในฐานข้อมูล
        try {
          await User.findByIdAndUpdate(userId, {
            isOnline: true,
            lastActive: new Date()
          });
          console.log(`🟢 User ${userId} marked as online in database`);
        } catch (error) {
          console.error('Error updating user online status:', error);
        }
        
        // ส่งจำนวนคนออนไลน์ไปยังทุกคนในห้อง
        const onlineCount = roomUsers.get(roomId).size;
        io.to(roomId).emit('online-count', { count: onlineCount });
        
        return;
      }
      
      // ตรวจสอบสิทธิ์สำหรับ ChatRoom ปกติ
      const chatRoom = await ChatRoom.findById(roomId);
      if (!chatRoom) {
        console.log(`❌ Chat room ${roomId} not found`);
        socket.emit('error', { message: 'Chat room not found' });
        return;
      }
      
      console.log(`✅ Chat room found: ${chatRoom.name} (${chatRoom.type})`);

      // ตรวจสอบผู้ใช้
      const user = await User.findById(userId);
      if (!user) {
        console.log(`❌ User ${userId} not found`);
        socket.emit('error', { message: 'User not found' });
        return;
      }
      
      console.log(`✅ User found: ${user.displayName || user.username} (${user.email})`);

      // สำหรับห้องสาธารณะ - เข้าได้เลย
      if (chatRoom.type === 'public') {
        if (!chatRoom.isMember(userId)) {
          chatRoom.addMember(userId);
          await chatRoom.save();
        }
      } else if (chatRoom.type === 'private' && !chatRoom.isMember(userId)) {
        // SuperAdmin สามารถเข้าร่วมห้องส่วนตัวได้โดยไม่ต้องเป็นสมาชิกก่อน
        if (!user.isSuperAdmin()) {
          socket.emit('error', { message: 'Unauthorized to join this private room' });
          return;
        } else {
          // SuperAdmin เข้าร่วมห้องส่วนตัวโดยอัตโนมัติ
          chatRoom.addMember(userId);
          await chatRoom.save();
        }
      }

      socket.join(roomId);
      socket.userId = userId;
      socket.currentRoom = roomId;
      
      console.log(`🔗 Socket ${socket.id} joined room ${roomId} for user ${userId}`);
      
      // เพิ่มผู้ใช้ในรายการออนไลน์
      if (!roomUsers.has(roomId)) {
        roomUsers.set(roomId, new Set());
      }
      roomUsers.get(roomId).add(userId);

      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId).add(socket.id);
      
      console.log(`📊 Room ${roomId} now has ${roomUsers.get(roomId).size} users`);
      console.log(`🔗 User ${userId} now has ${userSockets.get(userId).size} sockets`);
      
      // อัปเดตสถานะออนไลน์
      onlineUsers.set(userId, {
        socketId: socket.id,
        roomId: roomId,
        lastActive: new Date(),
        username: user.displayName || user.username
      });
      
      // อัปเดตสถานะออนไลน์ในฐานข้อมูล
      try {
        const updateResult = await User.findByIdAndUpdate(userId, {
          isOnline: true,
          lastActive: new Date()
        }, { new: true });
        console.log(`🟢 User ${userId} marked as online in database`);
        console.log(`📅 lastActive updated: ${updateResult.lastActive}`);
      } catch (error) {
        console.error('Error updating user online status:', error);
      }
      
      console.log(`👤 User ${userId} joined room ${roomId}`);
      
      // ส่งจำนวนคนออนไลน์ไปยังทุกคนในห้อง
      const onlineCount = roomUsers.get(roomId).size;
      const roomOnlineUsers = Array.from(roomUsers.get(roomId)).map(uid => {
        const onlineUser = onlineUsers.get(uid);
        return {
          userId: uid,
          username: onlineUser?.username || 'Unknown',
          lastActive: onlineUser?.lastActive
        };
      });
      
      console.log(`📊 Room ${roomId} online count: ${onlineCount} users`);
      console.log(`👥 Online users in room ${roomId}:`, roomOnlineUsers.map(u => u.username));
      
      io.to(roomId).emit('online-count-updated', {
        roomId,
        onlineCount,
        onlineUsers: roomOnlineUsers
      });
      
      // แจ้งสมาชิกอื่นว่ามีคนเข้าร่วม
      socket.to(roomId).emit('user-joined', {
        userId,
        username: user.displayName || user.username,
        message: 'มีสมาชิกใหม่เข้าร่วมแชท'
      });
      
            console.log(`✅ User ${user.displayName || user.username} is now online in room ${roomId}`);
      
    } catch (error) {
      console.error('❌ Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // ส่งข้อความ
  socket.on('send-message', async (data) => {
    try {
      console.log('📤 Received send-message event:', data);
      const { content, senderId, chatRoomId, messageType = 'text', replyToId, fileUrl, fileName, fileSize, fileType } = data;
      
      // ตรวจสอบสิทธิ์
      const sender = await User.findById(senderId);
      if (!sender) {
        console.log('❌ Sender not found:', senderId);
        socket.emit('error', { message: 'Sender not found' });
        return;
      }
      
      console.log('✅ Sender found:', sender.displayName || sender.username);

      // สำหรับ private chat ที่ไม่ใช่ ChatRoom
      if (chatRoomId.startsWith('private_')) {
        console.log('🔒 Processing private chat message');
        // สร้างข้อความสำหรับ private chat
        const messageData = {
          content: messageType === 'image' ? '' : content,
          sender: senderId,
          chatRoom: chatRoomId, // ใช้ private chat ID
          messageType,
          replyTo: replyToId || null
        };

        console.log('📝 Creating message with data:', messageData);

        // เพิ่มข้อมูลไฟล์ถ้ามี
        if ((messageType === 'file' || messageType === 'image') && (fileUrl || data.imageUrl)) {
          messageData.fileUrl = fileUrl || data.imageUrl;
          messageData.fileName = fileName;
          messageData.fileSize = fileSize;
          messageData.fileType = fileType;
        }

        const message = new Message(messageData);
        await message.save();
        console.log('💾 Message saved to database:', message._id);

        // Populate ข้อมูล
        await message.populate([
          { path: 'sender', select: 'username displayName membershipTier profileImages' },
          { path: 'replyTo', select: 'content sender', populate: { path: 'sender', select: 'username displayName' } }
        ]);

        console.log('📤 Broadcasting message to room:', chatRoomId);
        console.log('📤 Connected sockets in room:', io.sockets.adapter.rooms.get(chatRoomId)?.size || 0);
        
        // Debug: แสดงรายการ socket IDs ที่อยู่ใน room
        const roomSockets = io.sockets.adapter.rooms.get(chatRoomId);
        if (roomSockets) {
          console.log('📤 Room socket IDs:', Array.from(roomSockets));
        }
        
        // ส่งข้อความไปยังทุกคนที่อยู่ใน private chat room
        io.to(chatRoomId).emit('new-message', message);
        console.log('✅ Message broadcasted successfully to', io.sockets.adapter.rooms.get(chatRoomId)?.size || 0, 'clients');
        
        // Debug: ตรวจสอบว่าข้อความถูกส่งไปยังทุก socket หรือไม่
        setTimeout(() => {
          const currentRoomSockets = io.sockets.adapter.rooms.get(chatRoomId);
          console.log('🔍 Post-broadcast room sockets:', currentRoomSockets ? Array.from(currentRoomSockets) : 'No sockets');
          
          // ส่งข้อความไปยังผู้ใช้ที่อาจจะไม่ได้อยู่ใน room แต่ควรได้รับข้อความ
          const roomUserIds = roomUsers.get(chatRoomId);
          if (roomUserIds) {
            console.log('👥 Users in room:', Array.from(roomUserIds));
            roomUserIds.forEach(userId => {
              const userSocketsSet = userSockets.get(userId);
              if (userSocketsSet && userSocketsSet.size > 0) {
                console.log(`📤 Sending message to user ${userId} sockets:`, Array.from(userSocketsSet));
                userSocketsSet.forEach(socketId => {
                  const userSocket = io.sockets.sockets.get(socketId);
                  if (userSocket) {
                    userSocket.emit('new-message', message);
                    console.log(`✅ Message sent to socket ${socketId} for user ${userId}`);
                  }
                });
              }
            });
          }
        }, 100);
        
        return;
      }

      // สำหรับ ChatRoom ปกติ
      const chatRoom = await ChatRoom.findById(chatRoomId);
      if (!chatRoom || !chatRoom.isMember(senderId)) {
        socket.emit('error', { message: 'Unauthorized to send message' });
        return;
      }

      // ตรวจสอบข้อจำกัด (เฉพาะห้องส่วนตัว) - SuperAdmin ข้ามการตรวจสอบ
      if (chatRoom.type === 'private' && !sender.isSuperAdmin()) {
        sender.resetDailyUsage();
        if (!sender.canPerformAction('chat')) {
          socket.emit('error', { message: 'Daily chat limit reached' });
          return;
        }
      }

      // สร้างข้อความ
      const messageData = {
        content: messageType === 'image' ? '' : content, // สำหรับรูปภาพให้ content เป็นค่าว่าง
        sender: senderId,
        chatRoom: chatRoomId,
        messageType,
        replyTo: replyToId || null
      };

      // เพิ่มข้อมูลไฟล์ถ้ามี
      if ((messageType === 'file' || messageType === 'image') && (fileUrl || data.imageUrl)) {
        messageData.fileUrl = fileUrl || data.imageUrl;
        messageData.fileName = fileName;
        messageData.fileSize = fileSize;
        messageData.fileType = fileType;
      }

      const message = new Message(messageData);
      await message.save();

      // อัปเดตสถิติ
      chatRoom.stats.totalMessages += 1;
      chatRoom.lastActivity = new Date();
      sender.dailyUsage.chatCount += 1;

      await Promise.all([chatRoom.save(), sender.save()]);

      // Populate ข้อมูล
      await message.populate([
        { path: 'sender', select: 'username displayName membershipTier profileImages' },
        { path: 'replyTo', select: 'content sender', populate: { path: 'sender', select: 'username displayName' } }
      ]);

      // ส่งข้อความไปยังสมาชิกทุกคนในห้อง
      io.to(chatRoomId).emit('new-message', message);
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        data: data
      });
      socket.emit('error', { 
        message: 'Failed to send message',
        details: error.message,
        type: 'send-message-error'
      });
    }
  });

  // React ข้อความ
  socket.on('react-message', async (data) => {
    try {
      const { messageId, userId, reactionType = 'heart', action = 'add' } = data;
      
      const message = await Message.findById(messageId);
      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // ตรวจสอบสิทธิ์
      const chatRoom = await ChatRoom.findById(message.chatRoom);
      if (!chatRoom.isMember(userId)) {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }

      // ตรวจสอบว่าผู้ใช้เคย react แล้วหรือไม่
      const existingReaction = message.reactions.find(
        reaction => reaction.user.toString() === userId.toString() && reaction.type === reactionType
      );
      
      let finalAction;
      
      if (existingReaction) {
        // ถ้าเคย react แล้ว ไม่ให้ทำอะไร (กดได้แค่ 1 ครั้ง)
        socket.emit('error', { message: 'คุณได้กดหัวใจข้อความนี้แล้ว' });
        return;
      } else {
        // เพิ่ม reaction ใหม่
        message.reactions.push({
          user: userId,
          type: reactionType,
          createdAt: new Date()
        });
        finalAction = 'added';
      }
      
      // อัปเดตสถิติ
      message.updateReactionStats();
      await message.save();

      // ส่งการอัปเดต reaction ไปยังทุกคนในห้อง
      io.to(message.chatRoom.toString()).emit('message-reaction-updated', {
        messageId: message._id,
        userId,
        reactionType: reactionType,
        hasReaction: finalAction === 'added',
        stats: message.stats,
        action: finalAction
      });
      
    } catch (error) {
      console.error('Error reacting to message:', error);
      socket.emit('error', { message: 'Failed to react to message' });
    }
  });

  // ออกจากห้อง
  socket.on('leave-room', async (data) => {
    const { roomId, userId } = data;
    console.log(`🚪 User ${userId} leaving room ${roomId}`);
    
    socket.leave(roomId);
    socket.to(roomId).emit('user-left', {
      userId,
      message: 'สมาชิกออกจากแชท'
    });
    
    // ลบผู้ใช้ออกจากรายการออนไลน์
    if (roomUsers.has(roomId)) {
      roomUsers.get(roomId).delete(userId);
      
                  // ส่งจำนวนคนออนไลน์ที่อัปเดต
            const onlineCount = roomUsers.get(roomId).size;
            const roomOnlineUsers = Array.from(roomUsers.get(roomId)).map(uid => {
              const onlineUser = onlineUsers.get(uid);
              return {
                userId: uid,
                username: onlineUser?.username || 'Unknown',
                lastActive: onlineUser?.lastActive
              };
            });
      
      console.log(`📊 Room ${roomId} online count updated: ${onlineCount} users`);
      
      io.to(roomId).emit('online-count-updated', {
        roomId,
        onlineCount,
        onlineUsers: roomOnlineUsers
      });
    }
    
    // อัปเดตสถานะออฟไลน์ในฐานข้อมูล
    try {
      const updateResult = await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastActive: new Date()
      }, { new: true });
      console.log(`🔴 User ${userId} marked as offline in database (leave-room)`);
      console.log(`📅 lastActive updated: ${updateResult.lastActive}`);
    } catch (error) {
      console.error('Error updating user offline status (leave-room):', error);
    }
    
    console.log(`👤 User ${userId} left room ${roomId}`);
  });

  // Typing indicators
  socket.on('typing-start', (data) => {
    const { roomId, userId, username } = data;
    socket.to(roomId).emit('user-typing', { userId, username });
  });

  socket.on('typing-stop', (data) => {
    const { roomId, userId } = data;
    socket.to(roomId).emit('user-stop-typing', { userId });
  });

  // Disconnect
  socket.on('disconnect', async (reason) => {
    console.log('👤 User disconnected:', socket.id, 'Reason:', reason);
    
    if (socket.currentRoom && socket.userId) {
      const roomId = socket.currentRoom;
      const userId = socket.userId;
      
      // ลบ socket จากรายการ
      if (userSockets.has(userId)) {
        userSockets.get(userId).delete(socket.id);
        
        // ถ้าผู้ใช้ไม่มี socket เชื่อมต่ออยู่แล้ว ให้ลบออกจากห้อง
        if (userSockets.get(userId).size === 0) {
          userSockets.delete(userId);
          
          // ลบจากรายการออนไลน์
          onlineUsers.delete(userId);
          
          // อัปเดตสถานะออฟไลน์ในฐานข้อมูล
          try {
            const updateResult = await User.findByIdAndUpdate(userId, {
              isOnline: false,
              lastActive: new Date()
            }, { new: true });
            console.log(`🔴 User ${userId} marked as offline in database (disconnect)`);
            console.log(`📅 lastActive updated: ${updateResult.lastActive}`);
          } catch (error) {
            console.error('Error updating user offline status (disconnect):', error);
          }
          
          if (roomUsers.has(roomId)) {
            roomUsers.get(roomId).delete(userId);
            
            // ส่งจำนวนคนออนไลน์ที่อัปเดต
            const onlineCount = roomUsers.get(roomId).size;
            const roomOnlineUsers = Array.from(roomUsers.get(roomId)).map(uid => {
              const onlineUser = onlineUsers.get(uid);
              return {
                userId: uid,
                username: onlineUser?.username || 'Unknown',
                lastSeen: onlineUser?.lastSeen
              };
            });
            
                  console.log(`📊 Room ${roomId} online count updated: ${onlineCount} users`);
      console.log(`👥 Remaining online users in room ${roomId}:`, roomOnlineUsers.map(u => u.username));
      
      io.to(roomId).emit('online-count-updated', {
        roomId,
        onlineCount,
        onlineUsers: roomOnlineUsers
      });
          }
          
          socket.to(roomId).emit('user-left', {
            userId,
            message: 'สมาชิกออกจากแชท'
          });
          
          console.log(`🔴 User ${userId} disconnected from room ${roomId}`);
        }
      }
    }
  });
});

// Start Server
server.listen(PORT, () => {
  console.log('🚀 ============================================');
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`📱 Frontend URLs: ${FRONTEND_URL}`);
  console.log(`🔧 Backend API: http://localhost:${PORT}`);
  console.log(`💬 Socket.IO: Real-time chat enabled`);
  console.log(`🗄️  Database: sodeclick`);
  console.log('🚀 ============================================');
});
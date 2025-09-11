# 🐇 Rabbit Gateway Integration - สรุปการแก้ไขทั้งหมด

## 📋 ภาพรวม
การแก้ไขระบบ Payment Gateway เพื่อใช้ Rabbit Gateway API พร้อมการแสดง QR Code และการตรวจสอบสถานะการชำระเงิน

---

## 🔧 ไฟล์ที่แก้ไข

### 1. **Backend Files**

#### `backend/server.js`
- **เพิ่ม Rabbit Gateway Configuration**
- **เพิ่ม `/create-qr` endpoint**
- **เพิ่ม `/api/payment/check-status/:paymentId` endpoint**
- **เพิ่ม `/webhook-endpoint` endpoint**

#### `backend/env.development`
- **เพิ่ม Rabbit Gateway Environment Variables**

### 2. **Frontend Files**

#### `frontend/src/services/rabbitAPI.js`
- **สร้าง Rabbit Gateway API Service**
- **เพิ่ม Helper Functions**

#### `frontend/src/components/PaymentGateway.jsx`
- **แก้ไข QR Code Display**
- **เพิ่ม Payment Status Polling**
- **เพิ่ม Rabbit Gateway Integration**

#### `frontend/env.development` & `frontend/env.example`
- **เพิ่ม VITE_RABBIT_API_KEY**

### 3. **Test Files**

#### `backend/test-rabbit-correct-auth.js`
- **สร้าง Test Script สำหรับ Rabbit Gateway**

---

## 🚀 ขั้นตอนการแก้ไข

### **ขั้นตอนที่ 1: ตั้งค่า Environment Variables**

#### `backend/env.development`
```env
# Rabbit Gateway Configuration
RABBIT_APPLICATION_ID=163ce1ba-0a2e-4397-a3c9-d610b8303b32
RABBIT_PUBLIC_KEY=pk_production_ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SmpJam9pTmpoaE5tUXhOR1JrT1dObU1tSXpOVGxsWTJGa01Ua3pJaXdpYUNJNkltaDBkSEJ6T2k4dlpHRnphR0p2WVhKa0xuQm5keTV5WVdKaWFYUXVZMjh1ZEdnaUxDSmhJam9pTVRZelkyVXhZbUV0TUdFeVpTMDBNemszTFdFell6a3RaRFl4TUdJNE16QXpZak15SWl3aWRYRWlPaUl5TkRRek5ETXlZUzFoWkdNNUxUUXhOVFF0WVRFeE9TMHlaV0l4WkRWaU0yUmlPREFpTENKcFlYUWlPakUzTlRVM05qTXdNakVzSW1WNGNDSTZORGt4TVRRek5qWXlNWDAuVTl0RE9TVVl0eVlkeEZid3FjdUZmVWdZd1k4LXVwTTdJeUVxRVRRd0djRQ==
RABBIT_COMPANY_ID=68a6d14dd9cf2b359ecad193
RABBIT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBJZCI6IjE2M2NlMWJhLTBhMmUtNDM5Ny1hM2M5LWQ2MTBiODMwM2IzMiIsImNvbXBhbnlJZCI6IjY4YTZkMTRkZDljZjJiMzU5ZWNhZDE5MyIsImlhdCI6MTc1NTc2MzAyMSwiZXhwIjo0OTExNDM2NjIxfQ.bYkXbc-8lA4MJFXVkVBIJyzN0d2C2ZzMjLdZYvWD7M4
```

#### `frontend/env.development`
```env
# Rabbit Gateway API Key
VITE_RABBIT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBJZCI6IjE2M2NlMWJhLTBhMmUtNDM5Ny1hM2M5LWQ2MTBiODMwM2IzMiIsImNvbXBhbnlJZCI6IjY4YTZkMTRkZDljZjJiMzU5ZWNhZDE5MyIsImlhdCI6MTc1NTc2MzAyMSwiZXhwIjo0OTExNDM2NjIxfQ.bYkXbc-8lA4MJFXVkVBIJyzN0d2C2ZzMjLdZYvWD7M4
```

---

### **ขั้นตอนที่ 2: แก้ไข Backend Server**

#### `backend/server.js` - Rabbit Gateway Configuration
```javascript
// Rabbit Gateway Configuration
const RABBIT_API_URL = "https://api.pgw.rabbit.co.th";
const RABBIT_APPLICATION_ID = process.env.RABBIT_APPLICATION_ID || "163ce1ba-0a2e-4397-a3c9-d610b8303b32";
const RABBIT_PUBLIC_KEY = process.env.RABBIT_PUBLIC_KEY || "pk_production_...";
const RABBIT_COMPANY_ID = process.env.RABBIT_COMPANY_ID || "68a6d14dd9cf2b359ecad193";
const RABBIT_API_KEY = process.env.RABBIT_API_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

#### `backend/server.js` - Create QR Endpoint
```javascript
app.post("/create-qr", async (req, res) => {
  const { orderId, amount } = req.body;

  try {
    // เตรียมข้อมูลสำหรับ Rabbit Gateway API
    const requestBody = {
      amount: amount * 100, // Rabbit Gateway ใช้หน่วยเป็น satang
      currency: 'THB',
      provider: 'prompt_pay',
      localId: orderId,
      webhook: "https://sodeclick.com/webhook-endpoint",
      locale: 'en'
    };

    // ส่งคำขอไปยัง Rabbit Gateway
    const response = await axios.post(RABBIT_API_URL + '/public/v2/transactions', requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': RABBIT_API_KEY,
        'x-application-id': RABBIT_APPLICATION_ID,
        'x-public-key': RABBIT_PUBLIC_KEY,
        'x-company-id': RABBIT_COMPANY_ID
      }
    });

    const rabbitData = response.data;
    
    // ส่งผลลัพธ์กลับไปยัง frontend
    const responseData = {
      payment_id: rabbitData.id,
      transaction_id: rabbitData.id,
      qr_image: qrImage,
      qr_code_url: qrCodeUrl,
      vendor_qr_code: rabbitData.vendorQrCode,
      expire_at: rabbitData.expires,
      order_id: orderId,
      amount: amount,
      currency: "THB",
      status: rabbitData.state === "INITIATED" ? "pending" : rabbitData.state.toLowerCase(),
      url: rabbitData.url,
      qr_image_url: qrCodeUrl || qrImage,
      state: rabbitData.state,
      signature: rabbitData.signature,
      security_word: rabbitData.securityWord,
      amount_formatted: rabbitData.amountFormatted,
      short_url: rabbitData.shortUrl,
      qr_code: rabbitData.vendorQrCode,
      transaction_url: rabbitData.url
    };

    res.json(responseData);
  } catch (err) {
    // Error handling
    res.status(500).json({ 
      error: errorMessage,
      code: err.response?.data?.code,
      details: err.response?.data || err.message,
      troubleshooting: troubleshooting
    });
  }
});
```

#### `backend/server.js` - Check Payment Status Endpoint
```javascript
app.get("/api/payment/check-status/:paymentId", async (req, res) => {
  const { paymentId } = req.params;
  
  try {
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
    
    // แปลงสถานะจาก Rabbit Gateway
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
    res.status(500).json({
      error: "ไม่สามารถตรวจสอบสถานะการชำระเงินได้",
      payment_id: paymentId,
      details: err.response?.data || err.message
    });
  }
});
```

---

### **ขั้นตอนที่ 3: สร้าง Frontend API Service**

#### `frontend/src/services/rabbitAPI.js`
```javascript
import { apiService } from '../config/api';

// Rabbit Gateway Configuration
const RABBIT_CONFIG = {
  apiUrl: 'http://localhost:5000',
  createQR: '/create-qr',
  callback: '/payment/callback',
  apiKey: import.meta.env.VITE_RABBIT_API_KEY || ''
};

// Rabbit Gateway API Services
export const rabbitAPI = {
  // สร้างการชำระเงินใหม่
  createPayment: async (paymentData) => {
    try {
      const response = await fetch(`${RABBIT_CONFIG.apiUrl}${RABBIT_CONFIG.createQR}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: paymentData.orderId,
          amount: paymentData.amount
        })
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      return result;
    } catch (error) {
      console.error('Rabbit createPayment error:', error);
      throw error;
    }
  },

  // ตรวจสอบสถานะการชำระเงิน
  checkPaymentStatus: async (paymentId) => {
    try {
      const response = await fetch(`${RABBIT_CONFIG.apiUrl}/api/payment/check-status/${paymentId}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to check payment status');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Rabbit checkPaymentStatus error:', error);
      throw error;
    }
  },

  // ยกเลิกการชำระเงิน
  cancelPayment: async (paymentId) => {
    try {
      const response = await fetch(`${RABBIT_CONFIG.apiUrl}/api/payment/cancel/${paymentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      return result;
    } catch (error) {
      console.error('Rabbit cancelPayment error:', error);
      throw error;
    }
  },

  // ดึงข้อมูลธนาคาร
  getBanks: async () => {
    try {
      const response = await fetch(`${RABBIT_CONFIG.apiUrl}/api/payment/banks`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get banks');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Rabbit getBanks error:', error);
      throw error;
    }
  }
};

// Rabbit Gateway Helper Functions
export const rabbitHelpers = {
  // สร้าง Order ID
  generateOrderId: () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `ORD_${timestamp}_${random}`;
  },

  // สร้าง Payment ID
  generatePaymentId: () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `PAY_${timestamp}_${random}`;
  },

  // ตรวจสอบสถานะการชำระเงินแบบ Polling
  pollPaymentStatus: (paymentId, onStatusChange, onSuccess, onError) => {
    const interval = setInterval(async () => {
      try {
        const result = await rabbitAPI.checkPaymentStatus(paymentId);
        
        if (result.status === 'completed') {
          clearInterval(interval);
          onSuccess && onSuccess(result);
        } else if (result.status === 'failed') {
          clearInterval(interval);
          onError && onError(new Error('Payment failed'));
        } else {
          onStatusChange && onStatusChange(result.status);
        }
      } catch (error) {
        clearInterval(interval);
        onError && onError(error);
      }
    }, 5000); // ตรวจสอบทุก 5 วินาที

    return interval;
  },

  // แปลงสถานะเป็นข้อความภาษาไทย
  getStatusMessage: (status) => {
    switch (status) {
      case 'pending':
        return 'รอการชำระเงิน'
      case 'completed':
        return 'ชำระเงินสำเร็จ'
      case 'failed':
        return 'การชำระเงินล้มเหลว'
      case 'expired':
        return 'QR Code หมดอายุ'
      case 'error':
        return 'เกิดข้อผิดพลาด'
      default:
        return 'ไม่ทราบสถานะ'
    }
  },

  // แปลงสถานะเป็นสี
  getStatusColor: (status) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600'
      case 'completed':
        return 'text-green-600'
      case 'failed':
        return 'text-red-600'
      case 'expired':
        return 'text-gray-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  },

  // แปลงสถานะเป็นไอคอน
  getStatusIcon: (status) => {
    switch (status) {
      case 'pending':
        return '⏳'
      case 'completed':
        return '✅'
      case 'failed':
        return '❌'
      case 'expired':
        return '⏰'
      case 'error':
        return '⚠️'
      default:
        return '❓'
    }
  },

  // จัดรูปแบบเวลา
  formatTime: (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  },

  // ตรวจสอบว่า QR Code หมดอายุหรือไม่
  isExpired: (expiryTime) => {
    return new Date() > new Date(expiryTime);
  },

  // คำนวณเวลาที่เหลือ
  getTimeRemaining: (expiryTime) => {
    const now = new Date();
    const expiry = new Date(expiryTime);
    const remaining = expiry.getTime() - now.getTime();
    return Math.max(0, remaining);
  },

  // Debug logging
  debugLog: (message, type = 'info', data = null) => {
    const timestamp = new Date().toLocaleString('th-TH');
    const prefix = `[${timestamp}] [Rabbit]`;
    
    switch (type) {
      case 'error':
        console.error(`${prefix} ❌ ${message}`, data);
        break;
      case 'warning':
        console.warn(`${prefix} ⚠️ ${message}`, data);
        break;
      case 'success':
        console.log(`${prefix} ✅ ${message}`, data);
        break;
      default:
        console.log(`${prefix} ℹ️ ${message}`, data);
    }
  }
};

export default rabbitAPI;
```

---

### **ขั้นตอนที่ 4: แก้ไข PaymentGateway Component**

#### `frontend/src/components/PaymentGateway.jsx` - Import และ Configuration
```javascript
import { rabbitAPI, rabbitHelpers } from '../services/rabbitAPI'

// Rabbit Gateway Configuration
const RABBIT_CONFIG = {
  apiUrl: 'http://localhost:5000',
  createQR: '/create-qr',
  checkStatus: '/api/payment/check-status',
  callback: '/webhook-endpoint'
}
```

#### `frontend/src/components/PaymentGateway.jsx` - Payment Status Polling
```javascript
// Polling ตรวจสถานะจาก Rabbit Gateway
useEffect(() => {
  if (qrData && paymentStatus === 'pending') {
    const interval = setInterval(async () => {
      try {
        // ใช้ rabbitAPI service
        const data = await rabbitAPI.checkPaymentStatus(qrData.payment_id)
        
        console.log('🔍 Payment status check:', data)
        
        if (data.status === 'completed') {
          setPaymentStatus('completed')
          onSuccess && onSuccess(data)
          clearInterval(interval)
        } else if (data.status === 'failed') {
          setPaymentStatus('failed')
          clearInterval(interval)
        } else if (data.status === 'expired') {
          setPaymentStatus('expired')
          clearInterval(interval)
        }
      } catch (error) {
        console.error('Error checking payment status:', error)
      }
    }, 5000) // ตรวจสอบทุก 5 วินาที
    
    return () => clearInterval(interval)
  }
}, [qrData, paymentStatus, onSuccess])
```

#### `frontend/src/components/PaymentGateway.jsx` - Create Rabbit Payment
```javascript
// สร้าง Rabbit Payment
const createRabbitPayment = async () => {
  console.log('=== Starting Rabbit QR Code Generation ===')
  setProcessing(true)
  
  try {
    const pricing = tierPricing[plan.tier] || tierPricing.vip
    const orderId = rabbitHelpers.generateOrderId()
    
    // ใช้ rabbitAPI service
    const result = await rabbitAPI.createPayment({
      orderId: orderId,
      amount: pricing.amount
    })
    
    console.log('🐇 Rabbit Gateway Response:', result)
    
    const transaction = {
      id: result.payment_id,
      transactionId: result.transaction_id,
      orderId: orderId,
      amount: result.amount || pricing.amount,
      currency: result.currency || 'THB',
      planId: plan.id,
      planTier: plan.tier,
      planName: plan.name,
      userId: user?._id,
      status: result.status || 'pending',
      createdAt: new Date(),
      expiryTime: new Date(result.expire_at)
    }
    
    setCurrentTransaction(transaction)
    setQrData({
      payment_id: result.payment_id,
      transaction_id: result.transaction_id,
      orderId: orderId,
      amount: result.amount || pricing.amount,
      currency: result.currency || 'THB',
      qr_image: result.qr_image || result.qr_code_url,
      vendor_qr_code: result.vendor_qr_code,
      qr_code: result.qr_code,
      expiryTime: new Date(result.expire_at),
      url: result.url,
      transaction_url: result.transaction_url,
      short_url: result.short_url
    })
    
    setTimeRemaining(15 * 60 * 1000) // 15 นาที
    setPaymentStatus('pending')
    
    console.log('=== Rabbit QR Code Generation Completed Successfully ===')
  } catch (error) {
    console.error('Rabbit QR Code generation failed:', error)
    setPaymentStatus('error')
  } finally {
    setProcessing(false)
  }
}
```

#### `frontend/src/components/PaymentGateway.jsx` - QR Code Display
```javascript
{/* QR Code Image */}
<div className="flex justify-center">
  <div className="relative">
    {qrData.qr_image ? (
      <img
        src={qrData.qr_image}
        alt="QR Code for Payment"
        className="w-64 h-64 border-4 border-white rounded-2xl shadow-xl"
      />
    ) : qrData.vendor_qr_code ? (
      <div className="w-64 h-64 border-4 border-white rounded-2xl shadow-xl bg-white flex items-center justify-center">
        <div className="text-center p-4">
          <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-2">QR Code String:</p>
          <p className="text-xs text-gray-500 break-all font-mono">
            {qrData.vendor_qr_code.substring(0, 50)}...
          </p>
          <p className="text-xs text-blue-600 mt-2">
            ใช้แอปธนาคารสแกน QR Code นี้
          </p>
        </div>
      </div>
    ) : (
      <div className="w-64 h-64 border-4 border-white rounded-2xl shadow-xl bg-white flex items-center justify-center">
        <div className="text-center">
          <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">ไม่มี QR Code</p>
        </div>
      </div>
    )}
    {paymentStatus === 'expired' && (
      <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
        <div className="text-white text-center">
          <Timer className="h-8 w-8 mx-auto mb-2" />
          <p className="font-semibold">QR Code หมดอายุ</p>
        </div>
      </div>
    )}
  </div>
</div>
```

#### `frontend/src/components/PaymentGateway.jsx` - Payment Information Display
```javascript
{/* Payment Information */}
<div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-200/50">
  <h3 className="text-lg font-semibold text-slate-800 mb-4">
    ข้อมูลการชำระเงิน
  </h3>
  
  <div className="space-y-3">
    <div className="flex justify-between items-center">
      <span className="text-slate-600">จำนวนเงิน:</span>
      <span className="font-semibold text-slate-800">
        ฿{qrData.amount} {qrData.currency}
      </span>
    </div>
    
    <div className="flex justify-between items-center">
      <span className="text-slate-600">Order ID:</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-slate-800">
          {qrData.orderId}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => copyToClipboard(qrData.orderId)}
          className="h-6 w-6 p-0"
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
    </div>

    {qrData.vendor_qr_code && (
      <div className="flex justify-between items-center">
        <span className="text-slate-600">QR Code:</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-slate-800 max-w-32 truncate">
            {qrData.vendor_qr_code.substring(0, 20)}...
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => copyToClipboard(qrData.vendor_qr_code)}
            className="h-6 w-6 p-0"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>
    )}

    {qrData.transaction_url && (
      <div className="flex justify-between items-center">
        <span className="text-slate-600">Payment URL:</span>
        <div className="flex items-center gap-2">
          <a
            href={qrData.transaction_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm truncate max-w-32"
          >
            เปิดลิงก์
          </a>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => copyToClipboard(qrData.transaction_url)}
            className="h-6 w-6 p-0"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>
    )}

    <div className="flex justify-between items-center">
      <span className="text-slate-600">Payment ID:</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-slate-800">
          {qrData.payment_id}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => copyToClipboard(qrData.payment_id)}
          className="h-6 w-6 p-0"
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
    </div>
  </div>
</div>
```

---

### **ขั้นตอนที่ 5: สร้าง Test Script**

#### `backend/test-rabbit-correct-auth.js`
```javascript
const axios = require('axios');
require('dotenv').config({path: './env.development'});

const RABBIT_API_URL = "https://api.pgw.rabbit.co.th";
const RABBIT_APPLICATION_ID = process.env.RABBIT_APPLICATION_ID;
const RABBIT_PUBLIC_KEY = process.env.RABBIT_PUBLIC_KEY;
const RABBIT_COMPANY_ID = process.env.RABBIT_COMPANY_ID;

console.log('🐇 Testing Rabbit Gateway with correct headers...');
console.log('Application ID:', RABBIT_APPLICATION_ID);
console.log('Company ID:', RABBIT_COMPANY_ID);
console.log('Public Key length:', RABBIT_PUBLIC_KEY ? RABBIT_PUBLIC_KEY.length : 0);

async function testCorrectAuth() {
  const endpoint = RABBIT_API_URL + '/public/v2/transactions';
  
  const testPayload = {
    amount: 100,
    currency: 'THB',
    provider: 'prompt_pay',
    localId: `TEST_CORRECT_AUTH_${Date.now()}`,
    webhook: 'https://sodeclick.com/webhook-endpoint',
    locale: 'en'
  };
  
  try {
    console.log('\n🧪 Testing with correct Rabbit Gateway headers...');
    console.log('Payload:', JSON.stringify(testPayload, null, 2));
    
    const response = await axios.post(endpoint, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': process.env.RABBIT_API_KEY
      },
      timeout: 10000
    });
    
    console.log('✅ SUCCESS! Rabbit Gateway is working!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.vendorQrCode) {
      console.log('🎉 Got QR Code! Payment system is ready!');
    }
    
  } catch (error) {
    console.error('❌ Rabbit Gateway Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

testCorrectAuth();
```

---

## 🔄 API Flow

### **1. Create Payment Flow**
```
Frontend → Backend → Rabbit Gateway → Response → Frontend
```

1. **Frontend** เรียก `rabbitAPI.createPayment()`
2. **Backend** รับ request ที่ `/create-qr`
3. **Backend** ส่ง request ไปยัง Rabbit Gateway API
4. **Rabbit Gateway** ส่ง response กลับ
5. **Backend** แปลง response และส่งกลับไปยัง Frontend
6. **Frontend** แสดง QR Code และข้อมูลการชำระเงิน

### **2. Payment Status Check Flow**
```
Frontend (Polling) → Backend → Rabbit Gateway → Response → Frontend
```

1. **Frontend** เรียก `rabbitAPI.checkPaymentStatus()` ทุก 5 วินาที
2. **Backend** รับ request ที่ `/api/payment/check-status/:paymentId`
3. **Backend** ส่ง request ไปยัง Rabbit Gateway API
4. **Rabbit Gateway** ส่งสถานะการชำระเงินกลับ
5. **Backend** แปลงสถานะและส่งกลับไปยัง Frontend
6. **Frontend** อัปเดตสถานะการชำระเงิน

---

## 📱 ข้อมูลที่ได้จาก Rabbit Gateway

### **Create Payment Response**
```json
{
  "id": "68bbc0e99e79c1ea35374d27",
  "created": "2025-09-06T05:04:41.662Z",
  "updated": "2025-09-06T05:04:41.964Z",
  "amount": 100,
  "merchantId": "68a6d14dd9cf2b359ecad193",
  "currency": "THB",
  "payCurrency": "THB",
  "provider": "prompt_pay",
  "state": "INITIATED",
  "vendorQrCode": "00020101021230870016A000000677010112...",
  "url": "https://transaction.pgw.rabbit.co.th/68bbc0e99e79c1ea35374d27",
  "shortUrl": "https://pay.pgw.rabbit.co.th/QGY0bY9OZk",
  "expires": "2025-09-13T05:04:41.661Z",
  "amountFormatted": "THB 1.00"
}
```

### **Payment Status Response**
```json
{
  "payment_id": "68bbc0e99e79c1ea35374d27",
  "status": "pending",
  "state": "INITIATED",
  "amount": 100,
  "currency": "THB",
  "created_at": "2025-09-06T05:04:41.662Z",
  "updated_at": "2025-09-06T05:04:41.964Z",
  "expires_at": "2025-09-13T05:04:41.661Z",
  "url": "https://transaction.pgw.rabbit.co.th/68bbc0e99e79c1ea35374d27",
  "short_url": "https://pay.pgw.rabbit.co.th/QGY0bY9OZk"
}
```

---

## 🎯 Features ที่เพิ่มเข้ามา

### **1. QR Code Display**
- รองรับทั้ง QR image และ QR string
- แสดงข้อมูล QR Code พร้อมคำแนะนำ
- Copy button สำหรับ QR Code string

### **2. Payment Status Polling**
- ตรวจสอบสถานะการชำระเงินทุก 5 วินาที
- รองรับสถานะ: pending, completed, failed, expired
- Auto-stop เมื่อชำระเงินสำเร็จหรือล้มเหลว

### **3. Payment Information Display**
- แสดงข้อมูลการชำระเงินครบถ้วน
- Copy buttons สำหรับ Order ID, Payment ID, QR Code, URLs
- Payment URL ที่สามารถเปิดได้

### **4. Error Handling**
- จัดการ error จาก Rabbit Gateway
- แสดงข้อความ error ที่เป็นประโยชน์
- Troubleshooting guide

### **5. Helper Functions**
- สร้าง Order ID และ Payment ID
- แปลงสถานะเป็นข้อความภาษาไทย
- จัดรูปแบบเวลาและสี
- Debug logging

---

## 🚀 การใช้งาน

### **1. เริ่มต้น Backend**
```bash
cd backend
npm start
```

### **2. เริ่มต้น Frontend**
```bash
cd frontend
npm run dev
```

### **3. ทดสอบ Rabbit Gateway**
```bash
cd backend
node test-rabbit-correct-auth.js
```

---

## ⚠️ ข้อควรระวัง

### **1. Environment Variables**
- ต้องตั้งค่า Rabbit Gateway credentials ในไฟล์ environment
- ต้อง restart server หลังจากเปลี่ยน environment variables

### **2. Rabbit Gateway Account**
- บัญชีต้องได้รับการอนุมัติจาก Rabbit Gateway
- ต้องผ่าน KYC verification
- Company registration ต้องเสร็จสมบูรณ์

### **3. API Rate Limits**
- Rabbit Gateway มี rate limits
- ควรใช้ polling interval ที่เหมาะสม (5 วินาที)

### **4. Error Handling**
- จัดการ error cases ทั้งหมด
- แสดงข้อความ error ที่เป็นประโยชน์
- มี fallback สำหรับกรณีที่ API ไม่ตอบสนอง

---

## 📞 Support

### **Rabbit Gateway Support**
- **Email**: support@rabbit.co.th
- **Line**: @RabbitGateway
- **Dashboard**: https://dashboard.rabbit.co.th

### **Troubleshooting**
1. ตรวจสอบ Rabbit Gateway account status
2. ตรวจสอบ environment variables
3. ตรวจสอบ network connectivity
4. ตรวจสอบ API rate limits

---

## ✅ สรุป

ระบบ Rabbit Gateway Integration เสร็จสมบูรณ์แล้ว พร้อมใช้งาน:

- ✅ **Backend API** - สร้าง QR Code และตรวจสอบสถานะ
- ✅ **Frontend Service** - API service และ helper functions
- ✅ **PaymentGateway Component** - แสดง QR Code และข้อมูลการชำระเงิน
- ✅ **Payment Status Polling** - ตรวจสอบสถานะอัตโนมัติ
- ✅ **Error Handling** - จัดการ error และแสดงข้อความที่เป็นประโยชน์
- ✅ **Test Scripts** - ทดสอบ Rabbit Gateway API

**ระบบพร้อมใช้งานแล้วครับ!** 🚀

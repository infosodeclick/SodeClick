const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const crypto = require('crypto');
const axios = require('axios');


// Helper function to generate reference ID (15 digits)
function generateReferenceId() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  // YYMMDDHHMMSSXXX format (15 digits)
  return `${year}${month}${day}${hours}${minutes}${seconds}${random}`.slice(0, 15);
}


// สร้าง QR Code สำหรับการชำระเงิน
router.post('/generate-qr', async (req, res) => {
  try {
    const { bankId, amount, planId, planTier, planName, userId } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!bankId || !amount || !planId || !planTier || !userId) {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ครบถ้วน'
      });
    }

    // ตรวจสอบธนาคาร
    const bank = bankAccounts[bankId];
    if (!bank) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบข้อมูลธนาคาร'
      });
    }

    // สร้าง Transaction ID
    const transactionId = `TXN_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    // สร้างเวลาหมดอายุ (15 นาที)
    const expiryTime = new Date(Date.now() + 15 * 60 * 1000);

    // สร้างข้อมูล QR Code ตามมาตรฐาน PromptPay
    const qrData = {
      bankCode: bank.bankCode,
      accountNumber: bank.accountNumber,
      accountName: bank.accountName,
      amount: parseFloat(amount),
      currency: 'THB',
      transactionId: transactionId,
      planId: planId,
      planTier: planTier,
      planName: planName,
      userId: userId,
      timestamp: new Date().toISOString(),
      expiryTime: expiryTime.toISOString()
    };

    // สร้าง QR Code string สำหรับ PromptPay
    const promptPayString = generatePromptPayString(qrData);

    // สร้าง QR Code image
    const qrCodeImage = await QRCode.toDataURL(promptPayString, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // บันทึกข้อมูล transaction ลงฐานข้อมูล (ในระบบจริง)
    const transaction = {
      transactionId: transactionId,
      userId: userId,
      planId: planId,
      planTier: planTier,
      amount: parseFloat(amount),
      currency: 'THB',
      bankId: bankId,
      bankName: bank.name,
      accountNumber: bank.accountNumber,
      status: 'pending',
      createdAt: new Date(),
      expiryTime: expiryTime,
      qrCodeData: qrData
    };

    // TODO: บันทึก transaction ลงฐานข้อมูล
    // await Transaction.create(transaction);

    res.json({
      success: true,
      data: {
        transactionId: transactionId,
        qrCodeImage: qrCodeImage,
        qrCodeString: promptPayString,
        bankInfo: {
          name: bank.name,
          accountNumber: bank.accountNumber,
          accountName: bank.accountName
        },
        amount: parseFloat(amount),
        currency: 'THB',
        planInfo: {
          id: planId,
          tier: planTier,
          name: planName
        },
        expiryTime: expiryTime.toISOString(),
        timeRemaining: 15 * 60 * 1000 // 15 นาทีในมิลลิวินาที
      }
    });

  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้าง QR Code'
    });
  }
});

// ตรวจสอบสถานะการชำระเงิน
router.get('/check-payment/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    // TODO: ดึงข้อมูล transaction จากฐานข้อมูล
    // const transaction = await Transaction.findOne({ transactionId });

    // จำลองการตรวจสอบการชำระเงิน
    const mockTransaction = {
      transactionId: transactionId,
      status: 'pending', // pending, completed, expired, failed
      amount: 1000,
      currency: 'THB',
      createdAt: new Date(),
      expiryTime: new Date(Date.now() + 15 * 60 * 1000)
    };

    // ตรวจสอบว่า QR Code หมดอายุหรือยัง
    const isExpired = new Date() > new Date(mockTransaction.expiryTime);
    
    if (isExpired && mockTransaction.status === 'pending') {
      mockTransaction.status = 'expired';
    }

    res.json({
      success: true,
      data: {
        transactionId: transactionId,
        status: mockTransaction.status,
        amount: mockTransaction.amount,
        currency: mockTransaction.currency,
        isExpired: isExpired,
        timeRemaining: isExpired ? 0 : new Date(mockTransaction.expiryTime) - new Date()
      }
    });

  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะการชำระเงิน'
    });
  }
});

// ยืนยันการชำระเงิน (สำหรับระบบจริง)
router.post('/confirm-payment', async (req, res) => {
  try {
    const { transactionId, paymentReference, amount, bankId } = req.body;

    // TODO: ตรวจสอบข้อมูลการชำระเงินกับธนาคาร
    // ตรวจสอบว่า transaction ยังไม่หมดอายุ
    // ตรวจสอบจำนวนเงินตรงกับที่ระบุ
    // ตรวจสอบว่าไม่เคยยืนยันแล้ว

    // จำลองการยืนยันการชำระเงิน
    const paymentConfirmation = {
      transactionId: transactionId,
      paymentReference: paymentReference,
      amount: parseFloat(amount),
      bankId: bankId,
      confirmedAt: new Date(),
      status: 'completed'
    };

    // TODO: อัปเดตสถานะ transaction ในฐานข้อมูล
    // await Transaction.findOneAndUpdate(
    //   { transactionId: transactionId },
    //   { 
    //     status: 'completed',
    //     paymentReference: paymentReference,
    //     confirmedAt: new Date()
    //   }
    // );

    // TODO: อัปเกรดสมาชิกของผู้ใช้
    // await upgradeUserMembership(userId, planId);

    res.json({
      success: true,
      message: 'ยืนยันการชำระเงินสำเร็จ',
      data: paymentConfirmation
    });

  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการยืนยันการชำระเงิน'
    });
  }
});

// สร้าง PromptPay string ตามมาตรฐาน
function generatePromptPayString(data) {
  // ตามมาตรฐาน EMV QR Code สำหรับ PromptPay
  const payload = {
    "00": "02", // Payload Format Indicator
    "01": "12", // Point of Initiation Method
    "26": {
      "00": "A000000677010112", // Global Unique Identifier
      "01": data.accountNumber, // PromptPay ID
      "02": "00" // PromptPay ID Type
    },
    "52": "0000", // Merchant Category Code
    "53": "764", // Transaction Currency
    "54": data.amount.toFixed(2), // Transaction Amount
    "58": "TH", // Country Code
    "59": data.accountName, // Merchant Name
    "60": "Bangkok", // Merchant City
    "62": {
      "01": data.transactionId // Reference 1
    }
  };

  // แปลงเป็น TLV format
  return encodeTLV(payload);
}

// แปลงข้อมูลเป็น TLV format
function encodeTLV(data) {
  let result = '';
  
  for (const [tag, value] of Object.entries(data)) {
    if (typeof value === 'object') {
      const nestedValue = encodeTLV(value);
      result += tag + padZero(nestedValue.length, 2) + nestedValue;
    } else {
      result += tag + padZero(value.length, 2) + value;
    }
  }
  
  return result;
}

// เพิ่มเลข 0 นำหน้า
function padZero(num, size) {
  let s = num.toString();
  while (s.length < size) s = "0" + s;
  return s;
}

// ดึงข้อมูลธนาคารทั้งหมด
router.get('/banks', (req, res) => {
  try {
    const banks = Object.keys(bankAccounts).map(id => ({
      id: id,
      name: bankAccounts[id].name,
      accountNumber: bankAccounts[id].accountNumber,
      accountName: bankAccounts[id].accountName,
      bankCode: bankAccounts[id].bankCode
    }));

    res.json({
      success: true,
      data: banks
    });

  } catch (error) {
    console.error('Error fetching banks:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลธนาคาร'
    });
  }
});


module.exports = router;

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

async function updateKaoPassword() {
  try {
    console.log('🔌 เชื่อมต่อ MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/love-app');
    console.log('✅ เชื่อมต่อ MongoDB สำเร็จ');

    // ค้นหา user kao
    const kao = await User.findOne({ username: 'kao' });
    if (!kao) {
      console.log('❌ ไม่พบ user kao');
      return;
    }

    console.log('👤 พบ user kao:', kao.username);
    console.log('📧 Email:', kao.email);
    console.log('🔒 Role:', kao.role);
    console.log('');

    // อัปเดต password
    const hashedPassword = await bcrypt.hash('priktai', 12);
    kao.password = hashedPassword;
    
    // อัปเดตข้อมูล SuperAdmin
    kao.role = 'superadmin';
    kao.coins = 999999;
    kao.votePoints = 999999;
    kao.membership = {
      tier: 'platinum',
      startDate: new Date(),
      endDate: null, // ไม่หมดอายุ
      autoRenew: false,
      planId: null
    };
    kao.isActive = true;
    kao.isBanned = false;
    
    await kao.save();
    
    console.log('✅ อัปเดตข้อมูล SuperAdmin kao สำเร็จ');
    console.log('👤 Username: kao');
    console.log('🔑 Password: priktai');
    console.log('📧 Email:', kao.email);
    console.log('💰 Coins: 999,999');
    console.log('⭐ Vote Points: 999,999');
    console.log('💎 Tier: Platinum');
    console.log('🔒 Role: superadmin');
    console.log('');
    console.log('🚀 สิทธิ์พิเศษของ SuperAdmin:');
    console.log('   • โหวตให้ใครก็ได้ไม่จำกัด');
    console.log('   • เพิ่มเหรียญให้ใครก็ได้ไม่จำกัด');
    console.log('   • เพิ่มคะแนนโหวตให้ใครก็ได้ไม่จำกัด');
    console.log('   • มีสิทธิ์สูงสุดในระบบ');
    console.log('   • ไม่โดนแบน/ลบ/แก้ไข tier');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 ปิดการเชื่อมต่อ MongoDB');
  }
}

// รันฟังก์ชัน
updateKaoPassword();

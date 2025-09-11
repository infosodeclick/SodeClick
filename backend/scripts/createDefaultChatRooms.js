const mongoose = require('mongoose');
const ChatRoom = require('../models/ChatRoom');
const User = require('../models/User');
require('dotenv').config();

const createDefaultChatRooms = async () => {
  try {
    // เชื่อมต่อ MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sodeclick');
    console.log('✅ Connected to MongoDB');

    // ลบห้องแชทเก่าทั้งหมด (ถ้ามี)
    await ChatRoom.deleteMany({});
    console.log('🗑️  Cleared existing chat rooms');

    // หาผู้ใช้คนแรกเป็นเจ้าของห้อง
    let owner = await User.findOne();
    if (!owner) {
      console.log('❌ No users found. Please create at least one user first.');
      return;
    }

    // สร้างห้องแชทสาธารณะ
    const publicRooms = [
      {
        name: '💬 แชททั่วไป',
        description: 'ห้องแชทสาธารณะสำหรับสมาชิกทุกคน มาคุยกันแบบสบายๆ',
        type: 'public',
        owner: owner._id,
        settings: {
          maxMembers: 1000,
          allowGifts: true,
          allowCoinGifts: true
        }
      },
      {
        name: '❤️ หาคู่ หาแฟน',
        description: 'ห้องแชทสำหรับคนที่กำลังมองหาความรัก',
        type: 'public',
        owner: owner._id,
        settings: {
          maxMembers: 500,
          allowGifts: true,
          allowCoinGifts: true
        }
      },
      {
        name: '🎮 เกมส์ และ ความบันเทิง',
        description: 'คุยเรื่องเกมส์ ภาพยนตร์ ซีรีส์ และความบันเทิงต่างๆ',
        type: 'public',
        owner: owner._id,
        settings: {
          maxMembers: 300,
          allowGifts: true,
          allowCoinGifts: true
        }
      },
      {
        name: '🍔 อาหาร และ ท่องเที่ยว',
        description: 'แชร์ร้านอาหารอร่อย สถานที่ท่องเที่ยวสวยๆ',
        type: 'public',
        owner: owner._id,
        settings: {
          maxMembers: 200,
          allowGifts: true,
          allowCoinGifts: true
        }
      }
    ];

    // สร้างห้องแชทส่วนตัว (สำหรับสมาชิก Gold ขึ้นไป)
    const privateRooms = [
      {
        name: '💎 VIP Lounge',
        description: 'ห้องแชทพิเศษสำหรับสมาชิก VIP เท่านั้น',
        type: 'private',
        owner: owner._id,
        entryFee: 100,
        ageRestriction: {
          minAge: 25,
          maxAge: 50
        },
        settings: {
          maxMembers: 50,
          allowGifts: true,
          allowCoinGifts: true,
          moderationEnabled: true
        }
      },
      {
        name: '🌹 Romance Premium',
        description: 'ห้องแชทโรแมนติกสำหรับสมาชิกพรีเมียม',
        type: 'private',
        owner: owner._id,
        entryFee: 50,
        ageRestriction: {
          minAge: 21,
          maxAge: 45
        },
        settings: {
          maxMembers: 100,
          allowGifts: true,
          allowCoinGifts: true,
          moderationEnabled: true
        }
      },
      {
        name: '💼 Professional Network',
        description: 'เครือข่ายมืออาชีพ สำหรับการสร้างเครือข่ายทางธุรกิจ',
        type: 'private',
        owner: owner._id,
        entryFee: 200,
        ageRestriction: {
          minAge: 25,
          maxAge: 60
        },
        settings: {
          maxMembers: 75,
          allowGifts: false,
          allowCoinGifts: false,
          moderationEnabled: true
        }
      }
    ];

    // สร้างห้องแชททั้งหมด
    const allRooms = [...publicRooms, ...privateRooms];
    
    for (const roomData of allRooms) {
      const chatRoom = new ChatRoom(roomData);
      
      // เพิ่มเจ้าของเป็นสมาชิกแรก
      chatRoom.addMember(owner._id, 'owner');
      
      await chatRoom.save();
      console.log(`✅ Created ${roomData.type} room: ${roomData.name}`);
    }

    console.log(`🎉 Successfully created ${allRooms.length} chat rooms!`);
    console.log(`   - ${publicRooms.length} public rooms`);
    console.log(`   - ${privateRooms.length} private rooms`);

  } catch (error) {
    console.error('❌ Error creating default chat rooms:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// เรียกใช้ script
createDefaultChatRooms();
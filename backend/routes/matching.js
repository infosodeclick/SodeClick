const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// ฟังก์ชันคำนวณระยะทางระหว่างพิกัด (ใช้ Haversine formula ที่แม่นยำ)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  // ตรวจสอบว่ามีข้อมูลครบหรือไม่
  if (!lat1 || !lon1 || !lat2 || !lon2) {
    return 0;
  }

  // แปลงเป็นตัวเลข
  const lat1Num = parseFloat(lat1);
  const lon1Num = parseFloat(lon1);
  const lat2Num = parseFloat(lat2);
  const lon2Num = parseFloat(lon2);

  // ตรวจสอบความถูกต้องของพิกัด
  if (isNaN(lat1Num) || isNaN(lon1Num) || isNaN(lat2Num) || isNaN(lon2Num)) {
    return 0;
  }

  // ตรวจสอบขอบเขตพิกัด
  if (lat1Num < -90 || lat1Num > 90 || lat2Num < -90 || lat2Num > 90 ||
      lon1Num < -180 || lon1Num > 180 || lon2Num < -180 || lon2Num > 180) {
    return 0;
  }

  const R = 6371; // รัศมีโลกในกิโลเมตร
  const dLat = (lat2Num - lat1Num) * Math.PI / 180;
  const dLon = (lon2Num - lon1Num) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1Num * Math.PI / 180) * Math.cos(lat2Num * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  // ตรวจสอบว่าผลลัพธ์สมเหตุสมผลหรือไม่
  if (isNaN(distance) || distance < 0) {
    return 0;
  }
  
  return distance;
};

// ฟังก์ชันคำนวณความเข้ากันได้ด้วย AI (ไม่แสดง % แต่ใช้ในการเรียงลำดับ)
const calculateCompatibilityScore = (user, match, userLocation) => {
  let score = 0;
  const factors = [];

  // 1. ระยะทาง (40%)
  if (userLocation && match.gpsLocation) {
    const distance = calculateDistance(
      userLocation.lat, userLocation.lng,
      match.gpsLocation.lat, match.gpsLocation.lng
    );
    const distanceScore = Math.max(0, 40 - (distance / 40) * 40);
    score += distanceScore;
    factors.push({ 
      factor: 'ระยะทาง', 
      score: Math.round(distanceScore), 
      detail: `${distance.toFixed(1)} กม.` 
    });
  } else {
    // ถ้าไม่มีตำแหน่ง ให้คะแนนกลาง
    score += 20;
    factors.push({ 
      factor: 'ระยะทาง', 
      score: 20, 
      detail: 'ไม่ระบุตำแหน่ง' 
    });
  }

  // 2. อายุ (20%)
  if (user.dateOfBirth && match.dateOfBirth) {
    const userAge = Math.floor((new Date() - new Date(user.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
    const matchAge = Math.floor((new Date() - new Date(match.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
    const ageDiff = Math.abs(userAge - matchAge);
    const ageScore = Math.max(0, 20 - ageDiff * 2);
    score += ageScore;
    factors.push({ 
      factor: 'อายุ', 
      score: Math.round(ageScore), 
      detail: `ต่างกัน ${ageDiff} ปี` 
    });
  } else {
    // ถ้าไม่มีข้อมูลอายุ ให้คะแนนกลาง
    score += 10;
    factors.push({ 
      factor: 'อายุ', 
      score: 10, 
      detail: 'ไม่ระบุอายุ' 
    });
  }

  // 3. ความสนใจ (20%)
  if (user.interests && match.interests && user.interests.length > 0 && match.interests.length > 0) {
    const userInterestItems = user.interests.flatMap(interest => interest.items || []);
    const matchInterestItems = match.interests.flatMap(interest => interest.items || []);
    const commonInterests = userInterestItems.filter(interest => 
      matchInterestItems.includes(interest)
    );
    const interestScore = (commonInterests.length / Math.max(userInterestItems.length, matchInterestItems.length)) * 20;
    score += interestScore;
    factors.push({ 
      factor: 'ความสนใจ', 
      score: Math.round(interestScore), 
      detail: `${commonInterests.length} รายการร่วมกัน` 
    });
  }

  // 4. ไลฟ์สไตล์ (15%)
  if (user.lifestyle && match.lifestyle) {
    const lifestyleMatches = Object.keys(user.lifestyle).filter(key => 
      user.lifestyle[key] === match.lifestyle[key]
    );
    const lifestyleScore = (lifestyleMatches.length / Object.keys(user.lifestyle).length) * 15;
    score += lifestyleScore;
    factors.push({ 
      factor: 'ไลฟ์สไตล์', 
      score: Math.round(lifestyleScore), 
      detail: `${lifestyleMatches.length} ด้านตรงกัน` 
    });
  }

  // 5. ระดับสมาชิก (5%)
  // TODO: Calculate tier score based on actual membership levels
  const tierScore = 0; // Should calculate based on membership compatibility
  score += tierScore;
  factors.push({ 
    factor: 'ระดับสมาชิก', 
    score: tierScore, 
    detail: 'Premium' 
  });

  return { score: Math.round(score), factors };
};

// ฟังก์ชันตรวจสอบสถานะออนไลน์ของ user
const isUserOnline = (user) => {
  // ใช้ฟิลด์ isOnline ที่มีอยู่แล้วในฐานข้อมูล
  return user.isOnline === true;
};

// GET /api/matching/ai-matches - ดึง AI matches
router.get('/ai-matches', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      maxDistance = 40,
      minAge = 18,
      maxAge = 60,
      interests = [],
      lifestyle = [],
      lat,
      lng,
      refreshMode = false, // เพิ่มพารามิเตอร์สำหรับโหมด refresh
      onlineOnly = false // เพิ่มพารามิเตอร์สำหรับกรองผู้ใช้ออนไลน์เท่านั้น
    } = req.query;

    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    // กำหนดลำดับความสำคัญของ membership tier
    const membershipTierPriority = {
      'platinum': 7,
      'diamond': 6,
      'vip2': 5,
      'vip1': 4,
      'vip': 3,
      'gold': 2,
      'silver': 1,
      'member': 0
    };

    // ฟังก์ชันสุ่มตำแหน่งอาร์เรย์
    const shuffleArray = (array) => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    // ดึงข้อมูลผู้ใช้ทั้งหมดในระบบ (ยกเว้นตัวเอง)
    const allUsers = await User.find({ _id: { $ne: userId } })
      .select('_id firstName lastName displayName dateOfBirth profileImages gpsLocation interests lifestyle membership bio lastActive isActive lastLogin')
      .lean(); // ใช้ lean() เพื่อเพิ่มประสิทธิภาพ
    
    console.log('Found users:', allUsers.length);
    console.log('Current user membership tier:', user.membership?.tier || 'member');

    // จัดกลุ่มผู้ใช้ตาม membership tier
    const usersByTier = {};
    allUsers.forEach(userData => {
      const tier = userData.membership?.tier || 'member';
      if (!usersByTier[tier]) {
        usersByTier[tier] = [];
      }
      usersByTier[tier].push(userData);
    });

    // สุ่มตำแหน่งในแต่ละ tier
    Object.keys(usersByTier).forEach(tier => {
      usersByTier[tier] = shuffleArray(usersByTier[tier]);
    });

    // กำหนดลำดับการแสดงผลตาม membership tier ของผู้ใช้ปัจจุบัน
    const currentUserTier = user.membership?.tier || 'member';
    const currentUserPriority = membershipTierPriority[currentUserTier] || 0;
    
    let selectedUsers = [];
    let currentTierPriority = currentUserPriority;
    const maxUsers = parseInt(limit) * 2; // ดึงมากกว่า limit เพื่อให้มีตัวเลือกมากขึ้น

    // ถ้าเป็นโหมด refresh ให้เริ่มจากระดับที่ต่ำกว่า
    if (refreshMode === 'true') {
      // เริ่มจากระดับต่ำกว่า 1 ระดับ
      currentTierPriority = Math.max(0, currentUserPriority - 1);
    }

    // เริ่มจากระดับที่กำหนด
    while (selectedUsers.length < maxUsers && currentTierPriority >= 0) {
      const tierName = Object.keys(membershipTierPriority).find(tier => 
        membershipTierPriority[tier] === currentTierPriority
      );
      
      if (tierName && usersByTier[tierName]) {
        const availableUsers = usersByTier[tierName].filter(u => 
          !selectedUsers.some(su => su._id.toString() === u._id.toString())
        );
        
        // เพิ่มผู้ใช้จาก tier นี้
        selectedUsers.push(...availableUsers.slice(0, maxUsers - selectedUsers.length));
      }
      
      currentTierPriority--;
    }

    // ถ้ายังไม่ครบ ให้ไประดับที่สูงกว่า
    if (selectedUsers.length < maxUsers) {
      currentTierPriority = (refreshMode === 'true' ? Math.max(0, currentUserPriority - 1) : currentUserPriority) + 1;
      while (selectedUsers.length < maxUsers && currentTierPriority <= 7) {
        const tierName = Object.keys(membershipTierPriority).find(tier => 
          membershipTierPriority[tier] === currentTierPriority
        );
        
        if (tierName && usersByTier[tierName]) {
          const availableUsers = usersByTier[tierName].filter(u => 
            !selectedUsers.some(su => su._id.toString() === u._id.toString())
          );
          
          selectedUsers.push(...availableUsers.slice(0, maxUsers - selectedUsers.length));
        }
        
        currentTierPriority++;
      }
    }

    // สุ่มตำแหน่งสุดท้าย
    selectedUsers = shuffleArray(selectedUsers);

    // ใช้ตำแหน่งปัจจุบันจาก frontend หรือตำแหน่งที่เก็บไว้ในฐานข้อมูล
    const currentLocation = lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : user.gpsLocation;
    
    // ตรวจสอบว่าผู้ใช้มีตำแหน่งหรือไม่
    if (!currentLocation) {
      // ถ้าไม่มีตำแหน่ง ให้ส่งข้อมูลแบบไม่มีระยะทาง
      const usersWithScore = selectedUsers.map(match => {
        const compatibility = calculateCompatibilityScore(user, match, null);
        
        // คำนวณอายุ
        const age = match.dateOfBirth 
          ? Math.floor((new Date() - new Date(match.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
          : 25; // ค่าเริ่มต้น

        return {
          ...match,
          name: match.displayName || `${match.firstName || ''} ${match.lastName || ''}`.trim() || 'ผู้ใช้',
          age: age,
          compatibilityScore: compatibility.score,
          compatibilityFactors: compatibility.factors,
          distance: 0,
          distanceText: 'ไม่ระบุ',
          membershipTier: match.membership?.tier || 'member',
          likeCount: 0, // ตั้งค่าเริ่มต้นเป็น 0
          isActive: isUserOnline(match), // ตรวจสอบสถานะออนไลน์จริง
          lastActive: match.lastActive
        };
      });

      const filteredUsers = usersWithScore
        .filter(match => {
          // ถ้าเปิดใช้ onlineOnly ให้แสดงเฉพาะผู้ใช้ออนไลน์
          if (onlineOnly === 'true' || onlineOnly === true) {
            return match.isActive === true;
          }
          // แสดงผู้ใช้ทั้งหมดในระบบ (รวมผู้ใช้ที่ไม่ได้ active)
          return true;
        })
        .sort((a, b) => {
          // ถ้าไม่มีระยะทาง ให้เรียงตามความเข้ากันได้
          if (!a.distance && !b.distance) {
            return (b.compatibilityScore || 0) - (a.compatibilityScore || 0);
          }
          if (!a.distance) return 1;
          if (!b.distance) return -1;
          
          // เรียงตามระยะทางก่อน (ใกล้ที่สุดก่อน)
          if (Math.abs(a.distance - b.distance) > 0.1) {
            return a.distance - b.distance;
          }
          
          // ถ้าระยะทางใกล้เคียงกัน ให้เรียงตามความเข้ากันได้
          return (b.compatibilityScore || 0) - (a.compatibilityScore || 0);
        })
        .slice(0, parseInt(limit));

      return res.json({
        success: true,
        data: {
          matches: filteredUsers,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: selectedUsers.length,
            hasMore: false
          },
          stats: {
            totalMatches: selectedUsers.length,
            averageDistance: 0,
            averageScore: filteredUsers.length > 0 
              ? Math.round(filteredUsers.reduce((sum, match) => sum + match.compatibilityScore, 0) / filteredUsers.length)
              : 0
          }
        }
      });
    }

    // คำนวณความเข้ากันได้และระยะทาง
    const usersWithScore = selectedUsers.map(match => {
      const compatibility = calculateCompatibilityScore(user, match, currentLocation);
      
      let distance = 0;
      let distanceText = 'ไม่ระบุ';
      
      if (currentLocation && match.gpsLocation) {
        distance = calculateDistance(
          currentLocation.lat, currentLocation.lng,
          match.gpsLocation.lat, match.gpsLocation.lng
        );
        
        // แสดงระยะทางที่แม่นยำ
        if (distance < 0.1) {
          distanceText = `${Math.round(distance * 1000)} ม.`;
        } else if (distance < 1) {
          distanceText = `${Math.round(distance * 1000)} ม.`;
        } else if (distance < 10) {
          distanceText = `${distance.toFixed(1)} กม.`;
        } else {
          distanceText = `${Math.round(distance)} กม.`;
        }
      } else if (!currentLocation) {
        distanceText = 'คุณยังไม่ได้ตั้งค่าตำแหน่ง';
      } else if (!match.gpsLocation) {
        distanceText = 'ผู้ใช้นี้ยังไม่ได้ตั้งค่าตำแหน่ง';
      }

      // คำนวณอายุ
      const age = match.dateOfBirth 
        ? Math.floor((new Date() - new Date(match.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
        : 25; // ค่าเริ่มต้น

      return {
        ...match,
        name: match.displayName || `${match.firstName || ''} ${match.lastName || ''}`.trim() || 'ผู้ใช้',
        age: age,
        compatibilityScore: compatibility.score,
        compatibilityFactors: compatibility.factors,
        distance: distance,
        distanceText: distanceText,
        membershipTier: match.membership?.tier || 'member',
        likeCount: 0, // ตั้งค่าเริ่มต้นเป็น 0
        isActive: isUserOnline(match), // ตรวจสอบสถานะออนไลน์จริง
        lastActive: match.lastActive
      };
    });

    // เรียงลำดับตามระยะทาง (ใกล้ที่สุดก่อน) และความเข้ากันได้
    const filteredUsers = usersWithScore
      .filter(match => {
        // ถ้าเปิดใช้ onlineOnly ให้แสดงเฉพาะผู้ใช้ออนไลน์
        if (onlineOnly === 'true' || onlineOnly === true) {
          return match.isActive === true;
        }
        // แสดงผู้ใช้ทั้งหมดในระบบ (รวมผู้ใช้ที่ไม่ได้ active)
        return true;
      })
      .sort((a, b) => {
        // ถ้าไม่มีระยะทาง ให้เรียงตามความเข้ากันได้
        if (!a.distance && !b.distance) {
          return (b.compatibilityScore || 0) - (a.compatibilityScore || 0);
        }
        if (!a.distance) return 1;
        if (!b.distance) return -1;
        
        // เรียงตามระยะทางก่อน (ใกล้ที่สุดก่อน)
        if (Math.abs(a.distance - b.distance) > 0.1) {
          return a.distance - b.distance;
        }
        
        // ถ้าระยะทางใกล้เคียงกัน ให้เรียงตามความเข้ากันได้
        return (b.compatibilityScore || 0) - (a.compatibilityScore || 0);
      })
      .slice(0, parseInt(limit));

    // นับจำนวนทั้งหมด (แบบง่าย)
    const totalCount = selectedUsers.length;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    console.log('Filtered users:', filteredUsers.length);
    console.log('Sample user:', filteredUsers[0]);

    res.json({
      success: true,
      data: {
        matches: filteredUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          hasMore: skip + filteredUsers.length < totalCount
        },
        stats: {
          totalMatches: totalCount,
          averageDistance: filteredUsers.length > 0 
            ? (filteredUsers.reduce((sum, match) => sum + match.distance, 0) / filteredUsers.length).toFixed(1)
            : 0,
          averageScore: filteredUsers.length > 0 
            ? Math.round(filteredUsers.reduce((sum, match) => sum + match.compatibilityScore, 0) / filteredUsers.length)
            : 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching AI matches:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล matches'
    });
  }
});

// POST /api/matching/like - กดไลค์/ยกเลิกไลค์ match
router.post('/like', auth, async (req, res) => {
  try {
    const { matchId, action = 'like' } = req.body;
    const userId = req.user.id;

    if (!matchId) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ matchId'
      });
    }

    // ตรวจสอบว่าผู้ใช้ที่ถูกไลค์มีอยู่จริง
    const matchUser = await User.findById(matchId);
    if (!matchUser) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้ที่ระบุ'
      });
    }

    // ตรวจสอบว่าไลค์ตัวเองไม่ได้
    if (userId === matchId) {
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถไลค์ตัวเองได้'
      });
    }

    // ตรวจสอบว่าเคยไลค์แล้วหรือไม่
    const existingLike = await User.findOne({
      _id: userId,
      likes: matchId
    });

    if (action === 'like') {
      // การไลค์
      if (existingLike) {
        return res.status(400).json({
          success: false,
          message: 'คุณได้ไลค์ผู้ใช้นี้แล้ว'
        });
      }

      // เพิ่มไลค์
      await User.findByIdAndUpdate(userId, {
        $addToSet: { likes: matchId }
      });

      // นับจำนวนคนที่กดไลค์ matchId
      const likeCount = await User.countDocuments({
        likes: matchId
      });

      // ตรวจสอบว่าเป็น mutual like หรือไม่
      const isMutualLike = await User.findOne({
        _id: matchId,
        likes: userId
      });

      if (isMutualLike) {
        // สร้าง notification สำหรับ mutual like
        // ในระบบจริงจะส่ง notification
        console.log(`Mutual like between ${userId} and ${matchId}`);
      }

      res.json({
        success: true,
        message: 'ไลค์สำเร็จ',
        data: {
          isMutualLike: !!isMutualLike,
          status: 1, // บันทึกสถานะเป็น 1
          likeCount: likeCount
        }
      });

    } else if (action === 'unlike') {
      // การยกเลิกไลค์
      if (!existingLike) {
        return res.status(400).json({
          success: false,
          message: 'คุณยังไม่ได้ไลค์ผู้ใช้นี้'
        });
      }

      // ลบไลค์
      await User.findByIdAndUpdate(userId, {
        $pull: { likes: matchId }
      });

      // นับจำนวนคนที่กดไลค์ matchId
      const likeCount = await User.countDocuments({
        likes: matchId
      });

      res.json({
        success: true,
        message: 'ยกเลิกไลค์สำเร็จ',
        data: {
          status: 0, // บันทึกสถานะเป็น 0
          likeCount: likeCount
        }
      });

    } else {
      return res.status(400).json({
        success: false,
        message: 'action ไม่ถูกต้อง (ต้องเป็น like หรือ unlike)'
      });
    }

  } catch (error) {
    console.error('Error handling like/unlike:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการจัดการไลค์'
    });
  }
});

// GET /api/matching/liked-users - ดึงรายการผู้ใช้ที่ไลค์แล้ว
router.get('/liked-users', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // ดึงข้อมูลผู้ใช้ปัจจุบันพร้อมรายการ likes
    const user = await User.findById(userId).select('likes');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    // ส่งกลับรายการ ID ของผู้ใช้ที่ไลค์แล้ว
    res.json({
      success: true,
      message: 'ดึงรายการไลค์สำเร็จ',
      data: user.likes || []
    });

  } catch (error) {
    console.error('Error fetching liked users:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงรายการไลค์'
    });
  }
});

// POST /api/matching/send-message - ส่งข้อความ
router.post('/send-message', auth, async (req, res) => {
  try {
    const { matchId } = req.body;
    const userId = req.user.id;

    if (!matchId) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ matchId'
      });
    }

    // ตรวจสอบว่าผู้ใช้ที่ส่งข้อความมีอยู่จริง
    const matchUser = await User.findById(matchId);
    if (!matchUser) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้ที่ระบุ'
      });
    }

    // ตรวจสอบว่าไม่ส่งข้อความให้ตัวเอง
    if (userId === matchId) {
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถส่งข้อความให้ตัวเองได้'
      });
    }

    // ในระบบจริงจะสร้างข้อความหรือเปิดแชท
    // สำหรับตอนนี้ให้ส่ง success response
    res.json({
      success: true,
      message: 'ส่งข้อความสำเร็จ',
      data: {
        matchId: matchId,
        message: 'ข้อความถูกส่งแล้ว'
      }
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการส่งข้อความ'
    });
  }
});

// POST /api/matching/unlike - ยกเลิกไลค์
router.post('/unlike', auth, async (req, res) => {
  try {
    const { matchId } = req.body;
    const userId = req.user.id;

    if (!matchId) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ matchId'
      });
    }

    // ลบไลค์
    await User.findByIdAndUpdate(userId, {
      $pull: { likes: matchId }
    });

    res.json({
      success: true,
      message: 'ยกเลิกไลค์สำเร็จ'
    });

  } catch (error) {
    console.error('Error unliking match:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการยกเลิกไลค์'
    });
  }
});

// GET /api/matching/mutual-likes - ดึง mutual likes
router.get('/mutual-likes', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // ดึงผู้ใช้ที่ mutual like
    const mutualLikes = await User.aggregate([
      {
        $match: {
          _id: { $ne: userId },
          likes: userId
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $unwind: '$userDetails'
      },
      {
        $match: {
          'userDetails.likes': userId
        }
      },
      {
        $project: {
          _id: 1,
          name: '$userDetails.displayName',
          age: '$userDetails.dateOfBirth',
          profileImages: '$userDetails.profileImages',
          gpsLocation: '$userDetails.gpsLocation',
          interests: '$userDetails.interests',
          lifestyle: '$userDetails.lifestyle',
          membershipTier: '$userDetails.membership.tier',
          bio: '$userDetails.bio',
          lastActive: '$userDetails.lastActive'
        }
      },
      {
        $skip: skip
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    // นับจำนวนทั้งหมด
    const totalCount = await User.aggregate([
      {
        $match: {
          _id: { $ne: userId },
          likes: userId
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $unwind: '$userDetails'
      },
      {
        $match: {
          'userDetails.likes': userId
        }
      },
      {
        $count: 'total'
      }
    ]);

    res.json({
      success: true,
      data: {
        mutualLikes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount[0]?.total || 0,
          hasMore: skip + mutualLikes.length < (totalCount[0]?.total || 0)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching mutual likes:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล mutual likes'
    });
  }
});

// PUT /api/matching/update-location - อัปเดตตำแหน่ง
router.put('/update-location', auth, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const userId = req.user.id;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุตำแหน่ง (lat, lng)'
      });
    }

    // อัปเดตตำแหน่ง
    await User.findByIdAndUpdate(userId, {
      gpsLocation: { lat: parseFloat(lat), lng: parseFloat(lng) },
      lastLocationUpdate: new Date()
    });

    res.json({
      success: true,
      message: 'อัปเดตตำแหน่งสำเร็จ'
    });

  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปเดตตำแหน่ง'
    });
  }
});

// GET /api/matching/last-location - ดึงตำแหน่งล่าสุด
router.get('/last-location', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('gpsLocation lastLocationUpdate');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    res.json({
      success: true,
      data: {
        gpsLocation: user.gpsLocation,
        lastLocationUpdate: user.lastLocationUpdate
      }
    });

  } catch (error) {
    console.error('Error getting last location:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลตำแหน่ง'
    });
  }
});

module.exports = router;

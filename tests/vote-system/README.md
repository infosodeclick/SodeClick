# Vote System Tests

โฟลเดอร์นี้ประกอบด้วยไฟล์ test สำหรับระบบโหวตในแอปพลิเคชัน SodeClick

## 📁 โครงสร้างไฟล์

```
tests/
└── vote-system/
    ├── test-vote-consistency.js      # ทดสอบความสอดคล้องกันของระบบโหวต
    ├── test-premium-vote-display.js  # ทดสอบการแสดงคะแนนโหวตในหน้าพรีเมียม
    └── README.md                     # เอกสารนี้
```

## 🧪 ไฟล์ Test

### 1. test-vote-consistency.js
**วัตถุประสงค์**: ทดสอบความสอดคล้องกันของระบบโหวต

**สิ่งที่ทดสอบ**:
- Vote Status API (`/api/vote/status/:candidateId`)
- Vote Ranking API (`/api/vote/ranking`)
- เปรียบเทียบข้อมูลระหว่าง API ทั้งสอง
- ทดสอบ voteType ต่างๆ

**วิธีการรัน**:
```bash
cd tests/vote-system
node test-vote-consistency.js
```

### 2. test-premium-vote-display.js
**วัตถุประสงค์**: ทดสอบการแสดงคะแนนโหวตในหน้าพรีเมียม

**สิ่งที่ทดสอบ**:
- Premium User Vote Status
- HeartVote Component Data
- API Endpoint Response
- Vote Data Structure

**วิธีการรัน**:
```bash
cd tests/vote-system
node test-premium-vote-display.js
```

## 🔧 การใช้งาน

### Prerequisites
- Node.js installed
- Backend server running on `http://localhost:5000`
- Database connected

### การรัน Test
```bash
# รัน test ทั้งหมด
cd tests/vote-system
node test-vote-consistency.js
node test-premium-vote-display.js

# หรือรันทีละไฟล์
node test-vote-consistency.js
node test-premium-vote-display.js
```

## 📊 ผลลัพธ์ที่คาดหวัง

### test-vote-consistency.js
- ✅ Vote Status API Response
- ✅ Vote Ranking API Response  
- ✅ Data Consistency Check
- ✅ Vote Types Comparison

### test-premium-vote-display.js
- ✅ Premium User Vote Status
- ✅ Vote Data Check
- ✅ HeartVote Component Data
- ✅ API Endpoint Test

## 🐛 การ Debug

### หาก Test ล้มเหลว
1. ตรวจสอบว่า backend server ทำงานอยู่
2. ตรวจสอบ database connection
3. ตรวจสอบ API endpoints
4. ดู console logs สำหรับรายละเอียด

### หากข้อมูลไม่สอดคล้องกัน
1. ตรวจสอบ VoteTransaction collection
2. ตรวจสอบ voteType ที่ใช้
3. ตรวจสอบการคำนวณคะแนน
4. ตรวจสอบ real-time updates

## 📝 การบำรุงรักษา

### เมื่อไหร่ที่ควรรัน Test
- หลังการแก้ไขระบบโหวต
- เมื่อพบปัญหาในระบบโหวต
- ก่อนการ deploy
- เมื่อมีการอัปเดต API

### การอัปเดต Test
- อัปเดต test เมื่อมีการเปลี่ยนแปลง API
- เพิ่ม test cases เมื่อมีฟีเจอร์ใหม่
- ตรวจสอบ test เป็นประจำ

## 🔗 Related Files

- `backend/routes/vote.js` - Vote API endpoints
- `backend/models/VoteTransaction.js` - Vote data model
- `frontend/src/components/HeartVote.jsx` - Vote display component
- `frontend/src/components/MembershipDashboard.jsx` - Premium dashboard
- `frontend/src/services/voteAPI.js` - Vote API service

## 📞 การติดต่อ

หากพบปัญหาหรือต้องการความช่วยเหลือ กรุณาติดต่อทีมพัฒนา

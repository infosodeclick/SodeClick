# คู่มือการรัน Development Environment

## วิธีการรัน Development Server

### วิธีที่ 1: ใช้ npm run dev (แนะนำ)
```bash
npm run dev
```

คำสั่งนี้จะ:
1. คัดลอกไฟล์ `env.development` ไปเป็น `.env` ใน frontend และ backend อัตโนมัติ
2. เปิด Backend server (http://localhost:5000)
3. เปิด Frontend server (http://localhost:5173)
4. แสดง output ของทั้งสองตัวพร้อมกัน

กด `Ctrl+C` เพื่อหยุดทั้งสอง servers

### วิธีที่ 2: ใช้ไฟล์ Batch (Windows)
```bash
.\dev.bat
```

จะเปิด Backend และ Frontend ในหน้าต่างแยกกัน

### วิธีที่ 3: รันแยกแต่ละส่วน

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## การแก้ไขปัญหาที่พบบ่อย

### ปัญหา: Error "Cannot find module @rollup/rollup-win32-x64-msvc"

**วิธีแก้:**
```bash
# ลบ node_modules และ package-lock.json ใน frontend
cd frontend
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json

# ติดตั้ง dependencies ใหม่
npm install

# กลับไปที่ root directory
cd ..

# รันอีกครั้ง
npm run dev
```

### ปัญหา: Port ถูกใช้งานอยู่แล้ว

**วิธีแก้:**
```bash
# หา process ที่ใช้ port 5000 (Backend)
netstat -ano | findstr :5000

# หา process ที่ใช้ port 5173 (Frontend)
netstat -ano | findstr :5173

# ปิด process (แทน PID ด้วย process ID ที่ได้)
taskkill /PID <PID> /F
```

### ปัญหา: Environment variables ไม่ถูกโหลด

**วิธีแก้:**
```bash
# รัน copy-env อีกครั้ง
npm run copy-env

# หรือคัดลอกด้วยมือ
copy frontend\env.development frontend\.env
copy backend\env.development backend\.env
```

## คำสั่งที่มีให้ใช้งาน

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `npm run dev` | รัน development servers ทั้งสอง |
| `npm run dev:frontend` | รันแค่ frontend |
| `npm run dev:backend` | รันแค่ backend |
| `npm run copy-env` | คัดลอกไฟล์ environment |
| `npm run dev:concurrent` | รัน servers โดยไม่ copy env |
| `npm run install-all` | ติดตั้ง dependencies ทั้งหมด |
| `npm run build` | Build frontend สำหรับ production |
| `npm run start:production` | รัน production mode |

## ตรวจสอบว่า Server รันอยู่

### ตรวจสอบด้วย Browser:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000 หรือ http://localhost:5000/api

### ตรวจสอบด้วย PowerShell:
```powershell
# ดู node processes ที่กำลังรัน
Get-Process node

# ตรวจสอบ ports ที่ใช้งาน
netstat -ano | findstr :5000
netstat -ano | findstr :5173
```

## โครงสร้าง Project

```
SodeClick/
├── backend/           # Express.js + MongoDB backend
│   ├── env.development
│   ├── package.json
│   └── server.js
├── frontend/          # React + Vite + TailwindCSS frontend
│   ├── env.development
│   ├── package.json
│   └── vite.config.ts
├── scripts/           # Helper scripts
│   ├── copy-env.js
│   ├── dev-simple.js
│   └── dev-windows-fixed.js
├── package.json       # Root package.json
└── dev.bat           # Windows batch file
```

## Tips

1. **ใช้ git bash หรือ WSL** - ถ้ามีปัญหากับ PowerShell
2. **ตรวจสอบ Node.js version** - แนะนำ v18 หรือ v20
3. **ตรวจสอบ MongoDB** - ต้องมี MongoDB running สำหรับ backend
4. **Clear cache** - ถ้ามีปัญหา ลอง clear npm cache: `npm cache clean --force`

## การติดตั้งครั้งแรก

```bash
# ติดตั้ง dependencies ทั้งหมด
npm run install-all

# คัดลอก environment files
npm run copy-env

# รัน development server
npm run dev
```


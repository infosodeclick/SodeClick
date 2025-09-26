import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'
import { X, Zap, Gift, Coins, Star, Heart, Trophy, Diamond, Timer } from 'lucide-react'

const SpinWheelModal = ({ isOpen, onClose, onSpin, isLoading, canSpin, userRole }) => {
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [selectedPrize, setSelectedPrize] = useState(null)
  const [hasSpun, setHasSpun] = useState(false)
  const wheelRef = useRef(null)
  const spinTimeoutRef = useRef(null)

  // รางวัลในวงล้อ (จัดเรียงตามตำแหน่งในล้อ เริ่มจากด้านบนตามเข็มนาฬิกา)
  const prizes = [
    { id: 1, name: '200 เหรียญ', type: 'coins', amount: 200, color: '#FF6347', icon: Coins },
    { id: 2, name: '100 เหรียญ', type: 'coins', amount: 100, color: '#FFA500', icon: Coins },
    { id: 3, name: '50 เหรียญ', type: 'coins', amount: 50, color: '#FFD700', icon: Coins },
    { id: 4, name: 'รางวัลใหญ่', type: 'grand', amount: 1, color: '#00CED1', icon: Trophy },
    { id: 5, name: 'หัวใจพิเศษ', type: 'hearts', amount: 5, color: '#FF69B4', icon: Heart },
    { id: 6, name: 'โบนัสพิเศษ', type: 'bonus', amount: 1, color: '#FF1493', icon: Gift },
    { id: 7, name: '100 คะแนนโหวต', type: 'votePoints', amount: 100, color: '#8A2BE2', icon: Star },
    { id: 8, name: '50 คะแนนโหวต', type: 'votePoints', amount: 50, color: '#9370DB', icon: Star }
  ]

  const handleSpin = () => {
    if (isSpinning) return

    setIsSpinning(true)
    setSelectedPrize(null)
    setHasSpun(true)

    // เพิ่มเอฟเฟกต์การสั่นของปุ่ม
    const button = document.querySelector('.spin-button')
    if (button) {
      button.classList.add('animate-pulse')
    }

    // สุ่มรางวัล
    const randomPrize = prizes[Math.floor(Math.random() * prizes.length)]
    
    // คำนวณการหมุน (5-10 รอบ + หยุดที่รางวัลที่เลือก)
    const spins = 5 + Math.random() * 5
    const prizeIndex = prizes.findIndex(p => p.id === randomPrize.id)
    const segmentAngle = 360 / prizes.length
    const prizeAngle = segmentAngle * prizeIndex
    // หยุดที่ตำแหน่งที่รางวัลอยู่ด้านบน (ตรงกับเข็ม)
    // หมุนเพิ่ม 180 องศาเพื่อให้รางวัลอยู่ตรงข้ามกับเข็ม แล้วหมุนกลับมาที่ตำแหน่งที่ถูกต้อง
    const finalRotation = rotation + (spins * 360) + (180 - prizeAngle)

    // เริ่มการหมุน
    setRotation(finalRotation)

    // หยุดการหมุนหลังจาก 5 วินาที
    spinTimeoutRef.current = setTimeout(() => {
      setIsSpinning(false)
      setSelectedPrize(randomPrize)
      
      // ลบเอฟเฟกต์การสั่น
      if (button) {
        button.classList.remove('animate-pulse')
      }
      
      // ไม่เรียก API ที่นี่ ให้รอจนกว่าจะกดปุ่ม "ตกลง"
    }, 5000)
  }

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setIsSpinning(false)
      setSelectedPrize(null)
      setRotation(0)
      setHasSpun(false)
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current)
      }
    }
  }, [isOpen])

  const renderWheel = () => {
    const segmentAngle = 360 / prizes.length
    const radius = 150
    const centerX = 160
    const centerY = 160

    return (
      <div className="relative w-80 h-80 mx-auto">
        {/* เอฟเฟกต์แสงรอบวงล้อเมื่อกำลังหมุน */}
        {isSpinning && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 opacity-30 animate-pulse blur-xl"></div>
        )}
        
        {/* เอฟเฟกต์แสงเพิ่มเติมเมื่อกำลังหมุน */}
        {isSpinning && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-300 via-orange-300 to-red-300 opacity-20 animate-ping blur-2xl"></div>
        )}
        
        {/* เอฟเฟกต์แสงเพิ่มเติมเมื่อกำลังหมุน */}
        {isSpinning && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-200 via-orange-200 to-red-200 opacity-15 animate-ping blur-3xl"></div>
        )}
        
        {/* เข็มชี้ */}
        <div className={`absolute -top-4 left-1/2 transform -translate-x-1/2 z-20 ${
          isSpinning ? 'animate-pulse' : ''
        }`}>
          {/* จุดเชื่อมต่อ */}
          <div className={`w-3 h-3 rounded-full mx-auto mb-1 drop-shadow-lg border-2 border-white ${
            isSpinning ? 'bg-red-500 animate-pulse' : 'bg-red-600'
          }`}></div>
          
          {/* เข็มหลัก */}
          <div className={`w-0 h-0 border-l-[12px] border-r-[12px] border-t-[25px] border-l-transparent border-r-transparent drop-shadow-lg ${
            isSpinning ? 'border-t-red-500' : 'border-t-red-600'
          }`}></div>
          
          {/* เงาเข็ม */}
          <div className="absolute top-1 left-1 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[25px] border-l-transparent border-r-transparent opacity-30"></div>
        </div>

        {/* วงล้อ SVG */}
        <svg 
          ref={wheelRef}
          className={`w-full h-full transition-transform duration-5000 ease-out ${
            isSpinning ? 'animate-pulse ring-4 ring-yellow-400 ring-opacity-50' : ''
          }`}
          style={{ 
            transform: `rotate(${rotation}deg)`,
            transitionDuration: isSpinning ? '5s' : '0s',
            transitionTimingFunction: isSpinning ? 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'ease-out'
          }}
          viewBox="0 0 320 320"
        >
          {/* วงล้อเงา */}
          <circle 
            cx={centerX + 3} 
            cy={centerY + 3} 
            r={radius} 
            fill="none" 
            stroke="rgba(0,0,0,0.2)" 
            strokeWidth="4"
          />
          
          {/* วงล้อพื้นหลัง */}
          <circle 
            cx={centerX} 
            cy={centerY} 
            r={radius} 
            fill="none" 
            stroke="#d1d5db" 
            strokeWidth="4"
            className="drop-shadow-2xl"
          />
          
          {/* ส่วนของรางวัล */}
          {prizes.map((prize, index) => {
            const startAngle = (segmentAngle * index - 90) * (Math.PI / 180)
            const endAngle = (segmentAngle * (index + 1) - 90) * (Math.PI / 180)
            
            const x1 = centerX + radius * Math.cos(startAngle)
            const y1 = centerY + radius * Math.sin(startAngle)
            const x2 = centerX + radius * Math.cos(endAngle)
            const y2 = centerY + radius * Math.sin(endAngle)
            
            const largeArcFlag = segmentAngle > 180 ? 1 : 0
            
            const pathData = [
              `M ${centerX} ${centerY}`,
              `L ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              'Z'
            ].join(' ')

            const IconComponent = prize.icon
            const textAngle = (segmentAngle * index + segmentAngle / 2 - 90) * (Math.PI / 180)
            const textRadius = radius * 0.7
            const textX = centerX + textRadius * Math.cos(textAngle)
            const textY = centerY + textRadius * Math.sin(textAngle)

            return (
              <g key={prize.id}>
                {/* เงาส่วนรางวัล */}
                <path
                  d={pathData}
                  fill={prize.color}
                  opacity="0.8"
                  transform="translate(2, 2)"
                />
                {/* ส่วนรางวัลหลัก */}
                <path
                  d={pathData}
                  fill={prize.color}
                  className={isSpinning ? 'animate-pulse' : ''}
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="1"
                />
                <text
                  x={textX}
                  y={textY + 8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-white font-bold text-xs fill-current"
                  style={{ fontSize: '10px', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                >
                  {prize.name}
                </text>
                <foreignObject
                  x={textX - 12}
                  y={textY - 20}
                  width="24"
                  height="24"
                >
                  <div className="flex justify-center">
                    <IconComponent className={`w-5 h-5 text-white drop-shadow ${isSpinning ? 'animate-bounce' : ''}`} />
                  </div>
                </foreignObject>
              </g>
            )
          })}
          
          {/* เงาจุดศูนย์กลาง */}
          <circle 
            cx={centerX + 2} 
            cy={centerY + 2} 
            r="32" 
            fill="white" 
            stroke="rgba(0,0,0,0.2)" 
            strokeWidth="4"
          />
          
          {/* จุดศูนย์กลาง */}
          <circle 
            cx={centerX} 
            cy={centerY} 
            r="32" 
            fill="white" 
            stroke="#d1d5db" 
            strokeWidth="4"
            className={`drop-shadow-lg ${isSpinning ? 'animate-pulse ring-2 ring-yellow-400' : ''}`}
          />
          
          {/* วงกลมในจุดศูนย์กลาง */}
          <circle 
            cx={centerX} 
            cy={centerY} 
            r="24" 
            fill="none" 
            stroke="rgba(0,0,0,0.1)" 
            strokeWidth="1"
          />
          
          <foreignObject
            x={centerX - 16}
            y={centerY - 16}
            width="32"
            height="32"
          >
            <div className="flex items-center justify-center w-full h-full">
              <Zap className={`w-8 h-8 ${isSpinning ? 'text-yellow-600 animate-spin' : 'text-yellow-500'}`} />
            </div>
          </foreignObject>
        </svg>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-md backdrop-blur-md border shadow-2xl rounded-2xl p-6 ${
        isSpinning 
          ? 'bg-gradient-to-br from-yellow-50/95 to-orange-50/95 border-yellow-200 ring-4 ring-yellow-300 ring-opacity-30 animate-pulse' 
          : 'bg-white/95 border-white/20'
      }`}>
        <DialogHeader>
          <DialogTitle className={`text-2xl font-bold text-center mb-4 ${
            isSpinning 
              ? 'text-yellow-700 animate-pulse' 
              : 'text-gray-800'
          }`}>
            🎰 วงล้อแห่งโชคชะตา
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600">
            หมุนวงล้อเพื่อรับรางวัลพิเศษและโบนัสต่างๆ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* วงล้อ */}
          {renderWheel()}

          {/* ปุ่มหมุน */}
          <div className="text-center">
            <Button
              onClick={handleSpin}
              disabled={isSpinning || isLoading || (hasSpun && userRole !== 'superadmin' && userRole !== 'admin')}
              className={`spin-button px-8 py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ${
                isSpinning 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white animate-pulse ring-4 ring-yellow-300' 
                  : hasSpun && userRole !== 'superadmin' && userRole !== 'admin'
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white'
              }`}
            >
              {isSpinning ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  กำลังหมุน...
                </div>
              ) : isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  กำลังประมวลผล...
                </div>
              ) : hasSpun && userRole !== 'superadmin' && userRole !== 'admin' ? (
                <div className="flex items-center">
                  <Timer className="w-5 h-5 mr-2" />
                  รอ 24 ชม.
                </div>
              ) : (
                <div className="flex items-center">
                  <Zap className="w-5 h-5 mr-2" />
                  หมุนวงล้อ
                </div>
              )}
            </Button>
          </div>

                  {/* แสดงรางวัลที่ได้ */}
        {selectedPrize && (
          <div className="text-center p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-300 shadow-lg animate-pulse">
            <div className="text-2xl mb-3">🎉</div>
            <div className="text-xl font-bold text-green-800 mb-2">
              ยินดีด้วย!
            </div>
            <div className="text-2xl font-bold text-green-600 mb-2">
              คุณได้รับ:
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              {selectedPrize.name}
            </div>
            <div className="mt-3 text-sm text-green-600 mb-4">
              รางวัลจะถูกเพิ่มเข้าบัญชีของคุณทันที!
            </div>
            <Button
              onClick={async () => {
                // เรียก API เพื่อรับรางวัล
                await onSpin(selectedPrize)
                // ปิด modal หลังจากรับรางวัลแล้ว
                onClose()
              }}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              ตกลง
            </Button>
          </div>
        )}

          {/* คำแนะนำ */}
          <div className={`text-center text-sm ${
            isSpinning ? 'text-yellow-700 animate-pulse' : 'text-gray-600'
          }`}>
            <p>💡 กดปุ่มหมุนวงล้อเพื่อรับรางวัลพิเศษ!</p>
            <p className="mt-1">
              {(userRole === 'superadmin' || userRole === 'admin') 
                ? '⚡ สามารถหมุนได้ไม่จำกัด' 
                : '⏰ สามารถหมุนได้ทุก 24 ชั่วโมง'
              }
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SpinWheelModal

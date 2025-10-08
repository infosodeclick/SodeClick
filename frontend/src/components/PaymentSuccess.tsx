import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import {
  CheckCircle,
  Crown,
  Star,
  Gift,
  ArrowRight,
  Download,
  Share2,
  AlertCircle,
  RefreshCw,
  Coins,
  Vote,
  Zap,
  Shield,
  TrendingUp
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
// @ts-ignore
import { membershipHelpers } from '../services/membershipAPI'

interface TransactionData {
  transactionId: string
  amount: number
  currency: string
  paymentMethod?: string
  timestamp: string | Date
}

interface PlanFeatures {
  dailyChats: number
  dailyBonus: number
  specialFeatures: Array<{ description: string }>
  bonusCoins: number
}

interface PlanRewards {
  coins: number
  votePoints: number
  bonusPercentage: number
  totalCoins: number
}

interface Plan {
  name: string
  tier: string
  price: number
  currency: string
  duration?: {
    description: string
  }
  features?: PlanFeatures
  rewards?: PlanRewards
}

interface PaymentSuccessProps {
  transactionData: TransactionData
  plan: Plan
  onContinue: () => void
}

const PaymentSuccess = ({ transactionData, plan, onContinue }: PaymentSuccessProps) => {
  const { user, updateUser } = useAuth()

  const [upgrading, setUpgrading] = useState(false)
  const [upgradeComplete, setUpgradeComplete] = useState(false)
  const [upgradeError] = useState<string | null>(null)
  const [showBenefitNotification, setShowBenefitNotification] = useState(false)
  const [newBenefits, setNewBenefits] = useState<any[]>([])
  const [syncingData, setSyncingData] = useState(false)
  const [, setPreviousTier] = useState<string | null>(null)
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ดึงข้อมูลผู้ใช้ล่าสุดจาก localStorage
  const getCurrentUser = useCallback(() => {
    try {
      const savedUser = localStorage.getItem('user')
      return savedUser ? JSON.parse(savedUser) : user
    } catch (error) {
      console.error('Error parsing user from localStorage:', error)
      return user
    }
  }, [user])

  const currentUser = getCurrentUser()
  const [displayUser, setDisplayUser] = useState(currentUser)

  // ฟังก์ชันตรวจสอบสิทธิประโยชน์ใหม่ที่ได้รับ
  const checkNewBenefits = (oldUser: any, newUser: any): Array<{
    type: string;
    title: string;
    description: string;
    icon: React.ReactElement;
  }> => {
    const oldTier = oldUser?.membership?.tier || 'member'
    const newTier = newUser?.membership?.tier || 'member'

    if (oldTier === newTier) return []

    const benefits: Array<{
      type: string;
      title: string;
      description: string;
      icon: React.ReactElement;
    }> = []

    // ตรวจสอบฟีเจอร์ใหม่ที่ได้รับ
    const tierFeatures = {
      member: [],
      silver: [],
      gold: ['profileVideo', 'verificationBadge', 'specialFrame'],
      vip: ['profileVideo', 'verificationBadge', 'specialFrame', 'pinPosts', 'blurImages', 'createChatRooms'],
      vip1: ['profileVideo', 'verificationBadge', 'specialFrame', 'pinPosts', 'blurImages', 'createChatRooms', 'hideOnlineStatus'],
      vip2: ['profileVideo', 'verificationBadge', 'specialFrame', 'pinPosts', 'blurImages', 'createChatRooms', 'hideOnlineStatus', 'unlimitedMedia'],
      diamond: ['profileVideo', 'verificationBadge', 'specialFrame', 'pinPosts', 'blurImages', 'createChatRooms', 'hideOnlineStatus', 'unlimitedMedia', 'transferCoins'],
      platinum: ['profileVideo', 'verificationBadge', 'specialFrame', 'pinPosts', 'blurImages', 'createChatRooms', 'hideOnlineStatus', 'unlimitedMedia', 'transferCoins', 'unlimited']
    };
    const newFeatures = tierFeatures[newTier] || []

    if (newFeatures.length > 0) {
      benefits.push({
        type: 'features',
        title: `สิทธิพิเศษของ ${membershipHelpers.getTierName(newTier)}`,
        description: `คุณได้รับฟีเจอร์ใหม่: ${newFeatures.join(', ')}`,
        icon: <Crown className="h-4 w-4" />
      })
    }

    // ตรวจสอบการเพิ่มเหรียญและคะแนนโหวต
    const coinDiff = (newUser?.coins || 0) - (oldUser?.coins || 0)
    const voteDiff = (newUser?.votePoints || 0) - (oldUser?.votePoints || 0)

    if (coinDiff > 0) {
      benefits.push({
        type: 'coins',
        title: 'เหรียญที่ได้รับ',
        description: `ได้รับเพิ่ม ${coinDiff.toLocaleString()} เหรียญ`,
        icon: <Coins className="h-4 w-4" />
      })
    }

    if (voteDiff > 0) {
      benefits.push({
        type: 'votes',
        title: 'คะแนนโหวตที่ได้รับ',
        description: `ได้รับเพิ่ม ${voteDiff.toLocaleString()} คะแนนโหวต`,
        icon: <Vote className="h-4 w-4" />
      })
    }

    return benefits
  }

  // ฟังก์ชันซิงโครไนซ์ข้อมูลกับเซิร์ฟเวอร์
  const syncUserData = useCallback(async () => {
    if (!currentUser?._id) return

    setSyncingData(true)
    try {
      console.log('🔄 Syncing user data with server...')
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/profile/user/${currentUser._id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          console.log('✅ User data synced successfully:', data.data)

          // เก็บข้อมูลเหรียญและคะแนนโหวตปัจจุบันจาก localStorage ก่อนอัปเดต
          const currentLocalUser = getCurrentUser()
          const localCoins = currentLocalUser?.coins || 0
          const localVotePoints = currentLocalUser?.votePoints || 0
          const serverCoins = data.data.coins || 0
          const serverVotePoints = data.data.votePoints || 0

          console.log('🔍 Coin comparison:', {
            localCoins,
            serverCoins,
            difference: localCoins - serverCoins
          })

          console.log('🔍 Vote points comparison:', {
            localVotePoints,
            serverVotePoints,
            difference: localVotePoints - serverVotePoints
          })

          // ถ้าข้อมูลจากเซิร์ฟเวอร์น้อยกว่าข้อมูลใน localStorage แสดงว่าอาจจะยังไม่ได้อัปเดต
          // ให้ใช้ข้อมูลจาก localStorage ที่ถูกต้อง
          if (serverCoins < localCoins || serverVotePoints < localVotePoints) {
            console.log('⚠️ Server data seems outdated, keeping local data')

            // อัปเดตเฉพาะข้อมูลอื่นๆ แต่คงเหรียญและคะแนนโหวตจาก localStorage
            const correctedUserData = {
              ...data.data,
              coins: Math.max(serverCoins, localCoins), // ใช้ค่าที่มากกว่า
              votePoints: Math.max(serverVotePoints, localVotePoints) // ใช้ค่าที่มากกว่า
            }

            // อัปเดตข้อมูลใน AuthContext ด้วยข้อมูลที่ถูกต้อง
            updateUser(correctedUserData)
            setDisplayUser(correctedUserData)

            console.log('✅ Used corrected user data with local coins/vote points')
          } else {
            // อัปเดตข้อมูลใน AuthContext ตามปกติ
            updateUser(data.data)

            // ตรวจสอบสิทธิประโยชน์ใหม่
            const benefits = checkNewBenefits(displayUser, data.data)
            if (benefits.length > 0) {
              setNewBenefits(benefits)
              setPreviousTier(displayUser?.membership?.tier || 'member')
              setShowBenefitNotification(true)
            }

            setDisplayUser(data.data)
          }
        }
      } else {
        console.warn('⚠️ Failed to sync user data:', response.status)
      }
    } catch (error) {
      console.error('❌ Error syncing user data:', error)
    } finally {
      setSyncingData(false)
    }
  }, [currentUser, updateUser, displayUser, setDisplayUser, setNewBenefits, setShowBenefitNotification, getCurrentUser])

  // แสดงการแจ้งเตือนสิทธิประโยชน์ใหม่
  const renderBenefitNotification = () => {
    if (!showBenefitNotification || newBenefits.length === 0) return null

    return (
      <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
        <div className="flex items-start">
          <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center text-white mr-4 flex-shrink-0">
            <Zap className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-green-800 mb-2 flex items-center">
              <Crown className="h-4 w-4 mr-2" />
              ยินดีด้วย! คุณได้รับสิทธิพิเศษใหม่
            </h3>
            <div className="space-y-2">
              {newBenefits.map((benefit, index) => (
                <div key={index} className="flex items-center p-2 bg-white/50 rounded-lg">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center text-green-600 mr-3">
                    {benefit.icon}
                  </div>
                  <div>
                    <p className="font-medium text-green-800">{benefit.title}</p>
                    <p className="text-sm text-green-600">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button
              onClick={() => setShowBenefitNotification(false)}
              variant="outline"
              size="sm"
              className="mt-3 text-green-600 border-green-300 hover:bg-green-50"
            >
              เข้าใจแล้ว
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // อัปเดตข้อมูลผู้ใช้แบบเรียลไทม์และซิงโครไนซ์กับเซิร์ฟเวอร์
  useEffect(() => {
    const checkForUpdates = () => {
      const latestUser = getCurrentUser()
      if (JSON.stringify(latestUser) !== JSON.stringify(displayUser)) {
        console.log('🔄 PaymentSuccess: User data updated:', latestUser)

        // ตรวจสอบสิทธิประโยชน์ใหม่ถ้ามีการเปลี่ยน tier
        if (latestUser?.membership?.tier !== displayUser?.membership?.tier) {
          const benefits = checkNewBenefits(displayUser, latestUser)
          if (benefits.length > 0) {
            setNewBenefits(benefits)
            setPreviousTier(displayUser?.membership?.tier || 'member')
            setShowBenefitNotification(true)
          }
        }

        setDisplayUser(latestUser)
      }
    }

    // ตรวจสอบทุก 500ms
    const interval = setInterval(checkForUpdates, 500)

    // ซิงโครไนซ์ข้อมูลกับเซิร์ฟเวอร์หลังจากอัพเกรดสำเร็จ (หลังจาก delay 5 วินาที เพื่อให้แน่ใจว่าข้อมูลถูกบันทึกแล้ว)
    if (upgradeComplete && !syncingData) {
      syncTimeoutRef.current = setTimeout(() => {
        syncUserData()
      }, 5000) // เพิ่มเป็น 5 วินาทีเพื่อให้แน่ใจว่าข้อมูลถูกบันทึกในฐานข้อมูลแล้ว
    }

    return () => {
      clearInterval(interval)
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [displayUser, upgradeComplete, syncingData, getCurrentUser, syncUserData])

  // สำหรับ coin package เราจะแสดงสถานะการอัปเกรดแบบจำลอง
  // เพราะการอัปเกรดจริงๆ จะเกิดขึ้นใน App.tsx แล้ว
  useEffect(() => {
    // รีเซ็ตสถานะก่อน
    setUpgrading(false)
    setUpgradeComplete(false)

    // จำลองสถานะการอัปเกรดสำหรับ coin package เท่านั้น
    if (plan?.tier === 'coin_package') {
      setUpgrading(true)

      // จำลองเวลาอัปเกรด (1-2 วินาที)
      const timer = setTimeout(() => {
        setUpgrading(false)
        setUpgradeComplete(true)
      }, 1500)

      return () => clearTimeout(timer)
    }
    // ไม่ต้อง return cleanup function สำหรับกรณีอื่นเพราะไม่มี timer
  }, [plan?.tier])

  // คำนวณข้อมูลเหรียญและโหวตสำหรับแสดงผล
  const calculateCoinDisplay = () => {
    if (plan?.tier !== 'coin_package' || !plan?.rewards) return null

    const baseCoins = plan.rewards.coins || 0
    const bonusPercentage = plan.rewards.bonusPercentage || 0
    const bonusCoins = Math.floor(baseCoins * (bonusPercentage / 100))
    const totalCoins = baseCoins + bonusCoins
    const votePoints = plan.rewards.votePoints || 0

    // คำนวณมูลค่าต่อ 1,000 เหรียญ
    const valuePer1000 = (plan.price / totalCoins) * 1000

    return {
      baseCoins,
      bonusCoins,
      totalCoins,
      votePoints,
      valuePer1000,
      bonusPercentage
    }
  }

  const coinDisplay = calculateCoinDisplay()

  const benefits: Array<{
    icon: React.ReactElement;
    title: string;
    description: string;
  }> = plan?.tier === 'coin_package' && coinDisplay
    ? [
        {
          icon: <Coins className="h-5 w-5" />,
          title: 'เหรียญที่ได้รับ',
          description: `เหรียญพื้นฐาน ${coinDisplay.baseCoins.toLocaleString()} เหรียญ${coinDisplay.bonusCoins > 0 ? ` + โบนัส ${coinDisplay.bonusCoins.toLocaleString()} เหรียญ (${coinDisplay.bonusPercentage}%)` : ''} = รวม ${coinDisplay.totalCoins.toLocaleString()} เหรียญ`
        },
        {
          icon: <Vote className="h-5 w-5" />,
          title: 'คะแนนโหวตที่ได้รับ',
          description: `ได้รับ ${coinDisplay.votePoints.toLocaleString()} คะแนนโหวตทันที`
        },
        {
          icon: <Gift className="h-5 w-5" />,
          title: 'เหรียญไม่หมดอายุ',
          description: 'เหรียญที่ได้รับสามารถใช้ได้ตลอดไป'
        },
        {
          icon: <TrendingUp className="h-5 w-5" />,
          title: 'มูลค่าต่อ 1,000 เหรียญ',
          description: `มูลค่า ${coinDisplay.valuePer1000?.toFixed(2) || '0.00'} บาท ต่อ 1,000 เหรียญ`
        }
      ]
    : [
        {
          icon: <Star className="h-5 w-5" />,
          title: 'เพิ่มสิทธิพิเศษ',
          description: `แชทได้ ${plan?.features?.dailyChats === -1 ? 'ไม่จำกัด' : (plan?.features?.dailyChats || 0)} ครั้ง/วัน`
        },
        {
          icon: <Gift className="h-5 w-5" />,
          title: 'โบนัสเหรียญ',
          description: `รับโบนัส ${(plan?.features?.dailyBonus || 0).toLocaleString()} เหรียญทุกวัน`
        },
        {
          icon: <Crown className="h-5 w-5" />,
          title: 'สถานะพิเศษ',
          description: 'แสดงสถานะสมาชิกพิเศษในโปรไฟล์'
        }
      ]

  // แสดงข้อความสถานะการอัพเกรดเหรียญ
  const renderUpgradeStatus = () => {
    if (plan.tier !== 'coin_package') return null

    if (upgrading) {
      return (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <RefreshCw className="h-5 w-5 text-blue-500 animate-spin mr-3" />
            <div>
              <h3 className="font-semibold text-blue-800">กำลังอัพเกรดเหรียญและคะแนนโหวต...</h3>
              <p className="text-sm text-blue-600">กรุณารอสักครู่ ระบบกำลังเพิ่มเหรียญให้คุณ</p>
            </div>
          </div>
        </div>
      )
    }

    if (upgradeError) {
      return (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-800">เกิดข้อผิดพลาดในการอัพเกรด</h3>
              <p className="text-sm text-red-600">{upgradeError}</p>
            </div>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              className="ml-3"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              ลองใหม่
            </Button>
          </div>
        </div>
      )
    }

    if (upgradeComplete) {
      return (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
            <div>
              <h3 className="font-semibold text-green-800">อัพเกรดสำเร็จ!</h3>
              <p className="text-sm text-green-600">เหรียญและคะแนนโหวตของคุณได้รับการอัพเกรดแล้ว</p>
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  // เพิ่มการตรวจสอบว่ามีข้อมูลที่จำเป็นหรือไม่
  if (!plan || !transactionData) {
    console.error('PaymentSuccess: Missing required props', { plan, transactionData });
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-violet-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-slate-600 mb-4">ไม่พบข้อมูลการชำระเงิน</p>
          <button
            onClick={onContinue}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 relative overflow-hidden">

      <div className="container mx-auto px-4 py-12 max-w-4xl relative z-10">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-light text-slate-800 mb-4">
            ชำระเงินสำเร็จ! 🎉
          </h1>
          <p className="text-xl text-slate-600 mb-2">
            ยินดีด้วย! คุณได้อัพเกรดเป็น {plan?.name || 'แพ็กเกจสมาชิก'} แล้ว
          </p>
          <p className="text-slate-500">
            เริ่มใช้สิทธิพิเศษของคุณได้ทันที
          </p>
        </div>

        {/* สถานะการอัพเกรดเหรียญ */}
        {renderUpgradeStatus()}

        {/* การแจ้งเตือนสิทธิประโยชน์ใหม่ */}
        {renderBenefitNotification()}

        {/* แสดงข้อมูลผู้ใช้ปัจจุบันสำหรับตรวจสอบ */}
        {displayUser && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-green-800">
                <p className="font-medium">เหรียญและโหวตปัจจุบันของคุณ:</p>
                <div className="flex gap-4 mt-2">
                  <div className="text-center">
                    <div className="text-lg font-bold text-amber-600">
                      {(() => {
                        // ใช้ข้อมูลจาก localStorage ที่อัปเดตล่าสุดเสมอ
                        const latestUser = getCurrentUser()
                        return (latestUser?.coins || 0).toLocaleString()
                      })()}
                    </div>
                    <div className="text-xs text-green-600">เหรียญรวม</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">
                      {(() => {
                        // ใช้ข้อมูลจาก localStorage ที่อัปเดตล่าสุดเสมอ
                        const latestUser = getCurrentUser()
                        return (latestUser?.votePoints || 0).toLocaleString()
                      })()}
                    </div>
                    <div className="text-xs text-green-600">คะแนนโหวต</div>
                  </div>
                </div>

                {/* แสดงข้อมูลเหรียญที่เพิ่งได้รับถ้าเป็น coin package */}
                {coinDisplay && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-medium text-amber-800 mb-1">เหรียญที่ได้รับจากแพ็คเกจนี้:</p>
                    <div className="flex gap-3 text-xs">
                      <div className="text-center">
                        <div className="font-semibold text-amber-700">{coinDisplay.totalCoins.toLocaleString()}</div>
                        <div className="text-amber-600">เหรียญรวม</div>
                      </div>
                      {coinDisplay.bonusCoins > 0 && (
                        <div className="text-center">
                          <div className="font-semibold text-green-700">+{coinDisplay.bonusCoins.toLocaleString()}</div>
                          <div className="text-green-600">โบนัส</div>
                        </div>
                      )}
                      <div className="text-center">
                        <div className="font-semibold text-purple-700">{coinDisplay.votePoints.toLocaleString()}</div>
                        <div className="text-purple-600">โหวต</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-2 text-xs text-slate-500">
                  ข้อมูลนี้มาจาก localStorage และจะถูกซิงค์กับเซิร์ฟเวอร์
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    // รีโหลดข้อมูลจาก localStorage
                    const latestUser = getCurrentUser()
                    console.log('🔄 Reloaded user data:', latestUser)
                    setDisplayUser(latestUser)
                  }}
                  variant="outline"
                  size="sm"
                  className="text-green-600 border-green-300 hover:bg-green-100"
                  disabled={syncingData}
                >
                  รีโหลดข้อมูล
                </Button>
                <Button
                  onClick={syncUserData}
                  variant="outline"
                  size="sm"
                  className="text-blue-600 border-blue-300 hover:bg-blue-100"
                  disabled={syncingData}
                >
                  {syncingData ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      กำลังซิงค์...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      ซิงค์กับเซิร์ฟเวอร์
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ข้อความอธิบายการทำงานของระบบ */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm mr-3 flex-shrink-0">
              ℹ️
            </div>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">ระบบการอัปเกรดเหรียญและสิทธิประโยชน์ทำงานอย่างไร:</p>
              <ul className="space-y-1 text-blue-700">
                <li>• <strong>เหรียญรวม:</strong> แสดงเหรียญพื้นฐาน + โบนัสเหรียญ (ถ้ามี) รวมทั้งหมดที่ได้รับ</li>
                <li>• <strong>คะแนนโหวต:</strong> แสดงจำนวนคะแนนโหวตที่ได้รับจากแพ็คเกจ</li>
                <li>• <strong>มูลค่าต่อ 1,000 เหรียญ:</strong> คำนวณและแสดงมูลค่าต่อ 1,000 เหรียญที่คุณได้รับ</li>
                <li>• <strong>การบวกเหรียญ:</strong> เหรียญและคะแนนโหวตจะถูกบวกเพิ่มเข้าไปกับของเดิม (ไม่ใช่แทนที่)</li>
                <li>• <strong>การเก็บข้อมูล:</strong> ข้อมูลจะถูกบันทึกทั้งใน localStorage และฐานข้อมูลพร้อมกัน</li>
                <li>• <strong>การป้องกันข้อมูลหาย:</strong> ถ้าข้อมูลจากเซิร์ฟเวอร์น้อยกว่า localStorage จะใช้ค่าที่มากกว่า</li>
                <li>• <strong>การซิงค์อัตโนมัติ:</strong> ข้อมูลจะถูกซิงค์กับเซิร์ฟเวอร์ภายใน 5 วินาทีหลังการซื้อ</li>
                <li>• <strong>การตรวจสอบ:</strong> ใช้ปุ่ม "รีโหลดข้อมูล" เพื่อดูข้อมูลล่าสุด หรือ "ซิงค์กับเซิร์ฟเวอร์"</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Transaction Details */}
          <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                รายละเอียดการทำรายการ
              </h2>
              
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">หมายเลขรายการ</span>
                  <span className="font-mono text-sm text-slate-800">{transactionData.transactionId}</span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">แพ็กเกจ</span>
                  <span className="font-semibold text-slate-800">{plan?.name || 'ไม่ระบุ'}</span>
                </div>

                {coinDisplay && (
                  <>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">เหรียญที่ได้รับ</span>
                      <span className="font-semibold text-slate-800">
                        {coinDisplay.baseCoins.toLocaleString()} เหรียญ
                        {coinDisplay.bonusCoins > 0 && (
                          <span className="text-green-600 text-sm ml-1">
                            (+{coinDisplay.bonusCoins.toLocaleString()} โบนัส)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">คะแนนโหวตที่ได้รับ</span>
                      <span className="font-semibold text-slate-800">{coinDisplay.votePoints.toLocaleString()} คะแนน</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">ระยะเวลา</span>
                  <span className="text-slate-800">{plan?.duration?.description || 'ไม่ระบุ'}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">จำนวนเงิน</span>
                  <span className="text-xl font-bold text-slate-800">
                    ฿{transactionData.amount.toLocaleString()} {transactionData.currency}
                  </span>
                </div>

                {coinDisplay && (
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">มูลค่าต่อ 1,000 เหรียญ</span>
                    <span className="font-semibold text-slate-800">
                      ฿{coinDisplay.valuePer1000?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">วิธีการชำระ</span>
                  <span className="text-slate-800 capitalize">
                    {transactionData.paymentMethod ? transactionData.paymentMethod.replace('_', ' ') : 'Rabbit Gateway'}
                  </span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">วันที่ทำรายการ</span>
                  <span className="text-slate-800">
                    {new Date(transactionData.timestamp).toLocaleString('th-TH')}
                  </span>
                </div>
                
                <div className="flex justify-between py-2">
                  <span className="text-slate-600">สถานะ</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    สำเร็จ
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  ดาวน์โหลดใบเสร็จ
                </Button>
                <Button variant="outline" className="flex-1" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  แชร์
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Benefits & Features */}
          <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center">
                <Crown className="h-5 w-5 mr-2 text-pink-500" />
                สิทธิพิเศษที่คุณได้รับ
              </h2>

              <div className="space-y-4 mb-6">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start p-3 bg-gradient-to-r from-pink-50 to-violet-50 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-pink-400 to-violet-400 rounded-lg flex items-center justify-center text-white mr-3">
                      {benefit.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{benefit.title}</h3>
                      <p className="text-sm text-slate-600">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Special Features */}
              {plan?.features?.specialFeatures && plan.features.specialFeatures.length > 0 && (
                <div className="border-t border-slate-200 pt-4">
                  <h3 className="font-medium text-slate-700 mb-3">ฟีเจอร์พิเศษ</h3>
                  <div className="space-y-2">
                    {plan.features.specialFeatures.map((feature, index) => (
                      <div key={index} className="flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        <span className="text-slate-600">{typeof feature === 'string' ? feature : feature?.description || 'ฟีเจอร์พิเศษ'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bonus Coins */}
              {plan?.features && plan.features.bonusCoins && plan.features.bonusCoins > 0 && (
                <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center">
                    <Gift className="h-5 w-5 text-yellow-500 mr-2" />
                    <div>
                      <h3 className="font-semibold text-yellow-800">โบนัสพิเศษ!</h3>
                      <p className="text-sm text-yellow-700">
                        ได้รับเหรียญโบนัส {(plan?.features?.bonusCoins || 0).toLocaleString()} เหรียญ
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Continue Button */}
        <div className="text-center mt-12">
          <Button
            onClick={onContinue}
            size="lg"
            className="bg-gradient-to-r from-pink-500 to-violet-500 px-8 py-3"
          >
            เริ่มใช้งานสิทธิพิเศษ
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
          <p className="text-sm text-slate-500 mt-3">
            กลับสู่หน้าหลักและเริ่มใช้สิทธิพิเศษของคุณ
          </p>
        </div>

        {/* Support Info */}
        <div className="mt-12 text-center">
          <Card className="bg-slate-50/80 backdrop-blur-sm border border-slate-200/50">
            <CardContent className="p-6">
              <h3 className="font-semibold text-slate-800 mb-2">ต้องการความช่วยเหลือ?</h3>
              <p className="text-slate-600 mb-4">
                หากมีคำถามเกี่ยวกับการทำรายการหรือการใช้งาน สามารถติดต่อเราได้
              </p>
              <div className="flex justify-center gap-4">
                <Button variant="outline" size="sm">
                  📧 อีเมล
                </Button>
                <Button variant="outline" size="sm">
                  💬 แชท
                </Button>
                <Button variant="outline" size="sm">
                  📞 โทร
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default PaymentSuccess

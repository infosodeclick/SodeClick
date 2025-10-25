import { useState, useEffect, useCallback } from 'react'
import { Button } from './ui/button'
import { membershipAPI, membershipHelpers } from '../services/membershipAPI'
import { useToast } from './ui/toast'
import SpinWheelModal, { PrizeResultModal } from './SpinWheelModal'
import voteAPI, { voteHelpers } from '../services/voteAPI'
import { 
  Crown, 
  Coins, 
  Gift, 
  MessageCircle, 
  Image, 
  Video, 
  RefreshCw, 
  TrendingUp,
  Calendar,
  Star,
  Vote,
  Zap,
  Award,
  Timer
} from 'lucide-react'

const MembershipDashboard = ({ userId }) => {
  const [membershipData, setMembershipData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState({})
  const [error, setError] = useState(null)
  const [timeRemaining, setTimeRemaining] = useState('')
  const [showSpinWheel, setShowSpinWheel] = useState(false)
  const [showPrizeResult, setShowPrizeResult] = useState(false)
  const [wonPrize, setWonPrize] = useState(null)
  const [voteData, setVoteData] = useState({ totalVotes: 0, uniqueVoterCount: 0 }) // เพิ่ม state สำหรับข้อมูลโหวต
  const { success, error: showError } = useToast()

  // ฟังก์ชันสำหรับดึงข้อมูลผู้ใช้ล่าสุดจาก localStorage
  const getCurrentUserData = useCallback(() => {
    try {
      const userData = localStorage.getItem('user')
      return userData ? JSON.parse(userData) : null
    } catch (e) {
      console.error('Error parsing user data from localStorage:', e)
      return null
    }
  }, [])

  // ฟังก์ชันสำหรับดึงข้อมูลโหวตจาก VoteTransaction collection
  const fetchVoteData = useCallback(async () => {
    if (!userId) return

    try {
      console.log('🔄 Fetching vote data for user:', userId)
      const response = await voteAPI.getVoteStatus(userId, null, 'popularity_combined')
      
      if (response.success && response.data?.voteStats) {
        const voteStats = response.data.voteStats
        const totalVotes = voteStats.popularity_combined?.totalVotes || 0
        const uniqueVoterCount = voteStats.popularity_combined?.uniqueVoters || 0
        
        console.log('✅ Vote data fetched:', { totalVotes, uniqueVoterCount })
        setVoteData({ totalVotes, uniqueVoterCount })
      }
    } catch (error) {
      console.error('❌ Error fetching vote data:', error)
    }
  }, [userId])

  // อัปเดตข้อมูลเหรียญและโหวตแบบเรียลไทม์
  useEffect(() => {
    const updateUserData = () => {
      if (membershipData) {
        const currentUserData = getCurrentUserData()
        if (currentUserData) {
          const updatedData = {
            ...membershipData,
            coins: currentUserData.coins || membershipData.coins,
            votePoints: currentUserData.votePoints || membershipData.votePoints
          }

          // อัปเดตเฉพาะถ้ามีการเปลี่ยนแปลง
          if (updatedData.coins !== membershipData.coins || updatedData.votePoints !== membershipData.votePoints) {
            console.log('🔄 Updating membership data with latest user data:', {
              oldCoins: membershipData.coins,
              newCoins: updatedData.coins,
              oldVotePoints: membershipData.votePoints,
              newVotePoints: updatedData.votePoints
            })
            setMembershipData(updatedData)
          }
        }
      }
    }

    // ตรวจสอบทุก 1 วินาที
    const interval = setInterval(updateUserData, 1000)
    return () => clearInterval(interval)
  }, [membershipData, getCurrentUserData])

  // อัปเดตข้อมูลโหวตแบบ real-time เมื่อมีการโหวตหรือหมุนวงล้อ
  useEffect(() => {
    const handleVoteUpdate = (data) => {
      console.log('📡 MembershipDashboard - Received vote-updated event:', data)
      
      // ตรวจสอบว่าเป็นคะแนนโหวตของผู้ใช้คนนี้หรือไม่
      if (data.candidateId === userId) {
        console.log('🔄 Updating vote data for current user:', userId)
        fetchVoteData() // ดึงข้อมูลโหวตใหม่
      }
    }

    // ใช้ global socketManager แทนการสร้าง connection ใหม่
    const setupSocketListener = () => {
      if (window.socketManager && window.socketManager.socket && window.socketManager.socket.connected) {
        console.log('🔌 MembershipDashboard - Setting up socket listener on existing socket:', window.socketManager.socket.id)
        window.socketManager.socket.on('vote-updated', handleVoteUpdate)
        return true
      } else {
        console.log('⚠️ MembershipDashboard - Socket not ready, will retry...')
        return false
      }
    }

    // ลองตั้งค่า listener ทันที
    let listenerSetup = setupSocketListener()
    
    // ถ้า socket ยังไม่พร้อม ให้รอและลองใหม่
    if (!listenerSetup) {
      const retryInterval = setInterval(() => {
        if (setupSocketListener()) {
          clearInterval(retryInterval)
        }
      }, 1000)

      // หยุดการลองใหม่หลังจาก 10 วินาที
      setTimeout(() => {
        clearInterval(retryInterval)
      }, 10000)
    }

    // Cleanup
    return () => {
      if (window.socketManager && window.socketManager.socket) {
        window.socketManager.socket.off('vote-updated', handleVoteUpdate)
      }
    }
  }, [userId, fetchVoteData])

  // ดึงข้อมูลโหวตเมื่อ component mount
  useEffect(() => {
    fetchVoteData()
  }, [fetchVoteData])

  // ดึงข้อมูลสมาชิก
  const fetchMembershipData = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      setError('กรุณาเข้าสู่ระบบก่อน')
      return
    }

    try {
      setLoading(true)

      // ดึงข้อมูลจาก localStorage ก่อน (ข้อมูลล่าสุด)
      const localStorageUser = localStorage.getItem('user')
      let localUserData = null
      if (localStorageUser) {
        try {
          localUserData = JSON.parse(localStorageUser)
        } catch (e) {
          console.error('Error parsing localStorage user data:', e)
        }
      }

      // ดึงข้อมูลจาก API
      const response = await membershipAPI.getUserMembership(userId)
      const apiData = response.data.data

      // ถ้ามีข้อมูลใน localStorage ให้ใช้ข้อมูลนั้นแทนสำหรับเหรียญและโหวต
      if (localUserData && apiData) {
        apiData.coins = localUserData.coins || apiData.coins
        apiData.votePoints = localUserData.votePoints || apiData.votePoints
        console.log('🔄 Updated membership data with localStorage data:', {
          coins: apiData.coins,
          votePoints: apiData.votePoints,
          localCoins: localUserData.coins,
          localVotePoints: localUserData.votePoints
        })
      }

      setMembershipData(apiData)

       // Debug: แสดงข้อมูลที่ได้รับ (เฉพาะเมื่อต้องการ debug)
       // console.log('🔍 Frontend Debug - Membership Data:', response.data.data)
       // console.log('🔍 Frontend Debug - User Role:', response.data.data.role)
       // console.log('🔍 Frontend Debug - User ID:', userId)
       // console.log('🔍 Frontend Debug - Can Spin Wheel:', response.data.data.canSpinWheel)
      
      setError(null)
    } catch (err) {
      console.error('Error fetching membership data:', err)
      setError(err.response?.data?.message || 'ไม่สามารถดึงข้อมูลสมาชิกได้')
    } finally {
      setLoading(false)
    }
  }, [userId])

  // รับโบนัสรายวัน
  const claimDailyBonus = async () => {
    try {
      setActionLoading(prev => ({ ...prev, dailyBonus: true }))
      const response = await membershipAPI.claimDailyBonus(userId)
      
      // อัพเดตข้อมูลใหม่
      await fetchMembershipData()
      
      // แสดงข้อความสำเร็จ
      success(`ได้รับโบนัส ${response.data.data.bonusAmount} เหรียญแล้ว!`)
    } catch (err) {
      console.error('Error claiming daily bonus:', err)
      showError(err.response?.data?.message || 'ไม่สามารถรับโบนัสได้')
    } finally {
      setActionLoading(prev => ({ ...prev, dailyBonus: false }))
    }
  }

  // เปิด modal วงล้อหมุน
  const openSpinWheel = () => {
    setShowSpinWheel(true)
  }

  // หมุนวงล้อของขวัญ
  const spinWheel = async () => {
    try {
      setActionLoading(prev => ({ ...prev, spinWheel: true }))
      const response = await membershipAPI.spinWheel(userId)
      
      // อัพเดตข้อมูลใหม่
      await fetchMembershipData()
      
      // แสดงรางวัลที่ได้
      const prize = response.data.data.prize
      setWonPrize(prize)
      setShowPrizeResult(true)
      
      // แสดงข้อความสำเร็จ
      if (prize.type === 'grand') {
        success(`ยินดีด้วย! คุณได้รับรางวัลใหญ่: ${prize.coins} เหรียญ + ${prize.votePoints} โหวต`)
      } else if (prize.type === 'coins') {
        success(`ยินดีด้วย! คุณได้รับ ${prize.amount} เหรียญ`)
      } else if (prize.type === 'votePoints') {
        success(`ยินดีด้วย! คุณได้รับ ${prize.amount} โหวต`)
      }
      
      return prize
    } catch (err) {
      console.error('Error spinning wheel:', err)
      
      // ไม่แสดง error message ที่นี่ เพราะ SpinWheelModal จะจัดการเอง
      // แต่จะโยน error ต่อเพื่อให้ SpinWheelModal จัดการ
      throw err
    } finally {
      setActionLoading(prev => ({ ...prev, spinWheel: false }))
    }
  }

  // การนับถอยหลัง
  useEffect(() => {
    if (!membershipData?.membershipExpiry || membershipData?.membershipTier === 'member') {
      setTimeRemaining(membershipHelpers.getTimeRemaining(membershipData?.membershipExpiry, membershipData?.membershipTier))
      return
    }

    const updateTimeRemaining = () => {
      const result = membershipHelpers.getTimeRemainingDetailed(membershipData.membershipExpiry, membershipData.membershipTier)
      setTimeRemaining(result.text)
      
      // ถ้าหมดอายุแล้ว ให้รีเฟรชข้อมูล
      if (result.isExpired) {
        fetchMembershipData()
      }
    }

    // อัพเดตทันที
    updateTimeRemaining()

    // อัพเดตทุกวินาที
    const interval = setInterval(updateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [membershipData?.membershipExpiry, membershipData?.membershipTier, fetchMembershipData])

  useEffect(() => {
    fetchMembershipData()
  }, [userId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 text-pink-500 mr-3" />
        <span className="text-lg text-slate-600">กำลังโหลดข้อมูลสมาชิก...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">{error}</div>
        <Button onClick={fetchMembershipData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          ลองใหม่
        </Button>
      </div>
    )
  }

  const { membershipTier, membershipExpiry, coins, votePoints, dailyUsage, limits, isActive, totalSpinWheelVotePoints } = membershipData

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* ข้อความเตือนการอัปเดตข้อมูล */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm">
        <div className="flex items-center">
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs mr-2 flex-shrink-0">
            ℹ️
          </div>
          <div className="text-blue-800">
            <p className="font-medium">ข้อมูลเหรียญและโหวตอัปเดตแบบเรียลไทม์</p>
            <p className="text-xs mt-1">ข้อมูลจะอัปเดตอัตโนมัติเมื่อมีการเปลี่ยนแปลง</p>
          </div>
        </div>
      </div>

      {/* Compact Membership Status Card */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-3">
          <div className="flex items-center">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-r ${membershipHelpers.getTierGradient(membershipTier)} flex items-center justify-center text-sm sm:text-lg mr-2 sm:mr-3 shadow-lg`}>
              {membershipHelpers.getTierIcon(membershipTier)}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-slate-800">
                {membershipHelpers.getTierName(membershipTier)}
              </h2>
                             {(() => {
                 // ตรวจสอบการหมดอายุโดยตรงจากข้อมูล
                 const now = new Date();
                 const expiry = membershipExpiry ? new Date(membershipExpiry) : null;
                 const isExpired = expiry && now >= expiry;
                 
                 // Debug: แสดงข้อมูลการคำนวณ (เฉพาะเมื่อต้องการ debug)
                 // console.log('🔍 Frontend Debug - Expiry Check:', { now: now.toISOString(), expiry: expiry?.toISOString(), isExpired, tier: membershipTier });
                 
                 if (membershipTier === 'member') {
                   // กรณี Member ฟรี
                   return (
                     <>
                       <div className="flex items-center text-slate-600">
                         <Calendar className="h-3 w-3 mr-1" />
                         <span className="font-mono text-xs sm:text-sm">
                           ไม่มีวันหมดอายุ
                         </span>
                       </div>
                       <div className="text-xs text-slate-500 mt-1">
                         ระยะเวลา: {membershipHelpers.getMembershipDuration(membershipTier)}
                       </div>
                     </>
                   );
                 } else if (isExpired) {
                   // กรณีหมดอายุแล้ว - แสดงเตือนและเปลี่ยนเป็น member
                   return (
                     <>
                       <div className="flex items-center text-red-600">
                         <Calendar className="h-3 w-3 mr-1" />
                         <span className="font-mono font-semibold text-xs sm:text-sm">
                           หมดอายุแล้ว
                         </span>
                       </div>
                       <div className="text-xs text-red-500 mt-1">
                         สมาชิกหมดอายุแล้ว - เปลี่ยนเป็น Member ธรรมดา
                       </div>
                     </>
                   );
                 } else {
                   // กรณี Premium Member ที่ยังไม่หมดอายุ - แสดงการนับถอยหลังแบบ real-time
                   return (
                     <>
                       <div className="flex items-center text-slate-600">
                         <Calendar className="h-3 w-3 mr-1" />
                         <span className="font-mono font-semibold text-xs sm:text-sm">
                           {timeRemaining || membershipHelpers.getTimeRemaining(membershipExpiry, membershipTier)}
                         </span>
                       </div>
                       <div className="text-xs text-slate-500 mt-1">
                         ระยะเวลา: {membershipHelpers.getMembershipDuration(membershipTier)}
                       </div>
                     </>
                   );
                 }
               })()}
            </div>
          </div>
          
          <div className="text-right w-full sm:w-auto">
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              isActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {isActive ? '✓ ใช้งานได้' : '✗ หมดอายุ'}
            </div>
          </div>
        </div>

        {/* Compact Coins and Points */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-2 sm:p-3 border border-amber-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Coins className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600 mr-1" />
                <span className="text-slate-700 font-medium text-xs">เหรียญ</span>
              </div>
              <span className="text-sm sm:text-base font-bold text-amber-600">
                {membershipHelpers.formatCoins(coins)}
              </span>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-2 sm:p-3 border border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Vote className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600 mr-1" />
                <span className="text-slate-700 font-medium text-xs">คะแนนโหวต</span>
              </div>
              <span className="text-sm sm:text-base font-bold text-purple-600">
                {voteHelpers.formatVoteCount(voteData.totalVotes)}
              </span>
            </div>
          </div>
        </div>

        {/* Spin Wheel Vote Points */}
        {totalSpinWheelVotePoints > 0 && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-2 sm:p-3 border border-yellow-200 mb-3 sm:mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600 mr-1" />
                <span className="text-slate-700 font-medium text-xs">คะแนนโหวตจากวงล้อ</span>
              </div>
              <span className="text-sm sm:text-base font-bold text-yellow-600">
                {totalSpinWheelVotePoints.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Compact Daily Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={claimDailyBonus}
            disabled={actionLoading.dailyBonus || !membershipData.canClaimDailyBonus}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-xs px-2 py-1.5"
          >
            {actionLoading.dailyBonus ? (
              <RefreshCw className="h-3 w-3 mr-1" />
            ) : (
              <Gift className="h-3 w-3 mr-1" />
            )}
            <span className="hidden sm:inline">{membershipData.canClaimDailyBonus ? `รับโบนัส ${limits.dailyBonus}` : 'รอ 24 ชม.'}</span>
            <span className="sm:hidden">{membershipData.canClaimDailyBonus ? 'รับโบนัส' : 'รอ 24 ชม.'}</span>
          </Button>
          
          <Button
            onClick={openSpinWheel}
            disabled={actionLoading.spinWheel || (!membershipData.canSpinWheel && membershipData.role !== 'superadmin' && membershipData.role !== 'admin')}
            variant="outline"
            className="border-pink-200 text-pink-700 hover:bg-pink-50 text-xs px-2 py-1.5"
          >
            {actionLoading.spinWheel ? (
              <RefreshCw className="h-3 w-3 mr-1" />
            ) : (
              <Zap className="h-3 w-3 mr-1" />
            )}
            <span className="hidden sm:inline">{(membershipData.role === 'superadmin' || membershipData.role === 'admin') ? 'หมุนวงล้อ (ไม่จำกัด)' : (membershipData.canSpinWheel ? 'หมุนวงล้อ' : 'รอ 24 ชม.')}</span>
            <span className="sm:hidden">{(membershipData.role === 'superadmin' || membershipData.role === 'admin') ? 'หมุนวงล้อ' : (membershipData.canSpinWheel ? 'หมุนวงล้อ' : 'รอ 24 ชม.')}</span>
          </Button>
        </div>

                 {/* Compact Timer Display */}
         {(!membershipData.canClaimDailyBonus || (!membershipData.canSpinWheel && membershipData.role !== 'superadmin' && membershipData.role !== 'admin')) && (
           <div className="mt-2 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
             <div className="flex items-center text-xs text-yellow-800">
               <Timer className="h-3 w-3 mr-1" />
               <span>
                 {!membershipData.canClaimDailyBonus && !membershipData.canSpinWheel && membershipData.role !== 'superadmin' && membershipData.role !== 'admin'
                   ? 'รอ 24 ชั่วโมงเพื่อรับโบนัสและหมุนวงล้ออีกครั้ง'
                   : !membershipData.canClaimDailyBonus 
                     ? 'รอ 24 ชั่วโมงเพื่อรับโบนัสอีกครั้ง'
                     : (membershipData.role !== 'superadmin' && membershipData.role !== 'admin') ? 'รอ 24 ชั่วโมงเพื่อหมุนวงล้ออีกครั้ง' : ''
                 }
               </span>
             </div>
           </div>
         )}
      </div>

      {/* Compact Daily Usage Stats */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20 shadow-lg">
        <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-2 sm:mb-3 flex items-center">
          <TrendingUp className="h-4 w-4 mr-2 text-blue-500" />
          การใช้งานวันนี้
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
          {/* Compact Chat Usage */}
          <div className="bg-blue-50 rounded-lg p-2 sm:p-3 border border-blue-200">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center">
                <MessageCircle className="h-3 w-3 text-blue-600 mr-1" />
                <span className="text-slate-700 text-xs">แชท</span>
              </div>
              <span className="text-xs text-slate-500">
                {limits.dailyChats === -1 ? 'ไม่จำกัด' : `${dailyUsage.chatCount}/${limits.dailyChats}`}
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-1.5">
              <div 
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{ 
                  width: limits.dailyChats === -1 ? '0%' : `${Math.min((dailyUsage.chatCount / limits.dailyChats) * 100, 100)}%` 
                }}
              />
            </div>
          </div>

          {/* Compact Image Upload Usage */}
          <div className="bg-green-50 rounded-lg p-2 sm:p-3 border border-green-200">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center">
                <Image className="h-3 w-3 text-green-600 mr-1" />
                <span className="text-slate-700 text-xs">รูปภาพ</span>
              </div>
              <span className="text-xs text-slate-500">
                {limits.dailyImages === -1 ? 'ไม่จำกัด' : `${dailyUsage.imageUploadCount}/${limits.dailyImages}`}
              </span>
            </div>
            <div className="w-full bg-green-200 rounded-full h-1.5">
              <div 
                className="bg-green-600 h-1.5 rounded-full transition-all duration-300"
                style={{ 
                  width: limits.dailyImages === -1 ? '0%' : `${Math.min((dailyUsage.imageUploadCount / limits.dailyImages) * 100, 100)}%` 
                }}
              />
            </div>
          </div>

          {/* Compact Video Upload Usage */}
          <div className="bg-purple-50 rounded-lg p-2 sm:p-3 border border-purple-200">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center">
                <Video className="h-3 w-3 text-purple-600 mr-1" />
                <span className="text-slate-700 text-xs">วิดีโอ</span>
              </div>
              <span className="text-xs text-slate-500">
                {limits.dailyVideos === -1 ? 'ไม่จำกัด' : `${dailyUsage.videoUploadCount}/${limits.dailyVideos}`}
              </span>
            </div>
            <div className="w-full bg-purple-200 rounded-full h-1.5">
              <div 
                className="bg-purple-600 h-1.5 rounded-full transition-all duration-300"
                style={{ 
                  width: limits.dailyVideos === -1 ? '0%' : `${Math.min((dailyUsage.videoUploadCount / limits.dailyVideos) * 100, 100)}%` 
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Compact Membership Benefits */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20 shadow-lg">
        <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-2 sm:mb-3 flex items-center">
          <Award className="h-4 w-4 mr-2 text-yellow-500" />
          สิทธิประโยชน์ของคุณ
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          <div className="text-center p-2 sm:p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
            <MessageCircle className="h-6 w-6 text-blue-600 mx-auto mb-1" />
            <div className="text-xs text-slate-700">แชทรายวัน</div>
            <div className="font-bold text-blue-600 text-xs">
              {limits.dailyChats === -1 ? 'ไม่จำกัด' : `${limits.dailyChats} คน`}
            </div>
          </div>
          
          <div className="text-center p-2 sm:p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <Image className="h-6 w-6 text-green-600 mx-auto mb-1" />
            <div className="text-xs text-slate-700">อัพโหลดรูป</div>
            <div className="font-bold text-green-600 text-xs">
              {limits.dailyImages === -1 ? 'ไม่จำกัด' : `${limits.dailyImages} รูป`}
            </div>
          </div>
          
          <div className="text-center p-2 sm:p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
            <Video className="h-6 w-6 text-purple-600 mx-auto mb-1" />
            <div className="text-xs text-slate-700">อัพโหลดวิดีโอ</div>
            <div className="font-bold text-purple-600 text-xs">
              {limits.dailyVideos === -1 ? 'ไม่จำกัด' : `${limits.dailyVideos} คลิป`}
            </div>
          </div>
          
          <div className="text-center p-2 sm:p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
            <Gift className="h-6 w-6 text-amber-600 mx-auto mb-1" />
            <div className="text-xs text-slate-700">หมุนวงล้อ</div>
            <div className="font-bold text-amber-600 text-xs">
              {(() => {
                const spinInterval = limits.spinInterval;
                if (spinInterval === -1) return 'ไม่จำกัด';
                const hours = Math.floor(spinInterval / (1000 * 60 * 60));
                const minutes = Math.floor((spinInterval % (1000 * 60 * 60)) / (1000 * 60));
                if (hours > 0) {
                  return minutes > 0 ? `ทุก ${hours} ชม ${minutes} นาที` : `ทุก ${hours} ชม`;
                } else {
                  return `ทุก ${minutes} นาที`;
                }
              })()}
            </div>
          </div>
        </div>
      </div>

             {/* Spin Wheel Modal */}
       <SpinWheelModal
         isOpen={showSpinWheel}
         onClose={() => setShowSpinWheel(false)}
         onSpin={spinWheel}
         isLoading={actionLoading.spinWheel}
         canSpin={membershipData?.canSpinWheel}
         userRole={membershipData?.role}
       />
       
       {/* Prize Result Modal */}
       <PrizeResultModal
         isOpen={showPrizeResult}
         onClose={() => {
           setShowPrizeResult(false)
           setWonPrize(null)
         }}
         prize={wonPrize}
       />
    </div>
  )
}

export default MembershipDashboard

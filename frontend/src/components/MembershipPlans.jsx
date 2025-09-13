import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import MembershipCard from './MembershipCard'
import { membershipAPI } from '../services/membershipAPI'
import { RefreshCw, Crown, Sparkles } from 'lucide-react'
import { useToast } from './ui/toast'

const MembershipPlans = ({ currentUserId, currentTier = 'member' }) => {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(null)
  const [error, setError] = useState(null)
  const { warning } = useToast()

  // ดึงแพ็กเกจสมาชิก
  const fetchPlans = async () => {
    try {
      setLoading(true)
      const response = await membershipAPI.getPlans()
      setPlans(response.data.data)
      setError(null)
    } catch (err) {
      console.error('Error fetching membership plans:', err)
      setError(err.response?.data?.message || 'ไม่สามารถดึงข้อมูลแพ็กเกจได้')
    } finally {
      setLoading(false)
    }
  }

  // อัพเกรดสมาชิก - ไปหน้าชำระเงิน
  const handleUpgrade = async (plan) => {
    if (!currentUserId) {
      warning('กรุณาเข้าสู่ระบบก่อนอัพเกรดสมาชิก')
      return
    }



    // Trigger callback to parent component to navigate to payment page
    if (typeof window !== 'undefined' && window.navigateToPayment) {
      window.navigateToPayment(plan)
    } else {
      // Fallback - emit custom event
      const event = new CustomEvent('navigateToPayment', { 
        detail: { plan, userId: currentUserId } 
      })
      window.dispatchEvent(event)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <RefreshCw className="h-12 w-12 text-pink-500 mr-4" />
          <div className="absolute inset-0 w-12 h-12 border-4 border-pink-200 rounded-full"></div>
        </div>
        <div className="mt-6 text-center">
          <span className="text-xl font-semibold gradient-text">Loading Premium Plans...</span>
          <div className="flex items-center justify-center mt-2">
            <div className="w-16 h-16 bg-gradient-to-r from-pink-400 to-violet-400 rounded-full flex items-center justify-center mr-3 heart-beat">
              <Crown className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">{error}</div>
        <Button onClick={fetchPlans} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          ลองใหม่
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header - Compact */}
      <div className="text-center">
        <div className="inline-flex items-center px-4 py-2 rounded-full glass-effect border border-white/30 text-pink-600 text-sm font-bold mb-4 shadow-lg">
          <Crown className="h-4 w-4 mr-2" />
          <span>เลือกแพ็กเกจสมาชิก 👑</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-3">
          Upgrade to Premium
        </h1>
        <p className="text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
          เลือกแพ็กเกจที่เหมาะกับคุณ เพื่อปลดล็อกฟีเจอร์พิเศษและเพิ่มประสบการณ์การหาคู่ที่ดีที่สุด ✨
        </p>
      </div>

      {/* Popular Plans Highlight - Compact */}
      <div className="relative overflow-hidden modern-card rounded-2xl p-4 text-center shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-rose-500 to-violet-500"></div>
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full translate-y-8 -translate-x-8"></div>
        
        <div className="relative z-10 text-white">
          <div className="flex items-center justify-center mb-2">
            <Sparkles className="h-5 w-5 mr-2" />
            <span className="text-lg font-bold">Most Popular Plans 🔥</span>
          </div>
          <p className="text-pink-100 mb-3 text-sm">
            Gold & VIP Members get the best dating experience with premium features!
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <div className="glass-effect rounded-lg px-3 py-1 text-xs font-semibold">
              <Sparkles className="inline h-3 w-3 mr-1" />
              Full Features
            </div>
            <div className="glass-effect rounded-lg px-3 py-1 text-xs font-semibold">
              🎁 Bonus Rewards
            </div>
            <div className="glass-effect rounded-lg px-3 py-1 text-xs font-semibold">
              👑 VIP Status
            </div>
            <div className="glass-effect rounded-lg px-3 py-1 text-xs font-semibold">
              💎 Premium Support
            </div>
          </div>
        </div>
      </div>

      {/* Plans Grid - Compact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <MembershipCard
            key={plan.tier}
            plan={plan}
            isCurrentTier={plan.tier === currentTier}
            onUpgrade={handleUpgrade}
            isLoading={upgrading === plan.tier}
          />
        ))}
      </div>

      {/* Benefits Comparison - Compact */}
      <div id="benefits-comparison-table" className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 text-center">
          เปรียบเทียบสิทธิประโยชน์
        </h2>
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-3 text-slate-700 font-medium text-sm">ฟีเจอร์</th>
                <th className="text-center py-2 px-3 text-slate-600 text-sm">Member</th>
                <th className="text-center py-2 px-3 text-slate-600 text-sm">Silver</th>
                <th className="text-center py-2 px-3 text-yellow-600 text-sm">Gold</th>
                <th className="text-center py-2 px-3 text-purple-600 text-sm">VIP</th>
                <th className="text-center py-2 px-3 text-cyan-600 text-sm">Diamond</th>
                <th className="text-center py-2 px-3 text-indigo-600 text-sm">Platinum</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              <tr className="border-b border-slate-100">
                <td className="py-2 px-3 font-medium">แชทรายวัน</td>
                <td className="text-center py-2 px-3">10 คน</td>
                <td className="text-center py-2 px-3">30 คน</td>
                <td className="text-center py-2 px-3">60 คน</td>
                <td className="text-center py-2 px-3">120 คน</td>
                <td className="text-center py-2 px-3">500 คน</td>
                <td className="text-center py-2 px-3 text-green-600 font-medium">ไม่จำกัด</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 px-3 font-medium">อัพโหลดรูป</td>
                <td className="text-center py-2 px-3">3 รูป</td>
                <td className="text-center py-2 px-3">30 รูป</td>
                <td className="text-center py-2 px-3">50 รูป</td>
                <td className="text-center py-2 px-3">100 รูป</td>
                <td className="text-center py-2 px-3 text-green-600 font-medium">ไม่จำกัด</td>
                <td className="text-center py-2 px-3 text-green-600 font-medium">ไม่จำกัด</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 px-3 font-medium">โบนัสรายวัน</td>
                <td className="text-center py-2 px-3">500 เหรียญ</td>
                <td className="text-center py-2 px-3">1,000 เหรียญ</td>
                <td className="text-center py-2 px-3">3,000 เหรียญ</td>
                <td className="text-center py-2 px-3">8,000 เหรียญ</td>
                <td className="text-center py-2 px-3">50,000 เหรียญ</td>
                <td className="text-center py-2 px-3 text-amber-600 font-bold">100,000 เหรียญ</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 px-3 font-medium">ติ๊กยืนยัน</td>
                <td className="text-center py-2 px-3">❌</td>
                <td className="text-center py-2 px-3">❌</td>
                <td className="text-center py-2 px-3 text-green-600">✅</td>
                <td className="text-center py-2 px-3 text-green-600">✅</td>
                <td className="text-center py-2 px-3 text-green-600">✅</td>
                <td className="text-center py-2 px-3 text-green-600">✅</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 px-3 font-medium">โอนเหรียญ</td>
                <td className="text-center py-2 px-3">❌</td>
                <td className="text-center py-2 px-3">❌</td>
                <td className="text-center py-2 px-3">❌</td>
                <td className="text-center py-2 px-3">❌</td>
                <td className="text-center py-2 px-3 text-green-600">✅</td>
                <td className="text-center py-2 px-3 text-green-600">✅</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Section - Compact */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 text-center">
          คำถามที่พบบ่อย
        </h2>
        
        <div className="space-y-3">
          <div className="border-l-4 border-pink-500 pl-3">
            <h3 className="font-semibold text-slate-800 mb-1 text-sm">การชำระเงินปลอดภัยหรือไม่?</h3>
            <p className="text-slate-600 text-xs">
              เรามีระบบความปลอดภัยระดับสูง เข้ารหัสข้อมูลการชำระเงินทุกขั้นตอน และไม่เก็บข้อมูลบัตรเครดิตของคุณ
            </p>
          </div>
          
          <div className="border-l-4 border-blue-500 pl-3">
            <h3 className="font-semibold text-slate-800 mb-1 text-sm">สามารถยกเลิกสมาชิกได้หรือไม่?</h3>
            <p className="text-slate-600 text-xs">
              สมาชิกจะหมดอายุตามระยะเวลาที่กำหนด ไม่มีการต่ออายุอัตโนมัติ คุณสามารถใช้สิทธิ์ได้จนถึงวันหมดอายุ
            </p>
          </div>
          
          <div className="border-l-4 border-green-500 pl-3">
            <h3 className="font-semibold text-slate-800 mb-1 text-sm">เหรียญและคะแนนโหวตหมดอายุหรือไม่?</h3>
            <p className="text-slate-600 text-xs">
              เหรียญและคะแนนโหวตที่ได้รับจะไม่หมดอายุ คุณสามารถใช้ได้ตลอดแม้สมาชิกจะหมดอายุแล้ว
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MembershipPlans

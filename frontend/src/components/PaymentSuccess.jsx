import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { membershipHelpers } from '../services/membershipAPI'
import { 
  CheckCircle, 
  Crown, 
  Star, 
  Gift, 
  Sparkles, 
  ArrowRight,
  Download,
  Share2
} from 'lucide-react'

const PaymentSuccess = ({ transactionData, plan, onContinue }) => {
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    // ซ่อน confetti หลัง 3 วินาที
    const timer = setTimeout(() => {
      setShowConfetti(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  const benefits = [
    {
      icon: <Star className="h-5 w-5" />,
      title: 'เพิ่มสิทธิพิเศษ',
      description: `แชทได้ ${plan.features.dailyChats === -1 ? 'ไม่จำกัด' : plan.features.dailyChats} ครั้ง/วัน`
    },
    {
      icon: <Gift className="h-5 w-5" />,
      title: 'โบนัสเหรียญ',
      description: `รับโบนัส ${plan.features.dailyBonus.toLocaleString()} เหรียญทุกวัน`
    },
    {
      icon: <Crown className="h-5 w-5" />,
      title: 'สถานะพิเศษ',
      description: 'แสดงสถานะสมาชิกพิเศษในโปรไฟล์'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 relative overflow-hidden">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            >
              <Sparkles className="h-4 w-4 text-pink-400" />
            </div>
          ))}
        </div>
      )}

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
            ยินดีด้วย! คุณได้อัพเกรดเป็น {plan.name} แล้ว
          </p>
          <p className="text-slate-500">
            เริ่มใช้สิทธิพิเศษของคุณได้ทันที
          </p>
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
                  <span className="font-semibold text-slate-800">{plan.name}</span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">ระยะเวลา</span>
                  <span className="text-slate-800">{plan.duration.description}</span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">จำนวนเงิน</span>
                  <span className="text-xl font-bold text-slate-800">
                    {membershipHelpers.formatPrice(transactionData.amount, transactionData.currency)}
                  </span>
                </div>
                
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
              {plan.features.specialFeatures.length > 0 && (
                <div className="border-t border-slate-200 pt-4">
                  <h3 className="font-medium text-slate-700 mb-3">ฟีเจอร์พิเศษ</h3>
                  <div className="space-y-2">
                    {plan.features.specialFeatures.map((feature, index) => (
                      <div key={index} className="flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        <span className="text-slate-600">{feature.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bonus Coins */}
              {plan.features.bonusCoins > 0 && (
                <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center">
                    <Gift className="h-5 w-5 text-yellow-500 mr-2" />
                    <div>
                      <h3 className="font-semibold text-yellow-800">โบนัสพิเศษ!</h3>
                      <p className="text-sm text-yellow-700">
                        ได้รับเหรียญโบนัส {plan.features.bonusCoins.toLocaleString()} เหรียญ
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
            className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 px-8 py-3"
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

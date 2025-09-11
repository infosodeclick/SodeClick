import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card"
import { rabbitAPI, rabbitHelpers } from "../services/rabbitAPI"

import { 
  ArrowLeft, 
  Smartphone, 
  Shield, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Crown,
  Star,
  QrCode,
  Lock,
  Zap,
  Copy,
  RefreshCw,
  Timer
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface PaymentData {
  payment_id?: string;
  transaction_id?: string;
  orderId?: string;
  amount?: number;
  currency?: string;
  planId?: string;
  planTier?: string;
  planName?: string;
  userId?: string;
  status?: string;
  createdAt?: Date;
  expiryTime?: Date;
  qr_image?: string;
  qr_image_url?: string;
  qr_code_url?: string;
  vendor_qr_code?: string;
  url?: string;
  short_url?: string;
  transaction_url?: string;
  timeRemaining?: number;
  debug?: {
    hasQrImage?: boolean;
    hasQrCodeUrl?: boolean;
    hasVendorQrCode?: boolean;
    qrImageLength?: number;
    qrCodeUrlLength?: number;
    vendorQrCodeLength?: number;
  };
}

const PaymentGateway = ({ plan, onBack, onSuccess, onCancel }) => {
  const { user } = useAuth()
  const [processing, setProcessing] = useState(false)
  const [qrData, setQrData] = useState<PaymentData | null>(null)
  const [paymentStatus, setPaymentStatus] = useState('pending')
  const [timeRemaining, setTimeRemaining] = useState(300000) // 5 นาที
  const [currentTransaction, setCurrentTransaction] = useState<PaymentData | null>(null)
  const [paymentCheckInterval, setPaymentCheckInterval] = useState<number | null>(null)
  const [debugMode] = useState(true)



  // ระดับชั้นและราคาที่ตรงกัน
  const tierPricing = {
    member: { amount: 0, currency: 'THB', name: 'สมาชิกฟรี' },
    silver: { amount: 20, currency: 'THB', name: 'Silver Member' },
    gold: { amount: 50, currency: 'THB', name: 'Gold Member' },
    vip: { amount: 100, currency: 'THB', name: 'VIP Member' },
    vip1: { amount: 150, currency: 'THB', name: 'VIP 1' },
    vip2: { amount: 300, currency: 'THB', name: 'VIP 2' },
    diamond: { amount: 500, currency: 'THB', name: 'Diamond Member' },
    platinum: { amount: 1, currency: 'THB', name: 'Platinum Member' }
  }

  // Timer สำหรับ QR Code - หมดอายุใน 5 นาที
  useEffect(() => {
    if (qrData && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1000) {
            setPaymentStatus('expired')
            return 0
          }
          return prev - 1000
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [qrData]) // ใช้ qrData เป็น dependency เพื่อให้ timer เริ่มเมื่อมี QR code

  // ไม่ใช้ Auto Polling - ให้ผู้ใช้กดตรวจสอบสถานะเอง
  // useEffect(() => {
  //   if (qrData && paymentStatus === 'pending') {
  //     const interval = setInterval(async () => {
  //       try {
  //         // ใช้ rabbitAPI service
  //         const data = await rabbitAPI.checkPaymentStatus(qrData.payment_id)
  //         
  //         console.log('🔍 Payment status check:', data)
  //         
  //         if (data.status === 'completed') {
  //           setPaymentStatus('completed')
  //           
  //           // สร้าง transaction data สำหรับ PaymentSuccess
  //           const successData = {
  //             ...currentTransaction,
  //             paymentMethod: 'rabbit_gateway',
  //             timestamp: new Date().toISOString(),
  //             status: 'completed',
  //             transactionId: data.payment_id,
  //             amount: data.amount,
  //             currency: data.currency,
  //             tier: plan.tier // เพิ่ม tier สำหรับการอัพเกรดสมาชิก
  //           }
  //           
  //           console.log('🎉 Payment completed! Sending success data:', successData)
  //           onSuccess && onSuccess(successData)
  //           clearInterval(interval)
  //         } else if (data.status === 'failed') {
  //           setPaymentStatus('failed')
  //           clearInterval(interval)
  //         } else if (data.status === 'expired') {
  //           setPaymentStatus('expired')
  //           clearInterval(interval)
  //         }
  //       } catch (error) {
  //         console.error('Error checking payment status:', error)
  //       }
  //     }, 5000) // ตรวจสอบทุก 5 วินาที
  //     
  //     return () => clearInterval(interval)
  //   }
  // }, [paymentStatus, onSuccess]) // ลบ qrData ออกเพื่อไม่ให้ re-run เมื่อ qrData เปลี่ยน


  // ตรวจสอบและโหลด QR data จาก localStorage เมื่อ component mount
  useEffect(() => {
    const qrKey = `qr-${plan.id}-${user?._id || user?.id}`
    const savedQRData = localStorage.getItem(qrKey)
    
    if (savedQRData) {
      try {
        const parsedData = JSON.parse(savedQRData)
        console.log('🔄 Loading existing QR data from localStorage')
        setQrData(parsedData)
        setPaymentStatus(parsedData.status || 'pending')
        setTimeRemaining(parsedData.timeRemaining || 300000)
      } catch (error) {
        console.error('Error parsing saved QR data:', error)
        localStorage.removeItem(qrKey)
      }
    }
    
    // สร้าง QR ใหม่เฉพาะเมื่อไม่มีข้อมูลเก่า
    if (!savedQRData && !qrData && !processing) {
      console.log('🚀 Component mounted - Creating new QR Code')
      createRabbitPayment()
    }
  }, []) // ไม่มี dependency เพื่อให้รันแค่ครั้งเดียว

  // สร้าง Rabbit Payment
  const createRabbitPayment = async () => {
    console.log('=== Starting Rabbit QR Code Generation ===')
    setProcessing(true)
    
    try {
      const pricing = tierPricing[plan.tier] || tierPricing.vip
      const orderId = rabbitHelpers.generateOrderId()
      
      // ใช้ rabbitAPI service
      const result = await rabbitAPI.createPayment({
        orderId: orderId,
        amount: pricing.amount
      })
      
      console.log('🐇 Rabbit Gateway Response:', result)
      console.log('🖼️ QR Image Data:', {
        qr_image: result.qr_image,
        qr_image_url: result.qr_image_url,
        qr_code_url: result.qr_code_url,
        vendor_qr_code: result.vendor_qr_code ? result.vendor_qr_code.substring(0, 50) + '...' : null,
        url: result.url,
        short_url: result.short_url,
        transaction_url: result.transaction_url
      })
      
      // Debug: Check what QR data we actually have
      console.log('🔍 QR Data Analysis:', {
        has_qr_image: !!result.qr_image,
        has_qr_image_url: !!result.qr_image_url,
        has_qr_code_url: !!result.qr_code_url,
        has_vendor_qr_code: !!result.vendor_qr_code,
        qr_image_type: typeof result.qr_image,
        qr_image_length: result.qr_image ? result.qr_image.length : 0
      })
      
      const transaction = {
        id: result.payment_id,
        transactionId: result.transaction_id,
        orderId: orderId,
        amount: result.amount || pricing.amount,
        currency: result.currency || 'THB',
        planId: plan.id,
        planTier: plan.tier,
        planName: plan.name,
        userId: user?._id,
        status: result.status || 'pending',
        createdAt: new Date(),
        expiryTime: new Date(result.expire_at)
      }
      
      setCurrentTransaction(transaction)
      
      const qrDataToSave = {
        payment_id: result.payment_id,
        transaction_id: result.transaction_id,
        orderId: orderId,
        amount: result.amount || pricing.amount,
        currency: result.currency || 'THB',
        qr_image: result.qr_image || result.qr_image_url || result.qr_code_url,
        vendor_qr_code: result.vendor_qr_code,
        qr_code: result.qr_code,
        expiryTime: new Date(result.expire_at),
        url: result.url || result.transaction_url,
        short_url: result.short_url,
        transaction_url: result.transaction_url,
        status: 'pending',
        timeRemaining: 5 * 60 * 1000 // 5 นาที
      }
      
      setQrData(qrDataToSave)
      setTimeRemaining(5 * 60 * 1000) // 5 นาที
      setPaymentStatus('pending')
      
      // บันทึก QR data ลง localStorage
      const qrKey = `qr-${plan.id}-${user?._id || user?.id}`
      localStorage.setItem(qrKey, JSON.stringify(qrDataToSave))
      
      console.log('=== Rabbit QR Code Generation Completed Successfully ===')
    } catch (error: unknown) {
      console.error('Rabbit QR Code generation failed:', error)
      setPaymentStatus('error')
      
      // แสดงข้อความ error ที่เป็นประโยชน์
      if (error instanceof Error && error.message.includes('ไม่สามารถเชื่อมต่อ Rabbit Gateway ได้')) {
        console.log('🔧 Rabbit Gateway Setup Required:')
        console.log('1. ไปที่ Rabbit Gateway Dashboard')
        console.log('2. สร้าง Application และรับ Application ID')
        console.log('3. รับ Public Key และ Secret Key')
        console.log('4. ตั้งค่าในไฟล์ backend/env.development')
        console.log('5. รีสตาร์ท server')
      }
    } finally {
      setProcessing(false)
    }
  }


  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    // แสดง notification หรือ toast
  }

  const refreshQR = () => {
    if (paymentCheckInterval) {
      clearInterval(paymentCheckInterval)
      setPaymentCheckInterval(null)
    }
    // ล้าง localStorage และ state ก่อนสร้าง QR ใหม่
    const qrKey = `qr-${plan.id}-${user?._id || user?.id}`
    localStorage.removeItem(qrKey)
    setQrData(null)
    setPaymentStatus('pending')
    setTimeRemaining(300000)
    createRabbitPayment()
  }

  // ฟังก์ชันตรวจสอบสถานะการชำระเงินแบบ manual
  const checkPaymentStatus = async () => {
    if (!qrData || !qrData.payment_id) {
      console.log('❌ No payment ID available')
      return
    }

    try {
      console.log('🔍 Checking payment status manually...')
      const data = await rabbitAPI.checkPaymentStatus(qrData.payment_id)
      
      console.log('🔍 Payment status check result:', data)
      
      if (data.status === 'completed') {
        setPaymentStatus('completed')
        
        // สร้าง transaction data สำหรับ PaymentSuccess
        const successData = {
          ...currentTransaction,
          paymentMethod: 'rabbit_gateway',
          timestamp: new Date().toISOString(),
          status: 'completed',
          transactionId: data.payment_id,
          amount: data.amount,
          currency: data.currency,
          tier: plan.tier // เพิ่ม tier สำหรับการอัพเกรดสมาชิก
        }
        
        console.log('🎉 Payment completed! Sending success data:', successData)
        onSuccess && onSuccess(successData)
      } else if (data.status === 'failed') {
        setPaymentStatus('failed')
      } else if (data.status === 'expired') {
        setPaymentStatus('expired')
      } else {
        console.log('⏳ Payment still pending...')
      }
    } catch (error) {
      console.error('❌ Error checking payment status:', error)
    }
  }

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (paymentCheckInterval) {
        clearInterval(paymentCheckInterval)
      }
      // ไม่ล้าง localStorage เพื่อให้ QR data ยังคงอยู่เมื่อกลับมาหน้านี้
    }
  }, [paymentCheckInterval])

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getStatusMessage = (status) => {
    switch (status) {
      case 'pending':
        return 'รอการชำระเงิน'
      case 'completed':
        return 'ชำระเงินสำเร็จ'
      case 'failed':
        return 'การชำระเงินล้มเหลว'
      case 'expired':
        return 'QR Code หมดอายุ'
      case 'error':
        return 'เกิดข้อผิดพลาด'
      default:
        return 'ไม่ทราบสถานะ'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600'
      case 'completed':
        return 'text-green-600'
      case 'failed':
        return 'text-red-600'
      case 'expired':
        return 'text-gray-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="h-4 w-4" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'failed':
        return <AlertCircle className="h-4 w-4" />
      case 'expired':
        return <Timer className="h-4 w-4" />
      case 'error':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-violet-50 to-blue-50 p-2">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <Button 
            variant="ghost"
            onClick={onBack}
            className="mb-2 text-slate-600 hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            กลับ
          </Button>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold gradient-text mb-1">
              🐇 Rabbit Payment Gateway
              </h1>
            <p className="text-slate-600 text-sm">
              ชำระเงินอย่างปลอดภัยและรวดเร็ว
              </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Payment Details */}
          <Card className="modern-card shadow-xl border border-white/30 overflow-hidden backdrop-blur-lg">
            <CardHeader className="bg-gradient-to-br from-green-50/90 via-emerald-50/90 to-teal-50/90 backdrop-blur-xl border-b border-white/30 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                    <QrCode className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-1">
                      🐇 Rabbit Gateway
                    </CardTitle>
                    <p className="text-xs text-slate-600 flex items-center">
                      <Lock className="h-3 w-3 mr-1 text-green-500" />
                      ระบบชำระเงินที่ปลอดภัย
                    </p>
                  </div>
                </div>
              </div>
              </CardHeader>
            <CardContent className="space-y-4">
              {/* Rabbit Gateway Features Banner */}
              <div className="relative overflow-hidden p-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">🐇 Rabbit Gateway</h3>
                      <p className="text-white/90 text-xs">ระบบชำระเงินที่ปลอดภัย รวดเร็ว และสะดวกสบาย</p>
                    </div>
                    <div className="hidden sm:block">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <QrCode className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-white/90">
                    <div className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      <span className="text-xs">ปลอดภัย 100%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      <span className="text-xs">รวดเร็ว</span>
                </div>
                    <div className="flex items-center gap-1">
                      <Smartphone className="h-3 w-3" />
                      <span className="text-xs">QR Code</span>
                          </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      <span className="text-xs">ยืนยันอัตโนมัติ</span>
                      </div>
                  </div>
                  </div>
                </div>

              {/* Plan Details */}
              <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/50">
                <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  แพ็กเกจที่เลือก
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white/70 rounded-lg border border-slate-200/50">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                        <Star className="h-4 w-4 text-white" />
                      </div>
                    <div>
                        <h4 className="font-semibold text-slate-800 text-sm">{plan.name}</h4>
                        <p className="text-xs text-slate-600">{plan.tier.toUpperCase()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-slate-800">
                        ฿{tierPricing[plan.tier]?.amount || plan.price?.amount || 0}
                        </div>
                      <div className="text-xs text-slate-600">THB</div>
                    </div>
                  </div>
                </div>
          </div>

              {/* Payment Status */}
              <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/50">
                <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Timer className="h-4 w-4 text-blue-500" />
                  สถานะการชำระเงิน
                </h3>
                
                {qrData ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/70 rounded-lg border border-slate-200/50">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          paymentStatus === 'completed' ? 'bg-green-500' :
                          paymentStatus === 'failed' ? 'bg-red-500' :
                          paymentStatus === 'expired' ? 'bg-gray-500' :
                          'bg-yellow-500'
                        }`}>
                          {getStatusIcon(paymentStatus)}
                    </div>
                        <div>
                          <h4 className="font-semibold text-slate-800 text-sm">
                            {getStatusMessage(paymentStatus)}
                          </h4>
                          <p className="text-xs text-slate-600">
                            Order ID: {qrData.orderId}
                          </p>
                  </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-base font-bold ${getStatusColor(paymentStatus)}`}>
                          {paymentStatus === 'pending' && timeRemaining > 0 ? formatTime(timeRemaining) : ''}
                          </div>
                        <div className="text-xs text-slate-600">
                          {paymentStatus === 'pending' ? 'เวลาที่เหลือ' : 'สถานะ'}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-4">
                    <div className="text-center">
                      <Loader2 className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">กำลังสร้าง QR Code...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    onClick={onCancel}
                    variant="outline"
                    className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-50"
                  >
                    ยกเลิก
                  </Button>
                </div>
                
                {/* ปุ่มตรวจสอบสถานะการชำระเงิน (เฉพาะเมื่อมี QR Code แล้ว) */}
                {qrData && paymentStatus === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={checkPaymentStatus}
                      className="flex-1 modern-button bg-blue-500 hover:bg-blue-600"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      ตรวจสอบสถานะ
                    </Button>
                    
                    <Button
                      onClick={refreshQR}
                      disabled={processing}
                      variant="outline"
                      className="flex-1 border-blue-300 text-blue-600 hover:bg-blue-50"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      สร้าง QR ใหม่
                    </Button>
                  </div>
                )}
                
                
              </div>
            </CardContent>
          </Card>

          {/* QR Code Display */}
          <Card className="modern-card shadow-xl border border-white/30 overflow-hidden backdrop-blur-lg">
            <CardHeader className="bg-gradient-to-br from-blue-50/90 via-indigo-50/90 to-purple-50/90 backdrop-blur-xl border-b border-white/30 py-3">
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <QrCode className="h-5 w-5 text-blue-500" />
                QR Code สำหรับชำระเงิน
              </CardTitle>
              <p className="text-xs text-slate-600">
                สแกน QR Code ด้วยแอปธนาคารของคุณ
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {processing ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 text-blue-500 mb-3" />
                  <h3 className="text-base font-semibold text-slate-800 mb-2">
                    กำลังสร้าง QR Code...
                        </h3>
                  <p className="text-slate-600 text-center text-sm">
                    กรุณารอสักครู่ ระบบกำลังสร้าง QR Code สำหรับการชำระเงิน
                  </p>
                      </div>
              ) : !qrData ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-12 w-12 text-blue-500 mb-3" />
                  <h3 className="text-base font-semibold text-slate-800 mb-2">
                    กำลังสร้าง QR Code...
                        </h3>
                  <p className="text-slate-600 text-center text-sm">
                    กรุณารอสักครู่ ระบบกำลังสร้าง QR Code สำหรับการชำระเงิน
                  </p>
                      </div>
              ) : qrData ? (
                <div className="space-y-4">
                  {/* Debug Info */}
                  {debugMode && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs">
                      <p><strong>🔍 Debug QR Data:</strong></p>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <p><strong>QR Image:</strong> {qrData.qr_image ? `✅ Yes (${qrData.qr_image.length} chars)` : '❌ No'}</p>
                          <p><strong>QR Image URL:</strong> {qrData.qr_image_url ? `✅ Yes` : '❌ No'}</p>
                          <p><strong>QR Code URL:</strong> {qrData.qr_code_url ? `✅ Yes` : '❌ No'}</p>
                        </div>
                        <div>
                          <p><strong>Vendor QR Code:</strong> {qrData.vendor_qr_code ? `✅ Yes (${qrData.vendor_qr_code.length} chars)` : '❌ No'}</p>
                          <p><strong>Payment ID:</strong> {qrData.payment_id || 'N/A'}</p>
                          <p><strong>Status:</strong> {qrData.status || 'N/A'}</p>
                        </div>
                      </div>
                      {qrData.debug && (
                        <div className="mt-2 p-2 bg-blue-50 rounded border">
                          <p><strong>Backend Debug:</strong></p>
                          <p>Has QR Image: {qrData.debug.hasQrImage ? '✅' : '❌'}</p>
                          <p>Has QR Code URL: {qrData.debug.hasQrCodeUrl ? '✅' : '❌'}</p>
                          <p>Has Vendor QR Code: {qrData.debug.hasVendorQrCode ? '✅' : '❌'}</p>
                        </div>
                      )}
                      {qrData.qr_image && (
                        <div className="mt-2">
                          <p><strong>QR Image Preview:</strong></p>
                          <p className="font-mono text-xs break-all">{qrData.qr_image.substring(0, 100)}...</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* QR Code Image */}
                  <div className="flex justify-center">
                    <div className="relative">
                      {/* แสดง QR Image ถ้ามี */}
                      {(qrData.qr_image || qrData.qr_image_url || qrData.qr_code_url) && (
                        <img
                          src={qrData.qr_image || qrData.qr_image_url || qrData.qr_code_url}
                          alt="QR Code for Payment"
                          className="w-48 h-48 border-2 border-white rounded-xl shadow-lg"
                          onError={(e) => {
                            console.log('QR Image failed to load, showing fallback');
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            // แสดง fallback div
                            const fallbackDiv = target.parentElement?.querySelector('.qr-fallback') as HTMLElement;
                            if (fallbackDiv) {
                              fallbackDiv.style.display = 'flex';
                            }
                          }}
                        />
                      )}
                      
                      {/* Fallback: แสดง vendor QR code หรือข้อความ */}
                      <div 
                        className="qr-fallback w-48 h-48 border-2 border-white rounded-xl shadow-lg bg-white flex items-center justify-center"
                        style={{ display: (qrData.qr_image || qrData.qr_image_url || qrData.qr_code_url) ? 'none' : 'flex' }}
                      >
                        {qrData.vendor_qr_code ? (
                          <div className="text-center p-3">
                            <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-xs text-gray-600 mb-1">QR Code String:</p>
                            <p className="text-xs text-gray-500 break-all font-mono">
                              {qrData.vendor_qr_code.substring(0, 30)}...
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              ใช้แอปธนาคารสแกน QR Code นี้
                            </p>
                            <div className="mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(qrData.vendor_qr_code)}
                                className="text-xs"
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copy QR String
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center">
                            <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-xs text-gray-600">ไม่มี QR Code</p>
                            <p className="text-xs text-gray-500 mt-1">กรุณาลองใหม่อีกครั้ง</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Overlay สำหรับ QR Code หมดอายุ */}
                      {paymentStatus === 'expired' && (
                        <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                          <div className="text-white text-center">
                            <Timer className="h-6 w-6 mx-auto mb-1" />
                            <p className="font-semibold text-sm">QR Code หมดอายุ</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Power By Text */}
                  <div className="text-center mt-4">
                    <div className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 rounded-lg shadow-lg">
                      <p className="text-sm text-white font-bold">
                        Power By <span className="text-yellow-300 font-extrabold">DevNid</span> & <span className="text-pink-300 font-extrabold">Kao</span>
                      </p>
                    </div>
                  </div>

                  {/* Payment Information */}
                  <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-200/50">
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">จำนวนเงิน:</span>
                        <span className="font-semibold text-slate-800">
                          ฿{qrData.amount} {qrData.currency}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-slate-200/50">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600">Order ID:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-slate-800">
                            {qrData.orderId}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(qrData.orderId)}
                            className="h-4 w-4 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <AlertCircle className="h-8 w-8 text-red-500 mb-3" />
                  <h3 className="text-base font-semibold text-slate-800 mb-2">
                    ไม่สามารถสร้าง QR Code ได้
                  </h3>
                  <p className="text-slate-600 text-center mb-3 text-sm">
                    เกิดข้อผิดพลาดในการสร้าง QR Code
                  </p>
                  
                  {/* แสดงข้อความ setup instructions */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3 max-w-sm">
                    <h4 className="font-semibold text-yellow-800 mb-2 text-sm">🔧 การตั้งค่า Rabbit Gateway</h4>
                    <div className="text-xs text-yellow-700 space-y-1">
                      <p>1. ไปที่ Rabbit Gateway Dashboard</p>
                      <p>2. สร้าง Application และรับ Application ID</p>
                      <p>3. รับ Public Key และ Secret Key</p>
                      <p>4. ตั้งค่าในไฟล์ backend/env.development</p>
                      <p>5. รีสตาร์ท server</p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={createRabbitPayment}
                    className="modern-button bg-blue-500 hover:bg-blue-600"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    ลองใหม่
                  </Button>
                </div>
              )}
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
}

export default PaymentGateway
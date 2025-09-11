import { useState, useEffect } from 'react'
import LovePaymentAnimation from './LovePaymentAnimation'
import PaymentGateway from './PaymentGateway'

interface PaymentWithAnimationProps {
  plan: any
  onBack: () => void
  onSuccess: (data: any) => void
  onCancel: () => void
}

const PaymentWithAnimation = ({ plan, onBack, onSuccess, onCancel }: PaymentWithAnimationProps) => {
  const [showAnimation, setShowAnimation] = useState(true)

  const handleAnimationComplete = () => {
    setShowAnimation(false)
    // เลื่อนหน้าจอมาล่างสุดเพื่อให้เห็น QR code
    setTimeout(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth'
      })
    }, 100) // รอให้ component render เสร็จก่อน
  }

  if (showAnimation) {
    return <LovePaymentAnimation onComplete={handleAnimationComplete} duration={2000} />
  }

  return (
    <PaymentGateway
      plan={plan}
      onBack={onBack}
      onSuccess={onSuccess}
      onCancel={onCancel}
    />
  )
}

export default PaymentWithAnimation

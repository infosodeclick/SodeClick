 import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Mail, Lock, Phone, Eye, EyeOff, Loader2, Heart, ArrowLeft } from 'lucide-react'
import { thaiProvinces } from '../utils/thaiProvinces'
import ForgotPasswordModal from './ForgotPasswordModal'
import GoogleIcon from './GoogleIcon'
import { googleAuthService } from '../services/googleAuth'

const LoginModal = ({ isOpen, onClose, onLoginSuccess }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [activeTab, setActiveTab] = useState('email')
  const [registerActiveTab, setRegisterActiveTab] = useState('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [isGoogleOAuthAvailable, setIsGoogleOAuthAvailable] = useState(false)

  // Debug logging
  useEffect(() => {
    if (isOpen) {
      console.log('🔓 LoginModal opened');
    }
  }, [isOpen]);

  // Reset form states when modal opens
  useEffect(() => {
    if (isOpen) {
      setError('')
      setSuccess('')
      setLoading(false)
    }
  }, [isOpen])

  // Form states
  const [emailForm, setEmailForm] = useState({
    emailOrUsername: '',
    password: '',
    showPassword: false
  })

  const [phoneForm, setPhoneForm] = useState({
    phone: '',
    password: '',
    showPassword: false
  })

  const [registerForm, setRegisterForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    gender: '',
    lookingFor: '',
    location: '',
    province: '',
    showPassword: false,
    showConfirmPassword: false
  })

  // Check Google OAuth availability when modal opens
  useEffect(() => {
    if (isOpen) {
      googleAuthService.getGoogleAuthUrl()
        .then(response => {
          setIsGoogleOAuthAvailable(response.success)
        })
        .catch(() => {
          setIsGoogleOAuthAvailable(false)
        })
    }
  }, [isOpen])

  // Function to filter only English characters for username and email
  const filterEnglishOnly = (value) => {
    return value.replace(/[^a-zA-Z0-9@._-]/g, '')
  }

  // Function to filter only English characters and numbers for username
  const filterUsernameOnly = (value) => {
    return value.replace(/[^a-zA-Z0-9]/g, '')
  }

  // Function to filter and format phone number
  const filterPhoneNumber = (value) => {
    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, '')
    
    // Limit to 10 digits
    return digitsOnly.slice(0, 10)
  }

  // Google Sign In handler
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      // Check if Google OAuth is available
      const response = await googleAuthService.getGoogleAuthUrl()
      if (response.success) {
        googleAuthService.initiateGoogleSignIn()
      } else {
        setError('Google OAuth ไม่พร้อมใช้งานในขณะนี้')
        setLoading(false)
      }
    } catch (error) {
      console.error('Google Sign In error:', error)
      setError('Google OAuth ไม่พร้อมใช้งานในขณะนี้')
      setLoading(false)
    }
  }

  // Handle email/username/password login
  const handleEmailLogin = async (e) => {
    e.preventDefault()
    console.log('📧 Email login attempt started');
    setLoading(true)
    setError('')

    try {
      // Determine if input is email or username
      const isEmail = emailForm.emailOrUsername.includes('@')
      const requestBody = {
        password: emailForm.password
      }
      
      if (isEmail) {
        requestBody.email = emailForm.emailOrUsername
      } else {
        requestBody.username = emailForm.emailOrUsername
      }

      console.log('📤 Sending login request:', requestBody);
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      console.log('📥 Login response:', { status: response.status, data });

      if (data.success) {
        setSuccess('เข้าสู่ระบบสำเร็จ!')
        localStorage.setItem('token', data.data.token)
        localStorage.setItem('user', JSON.stringify(data.data.user))
        
        // Blur all input fields to dismiss keyboard on mobile
        const activeElement = document.activeElement
        if (activeElement && activeElement.blur) {
          activeElement.blur()
        }
        
        console.log('✅ Email login successful, calling onLoginSuccess');
        onLoginSuccess(data.data)
        onClose()
      } else {
        setError(data.message || 'อีเมล/ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
      }
    } catch (error) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setLoading(false)
    }
  }


  // Handle phone login
  const handlePhoneLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    console.log('Phone login form submitted:', phoneForm)

    if (!phoneForm.phone) {
      setError('กรุณากรอกเบอร์โทรศัพท์')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/login-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: phoneForm.phone,
          password: phoneForm.password
        })
      })

      const data = await response.json()
      console.log('Phone login response:', data)

      if (data.success) {
        setSuccess('เข้าสู่ระบบสำเร็จ!')
        localStorage.setItem('token', data.data.token)
        localStorage.setItem('user', JSON.stringify(data.data.user))
        
        // Blur all input fields to dismiss keyboard on mobile
        const activeElement = document.activeElement
        if (activeElement && activeElement.blur) {
          activeElement.blur()
        }
        
        console.log('✅ Phone login successful, calling onLoginSuccess');
        onLoginSuccess(data.data)
        onClose()
      } else {
        setError(data.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ')
      }
    } catch (error) {
      console.error('Phone login error:', error)
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setLoading(false)
    }
  }



  // Handle register
  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validation
    const requiredFields = ['firstName', 'lastName', 'username', 'email', 'password', 'confirmPassword', 'dateOfBirth', 'gender', 'lookingFor', 'province']
    const missingFields = requiredFields.filter(field => !registerForm[field])
    
    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields)
      setError('กรุณากรอกข้อมูลให้ครบถ้วน')
      setLoading(false)
      return
    }

    // ตรวจสอบชื่อผู้ใช้: ต้องเป็นภาษาอังกฤษเท่านั้น และมีความยาวไม่ต่ำกว่า 6 ตัวอักษร
    const englishOnlyRegex = /^[a-zA-Z0-9]+$/
    
    if (!englishOnlyRegex.test(registerForm.username)) {
      setError('ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษและตัวเลขเท่านั้น')
      setLoading(false)
      return
    }

    if (registerForm.username.length < 6) {
      setError('ชื่อผู้ใช้ต้องมีความยาวไม่ต่ำกว่า 6 ตัวอักษร')
      setLoading(false)
      return
    }

    // ตรวจสอบอีเมลให้เป็นภาษาอังกฤษเท่านั้น
    const emailRegex = /^[a-zA-Z0-9@._-]+$/
    if (!emailRegex.test(registerForm.email)) {
      setError('อีเมลต้องเป็นภาษาอังกฤษและตัวเลขเท่านั้น')
      setLoading(false)
      return
    }

    // ตรวจสอบรหัสผ่าน
    if (registerForm.password !== registerForm.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน')
      setLoading(false)
      return
    }

    // ตรวจสอบรหัสผ่าน: ต้องมี 8 ตัวอักษรขึ้นไป, มีตัวอักษรใหญ่ ตัวเล็ก และตัวเลข, ต้องเป็นภาษาอังกฤษเท่านั้น
    if (registerForm.password.length < 8) {
      setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
      setLoading(false)
      return
    }

    // ตรวจสอบรหัสผ่านต้องเป็นภาษาอังกฤษเท่านั้น
    const passwordEnglishRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/
    if (!passwordEnglishRegex.test(registerForm.password)) {
      setError('รหัสผ่านต้องเป็นภาษาอังกฤษและตัวเลขเท่านั้น')
      setLoading(false)
      return
    }

    // ตรวจสอบรหัสผ่านต้องมีตัวอักษรใหญ่ ตัวเล็ก และตัวเลข
    const hasUpperCase = /[A-Z]/.test(registerForm.password)
    const hasLowerCase = /[a-z]/.test(registerForm.password)
    const hasNumbers = /\d/.test(registerForm.password)

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      setError('รหัสผ่านต้องมีตัวอักษรใหญ่ ตัวเล็ก และตัวเลข')
      setLoading(false)
      return
    }

    console.log('All validation passed, sending request...')

    try {
      const requestBody = {
        firstName: registerForm.firstName.trim(),
        lastName: registerForm.lastName.trim(),
        username: registerForm.username.trim(),
        email: registerForm.email.trim(),
        password: registerForm.password,
        dateOfBirth: registerForm.dateOfBirth,
        gender: registerForm.gender,
        lookingFor: registerForm.lookingFor,
        location: registerForm.province.trim(),
        province: registerForm.province.trim()
      }
      
      console.log('Register request body:', requestBody)

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      console.log('Register response:', data)

      if (data.success) {
        setSuccess('ลงทะเบียนสำเร็จ!')
        localStorage.setItem('token', data.data.token)
        localStorage.setItem('user', JSON.stringify(data.data.user))
        
        // Blur all input fields to dismiss keyboard on mobile
        const activeElement = document.activeElement
        if (activeElement && activeElement.blur) {
          activeElement.blur()
        }
        
        console.log('✅ Registration successful, calling onLoginSuccess');
        onLoginSuccess(data.data)
        onClose()
      } else {
        setError(data.message || 'เกิดข้อผิดพลาดในการลงทะเบียน')
      }
    } catch (error) {
      console.error('Register error:', error)
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setLoading(false)
    }
  }

  // Handle phone register
  const handlePhoneRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validation
    const requiredFields = ['firstName', 'lastName', 'password', 'confirmPassword', 'dateOfBirth', 'gender', 'lookingFor', 'province']
    const missingFields = requiredFields.filter(field => !registerForm[field])
    
    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields)
      setError('กรุณากรอกข้อมูลให้ครบถ้วน')
      setLoading(false)
      return
    }

    // ตรวจสอบเบอร์โทรศัพท์
    if (!phoneForm.phone) {
      setError('กรุณากรอกเบอร์โทรศัพท์')
      setLoading(false)
      return
    }

    // ตรวจสอบรูปแบบเบอร์โทรศัพท์ (ต้องเริ่มด้วย 08, 09, 06 และมี 10 หลัก)
    const phoneRegex = /^(08|09|06)\d{8}$/
    if (!phoneRegex.test(phoneForm.phone)) {
      setError('เบอร์โทรศัพท์ต้องเริ่มด้วย 08, 09, หรือ 06 และมี 10 หลัก')
      setLoading(false)
      return
    }

    // ตรวจสอบรหัสผ่าน
    if (registerForm.password !== registerForm.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน')
      setLoading(false)
      return
    }

    // ตรวจสอบรหัสผ่าน: ต้องมี 8 ตัวอักษรขึ้นไป, มีตัวอักษรใหญ่ ตัวเล็ก และตัวเลข, ต้องเป็นภาษาอังกฤษเท่านั้น
    if (registerForm.password.length < 8) {
      setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
      setLoading(false)
      return
    }

    // ตรวจสอบรหัสผ่านต้องเป็นภาษาอังกฤษเท่านั้น
    const passwordEnglishRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/
    if (!passwordEnglishRegex.test(registerForm.password)) {
      setError('รหัสผ่านต้องเป็นภาษาอังกฤษและตัวเลขเท่านั้น')
      setLoading(false)
      return
    }

    // ตรวจสอบรหัสผ่านต้องมีตัวอักษรใหญ่ ตัวเล็ก และตัวเลข
    const hasUpperCase = /[A-Z]/.test(registerForm.password)
    const hasLowerCase = /[a-z]/.test(registerForm.password)
    const hasNumbers = /\d/.test(registerForm.password)

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      setError('รหัสผ่านต้องมีตัวอักษรใหญ่ ตัวเล็ก และตัวเลข')
      setLoading(false)
      return
    }

    console.log('All validation passed, sending request...')

    try {
      const requestBody = {
        phone: phoneForm.phone.trim(),
        password: registerForm.password,
        firstName: registerForm.firstName.trim(),
        lastName: registerForm.lastName.trim(),
        dateOfBirth: registerForm.dateOfBirth,
        gender: registerForm.gender,
        lookingFor: registerForm.lookingFor,
        location: registerForm.province.trim(),
        province: registerForm.province.trim()
      }
      
      console.log('Phone register request body:', requestBody)

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/register-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      console.log('Phone register response:', data)

      if (data.success) {
        setSuccess('ลงทะเบียนสำเร็จ!')
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        
        // Blur all input fields to dismiss keyboard on mobile
        const activeElement = document.activeElement
        if (activeElement && activeElement.blur) {
          activeElement.blur()
        }
        
        console.log('✅ Registration successful, calling onLoginSuccess');
        onLoginSuccess(data)
        onClose()
      } else {
        setError(data.message || 'เกิดข้อผิดพลาดในการลงทะเบียน')
      }
    } catch (error) {
      console.error('Phone register error:', error)
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setLoading(false)
    }
  }



  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md w-[95vw] max-h-[90vh] overflow-y-auto modern-card border-0 shadow-2xl p-0 rounded-3xl overflow-hidden">
          <DialogTitle className="sr-only">
            {isRegisterMode ? 'สร้างบัญชีใหม่' : 'เข้าสู่ระบบ'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isRegisterMode ? 'เริ่มต้นการค้นหาความรัก' : 'ยินดีต้อนรับกลับ'}
          </DialogDescription>
          {/* Mobile-First Header */}
          <div className="relative bg-gradient-to-br from-pink-500 to-violet-500 p-6 text-white">
            {isRegisterMode && (
              <button
                onClick={() => setIsRegisterMode(false)}
                className="absolute left-4 top-4 p-2 rounded-2xl bg-white/20 hover:bg-white/30 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
                <Heart className="h-6 w-6" fill="white" />
              </div>
              <h2 className="text-xl font-bold">
                {isRegisterMode ? 'สร้างบัญชีใหม่' : 'เข้าสู่ระบบ'}
              </h2>
              <p className="text-sm text-white/80 mt-1">
                {isRegisterMode ? 'เริ่มต้นการค้นหาความรัก' : 'ยินดีต้อนรับกลับ'}
              </p>
            </div>
          </div>

          <div className="p-6">
            {/* Error/Success Messages */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm">
                {success}
              </div>
            )}

            {!isRegisterMode ? (
              // LOGIN MODE
              <div className="space-y-4">

                {/* Login Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4 rounded-2xl">
                    <TabsTrigger value="email" className="text-sm">
                      <Mail className="h-4 w-4 mr-2" />
                      อีเมล
                    </TabsTrigger>
                    <TabsTrigger value="phone" className="text-sm">
                      <Phone className="h-4 w-4 mr-2" />
                      โทรศัพท์
                    </TabsTrigger>
                  </TabsList>

                  {/* Email Login */}
                  <TabsContent value="email" className="space-y-4">
                    <form onSubmit={handleEmailLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Input
                          type="text"
                          placeholder="อีเมลหรือชื่อผู้ใช้"
                          value={emailForm.emailOrUsername}
                          onChange={(e) => setEmailForm(prev => ({ ...prev, emailOrUsername: e.target.value }))}
                          className="h-12 text-base rounded-2xl"
                          autoComplete="username"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="relative">
                          <Input
                            type={emailForm.showPassword ? 'text' : 'password'}
                            placeholder="รหัสผ่าน"
                            value={emailForm.password}
                            onChange={(e) => setEmailForm(prev => ({ ...prev, password: e.target.value }))}
                            className="h-12 text-base pr-12 rounded-2xl"
                            autoComplete="current-password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setEmailForm(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {emailForm.showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>

                      <Button type="submit" className="w-full h-12 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 rounded-2xl" disabled={loading}>
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            กำลังเข้าสู่ระบบ...
                          </>
                        ) : (
                          <>
                            <Heart className="mr-2 h-5 w-5" fill="white" />
                            เข้าสู่ระบบ
                          </>
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  {/* Phone Login */}
                  <TabsContent value="phone" className="space-y-4">
                    <form onSubmit={handlePhoneLogin} className="space-y-4">
                      <div className="space-y-2">
                      <Input
                        type="tel"
                        placeholder="เบอร์โทรศัพท์"
                        value={phoneForm.phone}
                        onChange={(e) => setPhoneForm(prev => ({ ...prev, phone: filterPhoneNumber(e.target.value) }))}
                        className="h-12 text-base rounded-2xl"
                        autoComplete="tel"
                        maxLength="10"
                        required
                      />
                      </div>

                      <div className="space-y-2">
                        <div className="relative">
                          <Input
                            type={phoneForm.showPassword ? 'text' : 'password'}
                            placeholder="รหัสผ่าน"
                            value={phoneForm.password}
                            onChange={(e) => setPhoneForm(prev => ({ ...prev, password: e.target.value }))}
                            className="h-12 text-base pr-12 rounded-2xl"
                            autoComplete="current-password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setPhoneForm(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {phoneForm.showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>

                      <Button type="submit" className="w-full h-12 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 rounded-2xl" disabled={loading}>
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            กำลังเข้าสู่ระบบ...
                          </>
                        ) : (
                          <>
                            <Heart className="mr-2 h-5 w-5" fill="white" />
                            เข้าสู่ระบบ
                          </>
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>

                {/* Google Sign In Button - Only show if available */}
                {isGoogleOAuthAvailable && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-300" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-gray-500">หรือ</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      className="w-full h-12 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-2xl"
                    >
                      <GoogleIcon className="mr-2 h-5 w-5" />
                      เข้าสู่ระบบด้วย Google
                    </Button>
                  </>
                )}

                {/* Forgot Password & Register */}
                <div className="space-y-3 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(true)
                      onClose()
                    }}
                    className="text-sm text-gray-600 hover:text-gray-700 underline"
                  >
                    ลืมรหัสผ่าน?
                  </button>
                  <div className="text-sm text-gray-600">
                    ยังไม่มีบัญชี?{' '}
                    <button
                      type="button"
                      onClick={() => setIsRegisterMode(true)}
                      className="text-pink-600 hover:text-pink-700 font-medium"
                    >
                      สร้างบัญชีใหม่
                    </button>
                  </div>
                </div>
              </div>

            ) : (
              // REGISTER MODE
              <div className="space-y-4">
                <Tabs value={registerActiveTab} onValueChange={setRegisterActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4 rounded-2xl">
                    <TabsTrigger value="email" className="text-sm">
                      <Mail className="h-4 w-4 mr-2" />
                      อีเมล
                    </TabsTrigger>
                    <TabsTrigger value="phone" className="text-sm">
                      <Phone className="h-4 w-4 mr-2" />
                      โทรศัพท์
                    </TabsTrigger>
                  </TabsList>

                  {/* Email Register */}
                  <TabsContent value="email" className="space-y-4">
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          type="text"
                          placeholder="ชื่อ"
                          value={registerForm.firstName}
                          onChange={(e) => setRegisterForm(prev => ({ ...prev, firstName: e.target.value }))}
                          className="h-12 text-base rounded-2xl"
                          required
                        />
                        <Input
                          type="text"
                          placeholder="นามสกุล"
                          value={registerForm.lastName}
                          onChange={(e) => setRegisterForm(prev => ({ ...prev, lastName: e.target.value }))}
                          className="h-12 text-base rounded-2xl"
                          required
                        />
                      </div>

                      <Input
                        type="text"
                        placeholder="ชื่อผู้ใช้"
                        value={registerForm.username}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, username: filterUsernameOnly(e.target.value) }))}
                        className="h-12 text-base rounded-2xl"
                        autoComplete="username"
                        required
                      />

                      <Input
                        type="email"
                        placeholder="อีเมล"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, email: filterEnglishOnly(e.target.value) }))}
                        className="h-12 text-base rounded-2xl"
                        autoComplete="email"
                        required
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <select
                          value={registerForm.gender}
                          onChange={(e) => setRegisterForm(prev => ({ ...prev, gender: e.target.value }))}
                          className="h-12 px-3 border border-gray-300 rounded-2xl text-base bg-white"
                          required
                        >
                          <option value="">เพศ</option>
                          <option value="male">ชาย</option>
                          <option value="female">หญิง</option>
                          <option value="other">อื่นๆ</option>
                        </select>

                        <select
                          value={registerForm.lookingFor}
                          onChange={(e) => setRegisterForm(prev => ({ ...prev, lookingFor: e.target.value }))}
                          className="h-12 px-3 border border-gray-300 rounded-2xl text-base bg-white"
                          required
                        >
                          <option value="">มองหา</option>
                          <option value="male">ชาย</option>
                          <option value="female">หญิง</option>
                          <option value="both">ทั้งคู่</option>
                        </select>
                      </div>

                      <Input
                        type="date"
                        value={registerForm.dateOfBirth}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                        className="h-12 text-base rounded-2xl"
                        required
                      />

                      <select
                        value={registerForm.province}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, province: e.target.value }))}
                        className="h-12 px-3 border border-gray-300 rounded-2xl text-base bg-white w-full"
                        required
                      >
                        <option value="">เลือกจังหวัด</option>
                        {thaiProvinces.map(province => (
                          <option key={province} value={province}>{province}</option>
                        ))}
                      </select>

                      <div className="space-y-2">
                        <div className="relative">
                          <Input
                            type={registerForm.showPassword ? 'text' : 'password'}
                            placeholder="รหัสผ่าน"
                            value={registerForm.password}
                            onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                            className="h-12 text-base pr-12 rounded-2xl"
                            autoComplete="new-password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setRegisterForm(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {registerForm.showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="relative">
                          <Input
                            type={registerForm.showConfirmPassword ? 'text' : 'password'}
                            placeholder="ยืนยันรหัสผ่าน"
                            value={registerForm.confirmPassword}
                            onChange={(e) => setRegisterForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            className="h-12 text-base pr-12 rounded-2xl"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setRegisterForm(prev => ({ ...prev, showConfirmPassword: !prev.showConfirmPassword }))}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {registerForm.showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>

                      <Button type="submit" className="w-full h-12 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 rounded-2xl" disabled={loading}>
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            กำลังสร้างบัญชี...
                          </>
                        ) : (
                          <>
                            <Heart className="mr-2 h-5 w-5" fill="white" />
                            สร้างบัญชี
                          </>
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  {/* Phone Register */}
                  <TabsContent value="phone" className="space-y-4">
                    <form onSubmit={handlePhoneRegister} className="space-y-4">
                      <Input
                        type="tel"
                        placeholder="เบอร์โทรศัพท์"
                        value={phoneForm.phone}
                        onChange={(e) => setPhoneForm(prev => ({ ...prev, phone: filterPhoneNumber(e.target.value) }))}
                        className="h-12 text-base rounded-2xl"
                        maxLength="10"
                        required
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          type="text"
                          placeholder="ชื่อ"
                          value={registerForm.firstName}
                          onChange={(e) => setRegisterForm(prev => ({ ...prev, firstName: e.target.value }))}
                          className="h-12 text-base rounded-2xl"
                          required
                        />
                        <Input
                          type="text"
                          placeholder="นามสกุล"
                          value={registerForm.lastName}
                          onChange={(e) => setRegisterForm(prev => ({ ...prev, lastName: e.target.value }))}
                          className="h-12 text-base rounded-2xl"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <select
                          value={registerForm.gender}
                          onChange={(e) => setRegisterForm(prev => ({ ...prev, gender: e.target.value }))}
                          className="h-12 px-3 border border-gray-300 rounded-2xl text-base bg-white"
                          required
                        >
                          <option value="">เพศ</option>
                          <option value="male">ชาย</option>
                          <option value="female">หญิง</option>
                          <option value="other">อื่นๆ</option>
                        </select>

                        <select
                          value={registerForm.lookingFor}
                          onChange={(e) => setRegisterForm(prev => ({ ...prev, lookingFor: e.target.value }))}
                          className="h-12 px-3 border border-gray-300 rounded-2xl text-base bg-white"
                          required
                        >
                          <option value="">มองหา</option>
                          <option value="male">ชาย</option>
                          <option value="female">หญิง</option>
                          <option value="both">ทั้งคู่</option>
                        </select>
                      </div>

                      <Input
                        type="date"
                        value={registerForm.dateOfBirth}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                        className="h-12 text-base rounded-2xl"
                        required
                      />

                      <select
                        value={registerForm.province}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, province: e.target.value }))}
                        className="h-12 px-3 border border-gray-300 rounded-2xl text-base bg-white w-full"
                        required
                      >
                        <option value="">เลือกจังหวัด</option>
                        {thaiProvinces.map(province => (
                          <option key={province} value={province}>{province}</option>
                        ))}
                      </select>

                      <div className="space-y-2">
                        <div className="relative">
                          <Input
                            type={registerForm.showPassword ? 'text' : 'password'}
                            placeholder="รหัสผ่าน"
                            value={registerForm.password}
                            onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                            className="h-12 text-base pr-12 rounded-2xl"
                            autoComplete="new-password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setRegisterForm(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {registerForm.showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="relative">
                          <Input
                            type={registerForm.showConfirmPassword ? 'text' : 'password'}
                            placeholder="ยืนยันรหัสผ่าน"
                            value={registerForm.confirmPassword}
                            onChange={(e) => setRegisterForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            className="h-12 text-base pr-12 rounded-2xl"
                            autoComplete="new-password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setRegisterForm(prev => ({ ...prev, showConfirmPassword: !prev.showConfirmPassword }))}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {registerForm.showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>

                      <Button type="submit" className="w-full h-12 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 rounded-2xl" disabled={loading}>
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            กำลังสร้างบัญชี...
                          </>
                        ) : (
                          <>
                            <Heart className="mr-2 h-5 w-5" fill="white" />
                            สร้างบัญชี
                          </>
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <ForgotPasswordModal
          isOpen={showForgotPassword}
          onClose={() => setShowForgotPassword(false)}
        />
      )}
    </>
  )
}

export default LoginModal

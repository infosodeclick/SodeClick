import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Mail, Lock, Phone, MessageCircle, Eye, EyeOff, XCircle, CheckCircle, Loader2, Heart } from 'lucide-react'
import { thaiProvinces } from '../utils/thaiProvinces'
import ForgotPasswordModal from './ForgotPasswordModal'

const LoginModal = ({ isOpen, onClose, onLoginSuccess }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [activeTab, setActiveTab] = useState('email')
  const [registerActiveTab, setRegisterActiveTab] = useState('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)

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
        sessionStorage.setItem('token', data.data.token)
        sessionStorage.setItem('user', JSON.stringify(data.data.user))
        
        // Blur all input fields to dismiss keyboard on mobile
        const activeElement = document.activeElement
        if (activeElement && activeElement.blur) {
          activeElement.blur()
        }
        
        console.log('✅ Email login successful, calling onLoginSuccess');
        onLoginSuccess(data.data)
        setTimeout(() => onClose(), 1000)
      } else {
        setError(data.message || 'อีเมล/ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
      }
    } catch (error) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setLoading(false)
    }
  }

  // Handle Google OAuth
  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/api/auth/google`
  }

  // Handle phone login (ไม่ต้องใช้ OTP)
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
        sessionStorage.setItem('token', data.data.token)
        sessionStorage.setItem('user', JSON.stringify(data.data.user))
        
        // Blur all input fields to dismiss keyboard on mobile
        const activeElement = document.activeElement
        if (activeElement && activeElement.blur) {
          activeElement.blur()
        }
        
        console.log('✅ Email login successful, calling onLoginSuccess');
        onLoginSuccess(data.data)
        setTimeout(() => onClose(), 1000)
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

    console.log('Email register form submitted:', registerForm)

    // ตรวจสอบรหัสผ่าน
    if (registerForm.password !== registerForm.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน')
      setLoading(false)
      return
    }

    // ตรวจสอบข้อมูลที่จำเป็น
    const requiredFields = {
      firstName: registerForm.firstName,
      lastName: registerForm.lastName,
      username: registerForm.username,
      email: registerForm.email,
      password: registerForm.password,
      dateOfBirth: registerForm.dateOfBirth,
      gender: registerForm.gender,
      lookingFor: registerForm.lookingFor,
      province: registerForm.province
    }

    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value || value.trim() === '')
      .map(([key]) => key)

    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields)
      setError('กรุณากรอกข้อมูลให้ครบถ้วน')
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

      console.log('Email register request body:', requestBody)

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
        sessionStorage.setItem('token', data.data.token)
        sessionStorage.setItem('user', JSON.stringify(data.data.user))
        
        // Blur all input fields to dismiss keyboard on mobile
        const activeElement = document.activeElement
        if (activeElement && activeElement.blur) {
          activeElement.blur()
        }
        
        console.log('✅ Email login successful, calling onLoginSuccess');
        onLoginSuccess(data.data)
        setTimeout(() => onClose(), 1000)
      } else {
        setError(data.message || 'เกิดข้อผิดพลาดในการลงทะเบียน')
      }
    } catch (error) {
      console.error('Email register error:', error)
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

    console.log('Phone register form submitted:', { phoneForm, registerForm })

    // ตรวจสอบข้อมูลที่จำเป็น
    const requiredFields = {
      phone: phoneForm.phone,
      password: registerForm.password,
      firstName: registerForm.firstName,
      lastName: registerForm.lastName,
      dateOfBirth: registerForm.dateOfBirth,
      gender: registerForm.gender,
      lookingFor: registerForm.lookingFor,
      province: registerForm.province
    }

    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value || value.trim() === '')
      .map(([key]) => key)

    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields)
      setError('กรุณากรอกข้อมูลให้ครบถ้วน')
      setLoading(false)
      return
    }

    // ตรวจสอบรหัสผ่าน
    if (registerForm.password !== registerForm.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน')
      setLoading(false)
      return
    }

    if (registerForm.password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
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
        sessionStorage.setItem('token', data.token)
        sessionStorage.setItem('user', JSON.stringify(data.user))
        
        // Blur all input fields to dismiss keyboard on mobile
        const activeElement = document.activeElement
        if (activeElement && activeElement.blur) {
          activeElement.blur()
        }
        
        console.log('✅ Registration successful, calling onLoginSuccess');
        onLoginSuccess(data)
        setTimeout(() => onClose(), 1000)
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
        <DialogContent className="sm:max-w-lg modern-card border-0 shadow-2xl">
          <DialogHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-pink-500 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg heart-beat">
              <Heart className="h-8 w-8 text-white" fill="white" />
            </div>
            <DialogTitle className="text-2xl font-bold gradient-text">
              {isRegisterMode ? 'Join Our Community ✨' : 'Welcome Back! 💕'}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {isRegisterMode 
                ? 'Create your profile and start finding amazing connections' 
                : 'Sign in to continue your journey to find love'
              }
            </DialogDescription>
          </DialogHeader>

        {!isRegisterMode ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 glass-effect p-2 rounded-xl border border-white/30">
              <TabsTrigger value="email" className="data-[state=active]:bg-white/90 data-[state=active]:text-pink-600 data-[state=active]:shadow-lg text-gray-600 rounded-lg font-medium transition-all duration-300">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </TabsTrigger>
              <TabsTrigger value="phone" className="data-[state=active]:bg-white/90 data-[state=active]:text-pink-600 data-[state=active]:shadow-lg text-gray-600 rounded-lg font-medium transition-all duration-300">
                <Phone className="h-4 w-4 mr-2" />
                Phone
              </TabsTrigger>
              <TabsTrigger value="google" className="data-[state=active]:bg-white/90 data-[state=active]:text-pink-600 data-[state=active]:shadow-lg text-gray-600 rounded-lg font-medium transition-all duration-300">
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </TabsTrigger>
            </TabsList>

            {/* Email/Password Login */}
            <TabsContent value="email" className="space-y-4">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="emailOrUsername" className="text-gray-700 font-medium">อีเมลหรือชื่อผู้ใช้</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="emailOrUsername"
                      type="text"
                      placeholder="your@email.com หรือ username"
                      value={emailForm.emailOrUsername}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, emailOrUsername: e.target.value }))}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 font-medium">รหัสผ่าน</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={emailForm.showPassword ? 'text' : 'password'}
                      placeholder="รหัสผ่านของคุณ"
                      value={emailForm.password}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, password: e.target.value }))}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setEmailForm(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                      className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                    >
                      {emailForm.showPassword ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                </div>

                                 <Button type="submit" className="modern-button w-full" disabled={loading}>
                   {loading ? (
                     <>
                       <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                       Signing in...
                     </>
                   ) : (
                     <>
                       <Heart className="mr-2 h-4 w-4" fill="white" />
                       Sign In
                     </>
                   )}
                 </Button>
              </form>

              <div className="space-y-2">
                <div className="text-center">
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
                </div>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsRegisterMode(true)}
                    className="text-sm text-pink-600 hover:text-pink-700 font-medium"
                  >
                    ยังไม่มีบัญชี? สร้างบัญชีใหม่
                  </button>
                </div>
              </div>
            </TabsContent>

            {/* Phone Login */}
            <TabsContent value="phone" className="space-y-4">
              <form onSubmit={handlePhoneLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-gray-700 font-medium">เบอร์โทรศัพท์</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="0812345678"
                      value={phoneForm.phone}
                      onChange={(e) => setPhoneForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phonePassword" className="text-gray-700 font-medium">รหัสผ่าน</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="phonePassword"
                      type={phoneForm.showPassword ? 'text' : 'password'}
                      placeholder="รหัสผ่านของคุณ"
                      value={phoneForm.password}
                      onChange={(e) => setPhoneForm(prev => ({ ...prev, password: e.target.value }))}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setPhoneForm(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                      className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                    >
                      {phoneForm.showPassword ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                </div>

                                  <Button 
                    type="submit" 
                    className="modern-button w-full" 
                    disabled={loading || !phoneForm.phone}
                  >
                                    {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <Phone className="mr-2 h-4 w-4" />
                      Sign In
                    </>
                  )}
                </Button>
              </form>

              <div className="space-y-2">
                <div className="text-center">
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
                </div>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsRegisterMode(true)}
                    className="text-sm text-gray-600 hover:text-gray-700"
                  >
                    ยังไม่มีบัญชี? สร้างบัญชีใหม่
                  </button>
                </div>
              </div>
            </TabsContent>

            {/* Google OAuth */}
            <TabsContent value="google" className="space-y-4">
              <div className="text-center space-y-4">
                <p className="text-sm text-gray-600">
                  เข้าสู่ระบบด้วย Google Account ของคุณ
                </p>
                <Button 
                  onClick={handleGoogleLogin}
                  className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-md transition-colors"
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  เข้าสู่ระบบด้วย Google
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <>
            <Tabs value={registerActiveTab} onValueChange={setRegisterActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-lg">
                <TabsTrigger value="email" className="data-[state=active]:bg-white data-[state=active]:text-pink-600 text-gray-600">อีเมล</TabsTrigger>
                <TabsTrigger value="phone" className="data-[state=active]:bg-white data-[state=active]:text-pink-600 text-gray-600">เบอร์โทร</TabsTrigger>
                <TabsTrigger value="google" className="data-[state=active]:bg-white data-[state=active]:text-pink-600 text-gray-600">Google</TabsTrigger>
              </TabsList>

              {/* Email Register */}
              <TabsContent value="email" className="space-y-4">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-gray-700 font-medium">ชื่อ</Label>
                      <Input
                        id="firstName"
                        value={registerForm.firstName}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, firstName: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-gray-700 font-medium">นามสกุล</Label>
                      <Input
                        id="lastName"
                        value={registerForm.lastName}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, lastName: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-gray-700 font-medium">ชื่อผู้ใช้</Label>
                    <Input
                      id="username"
                      value={registerForm.username}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, username: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 font-medium">อีเมล</Label>
                    <Input
                      id="email"
                      type="email"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-gray-700 font-medium">รหัสผ่าน</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={registerForm.showPassword ? 'text' : 'password'}
                          value={registerForm.password}
                          onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                          className="pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setRegisterForm(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                          className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                        >
                          {registerForm.showPassword ? <EyeOff /> : <Eye />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">ยืนยันรหัสผ่าน</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={registerForm.showConfirmPassword ? 'text' : 'password'}
                          value={registerForm.confirmPassword}
                          onChange={(e) => setRegisterForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setRegisterForm(prev => ({ ...prev, showConfirmPassword: !prev.showConfirmPassword }))}
                          className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                        >
                          {registerForm.showConfirmPassword ? <EyeOff /> : <Eye />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth" className="text-gray-700 font-medium">วันเกิด</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={registerForm.dateOfBirth}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender" className="text-gray-700 font-medium">เพศ</Label>
                      <select
                        id="gender"
                        value={registerForm.gender}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, gender: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white text-gray-900"
                        required
                      >
                        <option value="">เลือกเพศ</option>
                        <option value="male">ชาย</option>
                        <option value="female">หญิง</option>
                        <option value="other">อื่นๆ</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lookingFor" className="text-gray-700 font-medium">สนใจ</Label>
                      <select
                        id="lookingFor"
                        value={registerForm.lookingFor}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, lookingFor: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white text-gray-900"
                        required
                      >
                        <option value="">เลือกเพศที่สนใจ</option>
                        <option value="male">ชาย</option>
                        <option value="female">หญิง</option>
                        <option value="both">ทั้งสองเพศ</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="province" className="text-gray-700 font-medium">จังหวัด</Label>
                      <select
                        id="province"
                        value={registerForm.province}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, province: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white text-gray-900"
                        required
                      >
                        <option value="">เลือกจังหวัด</option>
                        {thaiProvinces.map((province) => (
                          <option key={province} value={province}>
                            {province}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium py-2 px-4 rounded-md transition-colors" 
                    disabled={loading}
                    onClick={() => {
                      console.log('Email register button clicked')
                      console.log('Current form state:', registerForm)
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        กำลังลงทะเบียน...
                      </>
                    ) : (
                      'สร้างบัญชีใหม่'
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Phone Register - ไม่ต้องมี OTP */}
              <TabsContent value="phone" className="space-y-4">
                <form onSubmit={handlePhoneRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-700 font-medium">เบอร์โทรศัพท์</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="0812345678"
                        value={phoneForm.phone}
                        onChange={(e) => setPhoneForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-gray-700 font-medium">รหัสผ่าน</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={registerForm.showPassword ? 'text' : 'password'}
                          value={registerForm.password}
                          onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                          className="pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setRegisterForm(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                          className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                        >
                          {registerForm.showPassword ? <EyeOff /> : <Eye />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">ยืนยันรหัสผ่าน</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={registerForm.showConfirmPassword ? 'text' : 'password'}
                          value={registerForm.confirmPassword}
                          onChange={(e) => setRegisterForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setRegisterForm(prev => ({ ...prev, showConfirmPassword: !prev.showConfirmPassword }))}
                          className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                        >
                          {registerForm.showConfirmPassword ? <EyeOff /> : <Eye />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-gray-700 font-medium">ชื่อ</Label>
                      <Input
                        id="firstName"
                        value={registerForm.firstName}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, firstName: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-gray-700 font-medium">นามสกุล</Label>
                      <Input
                        id="lastName"
                        value={registerForm.lastName}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, lastName: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth" className="text-gray-700 font-medium">วันเกิด</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={registerForm.dateOfBirth}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender" className="text-gray-700 font-medium">เพศ</Label>
                      <select
                        id="gender"
                        value={registerForm.gender}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, gender: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white text-gray-900"
                        required
                      >
                        <option value="">เลือกเพศ</option>
                        <option value="male">ชาย</option>
                        <option value="female">หญิง</option>
                        <option value="other">อื่นๆ</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lookingFor" className="text-gray-700 font-medium">สนใจ</Label>
                      <select
                        id="lookingFor"
                        value={registerForm.lookingFor}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, lookingFor: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white text-gray-900"
                        required
                      >
                        <option value="">เลือกเพศที่สนใจ</option>
                        <option value="male">ชาย</option>
                        <option value="female">หญิง</option>
                        <option value="both">ทั้งสองเพศ</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="province" className="text-gray-700 font-medium">จังหวัด</Label>
                      <select
                        id="province"
                        value={registerForm.province}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, province: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white text-gray-900"
                        required
                      >
                        <option value="">เลือกจังหวัด</option>
                        {thaiProvinces.map((province) => (
                          <option key={province} value={province}>
                            {province}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium py-2 px-4 rounded-md transition-colors" 
                    disabled={loading}
                    onClick={() => {
                      console.log('Phone register button clicked')
                      console.log('Current phone form state:', phoneForm)
                      console.log('Current register form state:', registerForm)
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        กำลังลงทะเบียน...
                      </>
                    ) : (
                      'สร้างบัญชีใหม่'
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Google Register */}
              <TabsContent value="google" className="space-y-4">
                <div className="text-center space-y-4">
                  <p className="text-sm text-gray-600">
                    สร้างบัญชีใหม่ด้วย Google Account ของคุณ
                  </p>
                  <Button 
                    onClick={handleGoogleLogin}
                    className="w-full glass-effect border border-white/30 text-gray-700 hover:bg-white/50 font-semibold py-3 px-6 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg"
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    สร้างบัญชีด้วย Google
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsRegisterMode(false)}
                className="text-sm text-gray-600 hover:text-gray-700"
              >
                มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
              </button>
            </div>
          </>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">
            <XCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center space-x-2 text-green-600 text-sm bg-green-50 p-3 rounded-md border border-green-200">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
    
    {/* Forgot Password Modal */}
    <ForgotPasswordModal
      isOpen={showForgotPassword}
      onClose={() => setShowForgotPassword(false)}
    />
  </>
  )
}

export default LoginModal

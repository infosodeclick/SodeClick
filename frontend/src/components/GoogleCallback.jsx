import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Heart, CheckCircle, XCircle, Loader2 } from 'lucide-react';

const GoogleCallback = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  useEffect(() => {
    const handleGoogleCallback = async () => {
      try {
        // Check if user is already logged in (from refresh)
        const existingToken = sessionStorage.getItem('token');
        const existingUser = sessionStorage.getItem('user');
        
        if (existingToken && existingUser) {
          console.log('🔄 User already logged in, redirecting to home...');
          setStatus('success');
          setMessage('เข้าสู่ระบบด้วย Google สำเร็จ!');
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 1000);
          return;
        }

        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const success = urlParams.get('success');
        const error = urlParams.get('error');

        console.log('🔄 Google OAuth callback:', { token: !!token, success, error });

        if (success === 'true' && token) {
          // Success - get user data with token
          try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            const data = await response.json();
            console.log('📥 User data response:', data);

            if (data.success) {
              const userData = {
                token,
                user: data.data.user
              };

              // Store in session storage
              sessionStorage.setItem('token', token);
              sessionStorage.setItem('user', JSON.stringify(userData.user));

              // Update auth context
              login(userData);

              setStatus('success');
              setMessage('เข้าสู่ระบบด้วย Google สำเร็จ!');

              // Clear URL parameters and redirect
              window.history.replaceState({}, document.title, window.location.pathname);
              
              // Redirect to main page after 2 seconds
              setTimeout(() => {
                if (!redirectAttempted) {
                  setRedirectAttempted(true);
                  console.log('🏠 Redirecting to home page after successful login...');
                  navigate('/', { replace: true });
                }
              }, 2000);
            } else {
              throw new Error(data.message || 'ไม่สามารถดึงข้อมูลผู้ใช้ได้');
            }
          } catch (fetchError) {
            console.error('❌ Failed to fetch user data:', fetchError);
            setStatus('error');
            setMessage('เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้');
            setTimeout(() => {
              navigate('/', { replace: true });
            }, 3000);
          }
        } else if (success === 'false' || error) {
          // Error occurred
          setStatus('error');
          setMessage(error === 'oauth_error' ? 'เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google' : 'การเข้าสู่ระบบถูกยกเลิก');
          
          // Redirect to login page after 3 seconds
          setTimeout(() => {
            if (!redirectAttempted) {
              setRedirectAttempted(true);
              console.log('🏠 Redirecting to home page after error...');
              navigate('/', { replace: true });
            }
          }, 3000);
        } else {
          // Invalid callback - redirect to home if no parameters
          console.log('🔄 No OAuth parameters found, redirecting to home...');
          if (!redirectAttempted) {
            setRedirectAttempted(true);
            navigate('/', { replace: true });
          }
        }
      } catch (error) {
        console.error('❌ Google callback error:', error);
        setStatus('error');
        setMessage('เกิดข้อผิดพลาดที่ไม่คาดคิด');
        
        setTimeout(() => {
          if (!redirectAttempted) {
            setRedirectAttempted(true);
            console.log('🏠 Redirecting to home page after unexpected error...');
            navigate('/', { replace: true });
          }
        }, 3000);
      }
    };

    handleGoogleCallback();
  }, [login, navigate]);

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-12 w-12 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case 'error':
        return <XCircle className="h-12 w-12 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-violet-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
        {/* Logo */}
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-pink-500 to-violet-500 rounded-2xl flex items-center justify-center">
            <Heart className="h-8 w-8 text-white" fill="white" />
          </div>
        </div>

        {/* Status Icon */}
        <div className="mb-4 flex justify-center">
          {getStatusIcon()}
        </div>

        {/* Status Message */}
        <h2 className={`text-xl font-bold mb-2 ${getStatusColor()}`}>
          {status === 'loading' && 'กำลังเข้าสู่ระบบ...'}
          {status === 'success' && 'เข้าสู่ระบบสำเร็จ!'}
          {status === 'error' && 'เกิดข้อผิดพลาด'}
        </h2>

        <p className="text-gray-600 mb-6">
          {message}
        </p>

        {/* Loading Progress */}
        {status === 'loading' && (
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-pink-500 to-violet-500 h-2 rounded-full animate-pulse"></div>
            </div>
          </div>
        )}

        {/* Action Button */}
        {status !== 'loading' && (
          <button
            onClick={() => {
              if (!redirectAttempted) {
                setRedirectAttempted(true);
                console.log('🏠 Navigating to home page via button click...');
                navigate('/', { replace: true });
              }
            }}
            className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-medium py-3 px-6 rounded-2xl transition-colors"
          >
            กลับสู่หน้าหลัก
          </button>
        )}

        {/* Google OAuth Info */}
        <div className="mt-6 text-xs text-gray-500">
          <p>กำลังเข้าสู่ระบบด้วย Google OAuth</p>
          <p className="mt-1">กรุณารอสักครู่...</p>
        </div>
      </div>
    </div>
  );
};

export default GoogleCallback;

import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import AdminDashboard from './components/AdminDashboard'
import HealthCheck from './components/HealthCheck'
import JoinChatRoom from './components/JoinChatRoom'
import { ToastProvider, useToast } from './components/ui/toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'

// Component to handle Google OAuth callback
const GoogleOAuthHandler = () => {
  const { login } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get('token');
    const loginSuccess = urlParams.get('login_success');
    
    if (token && loginSuccess === 'true') {
      console.log('🔍 Google OAuth callback detected, token:', token);
      
      // Store token and fetch user data
      sessionStorage.setItem('token', token);
      
      // Fetch user data with the token
      fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          console.log('✅ Google OAuth login successful:', data.data.user);
          login({
            user: data.data.user,
            token: token
          });
          
          // Clean up URL parameters and redirect to home
          window.history.replaceState({}, document.title, '/');
        } else {
          console.error('❌ Failed to fetch user data:', data.message);
          window.history.replaceState({}, document.title, '/?error=auth_failed');
        }
      })
      .catch(error => {
        console.error('❌ Error fetching user data:', error);
        window.history.replaceState({}, document.title, '/?error=auth_failed');
      });
    }
    
    // Handle OAuth error
    const error = urlParams.get('error');
    if (error === 'auth_failed') {
      console.error('❌ Google OAuth failed');
    }
  }, [location, login]);

  return null; // This component doesn't render anything
};

// Wrapper component to include ToastContainer
const AppWrapper = () => {
  const { ToastContainer } = useToast();
  
  return (
    <>
      <GoogleOAuthHandler />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/health" element={<HealthCheck />} />
        <Route path="/join/:inviteCode" element={<JoinChatRoom />} />
      </Routes>
      <ToastContainer />
    </>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppWrapper />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

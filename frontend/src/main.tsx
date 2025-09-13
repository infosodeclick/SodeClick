import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import AdminDashboard from './components/AdminDashboard'
import HealthCheck from './components/HealthCheck'
import JoinChatRoom from './components/JoinChatRoom'
import GoogleCallback from './components/GoogleCallback'
import { ToastProvider, useToast } from './components/ui/toast'
import { AuthProvider } from './contexts/AuthContext'

// Wrapper component to include ToastContainer
const AppWrapper = () => {
  const { ToastContainer } = useToast();
  
  return (
    <>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/health" element={<HealthCheck />} />
        <Route path="/join/:inviteCode" element={<JoinChatRoom />} />
        <Route path="/auth/callback" element={<GoogleCallback />} />
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

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import AdminDashboard from './components/AdminDashboard'
import HealthCheck from './components/HealthCheck'
import PrivacyPolicy from './components/PrivacyPolicy'
import { ToastProvider } from './components/ui/toast'
import { AuthProvider } from './contexts/AuthContext'

// Service Worker temporarily disabled to avoid MIME type issues
console.log('ℹ️ Service Worker temporarily disabled to avoid MIME type issues');

// Wrapper component to include ToastContainer
const AppWrapper = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/health" element={<HealthCheck />} />
        <Route path="/privacy-policy.html" element={<PrivacyPolicy />} />
      </Routes>
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

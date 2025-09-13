import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const token = sessionStorage.getItem('token');
    const userData = sessionStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        
        // Check for invalid user IDs (old deleted users)
        const invalidUserIds = [
          '68c13cb085d17f0b0d4584bc', // Old kao user ID
          '68bd5debcf52bbadcf865456', // test user
          '68bd5f2ecf52bbadcf86595d', // user_829394452
          '68bd7531cf52bbadcf865b67', // K.nampetch
          '68bdaa833750baa9df62c22d'  // Achi
          // Removed '68bdab749a77b0ed80649af6' - admin user should be valid
        ];
        
        if (invalidUserIds.includes(parsedUser._id)) {
          console.log('🚨 Invalid user ID detected, clearing session:', parsedUser._id);
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          setUser(null);
        } else {
          setUser(parsedUser);
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    setUser(userData.user || userData);
    sessionStorage.setItem('token', userData.token || userData.data?.token);
    sessionStorage.setItem('user', JSON.stringify(userData.user || userData));
    
    // Trigger GPS location update when user logs in (one-time only)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          console.log('📍 Login: Updating GPS location:', location);
          
          // Update location to server
          const token = userData.token || userData.data?.token;
          if (token) {
            fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/matching/update-location`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                lat: location.lat,
                lng: location.lng
              })
            }).then(() => {
              console.log('✅ Login: Location updated to server');
              // ไม่รีเฟรชหน้าเว็บใน Google OAuth callback
              if (!window.location.pathname.includes('/auth/callback')) {
                window.location.reload();
              }
            }).catch((error) => {
              console.error('❌ Login: Failed to update location:', error);
              // ไม่รีเฟรชหน้าเว็บใน Google OAuth callback
              if (!window.location.pathname.includes('/auth/callback')) {
                window.location.reload();
              }
            });
          } else {
            // ไม่รีเฟรชหน้าเว็บใน Google OAuth callback
            if (!window.location.pathname.includes('/auth/callback')) {
              window.location.reload();
            }
          }
        },
        (error) => {
          console.error('❌ Login: GPS location failed:', error);
          // ไม่รีเฟรชหน้าเว็บใน Google OAuth callback
          if (!window.location.pathname.includes('/auth/callback')) {
            window.location.reload();
          }
        },
        {
          enableHighAccuracy: false, // ลดความเข้มงวด
          timeout: 15000, // เพิ่มเวลา timeout
          maximumAge: 60000 // เพิ่มเวลา cache เป็น 1 นาที
        }
      );
    } else {
      // ไม่รีเฟรชหน้าเว็บใน Google OAuth callback
      if (!window.location.pathname.includes('/auth/callback')) {
        window.location.reload();
      }
    }
  };

  const logout = () => {
    // Update last location before logout
    const token = sessionStorage.getItem('token');
    if (token && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          console.log('📍 Logout: Updating final GPS location:', location);
          
          fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/matching/update-location`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              lat: location.lat,
              lng: location.lng
            })
          }).then(() => {
            console.log('✅ Logout: Final location updated to server');
            // ล้างข้อมูลและรีเฟรชหน้าเว็บหลังจากอัปเดตตำแหน่ง
            setUser(null);
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            window.location.reload();
          }).catch((error) => {
            console.error('❌ Logout: Failed to update final location:', error);
            // ล้างข้อมูลและรีเฟรชหน้าเว็บแม้ว่าจะอัปเดตตำแหน่งไม่สำเร็จ
            setUser(null);
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            window.location.reload();
          });
        },
        (error) => {
          console.error('❌ Logout: GPS location failed:', error);
          // ล้างข้อมูลและรีเฟรชหน้าเว็บแม้ว่า GPS จะไม่ทำงาน
          setUser(null);
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          window.location.reload();
        },
        {
          enableHighAccuracy: false, // ลดความเข้มงวด
          timeout: 15000, // เพิ่มเวลา timeout
          maximumAge: 60000 // เพิ่มเวลา cache เป็น 1 นาที
        }
      );
    } else {
      // ล้างข้อมูลและรีเฟรชหน้าเว็บถ้าไม่มี token หรือ GPS ไม่รองรับ
      setUser(null);
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      window.location.reload();
    }
  };

  // Function to validate current user and force logout if invalid
  const validateUser = async () => {
    const token = sessionStorage.getItem('token');
    if (!token || !user) return true;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.log('🚨 User validation failed, logging out');
        logout();
        return false;
      }

      const data = await response.json();
      if (!data.success) {
        console.log('🚨 User validation failed, logging out');
        logout();
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ User validation error:', error);
      logout();
      return false;
    }
  };

  const value = {
    user,
    login,
    logout,
    validateUser,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

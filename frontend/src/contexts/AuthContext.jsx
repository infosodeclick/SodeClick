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
  const [idleTimer, setIdleTimer] = useState(null);
  const [warningTimer, setWarningTimer] = useState(null);
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  // Auto sign out after 15 minutes of inactivity
  const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds
  const WARNING_TIME = 14 * 60 * 1000; // Show warning at 14 minutes

  // Reset idle timer
  const resetIdleTimer = () => {
    // Clear all existing timers first
    if (idleTimer) {
      clearTimeout(idleTimer);
      setIdleTimer(null);
    }
    if (warningTimer) {
      clearTimeout(warningTimer);
      setWarningTimer(null);
    }
    
    // Hide warning modal if it's showing
    if (showIdleWarning) {
      // console.log('✅ Hiding idle warning during timer reset');
      setShowIdleWarning(false);
    }

    // console.log('🔄 Resetting idle timer - fresh 15 minutes');
    
    // Set warning timer (14 minutes)
    const warningTimerId = setTimeout(() => {
      // Use functional update to get current state
      setShowIdleWarning(prevShow => {
        // ตรวจสอบว่าไม่ใช่ช่วงที่กำลัง dismiss และ modal ยังไม่ได้แสดงอยู่
        if (!prevShow && !isDismissing) {
          // console.log('⚠️ Idle warning: 1 minute left before auto sign out');
          return true;
        }
        return prevShow;
      });
    }, WARNING_TIME);

    // Set auto sign out timer (15 minutes)
    const timerId = setTimeout(() => {
      // console.log('🚪 Auto sign out due to inactivity');
      logout();
    }, IDLE_TIMEOUT);

    setWarningTimer(warningTimerId);
    setIdleTimer(timerId);
  };

  // Handle user activity with debouncing to prevent excessive timer resets
  let activityTimeout = null;
  const handleUserActivity = () => {
    if (user) {
      // Debounce activity detection - reset timer only once per second
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
      
      activityTimeout = setTimeout(() => {
        // console.log('🔄 User activity detected, resetting idle timer');
        // Hide warning modal immediately when user is active
        if (showIdleWarning) {
          // console.log('✅ Hiding idle warning due to user activity');
          setShowIdleWarning(false);
        }
        resetIdleTimer();
      }, 1000); // Reset timer max once per second
    }
  };

  useEffect(() => {
    // Check if user is logged in on app start
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
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
          // console.log('🚨 Invalid user ID detected, clearing session:', parsedUser._id);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        } else {
          setUser(parsedUser);
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
    
    // Handle storage changes from other tabs (sync login/logout across tabs)
    const handleStorageChange = (e) => {
      if (e.key === 'token' || e.key === 'user') {
        // ถ้ามีการเปลี่ยนแปลง token หรือ user จาก tab อื่น
        const newToken = localStorage.getItem('token');
        const newUserData = localStorage.getItem('user');
        
        if (newToken && newUserData) {
          // มีการ login ใน tab อื่น - อัปเดต state
          try {
            const parsedUser = JSON.parse(newUserData);
            setUser(parsedUser);
            console.log('🔄 Synced login from another tab');
          } catch (error) {
            console.error('Error parsing user data from storage event:', error);
          }
        } else {
          // มีการ logout ใน tab อื่น - logout tab นี้ด้วย
          setUser(null);
          console.log('🔄 Synced logout from another tab');
          window.location.reload();
        }
      }
    };
    
    // Handle browser close/refresh - update online status to false
    const handleBeforeUnload = (event) => {
      const token = localStorage.getItem('token');
      if (token) {
        // ใช้ fetch with keepalive แทน sendBeacon เพื่อส่ง headers ได้ถูกต้อง
        fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({}),
          keepalive: true // สำคัญ! ทำให้ request ทำงานต่อแม้ page ปิด
        }).catch(err => {
          console.error('❌ Failed to logout on beforeunload:', err);
        });
        // console.log('🔴 Browser closing: Sending logout request');
      }
    };
    
    // เพิ่ม handler สำหรับ visibility change เพื่อตรวจจับเมื่อปิด tab
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const token = localStorage.getItem('token');
        if (token) {
          // เมื่อ tab ถูกซ่อน (อาจจะปิด) ให้อัพเดทสถานะ lastActive
          // console.log('📴 Tab hidden, updating lastActive');
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Set up idle timer when user logs in
  useEffect(() => {
    if (user) {
      console.log('👤 User logged in, setting up idle timer');
      resetIdleTimer();
    } else {
      console.log('👤 User logged out, clearing timers');
      // Clear timers when user logs out
      if (idleTimer) {
        clearTimeout(idleTimer);
        setIdleTimer(null);
      }
      if (warningTimer) {
        clearTimeout(warningTimer);
        setWarningTimer(null);
      }
      setShowIdleWarning(false);
    }
  }, [user]); // Only depend on user, not on timer functions

  // Set up activity listeners
  useEffect(() => {
    if (user) {
      // เพิ่ม event listeners มากขึ้นเพื่อตรวจจับ activity ได้ดีขึ้น
      const events = [
        'mousedown', 'mousemove', 'mouseup', 'mouseover', 'mouseout',
        'keypress', 'keydown', 'keyup',
        'scroll', 'wheel',
        'touchstart', 'touchend', 'touchmove',
        'click', 'dblclick',
        'focus', 'blur',
        'resize'
      ];
      
      // ใช้ passive listeners เพื่อประสิทธิภาพที่ดีขึ้น
      events.forEach(event => {
        document.addEventListener(event, handleUserActivity, { passive: true, capture: true });
      });

      // ตรวจจับเมื่อผู้ใช้กลับมาใช้ tab/window (แยกต่างหากเพื่อจัดการพิเศษ)
      const handleVisibilityChange = () => {
        if (!document.hidden && user) {
          console.log('👀 User returned to tab, resetting idle timer');
          // Hide warning modal immediately when user returns to tab
          if (showIdleWarning) {
            console.log('✅ Hiding idle warning due to tab focus');
            setShowIdleWarning(false);
          }
          handleUserActivity();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, handleUserActivity, { passive: true, capture: true });
        });
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [user, showIdleWarning]);

  const login = (userData) => {
    console.log('🔍 AuthContext login called with:', userData);
    const userToSet = userData.user || userData;
    console.log('🔍 User to set:', userToSet);
    console.log('🔍 User ID in userToSet:', userToSet._id || userToSet.id || userToSet.userId);
    
    setUser(userToSet);
    localStorage.setItem('token', userData.token || userData.data?.token);
    localStorage.setItem('user', JSON.stringify(userToSet));
    
    // Send login event
    window.dispatchEvent(new CustomEvent('userLoggedIn', { 
      detail: { user: userData.user || userData } 
    }));
    
    // Reset idle timer after login
    resetIdleTimer();
    
    console.log('✅ Login successful, user state updated');
  };

  const logout = () => {
    console.log('🚪 Logging out...');
    const token = localStorage.getItem('token');
    
    // อัพเดท online status เป็น false
    if (token) {
      fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }).then(() => {
        console.log('✅ Logout: Online status updated to false');
      }).catch((err) => {
        console.error('❌ Logout: Failed to update online status:', err);
      });
    }
    
    // ล้างข้อมูลและส่ง event
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new CustomEvent('userLoggedOut'));
    
    // รีเฟรชหน้าเว็บอัตโนมัติเมื่อล็อกเอาต์
    console.log('🔄 Refreshing page after logout');
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  // Function to validate current user and force logout if invalid
  const validateUser = async () => {
    const token = localStorage.getItem('token');
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

  // Function to dismiss idle warning
  const dismissIdleWarning = async () => {
    console.log('✅ User dismissed idle warning, resetting timer');
    console.log('🔍 Current timers before clearing - idleTimer:', idleTimer, 'warningTimer:', warningTimer);
    
    // ตั้ง flag เพื่อป้องกันไม่ให้ warning เด้งขึ้นซ้ำ
    setIsDismissing(true);
    
    // Clear all existing timers first
    if (idleTimer) {
      console.log('🗑️ Clearing idle timer:', idleTimer);
      clearTimeout(idleTimer);
      setIdleTimer(null);
    }
    if (warningTimer) {
      console.log('🗑️ Clearing warning timer:', warningTimer);
      clearTimeout(warningTimer);
      setWarningTimer(null);
    }
    
    // Hide the warning modal immediately
    console.log('👁️ Hiding warning modal');
    setShowIdleWarning(false);
    
    // Reset the idle timer to start fresh - ใช้ resetIdleTimer แทนการตั้ง timer ใหม่เอง
    console.log('🔄 Restarting idle timer after user confirmation');
    resetIdleTimer();
    
    // รีเซ็ต flag หลังจากการตั้ง timer ใหม่แล้ว
    setTimeout(() => {
      setIsDismissing(false);
      console.log('✅ Dismissing flag reset');
    }, 2000);
    
    console.log('✅ Timers reset complete');
  };

  // Function to update user data (for coin/vote updates)
  const updateUserData = (updatedUser) => {
    console.log('🔄 AuthContext: Updating user data:', updatedUser)
    setUser(updatedUser)

    // Also update localStorage
    localStorage.setItem('user', JSON.stringify(updatedUser))
  };

  // Expose updateUserData globally for components that need it
  useEffect(() => {
    window.updateAuthContext = updateUserData
    return () => {
      delete window.updateAuthContext
    }
  }, [])

  const value = {
    user,
    login,
    logout,
    validateUser,
    loading,
    showIdleWarning,
    dismissIdleWarning,
    updateUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

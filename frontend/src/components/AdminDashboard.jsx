import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import UserManagement from './UserManagement';
import PremiumManagement from './PremiumManagement';
import BannedUsers from './BannedUsers';
import HealthCheck from './HealthCheck';
import SystemMonitor from './SystemMonitor';
import AdminChatManagement from './AdminChatManagement';
import AdminCreateChatRoom from './AdminCreateChatRoom';
import SuperAdminPanel from './SuperAdminPanel';
import { 
  Users, 
  MessageCircle, 
  Crown, 
  Activity, 
  Settings,
  UserCheck,
  AlertCircle,
  TrendingUp,
  Database,
  Shield,
  Zap,
  Trash2,
  ArrowLeft,
  Home,
  RefreshCw,
  Wrench,
  Power
} from 'lucide-react';

const AdminDashboard = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalMessages: 0,
    onlineUsers: 0,
    premiumUsers: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard'); // เพิ่ม state สำหรับจัดการ view
  const [recentActivities, setRecentActivities] = useState([]); // เพิ่ม state สำหรับกิจกรรมล่าสุด
  const [lastActivityCount, setLastActivityCount] = useState(0); // เก็บจำนวนกิจกรรมครั้งล่าสุด
  const [maintenanceMode, setMaintenanceMode] = useState(false); // เพิ่ม state สำหรับ Maintenance Mode

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = sessionStorage.getItem('token');
        if (!token) {
          // No token found, redirecting to home
          window.location.href = '/';
          return;
        }

        // Verify token and get user info
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) {
          // Token invalid, redirecting to home
          window.location.href = '/';
          return;
        }

        const response = await res.json();
        const userData = response.data?.user;
        setUser(userData);

        if (userData?.role !== 'admin' && userData?.role !== 'superadmin') {
          // ไม่แสดง console log
          window.location.href = '/';
          return;
        }

        // Admin access granted
        setIsLoading(false);
        fetchDashboardData();
        fetchMaintenanceStatus();
      } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/';
      }
    };

    checkAuth();
  }, []);

  // โหลดกิจกรรมล่าสุดครั้งเดียวเมื่อ component mount
  useEffect(() => {
    if (!isLoading) {
      fetchRecentActivities();
    }
  }, [isLoading]);

  const fetchDashboardData = async () => {
    try {
      const token = sessionStorage.getItem('token');
      
      // Fetch dashboard statistics
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setStats({
          totalUsers: data.totalUsers || 0,
          totalMessages: data.totalMessages || 0,
          onlineUsers: data.onlineUsers || 0,
          premiumUsers: data.premiumUsers || 0
        });
      }
      
      // โหลดกิจกรรมล่าสุด
      await fetchRecentActivities();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  // ฟังก์ชันดึงข้อมูลกิจกรรมล่าสุด
  const fetchRecentActivities = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/activities`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        const newActivities = data.activities || [];
        
        setLastActivityCount(newActivities.length);
        
        setRecentActivities(newActivities);
      } else {
        // ไม่มีข้อมูลกิจกรรม
        setRecentActivities([]);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      // ตั้งค่าเป็น array ว่างเมื่อเกิด error
      setRecentActivities([]);
    }
  };

  // ฟังก์ชันดึงสถานะ Maintenance Mode
  const fetchMaintenanceStatus = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/maintenance/status`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setMaintenanceMode(data.data.isMaintenanceMode || false);
      }
    } catch (error) {
      console.error('Error fetching maintenance status:', error);
    }
  };

  // ฟังก์ชันเปิด/ปิด Maintenance Mode
  const toggleMaintenanceMode = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const estimatedHours = maintenanceMode ? null : 2; // 2 hours if enabling
      const message = maintenanceMode ? 'ระบบกลับมาใช้งานได้แล้ว' : 'ระบบกำลังบำรุงรักษา กรุณารอสักครู่';
      
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/maintenance/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          isMaintenanceMode: !maintenanceMode,
          message: message,
          estimatedHours: estimatedHours
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMaintenanceMode(data.data.isMaintenanceMode);
        alert(data.data.isMaintenanceMode ? 'เปิด Maintenance Mode แล้ว' : 'ปิด Maintenance Mode แล้ว');
      } else {
        alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ Maintenance Mode');
      }
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
      alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ Maintenance Mode');
    }
  };

  // ฟังก์ชันแปลงเวลาเป็นรูปแบบที่อ่านง่าย
  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const diff = now - new Date(timestamp);
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes} นาทีที่แล้ว`;
    } else if (hours < 24) {
      return `${hours} ชั่วโมงที่แล้ว`;
    } else {
      return `${days} วันที่แล้ว`;
    }
  };

  // ฟังก์ชันกำหนดสีตามสถานะ
  const getActivityColor = (status) => {
    const colors = {
      success: 'bg-green-400',
      premium: 'bg-amber-400',
      warning: 'bg-red-400',
      info: 'bg-blue-400'
    };
    return colors[status] || 'bg-gray-400';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <h1 className="text-xl font-bold text-slate-800">กำลังโหลด Admin Dashboard...</h1>
        </div>
      </div>
    );
  }

  // Authorization check
  if (!user || (user?.role !== 'admin' && user?.role !== 'superadmin')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={64} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">ไม่มีสิทธิ์เข้าถึง</h1>
          <p className="text-slate-600 mb-4">คุณไม่มีสิทธิ์เข้าถึงหน้า Admin Dashboard</p>
          <Button 
            className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white"
            onClick={() => window.location.href = '/'}
          >
            กลับหน้าหลัก
          </Button>
        </div>
      </div>
    );
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'users':
        return <UserManagement />;
      case 'premium':
        return <PremiumManagement />;
      case 'banned':
        return <BannedUsers />;
      case 'health':
        return <HealthCheck />;
      case 'monitor':
        return <SystemMonitor />;
      case 'chat':
        return <AdminChatManagement />;
      case 'create-chat':
        return <AdminCreateChatRoom />;
      case 'analytics':
        return <Analytics />;
      case 'superadmin':
        return <SuperAdminPanel />;
      default:
        return renderDashboard();
    }
  };

  // Get current view title for header
  const getCurrentViewTitle = () => {
    switch (currentView) {
      case 'users':
        return 'จัดการผู้ใช้';
      case 'premium':
        return 'จัดการสมาชิก Premium';
      case 'banned':
        return 'ผู้ใช้ที่ถูกแบน';
      case 'health':
        return 'API Status Monitor';
      case 'monitor':
        return 'System Monitor';
      case 'chat':
        return 'จัดการแชทและข้อความ';
      case 'create-chat':
        return 'สร้างห้องแชทใหม่';
      case 'analytics':
        return 'สถิติการใช้งาน';
      case 'superadmin':
        return 'SuperAdmin Panel';
      default:
        return 'Admin Dashboard';
    }
  };

  // Analytics Component
  const Analytics = () => {
    const [selectedPeriod, setSelectedPeriod] = useState('6months');
    const [selectedMetric, setSelectedMetric] = useState('users');
    const [analyticsData, setAnalyticsData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch analytics data
    const fetchAnalyticsData = async () => {
      try {
        setIsLoading(true);
        const token = sessionStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/analytics?period=${selectedPeriod}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (res.ok) {
          const data = await res.json();
          setAnalyticsData(data);
        } else {
          console.error('Failed to fetch analytics data');
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    useEffect(() => {
      fetchAnalyticsData();
    }, []); // Only fetch once when component mounts

    if (isLoading) {
      return (
        <div className="space-y-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500"></div>
          </div>
        </div>
      );
    }

    if (!analyticsData) {
      return (
        <div className="space-y-8">
          <div className="text-center py-8">
            <p className="text-slate-500">ไม่สามารถโหลดข้อมูลได้</p>
          </div>
        </div>
      );
    }

    const currentData = analyticsData.monthlyData[selectedMetric];
    const maxValue = Math.max(...currentData.map(d => d.value));

    return (
      <div className="space-y-8">
        {/* Header with Period Selector */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">สถิติการใช้งาน</h2>
            <p className="text-slate-600">ดูข้อมูลสถิติการใช้งานและประสิทธิภาพของระบบ</p>
          </div>
          <div className="flex gap-3">
            <select 
              value={selectedPeriod} 
              onChange={(e) => {
                setSelectedPeriod(e.target.value);
                fetchAnalyticsData();
              }}
              className="px-4 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="3months">3 เดือนล่าสุด</option>
              <option value="6months">6 เดือนล่าสุด</option>
              <option value="12months">12 เดือนล่าสุด</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAnalyticsData}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              รีเฟรช
            </Button>
          </div>
        </div>

        {/* Metric Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setSelectedMetric('users')}
            className={`p-4 rounded-xl border-2 transition-all ${
              selectedMetric === 'users' 
                ? 'border-pink-500 bg-pink-50' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">ผู้ใช้งาน</p>
                <p className="text-2xl font-bold text-slate-800">{analyticsData.summary.totalUsers.toLocaleString()}</p>
                <p className="text-sm text-green-600">+{currentData[currentData.length - 1]?.growth || 0}% จากเดือนที่แล้ว</p>
              </div>
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-pink-600" />
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedMetric('revenue')}
            className={`p-4 rounded-xl border-2 transition-all ${
              selectedMetric === 'revenue' 
                ? 'border-green-500 bg-green-50' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">รายได้</p>
                <p className="text-2xl font-bold text-slate-800">฿{analyticsData.summary.totalRevenue.toLocaleString()}</p>
                <p className="text-sm text-green-600">+{currentData[currentData.length - 1]?.growth || 0}% จากเดือนที่แล้ว</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedMetric('performance')}
            className={`p-4 rounded-xl border-2 transition-all ${
              selectedMetric === 'performance' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">ประสิทธิภาพ</p>
                <p className="text-2xl font-bold text-slate-800">{analyticsData.summary.avgPerformance}%</p>
                <p className="text-sm text-green-600">+{currentData[currentData.length - 1]?.growth || 0}% จากเดือนที่แล้ว</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </button>
        </div>

        {/* Chart */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-800 flex items-center gap-2">
              <Activity size={20} />
              กราฟแสดงแนวโน้ม
              <span className="text-sm text-slate-500 ml-2">
                {selectedMetric === 'users' && 'จำนวนผู้ใช้งานต่อเดือน'}
                {selectedMetric === 'revenue' && 'รายได้ต่อเดือน (บาท)'}
                {selectedMetric === 'performance' && 'ประสิทธิภาพของเว็บไซต์ (%)'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-end justify-between gap-2 p-4">
              {currentData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center group">
                  <div className="relative w-full">
                    <div 
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        selectedMetric === 'users' ? 'bg-gradient-to-t from-pink-500 to-pink-300' :
                        selectedMetric === 'revenue' ? 'bg-gradient-to-t from-green-500 to-green-300' :
                        'bg-gradient-to-t from-blue-500 to-blue-300'
                      }`}
                      style={{ 
                        height: `${(data.value / maxValue) * 280}px`,
                        minHeight: '20px'
                      }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {selectedMetric === 'revenue' ? `฿${data.value.toLocaleString()}` : 
                         selectedMetric === 'performance' ? `${data.value}%` : 
                         data.value.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-sm font-medium text-slate-800">{data.month}</p>
                    <p className="text-xs text-green-600">+{data.growth}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-pink-700">ผู้ใช้งานทั้งหมด</p>
                  <p className="text-2xl font-bold text-pink-800">{analyticsData.summary.totalUsers.toLocaleString()}</p>
                </div>
                <Users className="w-8 h-8 text-pink-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700">รายได้รวม</p>
                  <p className="text-2xl font-bold text-green-800">฿{analyticsData.summary.totalRevenue.toLocaleString()}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700">ประสิทธิภาพเฉลี่ย</p>
                  <p className="text-2xl font-bold text-blue-800">{analyticsData.summary.avgPerformance}%</p>
                </div>
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700">ผู้ใช้งานใหม่</p>
                  <p className="text-2xl font-bold text-purple-800">{analyticsData.summary.newUsersThisMonth.toLocaleString()}</p>
                </div>
                <UserCheck className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-800 flex items-center gap-2">
              <Activity size={20} />
              กิจกรรมล่าสุด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">ผู้ใช้งานใหม่เพิ่มขึ้น {currentData[currentData.length - 1]?.growth || 0}% ในเดือนนี้</p>
                  <p className="text-xs text-slate-500">2 ชั่วโมงที่แล้ว</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">ประสิทธิภาพระบบเพิ่มขึ้นเป็น {analyticsData.summary.avgPerformance}%</p>
                  <p className="text-xs text-slate-500">1 วันที่แล้ว</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 bg-purple-50 rounded-lg">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">รายได้รวม {analyticsData.summary.totalRevenue.toLocaleString()} บาท</p>
                  <p className="text-xs text-slate-500">3 วันที่แล้ว</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderDashboard = () => (
    <>
             {/* Stats Cards */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
           <CardHeader className="flex flex-row items-center justify-between pb-2">
             <CardTitle className="text-sm font-medium text-slate-700">ผู้ใช้ทั้งหมด</CardTitle>
             <Users className="h-4 w-4 text-blue-500" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold text-slate-800">{stats.totalUsers.toLocaleString()}</div>
             <p className="text-xs text-slate-500 mt-1">
               <TrendingUp className="inline h-3 w-3 mr-1" />
               +12% จากเดือนที่แล้ว
             </p>
           </CardContent>
         </Card>

         <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
           <CardHeader className="flex flex-row items-center justify-between pb-2">
             <CardTitle className="text-sm font-medium text-slate-700">ข้อความทั้งหมด</CardTitle>
             <MessageCircle className="h-4 w-4 text-green-500" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold text-slate-800">{stats.totalMessages.toLocaleString()}</div>
             <p className="text-xs text-slate-500 mt-1">
               <TrendingUp className="inline h-3 w-3 mr-1" />
               +8% จากเดือนที่แล้ว
             </p>
           </CardContent>
         </Card>

         <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
           <CardHeader className="flex flex-row items-center justify-between pb-2">
             <CardTitle className="text-sm font-medium text-slate-700">ผู้ใช้ออนไลน์</CardTitle>
             <Activity className="h-4 w-4 text-amber-500" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold text-slate-800">{stats.onlineUsers}</div>
             <p className="text-xs text-slate-500 mt-1">
               ณ ขณะนี้
             </p>
           </CardContent>
         </Card>

         <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
           <CardHeader className="flex flex-row items-center justify-between pb-2">
             <CardTitle className="text-sm font-medium text-slate-700">สมาชิก Premium</CardTitle>
             <Crown className="h-4 w-4 text-purple-500" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold text-slate-800">{stats.premiumUsers}</div>
             <p className="text-xs text-slate-500 mt-1">
               <TrendingUp className="inline h-3 w-3 mr-1" />
               +25% จากเดือนที่แล้ว
             </p>
           </CardContent>
         </Card>
       </div>

             {/* Quick Actions */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* User Management */}
         <Card className="bg-white border border-slate-200 shadow-sm">
           <CardHeader>
             <CardTitle className="text-slate-800 flex items-center gap-2">
               <Users size={20} />
               จัดการผู้ใช้
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
             <Button 
               variant="outline" 
               className="w-full justify-start border-slate-200 hover:bg-slate-50"
               onClick={() => setCurrentView('users')}
             >
               <UserCheck size={16} className="mr-2" />
               ดูรายชื่อผู้ใช้ทั้งหมด
             </Button>
             <Button 
               variant="outline" 
               className="w-full justify-start border-slate-200 hover:bg-slate-50"
               onClick={() => setCurrentView('premium')}
             >
               <Crown size={16} className="mr-2" />
               จัดการสมาชิก Premium
             </Button>
             <Button 
               variant="outline" 
               className="w-full justify-start border-slate-200 hover:bg-slate-50"
               onClick={() => setCurrentView('banned')}
             >
               <Shield size={16} className="mr-2" />
               ผู้ใช้ที่ถูกแบน
             </Button>
             {user?.role === 'superadmin' && (
               <Button 
                 variant="outline" 
                 className="w-full justify-start border-slate-200 hover:bg-slate-50 bg-yellow-50 border-yellow-200 hover:bg-yellow-100"
                 onClick={() => setCurrentView('superadmin')}
               >
                 <Crown size={16} className="mr-2 text-yellow-600" />
                 SuperAdmin Panel
               </Button>
             )}
           </CardContent>
         </Card>

         {/* System Management */}
         <Card className="bg-white border border-slate-200 shadow-sm">
           <CardHeader>
             <CardTitle className="text-slate-800 flex items-center gap-2">
               <Database size={20} />
               จัดการระบบ
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
             <Button 
               variant="outline" 
               className="w-full justify-start border-slate-200 hover:bg-slate-50"
               onClick={() => setCurrentView('health')}
             >
               <Zap size={16} className="mr-2" />
               API Status Monitor
             </Button>
             <Button 
               variant="outline" 
               className="w-full justify-start border-slate-200 hover:bg-slate-50"
               onClick={() => setCurrentView('monitor')}
             >
               <Activity size={16} className="mr-2" />
               System Monitor
             </Button>
             <Button 
               variant="outline" 
               className="w-full justify-start border-slate-200 hover:bg-slate-50"
               onClick={() => setCurrentView('chat')}
             >
               <MessageCircle size={16} className="mr-2" />
               จัดการแชทและข้อความ
             </Button>
             <Button 
               variant="outline" 
               className="w-full justify-start border-slate-200 hover:bg-slate-50"
               onClick={() => setCurrentView('create-chat')}
             >
               <MessageCircle size={16} className="mr-2" />
               สร้างห้องแชทใหม่
             </Button>
             <Button 
               variant="outline" 
               className="w-full justify-start border-slate-200 hover:bg-slate-50"
               onClick={() => setCurrentView('analytics')}
             >
               <Activity size={16} className="mr-2" />
               สถิติการใช้งาน
             </Button>
             <Button 
               variant="outline" 
               className={`w-full justify-start border-slate-200 hover:bg-slate-50 ${
                 maintenanceMode ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-200'
               }`}
               onClick={toggleMaintenanceMode}
             >
               <Wrench size={16} className="mr-2" />
               {maintenanceMode ? 'ปิด Maintenance Mode' : 'เปิด Maintenance Mode'}
             </Button>
           </CardContent>
         </Card>
       </div>

             {/* Recent Activity */}
       <Card className="bg-white border border-slate-200 shadow-sm">
         <CardHeader>
                       <CardTitle className="text-slate-800 flex items-center gap-2">
              <Activity size={20} />
              กิจกรรมล่าสุด
              <span className="text-sm text-slate-500 ml-2">({recentActivities.length} รายการ)</span>
            </CardTitle>
         </CardHeader>
         <CardContent>
           <div className="space-y-3 max-h-[300px] overflow-y-auto">
             {recentActivities.length > 0 ? (
               recentActivities.map((activity, index) => (
                 <div 
                   key={activity.id} 
                   data-activity-id={activity.id}
                   className={`flex items-center gap-3 p-3 bg-slate-50 rounded-lg transition-all duration-200 hover:bg-slate-100 ${
                     index >= 5 ? 'opacity-80' : ''
                   }`}
                 >
                   <div className={`w-2 h-2 ${getActivityColor(activity.status)} rounded-full flex-shrink-0`}></div>
                   <div className="flex-1 min-w-0">
                     <p className="text-slate-800 text-sm leading-relaxed">{activity.message}</p>
                     <p className="text-xs text-slate-500 mt-1">{formatTimeAgo(activity.timestamp)}</p>
                   </div>
                   <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                     activity.status === 'success' ? 'bg-green-100 text-green-700' :
                     activity.status === 'premium' ? 'bg-amber-100 text-amber-700' :
                     activity.status === 'warning' ? 'bg-red-100 text-red-700' :
                     'bg-blue-100 text-blue-700'
                   }`}>
                     {activity.type.replace('_', ' ')}
                   </div>
                 </div>
               ))
             ) : (
               <div className="text-center py-8 text-slate-500">
                 <Activity size={48} className="mx-auto mb-2 opacity-50" />
                 <p>ไม่มีกิจกรรมล่าสุด</p>
               </div>
             )}
           </div>
           {recentActivities.length > 5 && (
             <div className="mt-3 text-center">
               <p className="text-xs text-slate-500">เลื่อนลงเพื่อดูกิจกรรมเพิ่มเติม</p>
             </div>
           )}
         </CardContent>
       </Card>

       {/* Welcome Message */}
       <Card className="bg-white border border-slate-200 shadow-sm">
         <CardContent className="p-8 text-center">
           <Shield size={64} className="mx-auto mb-4 text-pink-500" />
           <h2 className="text-2xl font-bold text-slate-800 mb-2">ยินดีต้อนรับสู่ Admin Dashboard</h2>
           <p className="text-slate-600">คุณสามารถจัดการระบบและดูสถิติการใช้งานได้ที่นี่</p>
         </CardContent>
       </Card>
    </>
  );

     return (
     <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
       {/* Admin Header */}
       <div className="bg-white border-b border-slate-200 p-6 shadow-sm">
         <div className="max-w-7xl mx-auto flex justify-between items-center">
           <div>
             <h1 className="text-3xl font-serif font-bold text-slate-800 flex items-center gap-3">
               <Shield size={32} />
               {getCurrentViewTitle()}
             </h1>
             <p className="text-slate-600 mt-1">ยินดีต้อนรับ, {user?.username}</p>
           </div>
                       <div className="flex gap-3">
              {(currentView === 'health' || currentView === 'monitor' || currentView === 'chat' || currentView === 'create-chat' || currentView === 'analytics') && (
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-slate-200 hover:bg-slate-50 hover:border-slate-300 flex items-center gap-2 px-6 py-3 font-medium shadow-sm"
                  onClick={() => setCurrentView('dashboard')}
                >
                  <ArrowLeft size={18} />
                  กลับไปหน้า Dashboard
                </Button>
              )}
             <Button 
               variant="outline" 
               size="lg"
               className="border-slate-200 hover:bg-slate-50 hover:border-slate-300 flex items-center gap-2 px-6 py-3 font-medium shadow-sm"
               onClick={() => window.location.href = '/'}
             >
               <Home size={18} />
               กลับหน้าหลัก
             </Button>
           </div>
         </div>
       </div>

       {/* Dashboard Content */}
       <div className="max-w-7xl mx-auto p-6 space-y-8">
         {renderCurrentView()}
       </div>
     </div>
   );
};

export default AdminDashboard;

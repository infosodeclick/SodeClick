import React, { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import {
  MessageCircle,
  Users,
  Search,
  Crown,
  Star,
  Clock,
  Lock,
  Globe,
  Plus,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { useAuth } from '../contexts/AuthContext';

const ChatRoomList = ({ currentUser, onSelectRoom, onCreatePrivateRoom }) => {
  const { user: authUser } = useAuth();
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'public', 'private'
  const [onlineUsers, setOnlineUsers] = useState({}); // roomId -> onlineCount
  const [totalOnlineUsers, setTotalOnlineUsers] = useState(0); // รวมคนออนไลน์ทั้งหมด
  
  // เพิ่ม state สำหรับ popup จ่ายเหรียญ
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [userCoins, setUserCoins] = useState(0);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    fetchChatRooms();
  }, [filterType]);

  // โหลดข้อมูลคนออนไลน์สำหรับทุกห้อง
  useEffect(() => {
    if (chatRooms.length > 0) {
      fetchOnlineUsers();
    }
  }, [chatRooms]);

  // เพิ่มการโหลดจำนวนคนออนไลน์รวมในระบบ
  useEffect(() => {
    fetchTotalOnlineUsers();
  }, []);

  // เพิ่มการโหลดข้อมูลเหรียญของผู้ใช้
  useEffect(() => {
    if (authUser) {
      fetchUserCoins();
    }
  }, [authUser]);

  const fetchUserCoins = async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        console.log('❌ ไม่มี token - ข้ามการโหลดเหรียญ');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/profile/me/coins`,
        {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('💰 User coins loaded:', data.data.coins);
          setUserCoins(data.data.coins || 0);
        } else {
          console.error('❌ Failed to load user coins:', data.message);
        }
      } else {
        console.error('❌ Failed to load user coins - HTTP error:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user coins:', error);
    }
  };

  const fetchTotalOnlineUsers = async () => {
    try {
      console.log('🔍 Fetching total online users...');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/online-count`,
        {
          credentials: 'include'
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Total online users response:', data);
        if (data.success) {
          setTotalOnlineUsers(data.data.onlineCount || 0);
          console.log(`✅ Total online users: ${data.data.onlineCount}`);
        }
      }
    } catch (error) {
      console.error('Error fetching total online users:', error);
    }
  };

  const fetchChatRooms = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching chat rooms with includeActiveMembers=true');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chatroom?type=${filterType}&search=${searchTerm}&includeActiveMembers=true`,
        {
          credentials: 'include'
        }
      );
      const data = await response.json();
      
      console.log('📊 Chat rooms response:', data);
      
      if (data.success) {
        setChatRooms(data.data.chatRooms);
        // Log active member counts
        data.data.chatRooms.forEach(room => {
          console.log(`📝 Room "${room.name}": activeMemberCount = ${room.activeMemberCount}, memberCount = ${room.memberCount}`);
        });
      }
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOnlineUsers = async () => {
    try {
      const onlineData = {};
      
      // ดึงข้อมูลคนออนไลน์สำหรับทุกห้อง
      for (const room of chatRooms) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chatroom/${room.id}/online-users?userId=${authUser._id || authUser.id}`,
            {
              credentials: 'include'
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              // ใช้จำนวนคนออนไลน์ที่ใช้งานจริงในห้องแชทนี้
              onlineData[room.id] = data.data.onlineCount || 0;
            } else {
              onlineData[room.id] = 0;
            }
          } else if (response.status === 403) {
            // สำหรับห้องส่วนตัวที่ไม่ได้เป็นสมาชิก ให้แสดง 0
            onlineData[room.id] = 0;
          } else {
            onlineData[room.id] = 0;
          }
        } catch (error) {
          console.error(`Error fetching online users for room ${room.id}:`, error);
          onlineData[room.id] = 0;
        }
      }
      
      setOnlineUsers(onlineData);
      
      // คำนวณรวมคนออนไลน์ทั้งหมดจากทุกห้อง
      const total = Object.values(onlineData).reduce((sum, count) => sum + count, 0);
      setTotalOnlineUsers(total);
    } catch (error) {
      console.error('Error fetching online users:', error);
    }
  };

    const handlePayment = async () => {
    if (!selectedRoom) return;
    
    setPaymentLoading(true);
    setPaymentError('');
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chatroom/${selectedRoom.id}/pay-entry`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            userId: authUser._id || authUser.id,
            amount: selectedRoom.entryFee
          })
        }
      );

      const data = await response.json();
      
      if (data.success) {
        setPaymentSuccess(true);
        // อัปเดตเหรียญของผู้ใช้
        setUserCoins(prev => prev - selectedRoom.entryFee);
        // รีเฟรชรายการห้องแชท
        fetchChatRooms();
        
        // ปิด popup หลังจาก 2 วินาที
        setTimeout(() => {
          setShowPaymentDialog(false);
          setPaymentSuccess(false);
          setSelectedRoom(null);
          // เข้าห้องแชท
          onSelectRoom(selectedRoom.id);
        }, 2000);
      } else {
        setPaymentError(data.message || 'เกิดข้อผิดพลาดในการจ่ายเหรียญ');
      }
    } catch (error) {
      console.error('Error paying for room entry:', error);
      setPaymentError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCancelPayment = () => {
    setShowPaymentDialog(false);
    setSelectedRoom(null);
    setPaymentError('');
    setPaymentSuccess(false);
  };

  const handleRoomClick = async (room) => {
    if (room.type === 'private' && !canAccessPrivateChat(currentUser.membership?.tier || 'member')) {
      alert('คุณต้องเป็นสมาชิก Gold ขึ้นไปเพื่อเข้าแชทส่วนตัว');
      return;
    }

    // สำหรับห้องสาธารณะ - เข้าได้เลย
    if (room.type === 'public') {
      onSelectRoom(room.id);
      return;
    }

    // สำหรับห้องส่วนตัว - ตรวจสอบการจ่ายเหรียญ
    if (room.type === 'private' && room.entryFee > 0) {
      // ตรวจสอบว่าเคยจ่ายแล้วหรือยัง
      if (!isUserMember(room)) {
        // แสดง popup จ่ายเหรียญ
        setSelectedRoom(room);
        setShowPaymentDialog(true);
        setPaymentError('');
        setPaymentSuccess(false);
        return;
      }
    }

    // สำหรับห้องส่วนตัว - ต้องเข้าร่วมก่อน
    if (room.type === 'private' && !isUserMember(room)) {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chatroom/${room.id}/join`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
              userId: currentUser._id
            })
          }
        );

        const data = await response.json();
        if (data.success) {
          fetchChatRooms();
          onSelectRoom(room.id);
        } else {
          alert(data.message);
        }
      } catch (error) {
        console.error('Error joining room:', error);
        alert('เกิดข้อผิดพลาดในการเข้าร่วมห้องแชท');
      }
    } else {
      onSelectRoom(room.id);
    }
  };

  const getUserMembershipLimits = (tier) => {
    const limits = {
      member: { canAccessPrivateChat: false },
      silver: { canAccessPrivateChat: false },
      gold: { canAccessPrivateChat: true },
      vip: { canAccessPrivateChat: true },
      vip1: { canAccessPrivateChat: true },
      vip2: { canAccessPrivateChat: true },
      diamond: { canAccessPrivateChat: true },
      platinum: { canAccessPrivateChat: true }
    };
    return limits[tier] || limits.member;
  };

  const canAccessPrivateChat = (tier) => {
    return getUserMembershipLimits(tier).canAccessPrivateChat;
  };

  const canCreatePrivateRoom = (tier) => {
    return tier === 'platinum' || tier === 'diamond' || tier === 'vip1' || tier === 'vip2';
  };

  const getMembershipBadgeColor = (tier) => {
    const colors = {
      member: 'bg-gray-100 text-gray-800',
      silver: 'bg-gray-200 text-gray-900',
      gold: 'bg-yellow-100 text-yellow-800',
      vip: 'bg-purple-100 text-purple-800',
      vip1: 'bg-purple-200 text-purple-900',
      vip2: 'bg-purple-300 text-purple-900',
      diamond: 'bg-blue-100 text-blue-800',
      platinum: 'bg-indigo-100 text-indigo-800'
    };
    return colors[tier] || colors.member;
  };

  const formatLastActivity = (date) => {
    if (!date) return 'ไม่ระบุ';
    
    try {
      const now = new Date();
      const lastActivity = new Date(date);
      const diffInMinutes = Math.floor((now - lastActivity) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'เมื่อสักครู่';
      if (diffInMinutes < 60) return `${diffInMinutes} นาทีที่แล้ว`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ชั่วโมงที่แล้ว`;
      return `${Math.floor(diffInMinutes / 1440)} วันที่แล้ว`;
    } catch (error) {
      return 'ไม่ระบุ';
    }
  };

  const isUserMember = (room) => {
    const isOwner = room.owner?.id === currentUser._id;
    const isMember = room.members && room.members.some(member => member?.id === currentUser._id);
    return isOwner || isMember;
  };

  const filteredRooms = chatRooms.filter(room => 
    room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดห้องแชท...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header Section */}
      <div className="sticky top-0 z-10 p-2 sm:p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
            {/* Title and Online Status */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-pink-500 to-violet-500 rounded-xl flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-2xl font-bold text-gray-900">ห้องแชท</h1>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>{totalOnlineUsers} คนกำลังใช้งาน</span>
                  </div>
                </div>
              </div>
            </div>

            {/* User Info and Actions */}
            <div className="flex flex-row items-center justify-between gap-2 sm:gap-3">
              {/* Create Room Button */}
              {canCreatePrivateRoom(currentUser.membership?.tier || 'member') && (
                <button
                  onClick={onCreatePrivateRoom}
                  className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-violet-500 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:from-pink-600 hover:to-violet-600 transition-all duration-200 shadow-sm text-sm sm:text-base flex-shrink-0"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">สร้างห้องส่วนตัว</span>
                  <span className="sm:hidden">สร้างห้อง</span>
                </button>
              )}
              
              {/* Membership Info */}
              <div className="bg-gray-100 rounded-lg px-3 py-2 sm:px-4 sm:py-2 flex-shrink-0">
                <div className="text-xs sm:text-sm font-medium text-gray-900">
                  สมาชิก: {currentUser.membership?.tier?.toUpperCase() || 'MEMBER'}
                </div>
                <div className="text-xs text-gray-600">
                  {canAccessPrivateChat(currentUser.membership?.tier || 'member')
                    ? 'เข้าแชทส่วนตัวได้'
                    : 'เฉพาะแชทสาธารณะ'}
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาห้องแชท..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder-gray-500 text-sm sm:text-base"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 sm:gap-2 overflow-x-auto">
              {[
                { key: 'all', label: 'ทั้งหมด', icon: MessageCircle },
                { key: 'public', label: 'สาธารณะ', icon: Globe },
                ...(canAccessPrivateChat(currentUser.membership?.tier || 'member')
                  ? [{ key: 'private', label: 'ส่วนตัว', icon: Lock }]
                  : [])
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setFilterType(filter.key)}
                  className={`flex items-center gap-1 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    filterType === filter.key
                      ? 'bg-pink-500 text-white shadow-sm'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <filter.icon className="h-3 w-3 sm:h-4 sm:w-4" />
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Room List */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 pt-0 sm:pt-0">
        <div className="space-y-2 sm:space-y-4">
        {filteredRooms.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
            <MessageCircle className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">ไม่พบห้องแชท</h3>
            <p className="text-sm sm:text-base text-gray-500">ลองค้นหาด้วยคำอื่นหรือเปลี่ยนตัวกรอง</p>
          </div>
        ) : (
          filteredRooms.map((room) => {
              const canAccess = room.type === 'public' ||
                              (room.type === 'private' && canAccessPrivateChat(currentUser.membership?.tier || 'member'));
              
              return (
                <div
                  key={room.id}
                  className={`bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6 transition-all duration-200 ${
                    canAccess ? 'hover:shadow-md hover:border-pink-200 cursor-pointer' : 'opacity-60 cursor-not-allowed'
                  }`}
                  onClick={() => canAccess ? handleRoomClick(room) : null}
                >
                  <div className="flex items-start justify-between">
                    {/* Room Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <div className="flex items-center gap-2">
                          {room.type === 'public' ? (
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <Globe className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                              <Lock className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h3 className={`text-base sm:text-lg font-semibold truncate ${
                              canAccess ? 'text-gray-900' : 'text-gray-500'
                            }`}>
                              {room.name}
                            </h3>
                            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                room.type === 'public' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-orange-100 text-orange-700'
                              }`}>
                                {room.type === 'public' ? 'สาธารณะ' : 'ส่วนตัว'}
                              </span>
                              {(room.entryFee || 0) > 0 && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                  {room.entryFee} เหรียญ
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {room.description && (
                        <p className="text-gray-600 mb-3 sm:mb-4 line-clamp-2 text-sm sm:text-base">
                          {room.description}
                        </p>
                      )}

                      {/* Room Stats - Single Row Layout */}
                      <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                        {/* Mobile: Icon + Number only, Desktop: Icon + Number + Label */}
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Users className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                          <div className="text-xs sm:text-sm font-medium text-gray-900">
                            {room.activeMemberCount || room.memberCount || 0}
                          </div>
                          <div className="hidden sm:block text-xs text-gray-500">สมาชิก</div>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <div className="text-xs sm:text-sm font-medium text-green-600">
                            {onlineUsers[room.id] || 0}
                          </div>
                          <div className="hidden sm:block text-xs text-gray-500">ใช้งาน</div>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                          <div className="text-xs sm:text-sm font-medium text-gray-900">
                            {room.stats?.totalMessages || 0}
                          </div>
                          <div className="hidden sm:block text-xs text-gray-500">ข้อความ</div>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                          <div className="text-xs sm:text-sm font-medium text-gray-900">
                            {formatLastActivity(room.lastActivity).split(' ')[0]}
                          </div>
                          <div className="hidden sm:block text-xs text-gray-500">ล่าสุด</div>
                        </div>
                      </div>
                    </div>

                    {/* Owner Info and Action - Mobile Optimized */}
                    <div className="flex flex-col items-end gap-1 sm:gap-4">
                      {/* Owner - Mobile: Avatar + Name, Desktop: Full info */}
                      <div className="flex items-center gap-1 sm:gap-3">
                        {/* Membership Icon */}
                        <div className="flex-shrink-0">
                          {room.owner?.membershipTier === 'platinum' && <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-500" />}
                          {room.owner?.membershipTier === 'diamond' && <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />}
                          {room.owner?.membershipTier === 'vip' && <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500" />}
                          {room.owner?.membershipTier === 'vip1' && <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />}
                          {room.owner?.membershipTier === 'vip2' && <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-purple-700" />}
                          {room.owner?.membershipTier === 'gold' && <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />}
                          {room.owner?.membershipTier === 'silver' && <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />}
                          {(!room.owner?.membershipTier || room.owner?.membershipTier === 'member') && <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-300" />}
                        </div>
                        <Avatar className="w-6 h-6 sm:w-10 sm:h-10">
                          <AvatarImage src={room.owner?.profileImages?.[0]} alt={room.owner?.displayName || 'Unknown'} />
                          <AvatarFallback className="bg-gradient-to-r from-pink-400 to-violet-400 text-white text-xs sm:text-sm">
                            {(room.owner?.displayName || room.owner?.username || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {/* Mobile: Show name after avatar */}
                        <div className="sm:hidden text-right">
                          <div className="text-xs font-medium text-gray-900 truncate max-w-20">
                            {room.owner?.displayName || `${room.owner?.firstName || ''} ${room.owner?.lastName || ''}`.trim() || room.owner?.username || 'Unknown User'}
                          </div>
                        </div>
                        {/* Desktop: Full info */}
                        <div className="hidden sm:block text-right">
                          <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                            <Crown className="h-3 w-3 text-yellow-500" />
                            <span className="truncate max-w-none">
                              {room.owner?.displayName || `${room.owner?.firstName || ''} ${room.owner?.lastName || ''}`.trim() || room.owner?.username || 'Unknown User'}
                            </span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMembershipBadgeColor(room.owner?.membershipTier)}`}>
                            {room.owner?.membershipTier?.toUpperCase() || 'MEMBER'}
                          </span>
                        </div>
                      </div>

                      {/* Action Button - Mobile: Icon only, Desktop: Full text */}
                      <div className="text-right">
                        {canAccess ? (
                          <div className="flex items-center gap-1">
                            {/* Check if room requires payment and if user has paid */}
                            {room.entryFee && room.entryFee > 0 ? (
                              // Room requires payment
                              isUserMember(room) ? (
                                // User has paid - show green status
                                <>
                                  <div className="w-2 h-2 bg-green-500 rounded-full sm:hidden"></div>
                                  <div className="text-xs sm:text-sm text-green-600 font-medium">
                                    <span className="hidden sm:inline">คลิกเพื่อแชท</span>
                                    <span className="sm:hidden">พร้อมใช้งาน</span>
                                  </div>
                                </>
                              ) : (
                                // User hasn't paid - show yellow status
                                <>
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full sm:hidden"></div>
                                  <div className="text-xs sm:text-sm text-yellow-600 font-medium">
                                    <span className="hidden sm:inline">จ่ายเหรียญเพื่อเข้าร่วม</span>
                                    <span className="sm:hidden">จ่ายเหรียญเพื่อเข้าร่วม</span>
                                  </div>
                                </>
                              )
                            ) : (
                              // Room is free - show green status
                              <>
                                <div className="w-2 h-2 bg-green-500 rounded-full sm:hidden"></div>
                                <div className="text-xs sm:text-sm text-green-600 font-medium">
                                  <span className="hidden sm:inline">
                                    {room.type === 'public' ? 'คลิกเพื่อแชท' :
                                     isUserMember(room) ? 'คลิกเพื่อแชท' : 'คลิกเพื่อเข้าร่วม'}
                                  </span>
                                  <span className="sm:hidden">พร้อมใช้งาน</span>
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs sm:text-sm text-gray-500">
                            <span className="hidden sm:inline">ต้องเป็นสมาชิก Gold+</span>
                            <span className="sm:hidden">Gold+</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Age Restriction - Mobile Optimized */}
                  {room.ageRestriction && (
                    <div className="mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-gray-100 flex items-center justify-between text-xs sm:text-sm text-gray-500">
                      <span className="truncate">
                        <span className="sm:hidden">อายุ: {room.ageRestriction?.minAge || 18}-{room.ageRestriction?.maxAge || 100}</span>
                        <span className="hidden sm:inline">อายุ: {room.ageRestriction?.minAge || 18}-{room.ageRestriction?.maxAge || 100} ปี</span>
                      </span>
                      {room.stats?.totalCoinsReceived > 0 && (
                        <span className="flex items-center gap-1 flex-shrink-0">
                          <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
                          <span className="sm:hidden">{room.stats.totalCoinsReceived}</span>
                          <span className="hidden sm:inline">{room.stats.totalCoinsReceived} เหรียญ</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
        )}
        </div>
      </div>
      
      {/* Clean Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="w-[95vw] sm:w-[90vw] md:w-[500px] max-w-2xl">
          <DialogHeader className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-orange-600" />
            </div>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              เข้าห้องแชทส่วนตัว
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              ห้อง "{selectedRoom?.name}" ต้องการเหรียญ {selectedRoom?.entryFee} เหรียญเพื่อเข้าใช้งาน
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Room Info Card */}
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-6 border border-orange-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-gray-900 mb-2">{selectedRoom?.name}</h4>
                  <p className="text-gray-600">{selectedRoom?.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-orange-600">{selectedRoom?.entryFee}</div>
                  <div className="text-sm text-gray-500">เหรียญ</div>
                </div>
              </div>
            </div>
            
            {/* User Coins Card */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Star className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">เหรียญของคุณ</div>
                    <div className="text-sm text-gray-600">ยอดคงเหลือ</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${userCoins >= (selectedRoom?.entryFee || 0) ? 'text-green-600' : 'text-red-600'}`}>
                    {userCoins}
                  </div>
                  <div className="text-sm text-gray-500">เหรียญ</div>
                </div>
              </div>
            </div>
            
            {/* Status Messages */}
            {userCoins < (selectedRoom?.entryFee || 0) && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <div className="font-medium text-red-700">เหรียญของคุณไม่เพียงพอ</div>
                    <div className="text-sm text-red-600">
                      คุณต้องการเหรียญเพิ่มอีก {(selectedRoom?.entryFee || 0) - userCoins} เหรียญ
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {paymentSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="font-medium text-green-700">จ่ายเหรียญสำเร็จ!</div>
                    <div className="text-sm text-green-600">กำลังเข้าห้องแชท...</div>
                  </div>
                </div>
              </div>
            )}
            
            {paymentError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <div className="font-medium text-red-700">{paymentError}</div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-3 pt-6">
            <button
              onClick={handleCancelPayment}
              className="flex-1 px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors font-medium"
              disabled={paymentLoading}
            >
              ยกเลิก
            </button>
            <button
              onClick={handlePayment}
              disabled={paymentLoading || userCoins < (selectedRoom?.entryFee || 0) || paymentSuccess}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                userCoins >= (selectedRoom?.entryFee || 0) && !paymentSuccess
                  ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white hover:from-orange-600 hover:to-yellow-600 shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {paymentLoading ? (
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  กำลังประมวลผล...
                </div>
              ) : paymentSuccess ? (
                <div className="flex items-center gap-2 justify-center">
                  <CheckCircle className="h-5 w-5" />
                  สำเร็จ
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-center">
                  <Star className="h-5 w-5" />
                  จ่าย {selectedRoom?.entryFee} เหรียญ
                </div>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatRoomList;
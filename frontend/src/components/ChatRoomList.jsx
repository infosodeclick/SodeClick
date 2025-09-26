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
import RealTimeChat from './RealTimeChat';

const ChatRoomList = ({ currentUser, onSelectRoom, onCreatePrivateRoom, showWebappNotification }) => {
  const { user: authUser } = useAuth();
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'public', 'private'
  const [onlineUsers, setOnlineUsers] = useState({}); // roomId -> onlineCount
  const [totalOnlineUsers, setTotalOnlineUsers] = useState(0); // รวมคนออนไลน์ทั้งหมด
  const [selectedRoomId, setSelectedRoomId] = useState(null); // เพิ่ม state สำหรับห้องที่เลือก
  const [showChatView, setShowChatView] = useState(false); // state สำหรับแสดง chat view
  
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

  // เลือกห้องสาธารณะแรกโดยค่าเริ่มต้น - เปิดใช้งานและแสดงแชททันที
  useEffect(() => {
    if (chatRooms.length > 0 && !selectedRoomId) {
      const firstPublicRoom = chatRooms.find(room => room.type === 'public');
      if (firstPublicRoom) {
        setSelectedRoomId(firstPublicRoom.id);
        setShowChatView(true); // แสดงหน้าแชททันที
      }
    }
  }, [chatRooms, selectedRoomId]);

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

      console.log('🔑 Fetching user coins with token...');
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/profile/me/coins`,
        {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('📊 User coins response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('💰 User coins loaded:', data.data.coins);
          setUserCoins(data.data.coins || 0);
        } else {
          console.error('❌ Failed to load user coins:', data.message);
        }
      } else if (response.status === 401) {
        console.error('❌ Token invalid for user coins - user may need to re-login');
        // ไม่ redirect เพราะอาจเป็น token หมดอายุชั่วคราว
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
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/users/online-count`,
        {
          credentials: 'include'
          // ไม่ส่ง Authorization header เพราะ endpoint นี้ไม่ต้องการ auth
        }
      );
      
      console.log('📊 Online count response status:', response.status);
      
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
      const token = sessionStorage.getItem('token');
      console.log('🔑 Token for chat rooms:', token ? 'Present' : 'Missing');
      
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/chatroom?type=${filterType}&search=${searchTerm}&includeActiveMembers=true`,
        {
          credentials: 'include'
          // ไม่ส่ง Authorization header เพราะ endpoint นี้ไม่ต้องการ auth
        }
      );
      
      console.log('📊 Chat rooms response status:', response.status);
      if (!response.ok) {
        console.error('❌ Failed to fetch chat rooms:', response.status, response.statusText);
        return;
      }
      
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
          const roomId = room.id;
          const userId = authUser._id || authUser.id;
          console.log(`🔍 Fetching online users for room: "${roomId}", user: "${userId}"`);
          
          const response = await fetch(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/chatroom/${roomId}/online-users?userId=${userId}`,
            {
              credentials: 'include'
              // ไม่ส่ง Authorization header เพราะ endpoint นี้ไม่ต้องการ auth
            }
          );
          
          console.log(`📊 Online users response for room ${roomId}:`, response.status);
          
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
      const token = sessionStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/chatroom/${selectedRoom.id}/pay-entry`,
        {
          method: 'POST',
          headers,
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
          setSelectedRoomId(selectedRoom.id);
          setShowChatView(true);
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

  const handleCreateRoom = () => {
    // Check if user has permission to create rooms
    const userTier = currentUser.membership?.tier || 'member';
    const userRole = currentUser.role || 'user';
    
    // Check if user can create chat rooms
    if (!canCreateChatRoom(userTier, userRole)) {
      if (showWebappNotification) {
        showWebappNotification('เฉพาะสมาชิก Platinum, Diamond หรือ Admin เท่านั้นที่สามารถสร้างห้องแชทได้');
      }
      return;
    }
    
    // Call the parent function to open create room modal
    if (onCreatePrivateRoom) {
      onCreatePrivateRoom();
    } else {
      // Fallback: show alert if no handler provided
      if (showWebappNotification) {
        showWebappNotification('ฟีเจอร์สร้างห้องแชทยังไม่พร้อมใช้งาน');
      }
    }
  };

  const handleRoomClick = async (room) => {
    if (room.type === 'private' && !canAccessPrivateChat(currentUser.membership?.tier || 'member')) {
      if (showWebappNotification) {
        showWebappNotification('คุณต้องเป็นสมาชิก Gold ขึ้นไปเพื่อเข้าแชทส่วนตัว');
      }
      return;
    }

    // อัปเดต selectedRoomId
    setSelectedRoomId(room.id);

    // สำหรับห้องสาธารณะ - เข้าได้เลย
    if (room.type === 'public') {
      setShowChatView(true);
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
        const token = sessionStorage.getItem('token');
        const headers = {
          'Content-Type': 'application/json'
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/chatroom/${room.id}/join`,
          {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({
              userId: currentUser._id
            })
          }
        );

        const data = await response.json();
        if (data.success) {
          fetchChatRooms();
          setSelectedRoomId(room.id);
          setShowChatView(true);
        } else {
          alert(data.message);
        }
      } catch (error) {
        console.error('Error joining room:', error);
        if (showWebappNotification) {
          showWebappNotification('เกิดข้อผิดพลาดในการเข้าร่วมห้องแชท');
        }
      }
    } else {
      setSelectedRoomId(room.id);
      setShowChatView(true);
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

  const canCreateChatRoom = (tier, role) => {
    // Admin users can always create chat rooms
    if (role === 'admin' || role === 'superadmin') {
      return true;
    }
    
    // Only Platinum and Diamond tier users can create chat rooms
    return tier === 'platinum' || tier === 'diamond';
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

  const filteredRooms = chatRooms
    .filter(room => 
      room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // ห้องสาธารณะอยู่อันดับแรกเสมอ
      if (a.type === 'public' && b.type !== 'public') return -1;
      if (b.type === 'public' && a.type !== 'public') return 1;
      
      // ถ้าเป็นประเภทเดียวกัน เรียงตามวันที่สร้าง (ใหม่ที่สุดก่อน)
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

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
    <div className="w-full flex flex-col h-full">
      {/* Search and Filters - Always Visible */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6 mb-4 space-y-4 sm:space-y-5 flex-shrink-0">

        {/* Filter Tabs */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
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
              className={`flex items-center justify-center gap-1 sm:gap-2 px-2 py-2 sm:px-6 sm:py-3 rounded-xl text-xs sm:text-base font-bold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 ${
                filterType === filter.key
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-pink-300'
                  : 'bg-white text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 border-2 border-gray-200 hover:border-pink-200'
              }`}
            >
              <filter.icon className="h-3 w-3 sm:h-5 sm:w-5" />
              <span className="text-xs sm:text-base">{filter.label}</span>
            </button>
          ))}
          
          {/* Create Room Button - Only show for eligible users */}
          {canCreateChatRoom(currentUser.membership?.tier || 'member', currentUser.role || 'user') && (
            <button
              onClick={handleCreateRoom}
              className="flex items-center justify-center gap-1 sm:gap-2 px-2 py-2 sm:px-6 sm:py-3 rounded-xl text-xs sm:text-base font-bold transition-all duration-200 bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-md hover:shadow-lg transform hover:scale-105 shadow-green-300"
              title="สร้างห้องแชท"
            >
              <Plus className="h-3 w-3 sm:h-5 sm:w-5" />
              <span className="text-xs sm:text-base">สร้างห้อง</span>
            </button>
          )}
        </div>
      </div>

      {/* Room List - Always Visible */}
      <div className="mb-4">
        {filteredRooms.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
            <MessageCircle className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">ไม่พบห้องแชท</h3>
            <p className="text-sm sm:text-base text-gray-500">ลองค้นหาด้วยคำอื่นหรือเปลี่ยนตัวกรอง</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
            {filteredRooms.map((room) => {
              const canAccess = room.type === 'public' ||
                              (room.type === 'private' && canAccessPrivateChat(currentUser.membership?.tier || 'member'));
              
              return (
                <button
                  key={room.id}
                  onClick={() => canAccess ? handleRoomClick(room) : null}
                  disabled={!canAccess}
                  className={`relative p-1.5 rounded-md border transition-all duration-200 flex flex-col items-center justify-center min-h-[45px] ${
                    selectedRoomId === room.id
                      ? 'bg-pink-100 border-pink-300 shadow-sm'
                      : canAccess 
                        ? 'bg-white border-gray-200 hover:border-pink-300 hover:shadow-sm cursor-pointer' 
                        : 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                  }`}
                >
                  {/* Room Name */}
                  <h3 className={`text-xs font-medium text-center truncate w-full mb-0.5 leading-tight ${
                    canAccess ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {room.name}
                  </h3>

                  {/* Online Count */}
                  <div className="flex items-center gap-0.5 text-xs text-gray-500">
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs">{onlineUsers[room.id] || 0}</span>
                  </div>

                  {/* Entry Fee Icon */}
                  {(room.entryFee || 0) > 0 && (
                    <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-yellow-100 text-yellow-700 px-1 py-0.5 rounded-full text-xs font-medium">
                      <Star className="h-2 w-2" />
                      <span className="text-xs">{room.entryFee}</span>
                    </div>
                  )}

                  {/* Access Status */}
                  {!canAccess && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-lg">
                      <span className="text-xs font-medium text-white bg-gray-800 px-1 py-0.5 rounded">
                        Gold+
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Chat View - Shows when room is selected */}
      {showChatView && selectedRoomId && (
        <div className="flex-1 min-h-[500px]">
          <RealTimeChat
            roomId={selectedRoomId}
            currentUser={currentUser}
            onBack={() => setShowChatView(false)}
            showWebappNotification={showWebappNotification}
          />
        </div>
      )}

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
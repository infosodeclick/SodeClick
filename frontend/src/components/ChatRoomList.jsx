
import React, { useState, useEffect } from 'react';
import {
  MessageCircle,
  Users,
  Search,
  Globe,
  Lock,
  Plus,
  Star,
  AlertCircle,
  CheckCircle,
  Coins
} from 'lucide-react';

const ChatRoomList = ({ currentUser, onSelectRoom, onCreatePrivateRoom, showWebappNotification }) => {
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [showChatView, setShowChatView] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [userCoins, setUserCoins] = useState(120);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // ดึงข้อมูลห้องแชทจาก API
  useEffect(() => {
    const fetchChatRooms = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');

        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/chatroom?type=all&limit=50`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` })
            }
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.data && data.data.chatRooms) {
          // แปลงข้อมูลจาก API ให้เข้ากับ format ที่คอมโพเนนต์คาดหวัง
          const formattedRooms = data.data.chatRooms.map(room => ({
            id: room.id,
            name: room.name,
            description: room.description,
            type: room.type,
            memberCount: room.memberCount || 0,
            activeMemberCount: room.activeMemberCount || 0,
            lastActivity: room.lastActivity ? new Date(room.lastActivity) : new Date(),
            createdAt: room.createdAt ? new Date(room.createdAt) : new Date(),
            entryFee: room.entryFee || 0,
            owner: room.owner,
            isMainPublicRoom: room.isMainPublicRoom || false
          }));

          setChatRooms(formattedRooms);
        } else {
          console.error('❌ API returned error:', data.message || 'Unknown error');
          setChatRooms([]);
        }
      } catch (error) {
        console.error('❌ Error fetching chat rooms:', error);
        setChatRooms([]);
      } finally {
        setLoading(false);
      }
    };

    fetchChatRooms();
  }, []);

  useEffect(() => {
    if (chatRooms.length > 0 && !selectedRoomId) {
      // เลือกห้องแรกที่พบเป็นห้องเริ่มต้น
      const firstRoom = chatRooms[0];
      if (firstRoom) {
        setSelectedRoomId(firstRoom.id);
        setShowChatView(true);
      }
    }
  }, [chatRooms, selectedRoomId]);

  const handlePayment = async () => {
    if (!selectedRoom) return;
    setPaymentLoading(true);
    setPaymentError('');

    try {
      const token = localStorage.getItem('token');
      console.log('💰 Payment request:', { 
        roomId: selectedRoom.id, 
        hasToken: !!token,
        tokenLength: token?.length 
      });

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/chatroom/${selectedRoom.id}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setPaymentSuccess(true);
        setUserCoins(data.data.remainingCoins);

        setTimeout(() => {
          setShowPaymentDialog(false);
          setPaymentSuccess(false);
          setSelectedRoom(null);

          // เรียก onSelectRoom ที่ส่งมาจาก parent component เพื่อแจ้งว่าผู้ใช้เลือกห้องแล้ว
          if (onSelectRoom) {
            onSelectRoom(selectedRoom.id);
          }
        }, 2000);
      } else {
        const errorData = await res.json();
        setPaymentError(errorData.message || 'เกิดข้อผิดพลาดในการจ่ายเหรียญ');
      }
    } catch (error) {
      console.error('Payment error:', error);
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
    const userTier = currentUser?.membership?.tier || 'member';
    const userRole = currentUser?.role || 'user';
    
    if (userTier !== 'platinum' && userTier !== 'diamond' && userRole !== 'admin' && userRole !== 'superadmin') {
      if (showWebappNotification) {
        showWebappNotification('เฉพาะสมาชิก Platinum, Diamond หรือ Admin เท่านั้นที่สามารถสร้างห้องแชทได้');
      }
      return;
    }
    
    if (onCreatePrivateRoom) {
      onCreatePrivateRoom();
    }
  };

  const handleRoomClick = async (room) => {
    console.log('🏠 handleRoomClick called with room:', room.id, room.name);
    const userTier = currentUser?.membership?.tier || 'member';

    if (room.type === 'private' && !['gold', 'vip', 'vip1', 'vip2', 'diamond', 'platinum'].includes(userTier)) {
      if (showWebappNotification) {
        showWebappNotification('คุณต้องเป็นสมาชิก Gold ขึ้นไปเพื่อเข้าแชทส่วนตัว');
      }
      return;
    }

    // ตรวจสอบสถานะการจ่ายเหรียญสำหรับห้องส่วนตัว
    if (room.type === 'private' && room.entryFee > 0) {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/chatroom/${room.id}/payment-status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (res.ok) {
          const data = await res.json();
          const { hasPaid, canJoin, userCoins, isAdmin, isOwner } = data.data;

          console.log('💰 Payment status check:', {
            roomId: room.id,
            roomName: room.name,
            hasPaid,
            canJoin,
            isAdmin,
            isOwner,
            userCoins,
            entryFee: room.entryFee
          });

          if (hasPaid || canJoin || isAdmin || isOwner) {
            // เคยจ่ายแล้ว หรือสามารถเข้าได้เลย หรือเป็น Admin หรือเป็นเจ้าของห้อง
            console.log('✅ User can join room - hasPaid:', hasPaid, 'canJoin:', canJoin, 'isAdmin:', isAdmin, 'isOwner:', isOwner);
            if (onSelectRoom) {
              onSelectRoom(room.id);
            }
          } else {
            // ยังไม่จ่าย ต้องจ่ายก่อน
            console.log('❌ User needs to pay - showing payment dialog');
            setSelectedRoom(room);
            setShowPaymentDialog(true);
            setPaymentError('');
            setPaymentSuccess(false);
            setUserCoins(userCoins);
          }
        } else {
          // ถ้า API error ให้ใช้วิธีเดิม
          setSelectedRoom(room);
          setShowPaymentDialog(true);
          setPaymentError('');
          setPaymentSuccess(false);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        // ถ้า error ให้ใช้วิธีเดิม
        setSelectedRoom(room);
        setShowPaymentDialog(true);
        setPaymentError('');
        setPaymentSuccess(false);
      }
      return;
    }

    // สำหรับห้องสาธารณะหรือห้องส่วนตัวที่ไม่มีค่าเข้าห้อง
    if (onSelectRoom) {
      console.log('📞 Calling onSelectRoom with roomId:', room.id);
      onSelectRoom(room.id);
    } else {
      console.error('❌ onSelectRoom prop is not provided');
    }
  };

  const formatLastActivity = (date) => {
    if (!date) return 'ไม่ระบุ';
    const now = new Date();
    const lastActivity = new Date(date);
    const diffInMinutes = Math.floor((now - lastActivity) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'เมื่อสักครู่';
    if (diffInMinutes < 60) return `${diffInMinutes} นาทีที่แล้ว`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ชม.ที่แล้ว`;
    return `${Math.floor(diffInMinutes / 1440)} วันที่แล้ว`;
  };

  const filteredRooms = chatRooms
    .filter(room => {
      // กรองตาม search term
      const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // กรองห้องหลักออกจากทุกแถบ (เพราะจะปรากฏในหน้าแชท Public หลักอยู่แล้ว)
      if (room.isMainPublicRoom) {
        return false;
      }
      
      return matchesSearch;
    })
    .sort((a, b) => {
      // เรียงตามประเภท (public ก่อน private)
      if (a.type === 'public' && b.type !== 'public') return -1;
      if (b.type === 'public' && a.type !== 'public') return 1;

      // เรียงตาม role ของ owner (admin ก่อน)
      const aIsAdmin = a.owner?.role === 'admin' || a.owner?.role === 'superadmin';
      const bIsAdmin = b.owner?.role === 'admin' || b.owner?.role === 'superadmin';
      
      if (aIsAdmin && !bIsAdmin) return -1;
      if (!aIsAdmin && bIsAdmin) return 1;

      // สุดท้ายเรียงตามวันที่สร้าง (ใหม่ก่อนเก่า)
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-500 mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">กำลังโหลดห้องแชท...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        {/* Stats and Create Button */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">ออนไลน์</span>
            </div>
            <div className="flex items-center space-x-1 text-gray-500">
              <Users className="h-4 w-4" />
              <span className="text-sm">สมาชิก</span>
            </div>
          </div>

          <button
            onClick={handleCreateRoom}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>สร้างห้องใหม่</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="ค้นหาห้องแชท..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-200 text-gray-700 placeholder-gray-500 text-sm"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'ทั้งหมด', count: filteredRooms.length },
            { key: 'public', label: 'สาธารณะ', count: filteredRooms.filter(r => r.type === 'public').length },
            { key: 'private', label: 'ส่วนตัว', count: filteredRooms.filter(r => r.type === 'private').length }
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setFilterType(filter.key)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200 ${
                filterType === filter.key
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-hidden">
        {filteredRooms.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center h-full flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">ไม่พบห้องแชท</h3>
            <p className="text-gray-500 text-sm">ลองค้นหาด้วยคำอื่นหรือเปลี่ยนตัวกรองดูครับ</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRooms.map((room) => {
              const canAccess = room.type === 'public' || ['gold', 'vip', 'vip1', 'vip2', 'diamond', 'platinum'].includes(currentUser?.membership?.tier || 'member');
              
              return (
                <div
                  key={room.id}
                  className={`bg-white rounded-xl shadow-sm border transition-all duration-200 ${
                    selectedRoomId === room.id 
                      ? 'border-blue-300 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  } ${!canAccess ? 'opacity-60' : ''}`}
                >
                  <button
                    onClick={() => canAccess ? handleRoomClick(room) : null}
                    disabled={!canAccess}
                    className="w-full p-5 text-left"
                  >
                    <div className="flex items-start space-x-4">
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                        room.type === 'public' 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'bg-purple-100 text-purple-600'
                      }`}>
                        {room.type === 'public' ? (
                          <Globe className="h-5 w-5" />
                        ) : (
                          <Lock className="h-5 w-5" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className={`font-semibold text-gray-900 truncate ${
                            !canAccess ? 'text-gray-500' : ''
                          }`}>
                            {room.name}
                          </h3>
                          {room.entryFee > 0 && (
                            <div className="flex items-center space-x-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                              <Coins className="h-3 w-3" />
                              <span>{room.entryFee}</span>
                            </div>
                          )}
                        </div>

                        {room.description && (
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {room.description}
                          </p>
                        )}

                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className={`px-2 py-1 rounded ${
                            room.type === 'public' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {room.type === 'public' ? 'สาธารณะ' : 'ส่วนตัว'}
                          </span>
                          <span>{room.activeMemberCount || 0} ออนไลน์</span>
                          <span>•</span>
                          <span>{formatLastActivity(room.lastActivity || room.createdAt)}</span>
                        </div>
                      </div>

                      {/* Selection indicator */}
                      {selectedRoomId === room.id && (
                        <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1"></div>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      {showPaymentDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">เข้าห้องแชทพรีเมียม</h3>
              <p className="text-gray-600 text-sm mt-1">
                ห้อง "{selectedRoom?.name}" ต้องการเหรียญ {selectedRoom?.entryFee} เหรียญ
              </p>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Room info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Lock className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{selectedRoom?.name}</h4>
                    <p className="text-gray-600 text-sm">{selectedRoom?.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-purple-600">{selectedRoom?.entryFee}</span>
                  <span className="text-gray-600 ml-1">เหรียญ</span>
                </div>
              </div>

              {/* User coins */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 font-medium">เหรียญของคุณ</span>
                  <span className={`text-lg font-bold ${
                    userCoins >= (selectedRoom?.entryFee || 0) ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {userCoins} เหรียญ
                  </span>
                </div>
              </div>

              {/* Status messages */}
              {userCoins < (selectedRoom?.entryFee || 0) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      เหรียญไม่เพียงพอ! ต้องการอีก {(selectedRoom?.entryFee || 0) - userCoins} เหรียญ
                    </span>
                  </div>
                </div>
              )}

              {paymentSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">จ่ายเหรียญสำเร็จ! กำลังเข้าห้องแชท...</span>
                  </div>
                </div>
              )}

              {paymentError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">{paymentError}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-200 flex space-x-3">
              <button
                onClick={handleCancelPayment}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors duration-200"
                disabled={paymentLoading}
              >
                ยกเลิก
              </button>
              <button
                onClick={handlePayment}
                disabled={paymentLoading || userCoins < (selectedRoom?.entryFee || 0) || paymentSuccess}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors duration-200 ${
                  userCoins >= (selectedRoom?.entryFee || 0) && !paymentSuccess
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {paymentLoading ? 'กำลังประมวลผล...' : `จ่าย ${selectedRoom?.entryFee} เหรียญ`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatRoomList;
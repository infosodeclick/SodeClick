import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Search, 
  MessageCircle, 
  Plus,
  MoreVertical,
  Trash2
} from 'lucide-react';
import unreadAPI from '../services/unreadAPI';
import { getProfileImageUrl, getMainProfileImage } from '../utils/profileImageUtils';
import { membershipHelpers } from '../services/membershipAPI';

const PrivateChatList = ({ 
  currentUser, 
  onSelectChat, 
  onCreateNewChat,
  onDeleteChat,
  onRefresh,
  privateChats = [],
  isLoading = false,
  showWebappNotification = null // เพิ่ม prop สำหรับ webapp notification
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'online', 'recent'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({}); // เพิ่ม state สำหรับ unread counts
  const [isFetchingUnread, setIsFetchingUnread] = useState(false);

  // ดึงข้อมูล unread count เมื่อ component mount (มี debounce)
  useEffect(() => {
    if (currentUser?._id) {
      const timeoutId = setTimeout(() => {
        fetchUnreadCounts();
      }, 500); // รอ 500ms ก่อนเรียก API
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentUser?._id]);

  // จัดการ real-time updates สำหรับ unread count และ chat list refresh
  useEffect(() => {
    if (!currentUser?._id) return;

    // สร้าง event listener สำหรับ unread count updates
    const handleUnreadCountUpdate = (event) => {
      const { chatRoomId, unreadCount } = event.detail;
      setUnreadCounts(prev => ({
        ...prev,
        [chatRoomId]: unreadCount
      }));
    };

    // สร้าง event listener สำหรับ chat list refresh
    const handleChatListRefresh = (event) => {
      const { recipientId } = event.detail;
      if (recipientId === currentUser._id) {
        console.log('🔄 Refreshing private chat list due to new message');
        if (onRefresh) {
          onRefresh(); // เรียกฟังก์ชัน refresh ที่ส่งมาจาก parent component
        }
      }
    };

    // เพิ่ม event listeners
    window.addEventListener('unread-count-update', handleUnreadCountUpdate);
    window.addEventListener('refresh-private-chat-list', handleChatListRefresh);

    // Cleanup
    return () => {
      window.removeEventListener('unread-count-update', handleUnreadCountUpdate);
      window.removeEventListener('refresh-private-chat-list', handleChatListRefresh);
    };
  }, [currentUser?._id, onRefresh]);

  // ฟังก์ชันดึงข้อมูล unread count
  const fetchUnreadCounts = async () => {
    if (!currentUser?._id) {
      console.warn('⚠️ No current user ID available for fetching unread counts');
      return;
    }

    // ป้องกันการเรียก API ซ้ำๆ
    if (isFetchingUnread) {
      console.log('⏳ Already fetching unread counts, skipping...');
      return;
    }

    setIsFetchingUnread(true);
    try {
      console.log('🔍 Fetching unread counts for user:', currentUser._id);
      const response = await unreadAPI.getPrivateChatUnreadCount(currentUser._id);
      
      if (response && response.success && response.data) {
        const countsMap = {};
        if (response.data.chatUnreadCounts && Array.isArray(response.data.chatUnreadCounts)) {
          response.data.chatUnreadCounts.forEach(item => {
            countsMap[item.chatRoom] = item.unreadCount;
          });
        }
        setUnreadCounts(countsMap);
        console.log('✅ Unread counts updated:', countsMap);
      } else {
        console.warn('⚠️ Unsuccessful response or no data:', response);
        // ตั้งค่า default empty counts
        setUnreadCounts({});
      }
    } catch (error) {
      console.error('❌ Error fetching unread counts:', error);
      // แสดง notification ถ้ามี
      if (showWebappNotification) {
        showWebappNotification('เกิดข้อผิดพลาดในการดึงข้อมูลข้อความที่ยังไม่ได้อ่าน', 'error');
      }
    } finally {
      setIsFetchingUnread(false);
    }
  };

  // ฟังก์ชันรีเซ็ต unread count เมื่อเข้าแชท
  const handleSelectChat = async (chat) => {
    // รีเซ็ต unread count สำหรับแชทนี้
    try {
      await unreadAPI.markAsRead(chat.roomId || chat.id, currentUser._id);
      
      // อัปเดต state ทันที
      setUnreadCounts(prev => ({
        ...prev,
        [chat.roomId || chat.id]: 0
      }));
    } catch (error) {
      console.error('Error marking messages as read:', error);
      // แสดง notification ถ้ามี แต่ไม่ต้องขัดขวางการเข้าแชท
      if (showWebappNotification) {
        showWebappNotification('ไม่สามารถทำเครื่องหมายข้อความเป็นอ่านแล้วได้', 'warning');
      }
    }
    
    // เรียกใช้ callback เดิม
    onSelectChat(chat);
  };

  // Debug: Log privateChats data
  console.log('📋 PrivateChatList received privateChats:', {
    length: privateChats.length,
    chats: privateChats.map(chat => ({
      id: chat.id,
      otherUser: chat.otherUser ? {
        _id: chat.otherUser._id,
        displayName: chat.otherUser.displayName,
        firstName: chat.otherUser.firstName,
        lastName: chat.otherUser.lastName
      } : 'no otherUser'
    }))
  });

  // Filter chats based on search and filter
  const filteredChats = privateChats.filter(chat => {
    const matchesSearch = chat.otherUser?.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chat.otherUser?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chat.otherUser?.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterType === 'online') {
      return matchesSearch && chat.otherUser?.isOnline;
    } else if (filterType === 'recent') {
      return matchesSearch && chat.lastMessage;
    }
    
    return matchesSearch;
  });

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('th-TH', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 48) {
      return 'เมื่อวาน';
    } else {
      return date.toLocaleDateString('th-TH', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getUnreadCount = (chat) => {
    // ใช้ข้อมูลจาก unreadCounts state แทน chat.unreadCount
    const chatId = chat.roomId || chat.id;
    return unreadCounts[chatId] || 0;
  };

  const getLastMessagePreview = (chat) => {
    if (!chat.lastMessage) return 'เริ่มการสนทนาใหม่';
    
    if (chat.lastMessage.fileUrl) {
      if (chat.lastMessage.fileType?.startsWith('image/')) return '📷 รูปภาพ';
      if (chat.lastMessage.fileType?.startsWith('video/')) return '🎥 วิดีโอ';
      return '📎 ไฟล์แนบ';
    }
    
    return chat.lastMessage.content || 'ข้อความ';
  };

  const handleDeleteChat = (e, chatId) => {
    e.stopPropagation(); // Prevent triggering the chat selection
    
    // หาข้อมูลแชทที่จะลบ
    const chat = privateChats.find(c => c.id === chatId);
    if (!chat) return;
    
    // ใช้ webapp notification แทน browser confirm
    if (showWebappNotification) {
      setChatToDelete(chatId);
      setShowDeleteConfirm(true);
    } else {
      // fallback ถ้าไม่มี webapp notification
      if (window.confirm('คุณต้องการลบแชทนี้หรือไม่? การลบจะไม่ส่งผลต่ออีกฝ่าย')) {
        onDeleteChat(chatId);
      }
    }
  };

  const confirmDelete = () => {
    if (chatToDelete) {
      onDeleteChat(chatToDelete);
      setShowDeleteConfirm(false);
      setChatToDelete(null);
      
      // แสดง notification สำเร็จ
      if (showWebappNotification) {
        showWebappNotification('ลบแชทสำเร็จ', 'success');
      }
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setChatToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดรายการแชท...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-pink-500 to-violet-500 text-white p-3 sm:p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <div className="flex items-center space-x-1 bg-white/20 px-3 py-2 rounded-lg">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm sm:text-base font-medium">
                {privateChats.filter(chat => chat.otherUser.isOnline).length} ออนไลน์
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="text-sm sm:text-base text-right">
              <div className="font-medium">ระดับ: {membershipHelpers.getTierDisplayName(currentUser.membership?.tier || 'member')}</div>
              <div className="text-sm opacity-80">
                แชทส่วนตัว {privateChats.length} คน
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3 sm:mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-white/70" />
          <Input
            type="text"
            placeholder="ค้นหาผู้ใช้..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 text-base sm:text-sm"
          />
        </div>

        {/* Filters */}
        <div className="flex space-x-1 sm:space-x-2">
          {[
            { key: 'all', label: 'ทั้งหมด' },
            { key: 'online', label: 'ออนไลน์' },
            { key: 'recent', label: 'ล่าสุด' }
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setFilterType(filter.key)}
              className={`px-2 py-1 sm:px-3 sm:py-1 rounded-lg text-xs transition-all ${
                filterType === filter.key
                  ? 'bg-white text-pink-600 font-medium'
                  : 'text-white/80 hover:text-white hover:bg-white/20'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <MessageCircle className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
            <p className="text-sm sm:text-base text-gray-500 mb-2">
              {searchTerm ? 'ไม่พบผู้ใช้ที่ค้นหา' : 'ยังไม่มีแชทส่วนตัว'}
            </p>
            <p className="text-xs sm:text-sm text-gray-400">
              {searchTerm 
                ? 'ลองค้นหาด้วยคำอื่น' 
                : 'เริ่มการสนทนากับผู้ใช้อื่นโดยคลิกปุ่ม "แชทใหม่"'
              }
            </p>
            {!searchTerm && (
              <Button
                onClick={onCreateNewChat}
                className="mt-3 sm:mt-4 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                เริ่มแชทใหม่
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-1 sm:space-y-2">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handleSelectChat(chat)}
              >
                <div className="p-3 sm:p-4">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-pink-400 to-violet-500 rounded-full flex items-center justify-center overflow-hidden">
                        {(() => {
                          // ใช้ profileImages array และ getMainProfileImage function
                          const profileImages = chat.otherUser.profileImages || [];
                          const mainImageIndex = chat.otherUser.mainProfileImageIndex || 0;
                          const userId = chat.otherUser._id || chat.otherUser.id;
                          
                          // ดึงรูปโปรไฟล์หลักด้วย getMainProfileImage
                          let mainImageUrl = getMainProfileImage(profileImages, mainImageIndex, userId);
                          
                          // ถ้าไม่มีรูปจาก profileImages ใช้ fallback เป็น profileImageUrl (backward compatibility)
                          if (!mainImageUrl && chat.otherUser.profileImageUrl) {
                            mainImageUrl = chat.otherUser.profileImageUrl.startsWith('http') 
                              ? chat.otherUser.profileImageUrl 
                              : `${import.meta.env.VITE_API_BASE_URL}${chat.otherUser.profileImageUrl}`;
                          }
                          
                          return mainImageUrl ? (
                            <img
                              src={mainImageUrl}
                              alt={chat.otherUser.displayName || chat.otherUser.firstName}
                              className="w-full h-full rounded-full object-cover object-center"
                              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                              onError={(e) => {
                                // ซ่อนรูปที่โหลดไม่ได้และแสดง avatar แทน
                                e.target.style.display = 'none';
                                const parentDiv = e.target.parentElement;
                                if (parentDiv && !parentDiv.querySelector('.fallback-avatar')) {
                                  const fallbackDiv = document.createElement('span');
                                  fallbackDiv.className = 'fallback-avatar text-sm sm:text-lg font-semibold text-white';
                                  fallbackDiv.textContent = chat.otherUser.firstName?.[0] || chat.otherUser.displayName?.[0] || '👤';
                                  parentDiv.appendChild(fallbackDiv);
                                }
                              }}
                            />
                          ) : (
                            <span className="text-sm sm:text-lg font-semibold text-white">
                              {chat.otherUser.firstName?.[0] || chat.otherUser.displayName?.[0] || '👤'}
                            </span>
                          );
                        })()}
                      </div>
                      
                      {/* Online indicator */}
                      {chat.otherUser.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>

                    {/* Chat info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                          {chat.otherUser.displayName || `${chat.otherUser.firstName} ${chat.otherUser.lastName}`}
                        </h3>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <p className="text-xs sm:text-sm text-gray-600 truncate flex-1">
                          {getLastMessagePreview(chat)}
                        </p>
                        
                        {/* Unread count */}
                        {getUnreadCount(chat) > 0 && (
                          <div className="ml-2 bg-pink-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center flex-shrink-0">
                            {getUnreadCount(chat) > 9 ? '9+' : getUnreadCount(chat)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Time and Action menu */}
                    <div className="flex flex-col items-end space-y-1">
                      {/* Time */}
                      <span className="text-xs text-gray-500">
                        {formatTime(chat.lastMessage?.timestamp || chat.createdAt)}
                      </span>
                      
                      {/* Action buttons */}
                      <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 hover:text-red-500 hover:bg-red-50"
                        onClick={(e) => handleDeleteChat(e, chat.id)}
                        title="ลบแชท"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ลบแชทส่วนตัว
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                คุณต้องการลบแชทนี้หรือไม่?<br />
                การลบจะไม่ส่งผลต่ออีกฝ่าย
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  ลบ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivateChatList;

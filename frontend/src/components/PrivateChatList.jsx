import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Search, 
  MessageCircle, 
  Plus,
  MoreVertical,
  Phone,
  Video,
  Trash2
} from 'lucide-react';

const PrivateChatList = ({ 
  currentUser, 
  onSelectChat, 
  onCreateNewChat,
  onDeleteChat,
  privateChats = [],
  isLoading = false,
  showWebappNotification = null // เพิ่ม prop สำหรับ webapp notification
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'online', 'recent'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);

  // Filter chats based on search and filter
  const filteredChats = privateChats.filter(chat => {
    const matchesSearch = chat.otherUser.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chat.otherUser.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chat.otherUser.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterType === 'online') {
      return matchesSearch && chat.otherUser.isOnline;
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
    // ใช้ unreadCount ที่ตั้งค่าไว้ใน chat object
    return chat.unreadCount || 0;
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
              <div className="font-medium">ระดับ: {currentUser.membership?.tier?.toUpperCase() || 'MEMBER'}</div>
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
            className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 text-xs sm:text-sm"
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
                onClick={() => onSelectChat(chat)}
              >
                <div className="p-3 sm:p-4">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-pink-400 to-violet-500 rounded-full flex items-center justify-center">
                        {chat.otherUser.profileImages?.[0] ? (
                          <img
                            src={chat.otherUser.profileImages[0]}
                            alt={chat.otherUser.displayName || chat.otherUser.firstName}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="text-sm sm:text-lg font-semibold text-white">
                            {chat.otherUser.firstName?.[0] || chat.otherUser.displayName?.[0] || '👤'}
                          </span>
                        )}
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
                        <span className="text-xs text-gray-500">
                          {formatTime(chat.lastMessage?.timestamp || chat.createdAt)}
                        </span>
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

                    {/* Action menu */}
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 hover:text-pink-500 hover:bg-pink-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle call action
                        }}
                      >
                        <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 hover:text-pink-500 hover:bg-pink-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle video call action
                        }}
                      >
                        <Video className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
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

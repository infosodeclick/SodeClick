import React, { useState, useEffect } from 'react';
import { getMainProfileImage } from '../utils/profileImageUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Search, 
  User, 
  MapPin, 
  Calendar, 
  MessageCircle
} from 'lucide-react';

const NewPrivateChatModal = ({ 
  isOpen, 
  onClose, 
  currentUser, 
  onStartChat,
  existingChats = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Load users when modal opens
  useEffect(() => {
    if (isOpen && currentUser) {
      fetchUsers();
    }
  }, [isOpen, currentUser]);

  // Filter users based on search term
  useEffect(() => {
    if (!currentUser) return; // ไม่ทำอะไรถ้าไม่มี currentUser
    
    if (searchTerm.trim()) {
      const filtered = users.filter(user => {
        // ไม่รวมตัวเอง
        if (user._id === currentUser._id) return false;
        
        // ไม่รวมผู้ใช้ที่มีแชทอยู่แล้ว (ใช้การเปรียบเทียบที่แน่นอน)
        const hasExistingChat = existingChats.some(chat => 
          chat.otherUser._id === user._id || 
          chat.otherUser.id === user._id ||
          chat.otherUser._id === user.id ||
          chat.otherUser.id === user.id
        );
        if (hasExistingChat) return false;
        
        // กรองตามคำค้นหา
        return user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               user.username?.toLowerCase().includes(searchTerm.toLowerCase());
      });
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers([]);
    }
  }, [searchTerm, users, currentUser, existingChats]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/profile/all?limit=100`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUsers(data.data.users || []);
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = () => {
    if (selectedUser && onStartChat) {
      onStartChat(selectedUser);
      onClose();
      setSelectedUser(null);
      setSearchTerm('');
    }
  };

  const handleClose = () => {
    setSelectedUser(null);
    setSearchTerm('');
    onClose();
  };

  const getMembershipBadgeColor = (tier) => {
    const colors = {
      platinum: 'from-purple-500 to-pink-500',
      diamond: 'from-blue-500 to-cyan-500',
      vip2: 'from-red-500 to-orange-500',
      vip1: 'from-orange-500 to-yellow-500',
      vip: 'from-purple-400 to-pink-400',
      gold: 'from-yellow-500 to-amber-500',
      silver: 'from-gray-400 to-slate-400'
    };
    return colors[tier] || 'from-gray-300 to-gray-400';
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A';
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden p-0 bg-white/95 backdrop-blur-sm border-2 border-gray-200/50 shadow-2xl">
        {/* Modern Header */}
        <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
          <DialogHeader>
            <DialogTitle className="text-center text-xl sm:text-2xl font-bold">
              เริ่มแชทส่วนตัวใหม่
            </DialogTitle>
            <DialogDescription className="text-center text-white/80 text-sm sm:text-base mt-2">
              เลือกผู้ใช้ที่คุณต้องการเริ่มการสนทนาส่วนตัว
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-4 sm:space-y-5">
          {/* Check if currentUser exists */}
          {!currentUser ? (
            <div className="text-center py-8 sm:py-12">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <User className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
              </div>
              <p className="text-gray-600 mb-2 text-base sm:text-lg font-medium">ไม่สามารถโหลดข้อมูลผู้ใช้ได้</p>
              <p className="text-sm text-gray-500">กรุณาเข้าสู่ระบบใหม่</p>
            </div>
          ) : (
            <>
              {/* Modern Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="ค้นหาผู้ใช้ที่ต้องการแชท..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 text-sm sm:text-base min-h-[48px] border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200"
                />
              </div>

              {/* Modern User List */}
              <div className="bg-gray-50/50 rounded-2xl p-4 max-h-80 sm:max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8 sm:py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 text-base font-medium">กำลังโหลดผู้ใช้...</p>
                  </div>
                ) : searchTerm.trim() && filteredUsers.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                      <User className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
                    </div>
                    <p className="text-gray-600 mb-2 text-base sm:text-lg font-medium">ไม่พบผู้ใช้ที่ค้นหา</p>
                    <p className="text-sm text-gray-500">ลองค้นหาด้วยคำอื่นดูครับ</p>
                  </div>
                ) : !searchTerm.trim() ? (
                  <div className="text-center py-8 sm:py-12">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                      <MessageCircle className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
                    </div>
                    <p className="text-gray-600 mb-2 text-base sm:text-lg font-medium">พิมพ์ชื่อผู้ใช้เพื่อค้นหา</p>
                    <p className="text-sm text-gray-500">หรือชื่อผู้ใช้เพื่อเริ่มแชทส่วนตัว</p>
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelected = selectedUser?._id === user._id;
                    const age = calculateAge(user.dateOfBirth);

                    return (
                      <div
                        key={user._id}
                        className={`group relative p-4 border-2 rounded-2xl cursor-pointer transition-all duration-200 min-h-[88px] ${
                          isSelected
                            ? 'border-pink-500 bg-pink-50/80 shadow-lg'
                            : 'border-transparent bg-white hover:border-pink-200 hover:bg-pink-50/50 hover:shadow-md'
                        }`}
                        onClick={() => setSelectedUser(user)}
                      >
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          {/* Modern Avatar */}
                          <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-pink-400 to-purple-600 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg">
                              {(() => {
                                const profileImages = user.profileImages || [];
                                const mainImageIndex = user.mainProfileImageIndex || 0;
                                const userId = user._id || user.id;

                                const mainImageUrl = getMainProfileImage(profileImages, mainImageIndex, userId);

                                return mainImageUrl ? (
                                  <img
                                    src={mainImageUrl}
                                    alt={user.displayName || user.firstName}
                                    className="w-full h-full rounded-2xl object-cover object-center"
                                    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      const parentDiv = e.target.parentElement;
                                      if (parentDiv && !parentDiv.querySelector('.fallback-avatar')) {
                                        const fallbackDiv = document.createElement('span');
                                        fallbackDiv.className = 'fallback-avatar text-lg sm:text-xl font-bold text-white';
                                        fallbackDiv.textContent = user.firstName?.[0] || user.displayName?.[0] || '👤';
                                        parentDiv.appendChild(fallbackDiv);
                                      }
                                    }}
                                  />
                                ) : (
                                  <span className="text-lg sm:text-xl font-bold text-white">
                                    {user.firstName?.[0] || user.displayName?.[0] || '👤'}
                                  </span>
                                );
                              })()}
                            </div>

                            {/* Online indicator */}
                            {user.isOnline && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-green-500 rounded-full border-3 border-white shadow-md"></div>
                            )}
                          </div>

                          {/* User info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-bold text-gray-900 text-base sm:text-lg truncate">
                                {user.displayName || `${user.firstName} ${user.lastName}`}
                              </h3>
                              {user.membership?.tier && user.membership.tier !== 'member' && (
                                <div className={`px-2 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${getMembershipBadgeColor(user.membership.tier)}`}>
                                  {user.membership.tier === 'platinum' ? 'PLATINUM' :
                                   user.membership.tier === 'diamond' ? 'DIAMOND' :
                                   user.membership.tier === 'vip2' ? 'VIP2' :
                                   user.membership.tier === 'vip1' ? 'VIP1' :
                                   user.membership.tier === 'vip' ? 'VIP' :
                                   user.membership.tier === 'gold' ? 'GOLD' :
                                   user.membership.tier === 'silver' ? 'SILVER' :
                                   user.membership.tier.toUpperCase()}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-4 w-4" />
                                <span>{age} ปี</span>
                              </div>
                              {user.location && (
                                <div className="flex items-center space-x-1">
                                  <MapPin className="h-4 w-4" />
                                  <span className="truncate">{user.location}</span>
                                </div>
                              )}
                            </div>

                            {user.bio && (
                              <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                                {user.bio}
                              </p>
                            )}
                          </div>

                          {/* Selection indicator */}
                          <div className="flex-shrink-0">
                            {isSelected ? (
                              <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center shadow-lg">
                                <span className="text-white text-sm font-bold">✓</span>
                              </div>
                            ) : (
                              <div className="w-6 h-6 border-2 border-gray-300 rounded-full group-hover:border-pink-300 transition-colors"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
            )}
              </div>
            </>
          )}

          {/* Modern Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200/50 bg-white/50 backdrop-blur-sm">
            <Button
              variant="outline"
              onClick={handleClose}
              className="px-6 py-3 text-base font-semibold min-h-[48px] border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 rounded-xl"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleStartChat}
              disabled={!selectedUser}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-6 py-3 text-base font-semibold min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              เริ่มแชท
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewPrivateChatModal;

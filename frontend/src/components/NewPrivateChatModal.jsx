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
      const token = sessionStorage.getItem('token');
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
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold text-gray-900">
            เริ่มแชทส่วนตัวใหม่
          </DialogTitle>
          <DialogDescription className="text-center">
            เลือกผู้ใช้ที่คุณต้องการเริ่มการสนทนาส่วนตัว
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Check if currentUser exists */}
          {!currentUser ? (
            <div className="text-center py-8">
              <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">ไม่สามารถโหลดข้อมูลผู้ใช้ได้</p>
              <p className="text-sm text-gray-400">กรุณาเข้าสู่ระบบใหม่</p>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="ค้นหาผู้ใช้..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* User List */}
              <div className="max-h-96 overflow-y-auto space-y-2">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-4"></div>
                <p className="text-gray-500">กำลังโหลดผู้ใช้...</p>
              </div>
            ) : searchTerm.trim() && filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">ไม่พบผู้ใช้ที่ค้นหา</p>
                <p className="text-sm text-gray-400">ลองค้นหาด้วยคำอื่น</p>
              </div>
            ) : !searchTerm.trim() ? (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">พิมพ์ชื่อผู้ใช้เพื่อค้นหา</p>
                <p className="text-sm text-gray-400">หรือชื่อผู้ใช้เพื่อเริ่มแชทส่วนตัว</p>
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = selectedUser?._id === user._id;
                const age = calculateAge(user.dateOfBirth);
                
                return (
                  <div
                    key={user._id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-pink-300 hover:bg-pink-50/50'
                    }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="flex items-center space-x-3">
                      {/* Avatar */}
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-violet-500 rounded-full flex items-center justify-center overflow-hidden">
                          {(() => {
                            const profileImages = user.profileImages || [];
                            const mainImageIndex = user.mainProfileImageIndex || 0;
                            const userId = user._id || user.id;
                            
                            // ดึงรูปโปรไฟล์หลักด้วย getMainProfileImage
                            const mainImageUrl = getMainProfileImage(profileImages, mainImageIndex, userId);
                            
                            return mainImageUrl ? (
                              <img
                                src={mainImageUrl}
                                alt={user.displayName || user.firstName}
                                className="w-full h-full rounded-full object-cover object-center"
                                style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                                onError={(e) => {
                                  // ซ่อนรูปที่โหลดไม่ได้และแสดง avatar แทน
                                  e.target.style.display = 'none';
                                  const parentDiv = e.target.parentElement;
                                  if (parentDiv && !parentDiv.querySelector('.fallback-avatar')) {
                                    const fallbackDiv = document.createElement('span');
                                    fallbackDiv.className = 'fallback-avatar text-lg font-semibold text-white';
                                    fallbackDiv.textContent = user.firstName?.[0] || user.displayName?.[0] || '👤';
                                    parentDiv.appendChild(fallbackDiv);
                                  }
                                }}
                              />
                            ) : (
                              <span className="text-lg font-semibold text-white">
                                {user.firstName?.[0] || user.displayName?.[0] || '👤'}
                              </span>
                            );
                          })()}
                        </div>
                        
                        {/* Online indicator */}
                        {user.isOnline && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>

                      {/* User info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {user.displayName || `${user.firstName} ${user.lastName}`}
                          </h3>
                          {user.membership?.tier && user.membership.tier !== 'member' && (
                            <div className={`px-2 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${getMembershipBadgeColor(user.membership.tier)}`}>
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
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{age} ปี</span>
                          </div>
                          {user.location && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-4 w-4" />
                              <span>{user.location}</span>
                            </div>
                          )}
                        </div>
                        
                        {user.bio && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {user.bio}
                          </p>
                        )}
                      </div>

                      {/* Selection indicator */}
                      <div className="flex-shrink-0">
                        {isSelected ? (
                          <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm">✓</span>
                          </div>
                        ) : (
                          <div className="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
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

          {/* Action buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={handleClose}
              className="px-6"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleStartChat}
              disabled={!selectedUser}
              className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white px-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              เริ่มแชท
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewPrivateChatModal;

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { 
  Send, 
  Smile, 
  Paperclip, 
  MoreVertical, 
  Heart, 
  Reply, 
  Trash2,
  Image as ImageIcon,
  X,
  MessageCircle
} from 'lucide-react';
import { getProfileImageUrl } from '../utils/profileImageUtils';
import { membershipHelpers } from '../services/membershipAPI';

const PrivateChat = ({ 
  currentUser, 
  selectedChat, 
  onSendMessage, 
  onClose,
  messages = [],
  isLoading = false,
  isTyping = false,
  onTyping,
  onStopTyping
}) => {
  // Remove unused parameter warnings
  console.log('PrivateChat loaded with:', { isLoading });
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Setup socket listeners for real-time messaging
  useEffect(() => {
    const setupSocketListeners = () => {
      if (window.socketManager && window.socketManager.socket && window.socketManager.socket.connected) {
        const socket = window.socketManager.socket;
        console.log('🔌 PrivateChat - Setting up socket listeners on existing socket:', socket.id);
        
        // เข้าร่วมห้องแชทส่วนตัว
        const token = sessionStorage.getItem('token');
        const joinData = {
          roomId: selectedChat.id,
          userId: currentUser._id,
          token
        };
        
        // ใช้ rate limiting สำหรับ private chat (200ms)
        if (window.socketManager && window.socketManager.emitWithRateLimit) {
          window.socketManager.emitWithRateLimit('join-room', joinData, 200);
        } else {
          socket.emit('join-room', joinData);
        }

        // ฟังข้อความใหม่
        socket.on('new-message', (message) => {
          console.log('📨 PrivateChat - New message received:', message);
          
          // ตรวจสอบว่าเป็นข้อความสำหรับแชทปัจจุบันหรือไม่
          if (message.chatRoom === selectedChat.id) {
            console.log('📨 Adding message to current private chat');
            
            // ส่ง custom event ไปยัง App.tsx เพื่ออัปเดต state
            window.dispatchEvent(new CustomEvent('private-chat-message', {
              detail: {
                message,
                chatId: selectedChat.id,
                messageType: 'socket-message'
              }
            }));
          }
        });

        // ฟังการยืนยันว่าข้อความถูกบันทึกแล้ว
        socket.on('message-saved', (data) => {
          console.log('✅ PrivateChat - Message saved confirmation:', data);
          
          if (data.chatRoomId === selectedChat.id) {
            // อัปเดตสถานะข้อความเป็น delivered
            window.dispatchEvent(new CustomEvent('message-delivered', {
              detail: {
                messageId: data.messageId,
                tempId: data.tempId,
                chatId: selectedChat.id,
                status: data.status
              }
            }));
          }
        });

        // ฟังข้อผิดพลาดจาก socket
        socket.on('error', (error) => {
          console.error('❌ PrivateChat - Socket error:', error);
          
          // ไม่แสดง alert สำหรับ rate limit error เพื่อไม่รบกวน UX
          if (error.message && error.message.includes('Rate limit')) {
            console.warn('⚠️ Rate limit encountered, will retry automatically');
            
            // ลองเข้าร่วมห้องใหม่หลังจาก 1 วินาที
            setTimeout(() => {
              if (socket && socket.connected) {
                const token = sessionStorage.getItem('token');
                const retryData = {
                  roomId: selectedChat.id,
                  userId: currentUser._id,
                  token
                };
                
                // ใช้ rate limiting method สำหรับการ retry
                if (window.socketManager && window.socketManager.emitWithRateLimit) {
                  window.socketManager.emitWithRateLimit('join-room', retryData, 200);
                } else {
                  socket.emit('join-room', retryData);
                }
                console.log('🔄 Retrying join-room after rate limit');
              }
            }, 1000);
          } else {
            // แสดงข้อผิดพลาดอื่น ๆ ให้ผู้ใช้
            if (window.alert) {
              window.alert(`เกิดข้อผิดพลาด: ${error.message || 'ไม่สามารถส่งข้อความได้'}`);
            }
          }
        });

        return true;
      } else {
        console.log('⚠️ PrivateChat - Socket not ready, will retry...');
        return false;
      }
    };

    // ลองตั้งค่า listeners ทันที
    let listenerSetup = setupSocketListeners();
    
    // ถ้า socket ยังไม่พร้อม ให้รอและลองใหม่
    if (!listenerSetup) {
      const retryInterval = setInterval(() => {
        if (setupSocketListeners()) {
          clearInterval(retryInterval);
        }
      }, 1000);

      // หยุดการลองใหม่หลังจาก 10 วินาที
      setTimeout(() => {
        clearInterval(retryInterval);
      }, 10000);
    }

    // Cleanup
    return () => {
      if (window.socketManager && window.socketManager.socket) {
        window.socketManager.socket.off('new-message');
        window.socketManager.socket.off('message-saved');
        window.socketManager.socket.off('error');
      }
    };
  }, [selectedChat.id, currentUser._id]);

  // Handle typing indicator
  useEffect(() => {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    if (newMessage.trim()) {
      onTyping?.();
      const timeout = setTimeout(() => {
        onStopTyping?.();
      }, 1000);
      setTypingTimeout(timeout);
    } else {
      onStopTyping?.();
    }

    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [newMessage, onTyping, onStopTyping, typingTimeout]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedImage) return;

    const messageData = {
      content: newMessage.trim(),
      replyTo: replyTo?._id || null,
      image: selectedImage
    };

    // ล้าง input field ทันทีเพื่อ UX ที่ดี
    const currentMessage = newMessage;
    const currentReplyTo = replyTo;
    const currentImage = selectedImage;
    
    setNewMessage('');
    setReplyTo(null);
    setSelectedImage(null);
    setShowImageUpload(false);

    try {
      // ลองส่งผ่าน Socket ก่อน
      if (window.socketManager?.socket?.connected) {
        console.log('📤 Sending message via socket:', {
          content: messageData.content,
          senderId: currentUser._id,
          chatRoomId: selectedChat.id,
          messageType: 'text',
          replyToId: messageData.replyTo
        });

        window.socketManager.socket.emit('send-message', {
          content: messageData.content,
          senderId: currentUser._id,
          chatRoomId: selectedChat.id,
          messageType: 'text',
          replyToId: messageData.replyTo
        });

        console.log('✅ Message sent via socket successfully');
      } else {
        // ถ้า socket ไม่พร้อม ให้ใช้ HTTP API แทน
        console.warn('⚠️ Socket not connected, falling back to HTTP API');
        
        if (onSendMessage) {
          await onSendMessage(messageData);
          console.log('✅ Message sent via HTTP API successfully');
        } else {
          throw new Error('No send method available');
        }
      }
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      // ถ้าส่งไม่สำเร็จ ให้คืนค่ากลับ
      setNewMessage(currentMessage);
      setReplyTo(currentReplyTo);
      setSelectedImage(currentImage);
      setShowImageUpload(!!currentImage);
      
      // แสดงข้อผิดพลาดให้ผู้ใช้
      if (window.alert) {
        window.alert('ไม่สามารถส่งข้อความได้ กรุณาลองใหม่อีกครั้ง');
      }
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result);
        setShowImageUpload(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '--:--';
    
    const date = new Date(timestamp);
    
    // ตรวจสอบว่า date ถูกต้องหรือไม่
    if (isNaN(date.getTime())) {
      console.warn('Invalid timestamp:', timestamp);
      return '--:--';
    }
    
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('th-TH', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('th-TH', { 
        day: '2-digit', 
        month: '2-digit',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  const getMembershipBadgeColor = (tier) => {
    switch (tier) {
      case 'vip': return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white';
      case 'diamond': return 'bg-gradient-to-r from-blue-400 to-purple-500 text-white';
      case 'platinum': return 'bg-gradient-to-r from-gray-400 to-gray-600 text-white';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const emojis = ['😀', '😂', '😍', '🥰', '😘', '😊', '😉', '😎', '🤔', '😢', '😭', '😡', '👍', '👎', '❤️', '💕', '🔥', '💯'];

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg">เลือกการสนทนาเพื่อเริ่มแชท</p>
        </div>
      </div>
    );
  }

  // Get the other user from the selected chat
  const otherUser = selectedChat.otherUser || selectedChat.participants?.find(p => p._id !== currentUser._id);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          <Avatar className="w-10 h-10">
            <AvatarImage 
              src={getProfileImageUrl(otherUser?.profileImages?.[0], otherUser?._id)} 
              alt={otherUser?.displayName} 
            />
            <AvatarFallback className="bg-gradient-to-r from-pink-400 to-violet-400 text-white">
              {otherUser?.displayName?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900">
                {otherUser?.displayName || otherUser?.firstName + ' ' + otherUser?.lastName || 'Unknown User'}
              </h3>
              <Badge className={`text-xs ${getMembershipBadgeColor(otherUser?.membershipTier)}`}>
                {membershipHelpers.getTierDisplayName(otherUser?.membershipTier || 'member')}
              </Badge>
            </div>
            <p className="text-sm text-gray-500">
              {isTyping ? 'กำลังพิมพ์...' : 'ออนไลน์'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <MoreVertical className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message, index) => {
          const isOwnMessage = message.sender?._id === currentUser._id;
          const prevMessage = messages[index - 1];
          const nextMessage = messages[index + 1];
          const showAvatar = !nextMessage || nextMessage.sender?._id !== message.sender?._id;
          const showTimestamp = !prevMessage || 
            (new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime()) > 5 * 60 * 1000; // 5 minutes

          return (
            <div key={message._id} className="message-group">
              {/* Timestamp */}
              {showTimestamp && (
                <div className="flex justify-center mb-4">
                  <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">
                    {formatTime(message.createdAt)}
                  </span>
                </div>
              )}

              <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} items-end space-x-2`}>
                {/* Avatar for received messages */}
                {!isOwnMessage && (
                  <div className="flex-shrink-0">
                    {showAvatar ? (
                      <Avatar className="w-8 h-8">
                        <AvatarImage 
                          src={getProfileImageUrl(message.sender?.profileImages?.[0], message.sender?._id)} 
                          alt={message.sender?.displayName} 
                        />
                        <AvatarFallback className="bg-gradient-to-r from-pink-400 to-violet-400 text-white text-xs">
                          {message.sender?.displayName?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-8 h-8" /> // Spacer
                    )}
                  </div>
                )}

                {/* Message Bubble */}
                <div className={`flex flex-col max-w-xs sm:max-w-md lg:max-w-lg ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                  {/* Reply To */}
                  {message.replyTo && (
                    <div className="mb-2 p-2 bg-gray-100 rounded-lg text-sm max-w-full">
                      <div className="text-gray-600 text-xs mb-1">
                        ตอบกลับ {message.replyTo.sender?.displayName}
                      </div>
                      <div className="text-gray-800 truncate">
                        {message.replyTo.content}
                      </div>
                    </div>
                  )}

                  {/* Message Content */}
                  <div
                    className={`relative px-4 py-2 rounded-2xl max-w-full break-words group ${
                      isOwnMessage
                        ? 'bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-br-md'
                        : 'bg-white text-gray-900 rounded-bl-md shadow-sm border border-gray-200'
                    }`}
                  >
                    {/* Message Text */}
                    {message.content && (
                      <div className="text-sm leading-relaxed">
                        {message.content}
                      </div>
                    )}

                    {/* Message Image */}
                    {message.image && (
                      <div className="mt-2">
                        <img 
                          src={message.image} 
                          alt="Message attachment" 
                          className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(message.image, '_blank')}
                        />
                      </div>
                    )}

                    {/* Edited indicator */}
                    {message.isEdited && (
                      <div className="text-xs opacity-70 mt-1">
                        แก้ไขแล้ว
                      </div>
                    )}

                    {/* Message Actions */}
                    <div className={`absolute ${isOwnMessage ? '-left-12' : '-right-12'} top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1`}>
                      <button
                        onClick={() => setReplyTo(message)}
                        className="p-1 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
                        title="ตอบกลับ"
                      >
                        <Reply className="h-3 w-3 text-gray-600" />
                      </button>
                      <button
                        className="p-1 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
                        title="ไลค์"
                      >
                        <Heart className="h-3 w-3 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  {/* Message Time */}
                  <div className={`text-xs text-gray-500 mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                    {formatTime(message.createdAt)}
                  </div>
                </div>

                {/* Avatar for sent messages */}
                {isOwnMessage && (
                  <div className="flex-shrink-0">
                    {showAvatar ? (
                      <Avatar className="w-8 h-8">
                        <AvatarImage 
                          src={getProfileImageUrl(currentUser.profileImages?.[0], currentUser._id)} 
                          alt={currentUser.displayName} 
                        />
                        <AvatarFallback className="bg-gradient-to-r from-pink-400 to-violet-400 text-white text-xs">
                          {currentUser.displayName?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-8 h-8" /> // Spacer
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start items-end space-x-2">
            <Avatar className="w-8 h-8">
              <AvatarImage 
                src={getProfileImageUrl(otherUser?.profileImages?.[0], otherUser?._id)} 
                alt="Typing" 
              />
              <AvatarFallback className="bg-gradient-to-r from-pink-400 to-violet-400 text-white text-xs">
                {otherUser?.displayName?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="bg-white rounded-2xl rounded-bl-md px-4 py-2 shadow-sm border border-gray-200">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyTo && (
        <div className="px-4 py-2 bg-gray-100 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-xs text-gray-600 mb-1">
                ตอบกลับ {replyTo.sender?.displayName}
              </div>
              <div className="text-sm text-gray-800 truncate">
                {replyTo.content}
              </div>
            </div>
            <button
              onClick={() => setReplyTo(null)}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>
      )}

      {/* Image Preview */}
      {showImageUpload && selectedImage && (
        <div className="px-4 py-2 bg-gray-100 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src={selectedImage} 
                alt="Preview" 
                className="w-12 h-12 object-cover rounded-lg"
              />
              <span className="text-sm text-gray-700">รูปภาพที่เลือก</span>
            </div>
            <button
              onClick={() => {
                setSelectedImage(null);
                setShowImageUpload(false);
              }}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="พิมพ์ข้อความ..."
              className="pr-12 resize-none"
              rows={1}
            />
            
            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 mb-2 p-3 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="grid grid-cols-6 gap-2">
                  {emojis.map((emoji, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setNewMessage(prev => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Smile className="h-5 w-5 text-gray-600" />
            </button>
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Paperclip className="h-5 w-5 text-gray-600" />
            </button>
            
            <Button
              type="submit"
              disabled={!newMessage.trim() && !selectedImage}
              className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white px-4 py-2 rounded-full"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
        </form>
      </div>
    </div>
  );
};

export default PrivateChat;

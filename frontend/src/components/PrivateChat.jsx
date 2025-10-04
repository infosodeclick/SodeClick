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
  // console.log('PrivateChat loaded with:', { isLoading });
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [imageModal, setImageModal] = useState({ show: false, src: '', alt: '' });
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // ฟังก์ชันจัดการการกดปุ่ม
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter = เพิ่มบรรทัดใหม่
        e.preventDefault();
        const cursorPosition = e.target.selectionStart;
        const newValue = newMessage.slice(0, cursorPosition) + '\n' + newMessage.slice(cursorPosition);
        setNewMessage(newValue);
        
        // ตั้งค่า cursor position หลังบรรทัดใหม่
        setTimeout(() => {
          e.target.selectionStart = e.target.selectionEnd = cursorPosition + 1;
          // ปรับขนาด textarea ให้พอดีกับเนื้อหา
          autoResizeTextarea(e.target);
        }, 0);
      } else {
        // Enter ธรรมดา = ส่งข้อความ
        e.preventDefault();
        if (newMessage.trim()) {
          handleSendMessage(e);
        }
      }
    }
  };

  // ฟังก์ชันปรับขนาด textarea อัตโนมัติ
  const autoResizeTextarea = (textarea) => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  // ฟังก์ชันจัดการการวางรูปภาพ
  const handlePaste = async (e) => {
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        
        const file = item.getAsFile();
        if (file) {
          console.log('📋 Image pasted from clipboard:', file.name || 'clipboard-image');
          
          // ตรวจสอบขนาดไฟล์ (จำกัด 5MB)
          if (file.size > 5 * 1024 * 1024) {
            if (onSendMessage && typeof onSendMessage === 'function') {
              onSendMessage('notification', {
                type: 'error',
                title: 'ไฟล์ใหญ่เกินไป',
                message: 'รูปภาพใหญ่เกินไป กรุณาเลือกรูปที่เล็กกว่า 5MB'
              });
            }
            return;
          }
          
          // ตรวจสอบประเภทไฟล์
          if (!file.type.startsWith('image/')) {
            if (onSendMessage && typeof onSendMessage === 'function') {
              onSendMessage('notification', {
                type: 'error',
                title: 'ประเภทไฟล์ไม่ถูกต้อง',
                message: 'กรุณาวางเฉพาะรูปภาพเท่านั้น'
              });
            }
            return;
          }
          
          // แสดง preview รูปภาพ
          const reader = new FileReader();
          reader.onload = (event) => {
            setSelectedImage({
              file: file,
              preview: event.target.result,
              name: file.name || 'clipboard-image.png'
            });
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  // ฟังก์ชันสำหรับการ react ต่อข้อความ
  const handleReactToMessage = async (messageId, reactionType = 'heart') => {
    try {
      console.log('💖 Reacting to message:', messageId, 'with type:', reactionType);
      console.log('💖 Current user:', currentUser);
      
      // ตรวจสอบว่า currentUser และ _id มีอยู่
      if (!currentUser || (!currentUser._id && !currentUser.id)) {
        console.error('❌ No current user or user ID available');
        return;
      }
      
      const userId = currentUser._id || currentUser.id;
      console.log('💖 Using user ID:', userId);

      // Optimistic UI update - อัปเดต UI ทันที
      const currentMessage = messages.find(msg => msg._id === messageId);
      if (currentMessage) {
        const hasLiked = hasUserLiked(currentMessage);
        const newReactions = hasLiked 
          ? (currentMessage.reactions || []).filter(r => !(r.user === userId || r.user._id === userId) || r.type !== 'heart')
          : [...(currentMessage.reactions || []), { user: userId, type: 'heart' }];
        
        // อัปเดต UI ทันที
        if (onSendMessage && typeof onSendMessage === 'function') {
          onSendMessage({
            type: 'reaction-updated',
            messageId: messageId,
            reactions: newReactions,
            chatRoomId: selectedChat.id
          });
        }
      }
      
      // ดึง token จาก sessionStorage
      const token = sessionStorage.getItem('token');
      console.log('💖 Token available:', !!token);
      
      if (!token) {
        console.error('❌ No access token available');
        if (onSendMessage && typeof onSendMessage === 'function') {
          onSendMessage('notification', {
            type: 'error',
            title: 'ไม่สามารถกดหัวใจได้',
            message: 'กรุณาเข้าสู่ระบบใหม่'
          });
        }
        return;
      }
      
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/messages/${messageId}/react`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            reactionType: reactionType
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Reaction successful:', data);
        
        // อัปเดตข้อความใน local state ถ้าจำเป็น
        // หรือให้ parent component จัดการ
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to react to message:', response.status, errorData);
        
        // จัดการ error ตาม status code
        if (response.status === 401) {
          console.error('❌ Unauthorized - token may be expired');
          // ลบ token เก่าและ redirect ไป login
          sessionStorage.removeItem('token');
          if (onSendMessage && typeof onSendMessage === 'function') {
            onSendMessage('notification', {
              type: 'error',
              title: 'เซสชันหมดอายุ',
              message: 'กรุณาเข้าสู่ระบบใหม่'
            });
          }
        } else if (response.status === 403) {
          if (onSendMessage && typeof onSendMessage === 'function') {
            onSendMessage('notification', {
              type: 'error',
              title: 'ไม่มีสิทธิ์',
              message: 'คุณไม่มีสิทธิ์ในการกดหัวใจข้อความนี้'
            });
          }
        } else {
          // แสดง error message ทั่วไป
          if (onSendMessage && typeof onSendMessage === 'function') {
            onSendMessage('notification', {
              type: 'error',
              title: 'ไม่สามารถกดหัวใจได้',
              message: errorData.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่'
            });
          }
        }
      }
    } catch (error) {
      console.error('❌ Error reacting to message:', error);
      
      // แสดง error message ให้ผู้ใช้
      if (onSendMessage && typeof onSendMessage === 'function') {
        onSendMessage('notification', {
          type: 'error',
          title: 'ไม่สามารถกดหัวใจได้',
          message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่'
        });
      }
    }
  };

  // ฟังก์ชันตรวจสอบว่าผู้ใช้เคยกด like แล้วหรือไม่
  const hasUserLiked = (message) => {
    if (!message.reactions || !currentUser) return false;
    const userId = currentUser._id || currentUser.id;
    if (!userId) return false;
    
    return message.reactions.some(
      reaction => (reaction.user === userId || reaction.user._id === userId) && reaction.type === 'heart'
    );
  };

  // ฟังก์ชันนับจำนวน likes
  const getLikeCount = (message) => {
    if (!message.reactions) return 0;
    return message.reactions.filter(reaction => reaction.type === 'heart').length;
  };

  // Lock scroll when image modal is open
  useEffect(() => {
    if (imageModal.show) {
      // Lock scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      // Unlock scroll
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [imageModal.show]);

  // Socket.IO listener สำหรับการอัปเดต reactions
  useEffect(() => {
    const handleReactionUpdate = (data) => {
      console.log('💖 PrivateChat - Reaction update received:', data);
      
      // อัปเดตข้อความที่เกี่ยวข้อง
      // ให้ parent component จัดการการอัปเดต messages
      if (onSendMessage && typeof onSendMessage === 'function') {
        // ส่ง event กลับไปให้ parent component เพื่ออัปเดต messages
        onSendMessage({
          type: 'reaction-updated',
          messageId: data.messageId,
          reactions: data.reactions,
          chatRoomId: data.chatRoomId
        });
      }
    };

    // ตั้งค่า Socket.IO listener
    const setupSocketListener = () => {
      if (window.socketManager && window.socketManager.socket && window.socketManager.socket.connected) {
        console.log('🔌 PrivateChat - Setting up reaction listener');
        window.socketManager.socket.on('message-reaction-updated', handleReactionUpdate);
        return true;
      } else {
        console.log('⚠️ PrivateChat - Socket not ready, will retry...');
        return false;
      }
    };

    // ลองตั้งค่า listener
    if (!setupSocketListener()) {
      // ถ้ายังไม่ได้ ลองใหม่ใน 1 วินาที
      const retryTimeout = setTimeout(() => {
        setupSocketListener();
      }, 1000);

      return () => {
        clearTimeout(retryTimeout);
        if (window.socketManager && window.socketManager.socket) {
          window.socketManager.socket.off('message-reaction-updated', handleReactionUpdate);
        }
      };
    }

    // Cleanup
    return () => {
      if (window.socketManager && window.socketManager.socket) {
        window.socketManager.socket.off('message-reaction-updated', handleReactionUpdate);
      }
    };
  }, [onSendMessage]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      console.log('🔍 PrivateChat - Auto scrolling to bottom on messages change:', messages.length);
      // ใช้ setTimeout เพื่อให้ DOM render เสร็จก่อน
      setTimeout(() => {
        scrollToBottom();
      }, 300);
    }
  }, [messages.length]);

  // Auto scroll to bottom when entering a chat room for the first time
  useEffect(() => {
    if (selectedChat?.id && messages.length > 0) {
      console.log('🔍 PrivateChat - Auto scrolling to bottom on chat entry:', selectedChat.id);
      // ใช้ setTimeout เพื่อให้ DOM render เสร็จก่อน
      setTimeout(() => {
        scrollToBottom();
      }, 500);
    }
  }, [selectedChat?.id]);

  // Auto scroll to bottom when component mounts with messages
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      console.log('🔍 PrivateChat - Auto scrolling to bottom on component mount:', messages.length);
      // ใช้ setTimeout เพื่อให้ DOM render เสร็จก่อน
      setTimeout(() => {
        scrollToBottom();
      }, 500);
    }
  }, [messagesEndRef.current, messages.length]);

  // Setup socket listeners for real-time messaging
  useEffect(() => {
    if (!selectedChat?.id || !currentUser?._id) return;

    console.log('🔌 PrivateChat useEffect - Setting up for chat:', selectedChat.id);

    let retryIntervalId = null;
    let hasSetupListeners = false;

    const setupSocketAndJoin = () => {
      if (!window.socketManager?.socket) {
        console.log('⚠️ Socket manager not available yet');
        return false;
      }

      const socket = window.socketManager.socket;
      console.log('🔌 PrivateChat Socket state:', {
        id: socket.id,
        connected: socket.connected,
        chatId: selectedChat.id
      });

      // ถ้า socket ไม่เชื่อมต่อ ให้ reconnect
      if (!socket.connected) {
        console.log('🔄 Socket not connected, attempting to connect...');
        socket.connect();
        return false; // รอให้เชื่อมต่อก่อน
      }

      // เข้าร่วมห้องแชทส่วนตัว
      const token = sessionStorage.getItem('token');
      const joinData = {
        roomId: selectedChat.id,
        userId: currentUser._id,
        token
      };

      console.log('🚪 Joining private chat room:', selectedChat.id);
      socket.emit('join-room', joinData);

      return true;
    };

    const setupListeners = () => {
      if (!window.socketManager?.socket) return false;
      if (hasSetupListeners) return true;

      const socket = window.socketManager.socket;

      // เมื่อ socket reconnect ให้ rejoin room อัตโนมัติ
      socket.on('connect', () => {
        console.log('🔄 PrivateChat Socket reconnected:', socket.id);
        const token = sessionStorage.getItem('token');
        console.log('🚪 Re-joining private chat room after reconnect:', selectedChat.id);
        socket.emit('join-room', {
          roomId: selectedChat.id,
          userId: currentUser._id,
          token
        });
      });

      // ฟังข้อความใหม่ - ประมวลผลทันที
      socket.on('new-message', (message) => {
        console.log('📨 PrivateChat - New message received:', message);
        
        // ตรวจสอบว่าเป็นข้อความสำหรับแชทปัจจุบันหรือไม่
        if (message.chatRoom === selectedChat.id) {
          console.log('✅ Message for current private chat');
          
          // ส่ง custom event ไปยัง App.tsx เพื่ออัปเดต state ทันที
          window.dispatchEvent(new CustomEvent('private-chat-message', {
            detail: {
              message,
              chatId: selectedChat.id,
              messageType: 'socket-message'
            }
          }));

          // Scroll ไปยังข้อความล่าสุดเสมอเมื่อรับข้อความใหม่
          scrollToBottomAlways();
        } else {
          console.log('⏭️ Message for different chat:', message.chatRoom);
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
        console.warn('⚠️ PrivateChat Socket error:', error);
      });

      // จัดการ rate limiting สำหรับการส่งข้อความ
      socket.on('message-rate-limited', (data) => {
        console.warn('⚠️ PrivateChat Message rate limited:', data);
        // แสดงข้อความเตือนให้ผู้ใช้
        if (onSendMessage && typeof onSendMessage === 'function') {
          // ส่ง notification กลับไปให้ parent component
          onSendMessage('notification', {
            type: 'warning',
            title: 'ส่งข้อความเร็วเกินไป',
            message: data.message || 'กรุณารอสักครู่แล้วลองใหม่'
          });
        }
      });

      hasSetupListeners = true;
      console.log('✅ PrivateChat listeners setup complete');
      return true;
    };

    // ลอง setup ทันที
    let success = setupSocketAndJoin();
    
    if (success) {
      // ถ้า join สำเร็จ ให้ setup listeners
      setupListeners();
    } else {
      // ถ้าไม่สำเร็จ ลองใหม่
      console.log('⏰ Setup failed, retrying every 500ms...');
      retryIntervalId = setInterval(() => {
        const joinSuccess = setupSocketAndJoin();
        if (joinSuccess && !hasSetupListeners) {
          console.log('✅ Setup successful on retry');
          setupListeners();
          clearInterval(retryIntervalId);
        }
      }, 500);

      // หยุดหลัง 10 วินาที
      setTimeout(() => {
        if (retryIntervalId) {
          clearInterval(retryIntervalId);
          console.log('⏹️ Stopped retrying');
        }
      }, 10000);
    }

    // Cleanup
    return () => {
      // Cleanup retry interval
      if (retryIntervalId) {
        clearInterval(retryIntervalId);
      }

      if (window.socketManager && window.socketManager.socket) {
        const socket = window.socketManager.socket;
        console.log('🧹 Cleaning up PrivateChat socket listeners');
        socket.off('connect');
        socket.off('new-message');
        socket.off('message-saved');
        socket.off('error');
        
        // Leave room เมื่อ unmount
        if (socket.connected) {
          socket.emit('leave-room', { roomId: selectedChat.id, userId: currentUser._id });
        }
      }
    };
  }, [selectedChat?.id, currentUser?._id]);

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
  }, [newMessage, onTyping, onStopTyping]);

  // ปรับขนาด textarea เมื่อ newMessage เปลี่ยน
  useEffect(() => {
    const textarea = document.querySelector('textarea[placeholder*="พิมพ์ข้อความ"]');
    if (textarea) {
      autoResizeTextarea(textarea);
    }
  }, [newMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ฟังก์ชันสำหรับ scroll ไปยังข้อความล่าสุดเสมอ (ใช้เมื่อส่งข้อความ)
  const scrollToBottomAlways = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedImage) return;

    const messageData = {
      content: newMessage.trim(),
      replyTo: replyTo?._id || null,
      image: selectedImage
    };

    // สร้างข้อความชั่วคราวเพื่อแสดงทันที
    const tempMessage = {
      _id: `temp-${Date.now()}`,
      content: messageData.content,
      sender: {
        _id: currentUser._id,
        displayName: currentUser.displayName,
        username: currentUser.username,
        profileImages: currentUser.profileImages
      },
      chatRoom: selectedChat.id,
      messageType: selectedImage ? 'image' : 'text',
      image: selectedImage,
      createdAt: new Date().toISOString(),
      isTemporary: true
    };

    // ส่ง custom event เพื่อเพิ่มข้อความชั่วคราว
    window.dispatchEvent(new CustomEvent('private-chat-message', {
      detail: {
        message: tempMessage,
        chatId: selectedChat.id,
        messageType: 'temp-message'
      }
    }));

    // Scroll ไปยังข้อความล่าสุดเสมอเมื่อส่งข้อความ
    scrollToBottomAlways();

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
        const socketMessage = {
          content: messageData.content,
          senderId: currentUser._id,
          chatRoomId: selectedChat.id,
          messageType: selectedImage ? 'image' : 'text',
          replyToId: messageData.replyTo
        };

        // ถ้ามีรูปภาพ ให้เพิ่มข้อมูลรูปภาพ
        if (selectedImage) {
          socketMessage.imageUrl = selectedImage;
          socketMessage.fileType = 'image';
          socketMessage.fileName = 'image.jpg';
        }

        window.socketManager.socket.emit('send-message', socketMessage);
      } else {
        // ถ้า socket ไม่พร้อม ให้ใช้ HTTP API แทน
        if (onSendMessage) {
          await onSendMessage(messageData);
        } else {
          throw new Error('No send method available');
        }
      }
      
    } catch (error) {
      // ถ้าส่งไม่สำเร็จ ให้คืนค่ากลับ
      setNewMessage(currentMessage);
      setReplyTo(currentReplyTo);
      setSelectedImage(currentImage);
      setShowImageUpload(!!currentImage);
      
      // ลบข้อความชั่วคราว
      window.dispatchEvent(new CustomEvent('private-chat-message', {
        detail: {
          message: { _id: tempMessage._id },
          chatId: selectedChat.id,
          messageType: 'remove-temp-message'
        }
      }));
      
      // แสดงข้อผิดพลาดให้ผู้ใช้
      if (onSendMessage && typeof onSendMessage === 'function') {
        onSendMessage('notification', {
          type: 'error',
          title: 'ส่งข้อความไม่สำเร็จ',
          message: 'ไม่สามารถส่งข้อความได้ กรุณาลองใหม่อีกครั้ง'
        });
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
      // console.warn('Invalid timestamp:', timestamp);
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
    <div className="flex flex-col bg-white" style={{ height: '93%' }}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white flex-shrink-0">
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 relative z-10 min-h-0">
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
                    {(message.image || message.fileUrl) && (
                      <div className="mt-2">
                        <img 
                          src={message.image || message.fileUrl} 
                          alt="Message attachment" 
                          className="max-w-[200px] max-h-[250px] w-auto h-auto object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setImageModal({
                            show: true,
                            src: message.image || message.fileUrl,
                            alt: 'Message attachment'
                          })}
                        />
                      </div>
                    )}

                    {/* Message Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {message.attachments.map((attachment, index) => (
                          <div key={index}>
                            {attachment.type === 'image' && (
                              <img 
                                src={attachment.url} 
                                alt="Message attachment" 
                                className="max-w-[200px] max-h-[250px] w-auto h-auto object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setImageModal({
                                  show: true,
                                  src: attachment.url,
                                  alt: 'Message attachment'
                                })}
                              />
                            )}
                            {attachment.type !== 'image' && (
                              <div className="p-2 bg-gray-100 rounded-lg">
                                <div className="text-sm text-gray-600">
                                  📎 {attachment.filename || 'Attachment'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : ''}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
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
                        onClick={() => handleReactToMessage(message._id, 'heart')}
                        className={`p-1 rounded-full shadow-md transition-colors ${
                          hasUserLiked(message) 
                            ? 'bg-red-50 hover:bg-red-100' 
                            : 'bg-white hover:bg-gray-50'
                        }`}
                        title={hasUserLiked(message) ? 'กดเพื่อยกเลิกหัวใจ' : 'กดไลค์'}
                      >
                        <Heart className={`h-3 w-3 ${
                          hasUserLiked(message) 
                            ? 'fill-current text-red-600' 
                            : 'text-gray-600'
                        }`} />
                        {getLikeCount(message) > 0 && (
                          <span className="ml-1 text-xs text-gray-600">({getLikeCount(message)})</span>
                        )}
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
      <div className="p-3 border-t border-gray-200 bg-white flex-shrink-0 z-50 shadow-lg">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e)}
              onPaste={(e) => handlePaste(e)}
              placeholder="พิมพ์ข้อความ"
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base sm:text-sm text-gray-900 ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-12 resize-none min-h-[40px] max-h-[120px]"
              rows={1}
              style={{ 
                resize: 'none',
                overflow: 'hidden',
                minHeight: '40px',
                maxHeight: '120px'
              }}
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
          <div className="flex items-center space-x-1" style={{ position: 'relative', zIndex: 50 }}>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              style={{ position: 'relative', zIndex: 51 }}
            >
              <Smile className="h-5 w-5 text-gray-600" />
            </button>
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              style={{ position: 'relative', zIndex: 51 }}
            >
              <Paperclip className="h-5 w-5 text-gray-600" />
            </button>
            
            <Button
              type="submit"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (newMessage.trim() || selectedImage) {
                  handleSendMessage(e);
                }
              }}
              className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white px-4 py-2 rounded-full"
              style={{ 
                position: 'relative', 
                zIndex: 100, 
                pointerEvents: 'auto',
                cursor: 'pointer'
              }}
            >
              <Send className="h-4 w-4" style={{ pointerEvents: 'none' }} />
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

      {/* Image Modal - Responsive */}
      {imageModal.show && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-[9999] overflow-hidden"
          onClick={() => setImageModal({ show: false, src: '', alt: '' })}
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '20px', // ใกล้ header มากที่สุด
            paddingBottom: '100px' // เว้นระยะจาก footer/navigation bar
          }}
        >
          <div className="relative flex items-start justify-center w-full h-full pt-2">
            <img
              src={imageModal.src}
              alt={imageModal.alt}
              className="w-auto h-auto object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '85vw',
                maxHeight: 'calc(100vh - 120px)', // ลบ padding top และ bottom
                width: 'auto',
                height: 'auto',
                objectFit: 'contain'
              }}
            />
            <button
              onClick={() => setImageModal({ show: false, src: '', alt: '' })}
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-colors z-10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivateChat;

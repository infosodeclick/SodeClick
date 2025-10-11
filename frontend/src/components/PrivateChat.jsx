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
  MessageCircle,
  Shield,
  Award,
  Star,
  Crown,
  Diamond,
  Gem
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
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const getMembershipIcon = (tier) => {
    const iconProps = { className: "w-4 h-4" };
    
    switch (tier) {
      case 'member':
        return <Shield {...iconProps} className="w-4 h-4 text-gray-600" />;
      case 'silver':
        return <Award {...iconProps} className="w-4 h-4 text-slate-600" />;
      case 'gold':
        return <Star {...iconProps} className="w-4 h-4 text-amber-600" />;
      case 'vip':
        return <Crown {...iconProps} className="w-4 h-4 text-purple-600" />;
      case 'vip1':
        return <Crown {...iconProps} className="w-4 h-4 text-purple-700" />;
      case 'vip2':
        return <Crown {...iconProps} className="w-4 h-4 text-purple-800" />;
      case 'diamond':
        return <Diamond {...iconProps} className="w-4 h-4 text-blue-600" />;
      case 'platinum':
        return <Gem {...iconProps} className="w-4 h-4 text-indigo-600" />;
      default:
        return <Shield {...iconProps} className="w-4 h-4 text-gray-600" />;
    }
  };

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
      
      // ดึง token จาก localStorage
      const token = localStorage.getItem('token');
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
          localStorage.removeItem('token');
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
      const token = localStorage.getItem('token');
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
        
        // ตั้งค่า flag เพื่อป้องกันการแจ้งเตือนซ้ำ
        window.isAutoReconnecting = true;
        
        const token = localStorage.getItem('token');
        console.log('🚪 Re-joining private chat room after reconnect:', selectedChat.id);
        console.log('🔔 PrivateChat: Joining room for notifications:', {
          roomId: selectedChat.id,
          userId: currentUser._id,
          socketId: socket.id,
          connected: socket.connected
        });
        
        socket.emit('join-room', {
          roomId: selectedChat.id,
          userId: currentUser._id,
          token
        });
        
        console.log('🔔 PrivateChat: Join room event emitted');
        
        // ลบ flag หลังจาก 3 วินาที
        setTimeout(() => {
          window.isAutoReconnecting = false;
        }, 3000);
      });

      // ฟังข้อความใหม่ - ประมวลผลทันที
      socket.on('new-message', (message) => {
        console.log('📨 PrivateChat - New message received:', message);
        console.log('📨 PrivateChat - Current chat ID:', selectedChat.id);
        console.log('📨 PrivateChat - Message chat room:', message.chatRoom);
        console.log('📨 PrivateChat - Message match:', message.chatRoom === selectedChat.id);
        console.log('📨 PrivateChat - Message sender:', message.sender?._id, 'Current user:', currentUser._id);
        
        // ตรวจสอบว่าเป็นข้อความสำหรับแชทปัจจุบันหรือไม่
        if (message.chatRoom === selectedChat.id) {
          // ⚡ IMPORTANT: ถ้าข้อความนี้เป็นของตัวเอง ให้ skip ไม่ต้องส่ง custom event
          // เพราะเพิ่มไปแล้วตอนส่งข้อความผ่าน API response
          const messageSenderId = message.sender?._id || message.senderId;
          const currentUserId = currentUser._id || currentUser.id;
          
          if (messageSenderId === currentUserId) {
            console.log('⏭️ PrivateChat - Skipping own message from socket (already added via API response)');
            return;
          }
          
          console.log('✅ Message for current private chat - updating UI immediately');
          
          // อัปเดต UI ทันทีผ่าน custom event (ไม่ใช้ setMessages)
          console.log('✅ Message for current private chat - updating UI immediately via custom event');

          // ส่ง custom event ไปยัง App.tsx เพื่ออัปเดต state
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
          console.log('⏭️ Message for different chat:', message.chatRoom, 'vs current:', selectedChat.id);
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
    if (isSendingMessage || uploadingImage) return;

    setIsSendingMessage(true);

    const messageData = {
      content: newMessage.trim(),
      replyTo: replyTo?._id || null,
      image: selectedImage
    };

    // ส่งข้อความไปยัง handleSendPrivateMessage เพื่อสร้างข้อความชั่วคราวและอัปเดต UI
    console.log('🔔 PrivateChat: Sending message to handleSendPrivateMessage');
    
    if (onSendMessage) {
      console.log('🔔 PrivateChat: Calling onSendMessage');
      await onSendMessage(messageData);
    } else {
      console.error('❌ No send method available - onSendMessage is not provided');
      throw new Error('No send method available');
    }

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
      // handleSendPrivateMessage จะจัดการการส่งข้อความทั้งหมด
      console.log('🔔 PrivateChat: Message sent successfully');
      
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
    } finally {
      setIsSendingMessage(false);
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
    <div className="flex flex-col bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden" style={{ height: '93%' }}>
      {/* Modern Chat Header - Professional Design */}
      <div className="flex items-center justify-between p-4 sm:p-5 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex-shrink-0">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-white/10 rounded-xl transition-all duration-200 min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          {/* User Info */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Avatar className="w-10 h-10 sm:w-12 sm:h-12 ring-2 ring-white shadow-md">
                <AvatarImage
                  src={getProfileImageUrl(otherUser?.profileImages?.[0], otherUser?._id)}
                  alt={otherUser?.displayName}
                />
                <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-600 text-white text-base sm:text-lg font-semibold">
                  {otherUser?.displayName?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>

              {/* Online Status */}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-green-500 rounded-full border-2 border-white"></div>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-bold text-base sm:text-lg md:text-xl leading-tight">
                  {otherUser?.displayName || otherUser?.firstName + ' ' + otherUser?.lastName || 'Unknown User'}
                </h3>
                <Badge className={`text-xs ${getMembershipBadgeColor(otherUser?.membershipTier)}`}>
                  {membershipHelpers.getTierDisplayName(otherUser?.membershipTier || 'member')}
                </Badge>
              </div>
              <p className="text-sm text-white/80">
                {isTyping ? 'กำลังพิมพ์...' : 'แชทส่วนตัว'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button className="p-2 hover:bg-white/10 rounded-xl transition-all duration-200 min-h-[40px] min-w-[40px]">
            <MoreVertical className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </button>
        </div>
      </div>

      {/* Modern Messages Area - Professional Thread Design */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 bg-gradient-to-b from-gray-50/50 to-white/50 relative z-10 min-h-0">
        {messages.map((message, index) => {
          const isOwnMessage = message.sender?._id === currentUser._id;
          const prevMessage = messages[index - 1];
          const nextMessage = messages[index + 1];
          const isGrouped = prevMessage &&
            prevMessage.sender &&
            message.sender &&
            prevMessage.sender._id === message.sender._id &&
            (new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime()) < 5 * 60 * 1000; // 5 minutes

          return (
            <div
              key={message._id}
              className={`group transition-all duration-200 ${
                isOwnMessage ? 'flex justify-end' : 'flex justify-start'
              } ${isGrouped ? 'mt-1' : 'mt-4 sm:mt-6'}`}
            >
              <div className={`flex max-w-[85%] sm:max-w-[75%] md:max-w-[60%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2 sm:space-x-3`}>
                {/* Avatar - Show only for non-grouped messages or different senders */}
                {(!isGrouped || !isOwnMessage) && (
                  <Avatar className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 ring-2 ring-white shadow-md">
                    {message.sender ? (
                      <>
                        <AvatarImage
                          src={getProfileImageUrl(message.sender?.profileImages?.[0], message.sender?._id)}
                          alt={message.sender?.displayName}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-600 text-white text-sm font-semibold">
                          {message.sender?.displayName?.charAt(0) || '?'}
                        </AvatarFallback>
                      </>
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-600 text-white text-sm font-semibold">
                        ?
                      </AvatarFallback>
                    )}
                  </Avatar>
                )}

                {/* Message Content */}
                <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                  {/* Sender Name - Show only for non-grouped messages */}
                  {(!isGrouped || !isOwnMessage) && message.sender && (
                    <div className={`flex items-center space-x-2 mb-1 ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <span className="text-xs sm:text-sm font-medium text-gray-700">
                        {message.sender?.displayName || message.sender?.username}
                      </span>
                      <div className="flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white shadow-sm border">
                        {getMembershipIcon(message.sender.membershipTier || 'member')}
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatTime(message.createdAt)}
                      </span>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className={`relative max-w-full ${isOwnMessage ? 'ml-auto' : 'mr-auto'}`}>
                    <div className={`inline-block rounded-2xl px-4 py-3 max-w-full break-words shadow-sm ${
                      isOwnMessage
                        ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white rounded-br-md'
                        : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md'
                    }`}>
                      {/* Reply To */}
                      {message.replyTo && (
                        <div className="mb-2 p-2 bg-gray-100 rounded-lg text-sm max-w-full">
                          <div className="text-gray-600 text-xs mb-1">
                            ตอบกลับ {message.replyTo.sender?.displayName}
                          </div>
                          <div className="text-gray-800 truncate text-xs sm:text-sm">
                            {message.replyTo.content}
                          </div>
                        </div>
                      )}

                      {/* Message Content */}
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
                            className="max-w-[180px] sm:max-w-[200px] max-h-[220px] sm:max-h-[250px] w-auto h-auto object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
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
                                  className="max-w-[180px] sm:max-w-[200px] max-h-[220px] sm:max-h-[250px] w-auto h-auto object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
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
                        <div className={`text-xs opacity-70 mt-1 ${isOwnMessage ? 'text-white/70' : 'text-gray-500'}`}>
                          แก้ไขแล้ว
                        </div>
                      )}
                    </div>

                    {/* Message Actions - Show on hover */}
                    <div className={`absolute ${isOwnMessage ? '-left-12' : '-right-12'} top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center space-x-1`}>
                      {/* Reply Button */}
                      <button
                        onClick={() => setReplyTo(message)}
                        className="flex items-center space-x-1 text-xs text-gray-600 hover:text-blue-500 transition-colors rounded-full px-2 py-1 min-h-[32px]"
                        title="ตอบกลับ"
                      >
                        <Reply className="h-3 w-3" />
                      </button>

                      {/* Like Button */}
                      <button
                        onClick={() => handleReactToMessage(message._id, 'heart')}
                        className={`flex items-center space-x-1 text-xs transition-all duration-200 rounded-full px-2 py-1 min-h-[32px] ${
                          hasUserLiked(message)
                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                        }`}
                        title={hasUserLiked(message) ? 'ยกเลิกหัวใจ' : 'หัวใจ'}
                      >
                        <Heart className={`h-3 w-3 ${hasUserLiked(message) ? 'fill-current' : ''}`} />
                        {getLikeCount(message) > 0 && <span>{getLikeCount(message)}</span>}
                      </button>
                    </div>
                  </div>

                  {/* Timestamp - Show only for grouped messages */}
                  {isGrouped && message.sender && (
                    <div className={`text-xs text-gray-500 mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                      {formatTime(message.createdAt)}
                    </div>
                  )}
                </div>
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

      {/* Modern Input Area - Professional Design */}
      <div className="p-3 sm:p-4 bg-white/80 backdrop-blur-sm border-t border-gray-200/50 flex-shrink-0 z-50 shadow-2xl">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2 sm:space-x-3">
          {/* Message Input */}
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e)}
              onPaste={(e) => handlePaste(e)}
              placeholder="พิมพ์ข้อความ..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm sm:text-base resize-none min-h-[48px] max-h-[120px] bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200"
              rows={1}
              style={{
                resize: 'none',
                overflow: 'hidden',
                minHeight: '48px',
                maxHeight: '120px'
              }}
            />

            {/* Modern Emoji Picker */}
            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-2 bg-white border-2 border-gray-200 rounded-2xl shadow-2xl p-3 z-10 max-h-52 overflow-y-auto">
                <div className="grid grid-cols-6 gap-2">
                  {emojis.map((emoji, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setNewMessage(prev => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="w-10 h-10 text-lg hover:bg-gray-100 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110 min-h-[40px] min-w-[40px]"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-end space-x-2">
            {/* Image Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 p-2 sm:p-2.5 min-h-[44px] min-w-[44px] rounded-xl transition-all duration-200"
              title="เพิ่มรูปภาพ"
            >
              <Paperclip className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>

            {/* Emoji Button */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 p-2 sm:p-2.5 min-h-[44px] min-w-[44px] rounded-xl transition-all duration-200"
              title="เพิ่มอีโมจิ"
            >
              <Smile className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>

            {/* Modern Send Button */}
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (newMessage.trim() || selectedImage) {
                  handleSendMessage(e);
                }
              }}
              disabled={!newMessage.trim() && !selectedImage}
              className={`min-w-[48px] min-h-[48px] rounded-xl border-none outline-none flex items-center justify-center font-semibold transition-all duration-200 flex-shrink-0 shadow-lg ${
                newMessage.trim() || selectedImage
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 hover:shadow-xl transform hover:scale-105'
                  : 'bg-gray-300 cursor-not-allowed opacity-50'
              }`}
              title={
                isSendingMessage ? 'กำลังส่งข้อความ...' :
                uploadingImage ? 'กำลังอัปโหลดรูปภาพ...' :
                !newMessage.trim() && !selectedImage ? 'กรุณาพิมพ์ข้อความ' : 'ส่งข้อความ'
              }
            >
              {isSendingMessage ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Send className="h-5 w-5 text-white" />
              )}
            </Button>
          </div>
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
            paddingTop: '16px', // ใกล้ header มากที่สุดสำหรับ mobile
            paddingBottom: '80px' // เว้นระยะจาก footer/navigation bar สำหรับ mobile
          }}
        >
          <div className="relative flex items-start justify-center w-full h-full pt-1 sm:pt-2">
            <img
              src={imageModal.src}
              alt={imageModal.alt}
              className="w-auto h-auto object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '90vw',
                maxHeight: 'calc(100vh - 96px)', // ลบ padding top และ bottom สำหรับ mobile
                width: 'auto',
                height: 'auto',
                objectFit: 'contain'
              }}
            />
            <button
              onClick={() => setImageModal({ show: false, src: '', alt: '' })}
              className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 sm:p-2 shadow-lg transition-colors z-10 min-h-[32px] min-w-[32px] sm:min-h-[36px] sm:min-w-[36px]"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivateChat;

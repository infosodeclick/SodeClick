import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import MediaPreview from './MediaPreview';
import YouTubePreview from './YouTubePreview';
import { separateYouTubeFromText } from '../utils/linkUtils';
import { membershipHelpers } from '../services/membershipAPI';
import { getProfileImageUrl } from '../utils/profileImageUtils';
import autoRefreshManager from '../services/autoRefreshManager';

import {
  Heart,
  Send,
  MoreVertical,
  Reply,
  X,
  ArrowLeft,
  ThumbsUp,
  Laugh,
  Angry,
  Frown,
  Image,
  Trash2,
  Smile,
  Crown,
  Star,
  Diamond,
  Gem,
  Shield,
  Award,
  Zap
} from 'lucide-react';

const RealTimeChat = ({ roomId, currentUser, onBack, showWebappNotification }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [activeChatters, setActiveChatters] = useState(new Set());
  const [activeChattersCount, setActiveChattersCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageModal, setImageModal] = useState({ show: false, src: '', alt: '' });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

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

  
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // อัปเดตจำนวน active chatters เมื่อ activeChatters เปลี่ยน
  useEffect(() => {
    setActiveChattersCount(activeChatters.size);
  }, [activeChatters]);

  // อัปเดต active chatters จากข้อความที่มีอยู่
  useEffect(() => {
    if (messages.length > 0) {
      const chatters = new Set();
      messages.forEach(message => {
        if (message.sender && message.sender._id) {
          chatters.add(message.sender._id);
        }
      });
      setActiveChatters(chatters);
    }
  }, [messages]);
  const imageInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const hasScrolledToBottomRef = useRef(false);
  const isInitialLoadRef = useRef(true);

  // Event handlers สำหรับ auto refresh (ต้องอยู่ข้างนอก useEffect เพื่อให้เข้าถึงได้ใน cleanup)
  const handleChatMessagesUpdated = (event) => {
    console.log('📨 RealTimeChat: Received chat messages update event:', event.detail);
    const { roomId: updatedRoomId, messages: newMessages } = event.detail;
    if (updatedRoomId === roomId) {
      console.log('🔄 Auto refresh: Chat messages updated for current room');
      setMessages(prev => {
        const existingIds = prev.map(msg => msg._id);
        const newUniqueMessages = newMessages.filter(msg => !existingIds.includes(msg._id));
        if (newUniqueMessages.length > 0) {
          console.log(`➕ Auto refresh added ${newUniqueMessages.length} new messages`);
          return [...prev, ...newUniqueMessages];
        }
        return prev;
      });
    } else {
      console.log('🔄 Auto refresh: Chat messages for different room, ignoring');
    }
  };

  const handleOnlineUsersUpdated = (event) => {
    const { roomId: updatedRoomId, onlineUsers, onlineCount } = event.detail;
    if (updatedRoomId === roomId) {
      console.log('🔄 Auto refresh: Online users updated');
      setOnlineUsers(onlineUsers);
      setOnlineCount(onlineCount);
    }
  };

  const handleNotificationsUpdated = (event) => {
    const { notifications } = event.detail;
    console.log('🔄 Auto refresh: Notifications updated');
    window.dispatchEvent(new CustomEvent('globalNotificationsUpdated', {
      detail: { notifications }
    }));
  };

  // ใช้ global SocketManager และ AutoRefreshManager แทนการสร้าง connection ใหม่
  useEffect(() => {
    console.log('🔌 RealTimeChat useEffect - Starting setup for room:', roomId);

    let retryIntervalId = null;
    let hasSetupListeners = false;
    let refreshCleanup = null;
    
    const setupSocketAndJoinRoom = () => {
      console.log('🔌 RealTimeChat: Checking socket manager...');

      if (!window.socketManager?.socket) {
        console.log('⚠️ RealTimeChat: Socket manager not available yet');
        return false;
      }

      const socket = window.socketManager.socket;
      console.log('🔌 RealTimeChat: Socket state:', {
        id: socket.id,
        connected: socket.connected,
        roomId
      });

      // ถ้า socket ไม่เชื่อมต่อ ให้ reconnect
      if (!socket.connected) {
        console.log('🔄 RealTimeChat: Socket not connected, attempting to connect...');
        socket.connect();
        return false; // รอให้เชื่อมต่อก่อน
      }

      console.log('✅ RealTimeChat: Socket is connected, proceeding with setup');
      setIsConnected(socket.connected);
      setSocket(socket);

      // Join room ทันทีเมื่อ socket พร้อม
      const token = sessionStorage.getItem('token');
      console.log('🚪 RealTimeChat: Joining room:', roomId, 'with userId:', currentUser._id);
      socket.emit('join-room', {
        roomId,
        userId: currentUser._id,
        token
      });

      return true;
    };

    // ตั้งค่า socket listeners และ auto refresh เมื่อ socket พร้อม
    const setupListeners = () => {
      if (!window.socketManager || !window.socketManager.socket) return false;
      if (hasSetupListeners) return true; // ถ้าตั้งค่าแล้ว ไม่ต้องตั้งค่าซ้ำ

      const socket = window.socketManager.socket;

      // เริ่มระบบ auto refresh สำหรับข้อมูลที่อาจหลุดหายไปจาก Socket.IO
      console.log('🚀 RealTimeChat: Starting auto refresh for room:', roomId);
      try {
        autoRefreshManager.startChatRefresh(roomId, currentUser._id);
        refreshCleanup = () => autoRefreshManager.stopChatRefresh();
        console.log('✅ RealTimeChat: Auto refresh started successfully');

        // แสดง stats ของ auto refresh manager สำหรับ debugging
        setTimeout(() => {
          console.log('📊 RealTimeChat: Auto refresh stats:', autoRefreshManager.getStats());
        }, 1000);

      } catch (error) {
        console.error('❌ RealTimeChat: Error starting auto refresh:', error);
      }

      // เมื่อ socket reconnect ให้ rejoin room อัตโนมัติ
      socket.on('connect', () => {
        console.log('🔄 Socket reconnected:', socket.id);
        setIsConnected(true);
        
        const token = sessionStorage.getItem('token');
        console.log('🚪 Re-joining room after reconnect:', roomId);
        socket.emit('join-room', {
          roomId,
          userId: currentUser._id,
          token
        });
      });
      
      // รับ error จาก server
      socket.on('error', (error) => {
        // แสดง warning เฉพาะ error ที่สำคัญ
        if (error.message && (
          error.message === 'Unauthorized to join this private room' ||
          error.message === 'Daily chat limit reached' ||
          error.message === 'คุณได้กดหัวใจข้อความนี้แล้ว'
        )) {
          console.warn('Server warning:', error.message);
        }
        
        if (error.message === 'Unauthorized to join this private room') {
          if (showWebappNotification) {
            showWebappNotification('คุณไม่มีสิทธิ์เข้าห้องแชทส่วนตัวนี้');
          }
        } else if (error.message === 'Daily chat limit reached') {
          if (showWebappNotification) {
            showWebappNotification('คุณส่งข้อความครบตามจำนวนที่กำหนดแล้ว');
          }
        } else if (error.message && error.message.includes('Rate Limit')) {
          if (showWebappNotification) {
            showWebappNotification('กรุณารอสักครู่ก่อนเข้าร่วมห้องใหม่');
          }
        }
      });

      // จัดการ rate limiting สำหรับการส่งข้อความ
      socket.on('message-rate-limited', (data) => {
        console.warn('⚠️ Message rate limited:', data);
        // แสดงข้อความเตือนให้ผู้ใช้
        if (showWebappNotification) {
          showWebappNotification({
            type: 'warning',
            title: 'ส่งข้อความเร็วเกินไป',
            message: data.message || 'กรุณารอสักครู่แล้วลองใหม่'
          });
        }
      });

      // จัดการการส่งข้อความล้มเหลว
      socket.on('message-send-failed', (data) => {
        console.error('❌ Message send failed:', data);
        // แสดงข้อความเตือนให้ผู้ใช้
        if (showWebappNotification) {
          showWebappNotification({
            type: 'error',
            title: 'ส่งข้อความไม่สำเร็จ',
            message: data.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่'
          });
        }
        
        // ถ้าสามารถ retry ได้ ให้แสดงปุ่มลองใหม่
        if (data.retryable) {
          console.log('🔄 Message can be retried:', data.tempId);
          // TODO: เพิ่มระบบ retry สำหรับข้อความที่ส่งล้มเหลว
        }
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from server');
        setIsConnected(false);
      });

      // รับข้อความใหม่
      socket.on('new-message', (message) => {
        console.log('📨 New message received:', message);
        console.log('🔍 Message details:', {
          content: message.content,
          sender: message.sender?._id,
          roomId: message.chatRoom,
          currentRoom: roomId
        });
        
        // ประมวลผลข้อความทันที - ไม่มี delay
        // เพิ่มผู้ส่งข้อความลงในรายการ active chatters
        if (message.sender && message.sender._id) {
          setActiveChatters(prev => {
            const newSet = new Set(prev);
            newSet.add(message.sender._id);
            return newSet;
          });
        }

        // อัปเดตข้อความทันที
        setMessages(prev => {
          console.log('📝 Current messages count:', prev.length);
          
          // ตรวจสอบว่ามีข้อความนี้อยู่แล้วหรือไม่ (ป้องกัน duplicate)
          const isDuplicate = prev.some(msg => msg._id === message._id);
          if (isDuplicate) {
            console.log('⚠️ Duplicate message detected, skipping');
            return prev;
          }
          
          // ถ้าเป็นข้อความจากผู้ใช้ปัจจุบัน ให้แทนที่ข้อความชั่วคราว
          if (message.sender && message.sender._id === currentUser._id) {
            // หาข้อความชั่วคราวที่ตรงกัน
            const tempIndex = prev.findIndex(msg => 
              msg.isTemp && 
              msg.sender._id === currentUser._id &&
              msg.content === message.content &&
              msg.messageType === message.messageType
            );
            
            if (tempIndex !== -1) {
              console.log('🔄 Replacing temp message with real message');
              const newMessages = [...prev];
              newMessages[tempIndex] = { ...message, isTemp: false };
              return newMessages;
            }
          }
          
          // เพิ่มข้อความใหม่
          console.log('➕ Adding new message to list');
          const newMessages = [...prev, message];
          console.log('✅ New messages count:', newMessages.length);
          return newMessages;
        });
        
        // Scroll ทันที
        setTimeout(() => scrollToBottomOnNewMessage(), 50);
      });

      // อัปเดต reaction
      socket.on('message-reaction-updated', (data) => {
        console.log('💖 Reaction updated from server:', data);
        
        // ใช้ requestIdleCallback เพื่อหลีกเลี่ยง performance warning
        const updateReaction = () => {
          setMessages(prev => prev.map(msg => {
            if (msg._id === data.messageId) {
              // อัปเดต reactions array
              let updatedReactions = msg.reactions || [];
              
              if (data.action === 'removed') {
                // ลบ reaction ของผู้ใช้นี้
                updatedReactions = updatedReactions.filter(
                  reaction => !((reaction.user === data.userId || reaction.user._id === data.userId) && reaction.type === data.reactionType)
                );
                console.log('💖 Reaction removed:', { messageId: data.messageId, reactionType: data.reactionType, updatedReactions });
           } else if (data.action === 'added') {
             // เพิ่ม reaction ใหม่
             const existingIndex = updatedReactions.findIndex(
               reaction => (reaction.user === data.userId || reaction.user._id === data.userId) && reaction.type === data.reactionType
             );
            
            if (existingIndex === -1) {
              // เพิ่ม reaction ใหม่
              updatedReactions.push({
                user: data.userId,
                type: data.reactionType,
                createdAt: new Date()
              });
              console.log('💖 Reaction added:', { messageId: data.messageId, reactionType: data.reactionType, updatedReactions });
            }
          } else if (data.action === 'changed') {
            // เปลี่ยน reaction type
            const existingIndex = updatedReactions.findIndex(
              reaction => reaction.user === data.userId
            );
            
            if (existingIndex !== -1) {
              // อัปเดต reaction type
              updatedReactions[existingIndex].type = data.reactionType;
              updatedReactions[existingIndex].createdAt = new Date();
              console.log('💖 Reaction changed:', { messageId: data.messageId, reactionType: data.reactionType, updatedReactions });
            }
          }
          
              return {
                ...msg,
                reactions: updatedReactions,
                stats: data.stats
              };
            }
            return msg;
          }));
        };

        if (window.requestIdleCallback) {
          window.requestIdleCallback(updateReaction);
        } else {
          setTimeout(updateReaction, 0);
        }
      });

      // Typing indicators
      socket.on('user-typing', (data) => {
        setTypingUsers(prev => {
          if (!prev.find(user => user.userId === data.userId)) {
            return [...prev, data];
          }
          return prev;
        });
      });

      socket.on('user-stop-typing', (data) => {
        setTypingUsers(prev => prev.filter(user => user.userId !== data.userId));
      });

      // Online count updates
      socket.on('online-count-updated', (data) => {
        setOnlineCount(data.onlineCount);
        setOnlineUsers(data.onlineUsers || []);
      });

      // Membership update event
      socket.on('membership-updated', (data) => {
        console.log('🔄 Received membership update:', data);
        setMessages(prev => prev.map(msg => {
          if (msg.sender && msg.sender._id === data.userId) {
            return {
              ...msg,
              sender: {
                ...msg.sender,
                membershipTier: data.membershipTier
              }
            };
          }
          return msg;
        }));
      });

      // Connection error handling
      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      // เพิ่ม event listeners สำหรับ auto refresh
      console.log('🔧 RealTimeChat: Adding auto refresh event listeners');
      window.addEventListener('chatMessagesUpdated', handleChatMessagesUpdated);
      window.addEventListener('onlineUsersUpdated', handleOnlineUsersUpdated);
      window.addEventListener('notificationsUpdated', handleNotificationsUpdated);

      hasSetupListeners = true;
      console.log('✅ RealTimeChat: Socket listeners and auto refresh setup complete');
      return true;
    };

    // ลอง setup ทันที
    let success = setupSocketAndJoinRoom();
    
    if (success) {
      // ถ้า join room สำเร็จ ให้ setup listeners
      console.log('✅ RealTimeChat: Socket setup successful, setting up listeners');
      setupListeners();
    } else {
      // ถ้าไม่สำเร็จ ลองใหม่
      console.log('⏰ RealTimeChat: Setup failed, retrying every 500ms...');
      retryIntervalId = setInterval(() => {
        console.log('🔄 RealTimeChat: Retrying socket setup...');
        const joinSuccess = setupSocketAndJoinRoom();
        if (joinSuccess && !hasSetupListeners) {
          console.log('✅ RealTimeChat: Setup successful on retry');
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

    return () => {
      // Cleanup retry interval
      if (retryIntervalId) {
        clearInterval(retryIntervalId);
      }

      // Cleanup auto refresh
      if (refreshCleanup) {
        refreshCleanup();
      }

      // Cleanup auto refresh event listeners
      window.removeEventListener('chatMessagesUpdated', handleChatMessagesUpdated);
      window.removeEventListener('onlineUsersUpdated', handleOnlineUsersUpdated);
      window.removeEventListener('notificationsUpdated', handleNotificationsUpdated);

      // Cleanup socket listeners
      if (window.socketManager && window.socketManager.socket) {
        const socket = window.socketManager.socket;
        console.log('🧹 Cleaning up socket listeners for room:', roomId);
        socket.off('connect');
        socket.off('error');
        socket.off('disconnect');
        socket.off('new-message');
        socket.off('message-reaction-updated');
        socket.off('user-typing');
        socket.off('user-stop-typing');
        socket.off('online-count-updated');
        socket.off('membership-updated');
        socket.off('connect_error');

        // Leave room เมื่อ unmount
        if (socket.connected) {
          socket.emit('leave-room', { roomId, userId: currentUser._id });
        }
      }
    };
  }, [roomId, currentUser._id, handleChatMessagesUpdated, handleOnlineUsersUpdated, handleNotificationsUpdated]);

  // โหลดข้อความเก่า
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/messages/${roomId}?userId=${currentUser._id}`,
          {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
          console.log('🔍 Messages loaded:', data.data.messages.length);
          console.log('🔍 isInitialLoadRef.current:', isInitialLoadRef.current);
          setMessages(data.data.messages);
          
          // Scroll ไปยังข้อความล่าสุดเมื่อเข้าห้องแชทครั้งแรก
          if (isInitialLoadRef.current) {
            console.log('🔍 Initial load detected, scheduling scroll');
            setTimeout(() => {
              console.log('🔍 Executing initial scroll');
              scrollToBottom();
              isInitialLoadRef.current = false;
              hasScrolledToBottomRef.current = true;
            }, 1000); // เพิ่มเวลารอให้ DOM render เสร็จ
          }
        } else {
          console.error('❌ API returned error:', data.message || 'Unknown error');
        }
      } catch (error) {
        console.error('❌ Error fetching messages:', error);
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
          console.error('❌ Network error - check if backend is running and CORS is configured correctly');
        }
      }
    };

    fetchMessages();
  }, [roomId, currentUser._id]);

  // รีเซ็ตสถานะการ scroll เมื่อเปลี่ยนห้องแชท
  useEffect(() => {
    console.log('🔍 Room changed, resetting scroll state');
    isInitialLoadRef.current = true;
    hasScrolledToBottomRef.current = false;
  }, [roomId]);

  // ติดตามการเปลี่ยน activeTab และ scroll เมื่อกลับมาหน้าแชท
  useEffect(() => {
    const handleTabChange = () => {
      // ตรวจสอบว่ากำลังอยู่ในหน้าแชทหรือไม่
      const messagesTab = document.querySelector('[data-value="messages"]');
      const isMessagesTabActive = messagesTab && messagesTab.getAttribute('data-state') === 'active';
      
      if (isMessagesTabActive && hasScrolledToBottomRef.current === false) {
        // Scroll ไปยังข้อความล่าสุดเมื่อกลับมาหน้าแชท
        console.log('🔍 Tab change detected, scheduling scroll');
        setTimeout(() => {
          console.log('🔍 Executing scroll on tab change');
          scrollToBottom();
          hasScrolledToBottomRef.current = true;
        }, 500);
      }
    };

    // ฟัง event เมื่อมีการเปลี่ยน tab
    const tabTriggers = document.querySelectorAll('[data-value="messages"]');
    tabTriggers.forEach(trigger => {
      trigger.addEventListener('click', handleTabChange);
    });

    // ตรวจสอบทันทีเมื่อ component mount
    handleTabChange();

    return () => {
      tabTriggers.forEach(trigger => {
        trigger.removeEventListener('click', handleTabChange);
      });
    };
  }, []);

  // Scroll เมื่อ messages เปลี่ยนแปลง (สำหรับการโหลดข้อความใหม่)
  useEffect(() => {
    console.log('🔍 Messages useEffect triggered:', {
      messagesLength: messages.length,
      isInitialLoad: isInitialLoadRef.current,
      hasScrolled: hasScrolledToBottomRef.current
    });
    
    if (messages.length > 0 && isInitialLoadRef.current) {
      console.log('🔍 Messages changed, scheduling scroll');
      setTimeout(() => {
        console.log('🔍 Executing scroll on messages change');
        scrollToBottom();
        isInitialLoadRef.current = false;
        hasScrolledToBottomRef.current = true;
      }, 300);
    }
  }, [messages.length]);

  // Scroll เมื่อ component mount และมี messages
  useEffect(() => {
    if (messages.length > 0 && messagesContainerRef.current && isInitialLoadRef.current) {
      console.log('🔍 Component mounted with messages, scheduling scroll');
      setTimeout(() => {
        console.log('🔍 Executing scroll on mount');
        scrollToBottom();
        isInitialLoadRef.current = false;
        hasScrolledToBottomRef.current = true;
      }, 500);
    }
  }, [messagesContainerRef.current, messages.length]);

  // โหลดข้อมูลห้องแชท
  useEffect(() => {
    const fetchRoomInfo = async () => {
      try {
        console.log(`🔍 RealTimeChat: Fetching room info for: ${roomId}`);
        const token = sessionStorage.getItem('token');
        const headers = {
          'Content-Type': 'application/json'
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/chatroom/${roomId}?userId=${currentUser._id}`,
          {
            credentials: 'include',
            headers
          }
        );
        
        console.log(`📊 RealTimeChat: Room info response status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setRoomInfo(data.data);
          }
        } else if (response.status === 401) {
          console.error('❌ Authentication failed for room info - user may need to re-login');
        }
      } catch (error) {
        console.error('Error fetching room info:', error);
      }
    };

    fetchRoomInfo();
  }, [roomId, currentUser._id]);

  // โหลดข้อมูลคนใช้งาน
  useEffect(() => {
    const fetchOnlineUsers = async () => {
      try {
        console.log(`🔍 RealTimeChat: Fetching online users for room: ${roomId}`);
        
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/chatroom/${roomId}/online-users?userId=${currentUser._id}`,
          {
            credentials: 'include'
            // ไม่ส่ง Authorization header เพราะ endpoint นี้ไม่ต้องการ auth
          }
        );
        
        console.log(`📊 RealTimeChat: Online users response status: ${response.status}`);
        const data = await response.json();
        
        if (data.success) {
          setOnlineUsers(data.data.onlineUsers);
          setOnlineCount(data.data.onlineCount);
        }
      } catch (error) {
        console.error('Error fetching active users:', error);
        // ถ้าไม่สามารถดึงข้อมูลได้ ให้เริ่มต้นด้วย 0
        setOnlineUsers([]);
        setOnlineCount(0);
      }
    };

    fetchOnlineUsers();
  }, [roomId, currentUser._id]);



  // ฟังก์ชันใหม่สำหรับ scroll เฉพาะเมื่อมีข้อความใหม่
  const scrollToBottomOnNewMessage = () => {
    // ใช้ setTimeout เพื่อให้ DOM อัปเดตก่อน
    setTimeout(() => {
      if (messagesContainerRef.current) {
        const scrollTop = messagesContainerRef.current.scrollTop;
        const scrollHeight = messagesContainerRef.current.scrollHeight;
        const clientHeight = messagesContainerRef.current.clientHeight;
        
        // ตรวจสอบว่าผู้ใช้อยู่ที่ด้านล่างหรือใกล้ด้านล่าง (ภายใน 200px)
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 200;
        
        // ถ้าผู้ใช้อยู่ที่ด้านล่างหรือใกล้ด้านล่าง ให้ scroll ลง
        if (isAtBottom) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }
    }, 50);
  };

  // ฟังก์ชันสำหรับ scroll ไปยังข้อความล่าสุด (ใช้เมื่อเข้าห้องแชทหรือกลับมาหน้าแชท)
  const scrollToBottom = () => {
    console.log('🔍 scrollToBottom called, messagesContainerRef:', messagesContainerRef.current);
    if (messagesContainerRef.current) {
      console.log('🔍 Scroll values before:', {
        scrollTop: messagesContainerRef.current.scrollTop,
        scrollHeight: messagesContainerRef.current.scrollHeight,
        clientHeight: messagesContainerRef.current.clientHeight
      });
      
      // Scroll ไปยังด้านล่างสุด
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      
      console.log('🔍 Scroll values after:', {
        scrollTop: messagesContainerRef.current.scrollTop,
        scrollHeight: messagesContainerRef.current.scrollHeight
      });
    } else {
      console.log('❌ messagesContainerRef not available');
    }
  };

  const handleSendMessage = () => {
    console.log('📤 handleSendMessage called');
    console.log('🔍 Socket state:', {
      hasSocket: !!socket,
      isConnected: socket?.connected,
      socketId: socket?.id
    });
    
    if (!newMessage.trim()) {
      console.log('❌ No message content');
      return;
    }
    
    if (!socket || !socket.connected) {
      console.log('❌ Socket not available or not connected');
      if (showWebappNotification) {
        showWebappNotification('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
      }
      return;
    }

    console.log('✅ Ready to send message');

    // Debug current user membership
    console.log('🔍 Debug - Current user membership:', currentUser.membership);
    console.log('🔍 Debug - Current user tier:', currentUser.membership?.tier);

    // ตรวจสอบระดับสมาชิกก่อนส่งข้อความ
    const userLimits = getUserMembershipLimits(currentUser.membership?.tier || 'member');
    console.log('🔍 Debug - User limits:', userLimits);
    
    if (editingMessage) {
      // แก้ไขข้อความ
      handleEditMessage(editingMessage._id, newMessage);
    } else {
      // ตรวจสอบจำนวนข้อความที่ส่งได้ตามระดับสมาชิก
      const canSend = canSendMessage(currentUser.membership?.tier || 'member');
      console.log('🔍 Debug - Can send message:', canSend);
      
      if (!canSend) {
        console.log('🚫 Debug - Showing notification for message limit');
        if (showWebappNotification) {
          showWebappNotification(`คุณส่งข้อความครบตามระดับสมาชิกแล้ว (${userLimits.dailyChats} ข้อความต่อวัน)`);
        } else {
          console.log('❌ Debug - showWebappNotification is not available');
        }
        return;
      }

      // สร้างข้อความชั่วคราวเพื่อแสดงทันที
      const tempMessage = {
        _id: `temp-${Date.now()}`,
        content: newMessage,
        sender: {
          _id: currentUser._id,
          displayName: currentUser.displayName,
          username: currentUser.username,
          profileImages: currentUser.profileImages,
          membershipTier: currentUser.membership?.tier || 'member'
        },
        chatRoom: roomId,
        messageType: 'text',
        replyTo: replyTo,
        createdAt: new Date().toISOString(),
        isTemp: true
      };

      console.log('➕ Adding temp message:', tempMessage);
      // เพิ่มข้อความชั่วคราวลงใน state ทันที
      setMessages(prev => {
        console.log('📝 Adding temp message to', prev.length, 'existing messages');
        return [...prev, tempMessage];
      });

      // ส่งข้อความใหม่ผ่าน socket
      const messageData = {
        content: newMessage,
        senderId: currentUser._id,
        chatRoomId: roomId,
        messageType: 'text',
        replyToId: replyTo?._id
      };
      
      console.log('📤 Emitting send-message:', messageData);
      socket.emit('send-message', messageData);
      
      // เพิ่มจำนวนข้อความที่ส่งไปแล้ววันนี้ (สำหรับ tier ที่มี limit)
      const currentTier = currentUser.membership?.tier || 'member';
      const limits = getUserMembershipLimits(currentTier);
      if (limits.dailyChats !== -1) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dailyUsageKey = `dailyUsage_${currentUser._id}_${today.getTime()}`;
        const todayUsage = JSON.parse(localStorage.getItem(dailyUsageKey) || '{"chatCount": 0, "lastReset": null}');
        
        todayUsage.chatCount += 1;
        todayUsage.lastReset = today.toISOString();
        localStorage.setItem(dailyUsageKey, JSON.stringify(todayUsage));
        
        console.log('📊 Updated daily usage:', {
          count: todayUsage.chatCount,
          limit: limits.dailyChats,
          remaining: limits.dailyChats - todayUsage.chatCount
        });
      }
      
      // Scroll ลงด้านล่างเมื่อผู้ใช้ส่งข้อความเอง
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 100);
    }

    setNewMessage('');
    setReplyTo(null);
    setEditingMessage(null);
    messageInputRef.current?.focus();
  };

  const getUserMembershipLimits = (tier) => {
    // ใช้ limits ที่สอดคล้องกับ backend
    const limits = {
      member: { dailyChats: 10 },
      silver: { dailyChats: 30 },
      gold: { dailyChats: 60 },
      vip: { dailyChats: 120 },
      vip1: { dailyChats: 180 },
      vip2: { dailyChats: 240 },
      diamond: { dailyChats: -1 }, // unlimited
      platinum: { dailyChats: -1 } // unlimited
    };
    return limits[tier] || limits.member;
  };

  const canSendMessage = (tier) => {
    const limits = getUserMembershipLimits(tier);
    
    console.log('🔍 canSendMessage called with tier:', tier);
    console.log('🔍 limits for tier:', limits);
    
    // ถ้าเป็น unlimited จะส่งได้เสมอ
    if (limits.dailyChats === -1) {
      console.log('✅ Unlimited messages - can send');
      return true;
    }
    
    // ใช้ระบบ daily reset ที่ถูกต้องตามเวลาปัจจุบัน
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // วันนี้ 00:00:00
    
    // ดึงข้อมูลการใช้งานวันนี้
    const dailyUsageKey = `dailyUsage_${currentUser._id}_${today.getTime()}`;
    const todayUsage = JSON.parse(localStorage.getItem(dailyUsageKey) || '{"chatCount": 0, "lastReset": null}');
    
    // ตรวจสอบว่าต้องรีเซ็ตหรือไม่
    if (!todayUsage.lastReset || new Date(todayUsage.lastReset).getDate() !== today.getDate()) {
      todayUsage.chatCount = 0;
      todayUsage.lastReset = today.toISOString();
      localStorage.setItem(dailyUsageKey, JSON.stringify(todayUsage));
      console.log('🔄 Daily usage reset for new day');
    }
    
    console.log('🔍 Message limit check:', {
      tier,
      dailyLimit: limits.dailyChats,
      currentCount: todayUsage.chatCount,
      canSend: todayUsage.chatCount < limits.dailyChats,
      userId: currentUser._id,
      today: today.toDateString(),
      lastReset: todayUsage.lastReset
    });
    
    const result = todayUsage.chatCount < limits.dailyChats;
    console.log('🔍 Final canSend result:', result);
    
    return result;
  };

  const handleReactToMessage = (messageId, reactionType = 'heart') => {
    if (!socket) {
      console.log('❌ Socket not available for reaction');
      return;
    }

    // ตรวจสอบว่าผู้ใช้เคยกด reaction นี้แล้วหรือไม่
    const message = messages.find(msg => msg._id === messageId);
    const hasReacted = message && message.reactions && message.reactions.some(
      reaction => (reaction.user === currentUser._id || reaction.user._id === currentUser._id) && reaction.type === reactionType
    );
    
    console.log('💖 Heart reaction clicked:', {
      messageId,
      reactionType,
      hasReacted,
      action: hasReacted ? 'remove' : 'add',
      currentUserId: currentUser._id,
      messageReactions: message?.reactions
    });
    
    // ส่งข้อมูลไปยัง backend
    socket.emit('react-message', {
      messageId,
      userId: currentUser._id,
      reactionType,
      action: hasReacted ? 'remove' : 'add'
    });
  };

  // ฟังก์ชันตรวจสอบว่าผู้ใช้เคยกด like แล้วหรือไม่
  const hasUserLiked = (message) => {
    if (!message.reactions || !currentUser._id) return false;
    return message.reactions.some(
      reaction => (reaction.user === currentUser._id || reaction.user._id === currentUser._id) && reaction.type === 'heart'
    );
  };

  // ฟังก์ชันนับจำนวน like
  const getLikeCount = (message) => {
    if (!message.reactions) return 0;
    return message.reactions.filter(reaction => reaction.type === 'heart').length;
  };

  // ฟังก์ชันตรวจสอบว่าผู้ใช้ react แล้วหรือไม่ (สำหรับ reaction อื่นๆ)
  const hasUserReacted = (message, reactionType) => {
    if (!message.reactions || !currentUser._id) return false;
    return message.reactions.some(
      reaction => (reaction.user === currentUser._id || reaction.user._id === currentUser._id) && reaction.type === reactionType
    );
  };



  const handleEditMessage = async (messageId, newContent) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/messages/${messageId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            content: newContent,
            userId: currentUser._id
          })
        }
      );

      const data = await response.json();
      if (data.success) {
        setMessages(prev => prev.map(msg => 
          msg._id === messageId 
            ? { ...msg, content: newContent, isEdited: true, editedAt: new Date() }
            : msg
        ));
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedImage || !socket) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', selectedImage);
    formData.append('senderId', currentUser._id);
    formData.append('chatRoomId', roomId);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/chatroom/upload`,
        {
          method: 'POST',
          credentials: 'include',
          body: formData
        }
      );

      const data = await response.json();
      
      if (data.success) {
        // สร้างข้อความรูปภาพชั่วคราวเพื่อแสดงทันที
        const tempImageMessage = {
          _id: `temp-image-${Date.now()}`,
          content: '',
          sender: {
            _id: currentUser._id,
            displayName: currentUser.displayName,
            username: currentUser.username,
            profileImages: currentUser.profileImages,
            membershipTier: currentUser.membership?.tier || 'member'
          },
          chatRoomId: roomId,
          messageType: 'image',
          fileUrl: data.data.fileUrl,
          imageUrl: data.data.fileUrl,
          createdAt: new Date().toISOString(),
          isTemp: true
        };

        // เพิ่มข้อความรูปภาพชั่วคราวลงใน state ทันที
        setMessages(prev => [...prev, tempImageMessage]);

        // ส่งข้อความรูปภาพผ่าน socket
        const messageData = {
          content: '',
          senderId: currentUser._id,
          chatRoomId: roomId,
          messageType: 'image',
          fileUrl: data.data.fileUrl
        };
        
        socket.emit('send-message', messageData);
        
        // Scroll ลงด้านล่างเมื่อผู้ใช้ส่งรูปภาพ
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        }, 100);
        
        // รีเซ็ต state
        setSelectedImage(null);
        setImagePreview(null);
        if (imageInputRef.current) {
          imageInputRef.current.value = '';
        }
      } else {
        alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ: ' + (data.message || 'ไม่ทราบสาเหตุ'));
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCancelImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleEmojiClick = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    messageInputRef.current?.focus();
  };

  const handleDeleteMessage = async (messageId) => {
    // ตรวจสอบว่าเป็นข้อความรูปภาพและยังไม่เกิน 3 วินาทีหรือไม่
    const message = messages.find(msg => msg._id === messageId);
    if (message && message.messageType === 'image') {
      const messageTime = new Date(message.createdAt);
      const currentTime = new Date();
      const timeDiff = (currentTime - messageTime) / 1000; // วินาที
      
      if (timeDiff > 3) {
        alert('ไม่สามารถลบรูปภาพได้หลังจาก 3 วินาที');
        return;
      }
    } else {
      if (!confirm('คุณต้องการลบข้อความนี้หรือไม่?')) return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/messages/${messageId}`,
        {
          method: 'DELETE',
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
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };



  const handleTyping = () => {
    if (!socket) return;

    socket.emit('typing-start', {
      roomId,
      userId: currentUser._id,
      username: currentUser.displayName || currentUser.username
    });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing-stop', {
        roomId,
        userId: currentUser._id
      });
    }, 1000);
  };

  const getMembershipBadgeColor = (tier) => {
    const colors = {
      member: 'bg-gray-100 text-gray-800',
      silver: 'bg-slate-200 text-slate-900',
      gold: 'bg-amber-100 text-amber-800',
      vip: 'bg-purple-100 text-purple-800',
      vip1: 'bg-purple-200 text-purple-900',
      vip2: 'bg-purple-300 text-purple-900',
      diamond: 'bg-blue-100 text-blue-800',
      platinum: 'bg-indigo-100 text-indigo-800'
    };
    return colors[tier] || colors.member;
  };

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

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };





  const renderMessageContent = (message, isOwnMessage = false) => {
    const textColor = isOwnMessage ? 'text-white' : 'text-gray-900';
    
    // Image message
    if (message.messageType === 'image' && (message.imageUrl || message.fileUrl)) {
      const imageUrl = message.imageUrl || message.fileUrl;
      
      // ตรวจสอบและแก้ไข URL ถ้าจำเป็น
      let finalImageUrl = imageUrl;
      if (imageUrl && typeof imageUrl === 'string') {
        // ถ้า URL เริ่มต้นด้วย /uploads/chat-files/ ให้เพิ่ม base URL
        if (imageUrl.startsWith('/uploads/chat-files/')) {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
          finalImageUrl = `${baseUrl}${imageUrl}`;
        }
        // ถ้า URL ไม่มี protocol ให้เพิ่ม base URL
        else if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
          finalImageUrl = `${baseUrl}/uploads/chat-files/${imageUrl}`;
        }
      }
      
      return (
        <div className="space-y-2">
          <img
            src={finalImageUrl}
            alt="Shared image"
            className="max-w-[200px] max-h-[250px] w-auto h-auto object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
            onClick={() => {
              setImageModal({
                show: true,
                src: finalImageUrl,
                alt: 'Shared image'
              });
            }}
            onError={(e) => {
              console.warn('⚠️ Image failed to load, using fallback:', {
                originalUrl: imageUrl,
                finalUrl: finalImageUrl
              });
              e.target.style.display = 'none';
              // แสดง fallback content
              const fallbackDiv = document.createElement('div');
              fallbackDiv.className = 'w-full h-48 bg-gray-200 flex items-center justify-center text-gray-500 text-sm';
              fallbackDiv.textContent = 'รูปภาพไม่สามารถโหลดได้';
              e.target.parentNode.appendChild(fallbackDiv);
            }}
            onLoad={() => {
              console.log('✅ Chat image loaded successfully:', finalImageUrl);
            }}
          />
          {message.content && (
            <div className={`text-sm ${textColor}`}>
              {message.content}
            </div>
          )}
        </div>
      );
    }
    
    // Text message with potential YouTube links
    if (message.content) {
      const { text, youtubeUrls } = separateYouTubeFromText(message.content);
      
      return (
        <div className="space-y-2">
          {/* Display clean text if any */}
          {text && (
            <div className={`text-sm ${textColor} whitespace-pre-wrap`}>
              {text}
            </div>
          )}
          
          {/* Display YouTube previews */}
          {youtubeUrls.map((youtubeData, index) => (
            <YouTubePreview
              key={`${message._id}-youtube-${index}`}
              url={youtubeData.url}
              className="max-w-80"
            />
          ))}
        </div>
      );
    }
    
    return null;
  };

     const getReactionIcon = (type) => {
     switch (type) {
       case 'heart':
         return <Heart className="h-3 w-3" />;
       case 'thumbsup':
         return <ThumbsUp className="h-3 w-3" />;
       case 'laugh':
         return <Laugh className="h-3 w-3" />;
       case 'angry':
         return <Angry className="h-3 w-3" />;
       case 'sad':
         return <Frown className="h-3 w-3" />;
       default:
         return <Heart className="h-3 w-3" />;
     }
   };

  if (!roomInfo) {
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
    <>
      <div className="flex flex-col h-full bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 bg-gradient-to-r from-pink-500 to-violet-500 text-white p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div>
                <h3 className="font-semibold text-sm sm:text-lg">{roomInfo.name}</h3>
                <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-white/90">
                  <span>{activeChattersCount} ใช้งานแล้ว</span>
                </div>
              </div>
            </div>
            <div className="flex items-center">
              <span className="font-semibold text-sm sm:text-lg flex items-center">
                <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                กำลังใช้งาน {onlineCount}
              </span>
            </div>
          </div>
        </div>

        {/* Messages Area - Scrollable */}
        <div ref={messagesContainerRef} className="messages-container flex-1 overflow-y-auto p-2 sm:p-4 space-y-4 sm:space-y-6 bg-gray-50 pb-20 relative z-10">
         {messages.map((message, index) => (
                     <div
            key={message._id}
            className={`flex ${message.sender && message.sender._id === currentUser._id ? 'justify-end' : 'justify-start'} ${
              index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
            } p-2 rounded-lg`}
          >
            <div className={`flex max-w-[50%] ${message.sender && message.sender._id === currentUser._id ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar */}
              <Avatar className="w-8 h-8 mx-2">
                {message.sender ? (
                  <>
                    <AvatarImage 
                      src={message.sender.profileImages?.[0] ? getProfileImageUrl(message.sender.profileImages[0], message.sender._id) : ''} 
                      alt={message.sender.displayName || message.sender.username} 
                    />
                    <AvatarFallback className="bg-gradient-to-r from-pink-400 to-violet-400 text-white text-xs">
                      {(message.sender.displayName || message.sender.username || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </>
                ) : (
                  <AvatarFallback className="bg-gradient-to-r from-pink-400 to-violet-400 text-white text-xs">
                    ?
                  </AvatarFallback>
                )}
              </Avatar>

              {/* Message Content */}
              <div className={`flex flex-col group w-full ${message.sender && message.sender._id === currentUser._id ? 'items-end' : 'items-start'}`}>
                {/* Sender Info */}
                <div className={`flex items-center space-x-2 mb-1 ${message.sender && message.sender._id === currentUser._id ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {message.sender ? (
                    <>
                      <span className="text-sm font-medium text-gray-700">
                        {message.sender.displayName || message.sender.username}
                      </span>
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white shadow-sm border">
                        {getMembershipIcon(message.sender.membershipTier || 'member')}
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-gray-700">
                        Unknown User
                      </span>
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white shadow-sm border">
                        {getMembershipIcon('member')}
                      </div>
                    </>
                  )}
                  <span className="text-xs text-gray-500">
                    {formatTime(message.createdAt)}
                  </span>
                </div>

                {/* Reply To */}
                {message.replyTo && (
                  <div className="bg-gray-200 rounded-lg p-2 mb-2 text-sm max-w-full">
                    <div className="text-gray-600 text-xs mb-1">
                      ตอบกลับ {message.replyTo.sender?.displayName || message.replyTo.sender?.username}
                    </div>
                    <div className="text-gray-800 truncate">
                      {message.replyTo.content}
                    </div>
                  </div>
                )}

                {/* Message Content */}
                <div className={`relative ${message.sender && message.sender._id === currentUser._id ? 'text-right' : 'text-left'} max-w-full`}>
                  <div className={`inline-block rounded-xl px-3 py-1.5 max-w-[280px] sm:max-w-sm break-words ${
                    message.sender && message.sender._id === currentUser._id 
                      ? 'bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-br-md' 
                      : 'bg-white text-gray-900 shadow-sm border border-gray-200 rounded-bl-md'
                  }`}>
                    {renderMessageContent(message, message.sender && message.sender._id === currentUser._id)}
                     
                    {message.isEdited && (
                      <div className={`text-xs opacity-70 mt-1 ${
                        message.sender && message.sender._id === currentUser._id ? 'text-white/70' : 'text-gray-500'
                      }`}>
                        แก้ไขแล้ว
                      </div>
                    )}
                  </div>

                  {/* Message Actions - ปุ่ม Like, Reply - แสดงเมื่อ hover */}
                  <div className={`absolute -bottom-8 ${message.sender && message.sender._id === currentUser._id ? 'right-0' : 'left-0'} opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center space-x-2 bg-white rounded-full shadow-md px-2 py-1 z-10`}>
                    {/* Like Button */}
                    <button
                      onClick={() => handleReactToMessage(message._id, 'heart')}
                      className={`flex items-center space-x-1 text-xs transition-all duration-200 rounded-full px-2 py-1 ${
                        hasUserLiked(message) 
                          ? 'text-red-600 hover:text-red-700' 
                          : 'text-gray-600 hover:text-red-500'
                      }`}
                      title={hasUserLiked(message) ? 'กดเพื่อยกเลิกหัวใจ' : 'กดไลค์'}
                    >
                      <Heart className={`h-3 w-3 ${hasUserLiked(message) ? 'fill-current text-red-600' : 'text-gray-600'}`} />
                      {getLikeCount(message) > 0 && (
                        <span className="text-xs">({getLikeCount(message)})</span>
                      )}
                    </button>
                    
                    {/* Reply Button */}
                    <button
                      onClick={() => setReplyTo(message)}
                      className="flex items-center space-x-1 text-xs text-gray-600 hover:text-blue-500 transition-colors rounded-full px-2 py-1"
                      title="ตอบกลับข้อความนี้"
                    >
                      <Reply className="h-3 w-3" />
                    </button>

                    {/* Delete Button - แสดงเฉพาะข้อความรูปภาพที่ยังไม่เกิน 3 วินาที */}
                    {message.messageType === 'image' && message.sender && message.sender._id === currentUser._id && (
                      (() => {
                        const messageTime = new Date(message.createdAt);
                        const currentTime = new Date();
                        const timeDiff = (currentTime - messageTime) / 1000;
                        
                        if (timeDiff <= 3) {
                          return (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="flex items-center space-x-1 text-xs text-red-500 hover:text-red-700 transition-colors rounded-full px-2 py-1"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          );
                        }
                        return null;
                      })()
                    )}
                  </div>
                </div>

                {/* Reactions */}
                {message.reactions && message.reactions.length > 0 && (
                  <div className="flex items-center flex-wrap gap-1 mt-2">
                    {Object.entries(
                      message.reactions.reduce((acc, reaction) => {
                        acc[reaction.type] = (acc[reaction.type] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([type, count]) => {
                      const userHasReacted = hasUserReacted(message, type);
                      return (
                        <button
                          key={type}
                          onClick={() => handleReactToMessage(message._id, type)}
                          className={`flex items-center space-x-1 rounded-full px-2 py-1 text-xs transition-colors ${
                            userHasReacted 
                              ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                          }`}
                          title={userHasReacted ? `กดเพื่อยกเลิก ${type}` : `กด ${type}`}
                        >
                          <div className={userHasReacted ? 'text-red-600' : 'text-gray-600'}>
                            {getReactionIcon(type)}
                          </div>
                          <span>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

              </div>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>
              {typingUsers.map(user => user.username).join(', ')} กำลังพิมพ์...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply/Edit Bar */}
      {(replyTo || editingMessage) && (
        <div className="bg-blue-50 border-t border-blue-200 p-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium text-blue-800">
                {editingMessage ? 'แก้ไขข้อความ' : `ตอบกลับ ${replyTo?.sender?.displayName || replyTo?.sender?.username}`}
              </div>
              <div className="text-sm text-blue-600 truncate">
                {editingMessage ? editingMessage.content : replyTo?.content}
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setReplyTo(null);
                setEditingMessage(null);
                setNewMessage('');
              }}
              className="text-blue-600 hover:bg-blue-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

        {/* Input Area - Fixed */}
        <div className="flex-shrink-0 p-2 sm:p-3 bg-white border-t border-gray-200 sticky bottom-0 z-50 shadow-lg">
          {/* Image Preview */}
          {imagePreview && (
            <div className="mb-2 sm:mb-3 relative">
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-24 sm:max-h-32 rounded-lg border"
                />
                <button
                  onClick={handleCancelImage}
                  className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white rounded-full p-0.5 sm:p-1 hover:bg-red-600"
                >
                  <X className="h-2 w-2 sm:h-3 sm:w-3" />
                </button>
              </div>
              <div className="mt-1 sm:mt-2 flex space-x-1 sm:space-x-2">
                <Button
                  onClick={handleImageUpload}
                  disabled={uploadingImage}
                  className="bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                >
                  {uploadingImage ? 'กำลังอัปโหลด...' : 'ส่งรูปภาพ'}
                </Button>
                <Button
                  onClick={handleCancelImage}
                  variant="outline"
                  className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                >
                  ยกเลิก
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Image Upload Button */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => imageInputRef.current?.click()}
              className="text-gray-500 hover:text-gray-700 p-1 sm:p-2"
              title="เพิ่มรูปภาพ"
            >
              <Image className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>

            {/* Emoji Button */}
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-gray-500 hover:text-gray-700 p-1 sm:p-2"
              title="เพิ่มอีโมจิ"
            >
              <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
        
            <div className="flex-1 relative">
              <input
                ref={messageInputRef}
                type="text"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={editingMessage ? 'แก้ไขข้อความ...' : 'พิมพ์ข้อความ...'}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-base sm:text-base"
                disabled={!isConnected}
              />

              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-10">
                  <div className="grid grid-cols-8 gap-1">
                    {['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'].map((emoji, index) => (
                      <button
                        key={index}
                        onClick={() => handleEmojiClick(emoji)}
                        className="w-8 h-8 text-lg hover:bg-gray-100 rounded flex items-center justify-center transition-colors"
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Send button clicked!', { 
                  newMessage: newMessage.trim(), 
                  isConnected,
                  messageLength: newMessage.length 
                });
                if (newMessage.trim()) {
                  handleSendMessage();
                }
              }}
              type="button"
              style={{
                minWidth: '40px',
                minHeight: '40px',
                borderRadius: '50%',
                border: 'none',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                backgroundColor: newMessage.trim() ? '#ec4899' : '#9ca3af',
                color: 'white',
                opacity: newMessage.trim() ? '1' : '0.6',
                boxShadow: newMessage.trim() ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
                position: 'relative',
                zIndex: 100,
                pointerEvents: 'auto',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                if (newMessage.trim()) {
                  e.target.style.backgroundColor = '#be185d';
                  e.target.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (newMessage.trim()) {
                  e.target.style.backgroundColor = '#ec4899';
                  e.target.style.transform = 'scale(1)';
                }
              }}
              onTouchStart={(e) => {
                if (newMessage.trim()) {
                  e.target.style.backgroundColor = '#be185d';
                  e.target.style.transform = 'scale(1.05)';
                }
              }}
              onTouchEnd={(e) => {
                if (newMessage.trim()) {
                  e.target.style.backgroundColor = '#ec4899';
                  e.target.style.transform = 'scale(1)';
                }
              }}
              title={!newMessage.trim() ? 'กรุณาพิมพ์ข้อความ' : 'ส่งข้อความ'}
            >
              <Send className="h-4 w-4 sm:h-5 sm:w-5" style={{ pointerEvents: 'none' }} />
            </button>
          </div>
        </div>
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
    </>
  );
};

export default RealTimeChat;
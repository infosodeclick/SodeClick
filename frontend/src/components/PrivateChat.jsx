import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  ArrowLeft, 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  Video, 
  FileText,
  Smile,
  MoreVertical,
  Phone,
  Video as VideoCall
} from 'lucide-react';

const PrivateChat = ({ 
  currentUser, 
  otherUser, 
  onBack, 
  onSendMessage,
  messages = [],
  isLoading = false,
  isOtherUserTyping = false,
  onSimulateTyping = null,
  onSimulateRead = null,
  onMessageRead = null, // เพิ่ม prop สำหรับตรวจจับการอ่าน
  chatRoomId = null // เพิ่ม prop สำหรับ chat room ID
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageRefs = useRef({});

  // เชื่อมต่อ Socket.IO สำหรับ private chat
  useEffect(() => {
    if (!chatRoomId || !currentUser) return;

    const newSocket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000', {
      withCredentials: true,
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      forceNew: false, // เปลี่ยนเป็น false เพื่อใช้ connection เดียวกัน
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('🔌 Connected to private chat socket');
      console.log('🔌 Socket ID:', newSocket.id);
      console.log('🔌 Socket connected:', newSocket.connected);
      setIsConnected(true);
      
      // เข้าร่วมห้องแชทส่วนตัว
      const joinData = {
        roomId: chatRoomId,
        userId: currentUser._id
      };
      console.log('🚪 Joining room:', joinData);
      newSocket.emit('join-room', joinData);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      
      // เข้าร่วมห้องแชทส่วนตัวอีกครั้งหลัง reconnect
      const joinData = {
        roomId: chatRoomId,
        userId: currentUser._id
      };
      console.log('🚪 Rejoining room after reconnect:', joinData);
      newSocket.emit('join-room', joinData);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      console.error('❌ Connection error details:', {
        message: error.message,
        type: error.type,
        description: error.description,
        context: error.context
      });
      setIsConnected(false);
    });

    newSocket.on('reconnecting', (attemptNumber) => {
      console.log('🔄 Socket reconnecting, attempt:', attemptNumber);
      setIsConnected(false);
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('❌ Socket reconnection error:', error);
      setIsConnected(false);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('❌ Socket reconnection failed');
      setIsConnected(false);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from private chat socket, reason:', reason);
      setIsConnected(false);
    });

    // รับข้อความใหม่จาก Socket.IO
    newSocket.on('new-message', (message) => {
      console.log('📨 Received new message via socket:', message);
      console.log('📨 Message sender:', message.sender?.displayName || message.sender?.username);
      console.log('📨 Message content:', message.content);
      console.log('📨 Current user:', currentUser?.displayName || currentUser?.username);
      
      // ตรวจสอบว่าเป็นข้อความของตัวเองหรือไม่
      const isOwnMessage = message.sender?._id === currentUser._id || message.sender === currentUser._id;
      
      if (isOwnMessage) {
        console.log('📨 This is own message, replacing temporary message');
        
        // สร้างข้อความในรูปแบบที่ parent component คาดหวัง
        const formattedMessage = {
          _id: message._id,
          content: message.content,
          senderId: message.sender?._id || message.sender,
          timestamp: message.createdAt || new Date(),
          isDelivered: true,
          isRead: false,
          sender: message.sender,
          fileUrl: message.fileUrl,
          messageType: message.messageType,
          isTemporary: false // ข้อความจริงจาก server
        };
        
        console.log('📨 Formatted own message:', formattedMessage);
        
        // ส่งข้อความจริงไปยัง parent component เพื่อแทนที่ข้อความชั่วคราว
        if (onSendMessage && typeof onSendMessage === 'function') {
          console.log('📨 Calling onSendMessage with own message');
          onSendMessage(null, null, formattedMessage, 'own-message');
        }
        
        return;
      }
      
      // สร้างข้อความในรูปแบบที่ parent component คาดหวัง
      const formattedMessage = {
        _id: message._id,
        content: message.content,
        senderId: message.sender?._id || message.sender,
        timestamp: message.createdAt || new Date(),
        isDelivered: true,
        isRead: false,
        sender: message.sender,
        fileUrl: message.fileUrl,
        messageType: message.messageType
      };
      
      console.log('📨 Formatted message:', formattedMessage);
      
      // ส่งข้อความใหม่ไปยัง parent component เพื่ออัปเดต state
      if (onSendMessage && typeof onSendMessage === 'function') {
        console.log('📨 Calling onSendMessage with formatted message');
        // ใช้ callback แบบใหม่ที่ไม่ conflict
        onSendMessage(null, null, formattedMessage, 'socket-message');
      } else {
        console.log('⚠️ onSendMessage not available or not a function');
      }
    });

    // รับการอัปเดตสถานะการอ่าน
    newSocket.on('message-read', (data) => {
      console.log('👁️ Message read update:', data);
      // อัปเดตสถานะการอ่านใน parent component
      if (onMessageRead) {
        onMessageRead(data.messageId);
      }
    });

    // รับการอัปเดตสถานะการส่ง
    newSocket.on('message-delivered', (data) => {
      console.log('✅ Message delivered update:', data);
      // อัปเดตสถานะการส่งใน parent component
    });

    // รับการพิมพ์ของอีกฝ่าย
    newSocket.on('user-typing', (data) => {
      console.log('⌨️ User typing:', data);
      if (data.userId !== currentUser._id && onSimulateTyping) {
        onSimulateTyping();
      }
    });

    newSocket.on('user-stop-typing', (data) => {
      console.log('⌨️ User stopped typing:', data);
      if (data.userId !== currentUser._id) {
        // หยุดการแสดง typing indicator
      }
    });

    // Error handling
    newSocket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        type: error.type,
        description: error.description,
        context: error.context
      });
    });

    setSocket(newSocket);

    return () => {
      console.log('🧹 Cleaning up socket connection...');
      if (newSocket.connected) {
        newSocket.disconnect();
      }
      newSocket.close();
    };
  }, [chatRoomId, currentUser, onSendMessage, onMessageRead, onSimulateTyping]);

  // ระบบตรวจจับการอ่านข้อความ
  useEffect(() => {
    if (!onMessageRead) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.dataset.messageId;
            const message = messages.find(msg => msg._id === messageId);
            
            // ตรวจสอบว่าเป็นข้อความของคนอื่นและยังไม่อ่าน
            if (message && message.senderId !== currentUser._id && !message.isRead) {
              // ตรวจสอบว่าไม่ได้ส่งการอ่านข้อความซ้ำ
              if (!message.isMarkingAsRead) {
                message.isMarkingAsRead = true; // ป้องกันการส่งซ้ำ
                onMessageRead(messageId);
                
                // ส่งการอ่านข้อความผ่าน Socket.IO
                if (socket && isConnected) {
                  socket.emit('mark-message-read', {
                    messageId: messageId,
                    userId: currentUser._id,
                    roomId: chatRoomId
                  });
                }
              }
            }
          }
        });
      },
      {
        threshold: 0.5, // ต้องเห็นข้อความอย่างน้อย 50%
        rootMargin: '0px'
      }
    );

    // สังเกตข้อความทั้งหมด
    Object.values(messageRefs.current).forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => {
      observer.disconnect();
    };
  }, [messages, currentUser._id, onMessageRead, socket, isConnected, chatRoomId]);

  // Auto scroll to bottom only when component first loads
  useEffect(() => {
    if (messagesContainerRef.current && messages.length > 0) {
      // เลื่อนไปข้อความล่าสุดครั้งเดียวเมื่อเข้าหน้าแชท
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [chatRoomId]); // ใช้ chatRoomId แทน messages เพื่อให้เลื่อนครั้งเดียวเมื่อเข้าหน้าแชท

  // Auto scroll to bottom when there are new messages (from any sender)
  useEffect(() => {
    if (messagesContainerRef.current && messages.length > 0) {
      const container = messagesContainerRef.current;
      
      // Always scroll to bottom for new messages in private chat
      // This ensures the latest message is always visible regardless of sender
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 100); // Small delay to ensure DOM is updated
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim() && onSendMessage) {
      console.log('🚀 Sending message:', {
        newMessage: newMessage.trim(),
        socket: !!socket,
        isConnected,
        chatRoomId,
        currentUser: currentUser?._id
      });
      
      // ส่งข้อความผ่าน Socket.IO เท่านั้น (ไม่ส่งผ่าน parent component)
      if (socket && isConnected) {
        const messageData = {
          chatRoomId: chatRoomId,
          senderId: currentUser._id,
          content: newMessage.trim(),
          messageType: 'text'
        };
        
        console.log('📤 Emitting send-message:', messageData);
        socket.emit('send-message', messageData);
        
        // สร้างข้อความชั่วคราวเพื่อแสดงใน UI ทันที
        const tempMessage = {
          _id: `temp_${Date.now()}`,
          content: newMessage.trim(),
          senderId: currentUser._id,
          timestamp: new Date(),
          isDelivered: false,
          isRead: false,
          sender: currentUser,
          messageType: 'text',
          isTemporary: true // ระบุว่าเป็นข้อความชั่วคราว
        };
        
        // ส่งข้อความชั่วคราวไปยัง parent component เพื่อแสดงใน UI ทันที
        onSendMessage(null, null, tempMessage, 'temp-message');
        
        // อัปเดต UI ทันที
        setNewMessage('');
        
        // Debug: ตรวจสอบว่า socket ยังเชื่อมต่ออยู่หรือไม่
        setTimeout(() => {
          console.log('🔍 Socket status after send:', {
            connected: socket.connected,
            id: socket.id
          });
        }, 100);
      } else {
        console.log('⚠️ Socket not connected, using fallback');
        console.log('⚠️ Socket status:', {
          socket: !!socket,
          isConnected,
          socketConnected: socket?.connected
        });
        // ถ้า Socket.IO ไม่พร้อมใช้งาน ให้ส่งผ่าน parent component
        onSendMessage(newMessage.trim());
        setNewMessage('');
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && onSendMessage) {
      // ส่งไฟล์ผ่าน onSendMessage
      onSendMessage('', file);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    // จัดการกับ timestamp ที่อาจเป็น string หรือ Date object
    const date = new Date(timestamp);
    
    // ตรวจสอบว่า date ถูกต้องหรือไม่
    if (isNaN(date.getTime())) {
      console.warn('Invalid timestamp:', timestamp);
      return '';
    }
    
    return date.toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageStatus = (message) => {
    // ตรวจสอบสถานะการอ่าน
    if (message.isRead === true) return 'อ่านแล้ว';
    
    // ตรวจสอบสถานะการส่ง (ถ้า isDelivered เป็น true หรือ null/undefined ให้แสดงเครื่องหมายถูก)
    if (message.isDelivered === true || message.isDelivered === null || message.isDelivered === undefined) {
      return '✓';
    }
    
    // ถ้า isDelivered เป็น false แสดงว่าไม่ได้ส่ง
    if (message.isDelivered === false) {
      return '⏳'; // แสดงเครื่องหมายรอ
    }
    
    return ''; // ไม่แสดงเครื่องหมายถ้าไม่ทราบสถานะ
  };

  if (!otherUser) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดแชท...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] sm:h-[500px] bg-white rounded-none sm:rounded-lg shadow-none sm:shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-violet-500 text-white p-2 sm:p-4 flex-shrink-0 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center">
                {otherUser.profileImages?.[0] ? (
                  <img
                    src={otherUser.profileImages[0]}
                    alt={otherUser.displayName || otherUser.firstName || otherUser.name || 'Profile'}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-sm sm:text-lg font-semibold text-white">
                    {otherUser.firstName?.[0] || otherUser.displayName?.[0] || '👤'}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm sm:text-lg truncate">
                  {otherUser.displayName || otherUser.firstName || otherUser.name || 'ไม่ระบุชื่อ'}
                </h3>
                <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-white/90">
                  <span className={`flex items-center ${otherUser.isOnline ? 'text-green-200' : 'text-red-200'}`}>
                    <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mr-1 ${otherUser.isOnline ? 'bg-green-200' : 'bg-red-200'}`}></div>
                    {otherUser.isOnline ? 'ออนไลน์' : 'ออฟไลน์'}
                  </span>
                  {/* แสดงสถานะการเชื่อมต่อ Socket.IO */}
                  <span className="hidden sm:inline">•</span>
                  <span className={`flex items-center text-xs ${isConnected ? 'text-green-200' : 'text-red-200'}`}>
                    <div className={`w-1 h-1 rounded-full mr-1 ${isConnected ? 'bg-green-200' : 'bg-red-200'}`}></div>
                    {isConnected ? 'Real-time' : 'Offline'}
                  </span>
                  {otherUser.lastActive && (
                    <>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline">ออนไลน์ล่าสุด {formatTime(otherUser.lastActive)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10">
              <Phone className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10">
              <VideoCall className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4 bg-gray-50">
        {isLoading ? (
          <div className="text-center py-6 sm:py-8">
            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-pink-500 mx-auto mb-3 sm:mb-4"></div>
            <p className="text-gray-500 text-sm sm:text-base">กำลังโหลดข้อความ...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-6 sm:py-12">
            <div className="w-10 h-10 sm:w-16 sm:h-16 bg-gradient-to-br from-pink-100 to-violet-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4">
              <span className="text-lg sm:text-2xl">💬</span>
            </div>
            <h3 className="text-sm sm:text-lg font-semibold text-gray-700 mb-1 sm:mb-2">เริ่มการสนทนาใหม่</h3>
            <p className="text-gray-500 text-xs sm:text-sm px-2 sm:px-4">
              ส่งข้อความแรกเพื่อเริ่มการสนทนากับ {otherUser.displayName || otherUser.firstName || otherUser.name || 'ผู้ใช้นี้'}
            </p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwnMessage = message.senderId === currentUser._id;
            
            // แสดง avatar สำหรับข้อความแรกของแต่ละ sender หรือข้อความที่ไม่มีข้อความก่อนหน้า
            const showAvatar = !isOwnMessage && (
              index === 0 || 
              !messages[index - 1] ||
              messages[index - 1].senderId !== message.senderId ||
              messages[index - 1].senderId === undefined ||
              messages[index - 1].senderId === null
            );

            // คำนวณ margin สำหรับข้อความที่ส่งต่อมาของ account เดียวกัน
            const isConsecutiveMessage = !isOwnMessage && 
              index > 0 && 
              messages[index - 1] &&
              messages[index - 1].senderId === message.senderId &&
              messages[index - 1].senderId !== undefined &&
              messages[index - 1].senderId !== null;

            return (
              <div
                key={message._id || index}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                ref={(el) => {
                  if (el) messageRefs.current[message._id || index] = el;
                }}
                data-message-id={message._id || index}
              >
                <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                  {/* Message Content with Avatar */}
                  <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    {/* Avatar */}
                    {showAvatar && (
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-pink-400 to-violet-500 rounded-full flex items-center justify-center flex-shrink-0">
                        {otherUser.profileImages?.[0] ? (
                          <img
                            src={otherUser.profileImages[0]}
                            alt={otherUser.displayName || otherUser.firstName || otherUser.name || 'Profile'}
                            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="text-xs sm:text-sm font-semibold text-white">
                            {otherUser.firstName?.[0] || otherUser.displayName?.[0] || '👤'}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Message Content */}
                    <div className={`px-3 py-2 sm:px-4 sm:py-2 rounded-2xl ${
                      isOwnMessage
                        ? 'bg-gradient-to-r from-pink-500 to-violet-500 text-white'
                        : 'bg-white text-gray-800 border border-gray-200'
                    } shadow-sm ${isConsecutiveMessage ? 'ml-8 sm:ml-10' : ''}`}>
                      {message.content && (
                        <p className="text-xs sm:text-sm leading-relaxed">{message.content}</p>
                      )}
                      
                      {/* File attachment */}
                      {message.fileUrl && (
                        <div className="mt-2">
                          {message.fileType?.startsWith('image/') ? (
                            <img
                              src={message.fileUrl}
                              alt="Shared image"
                              className="max-w-32 max-h-32 sm:max-w-48 sm:max-h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => {
                                // Open image in modal
                                window.open(message.fileUrl, '_blank');
                              }}
                            />
                          ) : message.fileType?.startsWith('video/') ? (
                            <video
                              src={message.fileUrl}
                              controls
                              className="max-w-32 max-h-32 sm:max-w-48 sm:max-h-48 rounded-lg"
                            />
                          ) : (
                            <div className="flex items-center space-x-2 p-2 bg-white/20 rounded-lg">
                              <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="text-xs sm:text-sm">ไฟล์แนบ</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Message time and status - positioned below message content */}
                  <div className={`text-xs mt-1 ${
                    isOwnMessage ? 'text-gray-500 text-right' : 'text-gray-500 text-left'
                  }`} style={{
                    marginLeft: isOwnMessage ? '0' : (showAvatar ? '40px' : (isConsecutiveMessage ? '40px' : '8px')),
                    marginRight: isOwnMessage ? '0' : '0',
                    paddingLeft: isOwnMessage ? '0' : (showAvatar ? '0' : (isConsecutiveMessage ? '0' : '8px')),
                    width: 'fit-content',
                    display: 'block'
                  }}>
                    <span>{formatTime(message.timestamp)}</span>
                    {isOwnMessage && getMessageStatus(message) && (
                      <span className="text-gray-500 font-medium ml-1">{getMessageStatus(message)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {/* Typing indicator - แสดงเฉพาะเมื่ออีก Account กำลังพิมพ์ */}
        {isOtherUserTyping && (
          <div className="flex justify-start">
            <div className="flex items-center space-x-2 bg-white px-3 py-2 sm:px-4 sm:py-2 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-pink-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-xs text-gray-600 font-medium">
                {otherUser.displayName || otherUser.firstName || otherUser.name || 'ผู้ใช้นี้'} กำลังพิมพ์...
              </span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-2 sm:p-4 bg-white flex-shrink-0 relative z-10 pb-4 sm:pb-6">
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Attachment button */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              className="text-gray-500 hover:text-pink-500 hover:bg-pink-50 h-8 w-8 sm:h-10 sm:w-10"
            >
              <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            
            {/* Attachment menu */}
            {showAttachmentMenu && (
              <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 space-y-1 z-10">
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowAttachmentMenu(false);
                  }}
                  className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  <ImageIcon className="h-4 w-4" />
                  <span>รูปภาพ</span>
                </button>
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowAttachmentMenu(false);
                  }}
                  className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  <Video className="h-4 w-4" />
                  <span>วิดีโอ</span>
                </button>
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowAttachmentMenu(false);
                  }}
                  className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  <FileText className="h-4 w-4" />
                  <span>ไฟล์</span>
                </button>
              </div>
            )}
          </div>

          {/* Emoji button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-gray-500 hover:text-pink-500 hover:bg-pink-50 h-8 w-8 sm:h-10 sm:w-10"
          >
            <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>

          {/* Message input */}
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="พิมพ์ข้อความ"
            className="flex-1 border-gray-200 focus:border-pink-500 focus:ring-pink-500 text-sm sm:text-base h-8 sm:h-10 rounded-full"
          />

          {/* Send button */}
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white px-3 sm:px-4 py-2 rounded-full transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 h-8 sm:h-10"
          >
            <Send className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default PrivateChat;

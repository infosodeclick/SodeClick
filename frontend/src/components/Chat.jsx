import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { io } from 'socket.io-client';
import { Send, MessageCircle, Users, Lock, Loader2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Input } from './ui/input';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';

// Chat input component - moved outside to prevent re-creation
const ChatInput = memo(({ value, onChange, onSend, placeholder, disabled }) => {
  const inputRef = useRef(null);
  
  return (
    <div className="flex gap-2 p-4 border-t bg-white">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        placeholder={placeholder}
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (value.trim()) {
              onSend();
            }
          }
        }}
        className="flex-1"
      />
      <Button
        onClick={onSend}
        disabled={!value.trim() || disabled}
        className="px-4"
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
  );
});

ChatInput.displayName = 'ChatInput';

const Chat = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('public');
  const [socket, setSocket] = useState(null);
  const [publicMessages, setPublicMessages] = useState([]);
  const [communityMessages, setCommunityMessages] = useState([]);
  const [privateMessages, setPrivateMessages] = useState([]);
  const [publicInput, setPublicInput] = useState('');
  const [communityInput, setCommunityInput] = useState('');
  const [privateInput, setPrivateInput] = useState('');
  const [onlineUsers, setOnlineUsers] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [selectedPrivateUser, setSelectedPrivateUser] = useState(null);
  const [privateChats, setPrivateChats] = useState([]);
  
  const messagesEndRef = useRef(null);
  const publicMessagesEndRef = useRef(null);
  const communityMessagesEndRef = useRef(null);
  const privateMessagesEndRef = useRef(null);

  // Scroll to bottom helper
  const scrollToBottom = (ref) => {
    ref?.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initialize socket connection
  useEffect(() => {
    if (!user) return;

    const socketUrl = API_BASE_URL || window.location.origin;
    console.log('🔌 Connecting to socket:', socketUrl);

    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setIsConnected(true);

      // Join public room
      newSocket.emit('join-room', {
        roomId: 'public',
        userId: user._id,
        token: localStorage.getItem('token'),
      });

      // Join community room (if exists)
      newSocket.emit('join-room', {
        roomId: 'community',
        userId: user._id,
        token: localStorage.getItem('token'),
      });

      // Load initial messages after joining rooms
      setTimeout(() => {
        // Load public messages
        fetch(`${API_BASE_URL}/api/chat/rooms/public/messages`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.messages) {
              setPublicMessages(data.messages.reverse());
            }
          })
          .catch((err) => console.error('Error loading public messages:', err));

        // Load community messages
        fetch(`${API_BASE_URL}/api/chat/rooms/community/messages`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.messages) {
              setCommunityMessages(data.messages.reverse());
            }
          })
          .catch((err) => console.error('Error loading community messages:', err));
      }, 500);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      setIsConnected(false);
    });

    // Listen for new messages
    newSocket.on('room-message', (data) => {
      console.log('📨 Received room message:', data);
      
      const message = {
        _id: data._id || Date.now().toString(),
        content: data.content,
        sender: data.sender,
        messageType: data.messageType || 'text',
        imageUrl: data.imageUrl || data.fileInfo?.fileUrl || data.fileUrl,
        createdAt: data.createdAt || new Date(),
        chatRoom: data.chatRoom,
      };

      // Check if this is our own message (to replace temp message)
      const isOwnMessage = data.sender?._id === user._id || data.sender?._id?.toString() === user._id?.toString();
      
      if (data.chatRoom === 'public') {
        setPublicMessages((prev) => {
          // If it's our own message, check if we have a temp message with same content
          if (isOwnMessage) {
            // Find and replace temp message with same content (within last 5 seconds)
            const now = Date.now();
            const tempIndex = prev.findIndex((msg) => {
              if (!msg._id?.startsWith('temp_')) return false;
              if (msg.content !== message.content) return false;
              // Check if temp message was created recently (within 5 seconds)
              const msgTime = msg.createdAt instanceof Date ? msg.createdAt.getTime() : new Date(msg.createdAt).getTime();
              const newMsgTime = message.createdAt instanceof Date ? message.createdAt.getTime() : new Date(message.createdAt).getTime();
              return Math.abs(newMsgTime - msgTime) < 5000; // 5 seconds tolerance
            });
            if (tempIndex !== -1) {
              // Replace temp message with real message
              const updated = [...prev];
              updated[tempIndex] = message;
              return updated;
            }
          }
          
          // Check if message already exists (prevent duplicates)
          const exists = prev.some((msg) => {
            // Same message ID
            if (msg._id === message._id) return true;
            // Same content from same sender within 2 seconds (duplicate prevention)
            if (msg.content === message.content && 
                (msg.sender?._id === message.sender?._id || 
                 msg.sender?._id?.toString() === message.sender?._id?.toString())) {
              const msgTime = msg.createdAt instanceof Date ? msg.createdAt.getTime() : new Date(msg.createdAt).getTime();
              const newMsgTime = message.createdAt instanceof Date ? message.createdAt.getTime() : new Date(message.createdAt).getTime();
              return Math.abs(newMsgTime - msgTime) < 2000; // 2 seconds tolerance
            }
            return false;
          });
          
          if (exists) {
            return prev; // Don't add duplicate
          }
          
          return [...prev, message];
        });
        setTimeout(() => scrollToBottom(publicMessagesEndRef), 100);
      } else if (data.chatRoom === 'community') {
        setCommunityMessages((prev) => {
          // If it's our own message, check if we have a temp message with same content
          if (isOwnMessage) {
            const tempIndex = prev.findIndex((msg) => {
              if (!msg._id?.startsWith('temp_')) return false;
              if (msg.content !== message.content) return false;
              const msgTime = msg.createdAt instanceof Date ? msg.createdAt.getTime() : new Date(msg.createdAt).getTime();
              const newMsgTime = message.createdAt instanceof Date ? message.createdAt.getTime() : new Date(message.createdAt).getTime();
              return Math.abs(newMsgTime - msgTime) < 5000;
            });
            if (tempIndex !== -1) {
              const updated = [...prev];
              updated[tempIndex] = message;
              return updated;
            }
          }
          
          // Check if message already exists
          const exists = prev.some((msg) => {
            if (msg._id === message._id) return true;
            if (msg.content === message.content && 
                (msg.sender?._id === message.sender?._id || 
                 msg.sender?._id?.toString() === message.sender?._id?.toString())) {
              const msgTime = msg.createdAt instanceof Date ? msg.createdAt.getTime() : new Date(msg.createdAt).getTime();
              const newMsgTime = message.createdAt instanceof Date ? message.createdAt.getTime() : new Date(message.createdAt).getTime();
              return Math.abs(newMsgTime - msgTime) < 2000;
            }
            return false;
          });
          
          if (exists) {
            return prev;
          }
          
          return [...prev, message];
        });
        setTimeout(() => scrollToBottom(communityMessagesEndRef), 100);
      } else if (data.chatRoom && data.chatRoom.startsWith('private_')) {
        setPrivateMessages((prev) => {
          // If it's our own message, check if we have a temp message with same content
          if (isOwnMessage) {
            const tempIndex = prev.findIndex((msg) => {
              if (!msg._id?.startsWith('temp_')) return false;
              if (msg.content !== message.content) return false;
              const msgTime = msg.createdAt instanceof Date ? msg.createdAt.getTime() : new Date(msg.createdAt).getTime();
              const newMsgTime = message.createdAt instanceof Date ? message.createdAt.getTime() : new Date(message.createdAt).getTime();
              return Math.abs(newMsgTime - msgTime) < 5000;
            });
            if (tempIndex !== -1) {
              const updated = [...prev];
              updated[tempIndex] = message;
              return updated;
            }
          }
          
          // Check if message already exists
          const exists = prev.some((msg) => {
            if (msg._id === message._id) return true;
            if (msg.content === message.content && 
                (msg.sender?._id === message.sender?._id || 
                 msg.sender?._id?.toString() === message.sender?._id?.toString())) {
              const msgTime = msg.createdAt instanceof Date ? msg.createdAt.getTime() : new Date(msg.createdAt).getTime();
              const newMsgTime = message.createdAt instanceof Date ? message.createdAt.getTime() : new Date(message.createdAt).getTime();
              return Math.abs(newMsgTime - msgTime) < 2000;
            }
            return false;
          });
          
          if (exists) {
            return prev;
          }
          
          return [...prev, message];
        });
        setTimeout(() => scrollToBottom(privateMessagesEndRef), 100);
      }
    });

    // Listen for online count updates
    newSocket.on('online-count-updated', (data) => {
      setOnlineUsers((prev) => ({
        ...prev,
        [data.roomId]: data.onlineCount,
      }));
    });

    // Listen for errors
    newSocket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [user]);

  // Send message handlers - useCallback to prevent re-creation
  const sendPublicMessage = useCallback(() => {
    if (!publicInput.trim() || !socket || !user) return;

    const tempId = `temp_${Date.now()}`;
    const message = {
      content: publicInput.trim(),
      senderId: user._id,
      chatRoomId: 'public',
      messageType: 'text',
      tempId,
    };

    socket.emit('send-message', {
      ...message,
      token: localStorage.getItem('token'),
    });

    // Optimistically add message
    setPublicMessages((prev) => [
      ...prev,
      {
        _id: tempId,
        content: publicInput.trim(),
        sender: {
          _id: user._id,
          displayName: user.displayName || user.username,
          username: user.username,
          profileImages: user.profileImages || [],
        },
        messageType: 'text',
        createdAt: new Date(),
        chatRoom: 'public',
      },
    ]);

    setPublicInput('');
    setTimeout(() => scrollToBottom(publicMessagesEndRef), 100);
  }, [publicInput, socket, user]);

  const sendCommunityMessage = useCallback(() => {
    if (!communityInput.trim() || !socket || !user) return;

    const tempId = `temp_${Date.now()}`;
    const message = {
      content: communityInput.trim(),
      senderId: user._id,
      chatRoomId: 'community',
      messageType: 'text',
      tempId,
    };

    socket.emit('send-message', {
      ...message,
      token: localStorage.getItem('token'),
    });

    // Optimistically add message
    setCommunityMessages((prev) => [
      ...prev,
      {
        _id: tempId,
        content: communityInput.trim(),
        sender: {
          _id: user._id,
          displayName: user.displayName || user.username,
          username: user.username,
          profileImages: user.profileImages || [],
        },
        messageType: 'text',
        createdAt: new Date(),
        chatRoom: 'community',
      },
    ]);

    setCommunityInput('');
    setTimeout(() => scrollToBottom(communityMessagesEndRef), 100);
  }, [communityInput, socket, user]);

  const sendPrivateMessage = useCallback(() => {
    if (!privateInput.trim() || !socket || !user || !selectedPrivateUser) return;

    const roomId = `private_${[user._id, selectedPrivateUser._id].sort().join('_')}`;
    const tempId = `temp_${Date.now()}`;
    const message = {
      content: privateInput.trim(),
      senderId: user._id,
      chatRoomId: roomId,
      messageType: 'text',
      tempId,
    };

    socket.emit('join-room', {
      roomId,
      userId: user._id,
      token: localStorage.getItem('token'),
    });

    socket.emit('send-message', {
      ...message,
      token: localStorage.getItem('token'),
    });

    // Optimistically add message
    setPrivateMessages((prev) => [
      ...prev,
      {
        _id: tempId,
        content: privateInput.trim(),
        sender: {
          _id: user._id,
          displayName: user.displayName || user.username,
          username: user.username,
          profileImages: user.profileImages || [],
        },
        messageType: 'text',
        createdAt: new Date(),
        chatRoom: roomId,
      },
    ]);

    setPrivateInput('');
    setTimeout(() => scrollToBottom(privateMessagesEndRef), 100);
  }, [privateInput, socket, user, selectedPrivateUser]);

  // Stable onChange handlers
  const handlePublicInputChange = useCallback((value) => {
    setPublicInput(value);
  }, []);

  const handleCommunityInputChange = useCallback((value) => {
    setCommunityInput(value);
  }, []);

  const handlePrivateInputChange = useCallback((value) => {
    setPrivateInput(value);
  }, []);

  // Format time
  const formatTime = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // Message component
  const MessageItem = ({ message, isOwn }) => (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-start gap-2 max-w-[80%]`}>
        {!isOwn && (
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage
              src={
                message.sender?.profileImages?.[0] ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  message.sender?.displayName || message.sender?.username || 'User'
                )}&background=random`
              }
            />
            <AvatarFallback>
              {(message.sender?.displayName || message.sender?.username || 'U')[0]}
            </AvatarFallback>
          </Avatar>
        )}
        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          {!isOwn && (
            <span className="text-xs text-gray-500 mb-1">
              {message.sender?.displayName || message.sender?.username || 'Unknown'}
            </span>
          )}
          <div
            className={`rounded-2xl px-4 py-2 ${
              isOwn
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            {message.messageType === 'image' && (message.imageUrl || message.fileInfo?.fileUrl) ? (
              <img
                src={message.imageUrl || message.fileInfo?.fileUrl}
                alt="Message"
                className="max-w-xs rounded-lg"
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
            )}
          </div>
          <span className="text-xs text-gray-400 mt-1">
            {formatTime(message.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">กรุณาเข้าสู่ระบบเพื่อใช้งานแชท</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Connection Status */}
      {!isConnected && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-yellow-600" />
          <span className="text-sm text-yellow-800">กำลังเชื่อมต่อ...</span>
        </div>
      )}

      {/* Chat Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 bg-white border-b rounded-none">
          <TabsTrigger value="public" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            สาธารณะ
            {onlineUsers.public > 0 && (
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                {onlineUsers.public}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="community" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            คอมมูนิตี้
            {onlineUsers.community > 0 && (
              <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                {onlineUsers.community}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="private" className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            ส่วนตัว
          </TabsTrigger>
        </TabsList>

        {/* Public Chat */}
        <TabsContent value="public" className="flex-1 flex flex-col m-0 p-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {publicMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">ยังไม่มีข้อความ</p>
                  <p className="text-gray-300 text-xs mt-1">เริ่มแชทเลย!</p>
                </div>
              </div>
            ) : (
              <>
                {publicMessages.map((message) => (
                  <MessageItem
                    key={message._id}
                    message={message}
                    isOwn={message.sender?._id === user._id}
                  />
                ))}
                <div ref={publicMessagesEndRef} />
              </>
            )}
          </div>
          <ChatInput
            value={publicInput}
            onChange={handlePublicInputChange}
            onSend={sendPublicMessage}
            placeholder="พิมพ์ข้อความ..."
            disabled={!isConnected}
          />
        </TabsContent>

        {/* Community Chat */}
        <TabsContent value="community" className="flex-1 flex flex-col m-0 p-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {communityMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">ยังไม่มีข้อความในคอมมูนิตี้</p>
                  <p className="text-gray-300 text-xs mt-1">เริ่มแชทเลย!</p>
                </div>
              </div>
            ) : (
              <>
                {communityMessages.map((message) => (
                  <MessageItem
                    key={message._id}
                    message={message}
                    isOwn={message.sender?._id === user._id}
                  />
                ))}
                <div ref={communityMessagesEndRef} />
              </>
            )}
          </div>
          <ChatInput
            value={communityInput}
            onChange={handleCommunityInputChange}
            onSend={sendCommunityMessage}
            placeholder="พิมพ์ข้อความคอมมูนิตี้..."
            disabled={!isConnected}
          />
        </TabsContent>

        {/* Private Chat */}
        <TabsContent value="private" className="flex-1 flex flex-col m-0 p-0">
          {!selectedPrivateUser ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <Lock className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">เลือกผู้ใช้เพื่อเริ่มแชท</p>
                <p className="text-gray-300 text-xs mt-1">ฟีเจอร์นี้จะพัฒนาในอนาคต</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {privateMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">ยังไม่มีข้อความ</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {privateMessages.map((message) => (
                      <MessageItem
                        key={message._id}
                        message={message}
                        isOwn={message.sender?._id === user._id}
                      />
                    ))}
                    <div ref={privateMessagesEndRef} />
                  </>
                )}
              </div>
              <ChatInput
                value={privateInput}
                onChange={handlePrivateInputChange}
                onSend={sendPrivateMessage}
                placeholder="พิมพ์ข้อความส่วนตัว..."
                disabled={!isConnected}
              />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Chat;


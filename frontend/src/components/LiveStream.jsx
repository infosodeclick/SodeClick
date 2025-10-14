import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, Send, Heart, X, Radio, Eye, Plus, Settings, Play, Square, Trash2, MoreVertical } from 'lucide-react';
import CreateStreamModal from './CreateStreamModal';
import StreamPlayer from './StreamPlayer';
import StreamSettingsModal from './StreamSettingsModal';
import CustomAlert from './CustomAlert';
import ErrorBoundary from './ErrorBoundary';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const LiveStream = () => {
  const { user } = useAuth();
  const [liveRooms, setLiveRooms] = useState([]);
  const [selectedStream, setSelectedStream] = useState(null);
  const [viewers, setViewers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [canSendMessage, setCanSendMessage] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isStartingStream, setIsStartingStream] = useState(false);
  const [showStreamSettings, setShowStreamSettings] = useState(false);
  const [viewMode, setViewMode] = useState('view'); // 'view' or 'manage'
  
  // Mobile responsive states
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAdminPopup, setShowAdminPopup] = useState(false);
  
  // Custom Alert states
  const [alertState, setAlertState] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'ตกลง',
    showCancel: false,
    cancelText: 'ยกเลิก',
    onConfirm: null,
    onCancel: null
  });
  
  // Check if user is admin
  const isAdmin = user && (user.isAdmin === true || user.isSuperAdmin === true || user.role === 'admin' || user.role === 'superadmin');

  // Helper functions for CustomAlert
  const showAlert = (type, title, message, confirmText = 'ตกลง') => {
    setAlertState({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      showCancel: false,
      onConfirm: null,
      onCancel: null
    });
  };

  const showConfirm = (type, title, message, onConfirm, onCancel = null, confirmText = 'ยืนยัน', cancelText = 'ยกเลิก') => {
    setAlertState({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      showCancel: true,
      cancelText,
      onConfirm,
      onCancel
    });
  };

  const closeAlert = () => {
    setAlertState(prev => ({ ...prev, isOpen: false }));
  };
  
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // Fetch live streams
  useEffect(() => {
    fetchLiveStreams();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchLiveStreams, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-select first stream for admin users
  useEffect(() => {
    if (liveRooms.length > 0 && isAdmin && !selectedStream) {
      console.log('🎯 [LiveStream] Auto-selecting first stream for admin user');
      const firstStream = liveRooms[0];
      selectStream(firstStream);
    }
  }, [liveRooms, isAdmin, selectedStream]);

  // Check if mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check socket connection status and ensure connection
  useEffect(() => {
    const ensureSocketConnection = async () => {
      console.log('🔍 [LiveStream] Checking socket manager availability...');
      console.log('🔍 [LiveStream] Window object:', typeof window);
      console.log('🔍 [LiveStream] Window.socketManager:', window.socketManager);
      
      if (!window.socketManager) {
        console.warn('⚠️ [LiveStream] Socket manager not available, trying to initialize...');
        
        try {
          // Try to get socket manager from global
          const socketManager = await import('../services/socketManager');
          window.socketManager = socketManager.default;
          console.log('🔌 [LiveStream] Socket manager initialized:', !!window.socketManager);
          console.log('🔌 [LiveStream] Socket manager methods:', Object.keys(window.socketManager));
        } catch (error) {
          console.error('❌ [LiveStream] Failed to import socket manager:', error);
        }
      }

      if (window.socketManager) {
        console.log('📡 [LiveStream] Socket manager available, checking connection...');
        console.log('📡 [LiveStream] Socket manager socket:', window.socketManager.socket);
        console.log('📡 [LiveStream] Socket connected:', window.socketManager.socket?.connected);
        console.log('📡 [LiveStream] Socket ID:', window.socketManager.socket?.id);
        console.log('📡 [LiveStream] Socket transport:', window.socketManager.socket?.io?.engine?.transport?.name);
        console.log('📡 [LiveStream] Socket ready state:', window.socketManager.socket?.io?.engine?.readyState);
        
        if (!window.socketManager.socket || !window.socketManager.socket.connected) {
          console.log('🔄 [LiveStream] Socket not connected, attempting to connect...');
          try {
            const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
            console.log('🔄 [LiveStream] Connecting to:', baseURL);
            const socket = await window.socketManager.connect(baseURL);
            console.log('✅ [LiveStream] Socket connected successfully:', socket?.id);
            socketRef.current = socket;
          } catch (error) {
            console.error('❌ [LiveStream] Failed to connect socket:', error);
          }
        } else {
          console.log('✅ [LiveStream] Socket already connected:', window.socketManager.socket.id);
          socketRef.current = window.socketManager.socket;
        }
      }
    };

    const checkSocketConnection = () => {
      if (window.socketManager) {
        console.log('🔌 Socket connection status:', {
          hasSocketManager: !!window.socketManager,
          hasSocket: !!window.socketManager.socket,
          connected: window.socketManager.socket?.connected,
          socketId: window.socketManager.socket?.id
        });
      } else {
        console.warn('⚠️ Socket manager not available');
      }
    };

    // Ensure connection immediately
    ensureSocketConnection();

    // Check every 5 seconds
    const socketCheckInterval = setInterval(() => {
      checkSocketConnection();
      ensureSocketConnection();
    }, 5000);
    
    return () => clearInterval(socketCheckInterval);
  }, []);

  const fetchLiveStreams = async () => {
    try {
      console.log('📡 Fetching live streams...');
      
      // Fetch all streams (live + offline)
      const response = await fetch(`${API_BASE_URL}/api/stream/all`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Streams response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('📡 Streams fetched successfully:', data.data.length, 'streams');
        setLiveRooms(data.data);
        
        // Auto-select behavior based on user role
        if (!selectedStream && data.data.length > 0) {
          if (isAdmin) {
            // Admin: Show first stream but don't auto-join
            console.log('Admin user - showing first stream, manual selection required');
            const firstStream = data.data[0];
            setSelectedStream(firstStream);
            setViewers(firstStream.viewers || []);
            setViewerCount(firstStream.viewerCount || 0);
            setIsStreaming(firstStream.isLive || false);
          } else {
            // User: Auto-select first live stream
            const liveStreams = data.data.filter(stream => stream.isLive);
            const firstLiveStream = liveStreams.length > 0 ? liveStreams[0] : data.data[0];
            
            if (firstLiveStream) {
              selectStream(firstLiveStream);
            }
          }
        }
      } else {
        console.error('API returned error:', data.message);
      }
    } catch (error) {
      console.error('Error fetching streams:', error);
      showAlert('error', 'ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const selectStream = async (stream) => {
    console.log('🎯 [LiveStream] Selecting stream:', {
      streamId: stream._id,
      isLive: stream.isLive,
      title: stream.title
    });
    
    // Leave current stream if any
    if (selectedStream && socketRef.current) {
      console.log('🚪 [LiveStream] Leaving current stream:', selectedStream._id);
      socketRef.current.emit('leave-stream', {
        streamId: selectedStream._id,
        userId: user?.id
      });
    }

    setSelectedStream(stream);
    // Always start with empty messages for fresh chat
    setMessages([]);
    setViewers(stream.viewers || []);
    setViewerCount(stream.viewerCount || 0);
    setIsStreaming(stream.isLive || false);
    
    // Only join stream if it's live
    if (stream.isLive) {
      console.log('🎯 [LiveStream] Stream is live, joining stream...');
      // Ensure socket connection before joining stream
      if (!window.socketManager?.socket?.connected) {
        console.log('🔄 Socket not connected, attempting to connect before joining stream...');
        try {
          if (window.socketManager?.connect) {
            await window.socketManager.connect(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000');
            console.log('✅ Socket connected for stream join');
          }
        } catch (error) {
          console.error('❌ Failed to connect socket for stream join:', error);
        }
      }
      joinStream(stream._id);
    } else {
      console.log('🎯 [LiveStream] Stream is not live, clearing socket connection');
      // Clear any existing socket connection for offline streams
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
      }
    }
  };

  const joinStream = (streamId) => {
    if (!user) return;

    console.log('🔌 [LiveStream] Attempting to join stream:', {
      streamId,
      userId: user.id,
      socketConnected: !!socketRef.current,
      socketId: socketRef.current?.id
    });

    // Check if socket manager exists and is connected
    if (window.socketManager && window.socketManager.socket && window.socketManager.socket.connected) {
      socketRef.current = window.socketManager.socket;
      
      console.log('📡 [LiveStream] Socket manager found and connected:', {
        connected: socketRef.current.connected,
        id: socketRef.current.id
      });
      
      // Join stream
      console.log('📡 [LiveStream] Emitting join-stream event:', {
        streamId,
        userId: user.id,
        hasToken: !!localStorage.getItem('token'),
        socketId: socketRef.current.id
      });
      
      console.log('📡 [LiveStream] About to emit join-stream event to socket:', socketRef.current.id);
      socketRef.current.emit('join-stream', {
        streamId,
        userId: user.id,
        token: localStorage.getItem('token')
      });
      console.log('📡 [LiveStream] join-stream event emitted successfully');

      // Remove existing listeners first to prevent duplicates
      console.log('🎧 [LiveStream] Removing existing listeners...');
      socketRef.current.off('stream-joined', handleStreamJoined);
      socketRef.current.off('stream-viewer-joined', handleViewerJoined);
      socketRef.current.off('stream-viewer-left', handleViewerLeft);
      socketRef.current.off('stream-message-received', handleMessageReceived);
      socketRef.current.off('stream-liked', handleStreamLiked);
      socketRef.current.off('stream-started', handleStreamStarted);
      socketRef.current.off('stream-ended', handleStreamEnded);
      socketRef.current.off('stream-error', handleStreamError);

      // Listen for stream events
      console.log('🎧 [LiveStream] Setting up stream event listeners...');
      socketRef.current.on('stream-joined', handleStreamJoined);
      socketRef.current.on('stream-viewer-joined', handleViewerJoined);
      socketRef.current.on('stream-viewer-left', handleViewerLeft);
      socketRef.current.on('stream-message-received', handleMessageReceived);
      socketRef.current.on('stream-liked', handleStreamLiked);
      socketRef.current.on('stream-started', handleStreamStarted);
      socketRef.current.on('stream-ended', handleStreamEnded);
      socketRef.current.on('stream-error', handleStreamError);
      console.log('🎧 [LiveStream] Stream event listeners set up successfully');

      // Don't fetch old messages - start with fresh chat
      console.log('📺 Starting fresh chat - no old messages loaded');
    } else {
      console.error('❌ Socket manager not found or not connected');
      console.log('Window socket manager:', window.socketManager);
      console.log('Socket connected:', window.socketManager?.socket?.connected);
      
      // Try to reconnect socket
      if (window.socketManager && window.socketManager.connect) {
        console.log('🔄 Attempting to reconnect socket...');
        window.socketManager.connect(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000')
          .then(socket => {
            if (socket) {
              console.log('✅ Socket reconnected successfully');
              socketRef.current = socket;
              // Retry joining stream
              setTimeout(() => joinStream(streamId), 1000);
            }
          })
          .catch(error => {
            console.error('❌ Socket reconnection failed:', error);
          });
      } else {
        console.error('❌ Socket manager or connect method not available');
      }
    }
  };


  const handleStreamJoined = (data) => {
    console.log('✅ [LiveStream] Stream joined:', data);
    setViewers(data.viewers || []);
    setViewerCount(data.viewerCount || 0);
  };

  const handleStreamStarted = () => {
    console.log('Stream started');
    setIsStreaming(true);
    setIsStartingStream(false); // Reset starting state
    // Update selectedStream to reflect actual live status
    setSelectedStream(prev => ({ ...prev, isLive: true }));
    // Clear all messages when stream starts
    setMessages([]);
    console.log('📺 Chat messages cleared - starting fresh chat for new stream');
    
    // Add welcome message for new stream
    setTimeout(() => {
      setMessages(prev => [...prev, {
        _id: `welcome-${Date.now()}`,
        type: 'system',
        message: '🎉 ไลฟ์เริ่มต้นแล้ว! แชทเริ่มต้นใหม่',
        timestamp: new Date().toISOString()
      }]);
    }, 500);
  };

  const handleStreamEnded = () => {
    console.log('Stream ended');
    setIsStreaming(false);
    setIsStartingStream(false); // Reset starting state
    // Clear all chat messages when stream ends
    setMessages([]);
    console.log('📺 Chat messages cleared - stream ended');
    showAlert('info', 'ไลฟ์สิ้นสุด', 'ไลฟ์สตรีมสิ้นสุดแล้ว');
    setSelectedStream(null);
    fetchLiveStreams();
  };

  const handleViewerJoined = (data) => {
    console.log('Viewer joined:', data);
    setViewers(data.viewers || []);
    setViewerCount(data.viewerCount || 0);
    
    // Add system message
    setMessages(prev => [...prev, {
      _id: Date.now(),
      type: 'system',
      message: `${data.viewer.displayName} เข้าร่วมไลฟ์`,
      createdAt: new Date()
    }]);
  };

  const handleViewerLeft = (data) => {
    console.log('Viewer left:', data);
    setViewers(data.viewers || []);
    setViewerCount(data.viewerCount || 0);
  };

  const handleMessageReceived = (message) => {
    console.log('Message received:', message);
    
    setMessages(prev => {
      // Check if this is a duplicate of a temporary message
      if (message.tempId) {
        // Remove temporary message and add real message
        setSendingMessage(false); // Reset sending state when message is received
        return prev.filter(msg => msg._id !== message.tempId).concat([{
          ...message,
          isTemporary: false
        }]);
      }
      
      // Check if message already exists (prevent duplicates)
      const messageExists = prev.some(msg => 
        msg._id === message._id || 
        (msg.message === message.message && 
         msg.senderName === message.senderName && 
         Math.abs(new Date(msg.createdAt) - new Date(message.createdAt)) < 1000)
      );
      
      if (messageExists) {
        console.log('Duplicate message prevented:', message);
        return prev;
      }
      
      return [...prev, message];
    });
  };

  const handleStreamLiked = (data) => {
    console.log('Stream liked:', data);
    // Show like animation or update like count
  };


  const [lastErrorTime, setLastErrorTime] = useState(0);
  const ERROR_COOLDOWN = 5000; // 5 seconds

  const handleStreamError = (error) => {
    console.error('❌ [LiveStream] Stream error:', error);
    
    // Prevent spam alerts - only show once every 5 seconds
    const now = Date.now();
    if (now - lastErrorTime < ERROR_COOLDOWN) {
      return;
    }
    
    setLastErrorTime(now);
    
    // Only show alert for "Stream is not live" errors
    if (error.message === 'Stream is not live') {
      showAlert('warning', 'ไลฟ์ยังไม่เริ่ม', 'ไลฟ์สตรีมยังไม่ได้เริ่ม กรุณารอ DJ เริ่มไลฟ์');
    } else {
      showAlert('error', 'ข้อผิดพลาด', error.message || 'เกิดข้อผิดพลาด');
    }
  };

  const sendMessage = async () => {
    // Multiple layers of protection
    if (!selectedStream) {
      showAlert('warning', 'กรุณาเลือกห้องไลฟ์', 'กรุณาเลือกห้องไลฟ์ก่อนส่งข้อความ');
      setMessageInput(''); // Clear any text
      return;
    }
    
    if (!canSendMessage || !user || !messageInput.trim()) {
      if (!canSendMessage) {
        showAlert('warning', 'รอสักครู่', `กรุณารอ ${countdown} วินาทีก่อนส่งข้อความถัดไป`);
      }
      return;
    }

    // Prevent duplicate sending
    if (sendingMessage) {
      console.log('📤 [LiveStream] Message already being sent, ignoring duplicate');
      return;
    }

    setSendingMessage(true);
    
    const messageText = messageInput.trim();
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    
    console.log('📤 [LiveStream] Sending message:', {
      message: messageText,
      streamId: selectedStream._id,
      userId: user.id,
      socketRef: socketRef.current,
      socketConnected: !!socketRef.current,
      socketId: socketRef.current?.id,
      tempId,
      hasJoinedStream: !!socketRef.current?.streamId
    });

    // Ensure socket connection before sending message
    if (!window.socketManager?.socket?.connected) {
      console.log('🔄 Socket not connected, attempting to connect before sending message...');
      try {
        if (window.socketManager?.connect) {
          const socket = await window.socketManager.connect(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000');
          console.log('✅ Socket connected for message sending:', socket?.id);
          socketRef.current = socket;
        }
      } catch (error) {
        console.error('❌ Failed to connect socket for message sending:', error);
      }
    }

    // Force join stream room if not already joined
    if (!socketRef.current?.streamId || socketRef.current.streamId !== selectedStream._id) {
      console.log('🔌 [LiveStream] Force joining stream room before sending message...');
      joinStream(selectedStream._id);
      
      // Wait a bit for join to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Create temporary message for immediate display
    const tempMessage = {
      _id: tempId,
      message: messageText,
      senderName: user.displayName || user.username,
      sender: {
        _id: user.id,
        membership: user.membership
      },
      createdAt: new Date(),
      isTemporary: true
    };

    // Add temporary message immediately
    setMessages(prev => [...prev, tempMessage]);
    setMessageInput('');
    
    // Start cooldown (5 seconds)
    setCanSendMessage(false);
    setCountdown(5);
    
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanSendMessage(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Send via socket
    if (socketRef.current && socketRef.current.connected) {
      console.log('📡 [LiveStream] Emitting send-stream-message event:', {
        streamId: selectedStream._id,
        userId: user.id,
        message: messageText,
        hasToken: !!localStorage.getItem('token'),
        tempId: tempId,
        socketId: socketRef.current.id,
        socketRooms: Array.from(socketRef.current.rooms || []),
        socketConnected: socketRef.current.connected,
        socketTransport: socketRef.current.io?.engine?.transport?.name,
        socketReadyState: socketRef.current.io?.engine?.readyState,
        hasJoinedStream: !!socketRef.current?.streamId
      });
      
      console.log('📡 [LiveStream] About to emit event to socket:', socketRef.current.id);
      socketRef.current.emit('send-stream-message', {
        streamId: selectedStream._id,
        userId: user.id,
        message: messageText,
        token: localStorage.getItem('token'),
        tempId: tempId // Include temp ID to prevent duplicates
      });
      console.log('📡 [LiveStream] Event emitted successfully');
    } else {
      console.error('❌ Socket not connected or available');
      console.log('Socket ref:', socketRef.current);
      console.log('Socket connected:', socketRef.current?.connected);
      
      // Try to reconnect and retry sending
      if (window.socketManager && window.socketManager.connect) {
        console.log('🔄 Attempting to reconnect socket and retry sending...');
        window.socketManager.connect(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000')
          .then(socket => {
            if (socket && socket.connected) {
              console.log('✅ Socket reconnected, retrying message send');
              socketRef.current = socket;
              
              // Retry sending message
              socket.emit('send-stream-message', {
                streamId: selectedStream._id,
                userId: user.id,
                message: messageText,
                token: localStorage.getItem('token'),
                tempId: tempId
              });
            } else {
              throw new Error('Socket reconnection failed');
            }
          })
          .catch(error => {
            console.error('❌ Socket reconnection failed:', error);
            // Remove temporary message if all attempts fail
            setTimeout(() => {
              setMessages(prev => prev.filter(msg => msg._id !== tempId));
              showAlert('error', 'ส่งข้อความไม่สำเร็จ', 'ไม่สามารถส่งข้อความได้ กรุณาลองใหม่');
              setSendingMessage(false);
            }, 1000);
          });
      } else {
        // Remove temporary message if socket manager not available
        setTimeout(() => {
          setMessages(prev => prev.filter(msg => msg._id !== tempId));
          showAlert('error', 'ส่งข้อความไม่สำเร็จ', 'ไม่สามารถส่งข้อความได้ กรุณาลองใหม่');
          setSendingMessage(false);
        }, 1000);
      }
    }
  };

  const sendLike = () => {
    if (!user || !selectedStream) {
      if (!selectedStream) {
        showAlert('warning', 'กรุณาเลือกห้องไลฟ์', 'กรุณาเลือกห้องไลฟ์ก่อนส่งไลค์');
      }
      return;
    }

    if (socketRef.current) {
      socketRef.current.emit('stream-like', {
        streamId: selectedStream._id,
        userId: user.id,
        token: localStorage.getItem('token')
      });
    }
  };

  const startStream = async () => {
    if (!user || !selectedStream || !isAdmin) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showAlert('warning', 'กรุณาเข้าสู่ระบบ', 'กรุณาเข้าสู่ระบบก่อน');
        return;
      }

      console.log('📺 Starting stream:', selectedStream._id);
      
      const response = await fetch(`${API_BASE_URL}/api/stream/${selectedStream._id}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📺 Start stream response status:', response.status);

      const data = await response.json();
      
      if (data.success) {
        setIsStartingStream(true);
        // Don't set isLive to true yet - wait for actual stream to start
        // setSelectedStream(prev => ({ ...prev, isLive: true }));
        // Clear all chat messages when starting stream
        setMessages([]);
        console.log('📺 Chat messages cleared - waiting for actual stream to start');
        showAlert('success', 'เริ่มไลฟ์สำเร็จ', 'เริ่มไลฟ์สตรีมสำเร็จ! ตอนนี้สามารถเปิด OBS และเริ่มสตรีมได้');
      } else {
        showAlert('error', 'เริ่มไลฟ์ไม่สำเร็จ', data.message || 'เกิดข้อผิดพลาดในการเริ่มไลฟ์สตรีม');
      }
    } catch (error) {
      console.error('Error starting stream:', error);
      showAlert('error', 'ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const stopStream = async () => {
    if (!user || !selectedStream || !isAdmin) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/stream/${selectedStream._id}/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setIsStreaming(false);
        setIsStartingStream(false); // Reset starting state
        // Update selectedStream to reflect offline status
        setSelectedStream(prev => ({ ...prev, isLive: false }));
        // Clear all chat messages when stopping stream
        setMessages([]);
        console.log('📺 Chat messages cleared - stream stopped');
        showAlert('success', 'จบไลฟ์สำเร็จ', 'จบไลฟ์สตรีมสำเร็จ!');
      } else {
        showAlert('error', 'จบไลฟ์ไม่สำเร็จ', data.message || 'เกิดข้อผิดพลาดในการจบไลฟ์สตรีม');
      }
    } catch (error) {
      console.error('Error stopping stream:', error);
      showAlert('error', 'ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการจบไลฟ์สตรีม');
    }
  };

  const deleteStream = async () => {
    if (!user || !selectedStream || !isAdmin) return;

    showConfirm(
      'warning',
      'ยืนยันการลบ',
      'คุณแน่ใจหรือไม่ที่จะลบห้องไลฟ์สตรีมนี้? การกระทำนี้ไม่สามารถย้อนกลับได้',
      () => {
        performDeleteStream();
      },
      null,
      'ลบ',
      'ยกเลิก'
    );
  };

  const performDeleteStream = async () => {

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showAlert('warning', 'กรุณาเข้าสู่ระบบ', 'กรุณาเข้าสู่ระบบก่อน');
        return;
      }

      console.log('🗑️ Deleting stream:', selectedStream._id);
      
      const response = await fetch(`${API_BASE_URL}/api/stream/${selectedStream._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('🗑️ Delete response status:', response.status);

      const data = await response.json();
      
      if (data.success) {
        showAlert('success', 'ลบสำเร็จ', 'ลบห้องไลฟ์สตรีมสำเร็จ!');
        setSelectedStream(null);
        fetchLiveStreams(); // Refresh the list
      } else {
        showAlert('error', 'ลบไม่สำเร็จ', data.message || 'เกิดข้อผิดพลาดในการลบห้องไลฟ์สตรีม');
      }
    } catch (error) {
      console.error('Error deleting stream:', error);
      showAlert('error', 'ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  // Auto scroll to bottom when new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clear message input when selectedStream changes
  useEffect(() => {
    setMessageInput('');
  }, [selectedStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (selectedStream && socketRef.current) {
        socketRef.current.emit('leave-stream', {
          streamId: selectedStream._id,
          userId: user?.id
        });
        
        // Remove listeners
        socketRef.current.off('stream-joined', handleStreamJoined);
        socketRef.current.off('stream-viewer-joined', handleViewerJoined);
        socketRef.current.off('stream-viewer-left', handleViewerLeft);
        socketRef.current.off('stream-message-received', handleMessageReceived);
        socketRef.current.off('stream-liked', handleStreamLiked);
        socketRef.current.off('stream-started', handleStreamStarted);
        socketRef.current.off('stream-ended', handleStreamEnded);
        socketRef.current.off('stream-error', handleStreamError);
      }
    };
  }, [selectedStream, user]);

  const getAvatarColor = (name) => {
    const colors = [
      'from-red-500 to-pink-500',
      'from-blue-500 to-indigo-500',
      'from-green-500 to-teal-500',
      'from-purple-500 to-violet-500',
      'from-orange-500 to-red-500',
      'from-pink-500 to-rose-500'
    ];
    const index = (name || '').charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <Radio className="h-16 w-16 text-pink-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">กรุณาเข้าสู่ระบบ</h2>
          <p className="text-gray-600">เพื่อเข้าชมไลฟ์สตรีม</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        /* Fixed size for video player - matches video size exactly */
        .fixed-video-container {
          height: 450px !important;
          width: 100% !important;
          max-width: 800px !important;
          margin: 0 auto !important;
          flex-shrink: 0 !important;
          position: relative !important;
        }
        
        /* Ensure the container doesn't grow beyond 800px width */
        @media (min-width: 1200px) {
          .fixed-video-container {
            max-width: 800px !important;
          }
        }
        
        /* For smaller screens, maintain aspect ratio */
        @media (max-width: 768px) {
          .fixed-video-container {
            height: 400px !important;
            max-width: 100% !important;
          }
        }
      `}</style>
      
      {/* Mobile Layout */}
      {isMobile ? (
        <div className="min-h-screen bg-gray-100 flex flex-col">
          {/* Mobile Header */}
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 animate-pulse" />
              <h1 className="text-lg font-bold">Live Streams</h1>
            </div>
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 bg-white/20 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Mobile Menu Overlay */}
          {showMobileMenu && (
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowMobileMenu(false)}>
              <div className="w-80 h-full bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                {/* Mobile Sidebar Content */}
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <Radio className="h-5 w-5 animate-pulse" />
                      Live Streams
                    </h2>
                    <button
                      onClick={() => setShowMobileMenu(false)}
                      className="p-1 bg-white/20 rounded"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="text-xs text-white/80 mt-1">{liveRooms.length} ห้องกำลังไลฟ์</p>
                </div>
                
                <div className="p-2 overflow-y-auto h-full">
                  {/* Create Stream Button - Admin Only */}
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setShowCreateModal(true);
                        setShowMobileMenu(false);
                      }}
                      className="w-full p-3 mb-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="font-semibold">สร้างห้องไลฟ์</span>
                    </button>
                  )}

                  {liveRooms.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Radio className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">ยังไม่มีไลฟ์สตรีม</p>
                      {isAdmin && (
                        <p className="text-xs mt-1">เริ่มต้นสร้างห้องไลฟ์ของคุณ</p>
                      )}
                    </div>
                  ) : (
                    liveRooms.map(room => (
                      <div
                        key={room._id}
                        className={`p-3 rounded-lg mb-2 transition-all ${
                          selectedStream?._id === room._id
                            ? 'bg-gradient-to-r from-pink-100 to-purple-100 border-2 border-pink-500'
                            : room.isLive 
                              ? 'bg-green-50 border border-green-200' 
                              : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div className="mb-3">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-sm text-gray-800 truncate flex-1">
                              {room.title}
                            </h3>
                            {room.isLive ? (
                              <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                                LIVE
                              </span>
                            ) : (
                              <span className="text-xs bg-gray-400 text-white px-2 py-0.5 rounded-full">
                                OFFLINE
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Eye className="h-3 w-3" />
                            <span>{room.viewerCount || 0}</span>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          {isAdmin ? (
                            /* Admin: Show Manage button that opens popup */
                            <button
                              onClick={() => {
                                selectStream(room);
                                setViewMode('manage');
                                setShowAdminPopup(true);
                                setShowMobileMenu(false);
                              }}
                              className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-blue-100 hover:bg-blue-200 text-blue-700"
                            >
                              จัดการ
                            </button>
                          ) : (
                            /* User: Show Join button */
                            <button
                              onClick={() => {
                                selectStream(room);
                                setViewMode('view');
                                setShowMobileMenu(false);
                              }}
                              disabled={!room.isLive}
                              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                room.isLive
                                  ? 'bg-green-500 hover:bg-green-600 text-white'
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              เข้าร่วม
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mobile Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Video Player */}
            <div className="flex-1 bg-black relative">
              {selectedStream ? (
                <ErrorBoundary>
                  <StreamPlayer 
                    streamKey={selectedStream.streamKey}
                    isLive={selectedStream.isLive}
                    onError={(error) => console.error('Stream error:', error)}
                  />
                </ErrorBoundary>
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-900">
                  <div className="text-center text-white">
                    <div className="text-6xl mb-4">📺</div>
                    <h3 className="text-xl font-bold mb-2">เลือกห้องไลฟ์</h3>
                    <p className="text-gray-400 mb-4">กดปุ่มเมนูด้านบนเพื่อเลือกห้อง</p>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Chat */}
            {selectedStream && (
              <div className="h-64 bg-white border-t border-gray-200 flex flex-col">
                {/* Chat Header */}
                <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-pink-600">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    แชทไลฟ์
                  </h2>
                  <p className="text-xs text-white/80 mt-1">{viewerCount} คนกำลังดู</p>
                </div>
                
                {/* Chat Messages */}
                <div className="flex-1 p-3 overflow-y-auto">
                  {messages.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      <Send className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">ยังไม่มีข้อความ</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {messages.slice(-10).map((msg, index) => {
                        const uniqueKey = msg._id ? `${msg._id}-${index}` : `msg-${index}-${Date.now()}`;
                        
                        if (msg.type === 'system') {
                          return (
                            <div key={uniqueKey} className="text-center">
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                {msg.message}
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div key={uniqueKey} className={`flex items-start gap-2 ${msg.isTemporary ? 'opacity-70' : ''}`}>
                            <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${getAvatarColor(msg.senderName)} flex items-center justify-center flex-shrink-0`}>
                              <span className="text-white font-bold text-xs">
                                {msg.senderName?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-1">
                                <span className="font-semibold text-xs text-gray-800 truncate">
                                  {msg.senderName}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {new Date(msg.createdAt).toLocaleTimeString('th-TH', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </span>
                              </div>
                              <p className="text-xs text-gray-700 break-words">{msg.message}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="p-3 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={sendLike}
                      disabled={!selectedStream}
                      className="p-1.5 rounded-full bg-gradient-to-r from-pink-500 to-red-500 text-white hover:from-pink-600 hover:to-red-600 transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <Heart className="h-3 w-3" fill="currentColor" />
                    </button>
                    
                    {canSendMessage ? (
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            sendMessage();
                          }
                        }}
                        placeholder="พิมพ์ข้อความ..."
                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs"
                      />
                    ) : (
                      <div className="flex-1 px-2 py-1.5 border border-gray-300 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center cursor-not-allowed">
                        รอ {countdown} วินาที...
                      </div>
                    )}
                    
                    <button
                      onClick={sendMessage}
                      disabled={!canSendMessage || !messageInput.trim() || !selectedStream || sendingMessage}
                      className="p-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 disabled:hover:scale-100"
                    >
                      {sendingMessage ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Admin Popup */}
          {showAdminPopup && selectedStream && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800">จัดการสตรีม</h3>
                    <button
                      onClick={() => setShowAdminPopup(false)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
                <div className="p-4 space-y-4">
                  {/* Stream Info */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">ข้อมูลสตรีม</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Stream Key:</span>
                        <p className="text-gray-600 font-mono text-xs break-all">{selectedStream.streamKey}</p>
                      </div>
                      <div>
                        <span className="font-medium">HLS URL:</span>
                        <p className="text-gray-600 font-mono text-xs break-all">
                          {import.meta.env.VITE_HLS_PORT || 8000}/live/{selectedStream.streamKey}.m3u8
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Stream Controls */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800">ควบคุมการไลฟ์</h4>
                    
                    <div className="flex gap-2">
                      {!isStreaming && !isStartingStream ? (
                        <button
                          onClick={startStream}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                          <Play className="h-4 w-4" />
                          <span className="font-medium">เริ่มไลฟ์</span>
                        </button>
                      ) : isStartingStream ? (
                        <button
                          disabled
                          className="flex-1 bg-yellow-500 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-not-allowed"
                        >
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span className="font-medium">กำลังเริ่ม...</span>
                        </button>
                      ) : (
                        <button
                          onClick={stopStream}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                          <Square className="h-4 w-4" />
                          <span className="font-medium">จบไลฟ์</span>
                        </button>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowStreamSettings(true);
                          setShowAdminPopup(false);
                        }}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        <span className="font-medium">ตั้งค่า</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          deleteStream();
                          setShowAdminPopup(false);
                        }}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="font-medium">ลบ</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Desktop Layout */
        <div className="min-h-screen flex bg-gray-100">

          {/* Left Sidebar - Live Rooms List */}
          <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-pink-500 to-purple-600">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Radio className="h-5 w-5 animate-pulse" />
            Live Streams
          </h2>
          <p className="text-xs text-white/80 mt-1">{liveRooms.length} ห้องกำลังไลฟ์</p>
        </div>
        
        <div className="p-2">
          {/* Create Stream Button - Admin Only */}
          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full p-3 mb-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <Plus className="h-4 w-4" />
              <span className="font-semibold">สร้างห้องไลฟ์</span>
            </button>
          )}

          {liveRooms.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Radio className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">ยังไม่มีไลฟ์สตรีม</p>
              {isAdmin && (
                <p className="text-xs mt-1">เริ่มต้นสร้างห้องไลฟ์ของคุณ</p>
              )}
            </div>
          ) : (
            liveRooms.map(room => (
              <div
                key={room._id}
                className={`p-3 rounded-lg mb-2 transition-all ${
                  selectedStream?._id === room._id
                    ? 'bg-gradient-to-r from-pink-100 to-purple-100 border-2 border-pink-500'
                    : room.isLive 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-sm text-gray-800 truncate flex-1">
                      {room.title}
                    </h3>
                    {room.isLive ? (
                      <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                        LIVE
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-400 text-white px-2 py-0.5 rounded-full">
                        OFFLINE
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Eye className="h-3 w-3" />
                    <span>{room.viewerCount || 0}</span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                  {isAdmin ? (
                    /* Admin: Show only Manage button */
                    <button
                      onClick={() => {
                        selectStream(room);
                        setViewMode('manage');
                      }}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        selectedStream?._id === room._id && viewMode === 'manage'
                          ? 'bg-blue-500 text-white'
                          : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                      }`}
                    >
                      จัดการ
                    </button>
                  ) : (
                    /* User: Show only Join button (enabled only when live) */
                    <button
                      onClick={() => {
                        selectStream(room);
                        setViewMode('view');
                      }}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        room.isLive
                          ? 'bg-green-500 hover:bg-green-600 text-white'
                          : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                      }`}
                      disabled={!room.isLive}
                    >
                      {room.isLive ? 'เข้าไลฟ์' : 'ไม่สามารถเข้าได้'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Center - Stream Player and Chat */}
      <div className="flex-1 flex flex-col">
        {selectedStream ? (
          <>
            {/* Stream Player - Fixed size */}
            <div className="relative bg-black fixed-video-container">
              {isStartingStream ? (
                <div className="flex items-center justify-center h-full bg-gray-900">
                  <div className="text-center text-white">
                    <div className="text-6xl mb-4 animate-pulse">🎬</div>
                    <h3 className="text-xl font-bold mb-2">กำลังเริ่มไลฟ์...</h3>
                    {isAdmin ? (
                      <>
                        <p className="text-gray-400 mb-4">กรุณาเปิด OBS และเริ่มสตรีม</p>
                        <div className="bg-green-900 bg-opacity-50 rounded-lg p-4 mt-4">
                          <h4 className="font-semibold mb-2">สำหรับ DJ:</h4>
                          <div className="text-sm space-y-1 text-left">
                            <p>1. เปิด OBS Studio</p>
                            <p>2. ตั้งค่า Server: rtmp://localhost:1935/live</p>
                            <p>3. ตั้งค่า Stream Key: {selectedStream?.streamKey}</p>
                            <p>4. กด "Start Streaming" ใน OBS</p>
                            <p className="text-green-400">5. รอสักครู่ให้สตรีมเริ่มต้น (10-30 วินาที)</p>
                            <p className="text-blue-400">6. วิดีโอจะแสดงอัตโนมัติเมื่อสตรีมเริ่มต้น</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-400 mb-4">กรุณารอสักครู่</p>
                    )}
                  </div>
                </div>
              ) : selectedStream?.isLive ? (
                <ErrorBoundary>
                  <StreamPlayer 
                    streamKey={selectedStream.streamKey}
                    isLive={selectedStream.isLive}
                    onError={(error) => console.error('Stream error:', error)}
                  />
                </ErrorBoundary>
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-900">
                  <div className="text-center text-white">
                    <div className="text-6xl mb-4">📺</div>
                    <h3 className="text-xl font-bold mb-2">ไม่มีการไลฟ์ในขณะนี้</h3>
                    {isAdmin ? (
                      <>
                        <p className="text-gray-400 mb-4">รอ DJ เริ่มไลฟ์ใน OBS</p>
                        <div className="bg-blue-900 bg-opacity-50 rounded-lg p-4 mt-4">
                          <h4 className="font-semibold mb-2">สำหรับ DJ:</h4>
                          <div className="text-sm space-y-1 text-left">
                            <p>1. เปิด OBS Studio</p>
                            <p>2. ตั้งค่า Server: rtmp://localhost:1935/live</p>
                            <p>3. ตั้งค่า Stream Key: {selectedStream?.streamKey}</p>
                            <p>4. กด "Start Streaming" ใน OBS</p>
                            <p>5. ระบบจะอัปเดตสถานะเป็น LIVE อัตโนมัติ</p>
                            <p className="text-yellow-400">6. รอสักครู่ให้สตรีมเริ่มต้น (10-30 วินาที)</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-400 mb-4">กรุณารอสักครู่</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Admin Controls - Only show in manage mode */}
              {isAdmin && viewMode === 'manage' && (
                <div className="absolute top-4 right-4 flex gap-2">
                  {!isStreaming && !isStartingStream ? (
                    <button
                      onClick={startStream}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Play className="h-4 w-4" />
                      <span className="text-sm font-medium">เริ่มไลฟ์</span>
                    </button>
                  ) : isStartingStream ? (
                    <button
                      disabled
                      className="bg-yellow-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-not-allowed"
                    >
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span className="text-sm font-medium">กำลังเริ่ม...</span>
                    </button>
                  ) : (
                    <button
                      onClick={stopStream}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Square className="h-4 w-4" />
                      <span className="text-sm font-medium">จบไลฟ์</span>
                    </button>
                  )}
                  
                  {/* Settings Button */}
                  <button
                    onClick={() => setShowStreamSettings(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                  
                  {/* Delete Button */}
                  <button
                    onClick={deleteStream}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Viewer Count */}
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span className="font-semibold">{viewerCount}</span>
              </div>
            </div>

            {/* Admin Stream Info - Below video for admin */}
            {isAdmin && selectedStream && (
              <div className="bg-gray-100 p-4 border-t border-gray-200">
                <div className="max-w-4xl mx-auto">
                  <h4 className="font-semibold text-gray-800 mb-2">📡 ข้อมูลสตรีม (สำหรับ Admin)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-white p-3 rounded-lg border">
                      <p className="font-medium text-gray-700">Stream Key:</p>
                      <p className="text-gray-600 font-mono text-xs break-all">{selectedStream.streamKey}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <p className="font-medium text-gray-700">HLS URL:</p>
                      <p className="text-gray-600 font-mono text-xs break-all">
                        {import.meta.env.VITE_HLS_PORT || 8000}/live/{selectedStream.streamKey}.m3u8
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Controls Area - Only show for admin */}
            {isAdmin && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
                <div className="max-w-4xl mx-auto">
                  {viewMode === 'manage' ? (
                    <div className="text-center">
                      <div className="text-6xl mb-4">⚙️</div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">โหมดจัดการสตรีม</h3>
                      <p className="text-gray-600 mb-6">คุณกำลังอยู่ในโหมดจัดการสตรีม สามารถควบคุมการไลฟ์ได้</p>
                      
                      {/* Stream Control Buttons */}
                      <div className="flex gap-3 justify-center mb-6">
                        {!isStreaming && !isStartingStream ? (
                          <button
                            onClick={startStream}
                            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
                          >
                            <Play className="h-5 w-5" />
                            <span className="font-medium">เริ่มไลฟ์</span>
                          </button>
                        ) : isStartingStream ? (
                          <button
                            disabled
                            className="bg-yellow-500 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors cursor-not-allowed"
                          >
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            <span className="font-medium">กำลังเริ่ม...</span>
                          </button>
                        ) : (
                          <button
                            onClick={stopStream}
                            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
                          >
                            <Square className="h-5 w-5" />
                            <span className="font-medium">จบไลฟ์</span>
                          </button>
                        )}
                        
                        <button
                          onClick={() => setShowStreamSettings(true)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
                        >
                          <Settings className="h-5 w-5" />
                          <span className="font-medium">ตั้งค่า</span>
                        </button>
                        
                        <button
                          onClick={deleteStream}
                          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
                          <span className="font-medium">ลบ</span>
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <h4 className="font-semibold text-gray-800 mb-2">🎮 การควบคุมสตรีม</h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            <li>• เริ่ม/จบการไลฟ์</li>
                            <li>• ตั้งค่าห้องสตรีม</li>
                            <li>• ลบห้องสตรีม</li>
                          </ul>
                        </div>
                        
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <h4 className="font-semibold text-gray-800 mb-2">📺 การดูสตรีม</h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            <li>• ดูสตรีมและแชท</li>
                            <li>• ส่งข้อความในไลฟ์</li>
                            <li>• เห็นผู้ชมทั้งหมด</li>
                          </ul>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setViewMode('view')}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2 mx-auto"
                      >
                        <Eye className="h-4 w-4" />
                        เปลี่ยนเป็นโหมดดู
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-4xl mb-4">👁️</div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2">โหมดดูสตรีม</h3>
                      <p className="text-gray-600 mb-4">คุณกำลังอยู่ในโหมดดูสตรีม แชทอยู่ที่แถบขวา</p>
                      
                      <button
                        onClick={() => setViewMode('manage')}
                        className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2 mx-auto"
                      >
                        <Settings className="h-4 w-4" />
                        เปลี่ยนเป็นโหมดจัดการ
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Empty space for non-admin users */}
            {!isAdmin && (
              <div className="flex-1 bg-gray-50 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-2">📺</div>
                  <p className="text-sm">กำลังดูสตรีม</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
            <div className="text-center">
              <Radio className="h-20 w-20 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">เลือกห้องไลฟ์สตรีมจากด้านซ้าย</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Chat Area */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-pink-600">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Send className="h-5 w-5" />
            แชทไลฟ์
          </h2>
          <p className="text-xs text-white/80 mt-1">{viewerCount} คนกำลังดู</p>
        </div>
        
        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Send className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">ยังไม่มีข้อความ</p>
              <p className="text-xs mt-1">เริ่มต้นแชทกันเลย!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, index) => {
                const uniqueKey = msg._id ? `${msg._id}-${index}` : `msg-${index}-${Date.now()}`;
                
                if (msg.type === 'system') {
                  return (
                    <div key={uniqueKey} className="text-center">
                      <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        {msg.message}
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={uniqueKey} className={`flex items-start gap-2 ${msg.isTemporary ? 'opacity-70' : ''}`}>
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(msg.senderName)} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white font-bold text-xs">
                        {msg.senderName?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-800 truncate">
                          {msg.senderName}
                        </span>
                        {msg.sender?.membership?.tier && msg.sender.membership.tier !== 'member' && (
                          <span className="text-xs bg-gradient-to-r from-amber-400 to-orange-500 text-white px-2 py-0.5 rounded-full">
                            VIP
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {new Date(msg.createdAt).toLocaleTimeString('th-TH', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                        {msg.isTemporary && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                            กำลังส่ง...
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 break-words">{msg.message}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={sendLike}
              disabled={!selectedStream}
              className="p-2 rounded-full bg-gradient-to-r from-pink-500 to-red-500 text-white hover:from-pink-600 hover:to-red-600 transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Heart className="h-4 w-4" fill="currentColor" />
            </button>
            
            {selectedStream && canSendMessage ? (
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    sendMessage();
                  }
                }}
                placeholder="พิมพ์ข้อความ..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
              />
            ) : (
              <div className="flex-1 px-3 py-2 border border-gray-300 rounded-full bg-gray-100 text-gray-500 text-sm flex items-center cursor-not-allowed">
                {!selectedStream 
                  ? "กรุณาเลือกห้องไลฟ์ก่อน" 
                  : `รอ ${countdown} วินาที...`
                }
              </div>
            )}
            
            <button
              onClick={sendMessage}
              disabled={!canSendMessage || !messageInput.trim() || !selectedStream || sendingMessage}
              className="p-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 disabled:hover:scale-100"
            >
              {sendingMessage ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
          
          {!selectedStream && (
            <div className="text-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <span className="text-sm text-yellow-700 font-medium">
                ⚠️ กรุณาเลือกห้องไลฟ์ก่อนส่งข้อความ
              </span>
            </div>
          )}
          
          {!canSendMessage && selectedStream && (
            <div className="text-center">
              <span className="text-xs text-gray-500">
                กรุณารอ {countdown} วินาทีก่อนส่งข้อความถัดไป
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
    )}

    {/* Create Stream Modal */}
    <CreateStreamModal
      isOpen={showCreateModal}
      onClose={() => setShowCreateModal(false)}
      onStreamCreated={(newStream) => {
        // Refresh the live streams list
        fetchLiveStreams();
        // Optionally select the new stream
        if (newStream) {
          selectStream(newStream);
        }
      }}
    />

      {/* Stream Settings Modal */}
      <StreamSettingsModal
        isOpen={showStreamSettings}
        onClose={() => setShowStreamSettings(false)}
        stream={selectedStream}
        onSettingsUpdated={(updatedStream) => {
          // Update selected stream with new settings
          setSelectedStream(updatedStream);
          // Refresh the streams list
          fetchLiveStreams();
        }}
      />

      {/* Custom Alert Modal */}
      <CustomAlert
        isOpen={alertState.isOpen}
        onClose={closeAlert}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        confirmText={alertState.confirmText}
        showCancel={alertState.showCancel}
        cancelText={alertState.cancelText}
        onConfirm={alertState.onConfirm}
        onCancel={alertState.onCancel}
      />
    </>
  );
};

export default LiveStream;


import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, Send, Heart, X, Radio, Eye, Plus, Settings, Play, Square, Trash2, MoreVertical } from 'lucide-react';
import { getMainProfileImage } from '../utils/profileImageUtils';
import CreateStreamModal from './CreateStreamModal';
import StreamPlayer from './StreamPlayer';
import StreamSettingsModal from './StreamSettingsModal';
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
  const [viewerCount, setViewerCount] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showStreamSettings, setShowStreamSettings] = useState(false);
  const [viewMode, setViewMode] = useState('view'); // 'view' or 'manage'
  
  // Check if user is admin
  const isAdmin = user && (user.isAdmin === true || user.isSuperAdmin === true || user.role === 'admin' || user.role === 'superadmin');
  
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // Fetch live streams
  useEffect(() => {
    fetchLiveStreams();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchLiveStreams, 30000);
    return () => clearInterval(interval);
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
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const selectStream = (stream) => {
    // Leave current stream if any
    if (selectedStream && socketRef.current) {
      socketRef.current.emit('leave-stream', {
        streamId: selectedStream._id,
        userId: user?.id
      });
    }

    setSelectedStream(stream);
    setMessages([]);
    setViewers(stream.viewers || []);
    setViewerCount(stream.viewerCount || 0);
    setIsStreaming(stream.isLive || false);
    
    // Only join stream if it's live
    if (stream.isLive) {
      joinStream(stream._id);
    } else {
      // Clear any existing socket connection for offline streams
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
      }
    }
  };

  const joinStream = (streamId) => {
    if (!user) return;

    // Use global socket manager
    if (window.socketManager && window.socketManager.socket) {
      socketRef.current = window.socketManager.socket;
      
      // Join stream
      socketRef.current.emit('join-stream', {
        streamId,
        userId: user.id,
        token: localStorage.getItem('token')
      });

      // Listen for stream events
      socketRef.current.on('stream-joined', handleStreamJoined);
      socketRef.current.on('stream-viewer-joined', handleViewerJoined);
      socketRef.current.on('stream-viewer-left', handleViewerLeft);
      socketRef.current.on('stream-message-received', handleMessageReceived);
      socketRef.current.on('stream-liked', handleStreamLiked);
      socketRef.current.on('stream-started', handleStreamStarted);
      socketRef.current.on('stream-ended', handleStreamEnded);
      socketRef.current.on('stream-error', handleStreamError);

      // Only fetch messages if stream is live
      const currentStream = liveRooms.find(stream => stream._id === streamId);
      if (currentStream && currentStream.isLive) {
        fetchStreamMessages(streamId);
      }
    }
  };

  const fetchStreamMessages = async (streamId) => {
    try {
      // Only fetch messages if the stream is currently live
      const currentStream = liveRooms.find(stream => stream._id === streamId);
      if (!currentStream || !currentStream.isLive) {
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/stream/${streamId}/messages`);
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.data);
      }
    } catch (error) {
      console.error('Error fetching stream messages:', error);
    }
  };

  const handleStreamJoined = (data) => {
    console.log('Joined stream:', data);
    setViewers(data.viewers || []);
    setViewerCount(data.viewerCount || 0);
  };

  const handleStreamStarted = () => {
    console.log('Stream started');
    setIsStreaming(true);
  };

  const handleStreamEnded = () => {
    console.log('Stream ended');
    setIsStreaming(false);
    alert('ไลฟ์สตรีมสิ้นสุดแล้ว');
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
    setMessages(prev => [...prev, message]);
  };

  const handleStreamLiked = (data) => {
    console.log('Stream liked:', data);
    // Show like animation or update like count
  };


  const [lastErrorTime, setLastErrorTime] = useState(0);
  const ERROR_COOLDOWN = 5000; // 5 seconds

  const handleStreamError = (error) => {
    console.error('Stream error:', error);
    
    // Prevent spam alerts - only show once every 5 seconds
    const now = Date.now();
    if (now - lastErrorTime < ERROR_COOLDOWN) {
      return;
    }
    
    setLastErrorTime(now);
    
    // Only show alert for "Stream is not live" errors
    if (error.message === 'Stream is not live') {
      alert('ไลฟ์สตรีมยังไม่ได้เริ่ม กรุณารอ DJ เริ่มไลฟ์');
    } else {
      alert(error.message || 'เกิดข้อผิดพลาด');
    }
  };

  const sendMessage = () => {
    if (!messageInput.trim() || !canSendMessage || !user || !selectedStream) return;

    // Send via socket
    if (socketRef.current) {
      socketRef.current.emit('send-stream-message', {
        streamId: selectedStream._id,
        userId: user.id,
        message: messageInput.trim(),
        token: localStorage.getItem('token')
      });

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
    }
  };

  const sendLike = () => {
    if (!user || !selectedStream) return;

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
        alert('กรุณาเข้าสู่ระบบก่อน');
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
        setIsStreaming(true);
        // Update selectedStream to reflect live status
        setSelectedStream(prev => ({ ...prev, isLive: true }));
        alert('เริ่มไลฟ์สตรีมสำเร็จ! ตอนนี้สามารถเปิด OBS และเริ่มสตรีมได้');
      } else {
        alert(data.message || 'เกิดข้อผิดพลาดในการเริ่มไลฟ์สตรีม');
      }
    } catch (error) {
      console.error('Error starting stream:', error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
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
        // Update selectedStream to reflect offline status
        setSelectedStream(prev => ({ ...prev, isLive: false }));
        alert('จบไลฟ์สตรีมสำเร็จ!');
      } else {
        alert(data.message || 'เกิดข้อผิดพลาดในการจบไลฟ์สตรีม');
      }
    } catch (error) {
      console.error('Error stopping stream:', error);
      alert('เกิดข้อผิดพลาดในการจบไลฟ์สตรีม');
    }
  };

  const deleteStream = async () => {
    if (!user || !selectedStream || !isAdmin) return;

    const confirmDelete = window.confirm('คุณแน่ใจหรือไม่ที่จะลบห้องไลฟ์สตรีมนี้? การกระทำนี้ไม่สามารถย้อนกลับได้');
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('กรุณาเข้าสู่ระบบก่อน');
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
        alert('ลบห้องไลฟ์สตรีมสำเร็จ!');
        setSelectedStream(null);
        fetchLiveStreams(); // Refresh the list
      } else {
        alert(data.message || 'เกิดข้อผิดพลาดในการลบห้องไลฟ์สตรีม');
      }
    } catch (error) {
      console.error('Error deleting stream:', error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  // Auto scroll to bottom when new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    <div className="h-screen flex bg-gray-100">
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
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(room.streamerName)} flex items-center justify-center`}>
                      <span className="text-white font-bold text-sm">
                        {room.streamerName?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    {room.isLive ? (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white"></div>
                    ) : (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-gray-400 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-gray-800 truncate">
                        {room.streamerName}
                      </p>
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
                </div>
                <p className="text-xs text-gray-600 line-clamp-2 mb-3">{room.title}</p>
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                  {/* Join Stream Button - for viewing */}
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
                    {room.isLive ? 'เข้าไลฟ์' : 'ออฟไลน์'}
                  </button>
                  
                  {/* Manage Button - for admin only */}
                  {isAdmin && (
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
            {/* Stream Player */}
            <div className="relative">
              <ErrorBoundary>
                <StreamPlayer 
                  streamKey={selectedStream.streamKey}
                  isLive={selectedStream.isLive}
                  onError={(error) => console.error('Stream error:', error)}
                />
              </ErrorBoundary>
              
              {/* Admin Controls - Only show in manage mode */}
              {isAdmin && viewMode === 'manage' && (
                <div className="absolute top-4 right-4 flex gap-2">
                  {!isStreaming ? (
                    <button
                      onClick={startStream}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Play className="h-4 w-4" />
                      <span className="text-sm font-medium">เริ่มไลฟ์</span>
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

              {/* View Mode Toggle for Admin */}
              {isAdmin && selectedStream && (
                <div className="absolute top-4 left-4 flex gap-2 bg-black/50 backdrop-blur-sm rounded-lg p-2">
                  <button
                    onClick={() => setViewMode('view')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      viewMode === 'view'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    👁️ ดู
                  </button>
                  <button
                    onClick={() => setViewMode('manage')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      viewMode === 'manage'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    ⚙️ จัดการ
                  </button>
                </div>
              )}

              {/* Viewer Count */}
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span className="font-semibold">{viewerCount}</span>
              </div>
            </div>

            {/* Chat Area - Only show in view mode */}
            {viewMode === 'view' && (
              <div className="flex-1 bg-white p-4 overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                  {messages.map((msg, index) => {
                  const uniqueKey = msg._id ? `${msg._id}-${index}` : `msg-${index}-${Date.now()}`;
                  
                  if (msg.type === 'system') {
                    return (
                      <div key={uniqueKey} className="text-center my-2">
                        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                          {msg.message}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div key={uniqueKey} className="mb-3 flex items-start gap-2">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(msg.senderName)} flex items-center justify-center flex-shrink-0`}>
                        <span className="text-white font-bold text-xs">
                          {msg.senderName?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-gray-800">
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
                        </div>
                        <p className="text-sm text-gray-700 break-words">{msg.message}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
                </div>
              </div>
            )}

            {/* Manage Mode Info for Admin */}
            {isAdmin && viewMode === 'manage' && (
              <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 p-6 overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                  <div className="text-center">
                    <div className="text-6xl mb-4">⚙️</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">โหมดจัดการสตรีม</h3>
                    <p className="text-gray-600 mb-6">คุณกำลังอยู่ในโหมดจัดการสตรีม สามารถควบคุมการไลฟ์ได้</p>
                    
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
                </div>
              </div>
            )}

            {/* Message Input - Only show in view mode */}
            {viewMode === 'view' && (
              <div className="bg-white border-t border-gray-200 p-4">
              <div className="max-w-4xl mx-auto flex items-center gap-2">
                <button
                  onClick={sendLike}
                  className="p-3 rounded-full bg-gradient-to-r from-pink-500 to-red-500 text-white hover:from-pink-600 hover:to-red-600 transition-all hover:scale-110"
                >
                  <Heart className="h-5 w-5" fill="currentColor" />
                </button>
                
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder={canSendMessage ? "พิมพ์ข้อความ..." : `รอ ${countdown} วินาที...`}
                  disabled={!canSendMessage}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                
                <button
                  onClick={sendMessage}
                  disabled={!canSendMessage || !messageInput.trim()}
                  className="p-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 disabled:hover:scale-100"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
              
              {!canSendMessage && (
                <div className="text-center mt-2">
                  <span className="text-xs text-gray-500">
                    กรุณารอ {countdown} วินาทีก่อนส่งข้อความถัดไป
                  </span>
                </div>
              )}
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

      {/* Right Sidebar - Viewers List */}
      <div className="w-64 bg-white border-l border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-pink-600">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5" />
            ผู้เข้าชม
          </h2>
          <p className="text-xs text-white/80 mt-1">{viewerCount} คน</p>
        </div>
        
        <div className="p-2">
          {viewers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">ยังไม่มีผู้เข้าชม</p>
            </div>
          ) : (
            viewers.map((viewer, index) => (
              <div
                key={viewer.userId || index}
                className="p-3 rounded-lg mb-2 bg-gray-50 hover:bg-gray-100 transition-all"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(viewer.displayName || viewer.username)} flex items-center justify-center`}>
                    <span className="text-white font-bold text-sm">
                      {(viewer.displayName || viewer.username)?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">
                      {viewer.displayName || viewer.username}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(viewer.joinedAt).toLocaleTimeString('th-TH', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

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
    </div>
  );
};

export default LiveStream;


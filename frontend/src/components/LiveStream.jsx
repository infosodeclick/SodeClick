import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, Send, Heart, X, Radio, Eye, Plus, Settings } from 'lucide-react';
import { getMainProfileImage } from '../utils/profileImageUtils';
import CreateStreamModal from './CreateStreamModal';

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
      const response = await fetch(`${API_BASE_URL}/api/stream/live`);
      const data = await response.json();
      
      if (data.success) {
        setLiveRooms(data.data);
        
        // Auto-select first stream if none selected
        if (!selectedStream && data.data.length > 0) {
          selectStream(data.data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching live streams:', error);
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
    
    // Join new stream via socket
    joinStream(stream._id);
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
      socketRef.current.on('stream-ended', handleStreamEnded);
      socketRef.current.on('stream-error', handleStreamError);

      // Fetch existing messages
      fetchStreamMessages(streamId);
    }
  };

  const fetchStreamMessages = async (streamId) => {
    try {
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

  const handleStreamEnded = () => {
    alert('ไลฟ์สตรีมสิ้นสุดแล้ว');
    setSelectedStream(null);
    fetchLiveStreams();
  };

  const handleStreamError = (error) => {
    console.error('Stream error:', error);
    alert(error.message || 'เกิดข้อผิดพลาด');
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
                onClick={() => selectStream(room)}
                className={`p-3 rounded-lg mb-2 cursor-pointer transition-all ${
                  selectedStream?._id === room._id
                    ? 'bg-gradient-to-r from-pink-100 to-purple-100 border-2 border-pink-500'
                    : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(room.streamerName)} flex items-center justify-center`}>
                      <span className="text-white font-bold text-sm">
                        {room.streamerName?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">
                      {room.streamerName}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Eye className="h-3 w-3" />
                      <span>{room.viewerCount || 0}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">{room.title}</p>
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
            <div className="bg-black aspect-video flex items-center justify-center relative">
              <div className="text-center">
                <Radio className="h-20 w-20 text-white/50 mx-auto mb-4 animate-pulse" />
                <p className="text-white/70 text-lg">{selectedStream.title}</p>
                <p className="text-white/50 text-sm mt-2">Stream Player (จะเชื่อมต่อกับ WebRTC/RTMP ในอนาคต)</p>
              </div>
              
              {/* Live Badge */}
              <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full flex items-center gap-2 animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span className="font-bold text-sm">LIVE</span>
              </div>
              
              {/* Viewer Count */}
              <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span className="font-semibold">{viewerCount}</span>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-white p-4 overflow-y-auto">
              <div className="max-w-4xl mx-auto">
                {messages.map((msg, index) => {
                  if (msg.type === 'system') {
                    return (
                      <div key={msg._id || index} className="text-center my-2">
                        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                          {msg.message}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div key={msg._id || index} className="mb-3 flex items-start gap-2">
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

            {/* Message Input */}
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
    </div>
  );
};

export default LiveStream;


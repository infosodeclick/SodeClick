import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Music, Users, MessageCircle, Send } from 'lucide-react';
import { io } from 'socket.io-client';

const DJPage = ({ 
  socketUrl = null, 
  className = "",
  onConnect = null,
  onDisconnect = null 
}) => {
  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // Start unmuted
  const [adminAudioMuted, setAdminAudioMuted] = useState(false);
  const [userVolume, setUserVolume] = useState(0.8);
  const [userMuted, setUserMuted] = useState(false); // Start unmuted
  const [isIncognitoMode, setIsIncognitoMode] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isDJ, setIsDJ] = useState(false);
  const [currentSong, setCurrentSong] = useState('Summer Vibes - DJ Mix');
  const [listeners, setListeners] = useState(0);
  const [currentAudioSource, setCurrentAudioSource] = useState('microphone');
  const [connectionStatus, setConnectionStatus] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [browserSupport, setBrowserSupport] = useState({
    microphone: true,
    systemAudio: false,
    mixedMode: false
  });
  const [testingSystemAudio, setTestingSystemAudio] = useState(false);
  const [roomName, setRoomName] = useState('Summer Vibes - DJ Mix');
  const [isEditingRoomName, setIsEditingRoomName] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminSuperAdmin, setIsAdminSuperAdmin] = useState(false);
  const [isDJRole, setIsDJRole] = useState(false);
  const [vinylRotation, setVinylRotation] = useState(0);
  const [testingMicrophone, setTestingMicrophone] = useState(false);
  const [microphoneStatus, setMicrophoneStatus] = useState('unknown');
  const [testingMixedMode, setTestingMixedMode] = useState(false);
  const [mixedModeStatus, setMixedModeStatus] = useState('unknown');
  const [isListening, setIsListening] = useState(false);
  const [listeningStatus, setListeningStatus] = useState('idle');
  const [djStream, setDjStream] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [isDJActive, setIsDJActive] = useState(false);
  const [isAdminListener, setIsAdminListener] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [attemptingDJAccess, setAttemptingDJAccess] = useState(false);
  const [lastAuthResult, setLastAuthResult] = useState(null);
  
  // Refs
  const socketRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioElementRef = useRef(null);
  const messagesEndRef = useRef(null);
  const audioLevelIntervalRef = useRef(null);
  const listenerAudioRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const attemptingDJAccessRef = useRef(false);

  // Utility function to check if current user can access DJ mode (not cached)
  const getCurrentUserDJAccessStatus = () => {
    const userRole = localStorage.getItem('userRole');
    const userData = localStorage.getItem('user');
    
    let canAccessDJ = false;
    
    if (userRole === 'admin' || userRole === 'superadmin' || userRole === 'dj') {
      canAccessDJ = true;
    }
    
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user.role === 'admin' || user.role === 'superadmin' || user.role === 'dj' || user.isAdmin) {
          canAccessDJ = true;
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    
    return canAccessDJ;
  };

  // Utility function to check if current user is admin (not cached) - for backward compatibility
  const getCurrentUserAdminStatus = () => {
    const userRole = localStorage.getItem('userRole');
    const userData = localStorage.getItem('user');
    
    let isAdminUser = false;
    
    if (userRole === 'admin' || userRole === 'superadmin') {
      isAdminUser = true;
    }
    
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user.role === 'admin' || user.role === 'superadmin' || user.isAdmin) {
          isAdminUser = true;
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    
    return isAdminUser;
  };

  // Utility function to check if current user is admin/superadmin (excluding DJ role)
  const getCurrentUserAdminSuperAdminStatus = () => {
    const userRole = localStorage.getItem('userRole');
    const userData = localStorage.getItem('user');
    
    let isAdminSuperAdmin = false;
    
    if (userRole === 'admin' || userRole === 'superadmin') {
      isAdminSuperAdmin = true;
    }
    
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user.role === 'admin' || user.role === 'superadmin') {
          isAdminSuperAdmin = true;
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    
    return isAdminSuperAdmin;
  };

  // Utility function to check if current user is DJ role only
  const getCurrentUserDJRoleStatus = () => {
    const userRole = localStorage.getItem('userRole');
    const userData = localStorage.getItem('user');
    
    if (userRole === 'dj') {
      return true;
    }
    
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user.role === 'dj') {
          return true;
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    
    return false;
  };

  // Initialize
  useEffect(() => {
    // Clear any stale state first
    setIsDJ(false);
    setIsPlaying(false);
    setIsListening(false);
    setListeningStatus('idle');
    setDjStream(null);
    setIsAdminListener(false);
    setIsAdmin(false);
    
    // Clean up any existing media streams
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    console.log('🔄 Clearing all DJ session state on component mount');
    
    initializeSocket();
    checkBrowserSupport();
    checkAdminStatus();
    
    // Reset admin session state on page refresh - only for actual admins
    const resetAdminSession = () => {
      setIsDJ(false);
      setIsPlaying(false);
      setIsListening(false);
      setListeningStatus('idle');
      setDjStream(null);
      setIsAdminListener(false);
      
      // Clean up any existing media streams
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      
      console.log('🔄 Admin session reset after page refresh');
    };
    
    // Check if current user is actually admin/superadmin (not cached adminPermissions)
    const isAdminSuperAdminUser = getCurrentUserAdminSuperAdminStatus();
    
    // Only reset admin session for actual admins/superadmins
    if (isAdminSuperAdminUser) {
      console.log('🔄 Actual admin detected, resetting admin session');
      resetAdminSession();
    } else {
      console.log('🔄 Non-admin user detected, ensuring clean state');
    }
    
    // Check for incognito mode
    const incognitoDetected = detectIncognitoMode();
    setIsIncognitoMode(incognitoDetected);
    if (incognitoDetected) {
      console.log('🔍 Incognito/Private mode detected');
    }
    
    return () => {
      cleanup();
    };
  }, []);

  // Vinyl rotation animation
  useEffect(() => {
    let animationId;
    if (isPlaying && isAdmin) {
      const animate = () => {
        setVinylRotation(prev => prev + 2);
        animationId = requestAnimationFrame(animate);
      };
      animationId = requestAnimationFrame(animate);
    }
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isPlaying, isAdmin]);

  // Send user-ready-for-stream when DJ stream is available and user is not admin/superadmin (or is in listener mode)
  useEffect(() => {
    if (djStream && djStream.djId && (!isAdminSuperAdmin || isAdminListener || isDJRole) && socketRef.current && socketRef.current.connected) {
      console.log('🎧 User detected DJ stream, sending user-ready-for-stream', {
        djStream: djStream,
        isAdmin: isAdmin,
        isAdminListener: isAdminListener,
        socketConnected: socketRef.current.connected,
        socketId: socketRef.current.id,
        djId: djStream.djId
      });
      socketRef.current.emit('user-ready-for-stream', {
        userId: socketRef.current.id,
        djId: djStream.djId
      });
    } else {
      console.log('🎧 User-ready-for-stream conditions not met:', {
        hasDjStream: !!djStream,
        djStreamDjId: djStream?.djId,
        isAdmin: isAdmin,
        isAdminListener: isAdminListener,
        socketConnected: socketRef.current?.connected,
        socketId: socketRef.current?.id
      });
    }
  }, [djStream, isAdminSuperAdmin, isAdminListener, isDJRole]);

  // ESC key listener for custom alert
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'Escape' && showAlert) {
        closeAlert();
      }
    };

    if (showAlert) {
      document.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [showAlert]);

  // Socket connection
  const initializeSocket = () => {
    let url;
    
    if (socketUrl) {
      url = socketUrl;
    } else {
      // Use environment variable for API base URL, fallback to localhost for development
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      if (apiBaseUrl) {
        url = apiBaseUrl;
      } else {
        url = window.location.hostname === 'localhost' 
          ? 'http://localhost:5000' 
          : window.location.origin;
      }
    }
    
    console.log('🔌 DJ Socket connecting to:', url);
    console.log('🌍 Environment info:', {
      hostname: window.location.hostname,
      origin: window.location.origin,
      apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
      nodeEnv: import.meta.env.NODE_ENV || import.meta.env.MODE
    });
    
    socketRef.current = io(url, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      maxReconnectionAttempts: 5
    });
    setupSocketListeners();
  };

  const setupSocketListeners = () => {
    const socket = socketRef.current;
    
    socket.on('connect', () => {
      console.log('✅ Connected to server:', socket.id);
      console.log('🌐 Socket URL:', socket.io.uri);
      console.log('🔌 Socket transport:', socket.io.engine.transport.name);
      setConnectionStatus(true);
      onConnect && onConnect(socket.id);
      
      // Don't authenticate immediately - only when needed for DJ access
      // Authentication will be sent when user tries to access DJ mode
      
      // For admin: Send stop streaming signal on connect to clean up previous session
      const isActuallyAdmin = getCurrentUserAdminStatus();
      
      if (isActuallyAdmin) {
        console.log('🔄 Admin connected - sending stop streaming signal to clean up previous session');
        // Small delay to ensure socket is fully ready
        setTimeout(() => {
          socket.emit('dj-streaming-stopped', {
            djId: socket.id
          });
          socket.emit('dj control', {
            type: 'pause'
          });
        }, 1000);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      setConnectionStatus(false);
      onDisconnect && onDisconnect();
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      setConnectionStatus(false);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('✅ Socket reconnected after', attemptNumber, 'attempts');
      setConnectionStatus(true);
    });

    socket.on('reconnect_error', (error) => {
      console.error('❌ Socket reconnection error:', error);
    });

    socket.on('reconnect_failed', () => {
      console.error('❌ Socket reconnection failed - giving up');
      setConnectionStatus(false);
    });

    // DJ Authentication handlers
    socket.on('dj-auth-success', (data) => {
      console.log('✅ DJ Authentication successful:', data);
      console.log('🎧 attemptingDJAccess flag:', attemptingDJAccessRef.current);
      
      // Store the authentication result
      setLastAuthResult(data);
      
      if (attemptingDJAccessRef.current) {
        console.log('🎧 Processing DJ access request...');
        // Use backend response for DJ access check
        const canAccessDJ = data.canAccessDJ !== undefined ? data.canAccessDJ : getCurrentUserDJAccessStatus();
        console.log('🎧 canAccessDJ from backend:', canAccessDJ);
        
        if (!canAccessDJ) {
          console.log('⚠️ User does not have DJ access permissions');
          setAlertMessage('คุณไม่มีสิทธิ์เข้าถึง DJ Mode');
          setShowAlert(true);
          setAttemptingDJAccess(false); // Reset state flag
          attemptingDJAccessRef.current = false; // Reset ref flag
          return;
        }
        
        // If authentication successful and user has DJ access, proceed with DJ mode toggle
        console.log('🎧 Authentication successful, proceeding with DJ mode toggle');
        setAttemptingDJAccess(false); // Reset state flag
        attemptingDJAccessRef.current = false; // Reset ref flag
        
        // Proceed with DJ mode toggle
        const newDJState = true; // Entering DJ mode
        console.log('🎧 Setting DJ state to:', newDJState);
        setIsDJ(newDJState);
        checkAdminStatus();
        console.log('🔧 Checked admin status (DJ mode)');
        initAudio();
        
        console.log('🎧 Emitting toggle dj mode to backend...');
        socketRef.current.emit('toggle dj mode', { 
          isDJ: newDJState,
          adminId: socketRef.current.id 
        });
      } else {
        console.log('🎧 DJ auth success received but not attempting DJ access');
      }
    });

    socket.on('dj-auth-error', (data) => {
      console.log('❌ DJ Authentication failed:', data.message);
      // Only show alert if user is trying to access DJ mode
      if (attemptingDJAccessRef.current) {
        setAlertMessage(`DJ Authentication Error: ${data.message}`);
        setShowAlert(true);
        setAttemptingDJAccess(false); // Reset state flag
        attemptingDJAccessRef.current = false; // Reset ref flag
      }
    });

    socket.on('current state', (state) => {
      console.log('🎧 Received current state:', state);
      
      // Sync playing status from server state - only for users, not admin after refresh
      if (state.currentSong && state.currentSong.isPlaying !== undefined) {
        // Check if this is admin/superadmin - if so, don't sync playing status
        // Admin/superadmin should start fresh after refresh, but DJ role should sync like user
        const isActuallyAdminSuperAdmin = getCurrentUserAdminSuperAdminStatus();
        
        if (!isActuallyAdminSuperAdmin || getCurrentUserDJRoleStatus()) {
          // Only sync for users and DJ role, not admin/superadmin
          console.log('🎧 User/DJ: Syncing playing status from server:', state.currentSong.isPlaying);
          setIsPlaying(state.currentSong.isPlaying);
        } else {
          console.log('🎧 Admin: Not syncing playing status after refresh - starting fresh');
        }
      }
      
      if (state.currentSong) {
        // For admin: Check if we have a saved room name and use it if different from server
        // For user: Always use server state to sync with admin changes
        if (isAdmin) {
          const savedRoomName = localStorage.getItem('djRoomName');
          if (savedRoomName && savedRoomName !== state.currentSong.title) {
            // Use saved room name instead of server's default for admin
            setCurrentSong(savedRoomName);
            setRoomName(savedRoomName);
            console.log('Admin: Using saved room name instead of server default:', savedRoomName);
            
            // Send to backend if user is admin and DJ
            if (isDJ) {
              socket.emit('dj control', {
                type: 'change song',
                title: savedRoomName,
                artist: 'DJ Mix'
              });
            }
          } else {
            setCurrentSong(state.currentSong.title);
            setRoomName(state.currentSong.title);
          }
        } else {
          // For users: Always sync with server state (admin's current setting)
          setCurrentSong(state.currentSong.title);
          setRoomName(state.currentSong.title);
          console.log('User: Syncing with admin room name:', state.currentSong.title);
        }
      }
      if (state.connectedUsers) {
        setListeners(state.connectedUsers.length);
      }
      
      // Sync DJ Mode status
      if (state.isDJActive !== undefined) {
        setIsDJActive(state.isDJActive);
        console.log('🎧 DJ Mode active status synced:', state.isDJActive);
      }

      // Sync chat messages from server
      if (state.chatMessages && Array.isArray(state.chatMessages)) {
        setMessages(state.chatMessages);
        console.log('💬 Chat messages synced from server:', state.chatMessages.length, 'messages');
      }
      
      // Handle DJ streaming state sync - auto-start listening if DJ is streaming
      console.log('🎧 DJ Streaming Check:', {
        isDJStreaming: state.isDJStreaming,
        currentDJ: state.currentDJ,
        isAdmin: isAdmin,
        isAdminListener: isAdminListener,
        socketConnected: socketRef.current?.connected,
        socketId: socketRef.current?.id
      });
      
      if (state.isDJStreaming && state.currentDJ && (!isAdminSuperAdmin || isAdminListener || isDJRole)) {
        console.log('🎧 DJ is currently streaming, setting up stream connection');
        setDjStream({
          djId: state.currentDJ,
          djName: 'DJ'
        });
        setListeningStatus('streaming');
        
        // Auto-start listening for new users (including admin listeners)
        console.log('🎧 Auto-starting listening for new user - DJ is streaming');
        setTimeout(() => {
          startListening();
        }, 1000); // Small delay to ensure state is set
      } else {
        console.log('🎧 DJ streaming conditions not met for user:', {
          isDJStreaming: state.isDJStreaming,
          hasCurrentDJ: !!state.currentDJ,
          isAdmin: isAdmin,
          isAdminListener: isAdminListener
        });
      }
    });

    socket.on('user count', (count) => {
      setListeners(count);
    });

    socket.on('chat message', (message) => {
      setMessages(prev => {
        // Check if message already exists to prevent duplicates
        const messageExists = prev.some(msg => 
          msg.id === message.id || 
          (msg.text === message.text && 
           msg.username === message.username && 
           msg.userId === message.userId)
        );
        
        if (messageExists) {
          console.log('💬 Duplicate message prevented:', message);
          return prev;
        }
        
        return [...prev, message];
      });
    });

    socket.on('song control', (control) => {
      if (!isDJ) {
        setIsPlaying(control.isPlaying);
      }
    });

    socket.on('audio control', (control) => {
      if (!isDJ) {
        setIsMuted(control.isMuted);
      }
    });

    socket.on('song change', (song) => {
      setCurrentSong(song.title);
      setRoomName(song.title);
    });

    socket.on('user update', (data) => {
      setListeners(data.users.length);
    });

    // DJ Mode Status Events
    socket.on('dj-mode-status', (data) => {
      console.log('🎧 DJ Mode Status Update:', data);
      setIsDJActive(data.isActive);
      
      // If another admin is entering DJ mode and current user is not the one entering
      if (data.isActive && data.adminId !== socket.id && isAdmin && !isDJ) {
        console.log('🎧 Another admin entered DJ mode');
      }
    });

    socket.on('dj-mode-taken', () => {
      console.log('🎧 DJ Mode is already taken by another admin');
      setIsDJ(false);
      showCustomAlert('มี DJ กำลังรัน Session อยู่');
    });

    // DJ Audio Streaming Events
    socket.on('dj-streaming-started', (data) => {
      console.log('🎧 DJ started streaming event received:', data);
      console.log('🎧 Current socket info:', {
        socketId: socket.id,
        connected: socket.connected,
        transport: socket.io?.engine?.transport?.name
      });
      console.log('🎧 User role check before setting up:', {
        isAdmin: isAdmin,
        isAdminListener: isAdminListener
      });
      setDjStream(data);
      setListeningStatus('streaming');
      
      // Check admin/superadmin status from localStorage to avoid stale closure
      const isActuallyAdminSuperAdmin = getCurrentUserAdminSuperAdminStatus();
      const isActuallyDJRole = getCurrentUserDJRoleStatus();
      
      // Check if this admin is in listener mode
      const isAdminInListenerMode = isActuallyAdminSuperAdmin && isAdminListener;
      
      if (!isActuallyAdminSuperAdmin || isAdminInListenerMode || isActuallyDJRole) {
        console.log('🎧 User/Admin listener received DJ stream, starting to listen and requesting connection', {
          isActuallyAdminSuperAdmin,
          isAdminListener,
          isAdminInListenerMode,
          isActuallyDJRole
        });
        startListening();
        // Notify admin that this user is ready for connection
        console.log('📡 User/Admin listener emitting user-ready-for-stream:', {
          userId: socket.id,
          djId: data.djId,
          connected: socket.connected
        });
        socket.emit('user-ready-for-stream', {
          userId: socket.id,
          djId: data.djId
        });
      } else {
        console.log('🎧 Admin received own DJ stream event - no action needed');
      }
    });

    socket.on('dj-streaming-stopped', (data) => {
      console.log('🎧 DJ stopped streaming:', data);
      setDjStream(null);
      setListeningStatus('idle');
      
      // Check admin/superadmin status from localStorage to avoid stale closure
      const isActuallyAdminSuperAdmin = getCurrentUserAdminSuperAdminStatus();
      
      if (!isActuallyAdminSuperAdmin && !getCurrentUserDJRoleStatus()) {
        console.log('🎧 User received DJ stream stopped, stopping listener');
        stopListening();
      } else {
        console.log('🎧 Admin/DJ received DJ stream stopped event - no action needed');
      }
    });

    // WebRTC Signaling Events
    socket.on('webrtc-offer', async (data) => {
      console.log('📡 Received WebRTC offer:', data);
      console.log('📡 Current user isAdmin:', isAdmin);
      if (!isAdmin) {
        console.log('📡 User processing WebRTC offer...');
        await handleWebRTCOffer(data);
      } else {
        console.log('📡 Admin ignoring WebRTC offer');
      }
    });

    socket.on('webrtc-answer', async (data) => {
      console.log('📡 Received WebRTC answer:', data);
      
      // Check if user has DJ access (admin, superadmin, or DJ role)
      const canAccessDJ = getCurrentUserDJAccessStatus();
      
      console.log('📡 Current DJ/Admin status:', { 
        canAccessDJ: canAccessDJ, 
        isDJ, 
        isPlaying
      });
      
      // Only DJ/Admin should handle WebRTC answers from users
      if (canAccessDJ && mediaStreamRef.current) {
        console.log('📡 DJ/Admin processing WebRTC answer from user:', data.senderId);
        await handleWebRTCAnswer(data);
      } else {
        console.log('📡 DJ/Admin ignoring WebRTC answer - not ready:', {
          canAccessDJ: canAccessDJ,
          hasMediaStream: !!mediaStreamRef.current
        });
      }
    });

    socket.on('webrtc-ice-candidate', async (data) => {
      console.log('🧊 Received ICE candidate:', data);
      await handleICECandidate(data);
    });

    // User ready for stream
    socket.on('user-ready-for-stream', async (data) => {
      console.log('🎧 User ready for stream event received:', data);
      console.log('🎧 Admin socket info when received user-ready:', {
        socketId: socket.id,
        connected: socket.connected
      });
      
      // Check if user has DJ access (admin, superadmin, or DJ role)
      const canAccessDJ = getCurrentUserDJAccessStatus();
      
      // Debug media stream details
      if (mediaStreamRef.current) {
        const audioTracks = mediaStreamRef.current.getAudioTracks();
        console.log('🎧 DJ/Admin media stream details:', {
          hasMediaStream: !!mediaStreamRef.current,
          audioTracksCount: audioTracks.length,
          audioTracksInfo: audioTracks.map(track => ({
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
            label: track.label
          }))
        });
      }
      
      console.log('🎧 DJ/Admin status check:', { 
        canAccessDJ: canAccessDJ,
        isDJ, 
        isPlaying, 
        hasMediaStream: !!mediaStreamRef.current
      });
      
      // Check if DJ/Admin is ready to connect - include DJ role
      const shouldConnect = canAccessDJ && mediaStreamRef.current;
      
      if (shouldConnect) {
        const audioTracks = mediaStreamRef.current.getAudioTracks();
        if (audioTracks.length > 0) {
          console.log('📡 DJ/Admin initiating connection with user:', data.userId);
          console.log('📡 DJ/Admin status:', {
            canAccessDJ: canAccessDJ,
            isDJ, 
            isPlaying,
            hasMediaStream: !!mediaStreamRef.current,
            audioTracksCount: audioTracks.length
          });
          await initiateConnectionWithUser(data.userId);
        } else {
          console.log('❌ Cannot initiate connection - no audio tracks available');
        }
      } else {
        console.log('⚠️ DJ/Admin not ready to initiate connection:', {
          canAccessDJ: canAccessDJ,
          isDJ, 
          isPlaying,
          hasMediaStream: !!mediaStreamRef.current
        });
      }
    });
  };


  // Check admin status
  const checkAdminStatus = () => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    const userData = localStorage.getItem('user');
    
    console.log('Checking admin status:', {
      token: token ? 'Present' : 'Not found',
      userRole,
      userData: userData ? 'Present' : 'Not found'
    });
    
    // Clear any stale admin permissions first
    localStorage.removeItem('adminPermissions');
    
    let isAdminUser = false;
    
    // Check for admin, superadmin, or DJ roles
    if (userRole === 'admin' || userRole === 'superadmin' || userRole === 'dj') {
      isAdminUser = true;
      console.log('✅ Admin/DJ role detected from userRole:', userRole);
    }
    
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user.role === 'admin' || user.role === 'superadmin' || user.role === 'dj' || user.isAdmin) {
          isAdminUser = true;
          console.log('✅ Admin/DJ role detected from user data:', {
            role: user.role,
            isAdmin: user.isAdmin
          });
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    
    // Set adminPermissions if user has DJ access (admin, superadmin, or DJ role)
    if (isAdminUser) {
      localStorage.setItem('adminPermissions', 'true');
      console.log('✅ User has DJ access - DJ controls enabled');
    } else {
      localStorage.removeItem('adminPermissions');
      console.log('❌ User does not have DJ access - limited access, cleared admin permissions');
    }
    
    // Set separate states for different role types
    setIsAdmin(isAdminUser);
    setIsAdminSuperAdmin(getCurrentUserAdminSuperAdminStatus());
    setIsDJRole(getCurrentUserDJRoleStatus());
  };

  // Incognito/Private mode detection
  const detectIncognitoMode = () => {
    try {
      // Method 1: Check if localStorage is available
      const testKey = 'incognito_test';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      
      // Method 2: Check if indexedDB is available
      if (!window.indexedDB) {
        return true;
      }
      
      // Method 3: Check if webkitRequestFileSystem is available (Chrome)
      if (window.webkitRequestFileSystem) {
        return false;
      }
      
      // Method 4: Check if serviceWorker is available
      if (!navigator.serviceWorker) {
        return true;
      }
      
      // Method 5: Check if webkitTemporaryStorage is available
      if (window.webkitTemporaryStorage) {
        return false;
      }
      
      // Method 6: Check if chrome.runtime is available (Chrome extensions)
      if (window.chrome && window.chrome.runtime) {
        return false;
      }
      
      // Method 7: Check if window.speechSynthesis is available
      if (!window.speechSynthesis) {
        return true;
      }
      
      // Method 8: Check if window.Notification is available
      if (!window.Notification) {
        return true;
      }
      
      // Method 9: Check if window.crypto is available
      if (!window.crypto) {
        return true;
      }
      
      // Method 10: Check if window.crypto.getRandomValues is available
      if (!window.crypto.getRandomValues) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.log('🔍 Incognito detection error:', error);
      return true; // Assume incognito if detection fails
    }
  };

  // Browser detection function
  const getBrowserInfo = () => {
    const userAgent = navigator.userAgent;
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';
    
    if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) {
      browserName = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Firefox')) {
      browserName = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browserName = 'Safari';
      const match = userAgent.match(/Version\/(\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Edge')) {
      browserName = 'Edge';
      const match = userAgent.match(/Edge\/(\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Brave')) {
      browserName = 'Brave';
      const match = userAgent.match(/Chrome\/(\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    }
    
    return {
      name: browserName,
      version: browserVersion,
      userAgent: userAgent
    };
  };

  // Browser support check
  const checkBrowserSupport = () => {
    const browserInfo = getBrowserInfo();
    const support = {
      microphone: !!navigator.mediaDevices?.getUserMedia,
      systemAudio: false,
      mixedMode: false,
      browser: browserInfo
    };
    
    const isSecureContext = window.isSecureContext || 
                           window.location.protocol === 'https:' || 
                           window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname === '0.0.0.0';
    
    const hasGetDisplayMedia = !!navigator.mediaDevices?.getDisplayMedia;
    
    // Check system audio support based on browser
    if (hasGetDisplayMedia && isSecureContext) {
      if (browserInfo.name === 'Chrome' && parseInt(browserInfo.version) >= 72) {
        support.systemAudio = true;
        support.mixedMode = true;
      } else if (browserInfo.name === 'Edge' && parseInt(browserInfo.version) >= 79) {
        support.systemAudio = true;
        support.mixedMode = true;
      } else if (browserInfo.name === 'Firefox' && parseInt(browserInfo.version) >= 66) {
        support.systemAudio = true;
        support.mixedMode = true;
      } else if (browserInfo.name === 'Brave') {
        support.systemAudio = true;
        support.mixedMode = true;
      } else if (browserInfo.name === 'Safari' && parseInt(browserInfo.version) >= 13) {
      support.systemAudio = true;
      support.mixedMode = true;
      }
    }
    
    console.log('🌐 Browser support check:', support);
    setBrowserSupport(support);
  };

  // Audio functions
  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  };

  const startAudioStream = async () => {
    try {
      let mediaStream = null;
      
      // Ensure admin status is set when starting audio stream
      if (!isAdmin) {
        checkAdminStatus();
        console.log('🔧 Checked admin status (audio stream)');
      }
      
      // Double check browser support before attempting to use
      const isSecureContext = window.isSecureContext || 
                             window.location.protocol === 'https:' || 
                             window.location.hostname === 'localhost' ||
                             window.location.hostname === '127.0.0.1' ||
                             window.location.hostname === '0.0.0.0';
      
      if (currentAudioSource === 'systemAudio') {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          throw new Error('System audio is not supported in this browser');
        }
        if (!isSecureContext) {
          throw new Error('System audio requires HTTPS or localhost');
        }
      }
      
      if (currentAudioSource === 'mixedMode') {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          throw new Error('Mixed mode requires system audio support');
        }
        if (!isSecureContext) {
          throw new Error('Mixed mode requires HTTPS or localhost');
        }
      }
      
      if (currentAudioSource === 'microphone') {
        // Microphone only
        try {
          const constraints = {
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 44100
            }
          };
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
          console.log('✅ Microphone stream started successfully');
        } catch (error) {
          console.error('❌ Microphone access failed:', error);
          if (error.name === 'NotAllowedError') {
            throw new Error('Microphone access was denied. Please allow microphone access in your browser.');
          } else if (error.name === 'NotFoundError') {
            throw new Error('No microphone found. Please connect a microphone and try again.');
          } else {
            throw new Error(`Microphone access failed: ${error.message}`);
          }
        }
        
      } else if (currentAudioSource === 'systemAudio') {
        // System audio only - Enhanced browser compatibility
        try {
          const browserInfo = getBrowserInfo();
          console.log('🌐 Browser info:', browserInfo);
          console.log('🔍 Incognito mode:', isIncognitoMode);
          
          // Try multiple approaches based on browser
          const approaches = [
            {
              name: 'Approach 1: video: false, audio: true',
              constraints: { video: false, audio: true }
            },
            {
              name: 'Approach 2: video: true, audio: true',
              constraints: { video: true, audio: true }
            },
            {
              name: 'Approach 3: video: true, audio: {echoCancellation: false}',
              constraints: { 
                video: true,
                audio: { 
                  echoCancellation: false,
                  noiseSuppression: false,
                  autoGainControl: false
                }
              }
            },
            {
              name: 'Approach 4: video: true, audio: {sampleRate: 44100}',
              constraints: { 
                video: true, 
                audio: { 
                  sampleRate: 44100,
                  channelCount: 2
                }
              }
            }
          ];
          
          // If in incognito mode, try additional approaches
          if (isIncognitoMode) {
            approaches.push({
              name: 'Approach 5: Incognito fallback - minimal constraints',
              constraints: { 
                video: true, 
                audio: true,
                preferCurrentTab: true
              }
            });
          }
          
          let success = false;
          for (let i = 0; i < approaches.length; i++) {
            try {
              console.log(`🎵 Trying system audio ${approaches[i].name}`);
              mediaStream = await navigator.mediaDevices.getDisplayMedia(approaches[i].constraints);
              console.log(`✅ ${approaches[i].name} successful`);
              success = true;
              break;
            } catch (error) {
              console.log(`❌ ${approaches[i].name} failed:`, error.message);
              if (i === approaches.length - 1) {
                throw error;
              }
            }
          }
          
          if (!success) {
            throw new Error('All system audio approaches failed');
          }
          
          // Check if we actually got audio tracks
          const audioTracks = mediaStream.getAudioTracks();
          console.log('🎵 System audio tracks found:', audioTracks.length);
          if (audioTracks.length === 0) {
            throw new Error('No audio tracks found in system audio stream');
          }
          
          // Log audio track details
          audioTracks.forEach((track, index) => {
            console.log(`🎵 Audio track ${index}:`, {
              enabled: track.enabled,
              muted: track.muted,
              readyState: track.readyState,
              label: track.label,
              settings: track.getSettings()
            });
          });
          
          console.log('✅ System audio stream started successfully');
          
        } catch (error) {
          console.error('❌ System audio not available:', error);
          const browserInfo = getBrowserInfo();
          
          if (error.name === 'NotSupportedError') {
            throw new Error(`System audio capture is not supported in ${browserInfo.name} ${browserInfo.version}. Please try Chrome, Edge, or Firefox.`);
          } else if (error.name === 'NotAllowedError') {
            throw new Error('System audio access was denied. Please allow screen sharing and select "Share system audio" when prompted.');
          } else if (error.name === 'NotFoundError') {
            throw new Error('No audio source found. Please make sure you have audio playing and try again.');
          } else if (isIncognitoMode) {
            throw new Error(`System audio capture failed in incognito mode: ${error.message}. Please try using normal browsing mode for better compatibility.`);
          } else {
            throw new Error(`System audio capture failed: ${error.message}. Please try a different browser or check your audio settings.`);
          }
        }
        
      } else if (currentAudioSource === 'mixedMode') {
        // Mixed mode - both microphone and system audio
        console.log('🎵 Starting Mixed Mode...');
        
        let micStream = null;
        try {
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 44100
            }
          });
          console.log('✅ Microphone stream obtained');
        } catch (micError) {
          console.error('❌ Microphone failed in mixed mode:', micError);
          throw new Error('Microphone access failed in mixed mode');
        }
        
        let systemStream = null;
        try {
          try {
            systemStream = await navigator.mediaDevices.getDisplayMedia({
              video: false,
              audio: true
            });
            console.log('✅ System audio stream obtained (video: false)');
          } catch (error1) {
            console.log('Approach 1 failed, trying approach 2...');
            systemStream = await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: true
            });
            console.log('✅ System audio stream obtained (video: true)');
          }
        } catch (systemError) {
          console.error('❌ System audio failed in mixed mode:', systemError);
          mediaStream = micStream;
          setAudioError('System audio failed in mixed mode, using microphone only');
          return;
        }
        
        // Mix both streams
        if (micStream && systemStream) {
          try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const micSource = audioContext.createMediaStreamSource(micStream);
            const systemSource = audioContext.createMediaStreamSource(systemStream);
            const destination = audioContext.createMediaStreamDestination();
            
            micSource.connect(destination);
            systemSource.connect(destination);
            
            mediaStream = destination.stream;
            console.log('✅ Mixed mode stream created successfully');
            
          } catch (audioContextError) {
            console.error('❌ AudioContext failed in mixed mode:', audioContextError);
            mediaStream = micStream;
            setAudioError('Audio mixing failed, using microphone only');
          }
        } else {
          mediaStream = micStream || systemStream;
          console.log('⚠️ Using single stream in mixed mode');
        }
      }

      if (mediaStream) {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }
        
        mediaStreamRef.current = mediaStream;
        
        if (audioElementRef.current) {
          audioElementRef.current.pause();
          audioElementRef.current.srcObject = null;
        }
        
        audioElementRef.current = new Audio();
        audioElementRef.current.srcObject = mediaStreamRef.current;
        audioElementRef.current.muted = true;
        
        // Handle audio playback with proper error handling
        try {
          const playPromise = audioElementRef.current.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
              console.log('✅ Audio playback started successfully');
            }).catch(error => {
              if (error.name === 'AbortError') {
                console.log('⚠️ Audio playback was aborted (expected behavior)');
              } else {
                console.error('❌ Audio playback error:', error);
              }
            });
          }
        } catch (error) {
          console.error('❌ Audio setup error:', error);
        }
        
        startAudioLevelMonitoring();
        console.log(`✅ Audio stream started with source: ${currentAudioSource}`);
      }
      
    } catch (error) {
      console.error('Error starting audio stream:', error);
      setAudioError(`Failed to start ${currentAudioSource} audio: ${error.message}`);
      throw error;
    }
  };

  const stopAudioStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.srcObject = null;
    }
    stopAudioLevelMonitoring();
    setAudioError(null);
  };

  const startAudioLevelMonitoring = () => {
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
    }
    
    audioLevelIntervalRef.current = setInterval(() => {
      const micLevel = Math.random() * 100;
      const systemLevel = Math.random() * 100;
      
      const micLevelBar = document.getElementById('mic-level');
      const systemLevelBar = document.getElementById('system-level');
      
      if (micLevelBar) micLevelBar.style.width = `${micLevel}%`;
      if (systemLevelBar) systemLevelBar.style.width = `${systemLevel}%`;
    }, 100);
  };

  const stopAudioLevelMonitoring = () => {
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }
  };

  // Control functions
  const togglePlayPause = async () => {
    if (!isDJ) return;
    
    const newPlayingState = !isPlaying;
    setIsPlaying(newPlayingState);
    
    // Ensure admin status is set when starting to play
    if (newPlayingState) {
      checkAdminStatus();
      console.log('🔧 Checked admin status (play)');
    }
    
    socketRef.current.emit('dj control', {
      type: newPlayingState ? 'play' : 'pause'
    });

    if (newPlayingState) {
      try {
        setAudioError(null);
        await startAudioStream();
        
        if (isAdmin) {
          await startDJStreaming();
        }
      } catch (error) {
        console.error('Failed to start streaming:', error);
        setIsPlaying(false);
        setAudioError(`Failed to start streaming: ${error.message}`);
      }
    } else {
      stopAudioStream();
      
      if (isAdmin) {
        stopDJStreaming();
      }
    }
  };

  const toggleMute = () => {
    if (!isDJ) return;
    
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    // Update media stream tracks mute state (this affects what users hear)
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !newMutedState;
        console.log('🎤 Audio track enabled:', !newMutedState);
      });
    }
    
    socketRef.current.emit('dj control', {
      type: newMutedState ? 'mute' : 'unmute'
    });
  };

  const toggleAdminAudio = () => {
    const newAdminAudioMutedState = !adminAudioMuted;
    setAdminAudioMuted(newAdminAudioMutedState);
    
    // Update audio element mute state for admin's own audio
    if (audioElementRef.current) {
      audioElementRef.current.muted = newAdminAudioMutedState;
      audioElementRef.current.volume = newAdminAudioMutedState ? 0 : 0.5;
      console.log('🔊 Admin own audio muted:', newAdminAudioMutedState);
    }
  };

  const toggleUserMute = () => {
    const newUserMutedState = !userMuted;
    setUserMuted(newUserMutedState);
    
    // Update listener audio element mute state
    if (listenerAudioRef.current) {
      listenerAudioRef.current.muted = newUserMutedState;
      console.log('🔊 User audio muted:', newUserMutedState);
      
      // If unmuting, try to play
      if (!newUserMutedState) {
        listenerAudioRef.current.play().catch(error => {
          console.log('📱 Audio play failed after unmute:', error);
        });
      }
    }
  };

  // Handle user interaction for mobile audio
  const handleMobileAudioInteraction = async () => {
    if (listenerAudioRef.current && listenerAudioRef.current.srcObject) {
      try {
        // Ensure audio is unmuted and has volume
        listenerAudioRef.current.muted = false;
        listenerAudioRef.current.volume = 0.8;
        setUserMuted(false);
        
        await listenerAudioRef.current.play();
        console.log('✅ Mobile audio started after user interaction');
      } catch (error) {
        console.log('📱 Mobile audio play failed:', error);
      }
    }
  };

  const handleUserVolumeChange = (volume) => {
    setUserVolume(volume);
    
    // Update listener audio element volume
    if (listenerAudioRef.current) {
      listenerAudioRef.current.volume = volume;
      console.log('🔊 User volume changed to:', volume);
    }
  };

  // Custom alert function
  const showCustomAlert = (message) => {
    setAlertMessage(message);
    setShowAlert(true);
  };

  const closeAlert = () => {
    setShowAlert(false);
    setAlertMessage('');
  };

  // Get user info for chat
  const getUserInfo = () => {
    const userData = localStorage.getItem('user');
    const userRole = localStorage.getItem('userRole');
    
    if (userData) {
      try {
        const user = JSON.parse(userData);
        const isAdminUser = userRole === 'admin' || userRole === 'superadmin' || user.isAdmin || user.role === 'admin' || user.role === 'superadmin';
        
        return {
          displayName: user.displayName || user.username || 'ผู้ใช้',
          username: user.username || 'ผู้ใช้',
          isAdmin: isAdminUser
        };
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    
    // Fallback for non-logged in users
    return {
      displayName: 'ผู้ใช้',
      username: 'ผู้ใช้',
      isAdmin: false
    };
  };

  const toggleDJMode = () => {
    // If trying to enter DJ mode, check if another admin is already active first
    if (!isDJ && isDJActive) {
      showCustomAlert('มี DJ กำลังรัน Session อยู่');
      return;
    }

    // If trying to enter DJ mode, authenticate first
    if (!isDJ) {
      const token = localStorage.getItem('token');
      if (token && socketRef.current.connected) {
        console.log('🎧 Authenticating for DJ access...');
        setAttemptingDJAccess(true);
        attemptingDJAccessRef.current = true;
        socketRef.current.emit('dj-auth', { token });
        
        // Wait for authentication before proceeding
        // The actual toggle will be handled after auth success
        return;
      } else {
        // If no token, check local permissions as fallback
        const canAccessDJ = getCurrentUserDJAccessStatus();
        if (!canAccessDJ) {
          showCustomAlert('คุณไม่มีสิทธิ์เข้าถึง DJ Mode');
          return;
        }
      }
    }
    
    const newDJState = !isDJ;
    setIsDJ(newDJState);
    
    // Ensure admin status is set when entering DJ mode
    if (newDJState) {
      checkAdminStatus();
      console.log('🔧 Checked admin status (DJ mode)');
      initAudio();
    } else {
      stopAudioStream();
    }
    
    socketRef.current.emit('toggle dj mode', { 
      isDJ: newDJState,
      adminId: socketRef.current.id 
    });
  };

  const toggleAdminListener = () => {
    const newListenerState = !isAdminListener;
    
    console.log('🎧 Toggling admin listener mode:', {
      currentState: isAdminListener,
      newState: newListenerState,
      hasDjStream: !!djStream,
      djStreamDetails: djStream,
      socketConnected: socketRef.current?.connected
    });
    
    // Exit DJ mode if admin was in DJ mode
    if (newListenerState && isDJ) {
      console.log('🎧 Admin exiting DJ mode to enter listener mode');
      setIsDJ(false);
      stopAudioStream();
      socketRef.current.emit('toggle dj mode', { 
        isDJ: false,
        adminId: socketRef.current.id 
      });
    }
    
    setIsAdminListener(newListenerState);
    console.log('🎧 Admin listener mode:', newListenerState ? 'enabled' : 'disabled');
    
    // If entering listener mode and DJ is streaming, start listening
    if (newListenerState && djStream) {
      console.log('🎧 Admin entering listener mode with active DJ stream, starting listening...');
      setTimeout(() => {
        console.log('🎧 Starting listening for admin listener...');
        startListening();
      }, 500);
    } else if (newListenerState) {
      console.log('🎧 Admin entering listener mode but no DJ stream, waiting for stream...');
      // Set listening status to idle to indicate we're ready
      setListeningStatus('idle');
    } else if (!newListenerState) {
      console.log('🎧 Admin exiting listener mode, stopping listening...');
      // Stop listening when exiting listener mode
      stopListening();
    }
  };

  const selectAudioSource = (sourceType) => {
    if (!isDJ) return;
    
    setCurrentAudioSource(sourceType);
    setAudioError(null);
    
    if (isPlaying) {
      console.warn('⚠️ Audio source changed while streaming. You may need to stop and restart streaming for the change to take effect.');
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      const userInfo = getUserInfo();
      const displayName = userInfo.isAdmin ? 'ผู้ดูแลระบบ' : userInfo.displayName;
      
      socketRef.current.emit('chat message', {
        text: newMessage,
        username: displayName,
        isAdmin: userInfo.isAdmin,
        originalUsername: userInfo.username
      });
      setNewMessage('');
    }
  };

  const handleRoomNameChange = (e) => {
    setRoomName(e.target.value);
  };

  const handleRoomNameSubmit = (e) => {
    e.preventDefault();
    if (roomName.trim()) {
      const newRoomName = roomName.trim();
      setCurrentSong(newRoomName);
      setIsEditingRoomName(false);
      
      // Save to localStorage
      localStorage.setItem('djRoomName', newRoomName);
      
      // Send to backend via socket (only if user is DJ)
      if (socketRef.current && isDJ) {
        socketRef.current.emit('dj control', {
          type: 'change song',
          title: newRoomName,
          artist: 'DJ Mix'
        });
      }
      
      console.log('Room name changed to:', newRoomName);
    }
  };

  const handleRoomNameCancel = () => {
    setRoomName(currentSong);
    setIsEditingRoomName(false);
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-start listening for users when DJ is streaming
  useEffect(() => {
    if ((!isAdminSuperAdmin || isAdminListener || isDJRole) && djStream && listeningStatus === 'idle') {
      console.log('🎧 Auto-starting listening for user...');
      startListening();
    }
  }, [djStream, isAdminSuperAdmin, isAdminListener, isDJRole, listeningStatus]);

  // WebRTC Audio Streaming Functions
  const startListening = async () => {
    try {
      console.log('🎧 Starting to listen to DJ stream...');
      console.log('🎧 Current listeningStatus:', listeningStatus);
      console.log('🎧 Current isAdmin:', isAdmin);
      console.log('🎧 Current djStream:', djStream);
      console.log('🎧 Current isPlaying:', isPlaying);
      
      // Check if admin is streaming
      if (!djStream) {
        console.log('⚠️ No DJ stream detected - admin may not be streaming');
        console.log('⚠️ But WebRTC offer received, proceeding anyway...');
        // Don't return here, continue with WebRTC connection
      }
      
      setListeningStatus('connecting');
      setIsListening(true);
      
      // Create audio element for listening
            if (!listenerAudioRef.current) {
              listenerAudioRef.current = new Audio();
        console.log('🎵 Created audio element for listening');
            }
          
      // Configure audio element
          listenerAudioRef.current.muted = false;
          listenerAudioRef.current.volume = 0.8;
      listenerAudioRef.current.autoplay = true; // Enable autoplay
      listenerAudioRef.current.crossOrigin = 'anonymous';
      listenerAudioRef.current.preload = 'auto';
      listenerAudioRef.current.controls = false;
      
      console.log('🎵 Audio element configured for listening');
      
      // Set up timeout for waiting for WebRTC offer - reduced to 10 seconds
      const connectionTimeout = setTimeout(() => {
        console.log('⏰ Connection timeout - no WebRTC offer received after 10 seconds');
        console.log('⏰ Checking if admin is streaming...');
        
        // Use callback to check current state
        setListeningStatus(currentStatus => {
          if (currentStatus === 'connecting') {
            console.log('⏰ Setting status to error due to timeout');
            return 'error';
          }
          return currentStatus;
        });
      }, 10000); // 10 seconds timeout
      
      // Store timeout for cleanup
      if (!peerConnectionRef.current) {
        peerConnectionRef.current = {};
      }
      peerConnectionRef.current.connectionTimeout = connectionTimeout;
      
      console.log('✅ Listening setup completed');
      console.log('📡 Waiting for WebRTC offer from DJ...');
      
      // Request connection from DJ
      const requestConnection = () => {
        if (djStream && djStream.djId) {
          console.log('📡 Requesting connection from DJ:', djStream.djId);
          socketRef.current.emit('user-ready-for-stream', {
            userId: socketRef.current.id,
            djId: djStream.djId
          });
        } else {
          console.log('📡 No DJ stream available yet');
        }
      };
      
      // Request immediately
      requestConnection();
      
      // Retry once after 3 seconds for local development
      setTimeout(() => {
        setListeningStatus(currentStatus => {
          if (currentStatus === 'connecting') {
            console.log('📡 Retrying connection request...');
            requestConnection();
          }
          return currentStatus;
        });
      }, 3000);
      
    } catch (error) {
      console.error('❌ Failed to start listening:', error);
      setListeningStatus('error');
    }
  };

  const stopListening = () => {
    console.log('🎧 Stopping DJ stream listening...');
    setIsListening(false);
    setListeningStatus('idle');
    
    if (listenerAudioRef.current) {
      listenerAudioRef.current.pause();
      listenerAudioRef.current.src = '';
      listenerAudioRef.current.srcObject = null;
    }
    
    if (peerConnectionRef.current) {
      try {
        // Check if it's actually a RTCPeerConnection before calling close
        if (peerConnectionRef.current instanceof RTCPeerConnection) {
          peerConnectionRef.current.close();
        } else if (typeof peerConnectionRef.current.close === 'function') {
          peerConnectionRef.current.close();
        }
      } catch (error) {
        console.log('⚠️ Error closing peer connection:', error);
      }
      peerConnectionRef.current = null;
    }
  };

  // Force restart connection for users - always stop and start fresh
  const forceRestartListening = async () => {
    console.log('🔄 Force restarting connection for user...');
    
    // Always stop first to ensure clean state
    stopListening();
    
    // Wait a bit for cleanup
    setTimeout(async () => {
      console.log('🔄 Starting fresh connection...');
      await startListening();
    }, 500);
  };

  const handleWebRTCOffer = async (data) => {
    try {
      console.log('📡 Handling WebRTC offer from DJ...');
      console.log('📡 Offer data:', {
        hasOffer: !!data.offer,
        offerType: data.offer?.type,
        senderId: data.senderId,
        fullData: data
      });
      console.log('📡 Current user status:', {
        isAdmin,
        listeningStatus,
        djStream: !!djStream,
        djStreamDetails: djStream,
        socketConnected: socketRef.current?.connected,
        socketId: socketRef.current?.id
      });
      console.log('🌍 Environment debug:', {
        hostname: window.location.hostname,
        userAgent: navigator.userAgent,
        webrtcSupported: !!window.RTCPeerConnection
      });
      
      // Clear connection timeout
      if (peerConnectionRef.current && peerConnectionRef.current.connectionTimeout) {
        clearTimeout(peerConnectionRef.current.connectionTimeout);
        console.log('⏰ Cleared connection timeout');
      }
      
      peerConnectionRef.current = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      });

      // Initialize queued ICE candidates array
      peerConnectionRef.current.queuedIceCandidates = [];

      // Set up connection state monitoring BEFORE setting up ontrack
      peerConnectionRef.current.onconnectionstatechange = () => {
        console.log('🔗 WebRTC connection state:', peerConnectionRef.current.connectionState);
        if (peerConnectionRef.current.connectionState === 'connected') {
          console.log('✅ WebRTC connection established');
        } else if (peerConnectionRef.current.connectionState === 'failed') {
          console.log('❌ WebRTC connection failed');
          setListeningStatus('error');
        } else if (peerConnectionRef.current.connectionState === 'disconnected') {
          console.log('🔌 WebRTC connection disconnected');
        }
      };
      
      peerConnectionRef.current.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state:', peerConnectionRef.current.iceConnectionState);
        if (peerConnectionRef.current.iceConnectionState === 'connected' || 
            peerConnectionRef.current.iceConnectionState === 'completed') {
          console.log('✅ ICE connection established');
        } else if (peerConnectionRef.current.iceConnectionState === 'failed') {
          console.log('❌ ICE connection failed');
          setListeningStatus('error');
        }
      };

      peerConnectionRef.current.ontrack = (event) => {
        console.log('🎵 Received audio track from DJ');
        console.log('🎵 Track details:', {
          streams: event.streams.length,
          trackKind: event.track.kind,
          trackEnabled: event.track.enabled,
          trackReadyState: event.track.readyState,
          hasAudioElement: !!listenerAudioRef.current
        });
        
        // Create audio element if it doesn't exist
        if (!listenerAudioRef.current) {
          listenerAudioRef.current = new Audio();
          console.log('🎵 Created new audio element in ontrack');
        }
        
        if (event.streams && event.streams.length > 0) {
          const stream = event.streams[0];
          console.log('🎵 Setting up audio stream:', {
            streamId: stream.id,
            audioTracks: stream.getAudioTracks().length,
            videoTracks: stream.getVideoTracks().length
          });
          
          // Clear any existing timeout
          if (listenerAudioRef.current.playTimeout) {
            clearTimeout(listenerAudioRef.current.playTimeout);
          }
          
          // Configure audio element properly
          listenerAudioRef.current.srcObject = stream;
          listenerAudioRef.current.muted = false;
          listenerAudioRef.current.volume = 0.8;
          listenerAudioRef.current.autoplay = true; // Enable autoplay
          listenerAudioRef.current.crossOrigin = 'anonymous';
          listenerAudioRef.current.preload = 'none';
          listenerAudioRef.current.controls = false;
          
          console.log('🎵 Audio element configured with stream');
          
          // Set listening status to connected and update listening state
          setListeningStatus('connected');
          setIsListening(true);
          console.log('✅ User connected to DJ stream - audio track received');
          
          // Try to play immediately
          const playAudio = async () => {
            try {
              if (listenerAudioRef.current && listenerAudioRef.current.srcObject) {
                console.log('🎵 Attempting to play audio...');
                
                // Check if audio tracks are actually available
                const audioTracks = stream.getAudioTracks();
                if (audioTracks.length === 0) {
                  console.error('❌ No audio tracks in received stream');
                  return;
                }
                
                console.log('🎵 Audio tracks in stream:', audioTracks.map(track => ({
                  enabled: track.enabled,
                  muted: track.muted,
                  readyState: track.readyState
                })));
                
                // Check if mobile device
                const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                
                // Always try to play audio regardless of device
                try {
                  await listenerAudioRef.current.play();
                  console.log('✅ User audio playback started successfully');
                } catch (playError) {
                  console.log('📱 Audio play failed, may need user interaction:', playError);
                  // On mobile, this is expected behavior
                  if (isMobile) {
                    console.log('📱 Mobile device - audio ready but needs user interaction');
                  }
                }
                
                // Verify it's actually playing
                setTimeout(() => {
                  if (listenerAudioRef.current) {
                    console.log('🎵 Final audio state check:', {
                      currentTime: listenerAudioRef.current.currentTime,
                      paused: listenerAudioRef.current.paused,
                      muted: listenerAudioRef.current.muted,
                      volume: listenerAudioRef.current.volume,
                      readyState: listenerAudioRef.current.readyState
                    });
                  }
                }, 1000);
              }
            } catch (error) {
              console.error('❌ Audio playback failed:', error);
              // Try again after a delay
              setTimeout(() => {
                if (listenerAudioRef.current) {
                  listenerAudioRef.current.play().catch(err => {
                    console.error('❌ Retry play also failed:', err);
                  });
                }
              }, 1000);
            }
          };
          
          playAudio();
        } else {
          console.error('❌ No streams received from DJ in ontrack event');
          setListeningStatus('error');
        }
      };

      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 User sending ICE candidate:', {
            candidateType: event.candidate.type,
            candidateProtocol: event.candidate.protocol,
            targetId: data.senderId
          });
          socketRef.current.emit('webrtc-ice-candidate', {
            candidate: event.candidate,
            targetId: data.senderId
          });
        }
      };

      await peerConnectionRef.current.setRemoteDescription(data.offer);

      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      // Process queued ICE candidates
      if (peerConnectionRef.current.queuedIceCandidates) {
        console.log('🧊 Processing queued ICE candidates:', peerConnectionRef.current.queuedIceCandidates.length);
        for (const candidate of peerConnectionRef.current.queuedIceCandidates) {
          try {
            await peerConnectionRef.current.addIceCandidate(candidate);
            console.log('🧊 Queued ICE candidate added');
          } catch (error) {
            console.error('❌ Error adding queued ICE candidate:', error);
          }
        }
        peerConnectionRef.current.queuedIceCandidates = [];
      }

      socketRef.current.emit('webrtc-answer', {
        answer: answer,
        targetId: data.senderId
      });

      console.log('✅ WebRTC connection established with DJ');
    } catch (error) {
      console.error('❌ Error handling WebRTC offer:', error);
    }
  };

  // Store peer connections for each user
  const peerConnectionsRef = useRef(new Map());

  // Function to initiate connection with a new user
  const initiateConnectionWithUser = async (userId) => {
    try {
      console.log('📡 ===== INITIATING CONNECTION WITH USER =====');
      console.log('📡 Initiating connection with user:', userId);
      console.log('📡 Media stream check:', {
        hasMediaStream: !!mediaStreamRef.current,
        isPlaying,
        isDJ,
        isAdmin
      });
      console.log('📡 Socket info:', {
        socketId: socketRef.current?.id,
        connected: socketRef.current?.connected
      });
      
      // Check if we have a media stream ready
      if (!mediaStreamRef.current) {
        console.error('❌ No media stream available when trying to connect to user:', userId);
        return;
      }
      
      // Check if media stream has audio tracks
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      if (audioTracks.length === 0) {
        console.error('❌ No audio tracks in media stream when connecting to user:', userId);
        return;
      }
      
      console.log('🎵 Audio tracks available for streaming:', audioTracks.length);
      
      // Check if we already have a connection for this user
      const existingConnection = peerConnectionsRef.current.get(userId);
      if (existingConnection) {
        console.log('⚠️ Peer connection already exists for user:', userId, 'closing existing connection first');
        try {
          existingConnection.close();
        } catch (error) {
          console.log('⚠️ Error closing existing connection:', error);
        }
        peerConnectionsRef.current.delete(userId);
      }
      
      // Create new peer connection for this user
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      });
      
      // Initialize queued ICE candidates array
      peerConnection.queuedIceCandidates = [];
      
      // Only add audio tracks to avoid sending unnecessary video data
      const tracksToAdd = mediaStreamRef.current.getTracks().filter(track => track.kind === 'audio');
      
      if (tracksToAdd.length === 0) {
        console.error('❌ No audio tracks found in media stream for user:', userId);
        return;
      }
      
      console.log('🎵 Adding audio tracks to peer connection:', tracksToAdd.length);
      
      tracksToAdd.forEach(track => {
        try {
          const sender = peerConnection.addTrack(track, mediaStreamRef.current);
          console.log('🎵 Added audio track to peer connection for user:', userId, {
            kind: track.kind,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
            label: track.label,
            sender: !!sender
          });
        } catch (error) {
          console.error('❌ Error adding track:', error);
        }
      });
      
      // Verify tracks were added correctly
      const senders = peerConnection.getSenders();
      console.log('🎵 Peer connection senders after adding tracks:', senders.length);
      senders.forEach((sender, index) => {
        console.log(`🎵 Sender ${index}:`, {
          hasTrack: !!sender.track,
          trackKind: sender.track?.kind,
          trackEnabled: sender.track?.enabled,
          trackReadyState: sender.track?.readyState
        });
      });
      
      // Set up ICE candidate handling
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 Admin sending ICE candidate to user:', userId);
          socketRef.current.emit('webrtc-ice-candidate', {
            candidate: event.candidate,
            targetId: userId
          });
        }
      };
      
      // Monitor connection state
      peerConnection.onconnectionstatechange = () => {
        console.log('🔗 Admin WebRTC connection state with user', userId, ':', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          console.log('✅ Admin WebRTC connection established with user:', userId);
        } else if (peerConnection.connectionState === 'failed') {
          console.log('❌ Admin WebRTC connection failed with user:', userId);
          peerConnectionsRef.current.delete(userId);
          peerConnection.close();
        } else if (peerConnection.connectionState === 'disconnected') {
          console.log('🔌 Admin WebRTC connection disconnected with user:', userId);
        }
      };
      
      // Monitor ICE connection state
      peerConnection.oniceconnectionstatechange = () => {
        console.log('🧊 Admin ICE connection state with user', userId, ':', peerConnection.iceConnectionState);
        if (peerConnection.iceConnectionState === 'connected' || 
            peerConnection.iceConnectionState === 'completed') {
          console.log('✅ Admin ICE connection established with user:', userId);
        } else if (peerConnection.iceConnectionState === 'failed') {
          console.log('❌ Admin ICE connection failed with user:', userId);
        }
      };
      
      // Store the connection
      peerConnectionsRef.current.set(userId, peerConnection);
      
      // Create and send offer to the user with audio-only constraints
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false
      });
      await peerConnection.setLocalDescription(offer);
      
      console.log('📡 Sending offer to user:', userId);
      socketRef.current.emit('webrtc-offer', {
        offer: offer,
        targetId: userId
      });
      
    } catch (error) {
      console.error('❌ Error initiating connection with user', userId, ':', error);
    }
  };

  const handleWebRTCAnswer = async (data) => {
    try {
      console.log('📡 Handling WebRTC answer from listener...');
      console.log('📡 Answer data:', {
        hasAnswer: !!data.answer,
        answerType: data.answer?.type,
        senderId: data.senderId
      });
      
      // Get peer connection for this specific user
      const peerConnection = peerConnectionsRef.current.get(data.senderId);
      
      if (!peerConnection) {
        console.log('❌ No peer connection found for user:', data.senderId);
        return;
      }
      
      console.log('📡 Peer connection state before setting remote description:', {
        signalingState: peerConnection.signalingState,
        connectionState: peerConnection.connectionState,
        iceConnectionState: peerConnection.iceConnectionState,
        hasRemoteDescription: !!peerConnection.remoteDescription
      });
      
      // Check if remote description is already set for this user
      if (peerConnection.remoteDescription) {
        console.log('⚠️ Remote description already set for user', data.senderId, ', ignoring duplicate answer');
        return;
      }
      
      // Check if signaling state allows setting remote description
      const validStates = ['have-local-offer', 'have-local-pranswer', 'stable'];
      if (!validStates.includes(peerConnection.signalingState)) {
        console.log('⚠️ Signaling state is not valid for setting remote answer:', peerConnection.signalingState, 'Expected one of:', validStates);
        
        // If we're in a bad state, try to reset the connection
        if (peerConnection.signalingState === 'closed' || peerConnection.signalingState === 'failed') {
          console.log('🔄 Connection is in bad state, closing and removing from map');
          peerConnection.close();
          peerConnectionsRef.current.delete(data.senderId);
          return;
        }
      }
      
      // Only proceed if we haven't set the remote description yet
      if (!peerConnection.remoteDescription && data.answer) {
        await peerConnection.setRemoteDescription(data.answer);
        console.log('✅ WebRTC connection established with listener:', data.senderId);
        
        // Process queued ICE candidates for this user
        if (peerConnection.queuedIceCandidates && peerConnection.queuedIceCandidates.length > 0) {
          console.log('🧊 Processing queued ICE candidates for user', data.senderId, ':', peerConnection.queuedIceCandidates.length);
          for (const candidate of peerConnection.queuedIceCandidates) {
            try {
              await peerConnection.addIceCandidate(candidate);
              console.log('🧊 Queued ICE candidate added for user:', data.senderId);
            } catch (error) {
              console.error('❌ Error adding queued ICE candidate for user', data.senderId, ':', error);
            }
          }
          peerConnection.queuedIceCandidates = [];
        }
      } else {
        console.log('⚠️ Skipping setRemoteDescription - already set or no answer provided');
      }
      
    } catch (error) {
      console.error('❌ Error handling WebRTC answer from user', data.senderId, ':', error);
      
      // If there's an error setting remote description, clean up the connection
      const peerConnection = peerConnectionsRef.current.get(data.senderId);
      if (peerConnection) {
        console.log('🧹 Cleaning up problematic peer connection for user:', data.senderId);
        try {
          peerConnection.close();
        } catch (closeError) {
          console.error('❌ Error closing peer connection:', closeError);
        }
        peerConnectionsRef.current.delete(data.senderId);
      }
    }
  };

  const handleICECandidate = async (data) => {
    try {
      // Check if user has DJ access (admin, superadmin, or DJ role)
      const canAccessDJ = getCurrentUserDJAccessStatus();
      
      console.log('🧊 Handling ICE candidate:', {
        hasCandidate: !!data.candidate,
        candidateType: data.candidate?.type,
        senderId: data.senderId,
        canAccessDJ: canAccessDJ,
        hasPeerConnections: !!peerConnectionsRef.current,
        hasSingleConnection: !!peerConnectionRef.current
      });
      
      if (!data.candidate) {
        console.log('⚠️ No candidate provided in ICE candidate data');
        return;
      }
      
      // Handle ICE candidate for DJ/Admin (receiving from user)
      if (canAccessDJ && data.senderId) {
        const peerConnection = peerConnectionsRef.current.get(data.senderId);
        console.log('🧊 DJ/Admin checking peer connection for user:', data.senderId, !!peerConnection);
        
        if (peerConnection) {
          try {
            if (peerConnection.remoteDescription) {
              await peerConnection.addIceCandidate(data.candidate);
              console.log('🧊 ICE candidate added successfully for user:', data.senderId);
            } else {
              if (!peerConnection.queuedIceCandidates) {
                peerConnection.queuedIceCandidates = [];
              }
              peerConnection.queuedIceCandidates.push(data.candidate);
              console.log('🧊 ICE candidate queued for user:', data.senderId, '(remote description not set yet)');
            }
          } catch (error) {
            console.error('❌ Error adding ICE candidate for user', data.senderId, ':', error);
          }
        } else {
          console.log('⚠️ No peer connection found for user:', data.senderId);
          console.log('🧊 Available connections:', Array.from(peerConnectionsRef.current.keys()));
        }
      } 
      // Handle ICE candidate for user (receiving from DJ/Admin)
      else if (!canAccessDJ && peerConnectionRef.current) {
        console.log('🧊 User handling ICE candidate from admin');
        try {
          if (peerConnectionRef.current.remoteDescription) {
            await peerConnectionRef.current.addIceCandidate(data.candidate);
            console.log('🧊 ICE candidate added successfully for user');
          } else {
            if (!peerConnectionRef.current.queuedIceCandidates) {
              peerConnectionRef.current.queuedIceCandidates = [];
            }
            peerConnectionRef.current.queuedIceCandidates.push(data.candidate);
            console.log('🧊 ICE candidate queued for user (remote description not set yet)');
          }
        } catch (error) {
          console.error('❌ Error adding ICE candidate for user:', error);
        }
      } else {
        console.log('⚠️ No appropriate peer connection available for ICE candidate');
        console.log('🧊 Debug info:', {
          canAccessDJ: canAccessDJ,
          senderId: data.senderId,
          hasPeerConnectionsMap: !!peerConnectionsRef.current,
          hasSingleConnection: !!peerConnectionRef.current,
          mapSize: peerConnectionsRef.current?.size || 0
        });
      }
    } catch (error) {
      console.error('❌ Error adding ICE candidate:', error);
    }
  };

  // DJ Streaming Functions
  const startDJStreaming = async () => {
    try {
      console.log('🎧 Starting DJ streaming...');
      console.log('🎧 Admin status:', {
        isAdmin,
        isDJ,
        isPlaying,
        hasMediaStream: !!mediaStreamRef.current
      });
      
      // Ensure admin status is set when starting DJ streaming
      if (!isAdmin) {
        checkAdminStatus();
        console.log('🔧 Checked admin status (streaming)');
      }
      
      if (!mediaStreamRef.current) {
        console.error('❌ No media stream available for DJ streaming');
        return;
      }

      // Create audio element for admin monitoring
      if (!audioElementRef.current) {
        audioElementRef.current = new Audio();
        console.log('🎵 Created audio element for admin');
      }
      
      // Set up audio element for admin to hear their own audio
      audioElementRef.current.srcObject = mediaStreamRef.current;
      audioElementRef.current.muted = adminAudioMuted; // Use admin audio mute state
      audioElementRef.current.volume = adminAudioMuted ? 0 : 0.5; // Set volume based on admin audio mute state
      audioElementRef.current.autoplay = true;
      audioElementRef.current.crossOrigin = 'anonymous';
      
      console.log('🎵 Audio element configured:', {
        muted: audioElementRef.current.muted,
        volume: audioElementRef.current.volume,
        autoplay: audioElementRef.current.autoplay,
        srcObject: !!audioElementRef.current.srcObject
      });
      
      // Try to play audio for admin monitoring
      try {
        const playPromise = audioElementRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
          console.log('✅ Admin audio started playing');
        }
      } catch (playError) {
        if (playError.name === 'AbortError') {
          console.log('⚠️ Admin audio play was aborted (expected behavior)');
        } else {
          console.log('⚠️ Admin audio play failed (expected if muted):', playError.message);
        }
      }

      // Don't create peer connection here - it will be created when we receive answers
      console.log('📡 Ready to create peer connections when users connect');
      
      // Check if we have audio tracks
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      console.log('🎵 Total audio tracks available for streaming:', audioTracks.length);
      if (audioTracks.length === 0) {
        console.error('❌ No audio tracks found in media stream!');
        throw new Error('No audio tracks available for streaming');
      }

      // Don't create broadcast offer - we'll create individual connections when users connect
      console.log('📡 Ready to create individual peer connections when users connect');

      console.log('📡 About to emit dj-streaming-started event:', {
        socketId: socketRef.current.id,
        connected: socketRef.current.connected
      });
      
      socketRef.current.emit('dj-streaming-started', {
        djId: socketRef.current.id,
        djName: 'DJ'
      });

      console.log('✅ DJ streaming started successfully and event emitted');
      
      // Reconnect existing connected users if media stream has changed
      if (peerConnectionsRef.current && peerConnectionsRef.current.size > 0) {
        console.log('🔄 Reconnecting existing users with new stream...');
        peerConnectionsRef.current.forEach(async (connection, userId) => {
          try {
            // Close existing connection
            connection.close();
            peerConnectionsRef.current.delete(userId);
            
            // Wait a bit then reconnect
            setTimeout(async () => {
              console.log('🔄 Reconnecting user:', userId);
              await initiateConnectionWithUser(userId);
            }, 500);
          } catch (error) {
            console.error('❌ Error reconnecting user:', userId, error);
          }
        });
      }
    } catch (error) {
      console.error('❌ Error starting DJ streaming:', error);
    }
  };

  const stopDJStreaming = () => {
    console.log('🎧 Stopping DJ streaming...');
    
    socketRef.current.emit('dj-streaming-stopped', {
      djId: socketRef.current.id
    });

    // Close all peer connections
    if (peerConnectionsRef.current) {
      peerConnectionsRef.current.forEach((connection, userId) => {
        console.log('🔌 Closing peer connection for user:', userId);
        connection.close();
      });
      peerConnectionsRef.current.clear();
    }

    // Also close the legacy single peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    console.log('✅ DJ streaming stopped');
  };

  const cleanup = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    stopAudioStream();
    stopListening();
    
    // Clean up all peer connections if admin
    if (peerConnectionsRef.current) {
      peerConnectionsRef.current.forEach((connection, userId) => {
        console.log('🔌 Cleaning up peer connection for user:', userId);
        try {
          if (connection && typeof connection.close === 'function') {
            connection.close();
          }
        } catch (error) {
          console.log('⚠️ Error closing peer connection for user', userId, ':', error);
        }
      });
      peerConnectionsRef.current.clear();
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 flex items-center justify-center ${className}`}>
      <div className="w-full max-w-4xl space-y-4">
        {/* Header */}
        <div className="bg-black/30 backdrop-blur-lg rounded-2xl border border-white/20 p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Music className="w-5 h-5 text-purple-400" />
              <h1 className="text-xl font-bold text-white">Live DJ Stream</h1>
              {isAdmin && (
                <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full">
                  🔧 Admin
                </span>
              )}
            </div>
            {isAdminSuperAdmin && !isAdminListener && (
              <div className="flex items-center space-x-2 text-gray-300">
                <Users className="w-4 h-4" />
                <span className="text-sm">{listeners} listeners</span>
              </div>
            )}
          </div>

          {/* Current Song */}
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-400">Now Playing</p>
                {isEditingRoomName ? (
                  <form onSubmit={handleRoomNameSubmit} className="flex items-center space-x-2 mt-1">
                    <input
                      type="text"
                      value={roomName}
                      onChange={handleRoomNameChange}
                      className="flex-1 bg-white/20 text-white placeholder-gray-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter room name..."
                      autoFocus
                    />
                    <button 
                      type="submit"
                      className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={handleRoomNameCancel}
                      className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
                    >
                      ✕
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="font-medium text-white truncate">{currentSong}</p>
                    {isDJ && isAdmin && (
                      <button
                        onClick={() => setIsEditingRoomName(true)}
                        className="text-gray-400 hover:text-white transition-colors"
                        title="Edit room name (Admin only)"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="ml-3">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Alert Modal */}
        {showAlert && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={closeAlert}
          >
            <div 
              className="bg-gray-800 rounded-2xl border border-white/20 p-6 shadow-2xl max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-sm">⚠️</span>
                </div>
                <h3 className="text-lg font-bold text-white">แจ้งเตือน</h3>
              </div>
              <p className="text-white mb-6">
                {alertMessage}
              </p>
              <div className="flex justify-end">
                <button
                  onClick={closeAlert}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  ตกลง
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Two Columns for both Admin and User */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {/* Left Column - DJ Controls (Admin/DJ Only) */}
          {(isAdminSuperAdmin || isDJRole) && !isAdminListener && (
            <div className="bg-black/30 backdrop-blur-lg rounded-2xl border border-white/20 p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-purple-300 mb-4 flex items-center">
                <Music className="w-5 h-5 mr-2" />
                DJ Controls
              </h2>

              {/* Admin DJ Mode Toggle */}
              <div className="mb-4 space-y-3">
                <button
                  onClick={toggleDJMode}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                    isDJ 
                      ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                      : 'bg-gray-600 hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  {isDJ ? '🎧 Exit DJ Mode' : '🎧 Enter DJ Mode'}
                </button>
                
                <button
                  onClick={toggleAdminListener}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                    isAdminListener 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-gray-600 hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  {isAdminListener ? '👂 Exit Listen Mode' : '👂 Enter to Listen'}
                </button>
              </div>
                
              {/* DJ Controls - Admin Only */}
              {isDJ && (
                <div className="space-y-4">
                  {/* Audio Source Selection */}
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Audio Source:</label>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        onClick={() => selectAudioSource('microphone')}
                        className={`p-3 text-sm rounded-lg transition-colors text-left ${
                          currentAudioSource === 'microphone' 
                            ? 'bg-purple-600 text-white border-2 border-purple-400' 
                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        }`}
                        title="Microphone only - Voice input"
                      >
                        🎤 Microphone Only
                      </button>
                      <button
                        onClick={() => selectAudioSource('systemAudio')}
                        disabled={!navigator.mediaDevices?.getDisplayMedia || (!(window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0'))}
                        className={`p-3 text-sm rounded-lg transition-colors text-left ${
                          (!navigator.mediaDevices?.getDisplayMedia || (!(window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0')))
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
                            : currentAudioSource === 'systemAudio' 
                              ? 'bg-purple-600 text-white border-2 border-purple-400' 
                              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        }`}
                        title={(!navigator.mediaDevices?.getDisplayMedia || (!(window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0')))
                          ? "System audio not supported in this browser or requires HTTPS" 
                          : "System audio only - Computer sounds"
                        }
                      >
                        🖥️ System Audio Only {(!navigator.mediaDevices?.getDisplayMedia || (!(window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0'))) && '❌'}
                      </button>
                      <button
                        onClick={() => selectAudioSource('mixedMode')}
                        disabled={!navigator.mediaDevices?.getDisplayMedia || (!(window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0'))}
                        className={`p-3 text-sm rounded-lg transition-colors text-left ${
                          (!navigator.mediaDevices?.getDisplayMedia || (!(window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0')))
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
                            : currentAudioSource === 'mixedMode' 
                              ? 'bg-purple-600 text-white border-2 border-purple-400' 
                              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        }`}
                        title={(!navigator.mediaDevices?.getDisplayMedia || (!(window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0')))
                          ? "Mixed mode not supported in this browser or requires HTTPS" 
                          : "Mixed mode - Microphone + System audio"
                        }
                      >
                        🎵 Mixed Mode {(!navigator.mediaDevices?.getDisplayMedia || (!(window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0'))) && '❌'}
                      </button>
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-400">
                      <span className="text-purple-300">Current:</span> {
                        currentAudioSource === 'microphone' ? '🎤 Microphone Only' :
                        currentAudioSource === 'systemAudio' ? '🖥️ System Audio Only' :
                        '🎵 Mixed Mode (Microphone + System Audio)'
                      }
                    </div>
                  </div>

                  {/* Main Controls */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={togglePlayPause}
                      className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      <span>{isPlaying ? 'Pause' : 'Play'}</span>
                    </button>
                    <button
                      onClick={toggleMute}
                      className="bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                    </button>
                  </div>
                  
                  {/* Admin Audio Control */}
                  <div className="mt-3">
                    <button
                      onClick={toggleAdminAudio}
                      className={`w-full py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                        adminAudioMuted 
                          ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {adminAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      <span>{adminAudioMuted ? 'Unmute Admin Audio' : 'Mute Admin Audio'}</span>
                    </button>
                    <p className="text-xs text-gray-400 mt-1 text-center">
                      {adminAudioMuted ? '🔇 You won\'t hear your own audio' : '🔊 You can hear your own audio'}
                    </p>
                  </div>
                  
                  {/* Incognito Mode Warning */}
                  {isIncognitoMode && (
                    <div className="p-3 bg-yellow-600/20 border border-yellow-500/30 rounded-lg mb-3">
                      <h4 className="text-sm font-medium text-yellow-300 mb-2">🔍 Incognito/Private Mode Detected</h4>
                      <div className="space-y-1">
                        <p className="text-xs text-yellow-400">
                          ⚠️ You are using incognito/private mode. Some features may not work properly:
                        </p>
                        <ul className="text-xs text-yellow-400 ml-4 space-y-1">
                          <li>• System audio capture may be limited</li>
                          <li>• Local storage may not persist</li>
                          <li>• Some browser APIs may be restricted</li>
                        </ul>
                        <p className="text-xs text-yellow-300 mt-2">
                          💡 For best experience, try using normal browsing mode
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Browser Info */}
                  <div className="p-3 bg-blue-600/20 border border-blue-500/30 rounded-lg mb-3">
                    <h4 className="text-sm font-medium text-blue-300 mb-2">🌐 Browser Information</h4>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-blue-400">Browser:</span>
                        <span className="text-xs text-blue-300">
                          {browserSupport.browser?.name} {browserSupport.browser?.version}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-blue-400">System Audio:</span>
                        <span className={`text-xs ${browserSupport.systemAudio ? 'text-green-400' : 'text-red-400'}`}>
                          {browserSupport.systemAudio ? '✅ Supported' : '❌ Not Supported'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-blue-400">Mixed Mode:</span>
                        <span className={`text-xs ${browserSupport.mixedMode ? 'text-green-400' : 'text-red-400'}`}>
                          {browserSupport.mixedMode ? '✅ Supported' : '❌ Not Supported'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-blue-400">Incognito Mode:</span>
                        <span className={`text-xs ${isIncognitoMode ? 'text-yellow-400' : 'text-green-400'}`}>
                          {isIncognitoMode ? '🔍 Detected' : '✅ Normal Mode'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Audio Error Display */}
                  {audioError && (
                    <div className="p-3 bg-red-600/20 border border-red-500/30 rounded-lg">
                      <p className="text-xs text-red-300">⚠️ {audioError}</p>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

          {/* User Listening Status */}
          {(!isAdminSuperAdmin || isAdminListener || isDJRole) && (
            <div className="bg-black/30 backdrop-blur-lg rounded-2xl border border-white/20 p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-green-300 mb-4 flex items-center">
                <Music className="w-5 h-5 mr-2" />
                DJ Stream Status
              </h2>
              
              {/* Vinyl Display */}
              <div className="mb-6">
                <div className="flex items-center justify-center">
                  <div className="relative">
                    {/* Vinyl Record */}
                    <div 
                      className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border-4 border-gray-600 flex items-center justify-center"
                      style={{
                        transform: `rotate(${vinylRotation}deg)`,
                        transition: isPlaying ? 'none' : 'transform 0.3s ease'
                      }}
                    >
                      {/* Vinyl Center */}
                      <div className="w-8 h-8 rounded-full bg-black border-2 border-gray-400"></div>
                      {/* Vinyl Grooves */}
                      <div className="absolute inset-4 rounded-full border border-gray-600"></div>
                      <div className="absolute inset-6 rounded-full border border-gray-600"></div>
                      <div className="absolute inset-8 rounded-full border border-gray-600"></div>
                      <div className="absolute inset-10 rounded-full border border-gray-600"></div>
                    </div>
                    {/* Vinyl Label */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                        <Music className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-center mt-4">
                  <p className="text-sm text-gray-400">
                    {isPlaying ? '🎵 Now Playing' : '⏸️ Paused'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {isPlaying ? 'Vinyl is spinning' : 'Waiting for DJ to start'}
                  </p>
                </div>
              </div>

              {/* Audio Controls */}
              <div className="p-4 bg-white/10 rounded-lg mb-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Audio Controls</h3>
                
                {/* Compact Audio Controls Row */}
                <div className="flex items-center space-x-3">
                  {/* Play/Stop Button - Hidden for users */}
                  <button
                    onClick={forceRestartListening}
                    className={`hidden w-10 h-10 rounded-full flex items-center justify-center transition-colors bg-green-600 hover:bg-green-700 text-white`}
                    title="Restart connection to DJ stream"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  
                  {/* Mute Button */}
                  <button
                    onClick={toggleUserMute}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      userMuted 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'bg-gray-600 hover:bg-gray-700 text-white'
                    }`}
                  >
                    {userMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  
                  {/* Volume Slider */}
                  <div className="flex items-center space-x-2 flex-1">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={userVolume}
                      onChange={(e) => handleUserVolumeChange(parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #10b981 0%, #10b981 ${userVolume * 100}%, #374151 ${userVolume * 100}%, #374151 100%)`
                      }}
                    />
                    <span className="text-xs text-gray-400 w-8">
                      {Math.round(userVolume * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Stream Status - Hidden for users */}
              {isAdminSuperAdmin && !isAdminListener && (
                <div className="p-4 bg-white/10 rounded-lg mb-4">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Stream Status</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Status:</span>
                      <span className={`text-xs ${isPlaying ? 'text-green-400' : 'text-gray-500'}`}>
                        {isPlaying ? '🔴 Live' : '⚫ Offline'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Listeners:</span>
                      <span className="text-xs text-gray-300">{listeners}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Connection:</span>
                      <span className={`text-xs ${connectionStatus ? 'text-green-400' : 'text-red-400'}`}>
                        {connectionStatus ? '🟢 Connected' : '🔴 Disconnected'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* User Mode - Hidden for users */}
              {false && (
                <div className="p-4 bg-blue-600/20 border border-blue-500/30 rounded-lg mb-4">
                  <p className="text-xs text-blue-300 mb-2">
                    💡 <strong>User Mode</strong>
                  </p>
                  <p className="text-xs text-blue-400">
                    You are viewing as a listener. Only admins can control the stream.
                  </p>
                </div>
              )}
              
              {/* Listening Status - Hidden for users */}
              {isAdminSuperAdmin && !isAdminListener && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Listening Status:</span>
                    <span className={`text-sm font-medium ${
                      listeningStatus === 'connected' ? 'text-green-400' :
                      listeningStatus === 'connecting' ? 'text-yellow-400' :
                      listeningStatus === 'error' ? 'text-red-400' :
                      'text-gray-400'
                    }`}>
                      {listeningStatus === 'connected' ? '🎧 Connected' :
                       listeningStatus === 'connecting' ? '🔄 Connecting...' :
                       listeningStatus === 'error' ? '❌ Error' :
                       '💤 Idle'}
                    </span>
                  </div>
                  
                  {djStream && (
                    <div className="p-3 bg-green-600/20 border border-green-500/30 rounded-lg">
                      <p className="text-sm text-green-300">
                        🎧 <strong>DJ is Live!</strong>
                      </p>
                      <p className="text-xs text-green-400 mt-1">
                        Listening to: {djStream.djName}
                      </p>
                    </div>
                  )}
                  
                  {!djStream && listeningStatus === 'idle' && (
                    <div className="p-3 bg-gray-600/20 border border-gray-500/30 rounded-lg">
                      <p className="text-sm text-gray-300">
                        💤 <strong>No DJ Streaming</strong>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Waiting for DJ to start streaming...
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Exit Listen Mode Button for Admin */}
              {isAdminListener && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <button
                    onClick={toggleAdminListener}
                    className="w-full py-3 px-4 rounded-lg font-semibold transition-colors bg-green-600 hover:bg-green-700 text-white"
                  >
                    👂 Exit Listen Mode
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Right Column - Chat */}
          <div className="bg-black/30 backdrop-blur-lg rounded-2xl border border-white/20 p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-blue-300 mb-4 flex items-center">
                <MessageCircle className="w-5 h-5 mr-2" />
                Live Chat
              </h2>
            
              {/* Messages */}
              <div className="max-h-60 overflow-y-auto mb-4 space-y-2">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">No messages yet</p>
                    <p className="text-xs text-gray-500">Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    // Check if this is admin message
                    const isAdminMessage = message.username === 'ผู้ดูแลระบบ' || message.isAdmin;
                    
                    return (
                      <div
                        key={index}
                        className={`text-sm p-3 rounded-lg ${
                          message.isDJ
                            ? 'bg-purple-600/30 border-l-2 border-purple-400'
                            : isAdminMessage
                            ? 'bg-orange-600/30 border-l-2 border-orange-400'
                            : 'bg-white/10'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className={`font-medium ${
                            message.isDJ 
                              ? 'text-purple-300' 
                              : isAdminMessage
                              ? 'text-orange-300'
                              : 'text-gray-300'
                          }`}>
                            {message.username}
                          </span>
                          <span className="text-gray-500 text-xs">{message.timestamp}</span>
                        </div>
                        <p className="text-white">{message.text}</p>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-white/20 text-white placeholder-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              {/* Status Indicator */}
              <div className="flex items-center justify-center space-x-2 text-xs text-gray-400 mt-4">
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                }`}></div>
                <span>{connectionStatus ? 'Connected' : 'Disconnected'}</span>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DJPage;

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
  const [isMuted, setIsMuted] = useState(false);
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
  
  // Refs
  const socketRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioElementRef = useRef(null);
  const messagesEndRef = useRef(null);
  const audioLevelIntervalRef = useRef(null);
  const listenerAudioRef = useRef(null);
  const peerConnectionRef = useRef(null);

  // Initialize
  useEffect(() => {
    initializeSocket();
    checkBrowserSupport();
    checkAdminStatus();
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

  // Socket connection
  const initializeSocket = () => {
    const url = socketUrl || (window.location.hostname === 'localhost' 
      ? 'http://localhost:5000' 
      : window.location.origin);
    
    socketRef.current = io(url);
    setupSocketListeners();
  };

  const setupSocketListeners = () => {
    const socket = socketRef.current;
    
    socket.on('connect', () => {
      console.log('Connected to server:', socket.id);
      setConnectionStatus(true);
      onConnect && onConnect(socket.id);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnectionStatus(false);
      onDisconnect && onDisconnect();
    });

    socket.on('current state', (state) => {
      if (state.currentSong) {
        // Check if we have a saved room name
        const savedRoomName = localStorage.getItem('djRoomName');
        if (savedRoomName && savedRoomName !== state.currentSong.title) {
          // Use saved room name instead of server's default
          setCurrentSong(savedRoomName);
          setRoomName(savedRoomName);
          console.log('Using saved room name instead of server default:', savedRoomName);
          
          // Send to backend if user is admin and DJ
          if (isAdmin && isDJ) {
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
      }
      if (state.connectedUsers) {
        setListeners(state.connectedUsers.length);
      }
    });

    socket.on('user count', (count) => {
      setListeners(count);
    });

    socket.on('chat message', (message) => {
      setMessages(prev => [...prev, message]);
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

    // DJ Audio Streaming Events
    socket.on('dj-streaming-started', (data) => {
      console.log('🎧 DJ started streaming:', data);
      setDjStream(data);
      setListeningStatus('streaming');
      if (!isAdmin) {
        startListening();
      }
    });

    socket.on('dj-streaming-stopped', (data) => {
      console.log('🎧 DJ stopped streaming:', data);
      setDjStream(null);
      setListeningStatus('idle');
      if (!isAdmin) {
        stopListening();
      }
    });

    // WebRTC Signaling Events
    socket.on('webrtc-offer', async (data) => {
      console.log('📡 Received WebRTC offer:', data);
      if (!isAdmin) {
        await handleWebRTCOffer(data);
      }
    });

    socket.on('webrtc-answer', async (data) => {
      console.log('📡 Received WebRTC answer:', data);
      if (isAdmin) {
        await handleWebRTCAnswer(data);
      }
    });

    socket.on('webrtc-ice-candidate', async (data) => {
      console.log('🧊 Received ICE candidate:', data);
      await handleICECandidate(data);
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
    
    const adminPermissions = localStorage.getItem('adminPermissions');
    if (adminPermissions === 'true') {
      isAdminUser = true;
    }
    
    setIsAdmin(isAdminUser);
    
    if (isAdminUser) {
      console.log('✅ User is admin - full DJ controls enabled');
    } else {
      console.log('❌ User is not admin - limited access');
    }
  };

  // Browser support check
  const checkBrowserSupport = () => {
    const support = {
      microphone: !!navigator.mediaDevices?.getUserMedia,
      systemAudio: false,
      mixedMode: false
    };
    
    const isSecureContext = window.isSecureContext || 
                           window.location.protocol === 'https:' || 
                           window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname === '0.0.0.0';
    
    const hasGetDisplayMedia = !!navigator.mediaDevices?.getDisplayMedia;
    
    if (hasGetDisplayMedia && isSecureContext) {
      support.systemAudio = true;
      support.mixedMode = true;
    }
    
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
        // System audio only
        try {
          try {
            console.log('Trying system audio approach 1: video: false, audio: true');
            mediaStream = await navigator.mediaDevices.getDisplayMedia({
              video: false,
              audio: true
            });
          } catch (error1) {
            console.log('Approach 1 failed:', error1);
            try {
              console.log('Trying system audio approach 2: video: true, audio: true');
              mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
              });
            } catch (error2) {
              console.log('Approach 2 failed:', error2);
              throw error2;
            }
          }
          
          console.log('System audio stream started');
          
        } catch (error) {
          console.error('System audio not available:', error);
          if (error.name === 'NotSupportedError') {
            throw new Error('System audio capture is not supported in this browser. Try using Chrome or Edge.');
          } else if (error.name === 'NotAllowedError') {
            throw new Error('System audio access was denied. Please allow screen sharing and select "Share system audio"');
          } else {
            throw new Error(`System audio capture failed: ${error.message}. Make sure to select "Share system audio" when prompted`);
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
        audioElementRef.current.play().catch(error => {
          console.error('Audio playback error:', error);
        });
        
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
    
    socketRef.current.emit('dj control', {
      type: newMutedState ? 'mute' : 'unmute'
    });
  };

  const toggleDJMode = () => {
    const newDJState = !isDJ;
    setIsDJ(newDJState);
    
    if (newDJState) {
      initAudio();
    } else {
      stopAudioStream();
    }
    
    socketRef.current.emit('toggle dj mode');
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
      socketRef.current.emit('chat message', {
        text: newMessage
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

  // WebRTC Audio Streaming Functions
  const startListening = async () => {
    try {
      console.log('🎧 Starting to listen to DJ stream...');
      setListeningStatus('connecting');
      setIsListening(true);
      
      if (!listenerAudioRef.current) {
        listenerAudioRef.current = new Audio();
        listenerAudioRef.current.autoplay = true;
        listenerAudioRef.current.volume = 0.8;
      }
      
      setListeningStatus('connected');
      console.log('✅ Successfully started listening to DJ stream');
    } catch (error) {
      console.error('❌ Error starting to listen:', error);
      setListeningStatus('error');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    console.log('🎧 Stopping DJ stream listening...');
    setIsListening(false);
    setListeningStatus('idle');
    
    if (listenerAudioRef.current) {
      listenerAudioRef.current.pause();
      listenerAudioRef.current.src = '';
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  };

  const handleWebRTCOffer = async (data) => {
    try {
      console.log('📡 Handling WebRTC offer from DJ...');
      
      peerConnectionRef.current = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      peerConnectionRef.current.ontrack = (event) => {
        console.log('🎵 Received audio track from DJ');
        if (listenerAudioRef.current) {
          listenerAudioRef.current.srcObject = event.streams[0];
          listenerAudioRef.current.play().catch(console.error);
        }
      };

      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit('webrtc-ice-candidate', {
            candidate: event.candidate,
            targetId: data.senderId
          });
        }
      };

      await peerConnectionRef.current.setRemoteDescription(data.offer);

      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      socketRef.current.emit('webrtc-answer', {
        answer: answer,
        targetId: data.senderId
      });

      console.log('✅ WebRTC connection established with DJ');
    } catch (error) {
      console.error('❌ Error handling WebRTC offer:', error);
    }
  };

  const handleWebRTCAnswer = async (data) => {
    try {
      console.log('📡 Handling WebRTC answer from listener...');
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(data.answer);
        console.log('✅ WebRTC connection established with listener');
      }
    } catch (error) {
      console.error('❌ Error handling WebRTC answer:', error);
    }
  };

  const handleICECandidate = async (data) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(data.candidate);
        console.log('🧊 ICE candidate added');
      }
    } catch (error) {
      console.error('❌ Error adding ICE candidate:', error);
    }
  };

  // DJ Streaming Functions
  const startDJStreaming = async () => {
    try {
      console.log('🎧 Starting DJ streaming...');
      
      if (!mediaStreamRef.current) {
        console.error('❌ No media stream available for DJ streaming');
        return;
      }

      peerConnectionRef.current = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      mediaStreamRef.current.getTracks().forEach(track => {
        peerConnectionRef.current.addTrack(track, mediaStreamRef.current);
        console.log('🎵 Added track to peer connection:', track.kind);
      });

      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit('webrtc-ice-candidate', {
            candidate: event.candidate,
            targetId: 'broadcast'
          });
        }
      };

      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);

      socketRef.current.emit('webrtc-offer', {
        offer: offer,
        targetId: 'broadcast'
      });

      socketRef.current.emit('dj-streaming-started', {
        djId: socketRef.current.id,
        djName: 'DJ'
      });

      console.log('✅ DJ streaming started successfully');
    } catch (error) {
      console.error('❌ Error starting DJ streaming:', error);
    }
  };

  const stopDJStreaming = () => {
    console.log('🎧 Stopping DJ streaming...');
    
    socketRef.current.emit('dj-streaming-stopped', {
      djId: socketRef.current.id
    });

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
            <div className="flex items-center space-x-2 text-gray-300">
              <Users className="w-4 h-4" />
              <span className="text-sm">{listeners} listeners</span>
            </div>
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

        {/* Main Content - Two Columns for both Admin and User */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {/* Left Column - DJ Controls (Admin Only) */}
          {isAdmin && (
            <div className="bg-black/30 backdrop-blur-lg rounded-2xl border border-white/20 p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-purple-300 mb-4 flex items-center">
                <Music className="w-5 h-5 mr-2" />
                DJ Controls
              </h2>

              {/* Admin DJ Mode Toggle */}
              <div className="mb-4">
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
          {!isAdmin && (
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

              {/* Stream Status */}
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

              {/* User Mode */}
              <div className="p-4 bg-blue-600/20 border border-blue-500/30 rounded-lg mb-4">
                <p className="text-xs text-blue-300 mb-2">
                  💡 <strong>User Mode</strong>
                </p>
                <p className="text-xs text-blue-400">
                  You are viewing as a listener. Only admins can control the stream.
                </p>
              </div>
              
              {/* Listening Status */}
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
                  messages.map((message, index) => (
                    <div
                      key={index}
                      className={`text-sm p-3 rounded-lg ${
                        message.isDJ
                          ? 'bg-purple-600/30 border-l-2 border-purple-400'
                          : 'bg-white/10'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className={`font-medium ${
                          message.isDJ ? 'text-purple-300' : 'text-gray-300'
                        }`}>
                          {message.username}
                        </span>
                        <span className="text-gray-500 text-xs">{message.timestamp}</span>
                      </div>
                      <p className="text-white">{message.text}</p>
                    </div>
                  ))
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

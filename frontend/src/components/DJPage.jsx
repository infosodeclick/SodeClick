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
  
  // Refs
  const socketRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioElementRef = useRef(null);
  const messagesEndRef = useRef(null);
  const audioLevelIntervalRef = useRef(null);

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
        setCurrentSong(state.currentSong.title);
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
    });

    socket.on('user update', (data) => {
      setListeners(data.users.length);
    });
  };

  // Check admin status
  const checkAdminStatus = () => {
    // Check if user is admin (you can implement your own logic here)
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    const userData = localStorage.getItem('user');
    
    console.log('Checking admin status:', {
      token: token ? 'Present' : 'Not found',
      userRole,
      userData: userData ? 'Present' : 'Not found'
    });
    
    let isAdminUser = false;
    
    // Method 1: Check userRole directly
    if (userRole === 'admin' || userRole === 'superadmin') {
      isAdminUser = true;
    }
    
    // Method 2: Check user data if available
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
    
    // Method 3: Check if user has admin permissions
    const adminPermissions = localStorage.getItem('adminPermissions');
    if (adminPermissions === 'true') {
      isAdminUser = true;
    }
    
    // Method 4: For testing purposes - you can temporarily set this to true
    // const isTestAdmin = true; // Uncomment this line for testing
    // if (isTestAdmin) {
    //   isAdminUser = true;
    // }
    
    setIsAdmin(isAdminUser);
    
    if (isAdminUser) {
      console.log('✅ User is admin - full DJ controls enabled');
    } else {
      console.log('❌ User is not admin - limited access');
      console.log('To enable admin mode, set one of these in localStorage:');
      console.log('- localStorage.setItem("userRole", "admin")');
      console.log('- localStorage.setItem("adminPermissions", "true")');
    }
  };

  // Browser support check
  const checkBrowserSupport = () => {
    const support = {
      microphone: !!navigator.mediaDevices?.getUserMedia,
      systemAudio: false,
      mixedMode: false
    };
    
    // Check if we're on HTTPS or localhost for system audio
    const isSecureContext = window.isSecureContext || 
                           window.location.protocol === 'https:' || 
                           window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname === '0.0.0.0';
    
    // Check if getDisplayMedia is available
    const hasGetDisplayMedia = !!navigator.mediaDevices?.getDisplayMedia;
    
    // System audio requires both getDisplayMedia and secure context
    if (hasGetDisplayMedia && isSecureContext) {
      support.systemAudio = true;
      support.mixedMode = true;
    }
    
    setBrowserSupport(support);
    
    console.log('Browser support check:', {
      ...support,
      isSecureContext,
      hasGetDisplayMedia,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      port: window.location.port,
      userAgent: navigator.userAgent,
      isSecureContextValue: window.isSecureContext
    });
    
    // Show warnings for unsupported features
    if (!support.systemAudio) {
      if (!hasGetDisplayMedia) {
        console.warn('⚠️ getDisplayMedia not supported in this browser');
      }
      if (!isSecureContext) {
        console.warn('⚠️ System audio requires HTTPS or localhost');
        console.warn('Current context:', {
          protocol: window.location.protocol,
          hostname: window.location.hostname,
          isSecureContext: window.isSecureContext
        });
      }
    } else {
      console.log('✅ System Audio and Mixed Mode are supported!');
    }
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
          console.log('Audio tracks:', mediaStream.getAudioTracks());
          
          // Check if microphone stream has audio tracks
          const audioTracks = mediaStream.getAudioTracks();
          if (audioTracks.length === 0) {
            console.error('❌ Microphone stream has no audio tracks');
            throw new Error('Microphone stream has no audio tracks. Please check your microphone connection.');
          }
          
          console.log('Microphone track details:', audioTracks.map(track => ({
            label: track.label,
            enabled: track.enabled,
            readyState: track.readyState
          })));
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
        // System audio only - try multiple approaches
        try {
          // Approach 1: Try with video: false, audio: true
          try {
            console.log('Trying system audio approach 1: video: false, audio: true');
            mediaStream = await navigator.mediaDevices.getDisplayMedia({
              video: false,
              audio: true
            });
          } catch (error1) {
            console.log('Approach 1 failed:', error1);
            
            // Approach 2: Try with video: true, audio: true (some browsers require video)
            try {
              console.log('Trying system audio approach 2: video: true, audio: true');
              mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
              });
            } catch (error2) {
              console.log('Approach 2 failed:', error2);
              throw error2; // Use the last error
            }
          }
          
          console.log('System audio stream started');
          console.log('Audio tracks:', mediaStream.getAudioTracks());
          console.log('Video tracks:', mediaStream.getVideoTracks());
          
          // Check if system audio stream has audio tracks
          const audioTracks = mediaStream.getAudioTracks();
          if (audioTracks.length === 0) {
            console.error('❌ System audio stream has no audio tracks');
            throw new Error('System audio stream has no audio tracks. Make sure to select "Share system audio" when prompted.');
          }
          
          console.log('System audio track details:', audioTracks.map(track => ({
            label: track.label,
            enabled: track.enabled,
            readyState: track.readyState
          })));
          
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
        
        // First, try to get microphone stream
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
        
        // Then try to get system audio stream
        let systemStream = null;
        try {
          // Try multiple approaches for system audio
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
          // Use microphone only as fallback
          mediaStream = micStream;
          setAudioError('System audio failed in mixed mode, using microphone only');
          return;
        }
        
        // If we have both streams, try to mix them
        if (micStream && systemStream) {
          // Check if both streams have audio tracks
          const micAudioTracks = micStream.getAudioTracks();
          const systemAudioTracks = systemStream.getAudioTracks();
          
          console.log('Audio tracks check:', {
            micTracks: micAudioTracks.length,
            systemTracks: systemAudioTracks.length,
            micTrackDetails: micAudioTracks.map(track => ({
              label: track.label,
              enabled: track.enabled,
              readyState: track.readyState
            })),
            systemTrackDetails: systemAudioTracks.map(track => ({
              label: track.label,
              enabled: track.enabled,
              readyState: track.readyState
            }))
          });
          
          if (micAudioTracks.length === 0) {
            console.error('❌ Microphone stream has no audio tracks');
            mediaStream = systemStream;
            setAudioError('Microphone has no audio tracks, using system audio only');
            return;
          }
          
          if (systemAudioTracks.length === 0) {
            console.error('❌ System audio stream has no audio tracks');
            mediaStream = micStream;
            setAudioError('System audio has no audio tracks, using microphone only');
            return;
          }
          
          try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create sources only if streams have audio tracks
            const micSource = audioContext.createMediaStreamSource(micStream);
            const systemSource = audioContext.createMediaStreamSource(systemStream);
            const destination = audioContext.createMediaStreamDestination();
            
            // Mix both sources
            micSource.connect(destination);
            systemSource.connect(destination);
            
            mediaStream = destination.stream;
            console.log('✅ Mixed mode stream created successfully');
            console.log('Mixed stream audio tracks:', mediaStream.getAudioTracks().length);
            
          } catch (audioContextError) {
            console.error('❌ AudioContext failed in mixed mode:', audioContextError);
            // Fallback to microphone only
            mediaStream = micStream;
            setAudioError('Audio mixing failed, using microphone only');
          }
        } else {
          // If we don't have both streams, use what we have
          mediaStream = micStream || systemStream;
          console.log('⚠️ Using single stream in mixed mode');
        }
      }

      if (mediaStream) {
        // Stop previous stream if exists
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }
        
        mediaStreamRef.current = mediaStream;
        
        // Create new audio element for playback
        if (audioElementRef.current) {
          audioElementRef.current.pause();
          audioElementRef.current.srcObject = null;
        }
        
        audioElementRef.current = new Audio();
        audioElementRef.current.srcObject = mediaStreamRef.current;
        audioElementRef.current.muted = true; // Prevent feedback
        audioElementRef.current.play().catch(error => {
          console.error('Audio playback error:', error);
        });
        
        startAudioLevelMonitoring();
        console.log(`✅ Audio stream started with source: ${currentAudioSource}`);
        console.log('Stream details:', {
          audioTracks: mediaStream.getAudioTracks().length,
          videoTracks: mediaStream.getVideoTracks().length,
          active: mediaStream.active
        });
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
    setAudioError(null); // Clear any audio errors when stopping
  };

  const startAudioLevelMonitoring = () => {
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
    }
    
    audioLevelIntervalRef.current = setInterval(() => {
      // Mock audio levels for demonstration
      const micLevel = Math.random() * 100;
      const systemLevel = Math.random() * 100;
      
      // Update audio level bars if they exist
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
        setAudioError(null); // Clear previous errors
        await startAudioStream();
    } catch (error) {
        console.error('Failed to start streaming:', error);
        setIsPlaying(false);
        setAudioError(`Failed to start streaming: ${error.message}`);
      }
    } else {
      stopAudioStream();
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

  const testMicrophone = async () => {
    setTestingMicrophone(true);
    setAudioError(null);
    
    try {
      console.log('🎤 Testing microphone...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });
      
      console.log('✅ Microphone test successful!');
      console.log('Audio tracks:', stream.getAudioTracks());
      
      // Test audio levels
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      console.log('Audio level:', average);
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop());
      audioContext.close();
      
      setMicrophoneStatus('working');
      setAudioError('✅ Microphone test successful! Your microphone is working.');
      
    } catch (error) {
      console.error('❌ Microphone test failed:', error);
      setMicrophoneStatus('failed');
      
      if (error.name === 'NotAllowedError') {
        setAudioError('❌ Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (error.name === 'NotFoundError') {
        setAudioError('❌ No microphone found. Please connect a microphone and try again.');
      } else {
        setAudioError(`❌ Microphone test failed: ${error.message}`);
      }
    } finally {
      setTestingMicrophone(false);
    }
  };

  const testMixedMode = async () => {
    setTestingMixedMode(true);
    setAudioError(null);
    
    try {
      console.log('🎵 Testing Mixed Mode...');
      
      // Test microphone first
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });
      console.log('✅ Microphone stream obtained for mixed mode test');
      
      // Test system audio
      let systemStream;
      try {
        systemStream = await navigator.mediaDevices.getDisplayMedia({
          video: false,
          audio: true
        });
        console.log('✅ System audio stream obtained for mixed mode test');
      } catch (systemError) {
        console.error('❌ System audio failed in mixed mode test:', systemError);
        // Stop microphone stream
        micStream.getTracks().forEach(track => track.stop());
        throw new Error('System audio failed in mixed mode test');
      }
      
      // Check audio tracks before mixing
      const micAudioTracks = micStream.getAudioTracks();
      const systemAudioTracks = systemStream.getAudioTracks();
      
      console.log('Audio tracks check for mixed mode test:', {
        micTracks: micAudioTracks.length,
        systemTracks: systemAudioTracks.length,
        micTrackDetails: micAudioTracks.map(track => ({
          label: track.label,
          enabled: track.enabled,
          readyState: track.readyState
        })),
        systemTrackDetails: systemAudioTracks.map(track => ({
          label: track.label,
          enabled: track.enabled,
          readyState: track.readyState
        }))
      });
      
      if (micAudioTracks.length === 0) {
        throw new Error('Microphone stream has no audio tracks');
      }
      
      if (systemAudioTracks.length === 0) {
        throw new Error('System audio stream has no audio tracks');
      }
      
      // Test AudioContext mixing
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const micSource = audioContext.createMediaStreamSource(micStream);
      const systemSource = audioContext.createMediaStreamSource(systemStream);
      const destination = audioContext.createMediaStreamDestination();
      
      // Mix both sources
      micSource.connect(destination);
      systemSource.connect(destination);
      
      const mixedStream = destination.stream;
      console.log('✅ Mixed mode stream created successfully');
      console.log('Mixed stream details:', {
        audioTracks: mixedStream.getAudioTracks().length,
        active: mixedStream.active
      });
      
      // Stop all test streams
      micStream.getTracks().forEach(track => track.stop());
      systemStream.getTracks().forEach(track => track.stop());
      audioContext.close();
      
      setMixedModeStatus('working');
      setAudioError('✅ Mixed Mode test successful! You can now use Mixed Mode.');
      
    } catch (error) {
      console.error('❌ Mixed mode test failed:', error);
      setMixedModeStatus('failed');
      setAudioError(`❌ Mixed Mode test failed: ${error.message}`);
    } finally {
      setTestingMixedMode(false);
    }
  };

  const testSystemAudio = async () => {
    setTestingSystemAudio(true);
    setAudioError(null);
    
    try {
      console.log('Testing system audio...');
      console.log('Browser info:', {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        isSecureContext: window.isSecureContext,
        protocol: window.location.protocol,
        hostname: window.location.hostname
      });
      
      // First check if getDisplayMedia exists
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error('getDisplayMedia is not available in this browser');
      }
      
      // Try different approaches
      let stream = null;
      
      // Approach 1: Try with video: false, audio: true
      try {
        console.log('Trying approach 1: video: false, audio: true');
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: false,
          audio: true
        });
      } catch (error1) {
        console.log('Approach 1 failed:', error1);
        
        // Approach 2: Try with video: true, audio: true (some browsers require video)
        try {
          console.log('Trying approach 2: video: true, audio: true');
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
          });
        } catch (error2) {
          console.log('Approach 2 failed:', error2);
          
          // Approach 3: Try with just audio constraint
          try {
            console.log('Trying approach 3: audio only');
            stream = await navigator.mediaDevices.getDisplayMedia({
              audio: true
            });
          } catch (error3) {
            console.log('Approach 3 failed:', error3);
            throw new Error(`All approaches failed. Last error: ${error3.message}`);
          }
        }
      }
      
      console.log('✅ System audio test successful!');
      console.log('Stream:', stream);
      console.log('Audio tracks:', stream.getAudioTracks());
      console.log('Video tracks:', stream.getVideoTracks());
      
      // Stop the test stream immediately
      stream.getTracks().forEach(track => track.stop());
      
      setAudioError('✅ System Audio test successful! You can now use System Audio and Mixed Mode.');
      
      // Update browser support
      setBrowserSupport(prev => ({
        ...prev,
        systemAudio: true,
        mixedMode: true
      }));
      
    } catch (error) {
      console.error('❌ System audio test failed:', error);
      setAudioError(`System Audio test failed: ${error.message}. This browser may not support system audio capture.`);
    } finally {
      setTestingSystemAudio(false);
    }
  };

  const selectAudioSource = (sourceType) => {
    if (!isDJ) return;
    
    // Check if the source is supported with real-time check
    const isSecureContext = window.isSecureContext || 
                           window.location.protocol === 'https:' || 
                           window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname === '0.0.0.0';
    
    if (sourceType === 'systemAudio') {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        setAudioError('System Audio is not supported in this browser');
        return;
      }
      if (!isSecureContext) {
        setAudioError('System Audio requires HTTPS or localhost');
        return;
      }
    }
    
    if (sourceType === 'mixedMode') {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        setAudioError('Mixed Mode requires system audio support');
        return;
      }
      if (!isSecureContext) {
        setAudioError('Mixed Mode requires HTTPS or localhost');
        return;
      }
    }
    
    const previousSource = currentAudioSource;
    setCurrentAudioSource(sourceType);
    setAudioError(null); // Clear any previous errors
    
    // Show notification about the change
    const sourceNames = {
      'microphone': 'Microphone Only',
      'systemAudio': 'System Audio Only', 
      'mixedMode': 'Mixed Mode (Microphone + System Audio)'
    };
    
    console.log(`Audio source changed from ${sourceNames[previousSource]} to ${sourceNames[sourceType]}`);
    
    // If currently streaming, show a warning that they need to restart
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
      setCurrentSong(roomName.trim());
      setIsEditingRoomName(false);
      console.log('Room name changed to:', roomName.trim());
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

  // Cleanup
  const cleanup = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    stopAudioStream();
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

        {/* Main Content - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column - DJ Controls */}
          <div className="bg-black/30 backdrop-blur-lg rounded-2xl border border-white/20 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-purple-300 mb-4 flex items-center">
              <Music className="w-5 h-5 mr-2" />
              {isAdmin ? 'DJ Controls' : 'Live Stream'}
            </h2>

            {/* Admin DJ Mode Toggle */}
            {isAdmin && (
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
                    )}

            {/* User View - Vinyl Display */}
            {!isAdmin && (
              <div className="mb-4">
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
                )}
                
            {/* DJ Controls - Admin Only */}
            {isDJ && isAdmin && (
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
                  
                  {/* Current Audio Source Status */}
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
                    <p className="text-xs text-red-400 mt-1">
                      {currentAudioSource === 'systemAudio' && 
                        'Make sure to select "Share system audio" when prompted'
                      }
                      {currentAudioSource === 'mixedMode' && 
                        'Make sure to allow both microphone and system audio access'
                      }
                    </p>
                  </div>
                )}

                {/* Audio Testing */}
                <div className="p-3 bg-yellow-600/20 border border-yellow-500/30 rounded-lg">
                  <p className="text-xs text-yellow-300 mb-2">
                    ⚠️ <strong>Audio Testing:</strong>
                  </p>
                  
                  {/* Microphone Test */}
                  <div className="mb-3">
                    <p className="text-xs text-yellow-400 mb-1">Microphone Status:</p>
                    <button
                      onClick={testMicrophone}
                      disabled={testingMicrophone}
                      className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-xs rounded transition-colors"
                    >
                      {testingMicrophone ? 'Testing...' : '🎤 Test Microphone'}
                    </button>
                    {microphoneStatus === 'working' && (
                      <p className="text-xs text-green-400 mt-1">✅ Microphone is working</p>
                    )}
                    {microphoneStatus === 'failed' && (
                      <p className="text-xs text-red-400 mt-1">❌ Microphone test failed</p>
                    )}
                  </div>
                  
                  {/* System Audio Test */}
                  <div className="mb-3">
                    <p className="text-xs text-yellow-400 mb-1">System Audio Status:</p>
                    <div className="text-xs text-yellow-400 space-y-1 mb-2">
                      <p>• Browser: {navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Edge') ? 'Edge' : navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Other'}</p>
                      <p>• Secure Context: {window.isSecureContext ? '✅ Yes' : '❌ No'}</p>
                      <p>• getDisplayMedia: {navigator.mediaDevices?.getDisplayMedia ? '✅ Available' : '❌ Not Available'}</p>
                    </div>
                    
                    <button
                      onClick={testSystemAudio}
                      disabled={testingSystemAudio}
                      className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-xs rounded transition-colors"
                    >
                      {testingSystemAudio ? 'Testing...' : '🧪 Test System Audio'}
                    </button>
                  </div>
                  
                  {/* Mixed Mode Test */}
                  <div className="mb-3">
                    <p className="text-xs text-yellow-400 mb-1">Mixed Mode Status:</p>
                    <button
                      onClick={testMixedMode}
                      disabled={testingMixedMode}
                      className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white text-xs rounded transition-colors"
                    >
                      {testingMixedMode ? 'Testing...' : '🎵 Test Mixed Mode'}
                    </button>
                    {mixedModeStatus === 'working' && (
                      <p className="text-xs text-green-400 mt-1">✅ Mixed Mode is working</p>
                    )}
                    {mixedModeStatus === 'failed' && (
                      <p className="text-xs text-red-400 mt-1">❌ Mixed Mode test failed</p>
                    )}
                  </div>
                  
                  {/* Requirements and Tips */}
                  <div className="mt-2">
                    <p className="text-xs text-yellow-300 mb-1">
                      <strong>Requirements:</strong>
                    </p>
                    {!navigator.mediaDevices?.getDisplayMedia && (
                      <p className="text-xs text-yellow-400">• ❌ getDisplayMedia not supported</p>
                    )}
                    {(!(window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0')) && (
                      <p className="text-xs text-yellow-400">• ❌ System Audio requires HTTPS or localhost</p>
                    )}
                    <p className="text-xs text-yellow-400">• 💡 Try using Chrome/Edge on HTTPS</p>
                    <p className="text-xs text-yellow-400">• 🎤 Test microphone first, then system audio</p>
                    <p className="text-xs text-yellow-400">• 🎵 Mixed Mode requires both to work</p>
                    <p className="text-xs text-yellow-400">• ⚠️ Make sure to select "Share system audio" when prompted</p>
                    <p className="text-xs text-yellow-400">• 🔧 If Mixed Mode fails, it will fallback to Microphone only</p>
                  </div>
                </div>
              </div>
            )}

            {/* User View - Stream Status */}
            {!isAdmin && (
              <div className="space-y-4">
                <div className="p-4 bg-white/10 rounded-lg">
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
                      <span className="text-xs text-gray-400">Audio Source:</span>
                      <span className="text-xs text-gray-300">
                        {currentAudioSource === 'microphone' ? '🎤 Microphone' :
                         currentAudioSource === 'systemAudio' ? '🖥️ System Audio' :
                         '🎵 Mixed Mode'}
                      </span>
                    </div>
                    </div>
                  </div>
                
                <div className="p-4 bg-blue-600/20 border border-blue-500/30 rounded-lg">
                  <p className="text-xs text-blue-300 mb-2">
                    💡 <strong>User Mode</strong>
                  </p>
                  <p className="text-xs text-blue-400 mb-3">
                    You are viewing as a listener. Only admins can control the stream.
                  </p>
                  
                  {/* Admin Mode Toggle for Testing */}
                  <div className="space-y-2">
                    <p className="text-xs text-blue-300">
                      <strong>Testing Admin Mode:</strong>
                    </p>
                    <button
                      onClick={() => {
                        localStorage.setItem('userRole', 'admin');
                        setIsAdmin(true);
                        console.log('✅ Admin mode enabled for testing');
                      }}
                      className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                    >
                      🔧 Enable Admin Mode (Test)
                    </button>
                    <button
                      onClick={() => {
                        localStorage.removeItem('userRole');
                        localStorage.removeItem('adminPermissions');
                        setIsAdmin(false);
                        console.log('❌ Admin mode disabled');
                      }}
                      className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                    >
                      👤 Disable Admin Mode
                    </button>
                  </div>
                </div>
              </div>
              )}
        </div>

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


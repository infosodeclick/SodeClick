import React, { useRef, useEffect, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { useAuth } from '../contexts/AuthContext';

// Custom CSS to ensure Video.js has fixed size and doesn't stretch
const videoPlayerStyles = `
  /* Force Video.js container to 1920x1080 aspect ratio */
  .video-js {
    width: 1920px !important;
    height: 1080px !important;
    max-width: 1920px !important;
    max-height: 1080px !important;
    position: absolute !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    display: block !important;
    background: #000 !important;
  }
  
  /* Force video element to 1920x1080 aspect ratio */
  .video-js .vjs-tech {
    width: 1920px !important;
    height: 1080px !important;
    max-width: 1920px !important;
    max-height: 1080px !important;
    object-fit: contain !important;
    position: absolute !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    z-index: 1 !important;
  }
  
  /* Force video to 1920x1080 aspect ratio */
  .video-js video {
    width: 1920px !important;
    height: 1080px !important;
    max-width: 1920px !important;
    max-height: 1080px !important;
    object-fit: contain !important;
    position: absolute !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    z-index: 2 !important;
    background: #000 !important;
  }
  
  /* ซ่อน controls ที่ไม่ต้องการ */
  .video-js .vjs-control-bar {
    display: none !important;
  }
  
  /* ซ่อน big play button */
  .video-js .vjs-big-play-button {
    display: none !important;
  }
  
  /* ซ่อน live control */
  .video-js .vjs-live-control {
    display: none !important;
  }
  
  /* ซ่อน poster */
  .video-js .vjs-poster {
    display: none !important;
  }
  
  /* บังคับให้เต็มพื้นที่ทั้งหมด */
  .video-js * {
    box-sizing: border-box !important;
  }

  /* Custom slider styles */
  .slider::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    cursor: pointer;
    border: 2px solid #4b5563;
    transition: all 0.2s;
  }

  .slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
    border-color: #60a5fa;
  }

  .slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    cursor: pointer;
    border: 2px solid #4b5563;
    transition: all 0.2s;
  }

  .slider::-moz-range-thumb:hover {
    transform: scale(1.2);
    border-color: #60a5fa;
  }

  /* Responsive behavior for smaller screens */
  @media (max-width: 1920px) {
    .video-js {
      width: 100% !important;
      max-width: 1920px !important;
      height: auto !important;
      max-height: 1080px !important;
      aspect-ratio: 1920/1080 !important;
    }
    .video-js .vjs-tech,
    .video-js video {
      width: 100% !important;
      max-width: 1920px !important;
      height: auto !important;
      max-height: 1080px !important;
      aspect-ratio: 1920/1080 !important;
    }
  }
`;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const HLS_PORT = import.meta.env.VITE_HLS_PORT || 8000;

// Get HLS URL based on environment
const getHLSBaseURL = () => {
  // HLS files are served by Node Media Server on port 8000
  try {
    const url = new URL(API_BASE_URL);
    const hostname = url.hostname;
    
    if (import.meta.env.PROD) {
      // In production, use the same domain as API but HLS port
      return `${url.protocol}//${hostname}:${HLS_PORT}`;
    } else {
      // In development, use localhost with HLS port
      return `http://localhost:${HLS_PORT}`;
    }
  } catch (error) {
    // Fallback to localhost if URL parsing fails
    return `http://localhost:${HLS_PORT}`;
  }
};

const StreamPlayer = ({ streamKey, isLive, onError }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Custom controls state
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  
  // Get user info to check if admin
  const { user } = useAuth();
  const isAdmin = user && (user.isAdmin === true || user.isSuperAdmin === true || user.role === 'admin' || user.role === 'superadmin');

  // Custom controls functions
  const handlePlayPause = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pause();
        setIsPlaying(false);
      } else {
        playerRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    if (playerRef.current) {
      playerRef.current.volume(newVolume);
      if (newVolume > 0) {
        setIsMuted(false);
      }
    }
  };

  const handleMuteToggle = () => {
    if (playerRef.current) {
      if (isMuted) {
        playerRef.current.volume(volume);
        setIsMuted(false);
      } else {
        playerRef.current.volume(0);
        setIsMuted(true);
      }
    }
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Fullscreen event listeners
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const stopLoading = () => {
    setIsLoading(false);
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      setLoadingTimeout(null);
    }
    if (playerRef.current) {
      try {
        playerRef.current.pause();
        playerRef.current.currentTime(0);
        console.log('📺 Stream loading stopped');
      } catch (error) {
        console.warn('Error stopping stream:', error);
      }
    }
  };

  const refreshStream = () => {
    setError(null);
    setIsLoading(true);
    
    if (playerRef.current) {
      try {
        console.log('📺 Refreshing stream...');
        playerRef.current.load();
      } catch (error) {
        console.error('Error refreshing stream:', error);
        setError('ไม่สามารถรีเฟรชสตรีมได้');
        setIsLoading(false);
      }
    }
  };
  const [loadingTimeout, setLoadingTimeout] = useState(null);

  // Separate useEffect for player initialization
  useEffect(() => {
    if (!videoRef.current || !streamKey) return;

    let retryCount = 0;
    const MAX_RETRIES = 3; // Reduced retries
    let isComponentMounted = true;
    let retryTimer = null;

    // Add delay to ensure DOM is ready
    const initPlayer = () => {
      try {
        // Check if component is still mounted
        if (!isComponentMounted) {
          console.log('📺 Component unmounted, stopping initialization');
          return;
        }

        // Check if element is in DOM and component is still mounted
        if (!videoRef.current || !document.contains(videoRef.current)) {
          retryCount++;
          if (retryCount <= MAX_RETRIES) {
            console.warn(`Video element not ready, retrying... (${retryCount}/${MAX_RETRIES})`);
            retryTimer = setTimeout(initPlayer, 300 * retryCount); // Increased delay
            return;
          } else {
            console.error('Max retries reached, video element still not ready');
            setError('ไม่สามารถเริ่มต้นเครื่องเล่นวิดีโอได้');
            setIsLoading(false);
            return;
          }
        }

        // Check if player is already initialized
        if (playerRef.current) {
          console.log('📺 Video.js player already exists, disposing old player');
          try {
            playerRef.current.dispose();
          } catch (error) {
            console.warn('Error disposing old player:', error);
          }
          playerRef.current = null;
        }

        // Check if element has videojs class (already initialized)
        if (videoRef.current.classList.contains('video-js')) {
          console.log('📺 Video element already has videojs class, removing');
          videoRef.current.classList.remove('video-js');
        }

        // Initialize Video.js player
        const hlsUrl = `${getHLSBaseURL()}/live/${streamKey}.m3u8`;
        console.log('📺 HLS URL:', hlsUrl);
        
        const player = videojs(videoRef.current, {
          controls: false,
          responsive: false,
          fluid: false,
          fill: false,
          width: '100%',
          height: '100%',
          autoplay: 'muted',
          muted: true,
          playsinline: true,
          preload: 'auto',
          liveui: false,
          sources: isLive ? [{
            src: hlsUrl,
            type: 'application/x-mpegURL'
          }] : [],
          html5: {
            hls: {
              enableLowInitialPlaylist: false,
              smoothQualityChange: false,
              overrideNative: false
            }
          }
        });

        // Let Video.js handle positioning and styling

        playerRef.current = player;
        console.log('📺 Video.js player initialized successfully');
        console.log('🔍 Live Stream Debug Info:', {
          streamKey,
          isLive,
          hlsUrl,
          hasSources: !!player.src,
          playerReady: player.readyState(),
          playerError: player.error()
        });
      } catch (error) {
        console.error('Error initializing Video.js player:', error);
        setError('ไม่สามารถเริ่มต้นเครื่องเล่นวิดีโอได้');
        setIsLoading(false);
      }
    };

    // Initialize with small delay
    const timer = setTimeout(initPlayer, 200);
    
    return () => {
      isComponentMounted = false;
      clearTimeout(timer);
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, [streamKey]); // Only depend on streamKey

  // Separate useEffect for player event handlers
  useEffect(() => {
    if (!playerRef.current) return;

    // Player event handlers
    const player = playerRef.current;

    const handleReady = () => {
      console.log('📺 Stream player ready');
      setIsLoading(false);
      
      // Video.js will handle positioning and styling
      
      // Try to play immediately when ready
      if (playerRef.current && isLive) {
        console.log('📺 Player ready, attempting immediate play...');
        setTimeout(() => {
          if (playerRef.current) {
            playerRef.current.play().then(() => {
              console.log('✅ Immediate play successful');
              setIsPlaying(true);
            }).catch(error => {
              console.log('📺 Immediate play failed:', error);
              // Wait for user interaction
            });
          }
        }, 500); // Small delay to ensure everything is ready
      }
    };

    const handleLoadStart = () => {
      console.log('📺 Stream loading started');
      setIsLoading(true);
      setError(null);
      
      // Only set timeout if stream is supposed to be live
      if (isLive) {
        // Set timeout for loading - if loading takes too long, show error
        const timeout = setTimeout(() => {
          if (isLoading) {
            console.log('📺 Stream loading timeout');
            setIsLoading(false);
            setError('โหลดสตรีมช้าเกินไป หรือสตรีมยังไม่ได้เริ่ม กรุณาลองใหม่');
          }
        }, 10000); // 10 seconds timeout
        
        setLoadingTimeout(timeout);
      } else {
        console.log('📺 Stream is not live, skipping timeout');
        setIsLoading(false);
      }
    };

    const handleCanPlay = () => {
      console.log('📺 Stream can play');
      setIsLoading(false);
      
      // Clear loading timeout
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        setLoadingTimeout(null);
      }
      
      // Try to play the video automatically
      if (playerRef.current) {
        console.log('📺 Attempting autoplay...');
        playerRef.current.play().then(() => {
          console.log('✅ Autoplay successful');
          setIsPlaying(true);
        }).catch(error => {
          console.log('📺 Autoplay failed, user interaction required:', error);
          // Don't set error here, just wait for user interaction
        });
      }
    };

    const handleError = (e) => {
      const error = player.error();
      console.error('📺 Stream player error:', error);
      
      // Clear loading timeout
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        setLoadingTimeout(null);
      }
      
      // Handle different error types
      if (error && error.code === 2) {
        // Network error (404, stream not found)
        if (error.message && error.message.includes('404')) {
          if (!isLive) {
            setError('สตรีมยังไม่ได้เริ่ม กรุณารอ DJ เริ่มสตรีมใน OBS');
          } else {
            setError('สตรีมกำลังประมวลผล กรุณารอสักครู่');
          }
        } else {
          setError('ไม่สามารถเชื่อมต่อสตรีมได้ ตรวจสอบการตั้งค่า OBS');
        }
      } else if (error && error.code === 4) {
        // Source not supported
        setError('รูปแบบสตรีมไม่รองรับ');
      } else {
        setError('ไม่สามารถโหลดสตรีมได้');
      }
      
      setIsLoading(false);
      onError && onError(error);
    };

    const handleWaiting = () => {
      console.log('📺 Stream waiting for data');
      // Only show loading if stream is supposed to be live
      if (isLive) {
        setIsLoading(true);
      }
    };

    const handlePlaying = () => {
      console.log('📺 Stream playing');
      setIsLoading(false);
      setError(null); // Clear any previous errors
      setIsPlaying(true);
      
      // Video.js will handle positioning and styling when playing
    };

    // Add event listeners
    player.ready(handleReady);
    player.on('loadstart', handleLoadStart);
    player.on('canplay', handleCanPlay);
    player.on('loadeddata', () => {
      console.log('📺 Stream data loaded');
      setIsLoading(false);
      
      // Video.js will handle positioning and styling
    });
    
    player.on('loadedmetadata', () => {
      console.log('📺 Stream metadata loaded');
      
      // Video.js will handle positioning and styling
      
      // Try to play when metadata is loaded
      if (playerRef.current && isLive && !isPlaying) {
        playerRef.current.play().then(() => {
          console.log('✅ Play successful after metadata loaded');
          setIsPlaying(true);
        }).catch(error => {
          console.log('📺 Play failed after metadata loaded:', error);
        });
      }
    });
    player.on('error', handleError);
    player.on('waiting', handleWaiting);
    player.on('playing', handlePlaying);
    player.on('pause', () => {
      console.log('📺 Stream paused');
      setIsPlaying(false);
    });

    // Cleanup
    return () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      // Remove event listeners
      player.off('ready', handleReady);
      player.off('loadstart', handleLoadStart);
      player.off('canplay', handleCanPlay);
      player.off('loadeddata');
      player.off('loadedmetadata');
      player.off('error', handleError);
      player.off('waiting', handleWaiting);
      player.off('playing', handlePlaying);
      player.off('pause');
    };
  }, [isLive, onError, loadingTimeout, isLoading]); // Dependencies for event handlers

  // Update source when streamKey or isLive changes
  useEffect(() => {
    if (!playerRef.current || !streamKey) return;

    const updateSource = async () => {
      try {
        const newSource = `${getHLSBaseURL()}/live/${streamKey}.m3u8`;
        console.log('📺 Updating stream source to:', newSource);
        
        // Clear any existing errors
        setError(null);
        setIsLoading(true);
        
        // Check if stream is live before trying to load
        if (!isLive) {
          console.log('📺 Stream is not live, skipping source update');
          setIsLoading(false);
          return;
        }
        
        // Test HLS URL first and check if it's recent
        try {
          const response = await fetch(newSource, { method: 'HEAD' });
          if (!response.ok) {
            console.log('📺 HLS file not found, stream may not be live yet');
            setError('สตรีมยังไม่ได้เริ่ม กรุณารอ DJ เริ่มสตรีมใน OBS');
            setIsLoading(false);
            return;
          }
          
          // Check if HLS file is recent (within last 2 minutes)
          const lastModified = response.headers.get('last-modified');
          if (lastModified) {
            const fileTime = new Date(lastModified);
            const now = new Date();
            const timeDiff = (now - fileTime) / 1000 / 60; // minutes
            
            console.log('📺 HLS file age:', timeDiff.toFixed(2), 'minutes');
            
            if (timeDiff > 2) {
              console.log('📺 HLS file is too old, stream is not live');
              setError('สตรีมยังไม่ได้เริ่ม กรุณารอ DJ เริ่มสตรีมใน OBS');
              setIsLoading(false);
              return;
            }
          }
        } catch (fetchError) {
          console.log('📺 HLS file check failed:', fetchError);
          setError('ไม่สามารถเข้าถึงสตรีมได้');
          setIsLoading(false);
          return;
        }
        
        playerRef.current.src({
          src: newSource,
          type: 'application/x-mpegURL'
        });
        
        // Load the new source
        playerRef.current.load();
        
        // Try to play after loading
        setTimeout(() => {
          if (playerRef.current && isLive) {
            playerRef.current.play().then(() => {
              console.log('✅ Play successful after source update');
              setIsPlaying(true);
            }).catch(error => {
              console.log('📺 Play failed after source update:', error);
            });
          }
        }, 1000);
      } catch (error) {
        console.error('Error updating video source:', error);
        setError('ไม่สามารถอัปเดตแหล่งวิดีโอได้');
        setIsLoading(false);
      }
    };

    updateSource();
  }, [streamKey, isLive]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try {
          console.log('📺 Cleaning up Video.js player');
          playerRef.current.dispose();
        } catch (error) {
          console.warn('Error disposing Video.js player:', error);
        }
        playerRef.current = null;
      }
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        setLoadingTimeout(null);
      }
    };
  }, []);

  if (!streamKey) {
    return (
      <div className="bg-black w-full h-full flex items-center justify-center" style={{ height: '450px' }}>
        <div className="text-center text-white">
          <div className="text-6xl mb-4">📺</div>
          <p className="text-lg">เลือกห้องไลฟ์สตรีม</p>
        </div>
      </div>
    );
  }

  if (!isLive) {
    // Get RTMP server URL for instructions
    const getRTMPServerUrl = () => {
      try {
        const url = new URL(API_BASE_URL);
        const hostname = url.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          return 'rtmp://localhost:1935/live';
        }
        return `rtmp://${hostname}:1935/live`;
      } catch (error) {
        return 'rtmp://localhost:1935/live';
      }
    };

    console.log('🔍 Stream Debug Info:', {
      streamKey,
      isLive,
      hlsUrl: `${getHLSBaseURL()}/live/${streamKey}.m3u8`,
      apiBaseUrl: API_BASE_URL,
      hlsPort: import.meta.env.VITE_HLS_PORT || 8000
    });

    return (
      <div className="bg-black w-full h-full flex items-center justify-center" style={{ height: '450px' }}>
        <div className="text-center text-white max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">⏸️</div>
          <p className="text-lg mb-2">ไลฟ์สตรีมยังไม่ได้เริ่ม</p>
          <p className="text-sm text-gray-400 mb-4">รอ DJ เริ่มไลฟ์</p>
          
          {/* Admin-only DJ instructions */}
          {isAdmin && (
            <>
              <div className="bg-gray-800/50 p-4 rounded-lg text-left mb-4">
                <h4 className="font-semibold mb-2 text-blue-400">สำหรับ DJ:</h4>
                <ul className="text-xs space-y-1 text-gray-300">
                  <li>• เปิด OBS Studio</li>
                  <li>• ตั้งค่า Server: {getRTMPServerUrl()}</li>
                  <li>• ตั้งค่า Stream Key: {streamKey}</li>
                  <li>• กด "Start Streaming" ใน OBS</li>
                  <li>• ระบบจะอัปเดตสถานะเป็น LIVE อัตโนมัติ</li>
                  <li>• รอสักครู่ให้สตรีมเริ่มต้น (10-30 วินาที)</li>
                </ul>
              </div>

              <div className="bg-yellow-900/50 p-3 rounded-lg mb-4">
                <p className="text-xs text-yellow-200">
                  💡 <strong>หมายเหตุ:</strong> หลังจากเริ่มสตรีมใน OBS แล้ว 
                  ระบบจะประมวลผล RTMP → HLS อัตโนมัติด้วย ffmpeg
                </p>
              </div>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={refreshStream}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  รีเฟรช
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{videoPlayerStyles}</style>
      <div className="relative bg-black w-full h-full" style={{ position: 'relative', overflow: 'hidden', height: '450px' }}>
        {/* Video Player - Main container with highest priority */}
      <div 
        data-vjs-player 
        className="w-full h-full" 
        style={{ 
          backgroundColor: '#000',
          minHeight: '400px',
          width: '100%',
          height: '100%'
        }}
      >
        <video
          ref={videoRef}
          className="video-js vjs-default-skin"
          playsInline
          preload="auto"
            data-setup='{"controls": false, "responsive": false, "fluid": false, "fill": false, "liveui": false}'
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
        />
      </div>

      {/* Custom Video Controls */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        style={{ zIndex: 10 }}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        <div className="flex items-center justify-between">
          {/* Left Controls */}
          <div className="flex items-center space-x-4">
            {/* Play/Pause Button */}
            <button
              onClick={handlePlayPause}
              className="text-white hover:text-gray-300 transition-colors p-2"
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>

            {/* Volume Controls */}
            <div className="flex items-center space-x-2">
              {/* Mute Button */}
              <button
                onClick={handleMuteToggle}
                className="text-white hover:text-gray-300 transition-colors p-1"
              >
                {isMuted || volume === 0 ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                  </svg>
                ) : volume < 0.5 ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                  </svg>
                )}
              </button>

              {/* Volume Slider */}
              <div className="flex items-center">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #fff 0%, #fff ${(isMuted ? 0 : volume) * 100}%, #4b5563 ${(isMuted ? 0 : volume) * 100}%, #4b5563 100%)`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-4">
            {/* Fullscreen Button */}
            <button
              onClick={handleFullscreen}
              className="text-white hover:text-gray-300 transition-colors p-2"
            >
              {isFullscreen ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center" style={{ zIndex: 50 }}>
          <div className="text-center text-white max-w-md mx-auto p-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-lg mb-4">กำลังโหลดสตรีม...</p>
            <p className="text-sm text-gray-300 mb-6">กรุณารอสักครู่ หรือกดหยุดหากโหลดนานเกินไป</p>
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={stopLoading}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                หยุดโหลด
              </button>
              
              <button
                onClick={refreshStream}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                ลองใหม่
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center" style={{ zIndex: 50 }}>
          <div className="text-center text-white max-w-md mx-auto p-6">
            <div className="text-6xl mb-4">📺</div>
            <p className="text-lg mb-2">สตรีมยังไม่พร้อม</p>
            <p className="text-sm text-gray-300 mb-4">{error}</p>
            
            {/* Admin-only troubleshooting */}
            {isAdmin && (
              <div className="bg-blue-900/50 p-4 rounded-lg mb-4 text-left">
                <h4 className="font-semibold mb-2">วิธีแก้ไข:</h4>
                <ul className="text-xs space-y-1 text-gray-300">
                  <li>• ตรวจสอบว่า OBS เปิดและเชื่อมต่ออยู่</li>
                  <li>• ตั้งค่า Server: {(() => {
                    try {
                      const url = new URL(API_BASE_URL);
                      const hostname = url.hostname;
                      if (hostname === 'localhost' || hostname === '127.0.0.1') {
                        return 'rtmp://localhost:1935/live';
                      }
                      return `rtmp://${hostname}:1935/live`;
                    } catch (error) {
                      return 'rtmp://localhost:1935/live';
                    }
                  })()}</li>
                  <li>• ตั้งค่า Stream Key: {streamKey}</li>
                  <li>• กด "Start Streaming" ใน OBS</li>
                  <li>• รอ 10-30 วินาทีให้ ffmpeg ประมวลผล RTMP → HLS</li>
                  <li>• กดปุ่ม "ลองใหม่" เพื่อรีเฟรช</li>
                </ul>
              </div>
            )}

            {/* Admin-only error details */}
            {isAdmin && (
              <div className="bg-yellow-900/50 p-3 rounded-lg mb-4">
                <p className="text-xs text-yellow-200">
                  ⚠️ <strong>สาเหตุ:</strong> HLS files ยังไม่ถูกสร้าง (ต้องรอให้ OBS streaming ก่อน)
                </p>
              </div>
            )}
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setError(null);
                  if (playerRef.current) {
                    playerRef.current.load();
                  }
                }}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                ลองใหม่
              </button>
              
              <button
                onClick={stopLoading}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Play Button Overlay for when autoplay fails */}
      {!isLoading && !error && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70" style={{ zIndex: 40 }}>
          <div className="text-center">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎮 Play button clicked');
                
                if (playerRef.current) {
                  console.log('📺 Attempting to play video...');
                  playerRef.current.play().then(() => {
                    console.log('✅ Video started playing');
                    setIsPlaying(true);
                  }).catch(error => {
                    console.log('❌ Manual play failed:', error);
                    // Try unmuting first
                    if (playerRef.current) {
                      playerRef.current.muted(false);
                      playerRef.current.play().then(() => {
                        console.log('✅ Video started playing after unmuting');
                        setIsPlaying(true);
                      }).catch(error2 => {
                        console.log('❌ Play failed even after unmuting:', error2);
                        setError('ไม่สามารถเล่นวิดีโอได้ กรุณาลองใหม่');
                      });
                    }
                  });
                } else {
                  console.log('❌ Player not ready');
                  setError('เครื่องเล่นวิดีโอยังไม่พร้อม');
                }
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="w-24 h-24 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-all cursor-pointer mb-4"
              style={{ pointerEvents: 'auto' }}
            >
              <svg className="w-12 h-12 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
            <p className="text-white text-sm">คลิกเพื่อเล่นวิดีโอ</p>
          </div>
        </div>
      )}

      {/* Stream Info Overlay - Top left corner of video */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-50 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm" style={{ zIndex: 60 }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span>LIVE</span>
        </div>
      </div>
      </div>
    </>
  );
};

export default StreamPlayer;

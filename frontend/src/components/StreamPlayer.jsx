import React, { useRef, useEffect, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const HLS_PORT = import.meta.env.VITE_HLS_PORT || 8000;

// Get HLS URL based on environment
const getHLSBaseURL = () => {
  // Use the same server as API for HLS files (port 5000)
  if (import.meta.env.PROD) {
    // In production, use the same domain as API
    const baseURL = API_BASE_URL.replace(/:\d+$/, ''); // Remove port if exists
    return `${baseURL}:5000`; // Use API server port
  } else {
    // In development, use localhost with API port
    return `http://localhost:5000`; // Use API server port
  }
};

const StreamPlayer = ({ streamKey, isLive, onError }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
          controls: true,
          responsive: true,
          fluid: true,
          playbackRates: [0.5, 1, 1.25, 1.5, 2],
          sources: isLive ? [{
            src: hlsUrl,
            type: 'application/x-mpegURL'
          }] : [],
          html5: {
            hls: {
              enableLowInitialPlaylist: true,
              smoothQualityChange: true,
              overrideNative: true
            }
          }
        });

        playerRef.current = player;
        console.log('📺 Video.js player initialized successfully');
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
    };

    // Add event listeners
    player.ready(handleReady);
    player.on('loadstart', handleLoadStart);
    player.on('canplay', handleCanPlay);
    player.on('error', handleError);
    player.on('waiting', handleWaiting);
    player.on('playing', handlePlaying);

    // Cleanup
    return () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      // Remove event listeners
      player.off('ready', handleReady);
      player.off('loadstart', handleLoadStart);
      player.off('canplay', handleCanPlay);
      player.off('error', handleError);
      player.off('waiting', handleWaiting);
      player.off('playing', handlePlaying);
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
        
        // Test HLS URL first
        try {
          const response = await fetch(newSource, { method: 'HEAD' });
          if (!response.ok) {
            console.log('📺 HLS file not found, stream may not be live yet');
            setError('สตรีมยังไม่ได้เริ่ม กรุณารอ DJ เริ่มสตรีมใน OBS');
            setIsLoading(false);
            return;
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
      <div className="bg-black aspect-video flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">📺</div>
          <p className="text-lg">เลือกห้องไลฟ์สตรีม</p>
        </div>
      </div>
    );
  }

  if (!isLive) {
    return (
      <div className="bg-black aspect-video flex items-center justify-center">
        <div className="text-center text-white max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">⏸️</div>
          <p className="text-lg mb-2">ไลฟ์สตรีมยังไม่ได้เริ่ม</p>
          <p className="text-sm text-gray-400 mb-4">รอ DJ เริ่มไลฟ์ใน OBS</p>
          
          <div className="bg-gray-800/50 p-4 rounded-lg text-left mb-4">
            <h4 className="font-semibold mb-2 text-blue-400">สำหรับ DJ:</h4>
            <ul className="text-xs space-y-1 text-gray-300">
              <li>• เปิด OBS Studio</li>
              <li>• ตั้งค่า Server: rtmp://localhost:1935/live</li>
              <li>• ตั้งค่า Stream Key: {streamKey}</li>
              <li>• กด "Start Streaming" ใน OBS</li>
              <li>• กดปุ่ม "เริ่มไลฟ์" ด้านบน</li>
              <li>• รอสักครู่ให้สตรีมเริ่มต้น</li>
            </ul>
          </div>

          <div className="bg-yellow-900/50 p-3 rounded-lg mb-4">
            <p className="text-xs text-yellow-200">
              💡 <strong>หมายเหตุ:</strong> หลังจากเริ่มสตรีมใน OBS แล้ว 
              ระบบจะใช้เวลา 10-30 วินาทีในการประมวลผล HLS stream
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
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-black aspect-video">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-10">
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
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center text-white max-w-md mx-auto p-6">
            <div className="text-6xl mb-4">📺</div>
            <p className="text-lg mb-2">สตรีมยังไม่พร้อม</p>
            <p className="text-sm text-gray-300 mb-4">{error}</p>
            
            <div className="bg-blue-900/50 p-4 rounded-lg mb-4 text-left">
              <h4 className="font-semibold mb-2">วิธีแก้ไข:</h4>
              <ul className="text-xs space-y-1 text-gray-300">
                <li>• ตรวจสอบว่า OBS เปิดอยู่</li>
                <li>• ตั้งค่า Server: rtmp://localhost:1935/live</li>
                <li>• ตั้งค่า Stream Key: {streamKey}</li>
                <li>• กด "Start Streaming" ใน OBS</li>
                <li>• กด "เริ่มไลฟ์" ในเว็บไซต์</li>
                <li>• รอ 10-30 วินาทีให้สตรีมประมวลผล</li>
              </ul>
            </div>

            <div className="bg-yellow-900/50 p-3 rounded-lg mb-4">
              <p className="text-xs text-yellow-200">
                ⚠️ <strong>สาเหตุ 404:</strong> สตรีมยังไม่พร้อมหรือ RTMP server ไม่ทำงาน
              </p>
            </div>
            
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

      {/* Video Player */}
      <div data-vjs-player>
        <video
          ref={videoRef}
          className="video-js vjs-default-skin w-full h-full"
          playsInline
          preload="auto"
        />
      </div>

      {/* Stream Info Overlay */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-50 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span>LIVE</span>
        </div>
      </div>

      {/* Stream Key Debug (Admin Only) */}
      {import.meta.env.DEV && (
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs">
          <div>Stream Key: {streamKey}</div>
          <div>HLS URL: {getHLSBaseURL()}/live/{streamKey}.m3u8</div>
        </div>
      )}
    </div>
  );
};

export default StreamPlayer;

import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Copy, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const LiveStreamTest = () => {
  const [streamKey, setStreamKey] = useState('');
  const [serverUrl, setServerUrl] = useState('rtmp://localhost:1935/live');
  const [isStreaming, setIsStreaming] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const videoRef = useRef(null);

  // Generate test stream key
  useEffect(() => {
    const testKey = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setStreamKey(testKey);
  }, []);

  const getVideoUrl = (key, type = 'hls') => {
    if (type === 'hls') {
      return `/api/stream/hls/${key}.m3u8`;
    } else if (type === 'dash') {
      return `/api/stream/dash/${key}.mpd`;
    }
    return '';
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      addTestResult('success', `คัดลอก "${text}" สำเร็จ`);
    } catch (err) {
      addTestResult('error', 'ไม่สามารถคัดลอกได้');
    }
  };

  const addTestResult = (type, message) => {
    const result = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: new Date().toLocaleTimeString()
    };
    setTestResults(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results
  };

  const startTest = () => {
    setIsStreaming(true);
    setVideoError(null);
    setVideoLoading(true);
    addTestResult('info', 'เริ่มทดสอบ Live Streaming');
    addTestResult('info', `Stream Key: ${streamKey}`);
    addTestResult('info', `Server URL: ${serverUrl}`);
  };

  const stopTest = () => {
    setIsStreaming(false);
    setVideoError(null);
    setVideoLoading(false);
    addTestResult('info', 'หยุดการทดสอบ');
  };

  const testConnection = async () => {
    addTestResult('info', 'กำลังทดสอบการเชื่อมต่อ...');
    
    try {
      // Test HLS URL
      const hlsUrl = getVideoUrl(streamKey, 'hls');
      addTestResult('info', `ทดสอบ HLS URL: ${hlsUrl}`);
      
      const response = await fetch(hlsUrl, { method: 'GET' });
      
      if (response.ok) {
        addTestResult('success', `HLS URL ทำงานได้ (${response.status})`);
        
        // Test DASH URL
        const dashUrl = getVideoUrl(streamKey, 'dash');
        addTestResult('info', `ทดสอบ DASH URL: ${dashUrl}`);
        
        const dashResponse = await fetch(dashUrl, { method: 'GET' });
        
        if (dashResponse.ok) {
          addTestResult('success', `DASH URL ทำงานได้ (${dashResponse.status})`);
        } else {
          addTestResult('warning', `DASH URL ไม่ทำงาน (${dashResponse.status})`);
        }
        
        // Test stream status
        const statusUrl = `/api/stream/test/${streamKey}/status`;
        const statusResponse = await fetch(statusUrl);
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          addTestResult('success', `Stream Status: ${statusData.data.status}`);
        } else {
          addTestResult('warning', `ไม่สามารถตรวจสอบ Stream Status ได้`);
        }
        
      } else {
        addTestResult('error', `HLS URL ไม่ทำงาน (${response.status})`);
      }
    } catch (error) {
      addTestResult('error', `ไม่สามารถเชื่อมต่อได้: ${error.message}`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">🧪 Live Stream Test Page</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Configuration */}
          <div className="space-y-6">
            {/* Stream Configuration */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                Stream Configuration
              </h2>
              
              <div className="space-y-4">
                {/* Server URL */}
                <div>
                  <label className="block text-sm font-medium mb-2">RTMP Server URL</label>
                  <div className="flex">
                    <input
                      type="text"
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="rtmp://localhost:1935/live"
                    />
                    <button
                      onClick={() => copyToClipboard(serverUrl)}
                      className="px-3 bg-gray-600 hover:bg-gray-500 rounded-r-lg transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Stream Key */}
                <div>
                  <label className="block text-sm font-medium mb-2">Stream Key</label>
                  <div className="flex">
                    <input
                      type="text"
                      value={streamKey}
                      onChange={(e) => setStreamKey(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="test_stream_key"
                    />
                    <button
                      onClick={() => copyToClipboard(streamKey)}
                      className="px-3 bg-gray-600 hover:bg-gray-500 rounded-r-lg transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* OBS Instructions */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">📺 OBS Studio Setup</h2>
              <div className="space-y-3">
                <ol className="text-sm space-y-1">
                  <li>1. เปิด OBS Studio</li>
                  <li>2. ไปที่ Settings → Stream</li>
                  <li>3. เลือก "Custom"</li>
                  <li>4. ใส่ข้อมูลข้างบน</li>
                  <li>5. เริ่ม Streaming</li>
                </ol>
                
                <div className="mt-4 p-3 bg-blue-900 rounded">
                  <p className="text-blue-200 text-sm">
                    <strong>Server:</strong> {serverUrl}<br/>
                    <strong>Key:</strong> {streamKey}
                  </p>
                </div>
              </div>
            </div>

            {/* Test Controls */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">🎮 Test Controls</h2>
              <div className="space-y-3">
                <button
                  onClick={startTest}
                  disabled={isStreaming}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Test
                </button>
                
                <button
                  onClick={stopTest}
                  disabled={!isStreaming}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop Test
                </button>
                
                <button
                  onClick={testConnection}
                  className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Test Connection
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel - Video Player & Results */}
          <div className="space-y-6">
            {/* Video Player */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">📺 Live Stream Player</h2>
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                {isStreaming ? (
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    controls
                    playsInline
                    onError={(e) => {
                      const error = e.target?.error;
                      let errorMessage = 'ไม่สามารถโหลด Live Stream ได้';
                      
                      if (error && error.code !== undefined) {
                        switch (error.code) {
                          case error.MEDIA_ERR_NETWORK:
                            errorMessage = 'เกิดข้อผิดพลาดเครือข่าย';
                            break;
                          case error.MEDIA_ERR_DECODE:
                            errorMessage = 'ไม่สามารถถอดรหัสได้';
                            break;
                          default:
                            errorMessage = 'ไม่สามารถโหลด Live Stream ได้';
                        }
                      }
                      
                      setVideoError(errorMessage);
                      setVideoLoading(false);
                      addTestResult('error', `Video Error: ${errorMessage}`);
                    }}
                    onLoadStart={() => {
                      setVideoLoading(true);
                      setVideoError(null);
                      addTestResult('info', 'เริ่มโหลด Live Stream');
                    }}
                    onCanPlay={() => {
                      setVideoLoading(false);
                      setVideoError(null);
                      addTestResult('success', 'Live Stream พร้อมเล่น');
                    }}
                    onPlay={() => {
                      setVideoLoading(false);
                      setVideoError(null);
                      addTestResult('success', 'Live Stream กำลังเล่น');
                    }}
                  >
                    <source src={getVideoUrl(streamKey, 'hls')} type="application/x-mpegURL" />
                    <source src={getVideoUrl(streamKey, 'dash')} type="application/dash+xml" />
                    {/* Fallback test video for when HLS/DASH don't work */}
                    <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <Play className="w-16 h-16 text-gray-500 mx-auto mb-3" />
                      <p className="text-gray-400">กด Start Test เพื่อเริ่มทดสอบ</p>
                    </div>
                  </div>
                )}

                {/* Video Status Overlay */}
                {isStreaming && (
                  <div className="absolute top-4 left-4 flex space-x-2">
                    {videoError ? (
                      <div className="bg-red-600 px-3 py-1 rounded-full flex items-center">
                        <XCircle className="w-4 h-4 mr-1" />
                        <span className="text-sm">Error</span>
                      </div>
                    ) : videoLoading ? (
                      <div className="bg-yellow-600 px-3 py-1 rounded-full flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        <span className="text-sm">Loading</span>
                      </div>
                    ) : (
                      <div className="bg-green-600 px-3 py-1 rounded-full flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        <span className="text-sm">Live</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Error Message */}
                {videoError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
                    <div className="text-center text-white p-4">
                      <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold mb-2">ไม่สามารถโหลด Live Stream ได้</h3>
                      <p className="text-sm text-gray-300 mb-4">{videoError}</p>
                      <div className="text-xs text-gray-400 space-y-1">
                        <p>• <strong>Mock Stream:</strong> ใช้ข้อมูลทดสอบ ไม่ใช่ live stream จริง</p>
                        <p>• <strong>HLS Segments:</strong> มี mock video segments สำหรับทดสอบ</p>
                        <p>• <strong>Fallback Video:</strong> จะเล่น test video หาก HLS ไม่ทำงาน</p>
                        <p>• <strong>Real OBS:</strong> ต้องมี RTMP Server จริงสำหรับ live stream</p>
                        <p>• <strong>Test Mode:</strong> นี่เป็นโหมดทดสอบเท่านั้น</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Loading Spinner */}
                {videoLoading && !videoError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                    <div className="text-center text-white">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-3"></div>
                      <p className="text-sm">กำลังโหลด Live Stream...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Test Results */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">📊 Test Results</h2>
                <button
                  onClick={clearResults}
                  className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded transition-colors"
                >
                  Clear
                </button>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {testResults.length === 0 ? (
                  <p className="text-gray-400 text-sm">ยังไม่มีผลการทดสอบ</p>
                ) : (
                  testResults.map((result) => (
                    <div
                      key={result.id}
                      className={`p-3 rounded-lg text-sm ${
                        result.type === 'success' 
                          ? 'bg-green-900 text-green-200' 
                          : result.type === 'error'
                          ? 'bg-red-900 text-red-200'
                          : result.type === 'warning'
                          ? 'bg-yellow-900 text-yellow-200'
                          : 'bg-blue-900 text-blue-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{result.message}</span>
                        <span className="text-xs opacity-75">{result.timestamp}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Debug Information */}
        <div className="mt-8 bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">🔧 Debug Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium mb-2">Video URLs:</h3>
              <div className="space-y-1">
                <p>HLS: <code className="bg-gray-700 px-2 py-1 rounded text-xs">{getVideoUrl(streamKey, 'hls')}</code></p>
                <p>DASH: <code className="bg-gray-700 px-2 py-1 rounded text-xs">{getVideoUrl(streamKey, 'dash')}</code></p>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">Environment:</h3>
              <div className="space-y-1">
                <p>Base URL: <code className="bg-gray-700 px-2 py-1 rounded text-xs">{import.meta.env.VITE_HLS_BASE_URL || 'Not set'}</code></p>
                <p>RTMP URL: <code className="bg-gray-700 px-2 py-1 rounded text-xs">{import.meta.env.VITE_RTMP_SERVER_URL || 'Not set'}</code></p>
              </div>
            </div>
          </div>
          
          {/* Mock Stream Explanation */}
          <div className="mt-6 p-4 bg-green-900 rounded-lg">
            <h3 className="font-medium text-green-200 mb-2">🧪 Mock Stream Explanation:</h3>
            <div className="text-sm text-green-300 space-y-1">
              <p>• <strong>Test Mode:</strong> ระบบสร้าง mock HLS/DASH สำหรับทดสอบ</p>
              <p>• <strong>Mock Segments:</strong> มี video segments จำลองสำหรับทดสอบ</p>
              <p>• <strong>Fallback Video:</strong> จะเล่น test video หาก mock stream ไม่ทำงาน</p>
              <p>• <strong>Real Stream:</strong> ต้องมี OBS + RTMP Server จริง</p>
            </div>
          </div>
          
          {/* Setup Instructions */}
          <div className="mt-4 p-4 bg-blue-900 rounded-lg">
            <h3 className="font-medium text-blue-200 mb-2">📋 Setup Instructions:</h3>
            <div className="text-sm text-blue-300 space-y-1">
              <p>1. ติดตั้ง RTMP Server ใน backend</p>
              <p>2. ตั้งค่า nginx-rtmp หรือ SRS</p>
              <p>3. เปิด port 1935 สำหรับ RTMP</p>
              <p>4. เปิด port 8000 สำหรับ HLS</p>
              <p>5. ทดสอบการเชื่อมต่ออีกครั้ง</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveStreamTest;

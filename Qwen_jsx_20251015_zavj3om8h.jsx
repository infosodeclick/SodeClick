import React, { useState, useEffect } from 'react';
import { Play, Mic, MicOff, Video, VideoOff, Settings, Users, MessageCircle, Copy, Eye, EyeOff, ChevronRight, Plus, Trash2 } from 'lucide-react';

const App = () => {
  const [selectedStream, setSelectedStream] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Mock data for live streams
  const liveStreams = [
    { id: 1, name: 'Gaming Stream', viewers: 1243, category: 'Gaming', isLive: true },
    { id: 2, name: 'Music Live', viewers: 856, category: 'Music', isLive: true },
    { id: 3, name: 'Tech Talk', viewers: 342, category: 'Technology', isLive: false },
    { id: 4, name: 'Art Workshop', viewers: 189, category: 'Art', isLive: true },
    { id: 5, name: 'Cooking Show', viewers: 567, category: 'Food', isLive: false },
  ];

  // Mock chat messages
  useEffect(() => {
    const mockMessages = [
      { id: 1, user: 'JohnDoe', message: 'Great stream!', timestamp: '10:30 AM' },
      { id: 2, user: 'GamerGirl', message: 'Love the gameplay!', timestamp: '10:31 AM' },
      { id: 3, user: 'TechBro', message: 'What settings are you using?', timestamp: '10:32 AM' },
      { id: 4, user: 'MusicFan', message: 'The audio quality is amazing!', timestamp: '10:33 AM' },
    ];
    setChatMessages(mockMessages);
  }, []);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      const message = {
        id: Date.now(),
        user: 'CurrentUser',
        message: newMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages([...chatMessages, message]);
      setNewMessage('');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const StreamItem = ({ stream }) => (
    <div 
      className={`p-3 mb-2 rounded-lg cursor-pointer transition-all duration-200 ${
        selectedStream?.id === stream.id 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-800 hover:bg-gray-700'
      }`}
      onClick={() => setSelectedStream(stream)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${stream.isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
          <div>
            <h3 className="font-semibold text-sm">{stream.name}</h3>
            <p className="text-xs opacity-75">{stream.category}</p>
          </div>
        </div>
        <div className="flex items-center space-x-1 text-xs">
          <Users className="w-3 h-3" />
          <span>{stream.viewers.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );

  const ChatMessage = ({ message }) => (
    <div className="mb-3 p-3 bg-gray-800 rounded-lg">
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-sm text-blue-400">{message.user}</span>
        <span className="text-xs text-gray-400">{message.timestamp}</span>
      </div>
      <p className="text-sm">{message.message}</p>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 px-6 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-400">LiveStream Studio</h1>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setIsStreaming(!isStreaming)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                isStreaming 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isStreaming ? 'Stop Streaming' : 'Start Streaming'}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Stream List */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <Play className="w-5 h-5 mr-2 text-red-500" />
              Live Streams
            </h2>
            <button className="p-2 hover:bg-gray-700 rounded-lg">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-2">
            {liveStreams.map(stream => (
              <StreamItem key={stream.id} stream={stream} />
            ))}
          </div>
        </div>

        {/* Main Content - Live Stream */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 bg-black flex items-center justify-center relative">
            {selectedStream ? (
              <div className="relative w-full h-full max-w-6xl max-h-full">
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-32 h-32 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Play className="w-16 h-16 text-gray-500" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{selectedStream.name}</h3>
                    <p className="text-gray-400">Click "Start Streaming" to begin</p>
                    {selectedStream.isLive && (
                      <div className="mt-4 flex items-center justify-center space-x-4">
                        <div className="flex items-center space-x-2 text-red-500">
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="font-semibold">LIVE</span>
                        </div>
                        <div className="flex items-center space-x-1 text-gray-400">
                          <Users className="w-4 h-4" />
                          <span>{selectedStream.viewers.toLocaleString()} viewers</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Stream controls overlay */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center space-x-4">
                  <button className="p-3 bg-black bg-opacity-50 rounded-full hover:bg-opacity-70 transition-all">
                    <Mic className="w-6 h-6" />
                  </button>
                  <button className="p-3 bg-black bg-opacity-50 rounded-full hover:bg-opacity-70 transition-all">
                    <Video className="w-6 h-6" />
                  </button>
                  <button className="p-3 bg-black bg-opacity-50 rounded-full hover:bg-opacity-70 transition-all">
                    <Settings className="w-6 h-6" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <MessageCircle className="w-16 h-16 mx-auto mb-4" />
                <p>Select a stream from the left panel to begin</p>
              </div>
            )}
          </div>

          {/* Bottom Panel - Stream Management */}
          <div className="bg-gray-800 border-t border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-blue-400" />
              Stream Configuration
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Stream Name */}
              <div>
                <label className="block text-sm font-medium mb-2">Stream Name</label>
                <input
                  type="text"
                  defaultValue={selectedStream?.name || 'My Live Stream'}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Server URL */}
              <div>
                <label className="block text-sm font-medium mb-2">Server URL</label>
                <div className="flex">
                  <input
                    type="text"
                    defaultValue="rtmp://live.twitch.tv/app"
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readOnly
                  />
                  <button
                    onClick={() => copyToClipboard('rtmp://live.twitch.tv/app')}
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
                    type={showStreamKey ? "text" : "password"}
                    defaultValue="live_123456789_abcdefghijklmnopqrstuvwxyz"
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readOnly
                  />
                  <button
                    onClick={() => setShowStreamKey(!showStreamKey)}
                    className="px-3 bg-gray-600 hover:bg-gray-500 rounded-r-lg transition-colors"
                  >
                    {showStreamKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Stream Settings */}
              <div>
                <label className="block text-sm font-medium mb-2">Resolution</label>
                <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>1920x1080 (1080p)</option>
                  <option>1280x720 (720p)</option>
                  <option>854x480 (480p)</option>
                </select>
              </div>
            </div>

            {/* OBS Instructions */}
            <div className="mt-6 p-4 bg-gray-700 rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center">
                <ChevronRight className="w-4 h-4 mr-2" />
                OBS Studio Setup Instructions
              </h3>
              <ol className="text-sm text-gray-300 space-y-1">
                <li>1. Open OBS Studio and go to Settings → Stream</li>
                <li>2. Select your streaming service (Twitch, YouTube, etc.)</li>
                <li>3. Paste the Server URL and Stream Key above</li>
                <li>4. Click "Apply" and start streaming from OBS</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Chat */}
        <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold flex items-center">
              <MessageCircle className="w-5 h-5 mr-2 text-green-400" />
              Live Chat
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {chatMessages.map(message => (
              <ChatMessage key={message.id} message={message} />
            ))}
          </div>
          
          <div className="p-4 border-t border-gray-700">
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
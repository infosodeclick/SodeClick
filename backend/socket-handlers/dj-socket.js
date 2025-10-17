// Socket.IO logic for DirectorJoox DJ Feature
let connectedUsers = new Map();
let currentDJ = null;
let currentSong = {
  title: 'Summer Vibes - DJ Mix',
  artist: 'DJ Mix',
  isPlaying: false,
  timestamp: Date.now()
};

const setupDJSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`🎧 DJ Feature - User connected: ${socket.id}`);
    
    // Add user to connected users
    connectedUsers.set(socket.id, {
      id: socket.id,
      username: `User_${socket.id.slice(0, 6)}`,
      isDJ: false,
      connectedAt: new Date()
    });

    // Send current state to new user
    socket.emit('current state', {
      currentSong,
      connectedUsers: Array.from(connectedUsers.values()),
      currentDJ
    });

    // Broadcast updated user count
    io.emit('user count', connectedUsers.size);

    // Handle chat messages
    socket.on('chat message', (messageData) => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        const message = {
          id: Date.now(),
          text: messageData.text,
          username: user.username,
          userId: socket.id,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isDJ: user.isDJ
        };
        
        console.log(`💬 DJ Chat message from ${user.username}: ${messageData.text}`);
        io.emit('chat message', message);
      }
    });

    // Handle DJ mode toggle
    socket.on('toggle dj mode', () => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        user.isDJ = !user.isDJ;
        
        if (user.isDJ) {
          // If someone becomes DJ, remove DJ status from others
          if (currentDJ && currentDJ !== socket.id) {
            const previousDJ = connectedUsers.get(currentDJ);
            if (previousDJ) {
              previousDJ.isDJ = false;
            }
          }
          currentDJ = socket.id;
        } else {
          currentDJ = null;
        }
        
        console.log(`🎧 DJ mode ${user.isDJ ? 'enabled' : 'disabled'} for ${user.username}`);
        
        // Broadcast updated user list and DJ status
        io.emit('user update', {
          users: Array.from(connectedUsers.values()),
          currentDJ
        });
      }
    });

    // Handle DJ controls
    socket.on('dj control', (control) => {
      const user = connectedUsers.get(socket.id);
      if (user && user.isDJ) {
        console.log(`🎛️ DJ control from ${user.username}:`, control);
        
        switch (control.type) {
          case 'play':
          case 'pause':
            currentSong.isPlaying = control.type === 'play';
            currentSong.timestamp = Date.now();
            io.emit('song control', {
              type: control.type,
              isPlaying: currentSong.isPlaying,
              timestamp: currentSong.timestamp
            });
            break;
            
          case 'mute':
          case 'unmute':
            io.emit('audio control', {
              type: control.type,
              isMuted: control.type === 'mute'
            });
            break;
            
          case 'change song':
            currentSong = {
              ...currentSong,
              title: control.title || currentSong.title,
              artist: control.artist || currentSong.artist,
              timestamp: Date.now()
            };
            io.emit('song change', currentSong);
            break;
        }
      }
    });

    // Handle user typing indicator
    socket.on('typing', (isTyping) => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        socket.broadcast.emit('user typing', {
          userId: socket.id,
          username: user.username,
          isTyping
        });
      }
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
      const user = connectedUsers.get(socket.id);
      console.log(`👋 DJ Feature - User disconnected: ${user?.username || socket.id}`);
      
      // If DJ disconnects, remove DJ status
      if (currentDJ === socket.id) {
        currentDJ = null;
        console.log('🎧 DJ disconnected, DJ mode available');
      }
      
      connectedUsers.delete(socket.id);
      
      // Broadcast updated user count and list
      io.emit('user count', connectedUsers.size);
      io.emit('user update', {
        users: Array.from(connectedUsers.values()),
        currentDJ
      });
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // WebRTC Audio Streaming Events
    socket.on('dj-streaming-started', () => {
      console.log(`🎧 DJ ${socket.id} started streaming`);
      socket.broadcast.emit('dj-streaming-started', {
        djId: socket.id,
        djName: connectedUsers.get(socket.id)?.username || 'DJ'
      });
    });

    socket.on('dj-streaming-stopped', () => {
      console.log(`🎧 DJ ${socket.id} stopped streaming`);
      socket.broadcast.emit('dj-streaming-stopped', {
        djId: socket.id
      });
    });

    // WebRTC Signaling
    socket.on('webrtc-offer', (data) => {
      console.log(`📡 WebRTC offer from ${socket.id} to ${data.targetId}`);
      socket.to(data.targetId).emit('webrtc-offer', {
        offer: data.offer,
        senderId: socket.id
      });
    });

    socket.on('webrtc-answer', (data) => {
      console.log(`📡 WebRTC answer from ${socket.id} to ${data.targetId}`);
      socket.to(data.targetId).emit('webrtc-answer', {
        answer: data.answer,
        senderId: socket.id
      });
    });

    socket.on('webrtc-ice-candidate', (data) => {
      console.log(`🧊 ICE candidate from ${socket.id} to ${data.targetId}`);
      socket.to(data.targetId).emit('webrtc-ice-candidate', {
        candidate: data.candidate,
        senderId: socket.id
      });
    });
  });
};

module.exports = { setupDJSocketHandlers };


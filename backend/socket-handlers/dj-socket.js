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
      currentDJ,
      isDJStreaming: currentDJ !== null && currentSong.isPlaying
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
      console.log(`🎛️ Received DJ control:`, { control, user: user?.username, isDJ: user?.isDJ });
      if (user && user.isDJ) {
        console.log(`🎛️ Processing DJ control from ${user.username}:`, control);
        
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
            
            // Broadcast updated streaming status
            io.emit('user update', {
              users: Array.from(connectedUsers.values()),
              currentDJ,
              isDJStreaming: currentDJ !== null && currentSong.isPlaying
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
            console.log('🎵 Admin changing song:', control.title);
            currentSong = {
              ...currentSong,
              title: control.title || currentSong.title,
              artist: control.artist || currentSong.artist,
              timestamp: Date.now()
            };
            console.log('🎵 Broadcasting song change to all users:', currentSong);
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

    // User ready for stream
    socket.on('user-ready-for-stream', (data) => {
      console.log(`🎧 User ${socket.id} ready for stream from DJ ${data.djId}`);
      // Forward to the specific DJ
      socket.to(data.djId).emit('user-ready-for-stream', {
        userId: socket.id,
        username: connectedUsers.get(socket.id)?.username || 'User'
      });
    });

    // WebRTC Signaling
    socket.on('webrtc-offer', (data) => {
      console.log(`📡 WebRTC offer from ${socket.id} to ${data.targetId}`);
      console.log(`📡 Connected users: ${connectedUsers.size}`);
      
      if (data.targetId === 'broadcast') {
        // Broadcast to all listeners (non-DJ users)
        const listeners = Array.from(connectedUsers.values()).filter(user => user.id !== socket.id);
        console.log(`📡 Broadcasting to ${listeners.length} listeners:`, listeners.map(u => u.username));
        
        socket.broadcast.emit('webrtc-offer', {
          offer: data.offer,
          senderId: socket.id
        });
        console.log(`📡 Broadcasting WebRTC offer to all listeners`);
      } else {
        // Send to specific target
        socket.to(data.targetId).emit('webrtc-offer', {
          offer: data.offer,
          senderId: socket.id
        });
      }
    });

    socket.on('webrtc-answer', (data) => {
      console.log(`📡 WebRTC answer from ${socket.id} to ${data.targetId}`);
      console.log(`📡 Answer details:`, {
        targetId: data.targetId,
        answerType: data.answer.type,
        hasAnswer: !!data.answer
      });
      
      // Send answer back to the admin (targetId is the admin's socket.id)
      socket.to(data.targetId).emit('webrtc-answer', {
        answer: data.answer,
        senderId: socket.id  // This is the user who sent the answer
      });
    });

    socket.on('webrtc-ice-candidate', (data) => {
      console.log(`🧊 ICE candidate from ${socket.id} to ${data.targetId}`);
      console.log(`🧊 ICE candidate details:`, {
        targetId: data.targetId,
        hasCandidate: !!data.candidate,
        candidateType: data.candidate?.type
      });
      
      if (data.targetId === 'broadcast') {
        // Broadcast to all listeners (non-DJ users)
        console.log(`🧊 Broadcasting ICE candidate to all listeners`);
        socket.broadcast.emit('webrtc-ice-candidate', {
          candidate: data.candidate,
          senderId: socket.id
        });
      } else {
        // Send to specific target
        console.log(`🧊 Sending ICE candidate to specific user: ${data.targetId}`);
        socket.to(data.targetId).emit('webrtc-ice-candidate', {
          candidate: data.candidate,
          senderId: socket.id
        });
      }
    });
  });
};

module.exports = { setupDJSocketHandlers };


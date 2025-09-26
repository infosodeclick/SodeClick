import { io } from 'socket.io-client';

// Global socket instance เพื่อป้องกันการสร้าง connection หลายตัว
let globalSocket = null;
let socketUsers = new Set();

/**
 * Socket Manager สำหรับจัดการ Socket.IO connections
 */
class SocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.rooms = new Set();
    this.listeners = new Map();
    this.connectionTimeout = null;
    this.rateLimitMap = new Map(); // เก็บ rate limit data
  }

  /**
   * เชื่อมต่อ Socket.IO
   */
  async connect(baseURL) {
    if (this.socket && this.socket.connected) {
      console.log('🔌 Socket already connected:', this.socket.id);
      return this.socket;
    }

    console.log('🔌 Creating new Socket.IO connection to:', baseURL);
    
    // ตรวจสอบ backend connection ก่อน
    try {
      const response = await fetch(`${baseURL}/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (!response.ok) {
        console.warn('⚠️ Backend health check failed, but proceeding with socket connection');
      } else {
        console.log('✅ Backend health check passed');
      }
    } catch (error) {
      console.warn('⚠️ Backend health check error:', error.message);
      console.log('🔄 Proceeding with socket connection anyway...');
    }
    
    // ปิดการเชื่อมต่อเก่าหากมี
    if (this.socket) {
      console.log('🔌 Closing existing socket connection...');
      this.socket.disconnect();
    }
    
    // ดึง token จาก sessionStorage
    const token = sessionStorage.getItem('token');
    console.log('🔑 Connecting with token:', token ? 'available' : 'not available');

    this.socket = io(baseURL, {
      withCredentials: true,
      timeout: 30000, // เพิ่ม timeout
      reconnection: true,
      reconnectionAttempts: 3, // ลดจำนวนการลองใหม่
      reconnectionDelay: 3000, // เพิ่ม delay ระหว่างการลองใหม่
      reconnectionDelayMax: 10000, // เพิ่ม max delay
      forceNew: false,
      transports: ['websocket', 'polling'], // ใช้ websocket เป็นหลัก แล้ว fallback เป็น polling
      upgrade: true,
      rememberUpgrade: true, // เปิดใช้งาน rememberUpgrade
      autoConnect: true,
      auth: {
        token: token
      },
      // ปรับปรุงการตั้งค่า ping
      pingTimeout: 30000, // ลด ping timeout
      pingInterval: 15000, // ลด ping interval
      allowEIO3: true,
      // เพิ่มการตั้งค่า polling
      polling: {
        extraHeaders: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true'
        }
      }
    });

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected:', this.socket.id);
      this.isConnected = true;
      
      // ตั้งค่า connection timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
      }
      this.connectionTimeout = setTimeout(() => {
        if (this.isConnected && this.socket?.connected) {
          console.log('✅ Connection established successfully');
        }
      }, 1000);
      
      // เข้าร่วมห้องที่เคยอยู่
      this.rooms.forEach(roomId => {
        this.socket.emit('join-room', { roomId, userId: this.getCurrentUserId() });
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      this.isConnected = false;
      
      // Clear connection timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      
      // ถ้า disconnect เนื่องจาก server restart หรือ network issues ให้ลอง reconnect
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        console.log('🔄 Server/client disconnect, attempting reconnection...');
        setTimeout(() => {
          if (this.socket && !this.socket.connected) {
            this.socket.connect();
          }
        }, 2000);
      }
    });

    // Listen for reconnect events
    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Reconnection attempt', attemptNumber);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('❌ Reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed after all attempts');
      this.isConnected = false;
    });

    // Listen for notifications and dispatch to window
    this.socket.on('newNotification', (notification) => {
      console.log('🔔 Received notification:', notification);
      window.dispatchEvent(new CustomEvent('newNotification', {
        detail: notification
      }));
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        description: error.description,
        context: error.context,
        type: error.type
      });
      this.isConnected = false;
      
      // Clear connection timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      
      // Handle specific errors
      if (error.message) {
        if (error.message.includes('WebSocket is closed') || error.message.includes('transport closed')) {
          console.log('🔄 Transport closed, will retry with fallback transport...');
        } else if (error.message.includes('Connection refused')) {
          console.log('🔄 Connection refused, will retry automatically...');
        } else if (error.message.includes('400') || error.message.includes('Bad Request')) {
          console.log('🔄 Bad Request error, switching transport...');
          // ลองเปลี่ยน transport
          if (this.socket && !this.socket.connected) {
            setTimeout(() => {
              this.socket.io.opts.transports = ['websocket'];
              this.socket.connect();
            }, 3000);
          }
        }
      }
    });

    return this.socket;
  }

  /**
   * เข้าร่วมห้องแชท (ปรับปรุงเพื่อป้องกันปัญหา)
   */
  joinRoom(roomId, userId, token = null) {
    if (!this.socket || !this.socket.connected) {
      console.warn('⚠️ Socket not connected, cannot join room');
      return;
    }

    if (!roomId || !userId) {
      console.warn('⚠️ Invalid roomId or userId:', { roomId, userId });
      return;
    }

    // ตรวจสอบว่าอยู่ในห้องนี้แล้วหรือยัง
    if (this.socket.currentRoom === roomId && this.socket.currentUserId === userId) {
      console.log('📝 Already in room:', roomId, 'with correct userId');
      return;
    }

    // ออกจากห้องเก่าก่อน (ถ้ามี)
    if (this.socket.currentRoom && this.socket.currentRoom !== roomId) {
      console.log('🚪 Switching from room:', this.socket.currentRoom, 'to:', roomId);
      this.leaveRoom(this.socket.currentRoom);
    }

    // เก็บข้อมูลห้องปัจจุบัน
    this.socket.currentRoom = roomId;
    this.socket.currentUserId = userId;

    // เพิ่ม token ในการ join room
    const joinData = { roomId, userId };
    if (token) {
      joinData.token = token;
    }

    console.log('🚪 Joining room:', roomId, 'with userId:', userId, 'token:', token ? 'provided' : 'not provided');
    this.socket.emit('join-room', joinData);
    this.rooms.add(roomId);
  }

  /**
   * ออกจากห้องแชท (ปรับปรุงเพื่อป้องกัน null userId)
   */
  leaveRoom(roomId) {
    if (!this.socket || !this.socket.connected) {
      console.log('🚪 Socket not connected, skipping leave room');
      return;
    }

    // ตรวจสอบว่าอยู่ในห้องนี้จริงหรือไม่
    if (!this.rooms.has(roomId) && this.socket.currentRoom !== roomId) {
      console.log('🚪 Not in room:', roomId, '- skipping leave');
      return;
    }

    // ใช้ currentUserId ที่เก็บไว้หรือ getCurrentUserId() เป็น fallback
    const userId = this.socket.currentUserId || this.getCurrentUserId();
    
    if (!userId) {
      console.warn('⚠️ Cannot leave room - no valid userId available');
      // ล้างข้อมูลท้องถิ่นแม้ไม่มี userId
      this.rooms.delete(roomId);
      if (this.socket.currentRoom === roomId) {
        this.socket.currentRoom = null;
        this.socket.currentUserId = null;
      }
      return;
    }
    
    console.log('🚪 Leaving room:', roomId, 'with userId:', userId);
    this.socket.emit('leave-room', { roomId, userId });
    
    // ล้างข้อมูลท้องถิ่น
    this.rooms.delete(roomId);
    
    // ล้างข้อมูลห้องปัจจุบัน
    if (this.socket.currentRoom === roomId) {
      this.socket.currentRoom = null;
      this.socket.currentUserId = null;
    }
  }

  /**
   * เพิ่ม event listener
   */
  on(event, callback) {
    if (!this.socket) {
      console.warn('⚠️ Socket not connected, cannot add listener');
      return;
    }

    this.socket.on(event, callback);
    
    // เก็บ reference สำหรับ cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * ลบ event listener
   */
  off(event, callback) {
    if (!this.socket) {
      return;
    }

    this.socket.off(event, callback);
    
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * ส่งข้อความ
   */
  emit(event, data) {
    if (!this.socket) {
      console.warn('⚠️ Socket instance not available');
      return false;
    }

    if (!this.socket.connected) {
      console.warn('⚠️ Socket not connected, attempting to reconnect...');
      this.socket.connect();
      return false;
    }

    console.log(`📤 Emitting ${event} with data:`, data);
    this.socket.emit(event, data);
    return true;
  }

  /**
   * ตรวจสอบ rate limit ก่อนส่ง event
   */
  checkRateLimit(eventType, minInterval = 1000) {
    const now = Date.now();
    const lastTime = this.rateLimitMap.get(eventType) || 0;
    
    if (now - lastTime < minInterval) {
      console.log(`⏱️ Rate limit: ${eventType} (${now - lastTime}ms ago, limit: ${minInterval}ms)`);
      return false;
    }
    
    this.rateLimitMap.set(eventType, now);
    return true;
  }

  /**
   * ส่งข้อความพร้อม rate limiting
   */
  emitWithRateLimit(event, data, minInterval = 1000) {
    if (!this.checkRateLimit(event, minInterval)) {
      console.warn(`⚠️ Rate limit exceeded for event: ${event}`);
      return false;
    }
    
    return this.emit(event, data);
  }

  /**
   * ปิดการเชื่อมต่อ
   */
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.rooms.clear();
      this.listeners.clear();
      this.rateLimitMap.clear(); // ล้าง rate limit data
    }
  }

  /**
   * ตรวจสอบสถานะการเชื่อมต่อ
   */
  getConnectionStatus() {
    // ตรวจสอบสถานะการเชื่อมต่อที่แท้จริง
    const hasSocket = !!this.socket;
    const isSocketConnected = hasSocket && this.socket.connected;
    const isManagerConnected = this.isConnected;
    
    // ถ้ามี socket และ socket.connected = true ให้เชื่อถือ socket.connected มากกว่า
    const isActuallyConnected = hasSocket ? isSocketConnected : isManagerConnected;
    
    return {
      isConnected: isActuallyConnected,
      connected: isActuallyConnected, // สำหรับ backward compatibility
      socketId: this.socket?.id || null,
      rooms: Array.from(this.rooms),
      transport: this.socket?.io?.engine?.transport?.name || null,
      readyState: this.socket?.io?.readyState || null,
      debug: {
        hasSocket,
        isSocketConnected,
        isManagerConnected,
        socketExists: !!this.socket,
        socketConnected: this.socket?.connected,
        socketId: this.socket?.id
      }
    };
  }

  /**
   * ดึง socket instance
   */
  getSocket() {
    return this.socket;
  }

  /**
   * ดึง User ID ปัจจุบัน (ต้อง implement ตามระบบ auth)
   */
  getCurrentUserId() {
    // ใช้ข้อมูลจาก localStorage หรือ context
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return user._id || user.id;
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    return null;
  }
}

// สร้าง global instance
const socketManager = new SocketManager();

export default socketManager;

// Script สำหรับตรวจสอบ Socket.IO events ที่ส่งจาก Frontend
// ใช้ใน Browser Console

console.log('🔍 Starting Socket.IO Event Debug');

// เก็บ original emit function
const originalEmit = window.socketManager?.socket?.emit;

if (originalEmit) {
  // Override emit function เพื่อ log events
  window.socketManager.socket.emit = function(event, data) {
    console.log('📤 Socket.IO Event Sent:', {
      event: event,
      data: data,
      timestamp: new Date().toISOString()
    });
    
    // เรียก original emit
    return originalEmit.call(this, event, data);
  };
  
  console.log('✅ Socket.IO Event logging enabled');
} else {
  console.log('❌ Socket manager not found');
}

// ฟังก์ชันสำหรับตรวจสอบ events ที่ส่ง
window.debugSocketEvents = {
  getEmittedEvents: () => {
    return window.emitLog || [];
  },
  
  clearLog: () => {
    window.emitLog = [];
  },
  
  checkForPrivateChatEvents: () => {
    const events = window.emitLog || [];
    const privateChatEvents = events.filter(event => 
      event.event === 'send-message' && 
      event.data?.chatRoomId?.startsWith('private_')
    );
    
    console.log('🔍 Private Chat Events Found:', privateChatEvents);
    return privateChatEvents;
  }
};

console.log('🔧 Debug functions available:');
console.log('- window.debugSocketEvents.getEmittedEvents()');
console.log('- window.debugSocketEvents.clearLog()');
console.log('- window.debugSocketEvents.checkForPrivateChatEvents()');
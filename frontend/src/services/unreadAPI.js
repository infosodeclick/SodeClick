import enhancedAPI from './enhancedAPI';

/**
 * API service สำหรับจัดการ unread message count
 */
export const unreadAPI = {
  /**
   * ดึงจำนวนข้อความที่ยังไม่ได้อ่านทั้งหมด
   * @param {string} userId - ID ของผู้ใช้
   * @returns {Promise<Object>} ข้อมูลจำนวนข้อความที่ยังไม่ได้อ่าน
   */
  async getUnreadCount(userId) {
    try {
      console.log('🔍 Fetching unread count for user:', userId);
      const response = await enhancedAPI.get(`/api/messages/unread-count/${userId}`);
      console.log('✅ Unread count response:', response);
      return response;
    } catch (error) {
      console.error('❌ Error getting unread count:', error);
      
      // Return fallback data แทนการ throw error
      return {
        success: false,
        data: {
          totalUnreadCount: 0,
          chatUnreadCounts: []
        },
        error: error.message
      };
    }
  },

  /**
   * ดึงจำนวนข้อความที่ยังไม่ได้อ่านสำหรับแชทส่วนตัวเท่านั้น
   * @param {string} userId - ID ของผู้ใช้
   * @returns {Promise<Object>} ข้อมูลจำนวนข้อความที่ยังไม่ได้อ่านสำหรับแชทส่วนตัว
   */
  async getPrivateChatUnreadCount(userId) {
    try {
      console.log('🔍 Fetching private chat unread count for user:', userId);
      const response = await enhancedAPI.get(`/api/messages/private-chats-unread/${userId}`);
      console.log('✅ Private chat unread count response:', response);
      return response;
    } catch (error) {
      console.error('❌ Error getting private chat unread count:', error);
      
      // Return fallback data แทนการ throw error
      return {
        success: false,
        data: {
          totalUnreadCount: 0,
          chatUnreadCounts: []
        },
        error: error.message
      };
    }
  },

  /**
   * ทำเครื่องหมายข้อความว่าอ่านแล้ว
   * @param {string} chatRoomId - ID ของห้องแชท
   * @param {string} userId - ID ของผู้ใช้
   * @returns {Promise<Object>} ผลลัพธ์การทำเครื่องหมาย
   */
  async markAsRead(chatRoomId, userId) {
    try {
      const response = await enhancedAPI.post('/api/messages/mark-as-read', {
        chatRoomId,
        userId
      });
      
      if (response.success) {
        return response.data;
      } else {
        console.warn('Mark as read failed:', response.error);
        return null;
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return null;
    }
  },

  /**
   * ดึงรายการแชทส่วนตัวพร้อมจำนวนข้อความที่ยังไม่ได้อ่าน
   * @param {string} userId - ID ของผู้ใช้
   * @returns {Promise<Object>} รายการแชทส่วนตัว
   */
  async getPrivateChats(userId) {
    try {
      console.log('🔍 Fetching private chats for user:', userId);
      const response = await enhancedAPI.get(`/api/messages/private-chats/${userId}`);
      console.log('✅ Private chats response:', response);
      return response;
    } catch (error) {
      console.error('❌ Error getting private chats:', error);
      
      // Return fallback data แทนการ throw error
      return {
        success: false,
        data: {
          privateChats: [],
          total: 0
        },
        error: error.message
      };
    }
  }
};

export default unreadAPI;

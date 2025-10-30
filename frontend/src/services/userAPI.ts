import { API_BASE_URL } from '../constants'

export const userAPI = {
  // Fetch liked users
  fetchLikedUsers: async (_userId?: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return { success: false, error: 'No token found' };
      }

      const response = await fetch(`${API_BASE_URL}/api/matching/liked-users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: data.success, data: data.data, error: data.message };
    } catch (error) {
      console.error('❌ Error fetching liked users:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error fetching liked users' };
    }
  },

  // Load premium users
  loadPremium: async () => {
    try {
      console.log('🔄 Loading premium users...');
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/profile/premium?limit=50`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      console.log('📡 Premium users API response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 Premium users API response data:', data);
      
      if (data.success && data.data && data.data.users) {
        const users = data.data.users || [];
        console.log('✅ Premium users loaded successfully:', users.length, 'users');
        return { success: true, data: users };
      } else {
        console.warn('⚠️ Premium users API returned no data:', data);
        return { success: false, error: data.message || 'Unknown error' };
      }
    } catch (error) {
      console.error('❌ Error loading premium users:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error loading premium users' };
    }
  },

  // Load all users for discover
  loadAllUsers: async (page = 1, limit = 50) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/profile/discover?page=${page}&limit=${limit}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        return {
          success: true,
          data: {
            users: data.data.users || [],
            pagination: data.data.pagination || {}
          }
        };
      } else {
        return { success: false, error: data.message || 'Unknown error' };
      }
    } catch (error) {
      console.error('❌ Error loading all users:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error loading all users' };
    }
  },

  // Load avatar
  loadAvatar: async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return { success: false, error: 'No token found' };
      }

      const response = await fetch(`${API_BASE_URL}/api/profile/${userId}/avatar`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: data.success, data: data.data, error: data.message };
    } catch (error) {
      console.error('❌ Error loading avatar:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error loading avatar' };
    }
  },

  // Update online status
  updateOnlineStatus: async (isOnline: boolean) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return { success: false, error: 'No token found' };
      }

      const response = await fetch(`${API_BASE_URL}/api/profile/online-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isOnline })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: data.success, error: data.message };
    } catch (error) {
      console.error('❌ Error updating online status:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error updating online status' };
    }
  }
}

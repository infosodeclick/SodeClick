import { API_BASE_URL } from '../config/api';

class VoteAPI {
  constructor() {
    this.baseURL = `${API_BASE_URL}/api/vote`;
  }

  // Helper method to get auth headers
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  // โหวตให้ผู้ใช้
  async castVote(voterId, candidateId, voteType = 'popularity_male', message = '') {
    try {
      console.log('🗳️ Casting vote:', { voterId, candidateId, voteType });
      
      const requestBody = {
        voterId,
        candidateId,
        voteType,
        message: message?.trim()
      };
      console.log('📤 Vote request body:', requestBody);
      
      const response = await fetch(`${this.baseURL}/cast`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();
      console.log('🗳️ Vote cast response:', result);

      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('❌ Error casting vote:', error);
      throw error;
    }
  }

  // ยกเลิกการโหวต
  async uncastVote(voterId, candidateId, voteType = 'popularity_male') {
    try {
      console.log('🗳️ Uncasting vote:', { voterId, candidateId, voteType });
      
      const response = await fetch(`${this.baseURL}/uncast`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          voterId,
          candidateId,
          voteType
        })
      });

      const result = await response.json();
      console.log('🗳️ Vote uncast response:', result);

      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('❌ Error uncasting vote:', error);
      throw error;
    }
  }

  // ดูสถานะการโหวตและคะแนน
  async getVoteStatus(candidateId, voterId = null, voteType = 'popularity_male') {
    try {
      console.log('📊 Getting vote status:', { candidateId, voterId, voteType });
      
      const params = new URLSearchParams({ voteType });
      if (voterId) {
        params.append('voterId', voterId);
      }

      const url = `${this.baseURL}/status/${candidateId}?${params.toString()}`;
      console.log('🔗 Vote status URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const result = await response.json();
      console.log('📊 Vote status response:', result);

      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('❌ Error getting vote status:', error);
      throw error;
    }
  }

  // ดูอันดับการโหวต (Public API - ไม่ต้อง authentication)
  async getRanking(voteType = 'popularity_male', period = 'all', limit = 50) {
    try {
      console.log('🏆 Getting vote ranking (public):', { voteType, period, limit });
      
      const params = new URLSearchParams({
        voteType,
        period,
        limit: limit.toString()
      });

      // ใช้ headers เฉพาะ Content-Type (ไม่ต้อง Authorization)
      const response = await fetch(`${this.baseURL}/ranking?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      console.log('🏆 Vote ranking response (public):', result);

      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('❌ Error getting vote ranking:', error);
      throw error;
    }
  }

  // ดูประวัติการโหวต
  async getVoteHistory(userId, type = 'received', page = 1, limit = 20) {
    try {
      console.log('📜 Getting vote history:', { userId, type, page, limit });
      
      const params = new URLSearchParams({
        type,
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await fetch(`${this.baseURL}/history/${userId}?${params.toString()}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const result = await response.json();
      console.log('📜 Vote history response:', result);

      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('❌ Error getting vote history:', error);
      throw error;
    }
  }

  // Toggle vote (vote หรือ unvote)
  async toggleVote(voterId, candidateId, voteType = 'popularity_male', message = '') {
    try {
      // ตรวจสอบสถานะการโหวตก่อน
      const status = await this.getVoteStatus(candidateId, voterId, voteType);
      
      if (status.data.hasVoted) {
        // ถ้าโหวตแล้ว ให้ยกเลิก
        return await this.uncastVote(voterId, candidateId, voteType);
      } else {
        // ถ้ายังไม่โหวต ให้โหวต
        return await this.castVote(voterId, candidateId, voteType, message);
      }
    } catch (error) {
      console.error('❌ Error toggling vote:', error);
      throw error;
    }
  }
}

// Export singleton instance
const voteAPI = new VoteAPI();
export default voteAPI;

// Helper functions
export const voteHelpers = {
  // แปลงประเภทการโหวต
  getVoteTypeName(voteType) {
    const types = {
      'popularity_combined': 'Popular Vote',
      'popularity_male': 'ความนิยมชาย',
      'popularity_female': 'ความนิยมหญิง',
      'gift_ranking': 'อันดับของขวัญ'
    };
    return types[voteType] || voteType;
  },

  // กำหนดประเภทการโหวต (ไม่จำกัดเพศ - โหวตได้ทุกคน)
  getVoteTypeByGender(gender) {
    // ใช้ popularity_combined สำหรับทุกคน
    return 'popularity_combined';
  },

  // ฟอร์แมตจำนวนโหวต
  formatVoteCount(count) {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  },

  // สร้างข้อความแสดงคะแนน
  getVoteDisplayText(voteStats, voteType) {
    const stats = voteStats[voteType];
    if (!stats || stats.totalVotes === 0) {
      return '0 คะแนน';
    }
    
    const votes = this.formatVoteCount(stats.totalVotes);
    const voters = this.formatVoteCount(stats.uniqueVoters);
    
    return `${votes} คะแนน (${voters} คน)`;
  }
};

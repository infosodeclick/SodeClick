import React, { useState, useEffect } from 'react';
import { Trophy, Heart, Users, Crown, Medal, Award, Star } from 'lucide-react';
import voteAPI, { voteHelpers } from '../services/voteAPI';
import { getMainProfileImage, getMainProfileImageGuest } from '../utils/profileImageUtils';
import { useToast } from './ui/toast';

const VoteRankingMini = ({ 
  voteType = 'popularity_combined',
  limit = 5,
  className = '',
  onUserProfileClick = null
}) => {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userProfiles, setUserProfiles] = useState({});
  const [imageErrors, setImageErrors] = useState(new Set()); // Track failed images
  const { warning } = useToast();
  
  // Check if user is logged in using localStorage (same as HeartVote component)
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isLoggedIn = !!currentUser.id;

  // สร้างสี avatar ตามชื่อผู้ใช้
  const getAvatarColor = (name) => {
    const colors = [
      'from-red-500 to-pink-500',
      'from-blue-500 to-indigo-500', 
      'from-green-500 to-teal-500',
      'from-purple-500 to-violet-500',
      'from-orange-500 to-red-500',
      'from-pink-500 to-rose-500',
      'from-indigo-500 to-purple-500',
      'from-teal-500 to-cyan-500',
      'from-yellow-500 to-orange-500',
      'from-violet-500 to-purple-500'
    ];
    const index = (name || '').charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Handle image error safely
  const handleImageError = (candidateId) => {
    setImageErrors(prev => new Set([...prev, candidateId]));
  };

  // Render profile image with fallback
  const renderProfileImage = (item, styling) => {
    const candidateId = item.candidateId;
    const hasImageError = imageErrors.has(candidateId);
    
    // ใช้ข้อมูลรูปภาพจาก profile API
    const userProfile = userProfiles[candidateId];
    const profileImages = userProfile?.profileImages || [];
    const mainProfileImageIndex = userProfile?.mainProfileImageIndex || 0;
    
    // ใช้ getMainProfileImageGuest เพื่อรองรับ guest mode
    const mainImage = getMainProfileImageGuest(profileImages, mainProfileImageIndex, candidateId, item.gender);
    
    // ถ้ามี error หรือไม่มีรูป ให้แสดง avatar
    if (hasImageError || !mainImage || mainImage.trim() === '' || mainImage.startsWith('data:image/svg+xml')) {
      return (
        <div className={`w-full h-full bg-gradient-to-br ${getAvatarColor(item.displayName || item.username)} flex items-center justify-center`}>
          <span className="text-white font-bold text-xl drop-shadow-lg">
            {String(item.displayName || item.username || '?').charAt(0).toUpperCase()}
          </span>
        </div>
      );
    }

    // แสดงรูปปกติ
    return (
      <img
        src={mainImage}
        alt={item.displayName || item.username || 'ผู้ใช้'}
        className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
        onError={() => handleImageError(candidateId)}
        loading="lazy"
      />
    );
  };

  // ดึงข้อมูลอันดับ
  const fetchRanking = async () => {
    try {
      setLoading(true);
      // ใช้ voteRankingAPI แทน voteAPI เพื่อให้ได้ข้อมูลที่สมบูรณ์
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/vote/ranking?voteType=${voteType}&limit=5&sortBy=totalVotes`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        const rankingData = result.data.rankings || [];
        
        // ใช้ข้อมูลรูปภาพจาก vote API โดยตรง (ไม่ต้องเรียก profile API แยก)
        const profilesMap = {};
        rankingData.forEach(item => {
          if (item.candidateId) {
            profilesMap[item.candidateId] = {
              userId: item.candidateId,
              profileImages: item.profileImages || [],
              mainProfileImageIndex: 0
            };
          }
        });
        
        setUserProfiles(profilesMap);
        setRanking(rankingData);
      } else {
        setRanking([]);
      }
    } catch (error) {
      console.error('Error fetching mini ranking:', error);
      // ไม่แสดง error เพื่อไม่รบกวน UX
    } finally {
      setLoading(false);
    }
  };

  // ดึงข้อมูลเมื่อ component mount
  useEffect(() => {
    fetchRanking();
  }, [voteType, limit]);

  // Real-time vote updates
  useEffect(() => {
    const handleVoteUpdate = (data) => {
      // ตรวจสอบว่าเป็นประเภทการโหวตที่เรากำลังแสดงหรือไม่
      if (data.voteType === voteType) {
        // รีเฟรชข้อมูลอันดับ
        fetchRanking();
      }
    };

    // ใช้ global socketManager แทนการสร้าง connection ใหม่
    const setupSocketListener = () => {
      if (window.socketManager && window.socketManager.socket && window.socketManager.socket.connected) {
        console.log('🔌 VoteRankingMini - Setting up socket listener on existing socket:', window.socketManager.socket.id);
        window.socketManager.socket.on('vote-updated', handleVoteUpdate);
        return true;
      } else {
        console.log('⚠️ VoteRankingMini - Socket not ready, will retry...');
        return false;
      }
    };

    // ลองตั้งค่า listener ทันที
    let listenerSetup = setupSocketListener();
    
    // ถ้า socket ยังไม่พร้อม ให้รอและลองใหม่
    if (!listenerSetup) {
      const retryInterval = setInterval(() => {
        if (setupSocketListener()) {
          clearInterval(retryInterval);
        }
      }, 1000);

      // หยุดการลองใหม่หลังจาก 10 วินาที
      setTimeout(() => {
        clearInterval(retryInterval);
      }, 10000);
    }

    // Cleanup
    return () => {
      if (window.socketManager && window.socketManager.socket) {
        window.socketManager.socket.off('vote-updated', handleVoteUpdate);
      }
    };
  }, [voteType]);


  if (loading) {
    return (
      <div className={`bg-white rounded-lg p-4 shadow-md ${className}`}>
        <div className="flex items-center space-x-2 mb-3">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold text-gray-800">กำลังโหลด...</h3>
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={`loading-${i}`} className="animate-pulse flex items-center space-x-3 py-2">
            <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
            <div className="flex-1 h-3 bg-gray-200 rounded"></div>
            <div className="h-3 w-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (ranking.length === 0) {
    return (
      <div className={`bg-gradient-to-br from-purple-50 via-pink-50 to-white rounded-xl p-6 shadow-lg border border-purple-100 ${className}`}>
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className="relative">
            <Trophy className="h-8 w-8 text-amber-500 animate-pulse" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
          </div>
          <h3 className="font-bold text-gray-800 text-lg">
            🏆 {voteHelpers.getVoteTypeName(voteType)}
          </h3>
        </div>
        
        <div className="text-center space-y-3">
          <div className="animate-bounce">
            <p className="text-gray-600 font-medium">
              ยังไม่มีข้อมูลการโหวต
            </p>
          </div>
          <p className="text-sm text-gray-500 animate-pulse">
            เริ่มต้นโหวตเพื่อดูอันดับความนิยม
          </p>
          
          {/* Decorative elements */}
          <div className="flex justify-center space-x-2 mt-4">
            <div className="w-2 h-2 bg-pink-400 rounded-full animate-ping" style={{animationDelay: '0s'}}></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-ping" style={{animationDelay: '0.2s'}}></div>
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-ping" style={{animationDelay: '0.4s'}}></div>
          </div>
        </div>
      </div>
    );
  }

  // Get top 5 rankings
  const top5Rankings = ranking.slice(0, 5);
  
  // Get rank icon with special styling for top 5
  const getRankIcon = (index) => {
    const rank = index + 1;
    if (rank === 1) {
      return (
        <div className="relative">
          <Crown className="h-6 w-6 text-yellow-500 animate-pulse" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
        </div>
      );
    } else if (rank === 2) {
      return <Medal className="h-5 w-5 text-gray-400" />;
    } else if (rank === 3) {
      return <Award className="h-5 w-5 text-amber-600" />;
    } else if (rank === 4) {
      return <Trophy className="h-5 w-5 text-blue-500" />;
    } else if (rank === 5) {
      return <Star className="h-5 w-5 text-purple-500" />;
    }
    return <span className="text-sm font-bold text-gray-600">#{rank}</span>;
  };

  // Get special styling for top 5
  const getTop5Styling = (index) => {
    const rank = index + 1;
    if (rank === 1) {
      return {
        container: "bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200 shadow-lg",
        profile: "border-4 border-yellow-300 shadow-xl",
        badge: "bg-gradient-to-r from-yellow-500 to-amber-500 shadow-lg"
      };
    } else if (rank === 2) {
      return {
        container: "bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-200 shadow-md",
        profile: "border-3 border-gray-300 shadow-lg",
        badge: "bg-gradient-to-r from-gray-500 to-slate-500 shadow-md"
      };
    } else if (rank === 3) {
      return {
        container: "bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 shadow-md",
        profile: "border-3 border-amber-300 shadow-lg",
        badge: "bg-gradient-to-r from-amber-500 to-orange-500 shadow-md"
      };
    } else if (rank === 4) {
      return {
        container: "bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-md",
        profile: "border-3 border-blue-300 shadow-lg",
        badge: "bg-gradient-to-r from-blue-500 to-indigo-500 shadow-md"
      };
    } else if (rank === 5) {
      return {
        container: "bg-gradient-to-r from-purple-50 to-violet-50 border-2 border-purple-200 shadow-md",
        profile: "border-3 border-purple-300 shadow-lg",
        badge: "bg-gradient-to-r from-purple-500 to-violet-500 shadow-md"
      };
    }
    return {
      container: "bg-white border border-gray-100 shadow-sm",
      profile: "border-2 border-gray-200",
      badge: "bg-gradient-to-r from-pink-500 to-red-500"
    };
  };

  return (
    <div className={`bg-gradient-to-br from-purple-50 via-pink-50 to-white rounded-xl p-4 shadow-lg border border-purple-100 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-center space-x-2 mb-4">
        <div className="relative">
          <Trophy className="h-8 w-8 text-amber-500 animate-bounce" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
        </div>
        <h3 className="font-bold text-gray-800 text-xl">
          🏆 {voteHelpers.getVoteTypeName(voteType)}
        </h3>
      </div>

      {/* Top 5 Rankings */}
      <div className="space-y-3">
        {top5Rankings.map((item, index) => {
          const totalVotes = item.totalVotes || 0;
          const uniqueVoters = item.uniqueVoterCount || 0;
          const styling = getTop5Styling(index);
          const rank = index + 1;

          return (
            <div
              key={item.candidateId || `ranking-${index}`}
              className={`${styling.container} rounded-xl p-3 transition-all duration-500 hover:scale-105 hover:shadow-xl cursor-pointer transform`}
              style={{
                animation: `fadeInUp 0.6s ease-out ${index * 0.2}s forwards`
              }}
              onClick={() => {
                // Check if user is logged in first
                if (!isLoggedIn) {
                  warning('กรุณาเข้าสู่ระบบก่อน');
                  return;
                }
                
                // Navigate to user profile
                if (onUserProfileClick && item) {
                  onUserProfileClick(item);
                } else {
                  // Default navigation to profile page
                  const profileUrl = `/profile/${item._id || item.candidateId}`;
                  window.location.href = profileUrl;
                }
              }}
            >
              <div className="flex items-center space-x-3">
                {/* Rank Icon */}
                <div className="flex-shrink-0 flex items-center justify-center w-10 h-10">
                  {getRankIcon(index)}
                </div>

                {/* Profile Image */}
                <div className="flex-shrink-0">
                  <div className={`w-14 h-14 rounded-full overflow-hidden ${styling.profile} bg-gray-100 transition-all duration-300 hover:scale-110`}>
                    {renderProfileImage(item, styling)}
                  </div>
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-base font-bold text-gray-900 truncate">
                      {item.displayName || item.username || 'ผู้ใช้ไม่ระบุชื่อ'}
                    </h4>
                    {/* Online Status Indicator */}
                    <div className={`h-1.5 w-1.5 rounded-full ${item.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} 
                         title={item.isOnline ? 'ออนไลน์' : 'ออฟไลน์'}></div>
                    {item.membership?.tier && item.membership.tier !== 'member' && (
                      <Crown className="h-3 w-3 text-amber-500 animate-pulse" />
                    )}
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-gray-600">
                    <span className="flex items-center space-x-1">
                      <Users className="h-3 w-3 text-blue-500" />
                      <span>{uniqueVoters.toLocaleString()} คนโหวต</span>
                    </span>
                  </div>
                </div>

                {/* Vote Score Badge */}
                <div className="flex-shrink-0">
                  <div className={`${styling.badge} text-white px-3 py-2 rounded-lg shadow-lg transform transition-all duration-300 hover:scale-110`}>
                    <div className="text-center">
                      <div className="text-sm font-bold">
                        {totalVotes.toLocaleString()}
                      </div>
                      <div className="text-xs opacity-90">
                        คะแนน
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more indicator if there are more than 5 rankings */}
      {ranking.length > 5 && (
        <div className="text-center mt-4">
          <div className="inline-flex items-center space-x-2 text-sm text-gray-500 animate-pulse">
            <span>และอีก {ranking.length - 5} คน</span>
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-ping"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoteRankingMini;

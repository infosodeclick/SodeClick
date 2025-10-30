import React from 'react'
import { MessageCircle, Heart, Star, Coins, Trophy } from 'lucide-react'
import { formatTimeAgo } from '../utils'
import { getProfileImageUrl } from '../utils/profileImageUtils'
import type { Notification } from '../types'

interface NotificationItemProps {
  notification: Notification
  onClick: (notification: Notification) => void
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onClick 
}) => {
  const { _id, type, title, message, data, isRead, createdAt } = notification

  const handleClick = () => {
    onClick(notification)
  }

  if (type === 'private_message') {
    return (
      <div 
        key={_id} 
        onClick={handleClick}
        className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${!isRead ? 'bg-blue-50' : ''}`}
      >
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
            {data.senderProfileImage && !data.senderProfileImage.startsWith('data:image/svg+xml') ? (
              <img 
                src={getProfileImageUrl(data.senderProfileImage, data.senderId)}
                alt={data.senderName}
                className="w-10 h-10 object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-blue-600" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{title || 'ข้อความใหม่'}</p>
            <p className="text-xs text-gray-500">{message || `${data.senderName} ส่งข้อความมา`}</p>
            {data.messageContent && (
              <p className="text-xs text-gray-400 mt-1 truncate">{data.messageContent}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(createdAt)}</p>
          </div>
          {!isRead && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
        </div>
      </div>
    )
  }
  
  if (type === 'profile_like') {
    return (
      <div 
        key={_id} 
        onClick={handleClick}
        className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${!isRead ? 'bg-pink-50' : ''}`}
      >
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
            {data.voterProfileImage && !data.voterProfileImage.startsWith('data:image/svg+xml') ? (
              <img 
                src={getProfileImageUrl(data.voterProfileImage, data.voterId)}
                alt={data.voterName}
                className="w-10 h-10 object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                <Heart className="h-5 w-5 text-pink-600" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{title || 'คุณได้รับไลค์'}</p>
            <p className="text-xs text-gray-500">{message || 'คุณได้รับ ❤️'}</p>
            <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(createdAt)}</p>
          </div>
          {!isRead && <div className="w-2 h-2 bg-pink-500 rounded-full"></div>}
        </div>
      </div>
    )
  }

  if (type === 'profile_star') {
    return (
      <div 
        key={_id} 
        onClick={handleClick}
        className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${!isRead ? 'bg-yellow-50' : ''}`}
      >
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
            {data.voterProfileImage && !data.voterProfileImage.startsWith('data:image/svg+xml') ? (
              <img 
                src={getProfileImageUrl(data.voterProfileImage, data.voterId)}
                alt={data.voterName}
                className="w-10 h-10 object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{title || 'คุณได้รับดาว'}</p>
            <p className="text-xs text-gray-500">{message || 'คุณได้รับ ⭐'}</p>
            <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(createdAt)}</p>
          </div>
          {!isRead && <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>}
        </div>
      </div>
    )
  }

  if (type === 'public_chat_reply') {
    return (
      <div 
        key={_id} 
        onClick={handleClick}
        className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${!isRead ? 'bg-green-50' : ''}`}
      >
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
            {data.senderProfileImage && !data.senderProfileImage.startsWith('data:image/svg+xml') ? (
              <img 
                src={getProfileImageUrl(data.senderProfileImage, data.senderId)}
                alt={data.senderName}
                className="w-10 h-10 object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-green-600" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{title || 'มีคนตอบกลับข้อความคุณ'}</p>
            <p className="text-xs text-gray-500">{message || `${data.senderName} ตอบกลับข้อความของคุณ`}</p>
            {data.messageContent && (
              <p className="text-xs text-gray-400 mt-1 truncate">{data.messageContent}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(createdAt)}</p>
          </div>
          {!isRead && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
        </div>
      </div>
    )
  }

  if (type === 'blur_payment') {
    return (
      <div 
        key={_id} 
        onClick={handleClick}
        className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${!isRead ? 'bg-purple-50' : ''}`}
      >
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
            {data.buyerProfileImage && !data.buyerProfileImage.startsWith('data:image/svg+xml') ? (
              <img 
                src={getProfileImageUrl(data.buyerProfileImage, data.buyerId)}
                alt={data.buyerName}
                className="w-10 h-10 object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Coins className="h-5 w-5 text-purple-600" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{title || 'คุณได้รับเหรียญ'}</p>
            <p className="text-xs text-gray-500">{message || `${data.buyerName} จ่ายเหรียญเพื่อดูภาพของคุณ`}</p>
            <p className="text-xs text-purple-600 mt-1 font-medium">+{data.amount?.toLocaleString()} เหรียญ</p>
            <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(createdAt)}</p>
          </div>
          {!isRead && <div className="w-2 h-2 bg-purple-500 rounded-full"></div>}
        </div>
      </div>
    )
  }

  if (type === 'wheel_prize') {
    return (
      <div 
        key={_id} 
        onClick={handleClick}
        className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${!isRead ? 'bg-orange-50' : ''}`}
      >
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Trophy className="h-5 w-5 text-orange-600" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{title || 'รางวัลจากหมุนวงล้อ'}</p>
            <p className="text-xs text-gray-500">{message || 'คุณได้รับรางวัลจากหมุนวงล้อ'}</p>
            {data.amount && (
              <p className="text-xs text-orange-600 mt-1 font-medium">
                {data.prizeType === 'coins' ? `+${data.amount} เหรียญ` : 
                 data.prizeType === 'votePoints' ? `+${data.amount} โหวต` : 
                 'รางวัลใหญ่'}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(createdAt)}</p>
          </div>
          {!isRead && <div className="w-2 h-2 bg-orange-500 rounded-full"></div>}
        </div>
      </div>
    )
  }
  
  return null
}

import { useState, useEffect, Suspense, lazy } from 'react'

// Loading component for Suspense fallbacks
const LoadingSpinner = ({ size = 'h-8 w-8' }: { size?: string }) => (
  <div className="flex items-center justify-center p-8">
    <div className={`animate-spin rounded-full border-b-2 border-pink-500 ${size}`}></div>
  </div>
)
import { Button } from './components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from './components/ui/avatar'
import { Badge } from './components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs'
import { Dialog, DialogContent, DialogTitle, DialogDescription, VisuallyHidden } from './components/ui/dialog'
import LoginModal from './components/LoginModal'

// Lazy load heavy components with type assertions
const MembershipDashboard = lazy(() => import('./components/MembershipDashboard.jsx')) as any
const MembershipPlans = lazy(() => import('./components/MembershipPlans.jsx')) as any
const PaymentWithAnimation = lazy(() => import('./components/PaymentWithAnimation.tsx'))
const PaymentSuccess = lazy(() => import('./components/PaymentSuccess.tsx')) as any
const UserProfile = lazy(() => import('./components/UserProfile.jsx')) as any
const ChatRoomList = lazy(() => import('./components/ChatRoomList.jsx')) as any
const RealTimeChat = lazy(() => import('./components/RealTimeChat.jsx')) as any
const CreatePrivateRoomModal = lazy(() => import('./components/CreatePrivateRoomModal.jsx')) as any
const AIMatchingSystem = lazy(() => import('./components/AIMatchingSystem.jsx')) as any
const PrivateChatList = lazy(() => import('./components/PrivateChatList.jsx')) as any
const PrivateChat = lazy(() => import('./components/PrivateChat.jsx')) as any
const NewPrivateChatModal = lazy(() => import('./components/NewPrivateChatModal.jsx')) as any
import { useAuth } from './contexts/AuthContext'
import { membershipAPI } from './services/membershipAPI'
import { useToast } from './components/ui/toast'
import MaintenanceMode from './components/MaintenanceMode'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faSearch, 
  faHeart, 
  faComments, 
  faUser, 
  faGem,
  faBell
} from '@fortawesome/free-solid-svg-icons'

import { 
  Heart, 
  Search, 
  MessageCircle, 
  User, 
  Settings, 
  LogIn, 
  ChevronRight, 
  Filter, 
  MapPin, 
  Calendar, 
  Utensils, 
  Sparkles,
  CheckCircle,
  X,
  ArrowLeft,
  Users,
  Crown,
  RefreshCw,
  Briefcase,
  Languages,
  GraduationCap,
  Building,
  PawPrint,
  Dumbbell,
  Wine,
  Cigarette,
  Church,
  Baby
} from 'lucide-react'

type PublicUser = {
  _id?: string
  firstName?: string
  lastName?: string
  nickname?: string
  age?: number
  location?: string
  profileImages?: string[]
  bio?: string
  interests?: any[]
  membership?: { tier?: string }
}

type FeaturedProfile = {
  id?: string | number
  name: string
  age?: number
  location?: string
  distance?: string
  bio?: string
  interests: string[]
  images: string[]
  verified?: boolean
  online?: boolean
  lastActive?: string
  height?: string
  education?: string
  job?: string
  lifestyle?: string
  lookingFor?: string
  languages?: string[]
  personality?: string
  membershipTier?: string
  membership?: { tier?: string }
}

// Sample profile data
const profiles: FeaturedProfile[] = [
  {
    id: 1,
    name: 'Sophie',
    age: 28,
    location: 'Bangkok',
    distance: '3 km',
    bio: 'Coffee enthusiast, book lover, and adventure seeker. Looking for someone who enjoys meaningful conversations and creating lasting memories together.',
    interests: ['Reading', 'Coffee', 'Travel', 'Hiking', 'Photography'],
    images: [],
    verified: true,
    online: true,
    lastActive: 'Online now',
    height: "5'6\"",
    education: 'Master\'s Degree',
    job: 'Graphic Designer',
    lifestyle: 'Non-smoker, occasional drinker',
    lookingFor: 'Long-term relationship',
    languages: ['English', 'Thai'],
    personality: 'Introverted but social when comfortable'
  },
  {
    id: 2,
    name: 'Alex',
    age: 31,
    location: 'Bangkok',
    distance: '5 km',
    bio: 'Photographer and foodie. Let\'s explore new restaurants and capture beautiful moments together. Passionate about art, music, and creating authentic experiences.',
    interests: ['Photography', 'Food', 'Art', 'Music', 'Concerts'],
    images: [],
    verified: true,
    online: false,
    lastActive: '2 hours ago',
    height: "5'11\"",
    education: 'Bachelor\'s Degree',
    job: 'Professional Photographer',
    lifestyle: 'Non-smoker, enjoys wine',
    lookingFor: 'Serious relationship',
    languages: ['English', 'Spanish'],
    personality: 'Extroverted and adventurous'
  },
  {
    id: 3,
    name: 'Emma',
    age: 26,
    location: 'Bangkok',
    distance: '7 km',
    bio: 'Yoga instructor and plant mom. Seeking someone with positive energy and an open mind. Let\'s grow together, both literally and figuratively.',
    interests: ['Yoga', 'Plants', 'Meditation', 'Cooking', 'Nature'],
    images: [],
    verified: true,
    online: true,
    lastActive: 'Online now',
    height: "5'4\"",
    education: 'Certified Yoga Instructor',
    job: 'Wellness Coach',
    lifestyle: 'Vegetarian, non-smoker',
    lookingFor: 'Meaningful connection',
    languages: ['English', 'Mandarin'],
    personality: 'Calm and empathetic'
  },
  {
    id: 4,
    name: 'Daniel',
    age: 30,
    location: 'Bangkok',
    distance: '4 km',
    bio: 'Software engineer by day, musician by night. Looking for someone to share both quiet evenings and concert adventures. Let\'s create our own soundtrack.',
    interests: ['Music', 'Technology', 'Concerts', 'Gaming', 'Coding'],
    images: [],
    verified: true,
    online: false,
    lastActive: '5 hours ago',
    height: "6'0\"",
    education: 'Computer Science Degree',
    job: 'Senior Developer',
    lifestyle: 'Occasional drinker, non-smoker',
    lookingFor: 'Relationship with growth potential',
    languages: ['English', 'Japanese'],
    personality: 'Thoughtful and analytical'
  },
  {
    id: 5,
    name: 'Lily',
    age: 27,
    location: 'Bangkok',
    distance: '6 km',
    bio: 'Art lover and coffee connoisseur. Let\'s create beautiful memories together. I believe every day is an opportunity for inspiration and connection.',
    interests: ['Art', 'Coffee', 'Music', 'Travel', 'Painting'],
    images: [],
    verified: true,
    online: true,
    lastActive: 'Online now',
    height: "5'5\"",
    education: 'Fine Arts Degree',
    job: 'Gallery Curator',
    lifestyle: 'Non-smoker, enjoys craft coffee',
    lookingFor: 'Creative partnership',
    languages: ['English', 'French'],
    personality: 'Expressive and intuitive'
  },
  {
    id: 6,
    name: 'James',
    age: 32,
    location: 'Bangkok',
    distance: '8 km',
    bio: 'Adventure seeker and food explorer. Looking for someone to share life\'s journeys with. Let\'s make every meal an adventure and every weekend a discovery.',
    interests: ['Adventure', 'Food', 'Travel', 'Photography', 'Scuba Diving'],
    images: [],
    verified: true,
    online: false,
    lastActive: '1 day ago',
    height: "6'2\"",
    education: 'Tourism Management',
    job: 'Travel Blogger',
    lifestyle: 'Non-smoker, occasional drinker',
    lookingFor: 'Adventure partner for life',
    languages: ['English', 'German'],
    personality: 'Bold and spontaneous'
  }
]

// Sample messages

function App() {
  const { user, login, logout } = useAuth()
  const { success, error, warning } = useToast()

  const [activeTab, setActiveTab] = useState<'discover' | 'matches' | 'messages' | 'membership' | 'profile'>('discover')
  
  // Function to handle Learn More button click - scrolls to specific Premium section
  const handleLearnMoreClick = () => {
    setActiveTab('membership')
    
    // Scroll to benefits comparison table after switching to membership tab
    setTimeout(() => {
      // Try to find the benefits comparison table first
      const benefitsComparisonTable = document.getElementById('benefits-comparison-table') as HTMLElement
      if (benefitsComparisonTable) {
        benefitsComparisonTable.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        })
      } else {
        // Fallback to membership comparison section
        const membershipComparison = document.getElementById('membership-comparison') as HTMLElement
        if (membershipComparison) {
          membershipComparison.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          })
        } else {
          // Fallback to membership content if comparison section not found
          const membershipContent = document.getElementById('membership-content') as HTMLElement
          if (membershipContent) {
            membershipContent.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
              inline: 'nearest'
            })
          }
        }
      }
    }, 400) // Longer delay to ensure membership content is fully rendered
  }

  // Function to handle tab change with immediate scroll behavior
  const handleTabChange = (newTab: 'discover' | 'matches' | 'messages' | 'membership' | 'profile') => {
    setActiveTab(newTab)
    
    // Special scroll behavior for matches tab
    if (newTab === 'matches') {
      setTimeout(() => {
        // Try to find the matches content area by ID first
        const matchesContent = document.getElementById('matches-content') as HTMLElement
        if (matchesContent) {
          matchesContent.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          })
        } else {
          // Fallback to tab navigation if matches content not found
          const tabNavigation = document.querySelector('[role="tablist"]') as HTMLElement
          if (tabNavigation) {
            tabNavigation.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
              inline: 'nearest'
            })
          }
        }
      }, 200) // Longer delay to ensure matches content is fully rendered
    } else if (newTab === 'membership') {
      // For membership tab - just switch tab without scrolling to specific section
      // This allows normal tab navigation without auto-scrolling
      setTimeout(() => {
        const tabNavigation = document.querySelector('[role="tablist"]') as HTMLElement
        if (tabNavigation) {
          tabNavigation.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          })
        }
      }, 100)
    } else {
      // Default scroll behavior for other tabs
      setTimeout(() => {
        const tabNavigation = document.querySelector('[role="tablist"]') as HTMLElement
        if (tabNavigation) {
          tabNavigation.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          })
        }
      }, 100) // Small delay to ensure tab content is rendered
    }
  }
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<FeaturedProfile | null>(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileAlert, setProfileAlert] = useState<{message: string, type: 'error' | 'warning' | 'success'} | null>(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [likedProfiles, setLikedProfiles] = useState(new Set<string>())
  const [modalAction, setModalAction] = useState<'chat' | 'like' | 'profile' | null>(null)

  // ฟังก์ชันโหลดข้อมูล liked users จาก backend
  const fetchLikedUsers = async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        console.log('❌ ไม่มี token - ข้ามการโหลด liked users');
        return;
      }

      console.log('🔄 โหลดข้อมูล liked users...');
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/matching/liked-users`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Liked users loaded:', result.data);
        if (result.data && Array.isArray(result.data)) {
          setLikedProfiles(new Set(result.data));
        }
      } else {
        console.error('❌ Failed to load liked users');
      }
    } catch (error) {
      console.error('❌ Error loading liked users:', error);
    }
  };
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [premiumUsers, setPremiumUsers] = useState<PublicUser[]>([])
  const premiumTierOrder = ['platinum', 'diamond']
  
  // Payment flow states
  const [currentView, setCurrentView] = useState<'main' | 'payment' | 'success'>('main') // 'main', 'payment', 'success'
  const [selectedPlan, setSelectedPlan] = useState<any>(null)
  const [transactionData, setTransactionData] = useState<any>(null)
  
  // Chat states
  const [chatView, setChatView] = useState<'list' | 'chat'>('list') // 'list', 'chat'
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false)
  
  // Private chat states
  const [privateChatView, setPrivateChatView] = useState<'list' | 'chat'>('list') // 'list', 'chat'
  const [selectedPrivateChat, setSelectedPrivateChat] = useState<any>(null)
  const [showNewPrivateChatModal, setShowNewPrivateChatModal] = useState(false)
  const [privateChats, setPrivateChats] = useState<any[]>([])
  const [chatType, setChatType] = useState<'public' | 'private'>('public') // 'public', 'private'
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false)
  
  // Notification states
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)
  
  // Maintenance Mode states
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false)
  const [maintenanceChecked, setMaintenanceChecked] = useState(false)
  const [hasDevAccess, setHasDevAccess] = useState(() => {
    // Check if user has dev access from localStorage
    return localStorage.getItem('devAccess') === 'true'
  })
  const [bypassMaintenance, setBypassMaintenance] = useState(() => {
    // Check if user has bypass maintenance flag
    return localStorage.getItem('bypassMaintenance') === 'true'
  })
  
  // Fetch notifications from backend
  const fetchNotifications = async () => {
    if (!user?._id) return
    
    try {
      setIsLoadingNotifications(true)
      const token = localStorage.getItem('token')
      
      // ใช้ VITE_API_BASE_URL แทน VITE_API_URL
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
      const response = await fetch(`${apiUrl}/api/notifications/${user._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      // เพิ่มการตรวจสอบ response type
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('❌ Expected JSON but got:', contentType, text.substring(0, 200))
        throw new Error(`Expected JSON response but got ${contentType}`)
      }
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setNotifications(data.data.notifications || [])
          setUnreadCount(data.data.unreadCount || 0)
        }
      } else {
        console.error('❌ Notifications API error:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setIsLoadingNotifications(false)
    }
  }
  
  // Polling for new notifications
  useEffect(() => {
    if (!user?._id) return
    
    // Fetch initial notifications
    fetchNotifications()
    
    // Set up polling every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    
    return () => clearInterval(interval)
  }, [user?._id])
  
  // Format time ago
  const formatTimeAgo = (timestamp: string | Date) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'เมื่อสักครู่'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} นาทีที่แล้ว`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ชั่วโมงที่แล้ว`
    return `${Math.floor(diffInSeconds / 86400)} วันที่แล้ว`
  }
  
  // Render notification item
  const renderNotificationItem = (notification: any) => {
    const { type, data, createdAt, isRead } = notification
    
    if (type === 'private_message') {
      return (
        <div key={notification._id} className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${!isRead ? 'bg-blue-50' : ''}`}>
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">ข้อความใหม่</p>
              <p className="text-xs text-gray-500">{data.senderName} ส่งข้อความมา</p>
              <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(createdAt)}</p>
            </div>
            {!isRead && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
          </div>
        </div>
      )
    }
    
    if (type === 'profile_like') {
      return (
        <div key={notification._id} className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${!isRead ? 'bg-pink-50' : ''}`}>
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
              <Heart className="h-4 w-4 text-pink-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">มีคนชอบคุณ!</p>
              <p className="text-xs text-gray-500">มีคนกดหัวใจให้คุณ</p>
              <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(createdAt)}</p>
            </div>
            {!isRead && <div className="w-2 h-2 bg-pink-500 rounded-full"></div>}
          </div>
        </div>
      )
    }
    
    return null
  }
  
  // Chat countdown states
  const [chatCountdown, setChatCountdown] = useState<number | null>(null)
  const [isStartingChat, setIsStartingChat] = useState(false)
  
  // Profile details view state
  const [showProfileDetails, setShowProfileDetails] = useState(false)
  
  // Profile data state
  const [profileData, setProfileData] = useState<any>(null)
  const [loadingProfileData, setLoadingProfileData] = useState(false)
  
  // Top voted profiles - ใช้ profiles ที่มี voteCount สูงสุด
  const [topVotedProfiles] = useState(() => {
    return profiles
      .map(profile => ({
        ...profile,
        voteCount: (profile as any).voteCount || 0 // ใช้ vote count จริงจากฐานข้อมูล
      }))
      .sort((a, b) => b.voteCount - a.voteCount)
      .slice(0, 5) // เก็บ top 5
  })
  
  // ฟังก์ชันลบแชทซ้ำจากอาร์เรย์
  const removeDuplicateChatsFromArray = (chats: any[]) => {
    const seen = new Set();
    const uniqueChats = chats.filter(chat => {
      // ใช้ otherUser._id เป็นตัวระบุเอกลักษณ์
      const key = chat.otherUser?._id || chat.otherUser?.id || chat.id;
      if (seen.has(key)) {
        console.log('🗑️ Removing duplicate chat:', key);
        return false;
      }
      seen.add(key);
      return true;
    });
    
    if (chats.length !== uniqueChats.length) {
      console.log('🧹 Removed duplicates:', chats.length, '->', uniqueChats.length);
    }
    
    return uniqueChats;
  };

  // ฟังก์ชันดึงข้อมูลแชทส่วนตัวจาก API
  const fetchPrivateChats = async () => {
    if (!user || (!user._id && !user.id)) {
      console.log('❌ No user or user ID found');
      return;
    }
    
    try {
      console.log('🔄 Fetching private chats from API...');
      const token = sessionStorage.getItem('token');
      
      if (!token) {
        console.error('❌ No token found');
        return;
      }

      const userId = user._id || user.id;
      console.log('👤 User ID:', userId);
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/messages/private-chats/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Private chats fetched successfully:', result);
      
      if (result.success && result.data && result.data.privateChats) {
        // ลบแชทซ้ำก่อนตั้งค่า
        const uniqueChats = removeDuplicateChatsFromArray(result.data.privateChats);
        setPrivateChats(uniqueChats);
        console.log('🔄 Updated private chats from API:', uniqueChats.length);
      } else {
        console.error('❌ Invalid response format:', result);
      }
    } catch (error) {
      console.error('❌ Error fetching private chats:', error);
      // Fallback to localStorage if API fails
      console.log('📂 Falling back to localStorage...');
      const savedChats = loadChatsFromStorage();
      if (savedChats.length > 0) {
        const uniqueStoredChats = removeDuplicateChatsFromArray(savedChats);
        setPrivateChats(uniqueStoredChats);
        console.log('🔄 Restored chats from localStorage fallback:', uniqueStoredChats.length);
      }
    }
  };

  // ฟังก์ชันสร้างแชทส่วนตัวใหม่ผ่าน API
  const createPrivateChat = async (otherUser: any) => {
    if (!user) return null;
    
    try {
      console.log('🔄 Creating private chat via API...');
      const token = sessionStorage.getItem('token');
      
      if (!token) {
        console.error('❌ No token found');
        return null;
      }

      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/messages/create-private-chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId1: user._id || user.id,
          userId2: otherUser._id
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Private chat created successfully:', result);
      
      if (result.success && result.data) {
        const chatId = result.data.chatId;
        const isNew = result.data.isNew;
        console.log('🔑 Created chat ID:', chatId, 'isNew:', isNew);
        
        // ตรวจสอบว่ามีแชทนี้อยู่แล้วหรือไม่
        const existingChat = privateChats.find(chat => chat.id === chatId);
        if (existingChat) {
          console.log('📝 Chat already exists, returning existing chat');
          return existingChat;
        }
        
        const newChat = {
          id: chatId,
          roomId: chatId,
          otherUser: otherUser,
          messages: [],
          createdAt: new Date(),
          lastMessage: null,
          unreadCount: 0,
          isNew: isNew
        };
        
        console.log('📝 New chat object:', newChat);
        return newChat;
      } else {
        console.error('❌ Invalid response format:', result);
        return null;
      }
    } catch (error) {
      console.error('❌ Error creating private chat:', error);
      return null;
    }
  };

  // ฟังก์ชันดึงข้อความจาก API
  const fetchMessages = async (chatRoomId: string) => {
    if (!user) return [];
    
    try {
      console.log('🔄 Fetching messages for chat room:', chatRoomId);
      const token = sessionStorage.getItem('token');
      
      if (!token) {
        console.error('❌ No token found');
        return [];
      }

      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/messages/${chatRoomId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Messages fetched successfully:', result);
      
      if (result.success && result.data && result.data.messages) {
        // แปลงข้อมูลข้อความให้มี senderId และข้อมูลที่จำเป็นสำหรับการแสดงผล
        const processedMessages = result.data.messages.map((message: any) => ({
          ...message,
          senderId: message.sender?._id || message.sender?.id || message.senderId,
          // ใช้ createdAt เป็น timestamp ถ้าไม่มี timestamp
          timestamp: message.timestamp || message.createdAt || new Date(),
          // ตั้งค่า isDelivered เป็น true ถ้าไม่มีข้อมูล
          isDelivered: message.isDelivered !== null ? message.isDelivered : true,
          // ตั้งค่า isRead เป็น false ถ้าไม่มีข้อมูล
          isRead: message.isRead !== null ? message.isRead : false
        }));
        console.log('🔄 Processed messages with metadata:', processedMessages.length);
        return processedMessages;
      } else {
        console.error('❌ Invalid response format:', result);
        return [];
      }
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      return [];
    }
  };

  // Check maintenance mode status
  const checkMaintenanceMode = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      
      const response = await fetch(`${baseUrl}/api/maintenance/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const isMaintenance = data.data?.isMaintenanceMode || false;
        setIsMaintenanceMode(isMaintenance);
        
        // Clear bypass flag if maintenance mode is off
        if (!isMaintenance) {
          localStorage.removeItem('bypassMaintenance');
          setBypassMaintenance(false);
        }
      } else {
        console.error('Maintenance mode check failed:', response.status);
        setIsMaintenanceMode(false);
      }
    } catch (error) {
      console.error('Error checking maintenance mode:', error);
      // Default to false if check fails
      setIsMaintenanceMode(false);
    } finally {
      setMaintenanceChecked(true);
    }
  };

  // Handle dev access to maintenance mode
  const handleDevAccess = (code: string) => {
    if (code === 'DEV2024LOVE') {
      setHasDevAccess(true);
      localStorage.setItem('devAccess', 'true');
      alert('เข้าสู่ระบบในโหมด Developer สำเร็จ! คุณสามารถเข้าถึงระบบได้แล้ว แต่หน้า Maintenance Mode ยังคงแสดงอยู่');
    }
  };

  // Check authentication on mount
  useEffect(() => {
    console.log('🚀 App mounted, user:', user ? 'logged in' : 'not logged in');
    if (user) {
      console.log('👤 User object:', user);
      console.log('🆔 User ID:', user._id || user.id);
    }
    
    // Check maintenance mode first
    checkMaintenanceMode();
    
    // Check bypass maintenance flag
    const bypassFlag = localStorage.getItem('bypassMaintenance') === 'true';
    setBypassMaintenance(bypassFlag);
    
    // ทดสอบ localStorage
    try {
      const testKey = 'test-localStorage';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      console.log('✅ localStorage is working');
    } catch (error) {
      console.error('❌ localStorage is not working:', error);
    }
    
    if (user) {
      setIsAuthenticated(true)
      // โหลดข้อมูล liked users เมื่อผู้ใช้เข้าสู่ระบบแล้ว
      fetchLikedUsers()
      // ดึงข้อมูลแชทส่วนตัวจาก API
      fetchPrivateChats()
    } else {
      setIsAuthenticated(false)
      console.log('👤 User not logged in, skipping chat restoration');
    }
  }, [user])

  // บันทึกข้อมูลแชทใน localStorage ทุกครั้งที่มีการเปลี่ยนแปลง
  useEffect(() => {
    console.log('🔄 useEffect triggered - privateChats changed:', privateChats.length);
    console.log('🔍 Current user:', user ? 'logged in' : 'not logged in');
    
    if (user && privateChats.length >= 0) { // เปลี่ยนจาก > 0 เป็น >= 0 เพื่อบันทึกแม้ไม่มีแชท
      console.log('💾 User is logged in, saving chats to localStorage');
      saveChatsToStorage(privateChats);
      
      // ตรวจสอบว่าข้อมูลถูกบันทึกจริงหรือไม่
      setTimeout(() => {
        const verification = localStorage.getItem('privateChats');
        if (verification) {
          const parsed = JSON.parse(verification);
          console.log('✅ Verification: Data saved successfully, count:', parsed.length);
        } else {
          console.error('❌ Verification: Data not saved to localStorage');
        }
      }, 100);
    } else if (!user) {
      // ล้างข้อมูลแชทเมื่อผู้ใช้ออกจากระบบ
      console.log('🧹 User logged out, clearing chats from localStorage');
      localStorage.removeItem('privateChats');
      // ไม่เรียก setPrivateChats([]) ที่นี่เพื่อหลีกเลี่ยง infinite loop
      console.log('🧹 Cleared chats on logout');
    } else {
      console.log('📭 No chats to save or user not logged in');
    }
  }, [privateChats, user]);

  // แยก useEffect สำหรับล้างข้อมูลแชทเมื่อผู้ใช้ออกจากระบบ
  useEffect(() => {
    if (!user) {
      console.log('🧹 User logged out, clearing chats state');
      setPrivateChats([]);
    }
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showProfileDropdown) {
        const target = event.target as HTMLElement
        if (!target.closest('.profile-dropdown-container')) {
          setShowProfileDropdown(false)
        }
      }
      
      if (showNotificationDropdown) {
        const target = event.target as HTMLElement
        if (!target.closest('.notification-dropdown-container')) {
          setShowNotificationDropdown(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProfileDropdown, showNotificationDropdown])

  // Load Premium Members for Discover tab (from backend only)
  useEffect(() => {
    let isCancelled = false
    const loadPremium = async () => {
      try {
        // setIsLoadingPremium(true)
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
        const token = sessionStorage.getItem('token');
        console.log('🔑 Frontend - Sending token:', token ? 'Present' : 'Not present');
        console.log('👤 Frontend - Current user:', user);
        
        const res = await fetch(`${base}/api/profile/premium?limit=50`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        })
        if (!res.ok) return
        const data = await res.json()
        const users: PublicUser[] = data?.data?.users || []
        // Ensure final ordering and cap
        const sorted = users
          .sort((a: PublicUser, b: PublicUser) => {
            const ai = premiumTierOrder.indexOf((a?.membership?.tier || '') as string)
            const bi = premiumTierOrder.indexOf((b?.membership?.tier || '') as string)
            return ai - bi
          })
          .slice(0, 50)
        if (!isCancelled) setPremiumUsers(sorted)
      } catch (_) {
        // ignore errors for this section
      } finally {
        // if (!isCancelled) setIsLoadingPremium(false)
      }
    }
    loadPremium()
    return () => { isCancelled = true }
  }, [])

  // Helper function for webapp notification
  const showWebappNotification = (message: string, type: 'warning' | 'error' | 'success' = 'warning') => {
    console.log('🔔 Showing notification:', { message, type });
    // Use toast notification
    switch (type) {
      case 'success':
        success(message);
        break;
      case 'error':
        error(message);
        break;
      case 'warning':
      default:
        warning(message);
        break;
    }
  };

  // Load all users for Discover Amazing People section
  const [allUsers, setAllUsers] = useState<PublicUser[]>([])
  const [isLoadingAllUsers, setIsLoadingAllUsers] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreUsers, setHasMoreUsers] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [visibleCount, setVisibleCount] = useState(8)
  const [filters, setFilters] = useState({
    gender: '',
    ageMin: 18,
    ageMax: 100,
    province: '',
    lookingFor: '',
    relationship: '',
    otherRelationship: '',
    distanceKm: '',
    lat: '',
    lng: ''
  })
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    let isCancelled = false
    const loadAllUsers = async () => {
      try {
        setIsLoadingAllUsers(true)
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
        const res = await fetch(`${base}/api/profile/discover?limit=20`, {
          headers: {
            'Content-Type': 'application/json',
            ...(sessionStorage.getItem('token') ? { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` } : {})
          }
        })
        if (!res.ok) return
        const data = await res.json()
        const users: PublicUser[] = data?.data?.users || []
        const pagination = data?.data?.pagination || {}
        
        if (!isCancelled) {
          setAllUsers(users)
          setHasMoreUsers(pagination.page < pagination.pages)
          setCurrentPage(1)
          setVisibleCount(users.length)
        }
      } catch (_) {
        // ignore errors for this section
      } finally {
        if (!isCancelled) setIsLoadingAllUsers(false)
      }
    }
    loadAllUsers()
    return () => { isCancelled = true }
  }, [])

  // Load more users function
  const loadMoreUsers = async () => {
    if (isLoadingMore || !hasMoreUsers) return
    
    try {
      setIsLoadingMore(true)
      const nextPage = currentPage + 1
      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
      const res = await fetch(`${base}/api/profile/discover?limit=20`, {
        headers: {
          'Content-Type': 'application/json',
          ...(sessionStorage.getItem('token') ? { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` } : {})
        }
      })
      if (!res.ok) return
      const data = await res.json()
      console.log('📊 LoadMore results:', data)
      console.log('📊 Like counts from LoadMore:', data?.data?.users?.map((u: any) => ({ id: u._id, likeCount: u.likeCount })));
      const newUsers: PublicUser[] = data?.data?.users || []
      const pagination = data?.data?.pagination || {}
      
      setAllUsers(prev => [...prev, ...newUsers])
      setHasMoreUsers(pagination.page < pagination.pages)
      setCurrentPage(nextPage)
    } catch (_) {
      // ignore errors for this section
    } finally {
      setIsLoadingMore(false)
    }
  }
  
  // Load user profile image for header avatar
  useEffect(() => {
    const loadAvatar = async () => {
      try {
        if (user?._id || user?.id) {
          const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
          const userId = user._id || user.id;
          const res = await fetch(`${base}/api/profile/${userId}`, {
            headers: {
              'Content-Type': 'application/json',
              ...(sessionStorage.getItem('token') ? { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` } : {})
            }
          })
          if (res.ok) {
            const data = await res.json()
            const img = (data?.data?.profile?.profileImages?.[0] as string | undefined) || ''
            // ตรวจสอบว่าไม่ใช่รูป default
            if (img && !img.startsWith('data:image/svg+xml')) {
              setAvatarUrl(img)
            } else {
              setAvatarUrl(null)
            }
            return
          }
        }
      } catch (_) {
        // ignore
      }
      setAvatarUrl(null)
    }
    if (isAuthenticated) {
      loadAvatar()
    } else {
      setAvatarUrl(null)
    }
  }, [isAuthenticated, user])
  
  // ฟัง event เมื่อมีการอัปเดตรูปโปรไฟล์
  useEffect(() => {
    const handleProfileImageUpdate = (event: CustomEvent) => {
      const { userId, profileImages } = event.detail;
      if (user?._id === userId || user?.id === userId) {
        const img = profileImages?.[0];
        if (img && !img.startsWith('data:image/svg+xml')) {
          setAvatarUrl(img);
        } else {
          setAvatarUrl(null);
        }
      }
    };

    window.addEventListener('profileImageUpdated', handleProfileImageUpdate as EventListener);
    return () => {
      window.removeEventListener('profileImageUpdated', handleProfileImageUpdate as EventListener);
    };
  }, [user]);
  
  // ฟังก์ชันจัดการการกดหัวใจใน profile modal
  const handleProfileLike = async (profileId: string) => {
    console.log('🔍 handleProfileLike called with profileId:', profileId);
    
    const token = sessionStorage.getItem('token');
    if (!token) {
      console.error('❌ ไม่มี token - กรุณาเข้าสู่ระบบก่อน');
      return;
    }

    const isCurrentlyLiked = likedProfiles.has(profileId);
    console.log('📊 Current like status:', isCurrentlyLiked);

    try {
      console.log('🚀 Sending API request...');
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/matching/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          matchId: profileId,
          action: isCurrentlyLiked ? 'unlike' : 'like' // ส่ง action เพื่อบอกว่าจะ like หรือ unlike
        })
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ API Response:', result);
        console.log(isCurrentlyLiked ? 'ยกเลิกไลค์เรียบร้อยแล้ว!' : 'ส่งไลค์เรียบร้อยแล้ว!');
        
        // อัปเดตสถานะการกดหัวใจใน local state
        setLikedProfiles(prev => {
          const newSet = new Set(prev);
          if (isCurrentlyLiked) {
            newSet.delete(profileId); // ลบออกถ้ากดซ้ำ
          } else {
            newSet.add(profileId); // เพิ่มถ้ากดครั้งแรก
          }
          console.log('🔄 Updated likedProfiles:', Array.from(newSet));
          return newSet;
        });

        // อัปเดตจำนวนการกดไลค์แบบ real-time
        setAllUsers(prevUsers => {
          return prevUsers.map(user => {
            if (user._id === profileId) {
              // ใช้ข้อมูลจาก API response แทนการคำนวณเอง
              return {
                ...user,
                likeCount: result.data?.likeCount || (user as any).likeCount || 0
              };
            }
            return user;
          });
        });

        // ส่ง event เพื่อให้หน้า Matches อัปเดตด้วย
        console.log('📤 App.tsx sending like-status-changed event:', {
          profileId,
          isLiked: !isCurrentlyLiked,
          likeCount: result.data?.likeCount || 0
        });
        window.dispatchEvent(new CustomEvent('like-status-changed', {
          detail: {
            profileId,
            isLiked: !isCurrentlyLiked,
            likeCount: result.data?.likeCount || 0
          }
        }));
      } else {
        const error = await response.json();
        console.error('❌ API Error:', error.message || 'เกิดข้อผิดพลาดในการจัดการไลค์');
      }
    } catch (error) {
      console.error('❌ Network Error:', error);
    }
  };

  // ฟังก์ชันตรวจสอบ Role สำหรับการสร้างแชทส่วนตัว
  const canCreatePrivateChat = (currentUserTier: string, targetUserTier: string) => {
    const tierHierarchy = {
      'member': 0,
      'silver': 1,
      'gold': 2,
      'vip': 3,
      'vip1': 4,
      'vip2': 5,
      'diamond': 6,
      'platinum': 7
    };
    
    const currentLevel = (tierHierarchy as any)[currentUserTier] || 0;
    const targetLevel = (tierHierarchy as any)[targetUserTier] || 0;
    
    console.log('🔍 canCreatePrivateChat check:', { currentUserTier, targetUserTier, currentLevel, targetLevel, canChat: currentLevel >= targetLevel });
    
    // Role ที่สูงกว่าสามารถสร้างแชทกับ Role ที่ต่ำกว่าได้เสมอ
    // Role ที่ต่ำกว่าไม่สามารถสร้างแชทกับ Role ที่สูงกว่าได้
    return currentLevel >= targetLevel;
  };

  // ฟังก์ชันตรวจสอบ Role สำหรับการดูโปรไฟล์
  const canViewProfile = (currentUserTier: string, targetUserTier: string) => {
    const tierHierarchy = {
      'member': 0,
      'silver': 1,
      'gold': 2,
      'vip': 3,
      'vip1': 4,
      'vip2': 5,
      'diamond': 6,
      'platinum': 7
    };
    
    const currentLevel = (tierHierarchy as any)[currentUserTier] || 0;
    const targetLevel = (tierHierarchy as any)[targetUserTier] || 0;
    
    console.log('🔍 canViewProfile check:', { currentUserTier, targetUserTier, currentLevel, targetLevel, canView: currentLevel >= targetLevel });
    
    // Role ที่สูงกว่าสามารถดูโปรไฟล์ของ Role ที่ต่ำกว่าได้เสมอ
    // Role ที่ต่ำกว่าไม่สามารถดูโปรไฟล์ของ Role ที่สูงกว่าได้
    return currentLevel >= targetLevel;
  };

  // Helper function to safely display data that might be an object
  const safeDisplay = (data: any) => {
    if (data === null || data === undefined) return '';
    if (typeof data === 'string' || typeof data === 'number') return data;
    if (typeof data === 'object') {
      // Handle specific object types
      if (data.level !== undefined) {
        return data.level || 'ไม่ระบุ';
      }
      if (data.category) {
        return data.category;
      }
      if (data.name) {
        return data.name;
      }
      // For other objects, try to find a meaningful value
      if (data.value) return data.value;
      if (data.text) return data.text;
      if (data.label) return data.label;
      // If no meaningful value found, return empty string
      return '';
    }
    return String(data);
  };

  // Helper function to format interests data
  const formatInterests = (interests: any[]) => {
    if (!interests || !Array.isArray(interests)) return [];
    
    return interests.map(interest => {
      if (typeof interest === 'string') return interest;
      if (typeof interest === 'object' && interest.category) {
        return interest.category;
      }
      return String(interest);
    }).filter(Boolean);
  };

  // Helper function to translate gender to Thai
  const translateGender = (gender: string) => {
    const genderMap: { [key: string]: string } = {
      'male': 'ชาย',
      'female': 'หญิง',
      'other': 'อื่นๆ',
      'non-binary': 'ไม่ระบุเพศ',
      'prefer-not-to-say': 'ไม่ระบุ'
    };
    return genderMap[gender?.toLowerCase()] || gender || 'ยังไม่ระบุ';
  };

  // Helper function to translate relationship preference to Thai
  const translateRelationship = (relationship: string) => {
    const relationshipMap: { [key: string]: string } = {
      'serious': 'ความสัมพันธ์จริงจัง',
      'casual': 'ความสัมพันธ์แบบสบายๆ',
      'friendship': 'เพื่อน',
      'dating': 'เดท',
      'marriage': 'แต่งงาน',
      'not-sure': 'ยังไม่แน่ใจ',
      'friends-with-benefits': 'เพื่อนที่มีประโยชน์',
      'long-term': 'ความสัมพันธ์ระยะยาว',
      'short-term': 'ความสัมพันธ์ระยะสั้น',
      'female': 'หญิง',
      'male': 'ชาย',
      'any': 'ทุกเพศ',
      'both': 'ทั้งสองเพศ',
      'other': 'อื่นๆ'
    };
    return relationshipMap[relationship?.toLowerCase()] || relationship || 'ยังไม่ระบุ';
  };

  // ฟังก์ชันดึงข้อมูลโปรไฟล์จาก API
  const fetchProfileData = async (userId: string) => {
    try {
      setLoadingProfileData(true)
      const token = sessionStorage.getItem('token')
      
      if (!token) {
        console.error('❌ ไม่มี token')
        return null
      }

      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/profile/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ ดึงข้อมูลโปรไฟล์สำเร็จ:', result)
      
      // ตรวจสอบว่า response มี success และ data หรือไม่
      if (result.success && result.data && result.data.profile) {
        return result.data.profile
      } else {
        console.error('❌ Response format ไม่ถูกต้อง:', result)
        return null
      }
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์:', error)
      return null
    } finally {
      setLoadingProfileData(false)
    }
  }

  // ฟังก์ชันจัดการการดูโปรไฟล์
  const handleViewProfile = async (profileData: any) => {
    if (!user) {
      console.error('❌ ไม่มีผู้ใช้ที่เข้าสู่ระบบ');
      return;
    }
    
    // ตรวจสอบ Role ก่อนดูโปรไฟล์
    const currentUserTier = user.membership?.tier || 'member';
    const targetUserTier = profileData.membershipTier || 'member';
    
    if (!canViewProfile(currentUserTier, targetUserTier)) {
      console.log('🚫 Cannot view profile - Role restriction:', { currentUserTier, targetUserTier });
      setProfileAlert({ message: 'ไม่สามารถดูระดับที่สูงกว่าคุณได้', type: 'warning' });
      setTimeout(() => setProfileAlert(null), 3000); // ซ่อนแจ้งเตือนหลัง 3 วินาที
      return;
    }
    
    console.log('👤 Viewing profile details:', profileData.name);
    
    // ดึงข้อมูลโปรไฟล์จริงจาก API
    const fullProfileData = await fetchProfileData(profileData.id);
    
    if (fullProfileData) {
      // เก็บข้อมูลโปรไฟล์ที่ดึงมา
      setProfileData(fullProfileData);
      // เปิดการแสดงข้อมูลรายละเอียดแบบเต็มจอ
      setShowProfileDetails(true);
    } else {
      showWebappNotification('ไม่สามารถดึงข้อมูลโปรไฟล์ได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  // ฟังก์ชันเก็บข้อมูลแชทใน localStorage
  const saveChatsToStorage = (chats: any[]) => {
    try {
      // ตรวจสอบว่า localStorage ใช้งานได้หรือไม่
      if (typeof Storage === 'undefined') {
        console.error('❌ localStorage is not supported');
        return;
      }
      
      console.log('💾 Saving chats to localStorage:', chats.length);
      console.log('📋 Chat details to save:', chats.map(chat => ({
        id: chat.id,
        otherUserName: chat.otherUser?.name || chat.otherUser?.displayName,
        messageCount: chat.messages?.length || 0
      })));
      
      localStorage.setItem('privateChats', JSON.stringify(chats));
      
      // ตรวจสอบว่าข้อมูลถูกบันทึกจริงหรือไม่
      const saved = localStorage.getItem('privateChats');
      if (saved) {
        console.log('✅ Successfully saved chats to localStorage');
      } else {
        console.error('❌ Failed to save chats to localStorage');
      }
    } catch (error) {
      console.error('❌ Error saving chats to localStorage:', error);
    }
  };

  // ฟังก์ชันโหลดข้อมูลแชทจาก localStorage
  const loadChatsFromStorage = () => {
    try {
      // ตรวจสอบว่า localStorage ใช้งานได้หรือไม่
      if (typeof Storage === 'undefined') {
        console.error('❌ localStorage is not supported');
        return [];
      }
      
      const savedChats = localStorage.getItem('privateChats');
      console.log('🔍 Raw localStorage data:', savedChats);
      
      if (savedChats) {
        const parsedChats = JSON.parse(savedChats);
        console.log('📂 Loaded chats from localStorage:', parsedChats.length);
        console.log('📋 Chat details:', parsedChats.map((chat: any) => ({
          id: chat.id,
          otherUserName: chat.otherUser?.name || chat.otherUser?.displayName,
          messageCount: chat.messages?.length || 0
        })));
        return parsedChats;
      } else {
        console.log('📭 No chats found in localStorage');
      }
    } catch (error) {
      console.error('❌ Error loading chats from localStorage:', error);
    }
    return [];
  };

  // ฟังก์ชันช่วยสร้าง user object ที่สม่ำเสมอ
  const createUserObject = (profileData: any) => {
    return {
      _id: profileData.id || profileData._id,
      id: profileData.id || profileData._id,
      name: profileData.name,
      firstName: profileData.name || profileData.firstName,
      displayName: profileData.name || profileData.displayName,
      lastName: profileData.lastName || '',
      age: profileData.age,
      location: profileData.location,
      bio: profileData.bio,
      interests: profileData.interests,
      profileImages: profileData.images || profileData.profileImages,
      isVerified: profileData.verified || (profileData as any).isVerified,
      isOnline: profileData.online || (profileData as any).isOnline || false,
      lastActive: (profileData as any).lastActive,
      membershipTier: profileData.membershipTier || profileData.membership?.tier || 'member'
    };
  };

  // ฟังก์ชันช่วยตรวจสอบแชทที่มีอยู่
  const findExistingChat = (otherUser: any) => {
    console.log('🔍 Finding existing chat for user:', otherUser);
    console.log('📋 Current chats:', privateChats.length);
    
    const existingChat = privateChats.find(chat => {
      // ใช้เฉพาะ ID ที่แน่นอนสำหรับการเปรียบเทียบ
      const chatUserId = chat.otherUser._id || chat.otherUser.id;
      const targetUserId = otherUser._id || otherUser.id;
      
      console.log('🔍 Comparing:', {
        chatUserId,
        targetUserId,
        chatUserName: chat.otherUser.name || chat.otherUser.displayName,
        targetUserName: otherUser.name || otherUser.displayName,
        isMatch: chatUserId === targetUserId
      });
      
      return chatUserId === targetUserId;
    });
    
    if (existingChat) {
      console.log('✅ Found existing chat:', existingChat.id);
    } else {
      console.log('❌ No existing chat found');
    }
    
    return existingChat;
  };

  // ฟังก์ชันทำความสะอาดแชทซ้ำ
  const removeDuplicateChats = () => {
    console.log('🧹 Starting duplicate chat cleanup...');
    console.log('📋 Current chats before cleanup:', privateChats.length);
    
    if (privateChats.length === 0) {
      console.log('📭 No chats to clean up');
      return;
    }
    
    const seen = new Set();
    const uniqueChats = privateChats.filter(chat => {
      // ใช้เฉพาะ ID สำหรับการตรวจสอบซ้ำ
      const userId = chat.otherUser._id || chat.otherUser.id;
      
      if (!userId) {
        console.log('⚠️ Chat has no user ID:', chat.id);
        return false; // ลบแชทที่ไม่มี user ID
      }
      
      if (seen.has(userId)) {
        console.log('🗑️ Removing duplicate chat:', chat.id, 'for user:', userId);
        return false;
      }
      
      seen.add(userId);
      console.log('✅ Keeping chat:', chat.id, 'for user:', userId);
      return true;
    });
    
    console.log('📋 Chats after cleanup:', uniqueChats.length);
    
    if (uniqueChats.length !== privateChats.length) {
      console.log('🧹 Cleaned up duplicate chats:', privateChats.length, '->', uniqueChats.length);
      setPrivateChats(uniqueChats);
      // บันทึกข้อมูลที่ทำความสะอาดแล้วลง localStorage
      saveChatsToStorage(uniqueChats);
    } else {
      console.log('✅ No duplicate chats found');
    }
  };

  // ฟังก์ชันจัดการแชทส่วนตัว
  const handleStartPrivateChat = async (otherUser: any) => {
    if (!user) {
      console.error('❌ ไม่มีผู้ใช้ที่เข้าสู่ระบบ');
      return;
    }
    
    // ตรวจสอบ Role ก่อนสร้างแชท
    const currentUserTier = user.membership?.tier || 'member';
    const targetUserTier = otherUser.membershipTier || 'member';
    
    if (!canCreatePrivateChat(currentUserTier, targetUserTier)) {
      console.log('🚫 Cannot start chat - Role restriction:', { currentUserTier, targetUserTier });
      setProfileAlert({ message: 'ไม่สามารถแชทกับระดับที่สูงกว่าคุณได้', type: 'warning' });
      setTimeout(() => setProfileAlert(null), 3000); // ซ่อนแจ้งเตือนหลัง 3 วินาที
      return;
    }
    
    console.log('🚀 Starting private chat with:', otherUser);
    
    // เริ่มการนับถอยหลัง
    setIsStartingChat(true);
    setChatCountdown(2);
    
    const countdownInterval = setInterval(() => {
      setChatCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownInterval);
          
          
          // ตรวจสอบว่ามีแชทกับผู้ใช้นี้อยู่แล้วหรือไม่
          console.log('🔍 Checking for existing chat with:', otherUser);
          console.log('📋 Current private chats:', privateChats.map(chat => ({
            id: chat.id,
            otherUserId: chat.otherUser._id,
            otherUserName: chat.otherUser.displayName || chat.otherUser.firstName
          })));
          
          // ทำความสะอาดแชทซ้ำก่อนตรวจสอบ
          removeDuplicateChats();
          
          // รอให้การทำความสะอาดเสร็จก่อนตรวจสอบ
          setTimeout(async () => {
            const existingChat = findExistingChat(otherUser);
            
            if (existingChat) {
              // ถ้ามีแล้ว ให้เปิดแชทที่มีอยู่
              console.log('✅ Using existing chat:', existingChat.id);
              setSelectedPrivateChat(existingChat);
            } else {
              // สร้างแชทใหม่ผ่าน API
              console.log('🆕 Creating new chat via API for user:', otherUser.name || otherUser.displayName);
              const newChat = await createPrivateChat(otherUser);
              
              if (newChat) {
                console.log('✅ New chat created successfully:', newChat.id);
                
                // เพิ่มแชทใหม่เข้าไปในรายการและลบแชทซ้ำ
                setPrivateChats(prev => {
                  const updatedChats = [newChat, ...prev];
                  const uniqueChats = removeDuplicateChatsFromArray(updatedChats);
                  console.log('📝 Updated chats array:', updatedChats.length, '->', uniqueChats.length);
                  return uniqueChats;
                });
                setSelectedPrivateChat(newChat);
              } else {
                console.error('❌ Failed to create new chat via API');
                // Fallback: สร้างแชทใน localStorage
                const fallbackChat = {
                  id: `private_${Date.now()}`,
                  otherUser: otherUser,
                  messages: [],
                  createdAt: new Date(),
                  lastMessage: null,
                  unreadCount: 0
                };
                
                setPrivateChats(prev => {
                  const updatedChats = [fallbackChat, ...prev];
                  const uniqueChats = removeDuplicateChatsFromArray(updatedChats);
                  saveChatsToStorage(uniqueChats);
                  return uniqueChats;
                });
                setSelectedPrivateChat(fallbackChat);
              }
            }
            
            // เปลี่ยนไปยังแชทส่วนตัว
            setChatType('private');
            setPrivateChatView('chat');
            handleTabChange('messages');
          }, 100);
          
          // รีเซ็ต state และปิดหน้าโปรไฟล์
          setIsStartingChat(false);
          setChatCountdown(null);
          setSelectedProfile(null);
          
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSelectPrivateChat = async (chat: any) => {
    console.log('📱 Selecting private chat:', chat);
    setSelectedPrivateChat(chat);
    setPrivateChatView('chat');
    
    // ดึงข้อความจาก API เมื่อเลือกแชท
    if (chat.id) {
      console.log('🔄 Loading messages for chat:', chat.id);
      const messages = await fetchMessages(chat.id);
      
      if (messages.length > 0) {
        console.log('✅ Loaded messages:', messages.length);
        setSelectedPrivateChat((prev: any) => ({
          ...prev,
          messages: messages
        }));
        
        // อัปเดตรายการแชทด้วยข้อความที่ดึงมา
        setPrivateChats(prev => {
          const updatedChats = prev.map(c => 
            c.id === chat.id 
              ? { ...c, messages: messages }
              : c
          );
          saveChatsToStorage(updatedChats);
          return updatedChats;
        });
      } else {
        console.log('📭 No messages found for this chat');
      }
    }
  };

  const handleBackToPrivateChatList = () => {
    setChatType('private');
    setPrivateChatView('list');
    setSelectedPrivateChat(null);
    // ไม่ต้องเรียก fetchPrivateChats() เพราะข้อมูลยังคงอยู่
    console.log('📱 Back to private chat list');
  };


  // ฟังก์ชันลบแชทส่วนตัว (ลบเฉพาะสำหรับผู้ใช้ปัจจุบัน)
  const handleDeletePrivateChat = (chatId: string) => {
    console.log('🗑️ Deleting private chat:', chatId);
    
    // ลบแชทออกจากรายการ privateChats (เฉพาะสำหรับผู้ใช้ปัจจุบัน)
    setPrivateChats(prev => {
      const updatedChats = prev.filter(chat => chat.id !== chatId);
      console.log('📝 Updated chats after deletion:', updatedChats.length);
      console.log('🔍 Deleted chat:', chatId);
      // บันทึกข้อมูลที่อัปเดตแล้วลง localStorage
      saveChatsToStorage(updatedChats);
      
      // ตรวจสอบว่าข้อมูลถูกบันทึกจริงหรือไม่
      setTimeout(() => {
        const verification = localStorage.getItem('privateChats');
        if (verification) {
          const parsed = JSON.parse(verification);
          console.log('✅ Chat deletion saved successfully, remaining chats:', parsed.length);
        } else {
          console.error('❌ Failed to save chat deletion to localStorage');
        }
      }, 100);
      
      return updatedChats;
    });
    
    // ถ้าแชทที่ลบเป็นแชทที่เลือกอยู่ ให้กลับไปที่รายการ
    if (selectedPrivateChat?.id === chatId) {
      setPrivateChatView('list');
      setSelectedPrivateChat(null);
    }
    
    console.log('✅ Private chat deleted successfully');
    
    // หมายเหตุ: ในแอปจริง คุณจะต้องส่งคำขอไปยัง backend
    // เพื่อทำเครื่องหมายว่าแชทนี้ถูกลบสำหรับผู้ใช้ปัจจุบันเท่านั้น
    console.log(`แชท ${chatId} ถูกลบสำหรับผู้ใช้ ${user?._id || user?.id}`);
  };

  // ฟังก์ชันตรวจจับการอ่านข้อความ
  const handleMessageRead = (messageId: string) => {
    if (!selectedPrivateChat || !user) return;
    
    console.log('📖 Message read:', messageId);
    
    // อัปเดตข้อความในแชทที่เลือก
    setSelectedPrivateChat((prev: any) => ({
      ...prev,
      messages: prev.messages.map((message: any) => 
        message._id === messageId 
          ? { ...message, isRead: true }
          : message
      )
    }));
    
    // อัปเดตรายการแชท
    setPrivateChats(prev => {
      const updatedChats = prev.map(chat => 
        chat.id === selectedPrivateChat.id 
          ? {
              ...chat,
              messages: chat.messages.map((message: any) => 
                message._id === messageId 
                  ? { ...message, isRead: true }
                  : message
              )
            }
          : chat
      );
      console.log('📝 Updated chats with read status:', updatedChats.length);
      console.log('🔍 Message read:', messageId);
      // บันทึกข้อมูลที่อัปเดตแล้วลง localStorage
      saveChatsToStorage(updatedChats);
      
      // ตรวจสอบว่าข้อมูลถูกบันทึกจริงหรือไม่
      setTimeout(() => {
        const verification = localStorage.getItem('privateChats');
        if (verification) {
          const parsed = JSON.parse(verification);
          console.log('✅ Read status saved successfully, total chats:', parsed.length);
        } else {
          console.error('❌ Failed to save read status to localStorage');
        }
      }, 100);
      
      return updatedChats;
    });
    
    console.log('✅ Message read status updated');
    
    // Message read status updated - real-time sync will be implemented
  };


  const handleSendPrivateMessage = async (content: string, file?: File, socketMessage?: any, messageType?: string) => {
    if (!selectedPrivateChat || !user) return;
    
    console.log('📤 handleSendPrivateMessage called:', {
      content,
      hasFile: !!file,
      hasSocketMessage: !!socketMessage,
      messageType,
      selectedPrivateChat: selectedPrivateChat,
      chatId: selectedPrivateChat.id
    });
    
    // ถ้าเป็นข้อความชั่วคราว (temp-message) ให้แสดงใน UI ทันที
    if (messageType === 'temp-message' && socketMessage) {
      console.log('📨 Received temporary message:', socketMessage);
      
      // อัปเดตแชทที่เลือกด้วยข้อความชั่วคราว
      setSelectedPrivateChat((prev: any) => ({
        ...prev,
        messages: [...(prev.messages || []), socketMessage],
        lastMessage: socketMessage
      }));
      
      // อัปเดตรายการแชทด้วยข้อความชั่วคราว
      setPrivateChats(prev => {
        const updatedChats = prev.map(chat => 
          chat.id === selectedPrivateChat.id 
            ? { ...chat, messages: [...(chat.messages || []), socketMessage], lastMessage: socketMessage }
            : chat
        );
        saveChatsToStorage(updatedChats);
        return updatedChats;
      });
      
      return; // ไม่ต้องส่งไปยัง API เพราะเป็นข้อความชั่วคราว
    }
    
    // ถ้าเป็นข้อความของตัวเองจาก Socket.IO ให้แทนที่ข้อความชั่วคราว
    if (socketMessage && messageType === 'own-message') {
      console.log('📨 Received own message from Socket.IO:', socketMessage);
      
      // อัปเดตแชทที่เลือกด้วยข้อความจริงแทนที่ข้อความชั่วคราว
      setSelectedPrivateChat((prev: any) => {
        const updatedMessages = prev.messages?.map((msg: any) => {
          // หาข้อความชั่วคราวที่มีเนื้อหาเดียวกันและเป็นของตัวเอง
          if (msg.isTemporary && 
              msg.content === socketMessage.content && 
              msg.senderId === socketMessage.senderId) {
            console.log('📨 Replacing temporary message with real message');
            return socketMessage; // แทนที่ข้อความชั่วคราวด้วยข้อความจริง
          }
          return msg;
        }) || [];
        
        return {
          ...prev,
          messages: updatedMessages,
          lastMessage: socketMessage
        };
      });
      
      // อัปเดตรายการแชทด้วยข้อความจริง
      setPrivateChats(prev => {
        const updatedChats = prev.map(chat => {
          if (chat.id === selectedPrivateChat.id) {
            const updatedMessages = chat.messages?.map((msg: any) => {
              // หาข้อความชั่วคราวที่มีเนื้อหาเดียวกันและเป็นของตัวเอง
              if (msg.isTemporary && 
                  msg.content === socketMessage.content && 
                  msg.senderId === socketMessage.senderId) {
                return socketMessage; // แทนที่ข้อความชั่วคราวด้วยข้อความจริง
              }
              return msg;
            }) || [];
            
            return { ...chat, messages: updatedMessages, lastMessage: socketMessage };
          }
          return chat;
        });
        saveChatsToStorage(updatedChats);
        return updatedChats;
      });
      
      return; // ไม่ต้องส่งไปยัง API เพราะส่งผ่าน Socket.IO แล้ว
    }
    
    // ถ้าเป็นข้อความจาก Socket.IO ให้ใช้ข้อมูลจาก Socket.IO
    if (socketMessage && messageType === 'socket-message') {
      console.log('📨 Received message from Socket.IO:', socketMessage);
      
      // ตรวจสอบว่าข้อความนี้มีอยู่แล้วหรือไม่ (เพื่อป้องกัน duplicate)
      const messageExists = selectedPrivateChat.messages?.some((msg: any) => 
        msg._id === socketMessage._id || 
        (msg.content === socketMessage.content && 
         msg.senderId === socketMessage.senderId && 
         Math.abs(new Date(msg.timestamp).getTime() - new Date(socketMessage.timestamp).getTime()) < 1000)
      );
      
      if (messageExists) {
        console.log('📨 Message already exists, skipping duplicate');
        return;
      }
      
      // อัปเดตแชทที่เลือกด้วยข้อความจาก Socket.IO
      setSelectedPrivateChat((prev: any) => ({
        ...prev,
        messages: [...(prev.messages || []), socketMessage],
        lastMessage: socketMessage
      }));
      
      // อัปเดตรายการแชทด้วยข้อความจาก Socket.IO
      setPrivateChats(prev => {
        const updatedChats = prev.map(chat => 
          chat.id === selectedPrivateChat.id 
            ? { ...chat, messages: [...(chat.messages || []), socketMessage], lastMessage: socketMessage }
            : chat
        );
        saveChatsToStorage(updatedChats);
        return updatedChats;
      });
      
      return; // ไม่ต้องส่งไปยัง API เพราะส่งผ่าน Socket.IO แล้ว
    }
    
    // สร้างข้อความใหม่สำหรับการส่งผ่าน API
    const newMessage = {
      _id: `msg_${Date.now()}`,
      content: content,
      senderId: user._id || user.id,
      timestamp: new Date(),
      fileUrl: file ? URL.createObjectURL(file) : null,
      fileType: file ? file.type : null,
      isRead: false,
      isDelivered: true // ส่งสำเร็จแล้ว
    };
    
    console.log('💬 Sending private message via API:', newMessage);
    console.log('🔍 Selected chat:', selectedPrivateChat.id);
    
    // อัปเดตแชทที่เลือก
    setSelectedPrivateChat((prev: any) => ({
      ...prev,
      messages: [...(prev.messages || []), newMessage],
      lastMessage: newMessage
    }));
    
    // อัปเดตรายการแชท
    setPrivateChats(prev => {
      const updatedChats = prev.map(chat => 
        chat.id === selectedPrivateChat.id 
          ? { ...chat, messages: [...(chat.messages || []), newMessage], lastMessage: newMessage }
          : chat
      );
      console.log('📝 Updated chats with new message:', updatedChats.length);
      console.log('🔍 Message added to chat:', selectedPrivateChat.id);
      // บันทึกข้อมูลที่อัปเดตแล้วลง localStorage
      saveChatsToStorage(updatedChats);
      
      // ตรวจสอบว่าข้อมูลถูกบันทึกจริงหรือไม่
      setTimeout(() => {
        const verification = localStorage.getItem('privateChats');
        if (verification) {
          const parsed = JSON.parse(verification);
          console.log('✅ Message saved successfully, total chats:', parsed.length);
        } else {
          console.error('❌ Failed to save message to localStorage');
        }
      }, 100);
      
      return updatedChats;
    });
    
    // ส่งข้อความไปยัง backend ผ่าน API
    try {
      const token = sessionStorage.getItem('token');
      
      if (!token) {
        console.error('❌ No token found for sending message');
        return;
      }

      // ส่งข้อความผ่าน API
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: content,
          senderId: user._id || user.id,
          chatRoomId: selectedPrivateChat.id,
          messageType: 'text'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Message sent to backend successfully:', result);
      
      // อัปเดตข้อความด้วย ID จาก backend และข้อมูล sender ที่ถูกต้อง
      if (result.success && result.data) {
        const updatedMessage = {
          ...newMessage,
          _id: result.data._id,
          isDelivered: true,
          senderId: user._id || user.id, // ตรวจสอบให้แน่ใจว่า senderId ถูกต้อง
          sender: result.data.sender || {
            _id: user._id || user.id,
            username: (user as any).username,
            displayName: user.displayName || user.firstName
          }
        };
        
        setSelectedPrivateChat((prev: any) => ({
          ...prev,
          messages: prev.messages.map((msg: any) => 
            msg._id === newMessage._id 
              ? updatedMessage
              : msg
          )
        }));
        
        setPrivateChats(prev => {
          const updatedChats = prev.map(chat => 
            chat.id === selectedPrivateChat.id 
              ? {
                  ...chat, 
                  messages: chat.messages.map((msg: any) => 
                    msg._id === newMessage._id 
                      ? updatedMessage
                      : msg
                  ),
                  lastMessage: updatedMessage
                }
              : chat
          );
          saveChatsToStorage(updatedChats);
          return updatedChats;
        });
        
        console.log('✅ Message updated with correct sender info:', updatedMessage);
      }
      
    } catch (error) {
      console.error('❌ Error sending message to backend:', error);
      // แสดงข้อความว่าไม่สามารถส่งได้
      setSelectedPrivateChat((prev: any) => ({
        ...prev,
        messages: prev.messages.map((msg: any) => 
          msg._id === newMessage._id 
            ? { ...msg, isDelivered: false, error: true }
            : msg
        )
      }));
    }
  };

  const handleCreatePrivateRoom = async (roomData: any) => {
    console.log('🏠 Creating private room:', roomData);
    // Room creation logic - will be implemented with backend integration
    showWebappNotification('สร้างห้องส่วนตัวสำเร็จ!', 'success');
    
    // รีเฟรชรายการห้องแชทหลังจากสร้างห้องใหม่
    setChatView('list');
    setSelectedRoomId(null);
  };

  // ฟัง event เมื่อมีการตั้งรูปโปรไฟล์ใหม่ เพื่อรีโหลด avatar ใน header
  useEffect(() => {
    const handler = () => {
      // Trigger a reload of avatar
      if (user?._id) {
        // reuse loader without duplicating code by toggling state
        (async () => {
          try {
            const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
            const userId = user._id || user.id;
            const res = await fetch(`${base}/api/profile/${userId}`, {
              headers: {
                'Content-Type': 'application/json',
                ...(sessionStorage.getItem('token') ? { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` } : {})
              }
            })
            if (res.ok) {
              const data = await res.json()
              const img = data?.data?.profile?.profileImages?.[0]
              if (img) {
                setAvatarUrl(img)
                return
              }
            }
          } catch (_) {}
          setAvatarUrl(null)
        })()
      }
    }
    window.addEventListener('profile-avatar-updated', handler)
    return () => window.removeEventListener('profile-avatar-updated', handler)
  }, [user])

  // ฟัง event เมื่อมีการเปลี่ยนแปลงสถานะการกดไลค์
  useEffect(() => {
    const handler = (event: any) => {
      const { profileId, isLiked } = event.detail;
      
      // อัปเดตสถานะการกดไลค์ในหน้า Discover
      setLikedProfiles(prev => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.add(profileId);
        } else {
          newSet.delete(profileId);
        }
        return newSet;
      });

      // อัปเดตจำนวนการกดไลค์ในหน้า Discover
      setAllUsers(prevUsers => {
        return prevUsers.map(user => {
          if (user._id === profileId) {
            // ใช้ข้อมูลจาก event แทนการคำนวณเอง
            return {
              ...user,
              likeCount: event.detail.likeCount
            };
          }
          return user;
        });
      });
    };
    
    window.addEventListener('like-status-changed', handler);
    return () => window.removeEventListener('like-status-changed', handler);
  }, []);
  
  const handleLoginSuccess = (data: any) => {
    console.log('🎉 Login Success:', data);
    // data includes { user, token }; pass through so token is preserved
    login(data)
    setIsAuthenticated(true)
    setShowLoginDialog(false)
    console.log('✅ User authenticated and login dialog closed');
  }
  
  const handleLogout = () => {
    logout()
    setIsAuthenticated(false)
  }
  
  const openProfileModal = (profile: FeaturedProfile) => {
    setSelectedProfile(profile)
    setActiveImageIndex(0)
    setShowProfileModal(true)
  }
  
  // Payment flow handlers
  const handleNavigateToPayment = (plan: any) => {
    setSelectedPlan(plan)
    setCurrentView('payment')
  }
  
  const handlePaymentSuccess = async (transactionData: any) => {
    setTransactionData(transactionData)
    setCurrentView('success')
    // Call actual upgrade API
    try {
      await membershipAPI.upgradeMembership({
        userId: user._id || user.id,
        tier: transactionData.tier,
        paymentMethod: transactionData.paymentMethod,
        transactionId: transactionData.transactionId,
        amount: transactionData.amount,
        currency: transactionData.currency
      })
    } catch (error) {
      console.error('Error upgrading membership:', error)
    }
  }
  
  const handleBackToMain = () => {
    setCurrentView('main')
    setSelectedPlan(null)
    setTransactionData(null)
    handleTabChange('membership') // กลับไปที่ membership tab
  }

  // ฟังก์ชันกลับหน้าหลัก (Home)
  const handleGoToHome = () => {
    setCurrentView('main')
    setSelectedPlan(null)
    setTransactionData(null)
    handleTabChange('discover') // กลับไปที่ discover tab (หน้าค้นหา)
    setChatType('public')
    setChatView('list')
    setPrivateChatView('list')
    setSelectedRoomId(null)
    setSelectedPrivateChat(null)
  }
  
  // Set up global payment navigation
  useEffect(() => {
    ;(window as any).navigateToPayment = handleNavigateToPayment
    const handlePaymentEvent = (event: any) => {
      handleNavigateToPayment(event.detail.plan)
    }
    window.addEventListener('navigateToPayment', handlePaymentEvent)
    return () => {
      window.removeEventListener('navigateToPayment', handlePaymentEvent)
      delete (window as any).navigateToPayment
    }
  }, [])

  // Set up global profile modal function
  useEffect(() => {
    ;(window as any).openProfileModal = openProfileModal
    return () => {
      delete (window as any).openProfileModal
    }
  }, [openProfileModal])
  
  // Chat handlers
  const handleSelectRoom = (roomId: string) => {
    setSelectedRoomId(roomId)
    setChatView('chat')
  }
  
  const handleBackToRoomList = () => {
    setChatView('list')
    setSelectedRoomId(null)
  }
  

  
  // Show maintenance mode if active (always show if maintenance is on, regardless of dev access)
  // But allow bypass if user has bypassMaintenance flag
  if (maintenanceChecked && isMaintenanceMode && !bypassMaintenance) {
    return <MaintenanceMode onDevAccess={handleDevAccess} hasDevAccess={hasDevAccess} />
  }

  // Show loading while checking maintenance mode
  if (!maintenanceChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <h1 className="text-xl font-bold text-slate-800">กำลังตรวจสอบสถานะระบบ...</h1>
        </div>
      </div>
    )
  }

  // Render different views based on current state
  if (currentView === 'payment' && selectedPlan) {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="h-32 w-32" /></div>}>
        <PaymentWithAnimation
          plan={selectedPlan}
          onBack={handleBackToMain}
          onSuccess={handlePaymentSuccess}
          onCancel={handleBackToMain}
        />
      </Suspense>
    )
  }
  
  if (currentView === 'success' && transactionData && selectedPlan) {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="h-32 w-32" /></div>}>
        <PaymentSuccess
          transactionData={transactionData}
          plan={selectedPlan}
          onContinue={handleBackToMain}
        />
      </Suspense>
    )
  }
  
  return (
    <div className="min-h-screen relative overflow-hidden pt-12 sm:pt-16 pb-16 sm:pb-20">
      {/* Mobile-Optimized Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-4 w-48 h-48 sm:top-20 sm:left-10 sm:w-96 sm:h-96 bg-gradient-to-br from-pink-300/20 to-violet-300/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-8 w-40 h-40 sm:top-60 sm:right-20 sm:w-80 sm:h-80 bg-gradient-to-br from-blue-300/15 to-cyan-300/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/4 w-36 h-36 sm:bottom-32 sm:left-1/4 sm:w-72 sm:h-72 bg-gradient-to-br from-orange-300/20 to-pink-300/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
        <div className="absolute bottom-40 right-1/3 w-32 h-32 sm:bottom-60 sm:right-1/3 sm:w-64 sm:h-64 bg-gradient-to-br from-purple-300/25 to-indigo-300/25 rounded-full blur-3xl animate-pulse delay-3000"></div>
      </div>
      {/* Mobile-Optimized Floating Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 text-2xl sm:text-4xl opacity-20 animate-float">✨</div>
        <div className="absolute top-1/3 right-1/4 text-3xl sm:text-5xl opacity-15 animate-float delay-1000">💫</div>
        <div className="absolute bottom-1/3 left-1/3 text-4xl sm:text-6xl opacity-10 animate-float delay-2000">🌟</div>
        <div className="absolute bottom-1/4 right-1/3 text-2xl sm:text-3xl opacity-25 animate-float delay-3000">💖</div>
        <div className="absolute top-1/2 left-1/6 text-2xl sm:text-4xl opacity-20 animate-float delay-4000">🎉</div>
        <div className="absolute top-3/4 right-1/6 text-3xl sm:text-5xl opacity-15 animate-float delay-5000">🌈</div>
      </div>
      
      {/* Mobile-First Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-lg">
        <div className="px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-12 sm:h-16">
            {/* Logo - Mobile Optimized */}
            <button 
              onClick={handleGoToHome}
              className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-pink-500 via-rose-500 to-violet-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg heart-beat">
                <Heart className="h-4 w-4 sm:h-6 sm:w-6 text-white" fill="white" />
              </div>
              <div className="hidden sm:block">
                <span className="text-xl sm:text-2xl font-bold gradient-text">sodeclick</span>
                <div className="text-xs text-gray-600 -mt-1">Find Your Love ✨</div>
              </div>
              <div className="sm:hidden">
                <span className="text-lg font-bold gradient-text">sodeclick</span>
              </div>
            </button>
            
            {/* Mobile User Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {!isAuthenticated ? (
                <>
                  {/* Mobile Login Button */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowLoginDialog(true)}
                    className="md:hidden border-pink-300 text-pink-600 hover:bg-pink-50 hover:border-pink-400 transition-colors"
                  >
                    เข้าสู่ระบบ
                  </Button>
                  
                  {/* Desktop Login Button */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      console.log('🖥️ Desktop Login Button Clicked');
                      setShowLoginDialog(true);
                    }}
                    className="hidden md:flex border-pink-300 text-pink-600 hover:bg-pink-50 hover:border-pink-400 transition-colors"
                  >
                    เข้าสู่ระบบ
                  </Button>
                </>
              ) : (
                <div className="flex items-center space-x-2 sm:space-x-4">
                  {/* Desktop: Show full user info */}
                  <div className="hidden sm:flex items-center space-x-1 sm:space-x-2">
                    <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
                      <AvatarImage src={avatarUrl || undefined} alt="profile" />
                      <AvatarFallback className="text-xs sm:text-sm">{user?.firstName?.[0] || user?.username?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-gray-700">สวัสดี, {user?.displayName || user?.firstName}</span>
                  </div>
                  
                  {/* Mobile: Show profile icon with user info and dropdown */}
                  <div className="sm:hidden relative profile-dropdown-container">
                    <Button 
                      variant="ghost" 
                      className="flex items-center space-x-2 px-2 py-1 rounded-lg hover:bg-gray-50"
                      onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={avatarUrl || undefined} alt="profile" />
                        <AvatarFallback className="text-xs">{user?.firstName?.[0] || user?.username?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-gray-900">{user?.firstName}</span>
                    </Button>
                    
                    {/* Dropdown Menu */}
                    {showProfileDropdown && (
                      <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[160px] z-50">
                        <div className="px-3 py-2 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900">{user?.displayName || user?.firstName}</p>
                          <p className="text-xs text-gray-500">{user?.email}</p>
                        </div>
                        
                        {(user?.role === 'admin' || user?.role === 'superadmin') && (
                          <button
                            onClick={() => {
                              window.location.href = '/admin'
                              setShowProfileDropdown(false)
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center"
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Admin
                          </button>
                        )}
                        
                        <button
                          onClick={() => {
                            handleLogout()
                            setShowProfileDropdown(false)
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                        >
                          <LogIn className="h-4 w-4 mr-2" />
                          ออกจากระบบ
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Desktop: Show admin and logout buttons */}
                  <div className="flex items-center space-x-2">
                    {/* Desktop Notification Bell Button */}
                    <div className="relative notification-dropdown-container">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                        className="relative p-2 hover:bg-gray-50 transition-colors"
                      >
                        <FontAwesomeIcon 
                          icon={faBell} 
                          className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 hover:text-pink-600 transition-colors" 
                        />
                        {/* Notification Badge - Show only when there are unread notifications */}
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                            {unreadCount}
                          </span>
                        )}
                      </Button>
                      
                      {/* Desktop Notification Dropdown */}
                      {showNotificationDropdown && (
                        <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[280px] sm:min-w-[320px] z-50 max-h-96 overflow-y-auto">
                          <div className="px-4 py-2 border-b border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-900">การแจ้งเตือน</h3>
                          </div>
                          
                          {/* Real-time Notifications */}
                          {isLoadingNotifications ? (
                            <div className="px-4 py-8 text-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-600 mx-auto"></div>
                              <p className="text-xs text-gray-500 mt-2">กำลังโหลด...</p>
                            </div>
                          ) : notifications.length > 0 ? (
                            notifications.map(renderNotificationItem)
                          ) : (
                            <div className="px-4 py-8 text-center">
                              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <FontAwesomeIcon icon={faBell} className="h-6 w-6 text-gray-400" />
                              </div>
                              <p className="text-sm text-gray-500">ยังไม่มีการแจ้งเตือน</p>
                            </div>
                          )}
                          
                          {notifications.length > 0 && (
                            <div className="px-4 py-2 border-t border-gray-100">
                              <button 
                                onClick={fetchNotifications}
                                className="w-full text-center text-sm text-pink-600 hover:text-pink-700 font-medium"
                              >
                                รีเฟรช
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {(user?.role === 'admin' || user?.role === 'superadmin') && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.location.href = '/admin'}
                        className="hidden sm:flex text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Admin
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleLogout} 
                      className="hidden sm:flex border-pink-200 text-pink-600 hover:bg-pink-50 hover:border-pink-300 transition-colors"
                    >
                      ออกจากระบบ
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      {/* Mobile-First Hero Section */}
      <section className="py-8 sm:py-12 md:py-16 lg:py-24">
        <div className="px-3 sm:px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div className="space-y-6 sm:space-y-8">
              <div className="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 rounded-full glass-effect border border-white/30 text-pink-600 text-xs sm:text-sm font-semibold shadow-lg">
                <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span>Thailand's #1 Dating Platform 🇹🇭</span>
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight mb-4 sm:mb-6 md:mb-8 gradient-text">
                  Find Your<br />
                  Perfect Match ✨
                </h1>
                <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 md:mb-10 leading-relaxed max-w-lg">
                  Join thousands of verified singles creating meaningful connections. Your love story starts here.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <Button 
                  size="lg" 
                  onClick={() => handleTabChange('matches')}
                  className="modern-button text-sm sm:text-base md:text-lg px-6 py-4 sm:px-8 sm:py-5 md:px-10 md:py-6 rounded-xl sm:rounded-2xl font-bold shadow-2xl hover:shadow-pink-300/50 hover:scale-105 transform transition-all duration-300"
                >
                  <Heart className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mr-2 sm:mr-3" fill="white" />
                  Start Dating Now
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={handleLearnMoreClick}
                  className="border-2 border-pink-300/50 text-pink-600 hover:bg-pink-50/80 px-6 py-4 sm:px-8 sm:py-5 md:px-10 md:py-6 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base md:text-lg transition-all duration-300 hover:scale-105 glass-effect"
                >
                  <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mr-2 sm:mr-3" />
                  Learn More
                </Button>
              </div>
            </div>
            {/* 
              สลับรูป user ที่ถูกโหวตเยอะที่สุดแบบเรียลไทม์ 
              - แสดง 2 อันดับแรก (top 2 voted)
              - ถ้ามีการเปลี่ยนแปลงอันดับ เรียลไทม์จะอัปเดตทันที
            */}
            <div className="relative hidden sm:flex justify-center lg:justify-end items-center">
              <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] md:w-[340px] md:h-[340px]">
                {topVotedProfiles.slice(0, 2).map((profile, idx) => (
                  <div
                    key={profile.id}
                    className={
                      "absolute " +
                      (idx === 0
                        ? "top-0 right-0 z-20 rotate-3"
                        : "bottom-0 left-4 sm:left-8 z-10 -rotate-3 border-2 sm:border-4 border-white") +
                      " w-48 h-60 sm:w-56 sm:h-70 md:w-64 md:h-80 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl transition-all duration-700"
                    }
                    style={{
                      // เพิ่ม transition effect เวลาสลับ
                      transition: "all 0.7s cubic-bezier(.4,2,.6,1)",
                    }}
                  >
                    {profile.images?.[0] ? (
                      <img
                        src={profile.images[0]}
                        alt={profile.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : null}
                    {/* Mobile-First Badge โหวต */}
                    <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 bg-white/80 px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs font-medium text-pink-600 shadow">
                      ❤️ {(profile as any).voteCount ?? 0} votes
                    </div>
                    {/* Mobile-First ปุ่มแชท */}
                    <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="rounded-full bg-white/80 hover:bg-white text-pink-600 hover:text-pink-700 h-6 w-6 sm:h-8 sm:w-8 shadow"
                        onClick={(e: any) => {
                          e.preventDefault();
                          e.stopPropagation();
                          
                          const token = sessionStorage.getItem('token');
                          if (!token) {
                            showWebappNotification('กรุณาเข้าสู่ระบบก่อน')
                            return
                          }
                          
                          // เริ่มแชทส่วนตัว (สร้าง user object จาก profile)
                          const userForChat = createUserObject(profile);
                          handleStartPrivateChat(userForChat)
                        }}
                      >
                        <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Mobile-First App Interface */}
      <section className="px-1 sm:px-4 lg:px-8 py-1 sm:py-16 md:py-20 relative z-10 pb-10 sm:pb-24">
        <div className="modern-card rounded-xl sm:rounded-3xl shadow-2xl overflow-hidden">
          <Tabs defaultValue="discover" value={activeTab} onValueChange={handleTabChange}>
            {/* Discover Tab - Mobile First */}
            <TabsContent value="discover" className="p-1 sm:p-6 lg:p-8">
              {/* Mobile-First Advanced Filters Section */}
              <div className="mb-3 sm:mb-8 modern-card rounded-xl sm:rounded-3xl shadow-2xl border border-white/30 overflow-hidden backdrop-blur-lg">
                {/* Mobile-First Filter Header */}
                <div className="bg-gradient-to-br from-pink-50/90 via-violet-50/90 to-blue-50/90 backdrop-blur-xl p-2 sm:p-6 lg:p-8 border-b border-white/30">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="relative">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-pink-500 via-rose-500 to-violet-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl transform rotate-3 hover:rotate-6 transition-all duration-300">
                          <Filter className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-white" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse"></div>
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-pink-600 via-rose-600 to-violet-600 bg-clip-text text-transparent">
                          ตัวกรองขั้นสูง ✨
                        </h3>
                        <p className="text-sm sm:text-base text-gray-600 mt-1 font-medium">ค้นหาคู่แท้ของคุณด้วยฟิลเตอร์ที่ตรงใจ 💕</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFiltersOpen(v => !v)}
                      className="flex items-center gap-2 sm:gap-3 hover:bg-white/60 transition-all duration-300 rounded-xl sm:rounded-2xl px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 text-gray-700 font-semibold border-2 border-transparent hover:border-pink-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base lg:text-lg"
                    >
                      <span>{filtersOpen ? '🔼 ซ่อน' : '🔽 เปิด'}</span>
                      <ChevronRight className={`h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 transition-all duration-500 ${filtersOpen ? 'rotate-90 text-pink-600' : 'text-gray-500'}`} />
                    </Button>
                  </div>
                </div>
                {filtersOpen && (
                  <div className="p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-sm border-t border-white/50">
                    <div className="space-y-6 sm:space-y-8 lg:space-y-10">
                      {/* Mobile-First Basic Filters */}
                      <div className="relative">
                        <div className="absolute -left-2 sm:-left-4 top-0 w-1 h-full bg-gradient-to-b from-pink-500 to-violet-500 rounded-full"></div>
                        <h4 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3 pl-3 sm:pl-4">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                            <User className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-white" />
                          </div>
                          <span className="text-sm sm:text-base lg:text-lg">ข้อมูลพื้นฐาน</span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 pl-3 sm:pl-4">
                          <div className="space-y-2 sm:space-y-3">
                            <label className="text-xs sm:text-sm font-bold text-gray-700 flex items-center gap-1 sm:gap-2">
                              <span className="text-pink-500 text-sm sm:text-lg">👥</span>
                              <span>เพศ</span>
                            </label>
                            <select
                              value={filters.gender}
                              onChange={e => setFilters(f => ({...f, gender: e.target.value}))}
                              className="w-full p-3 sm:p-4 border-2 border-gray-200 rounded-xl sm:rounded-2xl bg-white/90 backdrop-blur-sm focus:ring-4 focus:ring-pink-500/20 focus:border-pink-500 transition-all duration-300 shadow-lg hover:shadow-xl text-gray-700 font-medium text-sm sm:text-base"
                            >
                              <option value="">✨ ทั้งหมด</option>
                              <option value="male">👨 ชาย</option>
                              <option value="female">👩 หญิง</option>
                              <option value="other">🌈 อื่นๆ</option>
                            </select>
                          </div>
                          <div className="space-y-2 sm:space-y-3">
                            <label className="text-xs sm:text-sm font-bold text-gray-700 flex items-center gap-1 sm:gap-2">
                              <span className="text-violet-500 text-sm sm:text-lg">🔍</span>
                              <span>กำลังมองหา</span>
                            </label>
                            <select
                              value={filters.lookingFor}
                              onChange={e => setFilters(f => ({...f, lookingFor: e.target.value}))}
                              className="w-full p-3 sm:p-4 border-2 border-gray-200 rounded-xl sm:rounded-2xl bg-white/90 backdrop-blur-sm focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all duration-300 shadow-lg hover:shadow-xl text-gray-700 font-medium text-sm sm:text-base"
                            >
                              <option value="">✨ ทั้งหมด</option>
                              <option value="male">👨 ชาย</option>
                              <option value="female">👩 หญิง</option>
                              <option value="both">💕 ทั้งคู่</option>
                            </select>
                          </div>
                          <div className="space-y-2 sm:space-y-3">
                            <label className="text-xs sm:text-sm font-bold text-gray-700 flex items-center gap-1 sm:gap-2">
                              <span className="text-green-500 text-sm sm:text-lg">📍</span>
                              <span>จังหวัด</span>
                            </label>
                            <select
                              value={filters.province}
                              onChange={e => setFilters(f => ({...f, province: e.target.value}))}
                              className="w-full p-3 sm:p-4 border-2 border-gray-200 rounded-xl sm:rounded-2xl bg-white/90 backdrop-blur-sm focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all duration-300 shadow-lg hover:shadow-xl text-gray-700 font-medium text-sm sm:text-base"
                            >
                              <option value="">🗺️ ทุกจังหวัด</option>
                              {[
                                'กระบี่','กรุงเทพมหานคร','กาญจนบุรี','กาฬสินธุ์','กำแพงเพชร','ขอนแก่น','จันทบุรี','ฉะเชิงเทรา','ชลบุรี','ชัยนาท','ชัยภูมิ','ชุมพร','เชียงราย','เชียงใหม่','ตรัง','ตราด','ตาก','นครนายก','นครปฐม','นครพนม','นครราชสีมา','นครศรีธรรมราช','นครสวรรค์','นนทบุรี','นราธิวาส','น่าน','บึงกาฬ','บุรีรัมย์','ปทุมธานี','ประจวบคีรีขันธ์','ปราจีนบุรี','ปัตตานี','พระนครศรีอยุธยา','พะเยา','พังงา','พัทลุง','พิจิตร','พิษณุโลก','เพชรบุรี','เพชรบูรณ์','แพร่','ภูเก็ต','มหาสารคาม','มุกดาหาร','แม่ฮ่องสอน','ยโสธร','ยะลา','ร้อยเอ็ด','ระนอง','ระยอง','ราชบุรี','ลพบุรี','ลำปาง','ลำพูน','ศรีสะเกษ','สกลนคร','สงขลา','สตูล','สมุทรปราการ','สมุทรสงคราม','สมุทรสาคร','สระแก้ว','สระบุรี','สิงห์บุรี','สุโขทัย','สุพรรณบุรี','สุราษฎร์ธานี','สุรินทร์','หนองคาย','หนองบัวลำภู','อ่างทอง','อำนาจเจริญ','อุดรธานี','อุตรดิตถ์','อุทัยธานี','อุบลราชธานี'
                              ].sort((a,b)=>a.localeCompare(b,'th')).map(p => (
                                <option key={p} value={p}>📍 {p}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Age Range */}
                      <div className="relative">
                        <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-orange-500 to-red-500 rounded-full"></div>
                        <h4 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3 pl-4">
                          <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-white" />
                          </div>
                          ช่วงอายุ
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pl-4">
                          <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                              <span className="text-orange-500 text-lg">🎂</span>
                              อายุต่ำสุด
                            </label>
                            <input
                              type="number"
                              min={18}
                              max={100}
                              value={filters.ageMin}
                              onChange={e => setFilters(f => ({...f, ageMin: Number(e.target.value)}))}
                              className="w-full p-4 border-2 border-gray-200 rounded-2xl bg-white/90 backdrop-blur-sm focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-300 shadow-lg hover:shadow-xl text-gray-700 font-medium"
                              placeholder="18 ปี"
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                              <span className="text-red-500 text-lg">🎉</span>
                              อายุมากสุด
                            </label>
                            <input
                              type="number"
                              min={18}
                              max={100}
                              value={filters.ageMax}
                              onChange={e => setFilters(f => ({...f, ageMax: Number(e.target.value)}))}
                              className="w-full p-4 border-2 border-gray-200 rounded-2xl bg-white/90 backdrop-blur-sm focus:ring-4 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300 shadow-lg hover:shadow-xl text-gray-700 font-medium"
                              placeholder="100 ปี"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Relationship & Distance */}
                      <div className="relative">
                        <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-pink-500 to-purple-500 rounded-full"></div>
                        <h4 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3 pl-4">
                          <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl flex items-center justify-center">
                            <Heart className="h-5 w-5 text-white" />
                          </div>
                          ความสัมพันธ์ & ระยะทาง
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pl-4">
                          <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                              <span className="text-pink-500 text-lg">💕</span>
                              ความสัมพันธ์ที่ต้องการ
                            </label>
                            <select
                              value={filters.relationship}
                              onChange={e => setFilters(f => ({...f, relationship: e.target.value}))}
                              className="w-full p-4 border-2 border-gray-200 rounded-2xl bg-white/90 backdrop-blur-sm focus:ring-4 focus:ring-pink-500/20 focus:border-pink-500 transition-all duration-300 shadow-lg hover:shadow-xl text-gray-700 font-medium"
                            >
                              <option value="">💫 เลือกประเภทความสัมพันธ์</option>
                              <option value="fwd">🎯 FWD</option>
                              <option value="overnight">🌙 ค้างคืน</option>
                              <option value="temporary">⏰ ชั่วคราว</option>
                              <option value="other">✨ อื่นๆ</option>
                            </select>
                          </div>
                          {filters.relationship === 'other' && (
                            <div className="space-y-3">
                              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <span className="text-purple-500 text-lg">💭</span>
                                ระบุความสัมพันธ์ที่ต้องการ
                              </label>
                              <input
                                value={filters.otherRelationship || ''}
                                onChange={e => setFilters(f => ({...f, otherRelationship: e.target.value}))}
                                className="w-full p-4 border-2 border-gray-200 rounded-2xl bg-white/90 backdrop-blur-sm focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-300 shadow-lg hover:shadow-xl text-gray-700 font-medium"
                                placeholder="💬 ระบุความสัมพันธ์ที่ต้องการ..."
                              />
                            </div>
                          )}
                          <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                              <span className="text-blue-500 text-lg">📏</span>
                              ระยะทาง (กิโลเมตร)
                            </label>
                            <input
                              type="number"
                              value={filters.distanceKm}
                              onChange={e => setFilters(f => ({...f, distanceKm: e.target.value}))}
                              className="w-full p-4 border-2 border-gray-200 rounded-2xl bg-white/90 backdrop-blur-sm focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 shadow-lg hover:shadow-xl text-gray-700 font-medium"
                              placeholder="🎯 เช่น 50 กม."
                            />
                          </div>
                        </div>
                      </div>

                      {/* Location Coordinates */}
                      <div className="relative">
                        <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-cyan-500 to-teal-500 rounded-full"></div>
                        <h4 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3 pl-4">
                          <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center">
                            <MapPin className="h-5 w-5 text-white" />
                          </div>
                          พิกัดตำแหน่ง
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pl-4">
                          <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                              <span className="text-cyan-500 text-lg">🌐</span>
                              ละติจูด (Latitude)
                            </label>
                            <input
                              value={filters.lat}
                              onChange={e => setFilters(f => ({...f, lat: e.target.value}))}
                              className="w-full p-4 border-2 border-gray-200 rounded-2xl bg-white/90 backdrop-blur-sm focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-300 shadow-lg hover:shadow-xl text-gray-700 font-medium"
                              placeholder="🗺️ เช่น 13.7563"
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                              <span className="text-teal-500 text-lg">🗺️</span>
                              ลองจิจูด (Longitude)
                            </label>
                            <input
                              value={filters.lng}
                              onChange={e => setFilters(f => ({...f, lng: e.target.value}))}
                              className="w-full p-4 border-2 border-gray-200 rounded-2xl bg-white/90 backdrop-blur-sm focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-300 shadow-lg hover:shadow-xl text-gray-700 font-medium"
                              placeholder="📍 เช่น 100.5018"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-6 justify-center pt-8 border-t-2 border-gradient-to-r from-pink-200 to-violet-200">
                        <Button
                          variant="outline"
                          onClick={() => {
                            // Use browser location
                            if (navigator.geolocation) {
                              alert('📍 กำลังขอตำแหน่งปัจจุบัน...')
                              navigator.geolocation.getCurrentPosition(
                                (pos) => {
                                  setFilters(f => ({
                                    ...f, 
                                    lat: String(pos.coords.latitude), 
                                    lng: String(pos.coords.longitude)
                                  }))
                                  alert(`✅ ได้ตำแหน่งแล้ว!\nละติจูด: ${pos.coords.latitude.toFixed(6)}\nลองจิจูด: ${pos.coords.longitude.toFixed(6)}`)
                                },
                                (error) => {
                                  console.error('❌ Geolocation error:', error)
                                  switch(error.code) {
                                    case error.PERMISSION_DENIED:
                                      alert('❌ ถูกปฏิเสธการเข้าถึงตำแหน่ง กรุณาอนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์')
                                      break
                                    case error.POSITION_UNAVAILABLE:
                                      alert('❌ ไม่สามารถระบุตำแหน่งได้ กรุณาลองใหม่อีกครั้ง')
                                      break
                                    case error.TIMEOUT:
                                      alert('❌ การขอตำแหน่งหมดเวลา กรุณาลองใหม่อีกครั้ง')
                                      break
                                    default:
                                      alert('❌ เกิดข้อผิดพลาดในการขอตำแหน่ง')
                                  }
                                },
                                {
                                  enableHighAccuracy: true,
                                  timeout: 10000,
                                  maximumAge: 60000
                                }
                              )
                            } else {
                              alert('❌ เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง')
                            }
                          }}
                          className="flex items-center gap-3 px-8 py-4 rounded-2xl border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 transition-all duration-300 shadow-lg hover:shadow-xl font-bold text-base transform hover:scale-105"
                        >
                          <MapPin className="h-6 w-6" />
                          📍 ใช้ตำแหน่งปัจจุบัน
                        </Button>
                        <Button
                          onClick={async () => {
                            // Show loading state
                            setIsLoadingAllUsers(true)
                            
                            const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
                            const params = new URLSearchParams()
                            
                            // Add filters to params
                            if (filters.gender) params.set('gender', filters.gender)
                            if (filters.lookingFor) params.set('lookingFor', filters.lookingFor)
                            if (filters.province) params.set('province', filters.province)
                            if (filters.ageMin && filters.ageMin > 0) params.set('ageMin', String(filters.ageMin))
                            if (filters.ageMax && filters.ageMax > 0) params.set('ageMax', String(filters.ageMax))
                            
                            // Handle relationship filter
                            if (filters.relationship) {
                              if (filters.relationship === 'other' && filters.otherRelationship) {
                                params.set('relationship', filters.otherRelationship)
                              } else {
                                params.set('relationship', filters.relationship)
                              }
                            }
                            
                            // Handle distance filter
                            if (filters.distanceKm && filters.lat && filters.lng) {
                              params.set('distanceKm', String(filters.distanceKm))
                              params.set('lat', String(filters.lat))
                              params.set('lng', String(filters.lng))
                            }
                            
                            params.set('page', '1')
                            params.set('limit', '50') // เพิ่มจำนวนผลลัพธ์
                            
                            try {
                              console.log('🔍 Searching with filters:', Object.fromEntries(params))
                              
                              const res = await fetch(`${base}/api/profile/search?${params.toString()}`, {
                                headers: { 
                                  'Content-Type': 'application/json', 
                                  ...(sessionStorage.getItem('token') ? { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` } : {}) 
                                }
                              })
                              
                              if (!res.ok) {
                                throw new Error(`HTTP error! status: ${res.status}`)
                              }
                              
                              const data = await res.json()
                              console.log('📊 Search results:', data)
                              console.log('📊 Like counts from Discover search:', data?.data?.users?.map((u: any) => ({ id: u._id, likeCount: u.likeCount })));
                              
                              if (data.success) {
                                const users: PublicUser[] = data?.data?.users || []
                                console.log(`✅ Found ${users.length} users`)
                                
                                setAllUsers(users)
                                setCurrentPage(1)
                                
                                // Filter for allowed tiers
                                const allowed = ['member','silver','gold','vip','vip1','vip2']
                                const allowedUsers = users.filter(u => allowed.includes((u?.membership?.tier || 'member') as string))
                                const allowedLen = allowedUsers.length
                                
                                setVisibleCount(allowedLen)
                                setHasMoreUsers(allowedLen > 8)
                                
                                // Show success message
                                if (allowedLen > 0) {
                                  alert(`✅ พบผู้ใช้ ${allowedLen} คนที่ตรงกับเงื่อนไขของคุณ!`)
                                } else {
                                  alert('❌ ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข กรุณาลองปรับตัวกรองใหม่')
                                }
                              } else {
                                console.error('❌ Search failed:', data.message)
                                alert(`❌ การค้นหาล้มเหลว: ${data.message}`)
                              }
                            } catch (error: any) {
                              console.error('❌ Search error:', error)
                              alert(`❌ เกิดข้อผิดพลาดในการค้นหา: ${error.message}`)
                            } finally {
                              setIsLoadingAllUsers(false)
                            }
                          }}
                          className={`flex items-center gap-4 px-10 py-4 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-violet-600 text-white hover:from-pink-600 hover:via-rose-600 hover:to-violet-700 transition-all duration-300 shadow-2xl hover:shadow-pink-500/50 font-bold text-lg transform hover:scale-110 hover:-translate-y-1 ${isLoadingAllUsers ? 'opacity-75 cursor-not-allowed' : ''}`}
                          disabled={isLoadingAllUsers}
                        >
                          {isLoadingAllUsers ? (
                            <>
                              <RefreshCw className="h-6 w-6 animate-spin" />
                              🔄 กำลังค้นหา...
                            </>
                          ) : (
                            <>
                              <Search className="h-6 w-6" />
                              🔍 ค้นหาด้วยตัวกรอง
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={async () => {
                            // Reset filters
                            setFilters({ 
                              gender: '', 
                              ageMin: 18, 
                              ageMax: 100, 
                              province: '', 
                              lookingFor: '', 
                              relationship: '', 
                              otherRelationship: '', 
                              distanceKm: '', 
                              lat: '', 
                              lng: '' 
                            })
                            
                            // Show loading state
                            setIsLoadingAllUsers(true)
                            
                            const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
                            
                            try {
                              console.log('🔄 Resetting filters and reloading users...')
                              
                              const res = await fetch(`${base}/api/profile/all?limit=50&page=1`, {
                                headers: { 
                                  'Content-Type': 'application/json', 
                                  ...(sessionStorage.getItem('token') ? { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` } : {}) 
                                }
                              })
                              
                              if (!res.ok) {
                                throw new Error(`HTTP error! status: ${res.status}`)
                              }
                              
                              const data = await res.json()
                              console.log('📊 Reset results:', data)
                              console.log('📊 Like counts from Discover API:', data?.data?.users?.map((u: any) => ({ id: u._id, likeCount: u.likeCount })));
                              
                              if (data.success) {
                                const users: PublicUser[] = data?.data?.users || []
                                console.log(`✅ Reset: Found ${users.length} users`)
                                
                                setAllUsers(users)
                                setCurrentPage(1)
                                
                                // Filter for allowed tiers
                                const allowed = ['member','silver','gold','vip','vip1','vip2']
                                const allowedUsers = users.filter(u => allowed.includes((u?.membership?.tier || 'member') as string))
                                const allowedLen = allowedUsers.length
                                
                                setVisibleCount(allowedLen)
                                setHasMoreUsers(allowedLen > 8)
                                
                                alert(`✅ รีเซ็ตตัวกรองเรียบร้อย! แสดงผู้ใช้ ${allowedLen} คน`)
                              } else {
                                console.error('❌ Reset failed:', data.message)
                                alert(`❌ การรีเซ็ตล้มเหลว: ${data.message}`)
                              }
                            } catch (error: any) {
                              console.error('❌ Reset error:', error)
                              alert(`❌ เกิดข้อผิดพลาดในการรีเซ็ต: ${error.message}`)
                            } finally {
                              setIsLoadingAllUsers(false)
                            }
                          }}
                          className={`flex items-center gap-3 px-8 py-4 rounded-2xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 shadow-lg hover:shadow-xl font-bold text-base transform hover:scale-105 ${isLoadingAllUsers ? 'opacity-75 cursor-not-allowed' : ''}`}
                          disabled={isLoadingAllUsers}
                        >
                          {isLoadingAllUsers ? (
                            <>
                              <RefreshCw className="h-6 w-6 animate-spin" />
                              🔄 กำลังรีเซ็ต...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-6 w-6" />
                              🗑️ ล้างตัวกรองทั้งหมด
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {/* Mobile-First Premium Member Exclusive */}
              <div className="mb-8 sm:mb-10">
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-amber-500 via-pink-500 to-violet-600 bg-clip-text text-transparent flex items-center">
                    <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl">Premium</span>
                    <Crown className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 ml-2 sm:ml-3 text-amber-500" />
                  </h3>
                  <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-1 sm:mt-2">สมาชิกระดับพรีเมียมคัดสรร • เรียงตามระดับสมาชิก</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
                  {premiumUsers.map((u: PublicUser, idx: number) => {
                    // const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
                    const firstImage = u?.profileImages?.[0]
                    const imageUrl = firstImage || ''
                    const displayName = u?.nickname || `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || 'Premium User'
                    const tier: string = (u?.membership?.tier || 'member') as string
                    const tierColors: Record<string, string> = {
                      platinum: 'from-purple-500 to-pink-500',
                      diamond: 'from-blue-500 to-cyan-500',
                      vip2: 'from-red-500 to-orange-500',
                      vip1: 'from-orange-500 to-yellow-500',
                      vip: 'from-purple-400 to-pink-400',
                      gold: 'from-yellow-500 to-amber-500',
                      silver: 'from-gray-400 to-slate-400'
                    }
                    const badgeGradient = tierColors[tier] || 'from-gray-300 to-gray-400'
                    return (
                      <div
                        key={u._id || idx}
                        className="modern-card rounded-xl sm:rounded-2xl overflow-hidden shadow-lg sm:shadow-xl hover:shadow-xl sm:hover:shadow-2xl hover:shadow-pink-100/50 transition-all duration-500 hover:-translate-y-1 sm:hover:-translate-y-2 cursor-pointer group"
                        onClick={() => {
                          const token = sessionStorage.getItem('token');
                          if (!token) {
                            showWebappNotification('กรุณาเข้าสู่ระบบก่อน')
                            return
                          }
                          const modalProfile: FeaturedProfile = {
                            id: u._id,
                            name: displayName,
                            age: u?.age,
                            location: u?.location || 'Thailand',
                            distance: 'Premium',
                            bio: u?.bio || '',
                            interests: Array.isArray(u?.interests)
                              ? u.interests.map((it: any) => it?.category || it?.name || `${it}`).filter(Boolean)
                              : [],
                            images: (u?.profileImages || []).filter(img => !img.startsWith('data:image/svg+xml')),
                            verified: false,
                            online: (u as any)?.isOnline || false,
                            lastActive: (u as any)?.lastActive,
                            membershipTier: u?.membership?.tier || 'member',
                            membership: {
                              tier: u?.membership?.tier || 'member'
                            }
                          }
                          openProfileModal(modalProfile)
                        }}
                      >
                        <div className="h-48 sm:h-60 md:h-72 overflow-hidden relative">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={displayName}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : null}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                          <div className="absolute top-2 sm:top-4 left-2 sm:left-4">
                            <div className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${badgeGradient} shadow-xl border border-white/10`}>{tier.toUpperCase()}</div>
                          </div>
                          <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4 text-white">
                            <div className="flex justify-between items-end">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold truncate">{displayName}{u?.age ? `, ${u.age}` : ''}</h3>
                                {u?.location && (
                                  <div className="flex items-center text-white/90 text-xs sm:text-sm">
                                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                    <span className="truncate">{u.location}</span>
                                  </div>
                                )}
                              </div>
                              <div className="ml-2">
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className={`rounded-full transition-all duration-300 hover:scale-110 h-8 w-8 sm:h-10 sm:w-10 ${
                                    likedProfiles.has(u._id || '')
                                      ? 'text-red-500'
                                      : 'text-white hover:text-pink-300 hover:bg-white/20'
                                  }`}
                                  onClick={(e: any) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    const token = sessionStorage.getItem('token');
                                    if (!token) {
                                      showWebappNotification('กรุณาเข้าสู่ระบบก่อน')
                                      return
                                    }
                                    
                                    const userId = u._id || '';
                                    handleProfileLike(userId);
                                  }}
                                >
                                  <Heart className={`h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 ${
                                    likedProfiles.has(u._id || '') ? 'fill-current' : ''
                                  }`} />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              {/* Mobile-First Discover Amazing People */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 mt-8 sm:mt-12 gap-4">
                <div className="flex-1">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold gradient-text mb-1 sm:mb-2">Discover Amazing People ✨</h2>
                  <p className="text-sm sm:text-base text-gray-600">
                    Find your perfect match from verified member singles 
                    {!isLoadingAllUsers && allUsers.length > 0 && (
                      <span className="ml-1 sm:ml-2 text-pink-600 font-semibold text-xs sm:text-sm">
                        (สุ่มแสดง {allUsers.length} คน)
                      </span>
                    )}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setIsLoadingAllUsers(true)
                    setCurrentPage(1)
                    setHasMoreUsers(true)
                    // Trigger reload
                    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
                    fetch(`${base}/api/profile/discover?limit=20`, {
                      headers: {
                        'Content-Type': 'application/json',
                        ...(sessionStorage.getItem('token') ? { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` } : {})
                      }
                    })
                    .then(res => res.json())
                    .then(data => {
                      if (data.success) {
                        setAllUsers(data.data.users)
                        setHasMoreUsers(data.data.pagination.page < data.data.pagination.pages)
                        setCurrentPage(1)
                      }
                    })
                    .catch(() => {})
                    .finally(() => setIsLoadingAllUsers(false))
                  }}
                  disabled={isLoadingAllUsers}
                  className="flex items-center gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2"
                >
                  <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${isLoadingAllUsers ? 'animate-spin' : ''}`} />
                  รีเฟรช
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
                {isLoadingAllUsers ? (
                  // Loading skeleton
                  Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="modern-card rounded-2xl overflow-hidden shadow-xl animate-pulse">
                      <div className="h-72 bg-gray-200"></div>
                      <div className="p-6">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded mb-4"></div>
                        <div className="flex gap-2">
                          <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                          <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                          <div className="h-6 bg-gray-200 rounded-full w-14"></div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : allUsers.length > 0 ? (
                  allUsers
                    .slice(0, visibleCount)
                    .map(user => {
                    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
                    
                    // สร้าง profileImage URL ที่ถูกต้อง
                    let profileImage = ''
                    if (user.profileImages && user.profileImages.length > 0) {
                      const firstImage = user.profileImages[0]
                      if (firstImage.startsWith('http')) {
                        // URL เต็มแล้ว
                        profileImage = firstImage
                      } else if (firstImage.startsWith('data:image/svg+xml')) {
                        // SVG data
                        profileImage = firstImage
                      } else {
                        // ไฟล์ในโฟลเดอร์ uploads
                        profileImage = `${baseUrl}/uploads/profiles/${firstImage}`
                      }
                    }
                    
                    console.log('🔍 Homepage user profile image:', {
                      userId: user._id || (user as any).id,
                      username: (user as any).username,
                      profileImages: user.profileImages,
                      finalProfileImage: profileImage
                    })
                    
                    const displayName = user.nickname || `${user.firstName || ''} ${user.lastName || ''}`.trim() || (user as any).username || 'Unknown'
                    const age = user.age || 'N/A'
                    const location = user.location || 'Unknown'
                    const bio = user.bio || 'No bio available'
                    const interests = user.interests?.map(i => i.category || i) || []
                    
                    return (
                      <div key={user._id} className="modern-card rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-pink-100/50 transition-all duration-500 hover:-translate-y-2 cursor-pointer group floating-hearts"                         onClick={() => {
                          const token = sessionStorage.getItem('token');
                          if (!token) {
                            showWebappNotification('กรุณาเข้าสู่ระบบก่อน')
                            return
                          }
                          openProfileModal({
                          id: user._id,
                          name: displayName,
                          age: parseInt(String(age)) || 0,
                          location: location,
                          bio: bio,
                          interests: interests,
                          images: user.profileImages && user.profileImages.length > 0
                            ? user.profileImages.filter(img => !img.startsWith('data:image/svg+xml')).map(img => {
                                if (img.startsWith('http')) {
                                  return img
                                } else {
                                  return `${baseUrl}/uploads/profiles/${img}`
                                }
                              })
                            : [],
                          verified: (user as any).isVerified,
                          online: (user as any).isOnline || false,
                          lastActive: (user as any).lastActive,
                          membershipTier: user.membership?.tier || 'member'
                        })
                      }}>
                        <div className="h-48 sm:h-60 md:h-72 overflow-hidden relative">
                          {profileImage && !profileImage.startsWith('data:image/svg+xml') ? (
                            <img 
                              src={profileImage} 
                              alt={displayName} 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              onError={(e) => {
                                console.error('❌ Homepage image failed to load:', {
                                  imageUrl: profileImage,
                                  userId: user._id || (user as any).id,
                                  username: (user as any).username
                                });
                                
                                // ลองใช้รูปอื่นถ้ามี
                                const otherImages = user.profileImages?.slice(1) || []
                                if (otherImages.length > 0) {
                                  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
                                  const nextImage = otherImages[0]
                                  let nextImageUrl = nextImage
                                  
                                  if (!nextImage.startsWith('http') && !nextImage.startsWith('data:')) {
                                    nextImageUrl = `${baseUrl}/uploads/profiles/${nextImage}`
                                  }
                                  
                                  console.log('🔄 Trying next image:', nextImageUrl)
                                  ;(e.target as HTMLImageElement).src = nextImageUrl
                                  return
                                }
                                
                                // ถ้าไม่มีรูปอื่น ให้ซ่อนรูปและแสดง fallback
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                              }}
                              onLoad={() => {
                                console.log('✅ Homepage image loaded successfully:', {
                                  imageUrl: profileImage,
                                  userId: user._id || (user as any).id,
                                  username: (user as any).username
                                });
                              }}
                            />
                          ) : null}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                          
                          {/* Membership Tier Badge */}
                          {user.membership?.tier && (
                            <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
                              <Badge className={`text-xs ${
                                user.membership.tier === 'platinum' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                                user.membership.tier === 'diamond' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                                user.membership.tier === 'vip2' ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                                user.membership.tier === 'vip1' ? 'bg-gradient-to-r from-orange-500 to-yellow-500' :
                                user.membership.tier === 'vip' ? 'bg-gradient-to-r from-purple-400 to-pink-400' :
                                user.membership.tier === 'gold' ? 'bg-gradient-to-r from-yellow-500 to-amber-500' :
                                user.membership.tier === 'silver' ? 'bg-gradient-to-r from-gray-400 to-slate-400' :
                                'bg-gradient-to-r from-gray-300 to-gray-400'
                              } text-white shadow-lg`}>
                                {user.membership.tier === 'platinum' ? 'PLATINUM' :
                                 user.membership.tier === 'diamond' ? 'DIAMOND' :
                                 user.membership.tier === 'vip2' ? 'VIP2' :
                                 user.membership.tier === 'vip1' ? 'VIP1' :
                                 user.membership.tier === 'vip' ? 'VIP' :
                                 user.membership.tier === 'gold' ? 'GOLD' :
                                 user.membership.tier === 'silver' ? 'SILVER' :
                                 'MEMBER'}
                              </Badge>
                            </div>
                          )}
                          
                          <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4 text-white">
                            <div className="flex justify-between items-end">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold truncate">{displayName}, {age}</h3>
                                <div className="flex items-center text-white/90 text-xs sm:text-sm">
                                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                  <span className="truncate">{location}</span>
                                </div>
                              </div>
                              <div className="ml-2">
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className={`rounded-full transition-all duration-300 hover:scale-110 h-8 w-8 sm:h-10 sm:w-10 ${
                                    likedProfiles.has(user._id || '')
                                      ? 'text-red-500'
                                      : 'text-white hover:text-pink-300 hover:bg-white/20'
                                  }`}
                                  onClick={(e: any) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    const token = sessionStorage.getItem('token');
                                    if (!token) {
                                      showWebappNotification('กรุณาเข้าสู่ระบบก่อน')
                                      return
                                    }
                                    
                                    const userId = user._id || '';
                                    handleProfileLike(userId);
                                  }}
                                >
                                  <Heart className={`h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 ${
                                    likedProfiles.has(user._id || '') ? 'fill-current' : ''
                                  }`} />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="col-span-full text-center py-12">
                    <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">ไม่พบผู้ใช้ในระบบ</p>
                    <p className="text-gray-400 text-sm">อาจเป็นเพราะยังไม่มีผู้ใช้อื่นในระบบ หรือเกิดข้อผิดพลาดในการโหลดข้อมูล</p>
                    <Button 
                      onClick={() => {
                        setIsLoadingAllUsers(true)
                        setCurrentPage(1)
                        setHasMoreUsers(true)
                        // Trigger reload
                        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
                        fetch(`${base}/api/profile/discover?limit=20`, {
                          headers: {
                            'Content-Type': 'application/json',
                            ...(sessionStorage.getItem('token') ? { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` } : {})
                          }
                        })
                        .then(res => res.json())
                        .then(data => {
                          if (data.success) {
                            setAllUsers(data.data.users)
                            setHasMoreUsers(data.data.pagination.page < data.data.pagination.pages)
                            setCurrentPage(1)
                          }
                        })
                        .catch(() => {})
                        .finally(() => setIsLoadingAllUsers(false))
                      }}
                      disabled={isLoadingAllUsers}
                      className="mt-4 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingAllUsers ? 'animate-spin' : ''}`} />
                      ลองใหม่
                    </Button>
                  </div>
                )}
                
                {/* Load More Button */}
                {!isLoadingAllUsers && allUsers.length > 0 && (
                  <div className="col-span-full text-center py-8">
                    <Button
                      onClick={async () => {
                        const allowed = ['member','silver','gold','vip','vip1','vip2']
                        const filteredLen = allUsers.filter(u => allowed.includes((u?.membership?.tier || 'member') as string)).length
                        const nextCount = Math.min(visibleCount + 8, filteredLen)
                        if (visibleCount < filteredLen) {
                          setVisibleCount(nextCount)
                        } else if (hasMoreUsers && !isLoadingMore) {
                          await loadMoreUsers()
                          setVisibleCount(prev => prev + 8)
                        }
                      }}
                      disabled={isLoadingMore}
                      variant="outline"
                      size="lg"
                      className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {isLoadingMore ? (
                        <>
                          <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                          กำลังโหลด...
                        </>
                      ) : (
                        <>
                          <Users className="w-5 h-5 mr-2" />
                          โหลดต่อ
                        </>
                      )}
                    </Button>
                    {(() => {
                      const allowed = ['member','silver','gold','vip','vip1','vip2']
                      const filteredLen = allUsers.filter(u => allowed.includes((u?.membership?.tier || 'member') as string)).length
                      return hasMoreUsers || visibleCount < filteredLen
                    })() && (
                      <p className="text-gray-500 text-sm mt-2">
                        หน้า {currentPage} • โหลดเพิ่ม 20 คนต่อครั้ง
                      </p>
                    )}
                  </div>
                )}
                
                {/* No More Users */}
                {!isLoadingAllUsers && allUsers.length > 0 && !hasMoreUsers && (
                  <div className="col-span-full text-center py-8">
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                      <p className="text-green-700 font-semibold">แสดงครบทุกคนแล้ว!</p>
                      <p className="text-green-600 text-sm">คุณได้ดูผู้ใช้ทั้งหมดที่สุ่มแสดงแล้ว - กดปุ่มรีเฟรชเพื่อสุ่มใหม่</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            {/* Mobile-First Matches Tab */}
            <TabsContent value="matches" id="matches-content" className="p-1 sm:p-6">
              {!isAuthenticated ? (
                <div className="text-center py-8 sm:py-12">
                  <Users className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <p className="text-gray-500 mb-3 sm:mb-4 text-sm sm:text-base">กรุณาเข้าสู่ระบบเพื่อใช้งาน AI Matching</p>
                  <Button onClick={() => setShowLoginDialog(true)} className="text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3">
                    เข้าสู่ระบบ
                  </Button>
                </div>
              ) : (
                <AIMatchingSystem currentUser={user} />
              )}
            </TabsContent>
            {/* Mobile-First Messages Tab */}
            <TabsContent value="messages" className="p-0">
              {!isAuthenticated ? (
                <div className="text-center py-8 sm:py-12">
                  <MessageCircle className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <p className="text-gray-500 mb-3 sm:mb-4 text-sm sm:text-base">กรุณาเข้าสู่ระบบเพื่อใช้งานแชท</p>
                  <Button onClick={() => setShowLoginDialog(true)} className="text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3">
                    เข้าสู่ระบบ
                  </Button>
                </div>
              ) : (
                <div className="h-[calc(100vh-10rem)] sm:h-[700px] flex flex-col">
                  {/* Mobile-First Tab Navigation for Chat Types */}
                  <div className="bg-gradient-to-r from-pink-500 to-violet-500 text-white p-2 sm:p-4 rounded-t-lg -mt-2">
                    <div className="flex space-x-1 sm:space-x-2">
                      <button
                        onClick={() => {
                          setChatType('public');
                          setChatView('list');
                          setPrivateChatView('list');
                        }}
                        className={`flex-1 px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-all duration-200 ${
                          chatType === 'public'
                            ? 'bg-white text-pink-600 shadow-sm'
                            : 'text-white/80 hover:text-white hover:bg-white/20'
                        }`}
                      >
                        <span className="hidden sm:inline">ห้องแชทสาธารณะ</span>
                        <span className="sm:hidden">สาธารณะ</span>
                      </button>
                      <button
                        onClick={() => {
                          setChatType('private');
                          setChatView('list');
                          setPrivateChatView('list');
                          // รีเฟรชข้อมูลแชทส่วนตัวเมื่อเปลี่ยนไปหน้าแชทส่วนตัว (เฉพาะเมื่อไม่มีข้อมูล)
                          if (privateChats.length === 0) {
                            fetchPrivateChats();
                          }
                        }}
                        className={`flex-1 px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-all duration-200 ${
                          chatType === 'private'
                            ? 'bg-white text-pink-600 shadow-sm'
                            : 'text-white/80 hover:text-white hover:bg-white/20'
                        }`}
                      >
                        <span className="hidden sm:inline">แชทส่วนตัว</span>
                        <span className="sm:hidden">ส่วนตัว</span>
                      </button>
                    </div>
                  </div>

                  {/* Chat Content */}
                  <div className="flex-1 overflow-y-auto bg-white rounded-b-lg">
                    {chatType === 'public' ? (
                      chatView === 'list' ? (
                        <ChatRoomList
                          currentUser={user}
                          onSelectRoom={handleSelectRoom}
                          onCreatePrivateRoom={() => setShowCreateRoomModal(true)}
                        />
                      ) : (
                        <RealTimeChat
                          roomId={selectedRoomId}
                          currentUser={user}
                          onBack={handleBackToRoomList}
                        />
                      )
                    ) : (
                      privateChatView === 'list' ? (
                        <PrivateChatList
                          currentUser={user}
                          onSelectChat={handleSelectPrivateChat}
                          onCreateNewChat={() => setShowNewPrivateChatModal(true)}
                          onDeleteChat={handleDeletePrivateChat}
                          privateChats={privateChats}
                          isLoading={false}
                          showWebappNotification={showWebappNotification}
                        />
                      ) : (
                        <PrivateChat
                          currentUser={user}
                          otherUser={selectedPrivateChat?.otherUser}
                          onBack={handleBackToPrivateChatList}
                          onSendMessage={handleSendPrivateMessage}
                          messages={selectedPrivateChat?.messages || []}
                          isLoading={false}
                          isOtherUserTyping={false}
                          onSimulateTyping={() => {}}
                          onSimulateRead={() => {}}
                          onMessageRead={handleMessageRead}
                          chatRoomId={selectedPrivateChat?.id}
                        />
                      )
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
            {/* Mobile-First Membership Tab */}
            <TabsContent value="membership" id="membership-content" className="p-1 sm:p-6">
              <div className="space-y-4 sm:space-y-6 lg:space-y-8">
                <Suspense fallback={<LoadingSpinner />}>
                  <MembershipDashboard userId={user?._id} />
                </Suspense>
                <div id="membership-comparison" className="border-t border-slate-200 pt-4 sm:pt-6 lg:pt-8">
                  <Suspense fallback={<LoadingSpinner />}>
                    <MembershipPlans currentUserId={user?._id} currentTier="member" />
                  </Suspense>
                </div>
              </div>
            </TabsContent>
            {/* Mobile-First Profile Tab */}
            <TabsContent value="profile" className="p-1 sm:p-6">
              {isAuthenticated && user ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <UserProfile
                    userId={user._id || user.id}
                    isOwnProfile={true}
                  />
                </Suspense>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <p className="text-gray-500 mb-3 sm:mb-4 text-sm sm:text-base">กรุณาเข้าสู่ระบบเพื่อดูโปรไฟล์</p>
                  <Button onClick={() => setShowLoginDialog(true)} className="text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3">
                    เข้าสู่ระบบ
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Mobile-First Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-gray-200/50 shadow-lg">
        <div className="max-w-md mx-auto">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="w-full justify-between bg-transparent h-12 sm:h-16 p-0">
              <TabsTrigger 
                value="discover" 
                className="flex-1 h-full data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700 rounded-none text-gray-500 data-[state=active]:border-t-2 data-[state=active]:border-pink-700 transition-all duration-300 flex flex-col items-center justify-center space-y-0.5 sm:space-y-1"
              >
                <FontAwesomeIcon 
                  icon={faSearch} 
                  className={`h-3 w-3 sm:h-5 sm:w-5 transition-all duration-300 ${activeTab === 'discover' ? 'text-pink-700 drop-shadow-lg scale-105 animate-pulse' : 'text-gray-500'}`} 
                  style={activeTab === 'discover' ? { color: '#be185d' } : {}} 
                />
                <span className="text-xs font-medium">ค้นหา</span>
              </TabsTrigger>
              <TabsTrigger 
                value="matches" 
                className="flex-1 h-full data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700 rounded-none text-gray-500 data-[state=active]:border-t-2 data-[state=active]:border-pink-700 transition-all duration-300 flex flex-col items-center justify-center space-y-0.5 sm:space-y-1"
              >
                <FontAwesomeIcon 
                  icon={faHeart} 
                  className={`h-5 w-5 transition-all duration-300 ${activeTab === 'matches' ? 'text-pink-700 drop-shadow-lg scale-105 animate-pulse' : 'text-gray-500'}`} 
                  style={activeTab === 'matches' ? { color: '#be185d' } : {}} 
                />
                <span className="text-xs font-medium">แมท</span>
              </TabsTrigger>
              <TabsTrigger 
                value="messages" 
                className="flex-1 h-full data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700 rounded-none text-gray-500 data-[state=active]:border-t-2 data-[state=active]:border-pink-700 transition-all duration-300 flex flex-col items-center justify-center space-y-0.5 sm:space-y-1"
              >
                <FontAwesomeIcon 
                  icon={faComments} 
                  className={`h-5 w-5 transition-all duration-300 ${activeTab === 'messages' ? 'text-pink-700 drop-shadow-lg scale-105 animate-pulse' : 'text-gray-500'}`} 
                  style={activeTab === 'messages' ? { color: '#be185d' } : {}} 
                />
                <span className="text-xs font-medium">แชท</span>
              </TabsTrigger>
              <TabsTrigger 
                value="membership" 
                className="flex-1 h-full data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700 rounded-none text-gray-500 data-[state=active]:border-t-2 data-[state=active]:border-pink-700 transition-all duration-300 flex flex-col items-center justify-center space-y-0.5 sm:space-y-1"
              >
                <FontAwesomeIcon 
                  icon={faGem} 
                  className={`h-5 w-5 transition-all duration-300 ${activeTab === 'membership' ? 'text-pink-700 drop-shadow-lg scale-105 animate-pulse' : 'text-gray-500'}`} 
                  style={activeTab === 'membership' ? { color: '#be185d' } : {}} 
                />
                <span className="text-xs font-medium">พรีเมียม</span>
              </TabsTrigger>
              <TabsTrigger 
                value="profile" 
                className="flex-1 h-full data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700 rounded-none text-gray-500 data-[state=active]:border-t-2 data-[state=active]:border-pink-700 transition-all duration-300 flex flex-col items-center justify-center space-y-0.5 sm:space-y-1"
              >
                <FontAwesomeIcon 
                  icon={faUser} 
                  className={`h-5 w-5 transition-all duration-300 ${activeTab === 'profile' ? 'text-pink-700 drop-shadow-lg scale-105 animate-pulse' : 'text-gray-500'}`} 
                  style={activeTab === 'profile' ? { color: '#be185d' } : {}} 
                />
                <span className="text-xs font-medium">โปรไฟล์</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-white/40 backdrop-blur-md border-t border-white/20 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-7 h-7 bg-gradient-to-r from-pink-500 to-violet-500 rounded-full flex items-center justify-center">
                <Heart className="h-4 w-4 text-white" fill="white" />
              </div>
              <span className="text-xl font-light bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">sodeclick</span>
            </div>
            <div className="flex space-x-8">
              <a href="#" className="text-slate-500 hover:text-pink-500 transition-colors duration-200">About</a>
              <a href="#" className="text-slate-500 hover:text-pink-500 transition-colors duration-200">Privacy</a>
              <a href="#" className="text-slate-500 hover:text-pink-500 transition-colors duration-200">Terms</a>
              <a href="#" className="text-slate-500 hover:text-pink-500 transition-colors duration-200">Contact</a>
            </div>
          </div>
          <div className="mt-8 text-center md:text-left text-slate-400 text-sm">
            © {new Date().getFullYear()} sodeclick. All rights reserved.
          </div>
        </div>
      </footer>
      {/* Profile Image Modal */}
      {selectedProfile && (
        <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
          <DialogContent 
            className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-[90vw] h-[80vh] max-w-[400px] max-h-[600px] sm:w-[500px] sm:h-[700px] bg-white backdrop-blur-md border border-gray-200 shadow-2xl rounded-none sm:rounded-xl p-0 overflow-hidden"
            style={{
              position: 'fixed',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 50
            }}
          >
            <VisuallyHidden>
              <DialogTitle>Profile of {selectedProfile.name}</DialogTitle>
              <DialogDescription>
                View profile images for {selectedProfile.name}, age {selectedProfile.age} from {selectedProfile.location}
              </DialogDescription>
            </VisuallyHidden>
            <div className="relative w-full h-full">
              {/* Close Button */}
              <button
                onClick={() => {
                  setShowProfileModal(false);
                  setModalAction(null);
                  setShowProfileDetails(false);
                  setProfileData(null);
                  setProfileAlert(null);
                }}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full p-2 sm:p-3 transition-colors"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>

              {/* Back Button (when showing profile details) */}
              {showProfileDetails && (
                <button
                  onClick={() => {
                    setShowProfileDetails(false);
                    setProfileData(null);
                    setProfileAlert(null);
                  }}
                  className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full p-2 sm:p-3 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              )}

              {/* Full Size Image */}
              {selectedProfile.images && selectedProfile.images.length > 0 && selectedProfile.images[activeImageIndex] && !selectedProfile.images[activeImageIndex].startsWith('data:image/svg+xml') ? (
                <img
                  src={selectedProfile.images[activeImageIndex]}
                  alt={selectedProfile.name}
                  className="w-full h-full object-cover"
                />
              ) : null}
              
              {/* Profile Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 pb-15">
                {/* Background overlay for better text visibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"></div>
                
                {/* Content with relative positioning */}
                <div className="relative z-10 text-white">
                  {/* Alert Message */}
                  {profileAlert && (
                    <div className={`mb-2 sm:mb-3 md:mb-4 p-2 sm:p-3 rounded-lg flex items-center justify-between ${
                      profileAlert.type === 'error' ? 'bg-red-500/90 text-white' :
                      profileAlert.type === 'success' ? 'bg-green-500/90 text-white' :
                      'bg-yellow-500/90 text-white'
                    }`}>
                      <span className="text-xs sm:text-sm font-medium">{profileAlert.message}</span>
                      <button 
                        onClick={() => setProfileAlert(null)}
                        className="ml-1 sm:ml-2 text-white/80 hover:text-white"
                      >
                        <X className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-end mb-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold mb-1 text-white" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.6)'}}>{selectedProfile.name}, {selectedProfile.age}</h3>
                      <div className="flex items-center text-white text-base" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.6)'}}>
                        <MapPin className="h-5 w-5 mr-2" />
                        <span className="truncate">{selectedProfile.location}</span>
                        <span className="mx-2">•</span>
                        <div className="flex items-center">
                          {selectedProfile.membershipTier === 'platinum' && <Crown className="h-5 w-5 mr-2 text-purple-300" />}
                          {selectedProfile.membershipTier === 'diamond' && <Crown className="h-5 w-5 mr-2 text-blue-300" />}
                          {selectedProfile.membershipTier === 'gold' && <Crown className="h-5 w-5 mr-2 text-yellow-300" />}
                          {selectedProfile.membershipTier === 'silver' && <Crown className="h-5 w-5 mr-2 text-gray-300" />}
                          {selectedProfile.membershipTier === 'vip' && <Crown className="h-5 w-5 mr-2 text-pink-300" />}
                          {selectedProfile.membershipTier === 'vip1' && <Crown className="h-5 w-5 mr-2 text-orange-300" />}
                          {selectedProfile.membershipTier === 'vip2' && <Crown className="h-5 w-5 mr-2 text-red-300" />}
                          <span className="capitalize text-base">{selectedProfile.membershipTier || 'Member'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Bio Section */}
                  {selectedProfile.bio && (
                    <div className="mb-1">
                      <h4 className="text-base font-semibold mb-1 text-white" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.6)'}}>เกี่ยวกับฉัน</h4>
                      <p className="text-base text-white leading-relaxed line-clamp-1" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.6)'}}>{selectedProfile.bio}</p>
                    </div>
                  )}
                  
                  {/* Interests Section */}
                  {selectedProfile.interests && selectedProfile.interests.length > 0 && (
                    <div className="mb-1">
                      <h4 className="text-base font-semibold mb-1 text-white" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.6)'}}>ความสนใจ</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedProfile.interests.slice(0, 3).map((interest, index) => (
                          <span key={index} className="px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full text-sm text-white" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.8)'}}>
                            {interest}
                          </span>
                        ))}
                        {selectedProfile.interests.length > 3 && (
                          <span className="px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full text-sm text-white" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.8)'}}>
                            +{selectedProfile.interests.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  
                  {/* Image Indicators */}
                  {selectedProfile.images.length > 1 && (
                    <div className="flex justify-center space-x-2 mb-1">
                      {selectedProfile.images.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setActiveImageIndex(index)}
                          className={`w-3 h-3 rounded-full transition-all ${
                            index === activeImageIndex ? 'bg-white' : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Action Icons */}
                  <div className="flex justify-center items-center gap-4 mb-10">
                    {/* Chat Icon */}
                    <button
                      className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 bg-blue-500 hover:bg-blue-600 text-white border border-blue-600"
                      onClick={() => {
                        console.log('💬 Start chat with:', selectedProfile.name);
                        
                        // สร้าง user object สำหรับ handleStartPrivateChat
                        const targetUser = createUserObject(selectedProfile);
                        handleStartPrivateChat(targetUser);
                      }}
                    >
                      <MessageCircle className="h-6 w-6" />
                    </button>
                    
                    {/* Heart Icon */}
                    <button
                      className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 ${
                        likedProfiles.has(selectedProfile.id?.toString() || '')
                          ? 'bg-red-500 text-white scale-110 border border-red-600'
                          : 'bg-pink-500 hover:bg-pink-600 text-white border border-pink-600'
                      }`}
                      onClick={() => {
                        console.log('💖 Like profile:', selectedProfile.name);
                        const profileId = selectedProfile.id?.toString() || '';
                        handleProfileLike(profileId);
                      }}
                    >
                      <Heart className={`h-6 w-6 ${
                        likedProfiles.has(selectedProfile.id?.toString() || '') ? 'fill-current' : ''
                      }`} />
                    </button>
                    
                    {/* Profile Details Icon */}
                    <button
                      className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 bg-purple-500 hover:bg-purple-600 text-white border border-purple-600"
                      onClick={() => {
                        console.log('👤 View profile details:', selectedProfile.name);
                        
                        // สร้าง profile data object สำหรับ handleViewProfile
                        const profileData = {
                          id: selectedProfile.id,
                          name: selectedProfile.name,
                          membershipTier: selectedProfile.membershipTier || 'member',
                          profileImages: selectedProfile.images,
                          location: selectedProfile.location,
                          age: selectedProfile.age,
                          bio: selectedProfile.bio,
                          interests: selectedProfile.interests
                        };
                        
                        handleViewProfile(profileData);
                      }}
                    >
                      <User className="h-6 w-6" />
                    </button>
                  </div>
                  
                  {/* Action Result Display */}
                  {modalAction && !isStartingChat && (
                    <div className="mt-2 mb-2 p-3 bg-black/40 backdrop-blur-sm rounded-xl border border-white/30">
                      {modalAction === 'like' && (
                        <div className="text-center text-white">
                          <Heart className="h-5 w-5 mx-auto mb-2 text-red-400 fill-current" />
                          <p className="text-base font-medium">ส่งหัวใจให้ {selectedProfile.name}</p>
                          <p className="text-sm text-white/80 mt-1">💖 หวังว่าจะได้เจอกัน!</p>
                        </div>
                      )}
                      {modalAction === 'profile' && (
                        <div className="text-center text-white">
                          <User className="h-5 w-5 mx-auto mb-2 text-blue-400" />
                          <p className="text-base font-medium">ดูรายละเอียด {selectedProfile.name}</p>
                          <p className="text-sm text-white/80 mt-1">กำลังโหลดข้อมูลโปรไฟล์...</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Chat Countdown Display */}
                  {isStartingChat && chatCountdown !== null && (
                    <div className="mt-2 mb-2 p-3 bg-black/40 backdrop-blur-sm rounded-xl border border-white/30">
                      <div className="text-center text-white">
                        <MessageCircle className="h-5 w-5 mx-auto mb-2 text-pink-400" />
                        <p className="text-base font-medium">เริ่มแชทกับ {selectedProfile.name}</p>
                        <p className="text-sm text-white/80 mt-1">กำลังเปิดหน้าต่างแชท... {chatCountdown}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Full Profile Details View */}
              {showProfileDetails && (
                <div className="absolute inset-0 bg-gradient-to-br from-pink-50/95 via-violet-50/95 to-blue-50/95 backdrop-blur-md overflow-y-auto">
                  {/* Background Elements */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-10 left-4 w-48 h-48 sm:top-20 sm:left-10 sm:w-96 sm:h-96 bg-gradient-to-br from-pink-300/20 to-violet-300/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute top-40 right-8 w-40 h-40 sm:top-60 sm:right-20 sm:w-80 sm:h-80 bg-gradient-to-br from-blue-300/15 to-cyan-300/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
                    <div className="absolute bottom-20 left-1/4 w-36 h-36 sm:bottom-32 sm:left-1/4 sm:w-72 sm:h-72 bg-gradient-to-br from-orange-300/20 to-pink-300/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
                    <div className="absolute bottom-40 right-1/3 w-32 h-32 sm:bottom-60 sm:right-1/3 sm:w-64 sm:h-64 bg-gradient-to-br from-purple-300/25 to-indigo-300/25 rounded-full blur-3xl animate-pulse delay-3000"></div>
                  </div>
                  {/* Floating Elements */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-1/4 left-1/4 text-2xl sm:text-4xl opacity-20 animate-float">✨</div>
                    <div className="absolute top-1/3 right-1/4 text-3xl sm:text-5xl opacity-15 animate-float delay-1000">💫</div>
                    <div className="absolute bottom-1/3 left-1/3 text-4xl sm:text-6xl opacity-10 animate-float delay-2000">🌟</div>
                    <div className="absolute bottom-1/4 right-1/3 text-2xl sm:text-3xl opacity-25 animate-float delay-3000">💖</div>
                    <div className="absolute top-1/2 left-1/6 text-2xl sm:text-4xl opacity-20 animate-float delay-4000">🎉</div>
                    <div className="absolute top-3/4 right-1/6 text-3xl sm:text-5xl opacity-15 animate-float delay-5000">🌈</div>
                  </div>
                  
                  <div className="relative p-6 sm:p-8 text-gray-800 space-y-6">
                    {/* Loading State */}
                    {loadingProfileData && (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
                        <span className="ml-3 text-gray-600">กำลังโหลดข้อมูลโปรไฟล์...</span>
                      </div>
                    )}
                    
                    {/* Profile Data */}
                    {!loadingProfileData && profileData && (
                      <>
                        {/* Profile Header */}
                        <div className="flex flex-col sm:flex-row items-start gap-4">
                          <div className="relative">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 flex items-center justify-center text-white text-2xl font-bold">
                              {(() => {
                                // สร้าง profile image URL ที่ถูกต้อง
                                let profileImageUrl = ''
                                if (profileData.profileImages && profileData.profileImages.length > 0) {
                                  const firstImage = profileData.profileImages[0]
                                  if (firstImage.startsWith('http')) {
                                    profileImageUrl = firstImage
                                  } else if (firstImage.startsWith('data:image/svg+xml')) {
                                    profileImageUrl = firstImage
                                  } else {
                                    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
                                    profileImageUrl = `${baseUrl}/uploads/profiles/${firstImage}`
                                  }
                                }
                                
                                return profileImageUrl ? (
                                  <img 
                                    src={profileImageUrl}
                                    alt="Profile"
                                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover"
                                    onError={(e) => {
                                      console.error('❌ Profile modal image failed to load:', {
                                        imageUrl: profileImageUrl,
                                        originalImage: profileData.profileImages[0],
                                        profileId: profileData.id
                                      });
                                      (e.target as HTMLImageElement).style.display = 'none';
                                      ((e.target as HTMLImageElement).nextSibling as HTMLElement).style.display = 'flex';
                                    }}
                                    onLoad={() => {
                                      console.log('✅ Profile modal image loaded successfully:', {
                                        imageUrl: profileImageUrl,
                                        originalImage: profileData.profileImages[0],
                                        profileId: profileData.id
                                      });
                                    }}
                                  />
                                ) : null
                              })()}
                              <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 flex items-center justify-center text-white text-2xl font-bold ${(() => {
                                if (profileData.profileImages && profileData.profileImages.length > 0) {
                                  const firstImage = profileData.profileImages[0]
                                  if (firstImage.startsWith('http') || firstImage.startsWith('data:image/svg+xml')) {
                                    return firstImage.startsWith('data:image/svg+xml') ? '' : 'hidden'
                                  } else {
                                    return 'hidden'
                                  }
                                }
                                return ''
                              })()}`}>
                                <User className="h-10 w-10 sm:h-12 sm:w-12" />
                              </div>
                            </div>
                            {profileData.membership?.tier && profileData.membership.tier !== 'member' && (
                              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs shadow-lg">
                                <Crown className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 mb-1">
                              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                                {profileData.nickname || `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim() || (profileData as any).username || 'Unknown'}
                              </h1>
                              {profileData.membership?.tier && (
                                <Badge className={`bg-gradient-to-r ${
                                  profileData.membership.tier === 'platinum' ? 'from-purple-500 to-pink-500' :
                                  profileData.membership.tier === 'diamond' ? 'from-blue-500 to-cyan-500' :
                                  profileData.membership.tier === 'vip2' ? 'from-red-500 to-orange-500' :
                                  profileData.membership.tier === 'vip1' ? 'from-orange-500 to-yellow-500' :
                                  profileData.membership.tier === 'vip' ? 'from-purple-400 to-pink-400' :
                                  profileData.membership.tier === 'gold' ? 'from-yellow-500 to-amber-500' :
                                  profileData.membership.tier === 'silver' ? 'from-gray-400 to-slate-400' :
                                  'from-gray-300 to-gray-400'
                                } text-white text-xs`}>
                                  <Crown className="h-3 w-3 mr-1" />
                                  {profileData.membership.tier === 'platinum' ? 'PLATINUM' :
                                   profileData.membership.tier === 'diamond' ? 'DIAMOND' :
                                   profileData.membership.tier === 'vip2' ? 'VIP2' :
                                   profileData.membership.tier === 'vip1' ? 'VIP1' :
                                   profileData.membership.tier === 'vip' ? 'VIP' :
                                   profileData.membership.tier === 'gold' ? 'GOLD' :
                                   profileData.membership.tier === 'silver' ? 'SILVER' :
                                   'MEMBER'}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-sm text-gray-600">
                              {profileData.location && (
                                <span className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  {profileData.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                    
                        {/* Bio Section */}
                        {profileData.bio && (
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-gray-800">เกี่ยวกับฉัน</h3>
                            <p className="text-gray-600 leading-relaxed">{profileData.bio}</p>
                          </div>
                        )}
                        
                        {/* Interests Section */}
                        {profileData.interests && profileData.interests.length > 0 && (
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-gray-800">ความสนใจ</h3>
                            <div className="flex flex-wrap gap-2">
                              {formatInterests(profileData.interests).map((interest: string, index: number) => (
                                <Badge key={index} variant="secondary" className="px-3 py-1 bg-white/80 text-gray-700 border-gray-300 shadow-sm">
                                  {interest}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Images Section */}
                        {profileData.profileImages && profileData.profileImages.length > 1 && !profileData.profileImages.every(img => img.startsWith('data:image/svg+xml')) && (
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-gray-800">รูปภาพ</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                              {profileData.profileImages.slice(1).filter(img => !img.startsWith('data:image/svg+xml')).map((image: string, index: number) => {
                                // สร้าง image URL ที่ถูกต้อง
                                let imageUrl = image
                                if (!image.startsWith('http') && !image.startsWith('data:')) {
                                  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
                                  imageUrl = `${baseUrl}/uploads/profiles/${image}`
                                }
                                
                                return (
                                <div key={`${profileData.id}-${index}`} className="aspect-square rounded-lg overflow-hidden shadow-lg">
                                  <img 
                                    src={imageUrl}
                                    alt={`${profileData.nickname || profileData.firstName} ${index + 2}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      console.error('❌ Profile modal gallery image failed to load:', {
                                        imageUrl: imageUrl,
                                        originalImage: image,
                                        profileId: profileData.id
                                      });
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                    onLoad={() => {
                                      console.log('✅ Profile modal gallery image loaded successfully:', {
                                        imageUrl: imageUrl,
                                        originalImage: image,
                                        profileId: profileData.id
                                      });
                                    }}
                                  />
                                </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                        
                        {/* Additional Profile Information */}
                        <div className="space-y-4">
                          {/* Personal Information */}
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-gray-800">ข้อมูลส่วนตัว</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="flex items-center space-x-2">
                                <User className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-600">เพศ: {translateGender(profileData.gender)}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <GraduationCap className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-600">การศึกษา: {safeDisplay(profileData.education) || 'ยังไม่ระบุ'}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Briefcase className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-600">อาชีพ: {safeDisplay(profileData.occupation) || 'ยังไม่ระบุ'}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Church className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-600">ศาสนา: {safeDisplay(profileData.religion) || 'ยังไม่ระบุ'}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Languages className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-600">ภาษา: {profileData.languages ? (Array.isArray(profileData.languages) ? profileData.languages.join(', ') : safeDisplay(profileData.languages)) : 'ยังไม่ระบุ'}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Lifestyle Information */}
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-gray-800">ไลฟ์สไตล์</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="flex items-center space-x-2">
                                <Cigarette className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-600">สูบบุหรี่: {safeDisplay(profileData.smoking) || 'ยังไม่ระบุ'}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Wine className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-600">ดื่มแอลกอฮอล์: {safeDisplay(profileData.drinking) || 'ยังไม่ระบุ'}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Dumbbell className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-600">ออกกำลังกาย: {safeDisplay(profileData.exercise) || 'ยังไม่ระบุ'}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Utensils className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-600">อาหาร: {safeDisplay(profileData.diet) || 'ยังไม่ระบุ'}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Additional Information */}
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-gray-800">ข้อมูลเพิ่มเติม</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="flex items-center space-x-2">
                                <Heart className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-600">ความสัมพันธ์ที่ต้องการ: {translateRelationship(safeDisplay(profileData.lookingFor))}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <PawPrint className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-600">สัตว์เลี้ยง: {safeDisplay(profileData.pets) || 'ยังไม่ระบุ'}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Building className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-600">ที่อยู่อาศัย: {safeDisplay(profileData.livingSituation) || 'ยังไม่ระบุ'}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Baby className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-600">ต้องการมีลูก: {safeDisplay(profileData.wantChildren) || 'ยังไม่ระบุ'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* No Data State */}
                    {!loadingProfileData && !profileData && (
                      <div className="text-center py-12">
                        <User className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600">ไม่สามารถโหลดข้อมูลโปรไฟล์ได้</p>
                      </div>
                    )}
                    
                    
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        onLoginSuccess={handleLoginSuccess}
      />
      {/* Create Private Room Modal */}
      <CreatePrivateRoomModal
        isOpen={showCreateRoomModal}
        onClose={() => setShowCreateRoomModal(false)}
        onCreateRoom={handleCreatePrivateRoom}
        currentUser={user}
      />
      {/* New Private Chat Modal */}
      {user && (
        <NewPrivateChatModal
          isOpen={showNewPrivateChatModal}
          onClose={() => setShowNewPrivateChatModal(false)}
          currentUser={user}
          onStartChat={handleStartPrivateChat}
          existingChats={privateChats}
        />
      )}
      
    </div>
  )
}

export default App
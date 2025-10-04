import { useState, useEffect, useRef, Suspense, lazy } from 'react'

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
import IdleWarningModal from './components/IdleWarningModal'
import { DataCacheProvider } from './hooks/useGlobalCache'
import { useRealTimeUpdate, useNotificationUpdates } from './hooks/useRealTimeUpdates'
import { getProfileImageUrl, getMainProfileImage } from './utils/profileImageUtils'
import socketManager from './services/socketManager'
import autoRefreshManager from './services/autoRefreshManager'

// Lazy load heavy components with type assertions
const MembershipDashboard = lazy(() => import('./components/MembershipDashboard.jsx')) as any
const MembershipPlans = lazy(() => import('./components/MembershipPlans.jsx')) as any
const CoinShop = lazy(() => import('./components/CoinShop.jsx')) as any
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
const HeartVote = lazy(() => import('./components/HeartVote.jsx')) as any
const VoteRanking = lazy(() => import('./components/VoteRanking.jsx')) as any
const VoteRankingMini = lazy(() => import('./components/VoteRankingMini.jsx')) as any
import ErrorBoundary from './components/ErrorBoundary.jsx'
const TopVotedCarousel = lazy(() => import('./components/TopVotedCarousel.jsx')) as any
import { useAuth } from './contexts/AuthContext'
import { membershipAPI } from './services/membershipAPI'
import { paymentAPI } from './services/paymentAPI'
import { useToast, ToastProvider } from './components/ui/toast'
import MaintenanceMode from './components/MaintenanceMode'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faSearch, 
  faHeart, 
  faComments, 
  faUser, 
  faGem,
  faBell,
  faShoppingCart,
  faTrophy
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
  Baby,
  Star,
  Coins,
  Trophy
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
  gender?: string
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
  username?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  occupation?: string
  weight?: string
  relationshipStatus?: string
}

// Sample profile data - Not used in production, kept for reference
// @ts-ignore - Unused variable kept for reference
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
  const { user, login, logout, showIdleWarning, dismissIdleWarning } = useAuth()
  const { success, error, warning, ToastContainer } = useToast()
  const { updateNotification } = useNotificationUpdates()

  const [activeTab, setActiveTab] = useState<'discover' | 'matches' | 'messages' | 'ranking' | 'membership' | 'profile' | 'payment'>('discover')
  
  // Vote ranking profile navigation states
  const [selectedVoteUser, setSelectedVoteUser] = useState<any>(null)
  const [showVoteUserProfile, setShowVoteUserProfile] = useState(false)
  
  // Real-time event handlers
  useRealTimeUpdate('userLoggedIn', (data) => {
    console.log('User logged in:', data);
    // อัปเดต UI โดยไม่ต้องรีเฟรชหน้าเว็บ
    success('เข้าสู่ระบบสำเร็จ');
    
    // อัปเดต state ทันที
    setIsAuthenticated(true);
    
    // รีเฟรชข้อมูลผู้ใช้ในหน้าแรกหลังจาก login (ใช้ setTimeout เพื่อหลีกเลี่ยง performance warning)
    if (activeTab === 'discover') {
      console.log('🔄 Refreshing user data after login...');
      // ใช้ setTimeout เพื่อให้ UI อัปเดตก่อน แล้วค่อยโหลดข้อมูล
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refreshUserData'));
      }, 100);
    }
    
    // อัปเดตข้อมูลที่เกี่ยวข้อง
    setTimeout(() => {
      // โหลดข้อมูล liked users
      fetchLikedUsers();
      // โหลดข้อมูลแชทส่วนตัว
      fetchPrivateChats();
      // รีเฟรชข้อมูล Premium users
      window.dispatchEvent(new CustomEvent('refreshPremiumUsers'));
    }, 200);
  });

  useRealTimeUpdate('userLoggedOut', (data) => {
    console.log('User logged out:', data);
    // อัปเดต UI โดยไม่ต้องรีเฟรชหน้าเว็บ
    success('ออกจากระบบสำเร็จ');
    
    // อัปเดต state ทันที
    setIsAuthenticated(false);
    
    // ล้างข้อมูลที่เกี่ยวข้อง
    setLikedProfiles(new Set());
    setPrivateChats([]);
    setSelectedProfile(null);
    setShowProfileModal(false);
    
    // ล้าง localStorage
    localStorage.removeItem('likedUsers');
    localStorage.removeItem('privateChats');
  });

  useRealTimeUpdate('profileImageUpdated', (data) => {
    console.log('Profile image updated:', data);
    // อัปเดต avatar ใน header โดยไม่ต้องรีเฟรชหน้าเว็บ
    const avatarElement = document.querySelector('[data-avatar-user-id]');
    if (avatarElement && data.userId === user?._id) {
      // Trigger re-render ของ avatar component
      window.dispatchEvent(new CustomEvent('avatarUpdate', { detail: data }));
    }
  });

  useRealTimeUpdate('newNotification', (notification) => {
    console.log('New notification received:', notification);
    updateNotification(notification);
    // แสดง toast notification
    success(notification.message || 'มีการแจ้งเตือนใหม่');
  });

  
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

  // Function to handle vote user profile navigation
  const handleVoteUserProfileClick = (userData: any) => {
    console.log('🔍 Opening vote user profile:', userData)
    console.log('🔍 userData keys:', Object.keys(userData || {}))
    console.log('🔍 userData._id:', userData?._id)
    console.log('🔍 userData.candidateId:', userData?.candidateId)
    console.log('🔍 userData.displayName:', userData?.displayName)
    console.log('🔍 userData.profileImages:', userData?.profileImages)
    
    if (!userData || !userData._id) {
      console.error('❌ Invalid userData:', userData)
      return
    }
    
    // ใช้ getMainProfileImage เหมือน premium cards
    const mainImageIndex = userData?.mainProfileImageIndex || 0;
    const imageUrl = getMainProfileImage(
      userData?.profileImages || [], 
      mainImageIndex, 
      userData._id || userData.candidateId
    );
    
    console.log('🔍 Main image URL:', imageUrl)
    
    // สร้างข้อมูลโปรไฟล์ในรูปแบบที่ handleViewProfile ต้องการ
    const profileData = {
      id: userData._id,
      name: userData.displayName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'ไม่ระบุชื่อ',
      age: userData.age || (userData.dateOfBirth ? new Date().getFullYear() - new Date(userData.dateOfBirth).getFullYear() : 'N/A'),
      location: userData.location || 'ไม่ระบุ',
      distance: 'Popular Vote',
      bio: userData.bio || '',
      interests: Array.isArray(userData.interests)
        ? userData.interests.map((it: any) => it?.category || it?.name || `${it}`).filter(Boolean)
        : [],
      images: userData.profileImages || [], // ใช้ profileImages เดิม
      verified: userData.isVerified || false,
      online: userData.isOnline || false,
      lastActive: userData.lastActive,
      membershipTier: userData.membership?.tier || userData.membershipTier || 'member',
      membership: {
        tier: userData.membership?.tier || userData.membershipTier || 'member'
      }
    }
    
    console.log('🔍 Processed profileData for handleViewProfile:', profileData)
    
    // ใช้ handleViewProfile ที่มีการตรวจสอบสิทธิ์แทนการเปิด modal โดยตรง
    handleViewProfile(profileData);
  }

  // Function to close vote user profile
  const handleCloseVoteUserProfile = () => {
    setSelectedVoteUser(null)
    setShowVoteUserProfile(false)
  }

  // Function to handle tab change with immediate scroll behavior
  const handleTabChange = (newTab: 'discover' | 'matches' | 'messages' | 'membership' | 'profile' | 'payment') => {
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
  
  // Debug wrapper for setShowProfileModal
  const setShowProfileModalDebug = (value: boolean) => {
    console.log('🔄 setShowProfileModal called:', { value, stack: new Error().stack });
    setShowProfileModal(value);
  }
  const [profileAlert, setProfileAlert] = useState<{message: string, type: 'error' | 'warning' | 'success'} | null>(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  
  // Payment confirmation modal
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState<{
    targetUserId: string;
    targetUserName: string;
    currentCoins: number;
    imageId: string;
  } | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [forceUpdate, setForceUpdate] = useState(0)
  const [preventModalClose, setPreventModalClose] = useState(false)
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
    if (!user?._id) {
      console.log('🔔 No user ID, skipping notification fetch');
      return;
    }
    
    try {
      setIsLoadingNotifications(true)
      const token = localStorage.getItem('token')
      
      // ใช้ VITE_API_BASE_URL แทน VITE_API_URL
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
      const url = `${apiUrl}/api/notifications/${user._id}`
      
      console.log('🔔 Fetching notifications from:', url);
      console.log('🔔 User ID:', user._id);
      console.log('🔔 Token exists:', !!token);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('🔔 Response status:', response.status);
      console.log('🔔 Response headers:', Object.fromEntries(response.headers.entries()));
      
      // เพิ่มการตรวจสอบ response type
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('❌ Expected JSON but got:', contentType, text.substring(0, 200))
        throw new Error(`Expected JSON response but got ${contentType}`)
      }
      
      if (response.ok) {
        const data = await response.json()
        console.log('🔔 Notifications API response:', data);
        
        if (data.success) {
          const notifications = data.data.notifications || [];
          const unreadCount = data.data.unreadCount || 0;
          
          console.log('🔔 Setting notifications:', notifications.length, 'items');
          console.log('🔔 Setting unread count:', unreadCount);
          
          setNotifications(notifications)
          setUnreadCount(unreadCount)
        } else {
          console.error('❌ API returned success: false:', data.message);
          setNotifications([])
          setUnreadCount(0)
        }
      } else {
        console.error('❌ Notifications API error:', response.status, response.statusText)
        // ไม่ให้ notifications error รบกวนการทำงานของระบบ
        setNotifications([])
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('❌ Error fetching notifications:', error)
      // ไม่ให้ notifications error รบกวนการทำงานของระบบ
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setIsLoadingNotifications(false)
    }
  }

  const clearAllNotifications = async () => {
    if (!user?._id) return
    
    try {
      const token = localStorage.getItem('token')
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
      const response = await fetch(`${apiUrl}/api/notifications/${user._id}/clear`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          console.log('🗑️ All notifications cleared successfully')
          // ล้างการแจ้งเตือนใน state
          setNotifications([])
          setUnreadCount(0)
          success('ล้างการแจ้งเตือนเรียบร้อยแล้ว')
        }
      } else {
        console.error('❌ Clear notifications API error:', response.status, response.statusText)
        error('เกิดข้อผิดพลาดในการล้างการแจ้งเตือน')
      }
    } catch (err) {
      console.error('❌ Error clearing notifications:', err)
      error('เกิดข้อผิดพลาดในการล้างการแจ้งเตือน')
    }
  }
  
  // Polling for new notifications
  useEffect(() => {
    if (!user?._id) return
    
    // Fetch initial notifications
    fetchNotifications()
    
    // Load purchased images when user data is available
    loadPurchasedImages(user._id)
    
    // Set up polling every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    
    return () => clearInterval(interval)
  }, [user?._id])

  // Listen for real-time notification updates from auto refresh
  useEffect(() => {
    const handleNotificationsUpdated = (event: CustomEvent) => {
      const { notifications } = event.detail;
      console.log('🔄 App: Received notifications update from auto refresh:', notifications);
      
      if (notifications && Array.isArray(notifications)) {
        setNotifications(notifications);
        const unreadCount = notifications.filter(n => !n.isRead).length;
        setUnreadCount(unreadCount);
      }
    };

    window.addEventListener('notificationsUpdated', handleNotificationsUpdated as EventListener);
    
    return () => {
      window.removeEventListener('notificationsUpdated', handleNotificationsUpdated as EventListener);
    };
  }, [])

  // Start auto refresh for notifications when user is logged in
  useEffect(() => {
    if (!user?._id) return;

    console.log('🚀 App: Starting notification auto refresh for user:', user._id);
    
    // Start notification refresh only (not full chat refresh)
    autoRefreshManager.startRefresh('notifications', () => {
      autoRefreshManager.refreshNotifications(user._id);
    }, 'normal');

    return () => {
      // Stop notification refresh when component unmounts
      autoRefreshManager.stopRefresh('notifications');
    };
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
    const { type, data, createdAt, isRead, title, message } = notification
    
    const handleNotificationClick = async () => {
      // Mark notification as read
      if (!isRead) {
        try {
          const token = localStorage.getItem('token')
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/notifications/${user?._id}/mark-read`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              notificationIds: [notification._id],
              notificationType: type // ส่งประเภทแจ้งเตือนไปด้วย
            })
          })
          
          if (response.ok) {
            // สำหรับแชทข้อความ ให้ลบออกจากรายการเลย
            if (type === 'private_message') {
              setNotifications(prev => prev.filter(n => n._id !== notification._id))
              setUnreadCount(prev => Math.max(0, prev - 1))
            } else {
              // สำหรับการแจ้งเตือนอื่นๆ ให้ mark เป็น read
              setNotifications(prev => prev.map(n => 
                n._id === notification._id ? { ...n, isRead: true } : n
              ))
              setUnreadCount(prev => Math.max(0, prev - 1))
            }
          }
        } catch (error) {
          console.error('Error marking notification as read:', error)
        }
      }
      
      if (type === 'private_message' && data.chatRoom) {
        // ไปหน้าแชทส่วนตัว
        setActiveTab('messages')
        setChatType('private')
        
        // ใช้ chat ID โดยตรงจาก notification
        console.log('🔍 Using chat ID from notification:', data.chatRoom)
        
        // ดึงข้อมูล private chats ล่าสุดก่อน แล้วค้นหาแชทด้วย chat ID
        fetchPrivateChats().then(() => {
          // รอให้ state อัปเดต แล้วค้นหาแชท
          setTimeout(() => {
            console.log('📋 Available private chats:', privateChats.map(chat => ({
              id: chat.id,
              otherUserId: chat.otherUser?._id,
              otherUserName: chat.otherUser?.displayName || chat.otherUser?.firstName
            })))
            
            // ค้นหาแชทด้วย chat ID ที่แน่นอน
            const existingChat = privateChats.find(chat => chat.id === data.chatRoom)
            
            if (existingChat) {
              // ถ้าพบแชท ให้เลือกแชทนั้น
              console.log('✅ Found existing chat by ID:', existingChat.id)
              setSelectedPrivateChat(existingChat)
              setPrivateChatView('chat')
            } else {
              // ถ้าไม่พบแชท ให้ลองค้นหาด้วย sender ID (fallback)
              console.log('❌ Chat not found by ID, trying by sender ID')
              const fallbackChat = privateChats.find(chat => chat.otherUser?._id === data.senderId)
              
              if (fallbackChat) {
                console.log('✅ Found fallback chat:', fallbackChat.id)
                setSelectedPrivateChat(fallbackChat)
                setPrivateChatView('chat')
              } else {
                // ถ้าไม่พบเลย ให้เริ่มแชทใหม่
                console.log('❌ No chat found, creating new one')
                const targetUser = {
                  _id: data.senderId,
                  displayName: data.senderName || 'Unknown User',
                  profileImages: data.senderProfileImage ? [data.senderProfileImage] : []
                }
                handleStartPrivateChat(targetUser)
              }
            }
          }, 100) // รอ 100ms ให้ state อัปเดต
        }).catch(error => {
          console.error('❌ Error fetching private chats:', error)
          // ถ้าเกิดข้อผิดพลาด ให้ลองสร้างแชทใหม่
          const targetUser = {
            _id: data.senderId,
            displayName: data.senderName || 'Unknown User',
            profileImages: data.senderProfileImage ? [data.senderProfileImage] : []
          }
          handleStartPrivateChat(targetUser)
        })
        
        // ปิด notifications dropdown
        setShowNotificationDropdown(false)
      } else if (type === 'public_chat_reply' && data.chatRoom) {
        // ไปหน้าแชทสาธารณะ
        setActiveTab('messages')
        setChatType('public')
        setSelectedRoomId(data.chatRoom._id)
        
        // ปิด notifications dropdown
        setShowNotificationDropdown(false)
      } else if (type === 'profile_like' || type === 'profile_star') {
        // ไปหน้าโปรไฟล์ของผู้ที่กดไลค์/ดาว
        if (data.voterId) {
          const profileData = {
            id: data.voterId,
            name: data.voterName || 'Unknown User',
            images: data.voterProfileImage ? [data.voterProfileImage] : [],
            verified: false,
            online: false,
            membershipTier: 'member'
          }
          
          handleViewProfile(profileData)
        }
        
        // ปิด notifications dropdown
        setShowNotificationDropdown(false)
      } else if (type === 'blur_payment') {
        // ไปหน้าโปรไฟล์ของผู้ที่ซื้อภาพ
        if (data.buyerId) {
          const profileData = {
            id: data.buyerId,
            name: data.buyerName || 'Unknown User',
            images: data.buyerProfileImage ? [data.buyerProfileImage] : [],
            verified: false,
            online: false,
            membershipTier: 'member'
          }
          
          handleViewProfile(profileData)
        }
        
        // ปิด notifications dropdown
        setShowNotificationDropdown(false)
      } else if (type === 'wheel_prize') {
        // ไปหน้า premium/membership เพื่อดูรางวัล
        setActiveTab('membership')
        
        // ปิด notifications dropdown
        setShowNotificationDropdown(false)
      }
    }
    
    if (type === 'private_message') {
      return (
        <div 
          key={notification._id} 
          onClick={handleNotificationClick}
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
          key={notification._id} 
          onClick={handleNotificationClick}
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
          key={notification._id} 
          onClick={handleNotificationClick}
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
          key={notification._id} 
          onClick={handleNotificationClick}
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
          key={notification._id} 
          onClick={handleNotificationClick}
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
          key={notification._id} 
          onClick={handleNotificationClick}
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
  
  // Chat countdown states
  const [chatCountdown, setChatCountdown] = useState<number | null>(null)
  const [isStartingChat, setIsStartingChat] = useState(false)
  
  // Profile details view state
  const [showProfileDetails, setShowProfileDetails] = useState(false)
  
  // Profile data state
  const [profileData, setProfileData] = useState<any>(null)
  
  
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
        console.log('📋 Raw private chats from API:', result.data.privateChats);
        // ลบแชทซ้ำก่อนตั้งค่า
        const uniqueChats = removeDuplicateChatsFromArray(result.data.privateChats);
        console.log('📋 Unique chats after deduplication:', uniqueChats);
        setPrivateChats(uniqueChats);
        console.log('🔄 Updated private chats from API:', uniqueChats.length);
      } else {
        console.error('❌ Invalid response format:', result);
        console.log('📋 Response structure:', {
          success: result.success,
          hasData: !!result.data,
          hasPrivateChats: !!(result.data && result.data.privateChats),
          dataKeys: result.data ? Object.keys(result.data) : 'no data'
        });
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

  // ฟังก์ชันตรวจสอบว่า socket พร้อมใช้งานหรือไม่
  const isSocketReady = () => {
    const ready = !!(window.socketManager && window.socketManager.socket && window.socketManager.socket.connected);
    if (!ready) {
      console.warn('⚠️ Socket not ready:', {
        hasWindowSocketManager: !!window.socketManager,
        hasSocket: !!(window.socketManager && window.socketManager.socket),
        socketConnected: !!(window.socketManager && window.socketManager.socket && window.socketManager.socket.connected),
        socketId: window.socketManager?.socket?.id
      });
    }
    return ready;
  };

  // ฟังก์ชันอัปเดตรายการแชทฝั่งผู้รับเมื่อมีข้อความใหม่
  const updateRecipientChatList = async (chatId, message, senderId) => {
    try {
      console.log('🔄 Updating recipient chat list for chat:', chatId);
      
      // ส่ง notification ไปยังผู้รับข้อความ
      if (isSocketReady()) {
        window.socketManager?.socket.emit('update-recipient-chat-list', {
          chatId,
          message,
          senderId
        });
        console.log('✅ Socket notification sent successfully');
      } else {
        console.warn('⚠️ No socket available for real-time messaging');
      }
    } catch (error) {
      console.error('❌ Error updating recipient chat list:', error);
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
      showWebappNotification('เข้าสู่ระบบในโหมด Developer สำเร็จ! คุณสามารถเข้าถึงระบบได้แล้ว แต่หน้า Maintenance Mode ยังคงแสดงอยู่', 'success');
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
      
      // Initialize socket manager for real-time features
      console.log('🔌 Initializing socket manager...');
      window.socketManager = socketManager;
      console.log('🔌 window.socketManager set:', !!window.socketManager);
      
      // Add global debug function
      (window as any).debugSocket = () => {
        console.log('🔍 Socket Debug Info:', {
          hasWindowSocketManager: !!window.socketManager,
          hasSocket: !!(window.socketManager && window.socketManager.socket),
          socketConnected: !!(window.socketManager && window.socketManager.socket && window.socketManager.socket.connected),
          socketId: window.socketManager?.socket?.id,
          socketManagerInstance: window.socketManager,
          socketInstance: window.socketManager?.socket
        });
      };
      
      // Add global function to check if socket is ready (for components to use)
      (window as any).isSocketReady = () => {
        return !!(window.socketManager && window.socketManager.socket && window.socketManager.socket.connected);
      };
      
      // Connect to socket server and wait for connection
      const connectSocket = async () => {
        try {
          const socket = await socketManager.connect(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000');
          console.log('✅ Socket manager connected successfully:', socket?.id);
          
          // Ensure socket is available on window.socketManager
          if (window.socketManager) {
            window.socketManager.socket = socket;
          }
          console.log('✅ Socket assigned to window.socketManager.socket');
        } catch (error) {
          console.error('❌ Failed to connect socket manager:', error);
          // Still assign socketManager even if connection fails for retry capability
          if (window.socketManager) {
            window.socketManager.socket = null;
          }
        }
      };
      
      connectSocket();
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

  // จัดการข้อความที่ได้รับจาก Socket
  // Removed duplicate listener - handled in the main private chat useEffect below

  // Cleanup socket connection on component unmount
  useEffect(() => {
    return () => {
      if (window.socketManager) {
        console.log('🔌 Cleaning up socket manager on unmount...');
        window.socketManager.disconnect();
        window.socketManager = undefined;
      }
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // ไม่ให้ปิด modal ถ้ากำลังป้องกันการปิด
      if (preventModalClose) {
        console.log('🔒 Preventing modal close due to preventModalClose flag');
        return;
      }
      
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
  }, [showProfileDropdown, showNotificationDropdown, preventModalClose])

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
          .filter(u => {
            // กรองผู้ใช้ปัจจุบันออก
            const currentUserId = user?._id || user?.id;
            const userId = u._id || (u as any)?.id;
            return currentUserId !== userId;
          })
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
    
    // เพิ่มการจัดการ event refreshPremiumUsers
    const handleRefreshPremiumUsers = () => {
      console.log('🔄 Event received: refreshPremiumUsers');
      loadPremium();
    };
    
    window.addEventListener('refreshPremiumUsers', handleRefreshPremiumUsers);
    
    return () => { 
      isCancelled = true;
      window.removeEventListener('refreshPremiumUsers', handleRefreshPremiumUsers);
    }
  }, [user]) // เพิ่ม user เป็น dependency เพื่อให้โหลดใหม่เมื่อ user เปลี่ยน

  // Function to fetch premium users (extracted from useEffect)
  // const fetchPremiumUsers = async () => {
  //   try {
  //     const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
  //     const token = sessionStorage.getItem('token');
  //     
  //     const res = await fetch(`${base}/api/profile/premium?limit=50`, {
  //       headers: {
  //         'Content-Type': 'application/json',
  //         ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  //       }
  //     })
  //     if (!res.ok) return
  //     const data = await res.json()
  //     const users: PublicUser[] = data?.data?.users || []
  //     // Ensure final ordering and cap
  //     const sorted = users
  //       .sort((a: PublicUser, b: PublicUser) => {
  //         const ai = premiumTierOrder.indexOf((a?.membership?.tier || '') as string)
  //         const bi = premiumTierOrder.indexOf((b?.membership?.tier || '') as string)
  //         return ai - bi
  //       })
  //       .slice(0, 50)
  //     setPremiumUsers(sorted)
  //   } catch (_) {
  //     // ignore errors for this section
  //   }
  // }

  // Helper function for webapp notification with duplicate prevention
  const notificationHistory = useRef(new Set<string>());
  const showWebappNotification = (message: string, type: 'warning' | 'error' | 'success' = 'warning') => {
    // สร้าง unique key สำหรับ notification
    const notificationKey = `${message}_${type}_${Date.now()}`;
    
    // ตรวจสอบว่า notification นี้แสดงไปแล้วหรือไม่ใน 3 วินาทีที่ผ่านมา
    const now = Date.now();
    const recentNotifications = Array.from(notificationHistory.current).filter(key => {
      const timestamp = parseInt(key.split('_').pop() || '0');
      return now - timestamp < 3000; // 3 วินาที
    });
    
    const isDuplicate = recentNotifications.some(key => 
      key.startsWith(`${message}_${type}_`)
    );
    
    if (isDuplicate) {
      console.log('🔔 Duplicate notification prevented:', { message, type });
      return;
    }
    
    // เพิ่ม notification ลงใน history
    notificationHistory.current.add(notificationKey);
    
    // ลบ notification เก่าออกจาก history (เก็บแค่ 10 รายการล่าสุด)
    if (notificationHistory.current.size > 10) {
      const oldest = Array.from(notificationHistory.current).sort()[0];
      notificationHistory.current.delete(oldest);
    }
    
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
  const [visibleCount, setVisibleCount] = useState(12)
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

  // อัปเดตสถานะ online/offline แบบ real-time สำหรับ Discover tab
  useEffect(() => {
    if (activeTab !== 'discover') return;

    const interval = setInterval(async () => {
      try {
        const token = sessionStorage.getItem('token');
        if (!token) return;

        // ดึงข้อมูลผู้ใช้ที่ออนไลน์ล่าสุด
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/users/online-status`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const onlineUsers = result.data.onlineUsers || [];
            console.log(`🟢 Found ${onlineUsers.length} online users for Discover`);
            
            // อัปเดตสถานะ online ใน allUsers
            setAllUsers(prevUsers => 
              prevUsers.map(user => {
                const isOnline = onlineUsers.some(onlineUser => 
                  onlineUser._id === user._id
                );
                
                return {
                  ...user,
                  isOnline: isOnline,
                  lastActive: (user as any).lastActive
                };
              })
            );
          }
        }
      } catch (error) {
        console.error('❌ Error updating online status for Discover:', error);
      }
    }, 10000); // อัปเดตทุก 10 วินาที

    return () => clearInterval(interval);
  }, [activeTab])
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    let isCancelled = false
    const loadAllUsers = async () => {
      try {
        setIsLoadingAllUsers(true)
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
        const res = await fetch(`${base}/api/profile/discover?limit=50`, {
          headers: {
            'Content-Type': 'application/json',
            ...(sessionStorage.getItem('token') ? { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` } : {})
          }
        })
        if (!res.ok) return
        const data = await res.json()
        const users: PublicUser[] = data?.data?.users || []
        const pagination = data?.data?.pagination || {}
        
        // กรองผู้ใช้ปัจจุบันออก
        const filteredUsers = users.filter(u => {
          const currentUserId = user?._id || user?.id;
          const userId = u._id || (u as any)?.id;
          return currentUserId !== userId;
        });
        
        // Debug: แสดงข้อมูลที่ได้รับ
        console.log('🔍 Discover API Response:', {
          totalUsers: users.length,
          filteredUsers: filteredUsers.length,
          userTiers: filteredUsers.map(u => ({ username: (u as any).username, tier: (u as any).membershipTier || u.membership?.tier })),
          pagination
        });
        
        // Debug: แสดงจำนวนการ์ดที่แสดง
        console.log(`📊 Cards to display: ${Math.min(visibleCount, filteredUsers.length)} of ${filteredUsers.length} total users`);
        
        if (!isCancelled) {
          setAllUsers(filteredUsers)
          setHasMoreUsers(pagination.page < pagination.pages)
          setCurrentPage(1)
          setVisibleCount(filteredUsers.length)
        }
      } catch (_) {
        // ignore errors for this section
      } finally {
        if (!isCancelled) setIsLoadingAllUsers(false)
      }
    }

    loadAllUsers()

    // เพิ่มการจัดการ event refreshUserData
    const handleRefreshUserData = () => {
      console.log('🔄 Event received: refreshUserData');
      // ใช้ requestIdleCallback หรือ setTimeout เพื่อหลีกเลี่ยง performance warning
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
          loadAllUsers();
        });
      } else {
        setTimeout(() => {
          loadAllUsers();
        }, 0);
      }
    };

    window.addEventListener('refreshUserData', handleRefreshUserData);

    // จัดการ event การอัพเกรดสมาชิกแบบ real-time
    const handleUserUpgraded = (event) => {
      const upgradeData = event.detail;
      console.log('🎉 User upgraded event received:', upgradeData);

      // แสดงการแจ้งเตือนให้ผู้ใช้ทราบว่าอัพเกรดสำเร็จแล้ว
      if (upgradeData.userId === user?._id || upgradeData.userId === user?.id) {
        // อัปเดตข้อมูลผู้ใช้ใน AuthContext
        if (window.updateAuthContext) {
          const updatedUser = { ...user };

          if (upgradeData.tier) {
            updatedUser.membership = {
              ...updatedUser.membership,
              tier: upgradeData.tier
            };
          }

          if (upgradeData.coinsAdded) {
            updatedUser.coins = (updatedUser.coins || 0) + upgradeData.coinsAdded;
          }

          if (upgradeData.votePointsAdded) {
            updatedUser.votePoints = (updatedUser.votePoints || 0) + upgradeData.votePointsAdded;
          }

          window.updateAuthContext(updatedUser);
          console.log('✅ AuthContext updated with upgrade data');
        }

        // แสดง toast notification หรือ popup แจ้งเตือนผู้ใช้ว่าสิทธิประโยชน์ได้รับการอัปเดตแล้ว
        // แสดง toast notification แจ้งเตือนผู้ใช้ว่าสิทธิประโยชน์ได้รับการอัปเดตแล้ว
        success({
          title: 'อัพเกรดสำเร็จ! 🎉',
          description: `ยินดีด้วย! คุณได้รับสิทธิพิเศษของ ${upgradeData.tier} แล้ว`
        });
      }
    };

    const handleMembershipUpdated = (event) => {
      const membershipData = event.detail;
      console.log('👑 Membership updated event received:', membershipData);

      // อัปเดตข้อมูลสมาชิกแบบ real-time
      if (membershipData.userId === user?._id || membershipData.userId === user?.id) {
        if (window.updateAuthContext) {
          const updatedUser = {
            ...user,
            membership: {
              ...user.membership,
              tier: membershipData.newTier
            }
          };
          window.updateAuthContext(updatedUser);
        }
      }
    };

    window.addEventListener('userUpgraded', handleUserUpgraded);
    window.addEventListener('membershipUpdated', handleMembershipUpdated);

    return () => {
      isCancelled = true
      window.removeEventListener('refreshUserData', handleRefreshUserData);
      window.removeEventListener('userUpgraded', handleUserUpgraded);
      window.removeEventListener('membershipUpdated', handleMembershipUpdated);
    }
  }, [user]) // เพิ่ม user เป็น dependency เพื่อให้โหลดใหม่เมื่อ user เปลี่ยน

  
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
            const mainImageIndex = data?.data?.profile?.mainProfileImageIndex || 0
            const img = (data?.data?.profile?.profileImages?.[mainImageIndex] as string | undefined) || ''
            console.log('🎯 App.tsx header avatar updated');
            // ตรวจสอบว่าไม่ใช่รูป default
            if (img && typeof img === 'string' && !img.startsWith('data:image/svg+xml')) {
              const avatarUrl = getProfileImageUrl(img, user?._id || user?.id)
              setAvatarUrl(avatarUrl)
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
        const mainImageIndex = event.detail.mainProfileImageIndex || 0;
        const img = profileImages?.[mainImageIndex];
        console.log('🎯 App.tsx event update');
              if (img && typeof img === 'string' && !img.startsWith('data:image/svg+xml')) {
          const avatarUrl = getProfileImageUrl(img, userId)
          setAvatarUrl(avatarUrl);
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

  // ฟัง event สำหรับการอัปเดตสเตตัสข้อความ (เพิ่ม debouncing)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const handleMessageStatusUpdate = (event: CustomEvent) => {
      // Clear previous timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Debounce the handler
      timeoutId = setTimeout(() => {
        const { messageId, status } = event.detail;
        console.log('📬 Message status update event:', { messageId, status });
        // handleMessageStatusUpdate(messageId, status);
      }, 100); // 100ms debounce
    };

    window.addEventListener('message-status-update', handleMessageStatusUpdate as EventListener);
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener('message-status-update', handleMessageStatusUpdate as EventListener);
    };
  }, [selectedPrivateChat]);
  
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
          userId: profileId
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
    
    console.log('🔍 canViewProfile check:', { 
      currentUserTier, 
      targetUserTier, 
      currentLevel, 
      targetLevel, 
      canView: currentLevel >= targetLevel,
      rule: 'Role ที่สูงกว่าสามารถดูโปรไฟล์ของ Role ที่ต่ำกว่าได้เสมอ'
    });
    
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


  // ฟังก์ชันจัดการการจ่ายเหรียญเพื่อดูรูปเบลอ
  const handleBlurPayment = async (targetUserId: string, targetUserName: string, imageId?: string) => {
    try {
      // ตรวจสอบข้อมูลพื้นฐาน
      if (!targetUserId || !targetUserName) {
        showWebappNotification('ข้อมูลโปรไฟล์ไม่ครบถ้วน');
        return;
      }
      
      if (!imageId || imageId === 'unknown') {
        showWebappNotification('ไม่พบข้อมูลรูปภาพที่ต้องการซื้อ');
        return;
      }

      // ตรวจสอบว่าซื้อรูปนี้แล้วหรือยัง
      const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
      const hasAlreadyPurchased = currentUser.purchasedImages?.some((purchased: any) => 
        purchased.profileId === targetUserId && purchased.imageId === imageId
      );

      if (hasAlreadyPurchased) {
        showWebappNotification('คุณได้ซื้อรูปนี้แล้ว');
        return;
      }
      
      // ตรวจสอบ token
      const token = sessionStorage.getItem('token');
      if (!token) {
        showWebappNotification('กรุณาเข้าสู่ระบบก่อน');
        return;
      }

      // ดึงข้อมูลเหรียญล่าสุดจาก API
      console.log('💰 Checking user coins before payment...');
      
      try {
        const userResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!userResponse.ok) {
          throw new Error(`Failed to fetch user data: ${userResponse.status}`);
        }
        
        const userData = await userResponse.json();
        const userCoins = userData.data?.user?.coins || 0;
        
        console.log('💰 Current user coins:', userCoins);
        console.log('💰 Full user data:', userData);
        
        if (userCoins < 10000) {
          showWebappNotification(`เหรียญไม่เพียงพอ ต้องการ 10,000 เหรียญ (ปัจจุบัน: ${userCoins.toLocaleString()})`);
          return;
        }
      } catch (error) {
        console.error('❌ Error fetching user coins:', error);
        showWebappNotification('ไม่สามารถตรวจสอบยอดเหรียญได้');
        return;
      }

      // ดึงข้อมูลเหรียญอีกครั้งสำหรับ confirmation
      const userResponse2 = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const userData2 = await userResponse2.json();
      const currentCoins = userData2.data?.user?.coins || 0;
      
      // แสดง confirmation modal
      setPaymentDetails({
        targetUserId,
        targetUserName,
        currentCoins,
        imageId: imageId || 'unknown' // ใช้ imageId ที่ส่งมา หรือค่า default
      });
      setShowPaymentConfirmation(true);

    } catch (error) {
      console.error('Error preparing blur payment:', error);
      showWebappNotification('❌ เกิดข้อผิดพลาดในการเตรียมข้อมูล');
    }
  };

  // ฟังก์ชันโหลดข้อมูลการซื้อรูปจาก API
  const loadPurchasedImages = async (userId: string) => {
    try {
      console.log('🔄 Loading purchased images for user:', userId);
      
      const token = sessionStorage.getItem('token');
      if (!token) {
        console.error('❌ No token found');
        return;
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/blur/transactions/${userId}?type=purchases`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Loaded purchased images from API:', data);
        
        if (data.success && data.data.transactions) {
          // แปลงข้อมูล transactions เป็นรูปแบบ purchasedImages
          const purchasedImages = data.data.transactions.map((transaction: any) => ({
            profileId: transaction.imageOwner.toString(),
            imageId: transaction.imageId,
            purchasedAt: transaction.purchasedAt
          }));
          
          console.log('🔄 Converting to purchasedImages format:', purchasedImages);
          
          // อัพเดทข้อมูลผู้ใช้ใน sessionStorage
          const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
          const updatedUser = {
            ...currentUser,
            purchasedImages: purchasedImages
          };
          
          sessionStorage.setItem('user', JSON.stringify(updatedUser));
          console.log('✅ Updated user with purchased images from API');
        }
      } else {
        console.error('❌ Failed to load purchased images:', response.status);
      }
    } catch (error) {
      console.error('❌ Error loading purchased images:', error);
    }
  };

  // ฟังก์ชันจ่ายเงินจริงหลังจากยืนยัน
  const confirmBlurPayment = async () => {
    console.log('🟢 confirmBlurPayment function called');
    if (!paymentDetails) {
      console.log('❌ No payment details');
      return;
    }

    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        showWebappNotification('กรุณาเข้าสู่ระบบก่อน');
        return;
      }

      // ไม่ปิด payment confirmation modal ทันที ให้แสดงสถานะ loading
      showWebappNotification('⏳ กำลังดำเนินการจ่ายเหรียญ...', 'warning');
      
      // ป้องกันไม่ให้ modal ปิดในระหว่างจ่ายเหรียญ
      setPreventModalClose(true);

      // ตรวจสอบข้อมูลก่อนส่ง
      if (!paymentDetails.targetUserId || !paymentDetails.imageId) {
        showWebappNotification('ข้อมูลการจ่ายเงินไม่ครบถ้วน');
        return;
      }
      
      console.log('💳 Sending payment request:', {
        targetUserId: paymentDetails.targetUserId,
        imageId: paymentDetails.imageId,
        amount: 10000,
        url: `${import.meta.env.VITE_API_BASE_URL}/api/blur/pay`
      });

      // เรียก API เพื่อจ่ายเหรียญ
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/blur/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUserId: paymentDetails.targetUserId,
          imageId: paymentDetails.imageId,
          amount: 10000
        })
      });

      // ตรวจสอบ response status
      if (!response.ok) {
        console.error('❌ API Response Error:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url
        });
        
        if (response.status === 404) {
          showWebappNotification('ไม่พบ API endpoint กรุณาติดต่อผู้ดูแลระบบ');
          return;
        }
        
        const errorResult = await response.json().catch(() => ({ message: 'Unknown error' }));
        showWebappNotification(`❌ เกิดข้อผิดพลาด: ${errorResult.message || 'ไม่สามารถเชื่อมต่อได้'}`);
        return;
      }
      
      const result = await response.json();
      
      console.log('💳 Payment response:', {
        status: response.status,
        ok: response.ok,
        result
      });

      if (result.success) {
        // อัพเดทข้อมูลผู้ใช้ใน sessionStorage
        const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
        const targetUserId = paymentDetails.targetUserId;
        const targetUserName = paymentDetails.targetUserName;
        
        // ตรวจสอบว่าได้จ่ายให้คนนี้แล้วหรือไม่
        // const alreadyPurchased = currentUser.blurImagePurchases?.some((id: any) => 
        //   id?.toString() === targetUserId?.toString()
        // );
        
        // เพิ่มข้อมูลการซื้อรูปเฉพาะ
        // บันทึกเฉพาะรูปที่ซื้อจริง
        const purchasedImage = {
          profileId: targetUserId,
          imageId: result.data.imageId || 'unknown',
          purchasedAt: new Date().toISOString()
        };
        
        const updatedUser = { 
          ...currentUser, 
          coins: result.data.remainingCoins,
          purchasedImages: [...(currentUser.purchasedImages || []), purchasedImage]
        };
        sessionStorage.setItem('user', JSON.stringify(updatedUser));
        
        console.log('✅ Payment successful, updated user coins:', updatedUser.coins);
        console.log('✅ Updated purchasedImages:', updatedUser.purchasedImages);
        
        // แสดงข้อความสำเร็จ
        showWebappNotification(`✅ จ่ายเหรียญสำเร็จ! คุณสามารถดูรูปของ ${targetUserName} ได้แล้ว`);
        
        // อัพเดทข้อมูลการซื้อรูปใน sessionStorage ทันที
        const updatedPurchasedImages = [...(currentUser.purchasedImages || []), purchasedImage];
        const updatedUserWithPurchases = {
          ...updatedUser,
          purchasedImages: updatedPurchasedImages
        };
        sessionStorage.setItem('user', JSON.stringify(updatedUserWithPurchases));

        // โหลดข้อมูลการซื้อรูปใหม่จาก API เพื่อให้แน่ใจว่าข้อมูลเป็นปัจจุบัน
        await loadPurchasedImages(currentUser.id);
        
        // อัพเดท selectedProfile เพื่อให้รูปภาพแสดงไม่เบลอทันที
        if (selectedProfile && selectedProfile.id === targetUserId) {
          console.log('🔄 Updating selectedProfile to trigger re-render');
          // บังคับให้ React re-render โดยการสร้าง object ใหม่
          setSelectedProfile(prevProfile => {
            if (!prevProfile) return null;
            return {
              ...prevProfile,
              // เพิ่ม timestamp เพื่อบังคับให้ re-render
              _paymentUpdated: Date.now(),
              // อัพเดทข้อมูลการซื้อ
              _purchasedImages: updatedUser.purchasedImages
            };
          });
          
          console.log('✅ Profile updated, staying in profile modal');
        } else {
          console.log('❌ No selectedProfile or ID mismatch:', { 
            selectedProfileId: selectedProfile?.id, 
            targetUserId,
            hasSelectedProfile: !!selectedProfile
          });
        }
        
        // ไม่รีโหลดหน้า ยังคงอยู่ในโปรไฟล์เดิม
        
        // ปิด payment confirmation modal หลังจากใช้งานข้อมูลเสร็จ
        console.log('🔄 Closing payment confirmation modal');
        setShowPaymentConfirmation(false);
        setPaymentDetails(null);
        
        // อัพเดท sessionStorage เพื่อให้ข้อมูลเป็นปัจจุบัน
        sessionStorage.setItem('user', JSON.stringify(updatedUser));
        
        // บังคับให้ re-render UI เพื่อแสดงภาพทันที
        setTimeout(() => {
          setForceUpdate(prev => prev + 1);
        }, 100);
        
        console.log('✅ Payment confirmation modal closed, profile modal should remain open');
        
        // ปิดการป้องกันการปิด modal หลังจ่ายเหรียญเสร็จ
        setTimeout(() => {
          setPreventModalClose(false);
          console.log('🔒 Ensuring profile modal stays open after payment');
          if (!showProfileModal) {
            console.log('🔄 Re-opening profile modal that was accidentally closed');
            setShowProfileModalDebug(true);
          }
        }, 200);
        
      } else {
        console.error('❌ Payment failed:', result);
        showWebappNotification(`❌ ${result.message || 'เกิดข้อผิดพลาดในการจ่ายเหรียญ'}`);
        
        // ปิดการป้องกันการปิด modal เมื่อจ่ายเงินไม่สำเร็จ
        setPreventModalClose(false);
        
        // แสดงรายละเอียดข้อผิดพลาด
        if (result.data) {
          console.log('💰 Payment failure details:', {
            currentCoins: result.data.currentCoins,
            required: result.data.required
          });
        }
      }

    } catch (error) {
      console.error('Error paying for blur image:', error);
      showWebappNotification('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setPaymentDetails(null);
    }
  };

  // ฟังก์ชันยกเลิกการจ่ายเหรียญ
  const cancelBlurPayment = () => {
    console.log('🔴 cancelBlurPayment function called');
    
    // ปิดการป้องกันการปิด modal เมื่อยกเลิกการจ่ายเงิน
    setPreventModalClose(false);
    
    setShowPaymentConfirmation(false);
    setPaymentDetails(null);
    showWebappNotification('ยกเลิกการจ่ายเหรียญแล้ว', 'warning');
  };

  // ฟังก์ชันจัดการการดูโปรไฟล์
  const handleViewProfile = async (profileData: any) => {
    if (!user) {
      console.error('❌ ไม่มีผู้ใช้ที่เข้าสู่ระบบ');
      setProfileAlert({ message: 'กรุณาเข้าสู่ระบบก่อน', type: 'error' });
      setTimeout(() => setProfileAlert(null), 3000);
      return;
    }
    
    // ตรวจสอบ Role ก่อนดูโปรไฟล์
    const currentUserTier = user.membership?.tier || 'member';
    const targetUserTier = profileData.membershipTier || 'member';
    
    console.log('🔍 Profile access check:', {
      currentUser: user.username || user.email,
      currentUserTier,
      targetUser: profileData.name,
      targetUserTier,
      profileData
    });
    
    if (!canViewProfile(currentUserTier, targetUserTier)) {
      console.log('🚫 Cannot view profile - Role restriction:', { currentUserTier, targetUserTier });
      showWebappNotification('ไม่สามารถดูโปรไฟล์ที่ระดับสูงกว่าได้');
      return;
    }
    
    console.log('👤 Viewing profile details:', profileData.name);
    
    // เปิด profile modal โดยตรง
    openProfileModal(profileData);
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
  const handleDeletePrivateChat = async (chatId: string) => {
    console.log('🗑️ Deleting private chat:', chatId);
    
    try {
      // เรียก API เพื่อ soft delete แชท
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/messages/private-chat/${chatId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Chat soft deleted successfully:', result);
        
        // รีเฟรชข้อมูล private chats จาก API
        await fetchPrivateChats();
        
        // ถ้าแชทที่ลบเป็นแชทที่เลือกอยู่ ให้กลับไปที่รายการ
        if (selectedPrivateChat?.id === chatId) {
          setPrivateChatView('list');
          setSelectedPrivateChat(null);
        }
        
        console.log('✅ Private chat deleted successfully and data refreshed');
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to delete chat:', errorData);
        
        // ถ้า API ล้มเหลว ให้ลบออกจาก UI แบบเดิม (fallback)
        setPrivateChats(prev => {
          const updatedChats = prev.filter(chat => chat.id !== chatId);
          saveChatsToStorage(updatedChats);
          return updatedChats;
        });
        
        if (selectedPrivateChat?.id === chatId) {
          setPrivateChatView('list');
          setSelectedPrivateChat(null);
        }
      }
    } catch (error) {
      console.error('❌ Error deleting chat:', error);
      
      // ถ้าเกิดข้อผิดพลาด ให้ลบออกจาก UI แบบเดิม (fallback)
      setPrivateChats(prev => {
        const updatedChats = prev.filter(chat => chat.id !== chatId);
        saveChatsToStorage(updatedChats);
        return updatedChats;
      });
      
      if (selectedPrivateChat?.id === chatId) {
        setPrivateChatView('list');
        setSelectedPrivateChat(null);
      }
    }
    console.log(`แชท ${chatId} ถูกลบสำหรับผู้ใช้ ${user?._id || user?.id}`);
  };




  const handleSendPrivateMessage = async (messageData: any) => {
    if (!selectedPrivateChat || !user) return;
    
    console.log('📤 handleSendPrivateMessage called:', {
      messageData,
      selectedPrivateChat: selectedPrivateChat,
      chatId: selectedPrivateChat.id
    });

    // จัดการ reaction updates
    if (messageData === 'reaction-updated') {
      console.log('💖 Reaction update received:', messageData);
      return;
    }

    // จัดการ reaction updates จาก Socket.IO
    if (messageData && messageData.type === 'reaction-updated') {
      console.log('💖 Reaction update received from Socket.IO:', messageData);
      
      // อัปเดตข้อความที่มี reaction เปลี่ยนแปลง
      setSelectedPrivateChat((prev: any) => ({
        ...prev,
        messages: prev.messages.map((msg: any) => {
          if (msg._id === messageData.messageId) {
            return {
              ...msg,
              reactions: messageData.reactions
            };
          }
          return msg;
        })
      }));

      // อัปเดตรายการแชทด้วย reaction ที่เปลี่ยนแปลง
      setPrivateChats(prev => {
        const updatedChats = prev.map(chat => {
          if (chat.id === selectedPrivateChat.id) {
            return {
              ...chat,
              messages: chat.messages.map((msg: any) => {
                if (msg._id === messageData.messageId) {
                  return {
                    ...msg,
                    reactions: messageData.reactions
                  };
                }
                return msg;
              })
            };
          }
          return chat;
        });
        saveChatsToStorage(updatedChats);
        return updatedChats;
      });
      
      return;
    }
    
    // สร้างข้อความชั่วคราวเพื่อแสดงใน UI ทันที
    const tempMessage = {
      _id: `temp-${Date.now()}-${Math.random()}`,
      content: messageData.content,
      senderId: user._id || user.id,
      sender: {
        _id: user._id || user.id,
        username: user.username,
        displayName: user.displayName || user.firstName,
        profileImages: user.profileImages || []
      },
      chatRoomId: selectedPrivateChat.id,
      createdAt: new Date().toISOString(),
      isTemporary: true,
      isDelivered: false,
      replyTo: messageData.replyTo,
      image: messageData.image
    };

    // แสดงข้อความชั่วคราวใน UI ทันที
    setSelectedPrivateChat((prev: any) => ({
      ...prev,
      messages: [...(prev.messages || []), tempMessage],
      lastMessage: tempMessage
    }));

    // อัปเดตรายการแชทด้วยข้อความชั่วคราว
    setPrivateChats(prev => {
      const updatedChats = prev.map(chat => {
        if (chat.id === selectedPrivateChat.id) {
          return { 
            ...chat, 
            messages: [...(chat.messages || []), tempMessage], 
            lastMessage: tempMessage 
          };
        }
        return chat;
      });
      saveChatsToStorage(updatedChats);
      return updatedChats;
    });
    
    // ส่งข้อความไปยัง backend
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: messageData.content,
          senderId: user._id || user.id,
          chatRoomId: selectedPrivateChat.id,
          messageType: 'text',
          replyToId: messageData.replyTo || null
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
          ...tempMessage,
          _id: result.data._id,
          isDelivered: true,
          isTemporary: false,
          senderId: user._id || user.id,
          sender: result.data.sender || {
            _id: user._id || user.id,
            username: user.username,
            displayName: user.displayName || user.firstName,
            profileImages: user.profileImages || []
          }
        };

        // แทนที่ข้อความชั่วคราวด้วยข้อความจริง
        setSelectedPrivateChat((prev: any) => ({
          ...prev,
          messages: prev.messages.map((msg: any) => 
            msg._id === tempMessage._id ? updatedMessage : msg
          ),
          lastMessage: updatedMessage
        }));

        // อัปเดตรายการแชทด้วยข้อความจริง
        setPrivateChats(prev => {
          const updatedChats = prev.map(chat => {
            if (chat.id === selectedPrivateChat.id) {
              return {
                ...chat,
                messages: chat.messages.map((msg: any) => 
                  msg._id === tempMessage._id ? updatedMessage : msg
                ),
                lastMessage: updatedMessage
              };
            }
            return chat;
          });
          saveChatsToStorage(updatedChats);
          return updatedChats;
        });
      }
    } catch (error) {
      console.error('Error sending message to backend:', error);
      
      // แสดงข้อความ error ใน UI
      if (showWebappNotification) {
        showWebappNotification('ไม่สามารถส่งข้อความได้ กรุณาลองใหม่อีกครั้ง', 'error');
      }
      
      // ลบข้อความชั่วคราวออก
      setSelectedPrivateChat((prev: any) => ({
        ...prev,
        messages: prev.messages.filter((msg: any) => msg._id !== tempMessage._id)
      }));

      setPrivateChats(prev => {
        const updatedChats = prev.map(chat => {
          if (chat.id === selectedPrivateChat.id) {
            return {
              ...chat,
              messages: chat.messages.filter((msg: any) => msg._id !== tempMessage._id)
            };
          }
          return chat;
        });
        saveChatsToStorage(updatedChats);
        return updatedChats;
      });
    }

    // ถ้าเป็นข้อความของตัวเองจาก Socket.IO ให้แทนที่ข้อความชั่วคราว
    if (messageData.socketMessage && messageData.messageType === 'own-message') {
      console.log('📨 Received own message from Socket.IO:', messageData.socketMessage);
      
      // อัปเดตแชทที่เลือกด้วยข้อความจริงแทนที่ข้อความชั่วคราว
      setSelectedPrivateChat((prev: any) => {
        const existingMessages = prev.messages || [];
        
        // ตรวจสอบว่ามีข้อความนี้อยู่แล้วหรือไม่ (อาจมาจาก custom event)
        const isDuplicate = existingMessages.some((msg: any) => 
          msg._id === messageData.socketMessage._id || 
          (msg.content === messageData.socketMessage.content && msg.senderId === messageData.socketMessage.senderId && !msg.isTemporary)
        );
        
        if (isDuplicate) {
          console.log('📨 Duplicate own message detected, skipping');
          return prev;
        }
        
        const updatedMessages = existingMessages.map((msg: any) => {
          // หาข้อความชั่วคราวที่มีเนื้อหาเดียวกันและเป็นของตัวเอง
          if (msg.isTemporary && 
              msg.content === messageData.socketMessage.content && 
              msg.senderId === messageData.socketMessage.senderId) {
            console.log('📨 Replacing temporary message with real message');
            return messageData.socketMessage; // แทนที่ข้อความชั่วคราวด้วยข้อความจริง
          }
          return msg;
        }).filter((msg: any, index: number, arr: any[]) => {
          // ลบ duplicate messages โดยใช้ _id และ content เป็น unique identifier
          return arr.findIndex(m => m._id === msg._id && m.content === msg.content) === index;
        });
        
        return {
          ...prev,
          messages: updatedMessages,
          lastMessage: messageData.socketMessage
        };
      });
      
      // อัปเดตรายการแชทด้วยข้อความจริง
      setPrivateChats(prev => {
        const updatedChats = prev.map(chat => {
          if (chat.id === selectedPrivateChat.id) {
            const updatedMessages = chat.messages?.map((msg: any) => {
              // หาข้อความชั่วคราวที่มีเนื้อหาเดียวกันและเป็นของตัวเอง
              if (msg.isTemporary && 
                  msg.content === messageData.socketMessage.content && 
                  msg.senderId === messageData.socketMessage.senderId) {
                return messageData.socketMessage; // แทนที่ข้อความชั่วคราวด้วยข้อความจริง
              }
              return msg;
            }) || [];
            
            return { ...chat, messages: updatedMessages, lastMessage: messageData.socketMessage };
          }
          return chat;
        });
        saveChatsToStorage(updatedChats);
        return updatedChats;
      });
      
      return; // ไม่ต้องส่งไปยัง API เพราะส่งผ่าน Socket.IO แล้ว
    }
    
    // ถ้าเป็นข้อความจาก Socket.IO ให้ใช้ข้อมูลจาก Socket.IO
    if (messageData.socketMessage && messageData.messageType === 'socket-message') {
      console.log('📨 Received message from Socket.IO:', messageData.socketMessage);
      
      // ตรวจสอบว่าข้อความนี้มีอยู่แล้วหรือไม่ (เพื่อป้องกัน duplicate)
      const messageExists = selectedPrivateChat.messages?.some((msg: any) => 
        msg._id === messageData.socketMessage._id || 
        (msg.content === messageData.socketMessage.content && 
         msg.senderId === messageData.socketMessage.senderId && 
         Math.abs(new Date(msg.timestamp).getTime() - new Date(messageData.socketMessage.timestamp).getTime()) < 1000)
      );
      
      if (messageExists) {
        console.log('📨 Message already exists, skipping duplicate');
        return;
      }
      
      // อัปเดตแชทที่เลือกด้วยข้อความจาก Socket.IO
      setSelectedPrivateChat((prev: any) => ({
        ...prev,
        messages: [...(prev.messages || []), messageData.socketMessage],
        lastMessage: messageData.socketMessage
      }));
      
      // อัปเดตรายการแชทด้วยข้อความจาก Socket.IO
      setPrivateChats(prev => {
        const updatedChats = prev.map(chat => 
          chat.id === selectedPrivateChat.id 
            ? { ...chat, messages: [...(chat.messages || []), messageData.socketMessage], lastMessage: messageData.socketMessage }
            : chat
        );
        saveChatsToStorage(updatedChats);
        return updatedChats;
      });
      
      return; // ไม่ต้องส่งไปยัง API เพราะส่งผ่าน Socket.IO แล้ว
    }
    
    // ใช้ข้อความชั่วคราวที่สร้างไว้แล้ว
    console.log('💬 Sending private message via API:', tempMessage);
    console.log('🔍 Selected chat:', selectedPrivateChat.id);
    
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
          content: messageData.content,
          senderId: user._id || user.id,
          chatRoomId: selectedPrivateChat.id,
          messageType: 'text',
          replyToId: messageData.replyTo || null
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Message sent to backend successfully:', result);
      
      // อัปเดตข้อความด้วย ID จาก backend และข้อมูล sender ที่ถูกต้อง
      if (result.success && result.data) {
        // ส่ง notification ไปยังผู้รับข้อความ (ถ้ามี Socket.IO)
        if (isSocketReady()) {
          const otherUser = selectedPrivateChat.otherUser || selectedPrivateChat.participants?.find(p => p._id !== user._id);
          if (otherUser) {
            window.socketManager?.socket.emit('private-message-sent', {
              chatId: selectedPrivateChat.id,
              message: result.data,
              recipientId: otherUser._id,
              senderId: user._id
            });
            console.log('✅ Private message socket notification sent');
          }
        } else {
          console.warn('⚠️ No socket available for real-time messaging');
        }
        
        // อัปเดตรายการแชทฝั่งผู้รับ
        const otherUser = selectedPrivateChat.otherUser || selectedPrivateChat.participants?.find(p => p._id !== user._id);
        if (otherUser) {
          await updateRecipientChatList(selectedPrivateChat.id, result.data, user._id);
          
          // ส่ง API call ไปยัง backend เพื่ออัปเดตรายการแชทฝั่งผู้รับ
          try {
            const updateResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/messages/update-recipient-chat-list`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                chatId: selectedPrivateChat.id,
                message: result.data,
                senderId: user._id,
                recipientId: otherUser._id
              })
            });
            
            if (updateResponse.ok) {
              console.log('✅ Recipient chat list updated successfully');
            } else {
              console.error('❌ Failed to update recipient chat list');
            }
          } catch (error) {
            console.error('❌ Error updating recipient chat list:', error);
          }

          // ส่ง notification ไปยังผู้รับข้อความ
          if (isSocketReady()) {
            window.socketManager?.socket.emit('private-chat-notification', {
              senderId: user._id,
              recipientId: otherUser._id,
              message: result.data
            });
            console.log('✅ Private chat notification sent');
          } else {
            console.warn('⚠️ No socket available for real-time messaging');
          }
        }
        
        const updatedMessage = {
          ...tempMessage,
          _id: result.data._id,
          isDelivered: true,
          isTemporary: false, // ไม่ใช่ข้อความชั่วคราวแล้ว
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
            msg._id === tempMessage._id 
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
                    msg._id === tempMessage._id 
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
          msg._id === tempMessage._id 
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

  // เพิ่ม real-time listener สำหรับ private chat messages
  useEffect(() => {
    const handlePrivateChatMessage = (event: CustomEvent) => {
      const { chatRoomId, message, messageType } = event.detail;
      console.log('📨 Global private chat message received:', { chatRoomId, message, messageType });
      console.log('📨 Current selectedPrivateChat:', selectedPrivateChat?.id);
      console.log('📨 Message chatRoomId:', chatRoomId);
      
      // ถ้าเป็นข้อความจาก socket ให้จัดการต่างออกไป
      if (messageType === 'socket-message') {
        console.log('📨 Processing socket message for private chat');
        console.log('📨 Message details:', {
          id: message._id,
          content: message.content?.substring(0, 50),
          sender: message.sender?.displayName || message.sender?.username,
          chatRoom: chatRoomId,
          timestamp: message.createdAt
        });
        
        // อัปเดต private chats ถ้าข้อความมาจากแชทที่กำลังดู
        if (selectedPrivateChat && selectedPrivateChat.id === chatRoomId) {
          console.log('📨 Updating current selected chat with socket message');
          console.log('📨 Previous messages count:', selectedPrivateChat.messages?.length);
          
          setSelectedPrivateChat((prev: any) => {
            if (!prev) {
              console.log('⚠️ No previous chat state');
              return prev;
            }
            
            const existingMessages = prev.messages || [];
            
            // ลบข้อความชั่วคราว (temporary message) ที่มี content เดียวกัน
            const filteredMessages = existingMessages.filter((msg: any) => {
              if (msg.isTemporary && msg.content === message.content) {
                console.log('🗑️ Removing temporary message:', msg._id);
                return false;
              }
              return true;
            });
            
            // เช็ค duplicate โดยดูจาก message ID
            const isDuplicate = filteredMessages.some((msg: any) => 
              msg._id === message._id
            );
            
            if (isDuplicate) {
              console.log('📨 Duplicate socket message detected (by ID), skipping');
              return prev;
            }
            
            console.log('✅ Adding new socket message to chat');
            console.log('📨 New messages count:', filteredMessages.length + 1);
            
            const updatedChat = {
              ...prev,
              messages: [...filteredMessages, message],
              lastMessage: message
            };
            
            // Force re-render โดยสร้าง object ใหม่
            return JSON.parse(JSON.stringify(updatedChat));
          });
        } else {
          console.log('⏭️ Message not for current chat or no chat selected');
        }
        
        // อัปเดตรายการแชทด้วยข้อความใหม่
        setPrivateChats(prev => prev.map(chat => 
          chat.id === chatRoomId 
            ? { ...chat, lastMessage: message }
            : chat
        ));
        
        return;
      }
      
      // จัดการข้อความปกติ (HTTP API)
      // อัปเดต private chats ถ้าข้อความมาจากแชทที่กำลังดู
      if (selectedPrivateChat && selectedPrivateChat.id === chatRoomId) {
        console.log('📨 Updating current selected chat with new message');
        // อัปเดต selectedPrivateChat โดยตรงเพื่อป้องกัน duplicate
        setSelectedPrivateChat((prev: any) => {
          const existingMessages = prev.messages || [];
          const isDuplicate = existingMessages.some((msg: any) => 
            msg._id === message._id || 
            (msg.content === message.content && msg.senderId === message.senderId)
          );
          
          if (isDuplicate) {
            console.log('📨 Duplicate message detected in custom event, skipping');
            return prev;
          }
          
          return {
            ...prev,
            messages: [...existingMessages, message],
            lastMessage: message
          };
        });
      } else {
        // อัปเดต unread count สำหรับแชทอื่นๆ
        console.log('📨 Updating unread count for other chats');
        setPrivateChats(prev => prev.map(chat => 
          chat.id === chatRoomId 
            ? { ...chat, lastMessage: message, unreadCount: (chat.unreadCount || 0) + 1 }
            : chat
        ));
      }
    };

    const handleNewPrivateChat = (data: any) => {
      console.log('🆕 New private chat received:', data);
      console.log('🆕 Current user:', user);
      console.log('🆕 Current privateChats:', privateChats.length);
      const { chatRoomId, sender, message } = data;
      
      // สร้าง chat object ใหม่
      const newChat = {
        id: chatRoomId,
        otherUser: {
          _id: sender._id,
          username: sender.username,
          displayName: sender.displayName,
          membershipTier: sender.membershipTier,
          profileImages: sender.profileImages,
          mainProfileImageIndex: sender.mainProfileImageIndex
        },
        lastMessage: message,
        unreadCount: 1,
        isNew: true
      };
      
      // เพิ่มแชทใหม่เข้าไปในรายการ (ใส่ไว้ด้านบนสุด)
      setPrivateChats(prev => {
        // ตรวจสอบว่าแชทนี้มีอยู่แล้วหรือไม่
        const existingChat = prev.find(chat => chat.id === chatRoomId);
        if (existingChat) {
          console.log('📨 Chat already exists, updating instead');
          return prev.map(chat => 
            chat.id === chatRoomId 
              ? { ...chat, lastMessage: message, unreadCount: (chat.unreadCount || 0) + 1 }
              : chat
          );
        }
        
        console.log('🆕 Adding new chat to list');
        return [newChat, ...prev];
      });
      
      // แสดงการแจ้งเตือน (เฉพาะเมื่อเป็นแชทใหม่เท่านั้น)
      if (showWebappNotification) {
        const existingChat = privateChats.find(chat => chat.id === chatRoomId);
        if (!existingChat) {
          showWebappNotification(`${sender.displayName} ส่งข้อความมา`, 'success');
        }
      }
      
      // รีเฟรชรายการแชทส่วนตัวเพื่อให้แน่ใจว่ามีแชทใหม่
      setTimeout(() => {
        console.log('🔄 Refreshing private chats list after new chat');
        fetchPrivateChats();
      }, 1000);
    };

    // ฟัง custom event จาก PrivateChat component
    window.addEventListener('private-chat-message', handlePrivateChatMessage as EventListener);
    
    // ฟัง custom event สำหรับแชทส่วนตัวใหม่จาก PrivateChat component
    const handleNewPrivateChatFromComponent = (event: any) => {
      console.log('🆕 Received new-private-chat from PrivateChat component:', event.detail);
      handleNewPrivateChat(event.detail);
    };
    window.addEventListener('new-private-chat-received', handleNewPrivateChatFromComponent as EventListener);
    
    // ฟัง socket event สำหรับแชทส่วนตัวใหม่
    const setupSocketListener = () => {
      const socket = socketManager.getSocket();
      if (socket) {
        console.log('🔌 Setting up socket listeners on socket:', socket.id);
        socket.on('new-private-chat', handleNewPrivateChat);
        
        // ฟังข้อความใหม่สำหรับ private chat
        socket.on('new-message', (message) => {
          console.log('📨 New private message received:', message);
          
          // ตรวจสอบว่าเป็นข้อความสำหรับแชทปัจจุบันหรือไม่
          if (selectedPrivateChat && message.chatRoom === selectedPrivateChat.id) {
            console.log('📨 Adding message to current private chat');
            setSelectedPrivateChat((prev: any) => ({
              ...prev,
              messages: [...(prev.messages || []), message]
            }));
          }
          
          // อัปเดตรายการแชท
          setPrivateChats((prev: any[]) => 
            prev.map(chat => 
              chat.id === message.chatRoom 
                ? { ...chat, lastMessage: message }
                : chat
            )
          );
        });
        
        // ฟัง event สำหรับการรีเฟรชรายการแชทฝั่งผู้รับ
        socket.on('refresh-private-chat-list', (data) => {
          console.log('🔄 Received refresh-private-chat-list event:', data);
          const { recipientId, chatId, message, senderId } = data;
          
          // ตรวจสอบว่าเป็นผู้รับหรือไม่
          if (recipientId === user?._id) {
            console.log('🎯 This user is the recipient, refreshing chat list');
            
            // ส่ง custom event ไปยัง PrivateChatList component
            window.dispatchEvent(new CustomEvent('refresh-private-chat-list', {
              detail: { recipientId, chatId, message, senderId }
            }));
            
            // รีเฟรชรายการแชทส่วนตัว
            setTimeout(() => {
              fetchPrivateChats();
            }, 500);
          }
        });

        // ฟัง event สำหรับ real-time notifications
        socket.on('newNotification', (notification) => {
          console.log('🔔 Received new notification:', notification);
          
          // ตรวจสอบว่าเป็น notification สำหรับผู้ใช้ปัจจุบันหรือไม่
          if (notification.recipientId === user?._id) {
            console.log('🎯 This notification is for current user');
            
            // อัปเดต notifications state
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            // แสดง webapp notification
            if (showWebappNotification) {
              showWebappNotification(notification.message, 'warning');
            }
            
            // ส่ง custom event ไปยัง components อื่นๆ
            window.dispatchEvent(new CustomEvent('newNotification', {
              detail: notification
            }));
          }
        });
        
        return socket;
      }
      return null;
    };

    // ลองตั้งค่า socket listener ทันที
    let socket = setupSocketListener();
    
    // ถ้า socket ยังไม่มี ให้รอและลองใหม่
    if (!socket) {
      const retryTimeout = setTimeout(() => {
        socket = setupSocketListener();
      }, 1000);
      
      return () => {
        clearTimeout(retryTimeout);
        window.removeEventListener('private-chat-message', handlePrivateChatMessage as EventListener);
        window.removeEventListener('new-private-chat-received', handleNewPrivateChatFromComponent as EventListener);
        if (socket) {
          socket.off('new-private-chat', handleNewPrivateChat);
          socket.off('new-message');
        }
      };
    }
    
    return () => {
      window.removeEventListener('private-chat-message', handlePrivateChatMessage as EventListener);
      window.removeEventListener('new-private-chat-received', handleNewPrivateChatFromComponent as EventListener);
      if (socket) {
        socket.off('new-private-chat', handleNewPrivateChat);
        socket.off('new-message');
      }
    };
  }, [selectedPrivateChat, showWebappNotification]);

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
              const mainImageIndex = data?.data?.profile?.mainProfileImageIndex || 0
              const img = data?.data?.profile?.profileImages?.[mainImageIndex]
              if (img && typeof img === 'string' && !img.startsWith('data:image/svg+xml')) {
                const avatarUrl = getProfileImageUrl(img, user?._id || user?.id)
                setAvatarUrl(avatarUrl)
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
    
    // อัปเดตข้อมูลทันที
    setTimeout(() => {
      fetchLikedUsers();
      fetchPrivateChats();
      if (activeTab === 'discover') {
        window.dispatchEvent(new CustomEvent('refreshUserData'));
      }
      // รีเฟรชข้อมูล Premium users
      window.dispatchEvent(new CustomEvent('refreshPremiumUsers'));
    }, 100);
    
    console.log('✅ User authenticated and login dialog closed');
  }
  
  const handleLogout = () => {
    // Cleanup socket connection
    if (window.socketManager) {
      console.log('🔌 Disconnecting socket manager...');
      window.socketManager.disconnect();
      window.socketManager = undefined;
    }
    
    // ล้างข้อมูลทันที
    setLikedProfiles(new Set());
    setPrivateChats([]);
    setSelectedProfile(null);
    setShowProfileModal(false);
    setIsAuthenticated(false);
    
    // ล้าง localStorage
    localStorage.removeItem('likedUsers');
    localStorage.removeItem('privateChats');
    
    logout()
  }
  
  const openProfileModal = (profile: FeaturedProfile, showDetails: boolean = false) => {
    console.log('🔍 Opening profile modal:', { profile, showDetails });
    setSelectedProfile(profile)
    setActiveImageIndex(0)
    setShowProfileModalDebug(true)
    
    // If showDetails is explicitly requested (from profile button), always show profile details
    if (showDetails) {
      console.log('📋 Setting profile data for detailed view (forced):', profile);
      setProfileData(profile)
      setShowProfileDetails(true)
    } else if (profile.username || profile.firstName || profile.lastName || profile.email || 
        profile.phone || profile.education || profile.occupation || profile.height || 
        profile.weight || profile.relationshipStatus) {
      console.log('📋 Setting profile data for detailed view (auto):', profile);
      setProfileData(profile)
      setShowProfileDetails(true)
    } else {
      console.log('📝 Using basic profile view');
      setProfileData(null)
      setShowProfileDetails(false)
    }
  }
  
  // Payment flow handlers
  const handleNavigateToPayment = (plan: any) => {
    setSelectedPlan(plan)
    setCurrentView('payment')
  }
  
  const handlePaymentSuccess = async (transactionData: any) => {
    setTransactionData(transactionData)
    setCurrentView('success')

    // ถ้าเป็น bypass mode สำหรับ coin package ให้อัปเดตเหรียญและโหวตจริงๆ
    if (transactionData.paymentMethod === 'bypass' && transactionData.tier === 'coin_package') {
      console.log('🪙 Bypass mode - updating coins and vote points...')

      // อัปเดตเหรียญและโหวตให้ผู้ใช้จริงๆ
      if (user && transactionData.plan?.rewards) {
        console.log('🔍 Transaction data received:', JSON.stringify(transactionData, null, 2))
        console.log('🔍 Transaction plan:', JSON.stringify(transactionData.plan, null, 2))
        console.log('🔍 Transaction plan rewards:', JSON.stringify(transactionData.plan.rewards, null, 2))
        console.log('👤 Current user before update:', JSON.stringify(user, null, 2))

        const coinsToAdd = transactionData.plan.rewards.totalCoins || transactionData.plan.rewards.coins || 0
        const votePointsToAdd = transactionData.plan.rewards.votePoints || 0

        console.log('🪙 Coins to add:', coinsToAdd, 'Vote points to add:', votePointsToAdd)
        console.log('👤 User before update - coins:', user.coins, 'votePoints:', user.votePoints)

        // คำนวณเหรียญและคะแนนโหวตใหม่
        const newCoins = (user.coins || 0) + coinsToAdd
        const newVotePoints = (user.votePoints || 0) + votePointsToAdd

        console.log('📊 New calculated values - coins:', newCoins, 'votePoints:', newVotePoints)

        // อัปเดตข้อมูลผู้ใช้ใน memory และ localStorage
        const updatedUser = {
          ...user,
          coins: newCoins,
          votePoints: newVotePoints
        }

        console.log('📊 Final updated user - coins:', updatedUser.coins, 'votePoints:', updatedUser.votePoints)

        // บันทึกข้อมูลผู้ใช้อัปเดตใน localStorage
        localStorage.setItem('user', JSON.stringify(updatedUser))

        // อัปเดตข้อมูลใน AuthContext ถ้ามี method สำหรับการนี้
        if (window.updateAuthContext) {
          console.log('🔄 Updating AuthContext with:', updatedUser)
          window.updateAuthContext(updatedUser)
        }

        // ตรวจสอบการอัปเดตใน AuthContext
        setTimeout(() => {
          console.log('🔍 Checking AuthContext user data after update:', window.authContextUser)
        }, 100)

        console.log(`✅ Added ${coinsToAdd} coins and ${votePointsToAdd} vote points to user`)

        // บันทึกข้อมูลผู้ใช้อัปเดต
        const userDataString = JSON.stringify(updatedUser)
        localStorage.setItem('user', userDataString)
        console.log('💾 Saved to localStorage:', userDataString)

        // ตรวจสอบว่าบันทึกสำเร็จหรือไม่
        const savedUserString = localStorage.getItem('user')
        if (savedUserString) {
          const parsedUser = JSON.parse(savedUserString)
          console.log('🔍 Verified saved user coins:', parsedUser.coins, 'votePoints:', parsedUser.votePoints)

          // เปรียบเทียบกับข้อมูลก่อนบันทึก
          console.log('✅ Verification: Coins increased by', parsedUser.coins - (user.coins || 0))
          console.log('✅ Verification: Vote points increased by', parsedUser.votePoints - (user.votePoints || 0))
        } else {
          console.error('❌ Failed to save user data to localStorage')
        }
      } else {
        console.error('❌ Missing user or plan rewards data')
        console.log('👤 User:', user)
        console.log('📋 Transaction data:', transactionData)
      }

      return
    }

    // Call actual upgrade API สำหรับการชำระเงินจริง
    try {
      // ถ้าเป็น coin package ให้เรียก payment confirmation API
      if (transactionData.tier === 'coin_package') {
        console.log('🪙 Processing coin package payment confirmation...')
        console.log('📋 Transaction data:', transactionData)
        console.log('👤 User data:', { id: user._id || user.id, coins: user.coins, votePoints: user.votePoints })

        // เก็บข้อมูลผู้ใช้ก่อนการอัพเกรดเพื่อ rollback ถ้าจำเป็น
        const userBeforeUpgrade = { ...user }

        try {
          const confirmationResult = await paymentAPI.confirmPayment({
            transactionId: transactionData.transactionId,
            paymentReference: transactionData.transactionId,
            amount: transactionData.amount,
            bankId: 'rabbit_gateway',
            planId: transactionData.planId,
            planTier: transactionData.tier,
            userId: user._id || user.id
          })

          console.log('✅ API Response:', confirmationResult)

          if (confirmationResult.success && confirmationResult.data.upgradeResult) {
            console.log('🎉 Coin package payment confirmed and coins/votes upgraded successfully')
            console.log(`📊 Upgrade result:`, confirmationResult.data.upgradeResult)

            // คำนวณค่าที่ถูกต้องโดยบวกกับข้อมูลปัจจุบัน
            const currentUserData = JSON.parse(localStorage.getItem('user') || '{}')
            const currentCoins = currentUserData.coins || 0
            const currentVotePoints = currentUserData.votePoints || 0

            console.log('🔍 Current localStorage data - coins:', currentCoins, 'votePoints:', currentVotePoints)
            console.log('🔍 API upgrade result - coins:', confirmationResult.data.upgradeResult.totalCoins, 'votePoints:', confirmationResult.data.upgradeResult.totalVotePoints)

            // ใช้ค่าที่มากกว่าเพื่อป้องกันข้อมูลหาย
            const finalCoins = Math.max(currentCoins, confirmationResult.data.upgradeResult.totalCoins)
            const finalVotePoints = Math.max(currentVotePoints, confirmationResult.data.upgradeResult.totalVotePoints)

            // อัปเดตข้อมูลผู้ใช้ใน frontend ด้วยข้อมูลที่ถูกต้อง
            const updatedUser = {
              ...user,
              coins: finalCoins,
              votePoints: finalVotePoints
            }

            console.log('📊 Final user data - coins:', updatedUser.coins, 'votePoints:', updatedUser.votePoints)

            localStorage.setItem('user', JSON.stringify(updatedUser))
            if (window.updateAuthContext) {
              window.updateAuthContext(updatedUser)
            }

            // ส่ง Socket.IO event เพื่อแจ้งเตือนผู้ใช้อัพเกรดสำเร็จ
            if (window.socketManager) {
              window.socketManager.emit('user-upgraded', {
                userId: user._id || user.id,
                tier: transactionData.tier,
                coinsAdded: confirmationResult.data.upgradeResult.coins,
                votePointsAdded: confirmationResult.data.upgradeResult.votePoints,
                transactionId: transactionData.transactionId
              })
            }

          } else {
            console.error('❌ Failed to upgrade coins/votes via API')
            // ไม่ต้อง rollback เพราะยังไม่ได้อัปเดตข้อมูลผู้ใช้ใน localStorage
          }
        } catch (apiError) {
          console.error('❌ API Error during coin package upgrade:', apiError)
          // Rollback: คืนค่าเหรียญและคะแนนโหวตให้ผู้ใช้ใน localStorage
          console.log('🔄 Rolling back user data due to API error...')
          localStorage.setItem('user', JSON.stringify(userBeforeUpgrade))
          if (window.updateAuthContext) {
            window.updateAuthContext(userBeforeUpgrade)
          }
          throw new Error(`การอัพเกรดล้มเหลว: ${apiError instanceof Error ? apiError.message : String(apiError)}`)
        }
      } else {
        // สำหรับ membership upgrade ปกติ
        console.log('👑 Processing membership upgrade...')
        console.log('📋 Transaction data:', transactionData)

        // เก็บข้อมูลผู้ใช้ก่อนการอัพเกรดเพื่อ rollback ถ้าจำเป็น
        const userBeforeUpgrade = { ...user }

        try {
          const upgradeResult = await membershipAPI.upgradeMembership({
            userId: user._id || user.id,
            tier: transactionData.tier,
            paymentMethod: transactionData.paymentMethod,
            transactionId: transactionData.transactionId,
            amount: transactionData.amount,
            currency: transactionData.currency
          })

          if (upgradeResult.success) {
            console.log('✅ Membership upgraded successfully')

            // ส่ง Socket.IO event เพื่อแจ้งเตือนผู้ใช้อัพเกรดสำเร็จ
            if (window.socketManager) {
              window.socketManager.emit('user-upgraded', {
                userId: user._id || user.id,
                tier: transactionData.tier,
                membershipStartDate: upgradeResult.data.startDate,
                membershipEndDate: upgradeResult.data.endDate,
                transactionId: transactionData.transactionId
              })
            }
          } else {
            console.error('❌ Failed to upgrade membership via API')
            throw new Error('การอัพเกรดสมาชิกล้มเหลว')
          }
        } catch (apiError) {
          console.error('❌ API Error during membership upgrade:', apiError)
          // Rollback: คืนค่าระดับสมาชิกให้ผู้ใช้ใน localStorage
          console.log('🔄 Rolling back user membership data due to API error...')
          localStorage.setItem('user', JSON.stringify(userBeforeUpgrade))
          if (window.updateAuthContext) {
            window.updateAuthContext(userBeforeUpgrade)
          }
          throw new Error(`การอัพเกรดสมาชิกล้มเหลว: ${apiError instanceof Error ? apiError.message : String(apiError)}`)
        }
      }
    } catch (error) {
      console.error('Error processing payment confirmation:', error)

      // แจ้งเตือนผู้ใช้ว่ามีปัญหาในการอัพเกรด
      if (error instanceof Error && error.message && error.message.includes('การอัพเกรดล้มเหลว')) {
        // แสดง toast notification หรือ popup แจ้งเตือนผู้ใช้
        console.log('⚠️ แจ้งเตือนผู้ใช้ว่าการอัพเกรดมีปัญหา แต่การชำระเงินสำเร็จแล้ว');

        // แสดง toast notification แจ้งเตือนผู้ใช้ว่าการอัพเกรดมีปัญหา
        warning({
          title: 'การอัพเกรดมีปัญหา ⚠️',
          description: 'การชำระเงินสำเร็จแล้ว แต่การอัพเกรดอาจล่าช้า กรุณาติดต่อฝ่ายสนับสนุนหากไม่ได้รับสิทธิประโยชน์ภายใน 5 นาที'
        });
      }

      // ไม่ต้องแสดง error ให้ผู้ใช้ เพราะ payment สำเร็จแล้ว
      // แต่ควรบันทึก error ไว้สำหรับการตรวจสอบของ admin
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
                              {/* Debug info */}
                              <div className="mt-2 text-xs text-gray-400">
                                <p>User ID: {user?._id || 'N/A'}</p>
                                <p>Notifications: {notifications.length}</p>
                                <p>Unread: {unreadCount}</p>
                              </div>
                            </div>
                          )}
                          
                          {notifications.length > 0 && (
                            <div className="px-4 py-2 border-t border-gray-100 flex gap-2">
                              <button 
                                onClick={fetchNotifications}
                                className="flex-1 text-center text-sm text-pink-600 hover:text-pink-700 font-medium"
                              >
                                รีเฟรช
                              </button>
                              <button 
                                onClick={clearAllNotifications}
                                className="flex-1 text-center text-sm text-red-600 hover:text-red-700 font-medium"
                              >
                                ล้างทั้งหมด
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
      {/* Mobile-First App Interface */}
      <section className="px-1 sm:px-4 lg:px-8 py-1 sm:py-16 md:py-20 relative z-10 pb-10 sm:pb-24">
        <div className="modern-card rounded-xl sm:rounded-3xl shadow-2xl overflow-hidden">
          <Tabs defaultValue="discover" value={activeTab} onValueChange={handleTabChange}>
            {/* Discover Tab - Mobile First */}
            <TabsContent value="discover" className="p-1 sm:p-6 lg:p-8">
              {/* Mobile-First Hero Section - Only for Discover Tab */}
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
                          onClick={() => handleTabChange('discover')}
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
                    {/* Top Voted Users Carousel */}
                    <div className="relative flex justify-center lg:justify-end items-center">
                      <div className="w-full max-w-xs">
                        <Suspense fallback={
                          <div className="w-full max-w-xs mx-auto h-[500px] bg-gradient-to-br from-pink-100 to-purple-100 rounded-3xl flex items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
                          </div>
                        }>
                          <ErrorBoundary>
                            <TopVotedCarousel />
                          </ErrorBoundary>
                        </Suspense>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
              
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
                                  showWebappNotification(`✅ พบผู้ใช้ ${allowedLen} คนที่ตรงกับเงื่อนไขของคุณ!`, 'success')
                                } else {
                                  showWebappNotification('❌ ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข กรุณาลองปรับตัวกรองใหม่', 'warning')
                                }
                              } else {
                                console.error('❌ Search failed:', data.message)
                                showWebappNotification(`❌ การค้นหาล้มเหลว: ${data.message}`, 'error')
                              }
                            } catch (error: any) {
                              console.error('❌ Search error:', error)
                              showWebappNotification(`❌ เกิดข้อผิดพลาดในการค้นหา: ${error.message}`, 'error')
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
                                
                                showWebappNotification(`✅ รีเซ็ตตัวกรองเรียบร้อย! แสดงผู้ใช้ ${allowedLen} คน`, 'success')
                              } else {
                                console.error('❌ Reset failed:', data.message)
                                showWebappNotification(`❌ การรีเซ็ตล้มเหลว: ${data.message}`, 'error')
                              }
                            } catch (error: any) {
                              console.error('❌ Reset error:', error)
                              showWebappNotification(`❌ เกิดข้อผิดพลาดในการรีเซ็ต: ${error.message}`, 'error')
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

              {/* Vote Rankings Section */}
              <div className="mb-8 sm:mb-10">
                <div className="flex justify-center">
                  <div className="w-full max-w-md">
                    <Suspense fallback={<div className="animate-pulse bg-gray-200 h-48 rounded-lg"></div>}>
                      <ErrorBoundary>
                        <VoteRankingMini 
                          voteType="popularity_combined" 
                          limit={5} 
                          onUserProfileClick={handleVoteUserProfileClick}
                        />
                      </ErrorBoundary>
                    </Suspense>
                  </div>
                </div>
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
                    // ใช้ utility function เพื่อสร้าง image URL ที่ถูกต้อง - รองรับรูปเบลอ
                    const mainImageIndex = (u as any)?.mainProfileImageIndex || 0;
                    const mainImage = u?.profileImages?.[mainImageIndex];
                    const displayName = u?.nickname || `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || 'Premium User'
                    const tier: string = (u?.membership?.tier || 'member') as string
                    
                    // ตรวจสอบว่าเป็นรูปเบลอหรือไม่และยังไม่ได้จ่ายเหรียญ
                    const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
                    const profileId = (u as any)?._id?.toString();
                    const mainImageId = (mainImage as any)?._id?.toString() || 'main_image';
                    
                    // ตรวจสอบการซื้อรูปเฉพาะ - เฉพาะรูปนี้เท่านั้น
                    const hasPaidForMainImage = currentUser.purchasedImages?.some((purchased: any) => 
                      purchased.profileId === profileId && purchased.imageId === mainImageId
                    );
                    
                    // ตรวจสอบว่าเป็นรูปเบลอและยังไม่ได้จ่ายเหรียญ
                    const isMainImageBlurred = typeof mainImage === 'object' && (mainImage as any)?.isBlurred && !hasPaidForMainImage;
                    
                    // Debug สำหรับรูปหลัก
                    if (typeof mainImage === 'object' && (mainImage as any)?.isBlurred) {
                      console.log('🔍 Main image blur check:', {
                        profileId,
                        mainImageId,
                        isBlurred: (mainImage as any)?.isBlurred,
                        hasPaidForMainImage,
                        isMainImageBlurred,
                        forceUpdate, // เพิ่ม forceUpdate เพื่อติดตามการ re-render
                        matchingPurchases: currentUser.purchasedImages?.filter((purchased: any) => 
                          purchased.profileId === profileId && purchased.imageId === mainImageId
                        )
                      });
                    }
                    
                    const imageUrl = getMainProfileImage(
                      u?.profileImages || [], 
                      mainImageIndex, 
                      u._id || (u as any)?.id
                    )
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
                            images: (u?.profileImages || []).filter((img: any) => {
                              const imgPath = typeof img === 'string' ? img : img?.url || '';
                              return !imgPath.startsWith('data:image/svg+xml');
                            }),
                            verified: false,
                            online: (u as any)?.isOnline || false,
                            lastActive: (u as any)?.lastActive,
                            membershipTier: u?.membership?.tier || 'member',
                            membership: {
                              tier: u?.membership?.tier || 'member'
                            }
                          };
                          
                          // ใช้ handleViewProfile ที่มีการตรวจสอบสิทธิ์
                          handleViewProfile(modalProfile);
                        }}
                      >
                        <div className="h-48 sm:h-60 md:h-72 overflow-hidden relative">
                          {imageUrl ? (
                            <>
                              <img
                                src={imageUrl}
                                alt={displayName}
                                className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${isMainImageBlurred ? 'filter blur-md' : ''}`}
                                style={{
                                  ...(isMainImageBlurred && { 
                                    filter: 'blur(12px)',
                                    transition: 'filter 0.3s ease'
                                  })
                                }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              {/* Overlay สำหรับรูปเบลอ */}
                              {isMainImageBlurred && (
                                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                                  <div className="w-10 h-10 text-white opacity-60">
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                                      <path d="M12 6c3.79 0 7.17 2.13 8.82 5.5-.59 1.22-1.42 2.27-2.41 3.12l1.41 1.41c1.39-1.23 2.49-2.77 3.18-4.53C21.27 7.11 17 4 12 4c-1.27 0-2.49.2-3.64.57l1.65 1.65C10.66 6.09 11.32 6 12 6zm-1.07 1.14L13 9.21c.57.25 1.03.71 1.28 1.28l2.07 2.07c.08-.34.14-.7.14-1.07C16.5 9.01 14.48 7 12 7c-.37 0-.72.05-1.07.14zM2.01 3.87l2.68 2.68C3.06 7.83 1.77 9.53 1 11.5 2.73 15.89 7 19 12 19c1.52 0 2.98-.29 4.32-.82l3.42 3.42 1.41-1.41L3.42 2.46 2.01 3.87zm7.5 7.5l2.61 2.61c-.04.01-.08.02-.12.02-1.38 0-2.5-1.12-2.5-2.5 0-.05.01-.08.01-.13zm-3.4-3.4l1.75 1.75c-.23.55-.36 1.15-.36 1.78 0 2.48 2.02 4.5 4.5 4.5.63 0 1.23-.13 1.77-.36l.98.98c-.88.24-1.8.38-2.75.38-3.79 0-7.17-2.13-8.82-5.5.7-1.43 1.72-2.61 2.93-3.53z"/>
                                    </svg>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : null}
                          
                          {/* Fallback element สำหรับรูปภาพที่โหลดไม่ได้ */}
                          <div className={`absolute inset-0 ${(u as any).isOnline ? 'bg-gradient-to-r from-green-600 to-green-700' : 'bg-gradient-to-r from-gray-600 to-gray-700'} flex items-center justify-center text-white text-2xl font-bold hidden`}>
                            <User className="h-12 w-12" />
                          </div>
                          
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                          <div className="absolute top-2 sm:top-4 left-2 sm:left-4">
                            <div className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${badgeGradient} shadow-xl border border-white/10`}>{tier.toUpperCase()}</div>
                          </div>
                          {/* Vote Score Display - Top Right */}
                          <div className="absolute top-2 sm:top-4 right-2 sm:right-4">
                            <HeartVote
                              candidateId={u._id || (u as any)?.id}
                              candidateGender={u?.gender || 'male'}
                              candidateDisplayName={displayName}
                              isOwnProfile={false}
                              className=""
                            />
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
                              <div className="ml-2 flex gap-1 sm:gap-2">
                                {/* Profile Details Button */}
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className={`rounded-full transition-all duration-300 hover:scale-110 h-8 w-8 sm:h-10 sm:w-10 ${
                                    (u as any).isOnline 
                                      ? 'text-green-300 hover:text-green-200 hover:bg-green-400/40 shadow-green-400/50 shadow-lg' 
                                      : 'text-gray-500 hover:text-gray-400 hover:bg-gray-500/20'
                                  }`}
                                  onClick={(e: any) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    const token = sessionStorage.getItem('token');
                                    if (!token) {
                                      showWebappNotification('กรุณาเข้าสู่ระบบก่อน')
                                      return
                                    }
                                    
                                    // สร้างข้อมูลโปรไฟล์และใช้ handleViewProfile ที่มีการตรวจสอบสิทธิ์
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
                                      images: (u?.profileImages || []).filter((img: any) => {
                                        const imgPath = typeof img === 'string' ? img : img?.url || '';
                                        return !imgPath.startsWith('data:image/svg+xml');
                                      }),
                                      verified: false,
                                      online: (u as any)?.isOnline || false,
                                      lastActive: (u as any)?.lastActive,
                                      membershipTier: u?.membership?.tier || 'member',
                                      membership: {
                                        tier: u?.membership?.tier || 'member'
                                      }
                                    };
                                    
                                    // ใช้ handleViewProfile ที่มีการตรวจสอบสิทธิ์
                                    handleViewProfile(modalProfile);
                                  }}
                                >
                                  <User className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                                </Button>
                                
                                {/* Heart Button */}
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
                    fetch(`${base}/api/profile/discover?limit=50`, {
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
                    .filter(u => {
                      // กรองผู้ใช้ปัจจุบันออก
                      const currentUserId = user?._id || user?.id;
                      const userId = u._id || (u as any)?.id;
                      return currentUserId !== userId;
                    })
                    .slice(0, visibleCount)
                    .map(user => {
                    // ใช้ utility function เพื่อสร้าง image URL ที่ถูกต้อง
                    const profileImage = getMainProfileImage(
                      user?.profileImages || [], 
                      (user as any)?.mainProfileImageIndex, 
                      user._id || (user as any)?.id
                    )
                    
                    // const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
                    
                    
                    const displayName = user.nickname || `${user.firstName || ''} ${user.lastName || ''}`.trim() || (user as any).username || 'Unknown'
                    const age = user.age || 'N/A'
                    const location = user.location || 'Unknown'
                    const bio = user.bio || 'No bio available'
                    const interests = user.interests?.map(i => i.category || i) || []
                    
                    // Debug: ตรวจสอบ isOnline status (แสดงเฉพาะคนที่ออนไลน์)
                    if ((user as any).isOnline) {
                      console.log(`🟢 User ${displayName} is ONLINE:`, {
                        isOnline: (user as any).isOnline,
                        lastActive: (user as any).lastActive,
                        userId: user._id
                      });
                    }
                    
                    return (
                      <div key={user._id} className="modern-card rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-pink-100/50 transition-all duration-500 hover:-translate-y-2 cursor-pointer group floating-hearts"                         onClick={() => {
                          console.log('🖱️ Discover card clicked:', displayName);
                          
                          const token = sessionStorage.getItem('token');
                          if (!token) {
                            showWebappNotification('กรุณาเข้าสู่ระบบก่อน')
                            return
                          }
                          
                          const profileData = {
                            id: user._id,
                            name: displayName,
                            age: parseInt(String(age)) || 0,
                            location: location,
                            bio: bio,
                            interests: interests,
                            images: user.profileImages && user.profileImages.length > 0
                              ? user.profileImages.filter(img => 
                                  typeof img === 'string' && !img.startsWith('data:image/svg+xml')
                                ).map(img => 
                                  getProfileImageUrl(img, user._id || (user as any).id)
                                )
                              : [],
                            verified: (user as any).isVerified,
                            online: (user as any).isOnline || false,
                            lastActive: (user as any).lastActive,
                            membershipTier: user.membership?.tier || 'member'
                          };
                          
                          
                          // ใช้ handleViewProfile ที่มีการตรวจสอบสิทธิ์
                          handleViewProfile(profileData);
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
                                  username: (user as any).username,
                                  originalImageName: user.profileImages?.[(user as any).mainProfileImageIndex || 0]
                                });
                                
                                // ซ่อนรูปและแสดง fallback ทันที
                                (e.target as HTMLImageElement).style.display = 'none';
                                const fallbackElement = (e.target as HTMLImageElement).nextElementSibling;
                                if (fallbackElement) {
                                  fallbackElement.classList.remove('hidden');
                                }
                                
                                // ลองโหลดรูปอื่นถ้ามี (เฉพาะเมื่อรูปหลักล้มเหลว)
                                const otherImages = user.profileImages?.slice(1) || []
                                if (otherImages.length > 0 && !(e.target as HTMLImageElement).dataset.retried) {
                                  const nextImage = otherImages[0]
                                  let nextImageUrl = nextImage
                                  
                                  // แก้ไขชื่อไฟล์ถ้าจำเป็น
                                  if (!nextImage.startsWith('http') && !nextImage.startsWith('data:')) {
                                    const hasExtension = /\.(jpg|jpeg|png|gif|webp)$/i.test(nextImage)
                                    if (!hasExtension) {
                                      nextImageUrl = `${nextImage}.jpg`
                                    }
                                    nextImageUrl = getProfileImageUrl(nextImageUrl, selectedProfile?.id?.toString() || '')
                                  }
                                  
                                  console.log('🔄 Trying next image:', nextImageUrl)
                                  ;(e.target as HTMLImageElement).src = nextImageUrl
                                  ;(e.target as HTMLImageElement).dataset.retried = 'true'
                                }
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
                          
                          {/* Fallback element สำหรับรูปภาพที่โหลดไม่ได้ */}
                          <div className={`absolute inset-0 ${(user as any).isOnline ? 'bg-gradient-to-r from-green-600 to-green-700' : 'bg-gradient-to-r from-gray-600 to-gray-700'} flex items-center justify-center text-white text-2xl font-bold hidden`}>
                            <User className="h-12 w-12" />
                          </div>
                          
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
                          
                          {/* Vote Score Display - Top Right */}
                          <div className="absolute top-2 sm:top-4 right-2 sm:right-4">
                            <HeartVote
                              candidateId={user._id || (user as any)?.id}
                              candidateGender={user?.gender || 'male'}
                              candidateDisplayName={displayName}
                              isOwnProfile={false}
                              className=""
                            />
                          </div>
                          
                          
                          <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4 text-white">
                            <div className="flex justify-between items-end">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm sm:text-base md:text-lg font-bold truncate text-white">{displayName}, {age}</h3>
                                <div className="flex items-center text-white/90 text-xs sm:text-sm">
                                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                  <span className="truncate">{location}</span>
                                </div>
                              </div>
                              <div className="ml-2 flex gap-1 sm:gap-2">
                                {/* Profile Details Button */}
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className={`rounded-full transition-all duration-300 hover:scale-110 h-8 w-8 sm:h-10 sm:w-10 ${
                                    (user as any).isOnline 
                                      ? 'text-green-300 hover:text-green-200 hover:bg-green-400/40 shadow-green-400/50 shadow-lg' 
                                      : 'text-gray-500 hover:text-gray-400 hover:bg-gray-500/20'
                                  }`}
                                  onClick={async (e: any) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    const token = sessionStorage.getItem('token');
                                    if (!token) {
                                      showWebappNotification('กรุณาเข้าสู่ระบบก่อน')
                                      return
                                    }
                                    
                                    try {
                                      // เรียก API เพื่อดึงข้อมูลโปรไฟล์เต็ม
                                      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
                                      const response = await fetch(`${baseUrl}/api/profile/${user._id}`, {
                                        headers: {
                                          'Authorization': `Bearer ${token}`,
                                          'Content-Type': 'application/json'
                                        }
                                      });
                                      
                                      if (!response.ok) {
                                        throw new Error('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
                                      }
                                      
                                      const result = await response.json();
                                      if (!result.success) {
                                        throw new Error(result.message || 'ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
                                      }
                                      
                                      const fullProfile = result.data.profile;
                                      
                                      // สร้าง profile data object ที่ครบถ้วน
                                      const profileData = {
                                        id: fullProfile._id,
                                        name: fullProfile.nickname || `${fullProfile.firstName || ''} ${fullProfile.lastName || ''}`.trim() || displayName,
                                        age: fullProfile.age || parseInt(String(age)) || 0,
                                        location: fullProfile.location || location,
                                        bio: fullProfile.bio || bio,
                                        interests: Array.isArray(fullProfile.interests)
                                          ? fullProfile.interests.map((it: any) => it?.category || it?.name || `${it}`).filter(Boolean)
                                          : interests,
                                        images: (fullProfile.profileImages || []).filter(img => 
                                          typeof img === 'string' && !img.startsWith('data:image/svg+xml')
                                        ).map(img => 
                                          getProfileImageUrl(img, fullProfile._id)
                                        ),
                                        verified: fullProfile.isVerified || false,
                                        online: fullProfile.isOnline || false,
                                        lastActive: fullProfile.lastActive,
                                        membershipTier: fullProfile.membership?.tier || 'member',
                                        // ข้อมูลโปรไฟล์เต็ม
                                        username: fullProfile.username || '',
                                        firstName: fullProfile.firstName || '',
                                        lastName: fullProfile.lastName || '',
                                        email: fullProfile.email || '',
                                        phone: fullProfile.phone || '',
                                        birthDate: fullProfile.birthDate || '',
                                        gender: fullProfile.gender || '',
                                        lookingFor: fullProfile.lookingFor || '',
                                        education: fullProfile.education || '',
                                        occupation: fullProfile.occupation || '',
                                        height: fullProfile.height || '',
                                        weight: fullProfile.weight || '',
                                        relationshipStatus: fullProfile.relationshipStatus || '',
                                        smoking: fullProfile.smoking || '',
                                        drinking: fullProfile.drinking || '',
                                        exercise: fullProfile.exercise || '',
                                        languages: fullProfile.languages || [],
                                        hobbies: fullProfile.hobbies || [],
                                        profileVideos: fullProfile.profileVideos || [],
                                        religion: fullProfile.religion || '',
                                        pets: fullProfile.pets || '',
                                        children: fullProfile.children || '',
                                        wantChildren: fullProfile.wantChildren || ''
                                      };
                                      
                                      console.log('🎯 Discover: Opening full profile modal with complete data:', profileData);
                                      
                                      // เปิด profile modal พร้อมข้อมูลเต็ม
                                      openProfileModal(profileData, true);
                                      
                                    } catch (error) {
                                      console.error('Error loading full profile:', error);
                                      showWebappNotification('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
                                    }
                                  }}
                                >
                                  <User className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                                </Button>
                                
                                {/* Heart Button */}
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
                        fetch(`${base}/api/profile/discover?limit=50`, {
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
                {!isLoadingAllUsers && allUsers.length > 0 && visibleCount < allUsers.length && (
                  <div className="col-span-full text-center py-8">
                    <Button
                      onClick={() => {
                        const nextCount = Math.min(visibleCount + 12, allUsers.length)
                        setVisibleCount(nextCount)
                        console.log(`📊 Loading more cards: ${visibleCount} → ${nextCount} (total: ${allUsers.length})`)
                      }}
                      disabled={false}
                      variant="outline"
                      size="lg"
                      className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {false ? (
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
                <div className="h-[calc(100vh-10rem)] sm:h-[700px] flex flex-col keyboard-aware">
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
                          console.log('🔄 Private chat tab clicked, fetching chats...');
                          // รีเฟรชข้อมูลแชทส่วนตัวเมื่อเปลี่ยนไปหน้าแชทส่วนตัว
                          fetchPrivateChats();
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
                          showWebappNotification={showWebappNotification}
                        />
                      ) : (
                        <RealTimeChat
                          roomId={selectedRoomId}
                          currentUser={user}
                          onBack={handleBackToRoomList}
                          showWebappNotification={showWebappNotification}
                        />
                      )
                    ) : (
                      privateChatView === 'list' ? (
                        <PrivateChatList
                          currentUser={user}
                          onSelectChat={handleSelectPrivateChat}
                          onCreateNewChat={() => setShowNewPrivateChatModal(true)}
                          onDeleteChat={handleDeletePrivateChat}
                          onRefresh={fetchPrivateChats}
                          privateChats={privateChats}
                          isLoading={false}
                          showWebappNotification={showWebappNotification}
                        />
                      ) : (
                        <PrivateChat
                          currentUser={user}
                          selectedChat={selectedPrivateChat}
                          onSendMessage={handleSendPrivateMessage}
                          onClose={handleBackToPrivateChatList}
                          messages={selectedPrivateChat?.messages || []}
                          isLoading={false}
                          isTyping={false}
                          onTyping={() => {}}
                          onStopTyping={() => {}}
                        />
                      )
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
            {/* Mobile-First Ranking Tab */}
            <TabsContent value="ranking" className="p-0">
              <Suspense fallback={<LoadingSpinner />}>
                <VoteRanking onUserProfileClick={handleVoteUserProfileClick} />
              </Suspense>
            </TabsContent>
            {/* Mobile-First Membership Tab */}
            <TabsContent value="membership" id="membership-content" className="p-1 sm:p-6">
              <div className="space-y-4 sm:space-y-6 lg:space-y-8">
                {/* Premium Tabs Navigation */}
                <Tabs defaultValue="dashboard" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-white border rounded-lg p-1 h-auto mb-6">
                    <TabsTrigger 
                      value="dashboard"
                      className="text-xs sm:text-sm py-2 px-1 sm:px-3 rounded-md data-[state=active]:bg-pink-500 data-[state=active]:text-white"
                    >
                      <FontAwesomeIcon icon={faGem} className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">แดชบอร์ด</span>
                      <span className="sm:hidden">แดชบอร์ด</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="shop"
                      className="text-xs sm:text-sm py-2 px-1 sm:px-3 rounded-md data-[state=active]:bg-pink-500 data-[state=active]:text-white"
                    >
                      <FontAwesomeIcon icon={faShoppingCart} className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">ร้านค้า</span>
                      <span className="sm:hidden">ร้านค้า</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Dashboard Tab Content */}
                  <TabsContent value="dashboard" className="space-y-4 sm:space-y-6 lg:space-y-8">
                    <Suspense fallback={<LoadingSpinner />}>
                      <MembershipDashboard userId={user?._id} />
                    </Suspense>
                    <div id="membership-comparison" className="border-t border-slate-200 pt-4 sm:pt-6 lg:pt-8">
                      <Suspense fallback={<LoadingSpinner />}>
                        <MembershipPlans currentUserId={user?._id} currentTier={user?.membership?.tier || 'member'} />
                      </Suspense>
                    </div>
                  </TabsContent>

                  {/* Shop Tab Content */}
                  <TabsContent value="shop" className="space-y-4 sm:space-y-6">
                    <Suspense fallback={<LoadingSpinner />}>
                      <CoinShop 
                        userId={user?._id} 
                        onNavigateToPayment={(plan) => {
                          // Navigate to payment page
                          setSelectedPlan(plan);
                          setCurrentView('payment');
                        }}
                      />
                    </Suspense>
                  </TabsContent>
                </Tabs>
              </div>
            </TabsContent>
            {/* Mobile-First Profile Tab */}
            <TabsContent value="profile" className="p-1 sm:p-6">
              {showVoteUserProfile && selectedVoteUser ? (
                <div className="space-y-4">
                  {/* Header with back button */}
                  <div className="flex items-center space-x-3 mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCloseVoteUserProfile}
                      className="flex items-center space-x-2"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      <span>กลับ</span>
                    </Button>
                    <h2 className="text-lg font-semibold text-gray-800">
                      โปรไฟล์ของ {selectedVoteUser.displayName || selectedVoteUser.username || 'ผู้ใช้'}
                    </h2>
                  </div>
                  
                  {/* User Profile Component */}
                  <Suspense fallback={<LoadingSpinner />}>
                    <UserProfile
                      userId={selectedVoteUser._id || selectedVoteUser.id}
                      isOwnProfile={false}
                    />
                  </Suspense>
                </div>
              ) : isAuthenticated && user ? (
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
                value="ranking" 
                className="flex-1 h-full data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700 rounded-none text-gray-500 data-[state=active]:border-t-2 data-[state=active]:border-pink-700 transition-all duration-300 flex flex-col items-center justify-center space-y-0.5 sm:space-y-1"
              >
                <FontAwesomeIcon 
                  icon={faTrophy} 
                  className={`h-5 w-5 transition-all duration-300 ${activeTab === 'ranking' ? 'text-pink-700 drop-shadow-lg scale-105 animate-pulse' : 'text-gray-500'}`} 
                  style={activeTab === 'ranking' ? { color: '#be185d' } : {}} 
                />
                <span className="text-xs font-medium">อันดับ</span>
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
      <footer className="bg-gradient-to-r from-pink-100 via-violet-100 to-pink-100 border-t border-pink-300/30 py-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-5 h-5 bg-gradient-to-r from-pink-500 to-violet-500 rounded-full flex items-center justify-center shadow-lg">
              <Heart className="h-3 w-3 text-white" fill="white" />
            </div>
            <a 
              href="https://devnid.xyz/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-base font-bold bg-gradient-to-r from-pink-600 via-violet-600 to-pink-600 bg-clip-text text-transparent hover:from-pink-700 hover:via-violet-700 hover:to-pink-700 transition-all duration-300 cursor-pointer transform hover:scale-105"
            >
              Power By DevKao & DevMax © {new Date().getFullYear()}
            </a>
          </div>
        </div>
      </footer>
      
      {/* Profile Image Modal */}
      {selectedProfile && (
        <Dialog open={showProfileModal} onOpenChange={setShowProfileModalDebug}>
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
            {/* Image Container */}
            <div className="relative w-full h-full">
              {/* Full Size Image */}
              {(() => {
                // Get images from images field
                const images = selectedProfile.images || [];
                const currentImage = images[activeImageIndex];
                
                // Handle both string and object image formats
                const imagePath = typeof currentImage === 'string' ? currentImage : (currentImage as any)?.url || '';
                const isBlurred = typeof currentImage === 'object' && (currentImage as any)?.isBlurred;
                
                // ตรวจสอบว่าผู้ใช้จ่ายเหรียญเพื่อดูรูปนี้แล้วหรือไม่
                const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
                const profileId = selectedProfile?.id?.toString();
                const imageId = (currentImage as any)?._id?.toString() || `image_${activeImageIndex}`;
                
                // ตรวจสอบการซื้อรูปเฉพาะ - เฉพาะรูปนี้เท่านั้น
                const hasPaidForThisImage = currentUser.purchasedImages?.some((purchased: any) => 
                  purchased.profileId === profileId && purchased.imageId === imageId
                );
                
                // รูปจะเบลอเมื่อ: เป็นรูปที่ตั้งค่าเบลอ และยังไม่ได้จ่ายเหรียญสำหรับรูปนี้
                const finalIsBlurred = isBlurred && !hasPaidForThisImage;
                
                console.log('🔍 Modal image blur check:', {
                  activeImageIndex,
                  imagePath,
                  isBlurred,
                  hasPaidForThisImage,
                  finalIsBlurred,
                  profileId: selectedProfile?.id,
                  imageId,
                  purchasedImages: currentUser.purchasedImages,
                  currentImage,
                  selectedProfile,
                  allImages: selectedProfile.images,
                  forceUpdate, // เพิ่ม forceUpdate เพื่อติดตามการ re-render
                  matchingPurchases: currentUser.purchasedImages?.filter((purchased: any) => 
                    purchased.profileId === profileId && purchased.imageId === imageId
                  )
                });
                
                if (images.length > 0 && imagePath && !imagePath.startsWith('data:image/svg+xml')) {
                  // Use getProfileImageUrl to ensure correct URL
                  const imageUrl = getProfileImageUrl(imagePath, selectedProfile.id?.toString());
                  return (
                    <div className="relative w-full h-full">
                      <img
                        src={imageUrl}
                        alt={selectedProfile.name}
                        className={`w-full h-full object-cover ${finalIsBlurred ? 'filter blur-lg' : ''}`}
                        style={{
                          ...(finalIsBlurred && { 
                            filter: 'blur(16px)',
                            transition: 'filter 0.3s ease'
                          })
                        }}
                        onError={(e) => {
                          console.error('❌ Profile modal image failed to load:', {
                            imageUrl: imageUrl,
                            originalImage: currentImage,
                            profileId: selectedProfile.id
                          });
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                        onLoad={() => {
                          console.log('✅ Profile modal image loaded successfully:', {
                            imageUrl: imageUrl,
                            originalImage: currentImage,
                            profileId: selectedProfile.id
                          });
                        }}
                      />
                      {/* Overlay สำหรับรูปเบลอ */}
                      {finalIsBlurred && (
                        <div className="absolute inset-0 bg-black bg-opacity-30 flex flex-col items-center justify-center">
                          <div className="w-16 h-16 text-white opacity-60 mb-4">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                              <path d="M12 6c3.79 0 7.17 2.13 8.82 5.5-.59 1.22-1.42 2.27-2.41 3.12l1.41 1.41c1.39-1.23 2.49-2.77 3.18-4.53C21.27 7.11 17 4 12 4c-1.27 0-2.49.2-3.64.57l1.65 1.65C10.66 6.09 11.32 6 12 6zm-1.07 1.14L13 9.21c.57.25 1.03.71 1.28 1.28l2.07 2.07c.08-.34.14-.7.14-1.07C16.5 9.01 14.48 7 12 7c-.37 0-.72.05-1.07.14zM2.01 3.87l2.68 2.68C3.06 7.83 1.77 9.53 1 11.5 2.73 15.89 7 19 12 19c1.52 0 2.98-.29 4.32-.82l3.42 3.42 1.41-1.41L3.42 2.46 2.01 3.87zm7.5 7.5l2.61 2.61c-.04.01-.08.02-.12.02-1.38 0-2.5-1.12-2.5-2.5 0-.05.01-.08.01-.13zm-3.4-3.4l1.75 1.75c-.23.55-.36 1.15-.36 1.78 0 2.48 2.02 4.5 4.5 4.5.63 0 1.23-.13 1.77-.36l.98.98c-.88.24-1.8.38-2.75.38-3.79 0-7.17-2.13-8.82-5.5.7-1.43 1.72-2.61 2.93-3.53z"/>
                            </svg>
                          </div>
                          
                          {/* ปุ่มจ่ายเหรียญ */}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              
                              const token = sessionStorage.getItem('token');
                              if (!token) {
                                showWebappNotification('กรุณาเข้าสู่ระบบก่อน');
                                return;
                              }
                              
                              // Handle blur payment - ส่ง imageId ของรูปที่กำลังแสดง
                              const currentImage = images[activeImageIndex];
                              const currentImageId = (currentImage as any)?._id?.toString() || `image_${activeImageIndex}`;
                              const targetUserId = selectedProfile?.id?.toString() || (selectedProfile as any)?._id?.toString() || '';
                              
                              console.log('🔍 Blur payment debug:', {
                                selectedProfile,
                                targetUserId,
                                currentImageId,
                                currentImage,
                                images: images.length
                              });
                              
                              if (!targetUserId) {
                                showWebappNotification('ไม่พบ ID ของโปรไฟล์ กรุณาลองใหม่');
                                return;
                              }
                              
                              // ตรวจสอบข้อมูลเพิ่มเติมก่อนส่ง
                              if (!currentImage) {
                                showWebappNotification('ไม่พบรูปภาพที่ต้องการซื้อ');
                                return;
                              }
                              
                              // ตรวจสอบว่ารูปนี้เบลอจริงหรือไม่
                              const isImageBlurred = typeof currentImage === 'object' && (currentImage as any)?.isBlurred;
                              if (!isImageBlurred) {
                                showWebappNotification('รูปภาพนี้ไม่ได้ตั้งค่าเบลอ');
                                return;
                              }
                              
                              console.log('✅ Validation passed, proceeding with payment');
                              handleBlurPayment(targetUserId, selectedProfile?.name || '', currentImageId);
                            }}
                            className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transform transition-all duration-200 hover:scale-105 flex items-center gap-2"
                          >
                            <span className="text-xl">💰</span>
                            <div className="text-center">
                              <div className="text-sm">ดูรูปนี้</div>
                              <div className="text-xs opacity-90">10,000 เหรียญ</div>
                            </div>
                          </button>
                          
                          <p className="text-white text-xs mt-2 opacity-80 text-center">
                            จ่ายเฉพาะรูปนี้ • ดูได้ตลอด
                          </p>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })()}
              {(() => {
                // Show fallback if no image is displayed
                const images = selectedProfile.images || [];
                const currentImage = images[activeImageIndex];
                const imagePath = typeof currentImage === 'string' ? currentImage : (currentImage as any)?.url || '';
                const hasValidImage = images.length > 0 && imagePath && !imagePath.startsWith('data:image/svg+xml');
                
                if (!hasValidImage) {
                  return (
                    /* Fallback when no image */
                    <div className="w-full h-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center">
                      <div className="text-center text-white">
                        <User className="h-24 w-24 mx-auto mb-4 opacity-80" />
                        <h3 className="text-2xl font-bold mb-2">{selectedProfile.name}</h3>
                        <p className="text-lg opacity-90">ไม่มีรูปภาพ</p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Control Buttons - ต้องอยู่นอก image container */}
            <button
              onClick={() => {
                // ไม่ให้ปิด modal ถ้ากำลังป้องกันการปิด
                if (preventModalClose) {
                  console.log('🔒 Preventing modal close due to preventModalClose flag (X button)');
                  showWebappNotification('กรุณารอการดำเนินการให้เสร็จสิ้นก่อน');
                  return;
                }
                
                setShowProfileModalDebug(false);
                setModalAction(null);
                setShowProfileDetails(false);
                setProfileData(null);
                setProfileAlert(null);
              }}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full p-2 sm:p-3 transition-colors"
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
                className="absolute top-3 left-3 sm:top-4 sm:left-4 z-30 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full p-2 sm:p-3 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            )}
              
            {/* Fixed Profile Info Overlay - ล็อคที่ขอบล่างของ Modal Container (ไม่ใช่ภาพ) */}
            <div className="absolute bottom-0 left-0 right-0 h-48 sm:h-52 z-20 pointer-events-none">
                {/* Background overlay for better text visibility - ซ่อนเมื่อแสดงรายละเอียดโปรไฟล์ */}
                {!showProfileDetails && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent"></div>
                )}
                
                {/* Content positioned at very bottom - ล็อคตำแหน่งไม่ให้เลื่อนตามความสูงของภาพ */}
                <div className="absolute bottom-4 left-4 right-4 text-white pointer-events-auto">
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
                  
                  {/* Profile Info - ซ่อนเมื่อแสดงรายละเอียดโปรไฟล์ */}
                  {!showProfileDetails && (
                    <>
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
                      {selectedProfile.bio && selectedProfile.bio !== 'No bio available' ? (
                        <div className="mb-1">
                          <h4 className="text-base font-semibold mb-1 text-white" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.6)'}}>เกี่ยวกับฉัน</h4>
                          <p className="text-base text-white leading-relaxed line-clamp-1" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.6)'}}>{selectedProfile.bio}</p>
                        </div>
                      ) : (
                        <div className="mb-1">
                          <h4 className="text-base font-semibold mb-1 text-white" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.6)'}}>เกี่ยวกับฉัน</h4>
                          <p className="text-base text-white leading-relaxed line-clamp-1" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.6)'}}>ยังไม่มีข้อมูลเกี่ยวกับฉัน</p>
                        </div>
                      )}
                      
                      {/* Interests Section */}
{/* Interests section hidden as requested */}
                    </>
                  )}
                  
                  
                  {/* Image Indicators */}
                  {(() => {
                    const images = selectedProfile.images || [];
                    return images.length > 1 && (
                      <div className="flex justify-center space-x-2 mb-1">
                        {images.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setActiveImageIndex(index)}
                            className={`w-3 h-3 rounded-full transition-all ${
                              index === activeImageIndex ? 'bg-white' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    );
                  })()}
                  
                  {/* Action Icons - ซ่อนเมื่อแสดงรายละเอียดโปรไฟล์ */}
                  {!showProfileDetails && (
                    <div className="flex justify-center items-center gap-4 mt-4">
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
                        onClick={async () => {
                          console.log('👤 View profile details:', selectedProfile.name);
                          
                          const token = sessionStorage.getItem('token');
                          if (!token) {
                            showWebappNotification('กรุณาเข้าสู่ระบบก่อน')
                            return
                          }
                          
                          try {
                            // เรียก API เพื่อดึงข้อมูลโปรไฟล์เต็ม
                            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
                            const response = await fetch(`${baseUrl}/api/profile/${selectedProfile.id}`, {
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                              }
                            });
                            
                            if (!response.ok) {
                              throw new Error('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
                            }
                            
                            const result = await response.json();
                            if (!result.success) {
                              throw new Error(result.message || 'ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
                            }
                            
                            const fullProfile = result.data.profile;
                            
                            // สร้าง profile data object ที่ครบถ้วน
                            const profileData = {
                              id: fullProfile._id,
                              name: fullProfile.nickname || `${fullProfile.firstName || ''} ${fullProfile.lastName || ''}`.trim() || selectedProfile.name,
                              age: fullProfile.age || selectedProfile.age,
                              location: fullProfile.location || selectedProfile.location,
                              bio: fullProfile.bio || selectedProfile.bio,
                              interests: Array.isArray(fullProfile.interests)
                                ? fullProfile.interests.map((it: any) => it?.category || it?.name || `${it}`).filter(Boolean)
                                : selectedProfile.interests || [],
                              images: (fullProfile.profileImages || []).filter(img => 
                                typeof img === 'string' && !img.startsWith('data:image/svg+xml')
                              ).map(img => 
                                getProfileImageUrl(img, fullProfile._id)
                              ),
                              verified: fullProfile.isVerified || false,
                              online: fullProfile.isOnline || false,
                              lastActive: fullProfile.lastActive,
                              membershipTier: fullProfile.membership?.tier || 'member',
                              // ข้อมูลโปรไฟล์เต็ม
                              username: fullProfile.username || '',
                              firstName: fullProfile.firstName || '',
                              lastName: fullProfile.lastName || '',
                              email: fullProfile.email || '',
                              phone: fullProfile.phone || '',
                              birthDate: fullProfile.birthDate || '',
                              gender: fullProfile.gender || '',
                              lookingFor: fullProfile.lookingFor || '',
                              education: fullProfile.education || '',
                              occupation: fullProfile.occupation || '',
                              height: fullProfile.height || '',
                              weight: fullProfile.weight || '',
                              relationshipStatus: fullProfile.relationshipStatus || '',
                              smoking: fullProfile.smoking || '',
                              drinking: fullProfile.drinking || '',
                              exercise: fullProfile.exercise || '',
                              languages: fullProfile.languages || [],
                              hobbies: fullProfile.hobbies || [],
                              profileVideos: fullProfile.profileVideos || [],
                              religion: fullProfile.religion || '',
                              pets: fullProfile.pets || '',
                              children: fullProfile.children || '',
                              wantChildren: fullProfile.wantChildren || ''
                            };
                            
                            console.log('🎯 Modal: Opening full profile modal with complete data:', profileData);
                            
                            // ปิดโมดัลปัจจุบันก่อน
                            setShowProfileModalDebug(false);
                            
                            // เปิด profile modal พร้อมข้อมูลเต็ม (รวม blur information)
                            setTimeout(() => {
                              openProfileModal(profileData, true);
                            }, 100);
                            
                          } catch (error) {
                            console.error('Error loading full profile:', error);
                            showWebappNotification('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
                          }
                        }}
                      >
                        <User className="h-6 w-6" />
                      </button>
                    </div>
                  )}
                  
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
                    {false && (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
                        <span className="ml-3 text-gray-600">กำลังโหลดข้อมูลโปรไฟล์...</span>
                      </div>
                    )}
                    
                    {/* Profile Data */}
                    {(profileData || selectedProfile) && (() => {
                      // Create a unified profile object with all available data
                      const unifiedProfile = {
                        ...selectedProfile,
                        ...profileData,
                        // Ensure images field is available - prioritize profileData
                        profileImages: profileData?.profileImages || profileData?.images || selectedProfile?.images || [],
                        images: profileData?.images || profileData?.profileImages || selectedProfile?.images || [],
                        // Ensure basic fields are always available
                        name: profileData?.name || selectedProfile?.name || 'ไม่ระบุชื่อ',
                        age: profileData?.age || selectedProfile?.age || null,
                        location: profileData?.location || selectedProfile?.location || null,
                        bio: profileData?.bio || selectedProfile?.bio || null,
                        membership: profileData?.membership || selectedProfile?.membership || { tier: 'member' }
                      };
                      
                      
                      return (
                      <>
                        {/* Profile Header */}
                        <div className="flex flex-col sm:flex-row items-start gap-4">
                          <div className="relative">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                              {(() => {
                                // ใช้ utility function เพื่อสร้าง profile image URL ที่ถูกต้อง
                                const profileImageUrl = getMainProfileImage(
                                  unifiedProfile.profileImages || [], 
                                  unifiedProfile.mainProfileImageIndex, 
                                  unifiedProfile.id
                                )
                                
                                return profileImageUrl ? (
                                  <img 
                                    src={profileImageUrl}
                                    alt="Profile"
                                    className="w-full h-full rounded-full object-cover object-center"
                                    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                                    onError={(e) => {
                                      console.error('❌ Profile modal image failed to load:', {
                                        imageUrl: profileImageUrl,
                                        originalImage: unifiedProfile.profileImages[0],
                                        profileId: unifiedProfile.id
                                      });
                                      (e.target as HTMLImageElement).style.display = 'none';
                                      ((e.target as HTMLImageElement).nextSibling as HTMLElement).style.display = 'flex';
                                    }}
                                    onLoad={() => {
                                      console.log('✅ Profile modal image loaded successfully:', {
                                        imageUrl: profileImageUrl,
                                        originalImage: unifiedProfile.profileImages[0],
                                        profileId: unifiedProfile.id
                                      });
                                    }}
                                  />
                                ) : null
                              })()}
                              <div className={`absolute inset-0 w-full h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500 flex items-center justify-center text-white text-2xl font-bold ${(() => {
                                const profileImageUrl = getMainProfileImage(
                                  unifiedProfile.profileImages || [], 
                                  unifiedProfile.mainProfileImageIndex, 
                                  unifiedProfile.id
                                )
                                return profileImageUrl && !profileImageUrl.startsWith('data:image/svg+xml') ? 'hidden' : ''
                              })()}`}>
                                <User className="h-10 w-10 sm:h-12 sm:w-12" />
                              </div>
                            </div>
                            {unifiedProfile.membership?.tier && unifiedProfile.membership.tier !== 'member' && (
                              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs shadow-lg">
                                <Crown className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 mb-1">
                              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                                {unifiedProfile.nickname || unifiedProfile.name || `${unifiedProfile.firstName || ''} ${unifiedProfile.lastName || ''}`.trim() || (unifiedProfile as any).username || 'ไม่ระบุชื่อ'}
                              </h1>
                              {unifiedProfile.membership?.tier && (
                                <Badge className={`bg-gradient-to-r ${
                                  unifiedProfile.membership.tier === 'platinum' ? 'from-purple-500 to-pink-500' :
                                  unifiedProfile.membership.tier === 'diamond' ? 'from-blue-500 to-cyan-500' :
                                  unifiedProfile.membership.tier === 'vip2' ? 'from-red-500 to-orange-500' :
                                  unifiedProfile.membership.tier === 'vip1' ? 'from-orange-500 to-yellow-500' :
                                  unifiedProfile.membership.tier === 'vip' ? 'from-purple-400 to-pink-400' :
                                  unifiedProfile.membership.tier === 'gold' ? 'from-yellow-500 to-amber-500' :
                                  unifiedProfile.membership.tier === 'silver' ? 'from-gray-400 to-slate-400' :
                                  'from-gray-300 to-gray-400'
                                } text-white text-xs`}>
                                  <Crown className="h-3 w-3 mr-1" />
                                  {unifiedProfile.membership.tier === 'platinum' ? 'PLATINUM' :
                                   unifiedProfile.membership.tier === 'diamond' ? 'DIAMOND' :
                                   unifiedProfile.membership.tier === 'vip2' ? 'VIP2' :
                                   unifiedProfile.membership.tier === 'vip1' ? 'VIP1' :
                                   unifiedProfile.membership.tier === 'vip' ? 'VIP' :
                                   unifiedProfile.membership.tier === 'gold' ? 'GOLD' :
                                   unifiedProfile.membership.tier === 'silver' ? 'SILVER' :
                                   'MEMBER'}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-sm text-gray-600">
                              {unifiedProfile.location && (
                                <span className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  {unifiedProfile.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                    
                        {/* Bio Section */}
                        {unifiedProfile.bio && (
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-gray-800">เกี่ยวกับฉัน</h3>
                            <p className="text-gray-600 leading-relaxed">{unifiedProfile.bio}</p>
                          </div>
                        )}
                        
                        {/* Interests Section */}
                        {unifiedProfile.interests && unifiedProfile.interests.length > 0 && (
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-gray-800">ความสนใจ</h3>
                            <div className="flex flex-wrap gap-2">
                              {formatInterests(unifiedProfile.interests).map((interest: string, index: number) => (
                                <Badge key={index} variant="secondary" className="px-3 py-1 bg-white/80 text-gray-700 border-gray-300 shadow-sm">
                                  {interest}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Images Section */}
                        {unifiedProfile.profileImages && unifiedProfile.profileImages.length > 1 && !unifiedProfile.profileImages.every(img => typeof img === 'string' && img.startsWith('data:image/svg+xml')) && (
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-gray-800">รูปภาพ</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                              {unifiedProfile.profileImages.slice(1).filter(img => typeof img === 'string' && !img.startsWith('data:image/svg+xml')).map((image: string, index: number) => {
                                // สร้าง image URL ที่ถูกต้อง
                                let imageUrl = image
                                if (!image.startsWith('http') && !image.startsWith('data:')) {
                                  // const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
                                  imageUrl = getProfileImageUrl(image, unifiedProfile.id)
                                }
                                
                                return (
                                <div key={`${unifiedProfile.id}-${index}`} className="aspect-square rounded-lg overflow-hidden shadow-lg">
                                  <img 
                                    src={imageUrl}
                                    alt={`${unifiedProfile.nickname || unifiedProfile.firstName} ${index + 2}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      console.error('❌ Profile modal gallery image failed to load:', {
                                        imageUrl: imageUrl,
                                        originalImage: image,
                                        profileId: unifiedProfile.id
                                      });
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                    onLoad={() => {
                                      console.log('✅ Profile modal gallery image loaded successfully:', {
                                        imageUrl: imageUrl,
                                        originalImage: image,
                                        profileId: unifiedProfile.id
                                      });
                                    }}
                                  />
                                </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                        
                        {/* Basic Information - Always show */}
                        <div className="space-y-3">
                          <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">ข้อมูลพื้นฐาน</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                              <Calendar className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span className="text-sm font-medium text-gray-700">อายุ</span>
                                <p className="text-sm text-gray-600 mt-1">{unifiedProfile.age ? `${unifiedProfile.age} ปี` : 'ไม่ระบุ'}</p>
                              </div>
                            </div>
                            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                              <MapPin className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span className="text-sm font-medium text-gray-700">ที่อยู่</span>
                                <p className="text-sm text-gray-600 mt-1">{unifiedProfile.location || 'ไม่ระบุ'}</p>
                              </div>
                            </div>
                            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                              <div className={`h-5 w-5 rounded-full mt-0.5 flex-shrink-0 ${unifiedProfile.online ? 'bg-green-500' : 'bg-red-500'}`}></div>
                              <div className="min-w-0 flex-1">
                                <span className="text-sm font-medium text-gray-700">สถานะ</span>
                                <p className="text-sm text-gray-600 mt-1">{unifiedProfile.online ? 'ออนไลน์' : 'ออฟไลน์'}</p>
                              </div>
                            </div>
                            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                              <User className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span className="text-sm font-medium text-gray-700">สมาชิก</span>
                                <p className="text-sm text-gray-600 mt-1">{unifiedProfile.membership?.tier || 'Member'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Additional Profile Information */}
                        <div className="space-y-6">
                          {/* Personal Information */}
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">ข้อมูลส่วนตัว</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <User className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-gray-700">เพศ</span>
                                  <p className="text-sm text-gray-600 mt-1">{translateGender(unifiedProfile.gender)}</p>
                                </div>
                              </div>
                              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <GraduationCap className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-gray-700">การศึกษา</span>
                                  <p className="text-sm text-gray-600 mt-1">{safeDisplay(unifiedProfile.education) || 'ยังไม่ระบุ'}</p>
                                </div>
                              </div>
                              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <Briefcase className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-gray-700">อาชีพ</span>
                                  <p className="text-sm text-gray-600 mt-1">{safeDisplay(unifiedProfile.occupation) || 'ยังไม่ระบุ'}</p>
                                </div>
                              </div>
                              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <Church className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-gray-700">ศาสนา</span>
                                  <p className="text-sm text-gray-600 mt-1">{safeDisplay(unifiedProfile.religion) || 'ยังไม่ระบุ'}</p>
                                </div>
                              </div>
                              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <Languages className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-gray-700">ภาษา</span>
                                  <p className="text-sm text-gray-600 mt-1">{unifiedProfile.languages ? (Array.isArray(unifiedProfile.languages) ? unifiedProfile.languages.join(', ') : safeDisplay(unifiedProfile.languages)) : 'ยังไม่ระบุ'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Lifestyle Information */}
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">ไลฟ์สไตล์</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <Cigarette className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-gray-700">สูบบุหรี่</span>
                                  <p className="text-sm text-gray-600 mt-1">{safeDisplay(unifiedProfile.smoking) || 'ยังไม่ระบุ'}</p>
                                </div>
                              </div>
                              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <Wine className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-gray-700">ดื่มแอลกอฮอล์</span>
                                  <p className="text-sm text-gray-600 mt-1">{safeDisplay(unifiedProfile.drinking) || 'ยังไม่ระบุ'}</p>
                                </div>
                              </div>
                              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <Dumbbell className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-gray-700">ออกกำลังกาย</span>
                                  <p className="text-sm text-gray-600 mt-1">{safeDisplay(unifiedProfile.exercise) || 'ยังไม่ระบุ'}</p>
                                </div>
                              </div>
                              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <Utensils className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-gray-700">อาหาร</span>
                                  <p className="text-sm text-gray-600 mt-1">{safeDisplay(unifiedProfile.diet) || 'ยังไม่ระบุ'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Additional Information */}
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">ข้อมูลเพิ่มเติม</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <Heart className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-gray-700">ความสัมพันธ์ที่ต้องการ</span>
                                  <p className="text-sm text-gray-600 mt-1">{translateRelationship(safeDisplay(unifiedProfile.lookingFor))}</p>
                                </div>
                              </div>
                              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <PawPrint className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-gray-700">สัตว์เลี้ยง</span>
                                  <p className="text-sm text-gray-600 mt-1">{safeDisplay(unifiedProfile.pets) || 'ยังไม่ระบุ'}</p>
                                </div>
                              </div>
                              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <Building className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-gray-700">ที่อยู่อาศัย</span>
                                  <p className="text-sm text-gray-600 mt-1">{safeDisplay(unifiedProfile.livingSituation) || 'ยังไม่ระบุ'}</p>
                                </div>
                              </div>
                              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <Baby className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-medium text-gray-700">ต้องการมีลูก</span>
                                  <p className="text-sm text-gray-600 mt-1">{safeDisplay(unifiedProfile.wantChildren) || 'ยังไม่ระบุ'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                      )})()}
                    
                    {/* No Data State */}
                    {!(profileData || selectedProfile) && (
                      <div className="text-center py-12">
                        <User className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600">ไม่สามารถโหลดข้อมูลโปรไฟล์ได้</p>
                      </div>
                    )}
                    
                    
                  </div>
                </div>
              )}
          </DialogContent>
        </Dialog>
      )}
      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        onLoginSuccess={handleLoginSuccess}
      />
      {/* Idle Warning Modal */}
      <IdleWarningModal 
        isOpen={showIdleWarning}
        onDismiss={dismissIdleWarning}
        onLogout={logout}
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

      {/* Payment Confirmation Modal */}
      {showPaymentConfirmation && paymentDetails && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4" 
          style={{ zIndex: 100 }}
          onClick={(e) => {
            // กดพื้นหลังเพื่อปิด modal
            if (e.target === e.currentTarget) {
              cancelBlurPayment();
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-4">
              <div className="flex items-center justify-center text-white">
                <div className="text-2xl mr-3">💰</div>
                <h3 className="text-xl font-bold">ยืนยันการจ่ายเหรียญ</h3>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="text-lg font-semibold text-gray-800 mb-2">
                  ต้องการดูรูปเบลอของ
                </div>
                <div className="text-xl font-bold text-pink-600 mb-4">
                  {paymentDetails.targetUserName}
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">จำนวนที่จ่าย:</span>
                    <span className="font-bold text-red-600 text-lg">10,000 เหรียญ</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">เหรียญปัจจุบัน:</span>
                    <span className="font-semibold text-green-600">
                      {paymentDetails.currentCoins.toLocaleString()} เหรียญ
                    </span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">เหรียญหลังจ่าย:</span>
                      <span className="font-bold text-blue-600 text-lg">
                        {(paymentDetails.currentCoins - 10000).toLocaleString()} เหรียญ
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center justify-center mb-1">
                    <span className="text-blue-600 mr-1">ℹ️</span>
                    <span className="font-medium">จ่ายเฉพาะรูปนี้</span>
                  </div>
                  <div className="text-xs">
                    หลังจากจ่ายแล้วจะสามารถดูรูปนี้ได้ตลอด รูปอื่นๆ ต้องจ่ายแยกต่างหาก
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔴 Cancel button clicked');
                    cancelBlurPayment();
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔴 Cancel button mousedown');
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔴 Cancel button touchstart');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors duration-200 cursor-pointer relative"
                  style={{ pointerEvents: 'auto', zIndex: 1000 }}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🟢 Confirm button clicked');
                    // Throttle the click handler
                    if (Date.now() - (window.lastBlurClickTime || 0) < 500) {
                      console.log('🚫 Blur payment click throttled');
                      return;
                    }
                    window.lastBlurClickTime = Date.now();
                    confirmBlurPayment();
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🟢 Confirm button mousedown');
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🟢 Confirm button touchstart');
                  }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg cursor-pointer relative"
                  style={{ pointerEvents: 'auto', zIndex: 1000 }}
                >
                  ยืนยันจ่าย
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer />
      
    </div>
  )
}

// Wrapper component ที่มี DataCacheProvider
const AppWithProviders = () => {
  return (
    <ToastProvider>
      <DataCacheProvider>
        <App />
      </DataCacheProvider>
    </ToastProvider>
  );
};

export default AppWithProviders
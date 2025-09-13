import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useToast } from './ui/toast';
import { membershipHelpers } from '../services/membershipAPI';
import { profileAPI, profileHelpers } from '../services/profileAPI';
import {
  User,
  Edit3,
  Camera,
  MapPin,
  Calendar,
  Briefcase,
  GraduationCap,
  Heart,
  MessageCircle,
  Star,
  Award,
  Crown,
  Upload,
  X,
  Plus,
  Save,
  Eye,
  EyeOff,
  Cigarette,
  Wine,
  Dumbbell,
  Utensils,
  Clock,
  Plane,
  Baby,
  Dog,
  Languages,
  Church,
  Ruler,
  Weight,
  Sparkles,
  Music,
  Film,
  Gamepad2,
  Camera as CameraIcon,
  Book,
  Palette,
  Code,
  Mountain,
  Car,
  Trash2,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';

const UserProfile = ({ userId, isOwnProfile = false }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [membershipData, setMembershipData] = useState(null);
  const [petsInput, setPetsInput] = useState('');
  const { success, error: showError } = useToast();

  // ฟังก์ชันคำนวณอายุจากวันเกิด
  const getAgeFromDate = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // ดึงข้อมูลโปรไฟล์
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await profileAPI.getUserProfile(userId);
      
      if (response.success) {
        setProfile(response.data.profile);
        setEditData(response.data.profile);
        // เตรียมค่าเริ่มต้นของ pets สำหรับอินพุตแก้ไข
        setPetsInput(formatPetsForInput(response.data.profile?.pets));
        console.log('Profile loaded successfully:', response.data.profile);
      } else {
        console.error('Profile API returned error:', response);
        showError(response.message || 'ไม่สามารถดึงข้อมูลโปรไฟล์ได้');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      
      // จัดการ error ตามประเภท
      if (err.message.includes('403')) {
        showError('ไม่มีสิทธิ์เข้าถึงโปรไฟล์นี้');
      } else if (err.message.includes('404')) {
        showError('ไม่พบโปรไฟล์ผู้ใช้');
      } else {
        showError('ไม่สามารถดึงข้อมูลโปรไฟล์ได้');
      }
    } finally {
      setLoading(false);
    }
  };

  // ดึงข้อมูลสมาชิก
  const fetchMembershipData = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // เพิ่ม token ถ้ามี
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/membership/user/${userId}`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMembershipData(data.data);
        }
      } else {
        console.log('Membership data not available (may require login)');
      }
    } catch (err) {
      console.log('Error fetching membership data (non-critical):', err);
    }
  };

  // บันทึกข้อมูลโปรไฟล์
  const saveProfile = async () => {
    try {
      setSaving(true);
      
      console.log('saveProfile called');
      console.log('Current editData:', editData);
      console.log('Current profile:', profile);
      
      // ตรวจสอบ token ก่อน
      const token = sessionStorage.getItem('token');
      if (!token) {
        showError('กรุณาเข้าสู่ระบบใหม่');
        // Redirect ไปหน้า login
        window.location.href = '/';
        return;
      }
      
      const normalizedPets = Array.isArray(editData.pets)
        ? { hasPets: editData.pets.length > 0, petTypes: editData.pets }
        : (editData.pets || {});

      const cleanData = {
        ...editData,
        // ทำความสะอาดข้อมูลก่อนส่ง
        education: editData.education || {},
        pets: normalizedPets,
        lifestyle: editData.lifestyle || {},
        interests: editData.interests || [],
        coordinates: editData.coordinates || { type: 'Point', coordinates: [0, 0] },
        membership: editData.membership || {}
      };
      
      console.log('Cleaned profile data:', cleanData);
      console.log('Religion field:', cleanData.religion);
      console.log('Languages field:', cleanData.languages);
      console.log('Interests field:', cleanData.interests);
      
      const response = await profileAPI.updateUserProfile(userId, cleanData);
      console.log('Response from backend:', response);
      console.log('Updated profile:', response.data.profile);
      console.log('Interests data:', response.data.profile?.interests);
      
      setProfile(response.data.profile);
      setEditData(response.data.profile);
      setPetsInput(formatPetsForInput(response.data.profile?.pets));
      setEditMode(false);
      success('อัปเดตโปรไฟล์สำเร็จ');
    } catch (err) {
      console.error('Error saving profile:', err);
      
      // จัดการ error ตามประเภท
      if (err.message.includes('Session expired') || err.message.includes('Authentication token not found') || err.message.includes('Token ไม่ถูกต้อง')) {
        showError('Token ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่');
        // ล้างข้อมูลและ redirect ไปหน้า login
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
        return;
      }
      
      // จัดการ validation errors
      if (err.message.includes('Validation error')) {
        showError(err.message);
      } else if (err.message && err.message.includes('400')) {
        try {
          const errorMatch = err.message.match(/message: (.+)/);
          if (errorMatch) {
            showError(errorMatch[1]);
          } else {
            showError('ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่กรอก');
          }
        } catch (parseError) {
          showError('ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่กรอก');
        }
      } else {
        showError(err.message || 'ไม่สามารถบันทึกข้อมูลได้');
      }
    } finally {
      setSaving(false);
    }
  };

  // เริ่มแก้ไข
  const startEdit = () => {
    console.log('startEdit called, profile:', profile);
    console.log('Setting editData to:', { ...profile });
    setEditData({ ...profile });
    setEditMode(true);
    console.log('editMode set to true');
    setPetsInput(formatPetsForInput(profile?.pets));
  };

  // ยกเลิกการแก้ไข
  const cancelEdit = () => {
    console.log('cancelEdit called');
    console.log('Resetting editData to:', { ...profile });
    setEditData({ ...profile });
    setEditMode(false);
    console.log('editMode set to false');
    setPetsInput(formatPetsForInput(profile?.pets));
  };

  // อัปโหลดรูปภาพ
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // ตรวจสอบจำนวนรูปภาพตามระดับสมาชิก
    if (membershipData) {
      const currentImageCount = profile.profileImages ? profile.profileImages.filter(img => !img.startsWith('data:image/svg+xml')).length : 0;
      const maxImages = membershipData.limits.dailyImages === -1 ? 10 : membershipData.limits.dailyImages;
      
      if (currentImageCount >= maxImages) {
        showError(`คุณสามารถอัปโหลดรูปภาพได้สูงสุด ${maxImages} รูปตามระดับสมาชิก ${membershipHelpers.getTierName(membershipData.membershipTier)}`);
        return;
      }
    }

    try {
      setUploadingImage(true);
      await profileAPI.uploadProfileImage(userId, file);
      await fetchProfile();
      success('อัปโหลดรูปภาพสำเร็จ');
    } catch (err) {
      showError(err.response?.data?.message || 'ไม่สามารถอัปโหลดรูปภาพได้');
    } finally {
      setUploadingImage(false);
    }
  };

  // ลบรูปภาพ
  const deleteImage = async (imageIndex) => {
    try {
      await profileAPI.deleteProfileImage(userId, imageIndex);
      await fetchProfile();
      success('ลบรูปภาพสำเร็จ');
    } catch (err) {
      showError(err.response?.data?.message || 'ไม่สามารถลบรูปภาพได้');
    }
  };

  // ตั้งรูปโปรไฟล์หลัก
  const setMainProfileImage = async (imageIndex) => {
    try {
      console.log('Setting main profile image with index:', imageIndex);
      const response = await profileAPI.setMainProfileImage(userId, imageIndex);
      console.log('API response:', response);
      
      await fetchProfile(); // รีเฟรชข้อมูลโปรไฟล์
      
      // รีเฟรช avatar ใน header โดยไม่ต้องรีเฟรชหน้าเว็บ
      const event = new CustomEvent('profileImageUpdated', { 
        detail: { userId, profileImages: response.data.profileImages } 
      });
      window.dispatchEvent(event);
      
      success('ตั้งรูปโปรไฟล์หลักสำเร็จ');
    } catch (err) {
      console.error('Error setting main profile image:', err);
      showError(err.response?.data?.message || 'ไม่สามารถตั้งรูปโปรไฟล์หลักได้');
    }
  };

  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchMembershipData();
    }
  }, [userId]);

  // ฟังก์ชันแปลงข้อมูลการศึกษา (รองรับทั้งค่าจากฟอร์มและจากฐานข้อมูล)
  const getEducationLabel = (level) => {
    const educationLevels = {
      'high_school': 'มัธยมศึกษา',
      'bachelor': 'ปริญญาตรี',
      'master': 'ปริญญาโท',
      'phd': 'ปริญญาเอก',
      'doctorate': 'ปริญญาเอก',
      'vocational': 'อาชีวศึกษา',
      'diploma': 'ปวส./อนุปริญญา',
      'other': 'อื่นๆ'
    };
    return educationLevels[level] || level;
  };

  // ฟังก์ชันแปลงข้อมูลศาสนา (รองรับทั้งค่าจากฟอร์มและค่าที่บันทึกในฐานข้อมูล)
  const getReligionLabel = (religion) => {
    const religions = {
      // values saved in DB
      'buddhist': 'พุทธ',
      'christian': 'คริสต์',
      'muslim': 'อิสลาม',
      'hindu': 'ฮินดู',
      'other': 'อื่นๆ',
      'none': 'ไม่มีศาสนา',
      // values from form select (pre-mapping)
      'buddhism': 'พุทธ',
      'christianity': 'คริสต์',
      'islam': 'อิสลาม',
      'hinduism': 'ฮินดู'
    };
    return religions[religion] || religion;
  };

  // ฟังก์ชันแปลงข้อมูลภาษา
  const getLanguageLabel = (lang) => {
    const languages = {
      'thai': 'ไทย',
      'english': 'อังกฤษ',
      'chinese': 'จีน',
      'japanese': 'ญี่ปุ่น',
      'korean': 'เกาหลี',
      'other': 'อื่นๆ'
    };
    return languages[lang] || lang;
  };

  // ฟังก์ชันแปลงข้อมูลไลฟ์สไตล์ (รองรับทั้งค่าจากฟอร์มและจากฐานข้อมูล)
  const getLifestyleLabel = (category, value) => {
    const lifestyleLabels = {
      smoking: {
        // form values
        'yes': 'สูบบุหรี่',
        'no': 'ไม่สูบบุหรี่',
        'occasionally': 'สูบเป็นครั้งคราว',
        'quit': 'เลิกสูบแล้ว',
        // db values
        'regularly': 'สูบบุหรี่',
        'never': 'ไม่สูบบุหรี่',
        'trying_to_quit': 'เลิกสูบแล้ว'
      },
      drinking: {
        // form values
        'yes': 'ดื่มสุรา',
        'no': 'ไม่ดื่มสุรา',
        'socially': 'ดื่มในงานสังคม',
        'occasionally': 'ดื่มเป็นครั้งคราว',
        'quit': 'ไม่ดื่มสุรา',
        // db values
        'regularly': 'ดื่มสุรา',
        'never': 'ไม่ดื่มสุรา'
      },
      exercise: {
        // form values
        'daily': 'ออกกำลังกายทุกวัน',
        'weekly': 'ออกกำลังกายสัปดาห์ละ 2-3 ครั้ง',
        'monthly': 'ออกกำลังกายเป็นครั้งคราว',
        'never': 'ไม่ค่อยออกกำลังกาย',
        // db values
        'regularly': 'ออกกำลังกายสม่ำเสมอ',
        'sometimes': 'ออกกำลังกายเป็นครั้งคราว',
        'rarely': 'แทบไม่ออกกำลังกาย'
      },
      diet: {
        // form values
        'regular': 'ทานอาหารทั่วไป',
        'vegetarian': 'มังสวิรัติ',
        'vegan': 'วีแกน',
        'halal': 'ฮาลาล',
        'other': 'อื่นๆ',
        // db values
        'omnivore': 'ทานอาหารทั่วไป'
      },
      sleep: {
        // legacy form values
        'early': 'นอนเร็ว (ก่อน 22:00)',
        'normal': 'นอนปกติ (22:00-24:00)',
        'late': 'นอนดึก (หลัง 24:00)',
        'irregular': 'นอนไม่เป็นเวลา',
        // db values (sleepSchedule)
        'early_bird': 'นอนเร็ว ตื่นเช้า',
        'night_owl': 'นอนดึก ตื่นสาย',
        'flexible': 'ยืดหยุ่น'
      }
    };
    return lifestyleLabels[category]?.[value] || value;
  };

  // ฟังก์ชันแปลงข้อมูลความสนใจ
  const getInterestIcon = (category) => {
    const icons = {
      sports: <Dumbbell className="h-4 w-4" />,
      music: <Music className="h-4 w-4" />,
      movies: <Film className="h-4 w-4" />,
      books: <Book className="h-4 w-4" />,
      cooking: <Utensils className="h-4 w-4" />,
      travel: <Plane className="h-4 w-4" />,
      technology: <Code className="h-4 w-4" />,
      art: <Palette className="h-4 w-4" />,
      gaming: <Gamepad2 className="h-4 w-4" />,
      fitness: <Dumbbell className="h-4 w-4" />,
      nature: <Mountain className="h-4 w-4" />,
      photography: <CameraIcon className="h-4 w-4" />,
      dancing: <Music className="h-4 w-4" />,
      other: <Star className="h-4 w-4" />
    };
    return icons[category] || <Star className="h-4 w-4" />;
  };

  // ฟังก์ชันแปลงประเภทสัตว์เลี้ยง
  const getPetTypeLabel = (type) => {
    const map = {
      dog: 'สุนัข',
      cat: 'แมว',
      bird: 'นก',
      fish: 'ปลา',
      rabbit: 'กระต่าย',
      hamster: 'แฮมสเตอร์',
      other: 'อื่นๆ'
    };
    return map[type] || type;
  };

  const normalizePetsInputToTypes = (input) => {
    if (!input) return [];
    const tokenToEnum = {
      'สุนัข': 'dog', 'หมา': 'dog', 'dog': 'dog',
      'แมว': 'cat', 'cat': 'cat',
      'นก': 'bird', 'bird': 'bird',
      'ปลา': 'fish', 'fish': 'fish',
      'กระต่าย': 'rabbit', 'rabbit': 'rabbit',
      'แฮมสเตอร์': 'hamster', 'hamster': 'hamster',
    };
    const normalizeToken = (raw) => {
      if (!raw) return '';
      // remove counts like '1 ตัว', spaces around, and punctuation
      const cleaned = raw
        .replace(/\d+/g, '') // numbers
        .replace(/ตัว/g, '')
        .replace(/จำนวน/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
      return cleaned;
    };
    return input
      .split(',')
      .map(segment => segment.trim())
      .filter(Boolean)
      .flatMap(segment => {
        // extract count if provided (e.g., 'แมว 2 ตัว')
        const countMatch = segment.match(/(\d+)/);
        const count = countMatch ? Math.max(1, parseInt(countMatch[1], 10)) : 1;
        const token = normalizeToken(segment);
        const enumVal = tokenToEnum[token] || 'other';
        return Array(count).fill(enumVal);
      });
  };

  const formatPetsForInput = (pets) => {
    const petArray = Array.isArray(pets) ? pets : (pets?.petTypes || []);
    if (!petArray || petArray.length === 0) return '';
    const counter = petArray.reduce((acc, t) => {
      acc[t] = (acc[t] || 0) + 1; return acc;
    }, {});
    return Object.entries(counter)
      .map(([type, count]) => `${getPetTypeLabel(type)} ${count} ตัว`)
      .join(', ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
        <span className="ml-3 text-gray-600">กำลังโหลดโปรไฟล์...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">ไม่พบข้อมูลโปรไฟล์</p>
      </div>
    );
  }

  console.log('UserProfile render - editMode:', editMode, 'isOwnProfile:', isOwnProfile);
  
  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6 min-h-screen pb-20">
      {/* Mobile-First Header Section */}
      <Card className="p-4 sm:p-6 mt-4">
        <div className="flex flex-col sm:flex-row items-start justify-between mb-4 sm:mb-6 gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4 w-full sm:w-auto">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 flex items-center justify-center text-white text-lg sm:text-2xl font-bold">
                {(() => {
                  // สร้าง profile image URL ที่ถูกต้อง
                  let profileImageUrl = ''
                  if (profile.profileImages && profile.profileImages.length > 0) {
                    const firstImage = profile.profileImages[0]
                    if (firstImage.startsWith('http')) {
                      profileImageUrl = firstImage
                    } else if (firstImage.startsWith('data:image/svg+xml')) {
                      profileImageUrl = firstImage
                    } else {
                      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
                      profileImageUrl = `${baseUrl}/uploads/profiles/${firstImage}`
                    }
                  }
                  
                  return profileImageUrl && !profileImageUrl.startsWith('data:image/svg+xml') ? (
                    <img 
                      src={profileImageUrl}
                      alt="Profile"
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover"
                      onError={(e) => {
                        console.error('❌ Profile image failed to load:', {
                          imageUrl: profileImageUrl,
                          originalImage: profile.profileImages[0],
                          userId: profile._id || profile.id
                        });
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                      onLoad={() => {
                        console.log('✅ Profile image loaded successfully:', {
                          imageUrl: profileImageUrl,
                          originalImage: profile.profileImages[0],
                          userId: profile._id || profile.id
                        });
                      }}
                    />
                  ) : (
                    <User className="h-8 w-8 sm:h-10 sm:w-10" />
                  )
                })()}
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 flex items-center justify-center text-white text-lg sm:text-2xl font-bold hidden`}>
                  <User className="h-8 w-8 sm:h-10 sm:w-10" />
                </div>
              </div>
              {profile.membership && (
                <div className={`absolute -bottom-1 -right-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r ${membershipHelpers.getTierGradient(profile.membership.tier)} flex items-center justify-center text-white text-xs shadow-lg`}>
                  {membershipHelpers.getTierIcon(profile.membership.tier)}
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 mb-1">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">
                  {profile.displayName || `${profile.firstName} ${profile.lastName}`}
                </h1>
                {profile.nickname && (
                  <span className="text-gray-500 text-sm sm:text-base">({profile.nickname})</span>
                )}
                {profile.isVerified && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                    <Award className="h-3 w-3 mr-1" />
                    ยืนยันแล้ว
                  </Badge>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm text-gray-600">
                <span className="flex items-center">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  {getAgeFromDate(profile.dateOfBirth)} ปี
                </span>
                <span className="flex items-center">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  {profile.location}
                </span>
                {profile.membership && (
                  <Badge className={`bg-gradient-to-r ${membershipHelpers.getTierGradient(profile.membership.tier)} text-white text-xs`}>
                    <Crown className="h-3 w-3 mr-1" />
                    {membershipHelpers.getTierName(profile.membership.tier)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {isOwnProfile && sessionStorage.getItem('token') && (
            <Button
              onClick={startEdit}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto text-xs sm:text-sm px-3 sm:px-4 py-2"
            >
              <Edit3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">แก้ไขโปรไฟล์</span>
              <span className="sm:hidden">แก้ไข</span>
            </Button>
          )}
        </div>

        {/* Mobile-First Bio */}
        {profile.bio && (
          <div className="mb-4 sm:mb-6">
            <p className="text-gray-700 leading-relaxed text-sm sm:text-base">{profile.bio}</p>
          </div>
        )}

        {/* Mobile-First Profile Images */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 className="text-base sm:text-lg font-semibold flex items-center">
              <Camera className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-pink-500" />
              รูปภาพ
              {membershipData && (
                <span className="ml-2 text-xs sm:text-sm text-gray-500">
                  ({profile.profileImages ? profile.profileImages.filter(img => !img.startsWith('data:image/svg+xml')).length : 0}/{membershipData.limits.dailyImages === -1 ? 'ไม่จำกัด' : membershipData.limits.dailyImages})
                </span>
              )}
            </h3>
            {isOwnProfile && sessionStorage.getItem('token') && (
              <div className="relative w-full sm:w-auto">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <Button
                  onClick={() => document.getElementById('image-upload').click()}
                  disabled={uploadingImage}
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto text-xs sm:text-sm px-3 sm:px-4 py-2"
                >
                  {uploadingImage ? (
                    <div className="animate-spin h-3 w-3 sm:h-4 sm:w-4 border-2 border-pink-500 border-t-transparent rounded-full mr-1 sm:mr-2" />
                  ) : (
                    <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  )}
                  เพิ่มรูป
                </Button>
              </div>
            )}
          </div>
          
          {/* Image Gallery with Proper Aspect Ratio */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {profile.profileImages && profile.profileImages.length > 0 && !profile.profileImages.every(img => img.startsWith('data:image/svg+xml')) ? (
              profile.profileImages.map((image, originalIndex) => {
                // ข้ามรูป default
                if (image.startsWith('data:image/svg+xml')) return null;
                
                // สร้าง image URL ที่ถูกต้อง
                let imageUrl = image
                if (!image.startsWith('http') && !image.startsWith('data:')) {
                  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
                  imageUrl = `${baseUrl}/uploads/profiles/${image}`
                }
                
                return (
                <div key={originalIndex} className="relative group">
                  <div className="aspect-square w-full bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={`Profile ${originalIndex + 1}`}
                      className="w-full h-full object-cover object-center"
                      style={{ objectFit: 'cover' }}
                      onError={(e) => {
                        console.error('❌ Gallery image failed to load:', {
                          imageUrl: imageUrl,
                          originalImage: image,
                          userId: profile._id || profile.id
                        });
                        e.target.style.display = 'none';
                      }}
                      onLoad={() => {
                        console.log('✅ Gallery image loaded successfully:', {
                          imageUrl: imageUrl,
                          originalImage: image,
                          userId: profile._id || profile.id
                        });
                      }}
                    />
                  </div>
                  {isOwnProfile && sessionStorage.getItem('token') && (
                    <div className="absolute top-1 right-1 sm:top-2 sm:right-2 flex space-x-1">
                      {/* ปุ่มตั้งรูปโปรไฟล์หลัก */}
                      <button
                        onClick={() => setMainProfileImage(originalIndex)}
                        className="bg-blue-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="ตั้งเป็นรูปโปรไฟล์หลัก"
                      >
                        <Star className="h-2 w-2 sm:h-3 sm:w-3" />
                      </button>
                      {/* ปุ่มลบรูป */}
                      <button
                        onClick={() => deleteImage(originalIndex)}
                        className="bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="ลบรูปภาพ"
                      >
                        <X className="h-2 w-2 sm:h-3 sm:w-3" />
                      </button>
                    </div>
                  )}
                  {/* แสดงเครื่องหมายรูปโปรไฟล์หลัก */}
                  {originalIndex === 0 && (
                    <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-green-500 text-white rounded-full px-1 py-0.5 sm:px-2 sm:py-1 text-xs flex items-center">
                      <Star className="h-2 w-2 mr-1" />
                      หลัก
                    </div>
                  )}
                </div>
                );
              }).filter(Boolean)
            ) : (
              // Empty state when no images
              <div className="col-span-2 md:col-span-4">
                <div className="aspect-video w-full bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                  <div className="text-center text-gray-500">
                    <Camera className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">ยังไม่มีรูปภาพ</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* New Simple Tabs Design */}
      <div className="mt-8 mb-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-white border rounded-lg p-1 h-auto">
            <TabsTrigger 
              value="basic"
              className="text-xs sm:text-sm py-2 px-1 sm:px-3 rounded-md data-[state=active]:bg-pink-500 data-[state=active]:text-white"
            >
              ข้อมูลพื้นฐาน
            </TabsTrigger>
            <TabsTrigger 
              value="lifestyle"
              className="text-xs sm:text-sm py-2 px-1 sm:px-3 rounded-md data-[state=active]:bg-pink-500 data-[state=active]:text-white"
            >
              ไลฟ์สไตล์
            </TabsTrigger>
            <TabsTrigger 
              value="interests"
              className="text-xs sm:text-sm py-2 px-1 sm:px-3 rounded-md data-[state=active]:bg-pink-500 data-[state=active]:text-white"
            >
              ความสนใจ
            </TabsTrigger>
            <TabsTrigger 
              value="prompts"
              className="text-xs sm:text-sm py-2 px-1 sm:px-3 rounded-md data-[state=active]:bg-pink-500 data-[state=active]:text-white"
            >
              คำถามพิเศษ
            </TabsTrigger>
          </TabsList>

          {/* Content with Clear Spacing */}
          <TabsContent value="basic" className="mt-6">
            <Card className="p-4 sm:p-6 bg-white border rounded-lg shadow-sm">
            <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center text-gray-800">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mr-3">
                <User className="h-4 w-4 text-white" />
              </div>
              ข้อมูลส่วนตัว
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Enhanced Occupation */}
              <div className="flex items-start space-x-3 sm:space-x-4 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Briefcase className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm sm:text-base text-gray-800 mb-1">อาชีพ</p>
                  <p className="text-sm text-gray-700 mb-1">{profile.occupation?.job || 'ยังไม่ได้ระบุ'}</p>
                  {profile.occupation?.company && (
                    <p className="text-xs text-gray-600">{profile.occupation.company}</p>
                  )}
                </div>
              </div>

              {/* Enhanced Education */}
              <div className="flex items-start space-x-3 sm:space-x-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm sm:text-base text-gray-800 mb-1">จบสถาบันศึกษา</p>
                  <p className="text-sm text-gray-700 mb-1">{profile.education?.institution || 'ยังไม่ได้ระบุ'}</p>
                  {profile.education?.level && (
                    <p className="text-xs text-gray-600">ระดับ: {getEducationLabel(profile.education.level)}</p>
                  )}
                </div>
              </div>

              {/* Enhanced Physical Attributes */}
              <div className="flex items-start space-x-3 sm:space-x-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Ruler className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm sm:text-base text-gray-800 mb-1">ร่างกาย</p>
                  <p className="text-sm text-gray-700">
                    {profile.physicalAttributes?.height || profile.physicalAttributes?.weight ? (
                      <>
                        {profile.physicalAttributes?.height ? `${profile.physicalAttributes.height} ซม.` : ''}
                        {profile.physicalAttributes?.height && profile.physicalAttributes?.weight ? ' / ' : ''}
                        {profile.physicalAttributes?.weight ? `${profile.physicalAttributes.weight} กก.` : ''}
                      </>
                    ) : (
                      'ยังไม่ได้ระบุ'
                    )}
                  </p>
                </div>
              </div>

              {/* Enhanced Religion */}
              <div className="flex items-start space-x-3 sm:space-x-4 p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Church className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm sm:text-base text-gray-800 mb-1">ศาสนา</p>
                  <p className="text-sm text-gray-700">{profile.religion ? getReligionLabel(profile.religion) : 'ยังไม่ได้ระบุ'}</p>
                </div>
              </div>

              {/* Enhanced Languages */}
              <div className="flex items-start space-x-3 sm:space-x-4 p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Languages className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm sm:text-base text-gray-800 mb-1">ภาษา</p>
                  <p className="text-sm text-gray-700">
                    {Array.isArray(profile.languages) && profile.languages.length > 0
                      ? profile.languages.join(', ')
                      : 'ยังไม่ได้ระบุ'}
                  </p>
                </div>
              </div>

              {/* Enhanced Pets */}
              <div className="flex items-start space-x-3 sm:space-x-4 p-3 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg border border-pink-200">
                <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Dog className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm sm:text-base text-gray-800 mb-1">สัตว์เลี้ยง</p>
                  <p className="text-sm text-gray-700">
                    {(() => {
                      const petArray = Array.isArray(profile.pets)
                        ? profile.pets
                        : (profile.pets?.petTypes || []);
                      if (!petArray || petArray.length === 0) return 'ยังไม่ได้ระบุ';
                      const counter = petArray.reduce((acc, t) => {
                        acc[t] = (acc[t] || 0) + 1; return acc;
                      }, {});
                      return Object.entries(counter)
                        .map(([type, count]) => `${getPetTypeLabel(type)} ${count} ตัว`)
                        .join(', ');
                    })()}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

          <TabsContent value="lifestyle" className="mt-6">
            <Card className="p-4 sm:p-6 bg-white border rounded-lg shadow-sm">
            <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center text-gray-800">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mr-3">
                <Heart className="h-4 w-4 text-white" />
              </div>
              ไลฟ์สไตล์
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="flex items-start space-x-3 sm:space-x-4 p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border border-red-200">
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Cigarette className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm sm:text-base text-gray-800 mb-1">การสูบบุหรี่</p>
                  <p className="text-sm text-gray-700">{profile.lifestyle?.smoking ? getLifestyleLabel('smoking', profile.lifestyle.smoking) : 'ยังไม่ได้ระบุ'}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 sm:space-x-4 p-3 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-200">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Wine className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm sm:text-base text-gray-800 mb-1">การดื่มสุรา</p>
                  <p className="text-sm text-gray-700">{profile.lifestyle?.drinking ? getLifestyleLabel('drinking', profile.lifestyle.drinking) : 'ยังไม่ได้ระบุ'}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 sm:space-x-4 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Dumbbell className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm sm:text-base text-gray-800 mb-1">การออกกำลังกาย</p>
                  <p className="text-sm text-gray-700">{profile.lifestyle?.exercise ? getLifestyleLabel('exercise', profile.lifestyle.exercise) : 'ยังไม่ได้ระบุ'}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 sm:space-x-4 p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Utensils className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm sm:text-base text-gray-800 mb-1">อาหาร</p>
                  <p className="text-sm text-gray-700">{profile.lifestyle?.diet ? getLifestyleLabel('diet', profile.lifestyle.diet) : 'ยังไม่ได้ระบุ'}</p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

          <TabsContent value="interests" className="mt-6">
            <Card className="p-4 sm:p-6 bg-white border rounded-lg shadow-sm">
            <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center text-gray-800">
              <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center mr-3">
                <Star className="h-4 w-4 text-white" />
              </div>
              ความสนใจ
            </h3>
            
            <div className="grid grid-cols-1 gap-4 sm:gap-6">
              {[
                { key: 'sports', label: 'กิจกรรมที่ชอบ', testData: 'ดูหนัง, ฟังเพลง, เล่นเกม', icon: <Dumbbell className="h-4 w-4" />, color: 'from-blue-500 to-cyan-500', bgColor: 'from-blue-50 to-cyan-50', borderColor: 'border-blue-200' },
                { key: 'music', label: 'เพลงที่ชอบ', testData: 'Hello Goodbye - The Beatles', icon: <Music className="h-4 w-4" />, color: 'from-purple-500 to-pink-500', bgColor: 'from-purple-50 to-pink-50', borderColor: 'border-purple-200' },
                { key: 'movies', label: 'หนังที่ชอบ', testData: 'Interstellar, Oppenheimer', icon: <Film className="h-4 w-4" />, color: 'from-green-500 to-emerald-500', bgColor: 'from-green-50 to-emerald-50', borderColor: 'border-green-200' }
              ].map((item) => {
                // ใช้ข้อมูลจาก sessionStorage ชั่วคราว
                const savedData = sessionStorage.getItem(`interest_${item.key}`) || '';
                const description = savedData || item.testData || '';
                
                return (
                  <div key={item.key} className={`p-4 bg-gradient-to-r ${item.bgColor} rounded-lg border ${item.borderColor}`}>
                    <div className="flex items-center mb-3">
                      <div className={`w-8 h-8 bg-gradient-to-r ${item.color} rounded-lg flex items-center justify-center mr-3`}>
                        {item.icon}
                      </div>
                      <h4 className="font-semibold text-gray-800">{item.label}</h4>
                    </div>
                    <div className="text-sm text-gray-700">
                      {description ? (
                        description.includes(',') ? (
                          <div className="flex flex-wrap gap-2">
                            {description.split(',').map((desc, index) => (
                              <span key={index} className="inline-block bg-white/80 text-gray-800 px-3 py-1 rounded-full text-xs font-medium shadow-sm border">
                                {desc.trim()}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="bg-white/60 p-3 rounded-lg">{description}</p>
                        )
                      ) : (
                        <p className="text-gray-500 bg-white/40 p-3 rounded-lg">ยังไม่ได้ระบุ</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>

          <TabsContent value="prompts" className="mt-6">
            <Card className="p-4 sm:p-6 bg-white border rounded-lg shadow-sm">
            <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center text-gray-800">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center mr-3">
                <MessageCircle className="h-4 w-4 text-white" />
              </div>
              คำถามพิเศษ
            </h3>
            
            <div className="space-y-4 sm:space-y-6">
              {[
                'my_special_talent',
                'way_to_win_my_heart',
                'dream_destination',
                'last_laugh_until_tears',
                'perfect_first_date',
                'life_motto',
                'favorite_memory',
                'biggest_fear',
                'dream_job',
                'guilty_pleasure'
              ].map((qKey, index) => {
                const labels = {
                  'my_special_talent': 'ความสามารถพิเศษของฉันคือ...',
                  'way_to_win_my_heart': 'วิธีชนะใจฉันคือ...',
                  'dream_destination': 'สถานที่ในฝันที่อยากไปคือ...',
                  'last_laugh_until_tears': 'ครั้งล่าสุดที่หัวเราะจนน้ำตาไหลคือ...',
                  'perfect_first_date': 'เดทแรกในฝันของฉันคือ...',
                  'life_motto': 'คติประจำใจของฉันคือ...',
                  'favorite_memory': 'ความทรงจำที่ชื่นชอบที่สุดคือ...',
                  'biggest_fear': 'สิ่งที่กลัวที่สุดคือ...',
                  'dream_job': 'งานในฝันของฉันคือ...',
                  'guilty_pleasure': 'ความผิดที่ชอบทำคือ...'
                };
                const matched = (profile.promptAnswers || []).find(p => p.question === qKey);
                const colors = [
                  'from-pink-50 to-rose-50 border-pink-200',
                  'from-blue-50 to-cyan-50 border-blue-200',
                  'from-green-50 to-emerald-50 border-green-200',
                  'from-purple-50 to-violet-50 border-purple-200',
                  'from-orange-50 to-amber-50 border-orange-200',
                  'from-indigo-50 to-blue-50 border-indigo-200',
                  'from-red-50 to-pink-50 border-red-200',
                  'from-yellow-50 to-orange-50 border-yellow-200',
                  'from-teal-50 to-cyan-50 border-teal-200',
                  'from-gray-50 to-slate-50 border-gray-200'
                ];
                const colorClass = colors[index % colors.length];
                
                return (
                  <div key={qKey} className={`bg-gradient-to-r ${colorClass} border rounded-xl p-4 sm:p-5 shadow-sm`}>
                    <h4 className="font-semibold text-gray-800 mb-3 text-sm sm:text-base">{labels[qKey]}</h4>
                    <div className="bg-white/60 p-3 rounded-lg">
                      <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
                        {matched?.answer || 'ยังไม่ได้ตอบ'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Profile Modal */}
      <Dialog open={editMode} onOpenChange={(open) => {
        console.log('Dialog onOpenChange called with:', open);
        console.log('Current editData:', editData);
        setEditMode(open);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>แก้ไขโปรไฟล์</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลโปรไฟล์ของคุณเพื่อให้ผู้อื่นรู้จักคุณมากขึ้น
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg text-blue-600 flex items-center">
                📋 ข้อมูลพื้นฐาน
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nickname">ชื่อเล่น</Label>
                  <Input
                    id="nickname"
                    value={editData.nickname || ''}
                    onChange={(e) => setEditData({...editData, nickname: e.target.value})}
                    placeholder="ชื่อเล่น"
                  />
                </div>
                
                <div>
                  <Label htmlFor="location">ที่อยู่ (จังหวัด/เมือง)</Label>
                  <Input
                    id="location"
                    value={editData.location || ''}
                    onChange={(e) => setEditData({...editData, location: e.target.value})}
                    placeholder="เช่น กรุงเทพฯ, เชียงใหม่"
                  />
                </div>
              </div>

              {/* Occupation + Education Level */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="job">อาชีพ</Label>
                  <Input
                    id="job"
                    value={editData.occupation?.job || ''}
                    onChange={(e) => setEditData({
                      ...editData, 
                      occupation: { ...(editData.occupation || {}), job: e.target.value }
                    })}
                    placeholder="อาชีพ"
                  />
                </div>
                
                <div>
                  <Label htmlFor="education_level">ระดับการศึกษา</Label>
                  <select
                    id="education_level"
                    value={editData.education?.level || ''}
                    onChange={(e) => setEditData({
                      ...editData, 
                      education: { ...(editData.education || {}), level: e.target.value }
                    })}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">เลือกระดับการศึกษา</option>
                    <option value="high_school">มัธยมศึกษา</option>
                    <option value="bachelor">ปริญญาตรี</option>
                    <option value="master">ปริญญาโท</option>
                    <option value="phd">ปริญญาเอก</option>
                    <option value="vocational">อาชีวศึกษา</option>
                    <option value="other">อื่นๆ</option>
                  </select>
                </div>
              </div>

              {/* Physical Attributes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="height">ส่วนสูง (ซม.)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={editData.physicalAttributes?.height || ''}
                    onChange={(e) => setEditData({
                      ...editData, 
                      physicalAttributes: { ...(editData.physicalAttributes || {}), height: e.target.value }
                    })}
                    placeholder="ส่วนสูง"
                  />
                </div>
                
                <div>
                  <Label htmlFor="weight">น้ำหนัก (กก.)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={editData.physicalAttributes?.weight || ''}
                    onChange={(e) => setEditData({
                      ...editData, 
                      physicalAttributes: { ...(editData.physicalAttributes || {}), weight: e.target.value }
                    })}
                    placeholder="น้ำหนัก"
                  />
                </div>
              </div>

              {/* Institution + Languages (same row) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="institution">สถาบันการศึกษา</Label>
                  <Input
                    id="institution"
                    value={editData.education?.institution || ''}
                    onChange={(e) => setEditData({
                      ...editData, 
                      education: { ...(editData.education || {}), institution: e.target.value }
                    })}
                    placeholder="ชื่อสถาบันการศึกษา"
                  />
                </div>
                <div>
                  <Label htmlFor="languages">ภาษาที่พูดได้</Label>
                  <Input
                    id="languages"
                    value={editData.languages?.join(', ') || ''}
                    onChange={(e) => setEditData({
                      ...editData, 
                      languages: e.target.value.split(',').map(lang => lang.trim()).filter(lang => lang)
                    })}
                    placeholder="ตัวอย่าง: ไทย, อังกฤษ, จีน"
                  />
                </div>
              </div>

              {/* Religion + Pets (same row) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="religion">ศาสนา</Label>
                  <select
                    id="religion"
                    value={editData.religion || ''}
                    onChange={(e) => setEditData({...editData, religion: e.target.value})}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">เลือกศาสนา</option>
                    <option value="buddhist">พุทธ</option>
                    <option value="christian">คริสต์</option>
                    <option value="muslim">อิสลาม</option>
                    <option value="hindu">ฮินดู</option>
                    <option value="other">อื่นๆ</option>
                    <option value="none">ไม่มีศาสนา</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="pets">สัตว์เลี้ยง</Label>
                  <Input
                    id="pets"
                    value={petsInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      setPetsInput(value);
                      setEditData({
                        ...editData,
                        pets: normalizePetsInputToTypes(value)
                      });
                    }}
                    placeholder="แมว 1 ตัว, สนุก 1 ตัว"
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg text-indigo-600 flex items-center">
                  💬 เกี่ยวกับฉัน
                </h4>
                
                <div>
                  <Label htmlFor="bio">Bio / About Me</Label>
                  <textarea
                    id="bio"
                    value={editData.bio || ''}
                    onChange={(e) => setEditData({...editData, bio: e.target.value})}
                    placeholder="เล่าเกี่ยวกับตัวเอง... จุดเด่น สิ่งที่ชอบทำ สิ่งที่กำลังเรียนรู้ สิ่งที่มองหา"
                    className="w-full p-3 border rounded-lg resize-none h-32"
                    maxLength={1000}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {editData.bio?.length || 0}/1000 ตัวอักษร
                  </p>
                </div>
              </div>

            </div>

            {/* Lifestyle */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg text-green-600 flex items-center">
                🌟 ไลฟ์สไตล์
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smoking">การสูบบุหรี่</Label>
                  <select
                    id="smoking"
                    value={editData.lifestyle?.smoking || ''}
                    onChange={(e) => setEditData({
                      ...editData, 
                      lifestyle: { ...(editData.lifestyle || {}), smoking: e.target.value }
                    })}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">เลือก</option>
                    <option value="never">ไม่สูบบุหรี่</option>
                    <option value="regularly">สูบบุหรี่</option>
                    <option value="occasionally">สูบเป็นครั้งคราว</option>
                    <option value="trying_to_quit">เลิกสูบแล้ว</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="drinking">การดื่มสุรา</Label>
                  <select
                    id="drinking"
                    value={editData.lifestyle?.drinking || ''}
                    onChange={(e) => setEditData({
                      ...editData, 
                      lifestyle: { ...(editData.lifestyle || {}), drinking: e.target.value }
                    })}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">เลือก</option>
                    <option value="never">ไม่ดื่มสุรา</option>
                    <option value="regularly">ดื่มสุรา</option>
                    <option value="socially">ดื่มในงานสังคม</option>
                    <option value="occasionally">ดื่มเป็นครั้งคราว</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="exercise">การออกกำลังกาย</Label>
                  <select
                    id="exercise"
                    value={editData.lifestyle?.exercise || ''}
                    onChange={(e) => setEditData({
                      ...editData, 
                      lifestyle: { ...(editData.lifestyle || {}), exercise: e.target.value }
                    })}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">เลือก</option>
                    <option value="daily">ออกกำลังกายทุกวัน</option>
                    <option value="regularly">ออกกำลังกายสม่ำเสมอ</option>
                    <option value="sometimes">ออกกำลังกายเป็นครั้งคราว</option>
                    <option value="rarely">แทบไม่ออกกำลังกาย</option>
                    <option value="never">ไม่ค่อยออกกำลังกาย</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="diet">อาหาร</Label>
                  <select
                    id="diet"
                    value={editData.lifestyle?.diet || ''}
                    onChange={(e) => setEditData({
                      ...editData, 
                      lifestyle: { ...(editData.lifestyle || {}), diet: e.target.value }
                    })}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">เลือก</option>
                    <option value="omnivore">ทานอาหารทั่วไป</option>
                    <option value="vegetarian">มังสวิรัติ</option>
                    <option value="vegan">วีแกน</option>
                    <option value="other">อื่นๆ</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Interests (editable) */}
            <div className="space-y-2 mt-6">
              <h4 className="font-semibold text-lg text-orange-600 flex items-center">
                🎯 ความสนใจ
              </h4>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { key: 'sports', label: 'กิจกรรมที่ชอบ' },
                  { key: 'music', label: 'เพลงที่ชอบ' },
                  { key: 'movies', label: 'หนังที่ชอบ' }
                ].map((item) => {
                  const currentList = Array.isArray(editData.interests) ? editData.interests : [];
                  const existing = currentList.find(i => i.category === item.key);
                  const savedData = sessionStorage.getItem(`interest_${item.key}`) || '';
                  const value = existing?.description || savedData || '';
                  return (
                    <div key={item.key}>
                      <Label htmlFor={`interest-${item.key}`}>
                        {item.label}
                      </Label>
                      <Input
                        id={`interest-${item.key}`}
                        value={value}
                        onChange={(e) => {
                          const desc = e.target.value;
                          
                          // บันทึกใน sessionStorage ชั่วคราว
                          if (desc.trim()) {
                            sessionStorage.setItem(`interest_${item.key}`, desc);
                          } else {
                            sessionStorage.removeItem(`interest_${item.key}`);
                          }
                          
                          const updated = [...currentList];
                          const idx = updated.findIndex(i => i.category === item.key);
                          if (desc.trim() === '') {
                            if (idx !== -1) updated.splice(idx, 1);
                          } else {
                            if (idx === -1) updated.push({ category: item.key, description: desc });
                            else updated[idx] = { ...updated[idx], description: desc };
                          }
                          setEditData({ ...editData, interests: updated });
                        }}
                        placeholder={
                          item.key === 'sports' ? 'ดูหนัง, ฟังเพลง, เล่นเกม' :
                          item.key === 'music' ? 'เพลงโปรดของคุณ....' :
                          'หนังโปรดของคุณคือ....'
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Special Questions */}
            <div className="space-y-4 mt-6">
              <h4 className="font-bold text-xl text-purple-600 flex items-center">
                ✨ คำถามพิเศษ ⭐
              </h4>
              <div className="grid grid-cols-1 gap-4">
                {[
                  'my_special_talent',
                  'way_to_win_my_heart',
                  'dream_destination',
                  'last_laugh_until_tears',
                  'perfect_first_date',
                  'life_motto',
                  'favorite_memory',
                  'biggest_fear',
                  'dream_job',
                  'guilty_pleasure'
                ].map((qKey) => {
                  const currentList = Array.isArray(editData.promptAnswers) ? editData.promptAnswers : [];
                  const existing = currentList.find(p => p.question === qKey);
                  const value = existing?.answer || '';
                  return (
                    <div key={qKey}>
                      <Label htmlFor={`prompt-${qKey}`}>{profileHelpers.getPromptQuestionLabel(qKey)}</Label>
                      <Input
                        id={`prompt-${qKey}`}
                        value={value}
                        onChange={(e) => {
                          const answer = e.target.value;
                          const updated = [...currentList];
                          const idx = updated.findIndex(p => p.question === qKey);
                          if (answer.trim() === '') {
                            if (idx !== -1) updated.splice(idx, 1);
                          } else {
                            if (idx === -1) updated.push({ question: qKey, answer: answer });
                            else updated[idx] = { ...updated[idx], answer: answer };
                          }
                          setEditData({ ...editData, promptAnswers: updated });
                        }}
                        placeholder={`ตอบคำถาม: ${profileHelpers.getPromptQuestionLabel(qKey)}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={cancelEdit}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={saveProfile}
                disabled={saving}
                className="bg-gradient-to-r from-pink-500 to-violet-500 text-white"
              >
                {saving ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default UserProfile;
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, Radio, Hash, Eye, EyeOff, Users, Settings, Mic, Camera, Palette } from 'lucide-react';
import StreamCreatedModal from './StreamCreatedModal';
import CustomAlert from './CustomAlert';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const CreateStreamModal = ({ isOpen, onClose, onStreamCreated }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showCreatedModal, setShowCreatedModal] = useState(false);
  const [createdStream, setCreatedStream] = useState(null);
  
  // Custom Alert states
  const [alertState, setAlertState] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'ตกลง'
  });
  
  // Check if user is admin
  const isAdmin = user && (user.isAdmin === true || user.isSuperAdmin === true || user.role === 'admin' || user.role === 'superadmin');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'talk',
    tags: '',
    privacy: 'public',
    allowComments: true,
    slowMode: true,
    slowModeDelay: 5,
    requireFollowToChat: false,
    thumbnail: ''
  });

  const categories = [
    { value: 'talk', label: '💬 พูดคุย', icon: '💬' },
    { value: 'music', label: '🎵 ดนตรี', icon: '🎵' },
    { value: 'gaming', label: '🎮 เกม', icon: '🎮' },
    { value: 'lifestyle', label: '🌟 ไลฟ์สไตล์', icon: '🌟' },
    { value: 'education', label: '📚 การศึกษา', icon: '📚' },
    { value: 'cooking', label: '🍳 ทำอาหาร', icon: '🍳' },
    { value: 'fitness', label: '💪 ฟิตเนส', icon: '💪' },
    { value: 'art', label: '🎨 ศิลปะ', icon: '🎨' },
    { value: 'other', label: '🔮 อื่นๆ', icon: '🔮' }
  ];

  const popularTags = [
    'พูดคุย', 'เพลง', 'เกม', 'ตลก', 'ทอล์คโชว์', 'Q&A', 'สอน', 'รีวิว', 
    'อาหาร', 'แฟชั่น', 'ความงาม', 'ท่องเที่ยว', 'สัตว์เลี้ยง', 'กีฬา'
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleTagClick = (tag) => {
    const currentTags = formData.tags.split(',').map(t => t.trim()).filter(t => t);
    if (!currentTags.includes(tag)) {
      const newTags = [...currentTags, tag].join(', ');
      setFormData(prev => ({ ...prev, tags: newTags }));
    }
  };

  const removeTag = (tagToRemove) => {
    const currentTags = formData.tags.split(',').map(t => t.trim()).filter(t => t && t !== tagToRemove);
    setFormData(prev => ({ ...prev, tags: currentTags.join(', ') }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Double check admin permission
    if (!isAdmin) {
      setAlertState({
        isOpen: true,
        type: 'warning',
        title: 'ไม่มีสิทธิ์',
        message: 'คุณไม่มีสิทธิ์สร้างห้องไลฟ์สตรีม',
        confirmText: 'ตกลง'
      });
      return;
    }
    
    if (!formData.title.trim()) {
      setAlertState({
        isOpen: true,
        type: 'warning',
        title: 'ข้อมูลไม่ครบถ้วน',
        message: 'กรุณาใส่ชื่อห้องไลฟ์',
        confirmText: 'ตกลง'
      });
      return;
    }

    setLoading(true);
    try {
      const tags = formData.tags.split(',').map(t => t.trim()).filter(t => t);
      
      const response = await fetch(`${API_BASE_URL}/api/stream/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          tags: tags
        })
      });

      const data = await response.json();

      if (data.success) {
        const stream = data.data;
        
        // Show custom modal instead of browser alert
        setCreatedStream(stream);
        setShowCreatedModal(true);
        
        onStreamCreated && onStreamCreated(stream);
        onClose();
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          category: 'talk',
          tags: '',
          privacy: 'public',
          allowComments: true,
          slowMode: true,
          slowModeDelay: 5,
          requireFollowToChat: false,
          thumbnail: ''
        });
      } else {
        setAlertState({
          isOpen: true,
          type: 'error',
          title: 'สร้างไม่สำเร็จ',
          message: data.message || 'เกิดข้อผิดพลาดในการสร้างห้องไลฟ์',
          confirmText: 'ตกลง'
        });
      }
    } catch (error) {
      console.error('Error creating stream:', error);
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'ข้อผิดพลาด',
        message: 'เกิดข้อผิดพลาดในการสร้างห้องไลฟ์',
        confirmText: 'ตกลง'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  // Don't render if not admin
  if (!isAdmin) {
    return null;
  }

  if (!isOpen) return null;

  const handleCreatedModalClose = () => {
    setShowCreatedModal(false);
    setCreatedStream(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <div className="flex items-center gap-3">
            <Radio className="h-6 w-6" />
            <h2 className="text-xl font-bold">สร้างห้องไลฟ์สตรีม</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Mic className="h-5 w-5 text-purple-500" />
              ข้อมูลพื้นฐาน
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อห้องไลฟ์ *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="ตั้งชื่อห้องไลฟ์ของคุณ..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                maxLength={100}
                required
              />
              <p className="text-xs text-gray-500 mt-1">{formData.title.length}/100</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                คำอธิบาย
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="บอกผู้ชมเกี่ยวกับไลฟ์สตรีมนี้..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">{formData.description.length}/500</p>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Palette className="h-5 w-5 text-purple-500" />
              หมวดหมู่
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map(category => (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, category: category.value }))}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    formData.category === category.value
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{category.icon}</span>
                    <span className="text-sm font-medium">{category.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Hash className="h-5 w-5 text-purple-500" />
              แท็ก
            </h3>
            
            <div>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                placeholder="พิมพ์แท็ก หรือเลือกจากรายการด้านล่าง..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Popular Tags */}
            <div>
              <p className="text-sm text-gray-600 mb-2">แท็กยอดนิยม:</p>
              <div className="flex flex-wrap gap-2">
                {popularTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagClick(tag)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm transition-colors"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Tags */}
            {formData.tags && (
              <div>
                <p className="text-sm text-gray-600 mb-2">แท็กที่เลือก:</p>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag).map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-2"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:bg-purple-200 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Privacy & Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-500" />
              การตั้งค่า
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {formData.privacy === 'public' ? (
                    <Eye className="h-5 w-5 text-green-500" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-orange-500" />
                  )}
                  <div>
                    <p className="font-medium text-gray-800">
                      {formData.privacy === 'public' ? 'สาธารณะ' : 'ส่วนตัว'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formData.privacy === 'public' 
                        ? 'ทุกคนสามารถเข้าชมได้' 
                        : 'เฉพาะเพื่อนที่ติดตามเท่านั้น'
                      }
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ 
                    ...prev, 
                    privacy: prev.privacy === 'public' ? 'private' : 'public' 
                  }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.privacy === 'public' ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.privacy === 'public' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-800">อนุญาตให้แสดงความคิดเห็น</p>
                    <p className="text-sm text-gray-600">ผู้ชมสามารถแชทได้</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  name="allowComments"
                  checked={formData.allowComments}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
              </div>

              {formData.allowComments && (
                <div className="ml-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium text-gray-800">Slow Mode</p>
                    <input
                      type="checkbox"
                      name="slowMode"
                      checked={formData.slowMode}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                  </div>
                  {formData.slowMode && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">
                        ดีลย์การส่งข้อความ (วินาที)
                      </label>
                      <select
                        name="slowModeDelay"
                        value={formData.slowModeDelay}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value={1}>1 วินาที</option>
                        <option value={3}>3 วินาที</option>
                        <option value={5}>5 วินาที</option>
                        <option value={10}>10 วินาที</option>
                        <option value={15}>15 วินาที</option>
                        <option value={30}>30 วินาที</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  กำลังสร้าง...
                </>
              ) : (
                <>
                  <Radio className="h-4 w-4" />
                  สร้างห้องไลฟ์
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Stream Created Modal */}
      <StreamCreatedModal
        isOpen={showCreatedModal}
        onClose={handleCreatedModalClose}
        stream={createdStream}
      />

      {/* Custom Alert Modal */}
      <CustomAlert
        isOpen={alertState.isOpen}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        confirmText={alertState.confirmText}
      />
    </div>
  );
};

export default CreateStreamModal;

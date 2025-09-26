import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { X } from 'lucide-react';
import { useToast } from './ui/toast';

const CreatePrivateRoomModal = ({ isOpen, onClose, onCreateRoom, currentUser }) => {
  const { success, error } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    entryFee: 0,
    maxMembers: 100,
    allowGifts: true,
    allowCoinGifts: true,
    moderationEnabled: false,
    minAge: 18,
    maxAge: 100
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      error('❌ กรุณากรอกชื่อห้องแชท', 5000);
      return;
    }

    setLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/chatroom`,
        {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            type: 'private',
            ownerId: currentUser._id,
            entryFee: parseInt(formData.entryFee) || 0,
            settings: {
              maxMembers: parseInt(formData.maxMembers) || 100,
              allowGifts: formData.allowGifts,
              allowCoinGifts: formData.allowCoinGifts,
              moderationEnabled: formData.moderationEnabled
            },
            ageRestriction: {
              minAge: parseInt(formData.minAge) || 18,
              maxAge: parseInt(formData.maxAge) || 100
            }
          })
        }
      );

      const data = await response.json();
      
      if (data.success) {
        success('✅ สร้างห้องแชทส่วนตัวสำเร็จ!', 5000);
        onCreateRoom(data.data);
        onClose();
        setFormData({
          name: '',
          description: '',
          entryFee: 0,
          maxMembers: 100,
          allowGifts: true,
          allowCoinGifts: true,
          moderationEnabled: false,
          minAge: 18,
          maxAge: 100
        });
      } else {
        error(`❌ ${data.message || 'เกิดข้อผิดพลาดในการสร้างห้องแชท'}`, 5000);
      }
    } catch (error) {
      console.error('Error creating private room:', error);
      error('❌ เกิดข้อผิดพลาดในการสร้างห้องแชท', 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">สร้างห้องแชทส่วนตัว</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* ชื่อห้องแชท */}
          <div>
            <Label htmlFor="name">ชื่อห้องแชท *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="กรอกชื่อห้องแชท"
              required
            />
          </div>

          {/* คำอธิบาย */}
          <div>
            <Label htmlFor="description">คำอธิบาย</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="อธิบายเกี่ยวกับห้องแชทนี้"
              rows={3}
            />
          </div>

          {/* ค่าเข้า */}
          <div>
            <Label htmlFor="entryFee">ค่าเข้า (เหรียญ)</Label>
            <Input
              id="entryFee"
              type="number"
              min="0"
              value={formData.entryFee}
              onChange={(e) => handleInputChange('entryFee', e.target.value)}
              placeholder="0"
            />
          </div>

          {/* จำนวนสมาชิกสูงสุด */}
          <div>
            <Label htmlFor="maxMembers">จำนวนสมาชิกสูงสุด</Label>
            <Input
              id="maxMembers"
              type="number"
              min="1"
              max="1000"
              value={formData.maxMembers}
              onChange={(e) => handleInputChange('maxMembers', e.target.value)}
              placeholder="100"
            />
          </div>

          {/* ข้อจำกัดอายุ */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minAge">อายุขั้นต่ำ</Label>
              <Input
                id="minAge"
                type="number"
                min="13"
                max="100"
                value={formData.minAge}
                onChange={(e) => handleInputChange('minAge', e.target.value)}
                placeholder="18"
              />
            </div>
            <div>
              <Label htmlFor="maxAge">อายุสูงสุด</Label>
              <Input
                id="maxAge"
                type="number"
                min="13"
                max="100"
                value={formData.maxAge}
                onChange={(e) => handleInputChange('maxAge', e.target.value)}
                placeholder="100"
              />
            </div>
          </div>

          {/* การตั้งค่าเพิ่มเติม */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="allowGifts">อนุญาตให้ส่งของขวัญ</Label>
              <Switch
                id="allowGifts"
                checked={formData.allowGifts}
                onCheckedChange={(checked) => handleInputChange('allowGifts', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="allowCoinGifts">อนุญาตให้ส่งเหรียญ</Label>
              <Switch
                id="allowCoinGifts"
                checked={formData.allowCoinGifts}
                onCheckedChange={(checked) => handleInputChange('allowCoinGifts', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="moderationEnabled">เปิดการตรวจสอบข้อความ</Label>
              <Switch
                id="moderationEnabled"
                checked={formData.moderationEnabled}
                onCheckedChange={(checked) => handleInputChange('moderationEnabled', checked)}
              />
            </div>
          </div>

          {/* ปุ่ม */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
              disabled={loading}
            >
              {loading ? 'กำลังสร้าง...' : 'สร้างห้องแชท'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePrivateRoomModal;

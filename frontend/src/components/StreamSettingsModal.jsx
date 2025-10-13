import React, { useState, useEffect } from 'react';
import { X, Settings, Save, Eye, EyeOff, Users, MessageCircle, Clock } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const StreamSettingsModal = ({ isOpen, onClose, stream, onSettingsUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    allowComments: true,
    slowMode: true,
    slowModeDelay: 5,
    requireFollowToChat: false
  });

  useEffect(() => {
    if (stream && stream.settings) {
      setSettings({
        allowComments: stream.settings.allowComments ?? true,
        slowMode: stream.settings.slowMode ?? true,
        slowModeDelay: stream.settings.slowModeDelay ?? 5,
        requireFollowToChat: stream.settings.requireFollowToChat ?? false
      });
    }
  }, [stream]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stream) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/stream/${stream._id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          settings: settings
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('อัปเดตการตั้งค่าสำเร็จ!');
        onSettingsUpdated && onSettingsUpdated(data.data);
        onClose();
      } else {
        alert(data.message || 'เกิดข้อผิดพลาดในการอัปเดตการตั้งค่า');
      }
    } catch (error) {
      console.error('Error updating stream settings:', error);
      alert('เกิดข้อผิดพลาดในการอัปเดตการตั้งค่า');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  if (!isOpen || !stream) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-500 text-white">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6" />
            <h2 className="text-xl font-bold">ตั้งค่าไลฟ์สตรีม</h2>
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
          {/* Stream Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-500" />
              ข้อมูลไลฟ์สตรีม
            </h3>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">ชื่อห้อง:</span>
                  <span className="text-sm text-gray-800">{stream.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Stream Key:</span>
                  <span className="text-sm text-gray-800 font-mono">{stream.streamKey}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">สถานะ:</span>
                  <span className={`text-sm px-2 py-1 rounded-full ${
                    stream.isLive 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {stream.isLive ? 'กำลังไลฟ์' : 'ออฟไลน์'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">ผู้ชม:</span>
                  <span className="text-sm text-gray-800">{stream.viewerCount || 0} คน</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-500" />
              ตั้งค่าแชท
            </h3>
            
            <div className="space-y-4">
              {/* Allow Comments */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {settings.allowComments ? (
                    <MessageCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <X className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium text-gray-800">อนุญาตให้แสดงความคิดเห็น</p>
                    <p className="text-sm text-gray-600">ผู้ชมสามารถแชทในไลฟ์ได้</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  name="allowComments"
                  checked={settings.allowComments}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              {/* Slow Mode */}
              {settings.allowComments && (
                <div className="ml-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-gray-800">Slow Mode</span>
                    </div>
                    <input
                      type="checkbox"
                      name="slowMode"
                      checked={settings.slowMode}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  {settings.slowMode && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">
                        ดีลย์การส่งข้อความ (วินาที)
                      </label>
                      <select
                        name="slowModeDelay"
                        value={settings.slowModeDelay}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

              {/* Require Follow */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="font-medium text-gray-800">ต้องติดตามก่อนแชท</p>
                    <p className="text-sm text-gray-600">ผู้ชมต้องติดตามก่อนถึงจะแชทได้</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  name="requireFollowToChat"
                  checked={settings.requireFollowToChat}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
              </div>
            </div>
          </div>

          {/* OBS Instructions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Settings className="h-5 w-5 text-green-500" />
              คำแนะนำการใช้งาน OBS
            </h3>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">1.</span>
                  <span className="text-gray-700">เปิด OBS Studio</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">2.</span>
                  <span className="text-gray-700">ไปที่ Settings → Stream</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">3.</span>
                  <div className="text-gray-700">
                    <span>Server: </span>
                    <code className="bg-green-100 px-2 py-1 rounded text-green-800">
                      rtmp://localhost:1935/live
                    </code>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">4.</span>
                  <div className="text-gray-700">
                    <span>Stream Key: </span>
                    <code className="bg-green-100 px-2 py-1 rounded text-green-800">
                      {stream.streamKey}
                    </code>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">5.</span>
                  <span className="text-gray-700">กด Start Streaming</span>
                </div>
              </div>
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
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  บันทึกการตั้งค่า
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StreamSettingsModal;

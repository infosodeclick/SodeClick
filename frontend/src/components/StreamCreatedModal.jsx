import React, { useState } from 'react';
import { X, Copy, Check, Settings, Radio, ExternalLink } from 'lucide-react';

const StreamCreatedModal = ({ isOpen, onClose, stream }) => {
  const [copiedStreamKey, setCopiedStreamKey] = useState(false);
  const [copiedServerUrl, setCopiedServerUrl] = useState(false);

  const serverUrl = 'rtmp://localhost:1935/live';
  const streamKey = stream?.streamKey || '';

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      
      if (type === 'streamKey') {
        setCopiedStreamKey(true);
        setTimeout(() => setCopiedStreamKey(false), 2000);
      } else if (type === 'serverUrl') {
        setCopiedServerUrl(true);
        setTimeout(() => setCopiedServerUrl(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy: ', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (type === 'streamKey') {
        setCopiedStreamKey(true);
        setTimeout(() => setCopiedStreamKey(false), 2000);
      } else if (type === 'serverUrl') {
        setCopiedServerUrl(true);
        setTimeout(() => setCopiedServerUrl(false), 2000);
      }
    }
  };

  if (!isOpen || !stream) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-500 to-blue-500 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <Radio className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">สร้างห้องไลฟ์สำเร็จ!</h2>
              <p className="text-sm opacity-90">พร้อมสำหรับการไลฟ์สตรีม</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Stream Info */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Settings className="h-5 w-5 text-green-600" />
              ข้อมูลห้องไลฟ์
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">ชื่อห้อง:</span>
                <span className="text-sm text-gray-800 font-semibold">{stream.title}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">คำอธิบาย:</span>
                <span className="text-sm text-gray-800">{stream.description || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">หมวดหมู่:</span>
                <span className="text-sm text-gray-800">{stream.category}</span>
              </div>
            </div>
          </div>

          {/* OBS Setup Instructions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-blue-600" />
              การตั้งค่า OBS Studio
            </h3>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700">เปิด OBS Studio</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700">ไปที่ <strong>Settings</strong> → <strong>Stream</strong></p>
                  </div>
                </div>

                {/* Step 3 - Server URL */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <div className="space-y-2">
                      <p className="text-gray-700">ตั้งค่า <strong>Server:</strong></p>
                      <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-blue-300">
                        <code className="flex-1 text-sm text-gray-800 font-mono bg-gray-100 px-3 py-2 rounded">
                          {serverUrl}
                        </code>
                        <button
                          onClick={() => copyToClipboard(serverUrl, 'serverUrl')}
                          className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                            copiedServerUrl 
                              ? 'bg-green-100 text-green-700 border border-green-300' 
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300'
                          }`}
                        >
                          {copiedServerUrl ? (
                            <>
                              <Check className="h-4 w-4" />
                              <span className="text-sm">คัดลอกแล้ว</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              <span className="text-sm">คัดลอก</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 4 - Stream Key */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    4
                  </div>
                  <div className="flex-1">
                    <div className="space-y-2">
                      <p className="text-gray-700">ตั้งค่า <strong>Stream Key:</strong></p>
                      <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-blue-300">
                        <code className="flex-1 text-sm text-gray-800 font-mono bg-gray-100 px-3 py-2 rounded break-all">
                          {streamKey}
                        </code>
                        <button
                          onClick={() => copyToClipboard(streamKey, 'streamKey')}
                          className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                            copiedStreamKey 
                              ? 'bg-green-100 text-green-700 border border-green-300' 
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300'
                          }`}
                        >
                          {copiedStreamKey ? (
                            <>
                              <Check className="h-4 w-4" />
                              <span className="text-sm">คัดลอกแล้ว</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              <span className="text-sm">คัดลอก</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    5
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700">กด <strong>Start Streaming</strong> ใน OBS</p>
                  </div>
                </div>

                {/* Step 6 */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    6
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700">กลับมาที่เว็บไซต์และกดปุ่ม <strong>"เริ่มไลฟ์"</strong></p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-semibold text-gray-800 mb-2">💡 เคล็ดลับ:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตให้เสถียร</li>
              <li>• ปรับคุณภาพวิดีโอใน OBS ตามความเร็วอินเทอร์เน็ต</li>
              <li>• ใช้ไมโครโฟนและกล้องคุณภาพดีเพื่อประสบการณ์ที่ดี</li>
              <li>• ทดสอบการไลฟ์ก่อนเริ่มจริง</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg hover:from-green-600 hover:to-blue-600 transition-all font-semibold"
            >
              เริ่มไลฟ์เลย!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamCreatedModal;

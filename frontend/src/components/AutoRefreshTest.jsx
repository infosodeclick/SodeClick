import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import autoRefreshManager from '../services/autoRefreshManager';

/**
 * Component สำหรับทดสอบการทำงานของ Auto Refresh Manager
 */
const AutoRefreshTest = () => {
  const [stats, setStats] = useState(null);
  const [testRoomId] = useState('test-room-123');
  const [testUserId] = useState('test-user-123');
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // อัปเดต stats ทุกวินาที
    const interval = setInterval(() => {
      const currentStats = autoRefreshManager.getStats();
      setStats(currentStats);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const startTest = () => {
    console.log('🚀 Starting auto refresh test...');
    setIsRunning(true);
    autoRefreshManager.startChatRefresh(testRoomId, testUserId);
  };

  const stopTest = () => {
    console.log('⏹️ Stopping auto refresh test...');
    setIsRunning(false);
    autoRefreshManager.stopChatRefresh();
  };

  const forceRefresh = () => {
    console.log('🔄 Force refreshing...');
    autoRefreshManager.forceRefresh('immediate');
  };

  const resetStats = () => {
    console.log('📊 Resetting stats...');
    autoRefreshManager.resetStats();
  };

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse">กำลังโหลด...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔧 Auto Refresh Test
          <span className={`px-2 py-1 text-xs rounded ${isRunning ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
            {isRunning ? 'กำลังทำงาน' : 'หยุดทำงาน'}
          </span>
        </CardTitle>
        <CardDescription>
          ทดสอบการทำงานของระบบ Auto Refresh Manager
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ปุ่มควบคุม */}
        <div className="flex gap-2">
          <Button
            onClick={startTest}
            disabled={isRunning}
            size="sm"
          >
            เริ่มทดสอบ
          </Button>
          <Button
            onClick={stopTest}
            disabled={!isRunning}
            variant="outline"
            size="sm"
          >
            หยุดทดสอบ
          </Button>
          <Button
            onClick={forceRefresh}
            variant="outline"
            size="sm"
          >
            รีเฟรชทันที
          </Button>
          <Button
            onClick={resetStats}
            variant="outline"
            size="sm"
          >
            รีเซ็ตสถิติ
          </Button>
        </div>

        {/* สถานะการทำงาน */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>สถานะ:</strong> {stats.isActive ? 'ทำงาน' : 'หยุดทำงาน'}
          </div>
          <div>
            <strong>การมองเห็น:</strong> {stats.isVisible ? 'แสดงผล' : 'ซ่อนอยู่'}
          </div>
          <div>
            <strong>ความถี่ปัจจุบัน:</strong> {stats.currentFrequency}
          </div>
          <div>
            <strong>Uptime:</strong> {stats.uptime} วินาที
          </div>
        </div>

        {/* สถิติการรีเฟรช */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">📊 สถิติการรีเฟรช</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <strong>รวม:</strong> {stats.refreshStats.totalRefreshes}
            </div>
            <div>
              <strong>สำเร็จ:</strong> {stats.refreshStats.successfulRefreshes}
            </div>
            <div>
              <strong>อัตราความสำเร็จ:</strong> {stats.refreshStats.successRate}%
            </div>
            <div>
              <strong>ล่าสุด:</strong> {stats.lastActivity ? new Date(stats.lastActivity).toLocaleTimeString() : 'ไม่เคย'}
            </div>
          </div>
        </div>

        {/* การใช้หน่วยความจำ */}
        {stats.memoryUsage && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">💾 การใช้หน่วยความจำ</h4>
            <div className="text-sm">
              <strong>ใช้งาน:</strong> {stats.memoryUsage.used} MB / {stats.memoryUsage.total} MB
            </div>
          </div>
        )}

        {/* ข้อมูลเครือข่าย */}
        {stats.networkInfo && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">🌐 ข้อมูลเครือข่าย</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <strong>ประเภท:</strong> {stats.networkInfo.effectiveType?.toUpperCase()}
              </div>
              <div>
                <strong>ความเร็ว:</strong> {stats.networkInfo.downlink} Mbps
              </div>
              <div>
                <strong>RTT:</strong> {stats.networkInfo.rtt} ms
              </div>
              <div>
                <strong>Save Data:</strong> {stats.networkInfo.saveData ? 'เปิด' : 'ปิด'}
              </div>
            </div>
          </div>
        )}

        {/* Active intervals */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">⏱️ Active Intervals</h4>
          <div className="text-sm">
            <strong>จำนวน:</strong> {stats.activeIntervals}
          </div>
        </div>

        {/* Service Worker */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">🤖 Service Worker</h4>
          <div className="text-sm">
            <strong>รองรับ:</strong> {stats.serviceWorkerSupported ? 'ใช่' : 'ไม่'}
            <br />
            <strong>ทำงาน:</strong> {stats.serviceWorkerActive ? 'ใช่' : 'ไม่'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AutoRefreshTest;

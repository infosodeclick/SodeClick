import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { useToast } from './ui/toast';
import settingsAPI from '../services/settingsAPI';
import {
  Crown,
  Search,
  User,
  Coins,
  Vote,
  Plus,
  Eye,
  History,
  Shield,
  Star,
  AlertCircle
} from 'lucide-react';

const SuperAdminPanel = () => {
  const { success, error, warning, info } = useToast();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [showCoinsModal, setShowCoinsModal] = useState(false);
  const [showVotePointsModal, setShowVotePointsModal] = useState(false);
  const [showUserStatsModal, setShowUserStatsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [adminActions, setAdminActions] = useState([]);
  const [showPaymentSettingsModal, setShowPaymentSettingsModal] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState({
    bypassEnabled: false
  });

  const [voteForm, setVoteForm] = useState({
    voteType: 'popularity_male',
    points: 1
  });

  const [coinsForm, setCoinsForm] = useState({
    amount: 1000,
    reason: 'SuperAdmin Grant'
  });

  const [votePointsForm, setVotePointsForm] = useState({
    amount: 100,
    reason: 'SuperAdmin Grant'
  });

  const [userStats, setUserStats] = useState(null);

  const voteTypes = [
    { value: 'popularity_male', label: 'ความนิยม (ชาย)' },
    { value: 'popularity_female', label: 'ความนิยม (หญิง)' },
    { value: 'gift_ranking', label: 'อันดับของขวัญ' }
  ];

  useEffect(() => {
    fetchUsers();
    loadPaymentSettings();
  }, [searchTerm]);

  // โหลดการตั้งค่า payment
  const loadPaymentSettings = async () => {
    try {
      // ลองดึงข้อมูลจาก API ก่อน (จะ sync กับ localStorage อัตโนมัติ)
      const result = await settingsAPI.checkPaymentBypassStatus();

      setPaymentSettings({
        bypassEnabled: result.enabled
      });

      console.log(`🔄 Loaded payment bypass settings from ${result.source}:`, result.enabled);
    } catch (error) {
      console.error('Error loading payment settings:', error);

      // Fallback ไปใช้ localStorage ถ้า API ไม่พร้อมใช้งาน
      const bypassEnabled = localStorage.getItem('payment_bypass_enabled') === 'true';
      setPaymentSettings({
        bypassEnabled: bypassEnabled
      });
    }
  };

  // บันทึกการตั้งค่า payment
  const savePaymentSettings = async () => {
    try {
      // บันทึกไปยัง API (จะ sync กับ localStorage อัตโนมัติ)
      const result = await settingsAPI.updatePaymentBypassSettings(
        paymentSettings.bypassEnabled,
        paymentSettings.bypassEnabled ? 'เปิดใช้งานจาก SuperAdmin Panel' : 'ปิดใช้งานจาก SuperAdmin Panel'
      );

      if (result.success) {
        // อัปเดต state ด้วยข้อมูลจาก API response
        setPaymentSettings({
          bypassEnabled: result.data.enabled
        });

        success(result.message || 'บันทึกการตั้งค่า Payment สำเร็จ');
        setShowPaymentSettingsModal(false);
      } else {
        throw new Error(result.message || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (error) {
      console.error('Error saving payment settings:', error);
      error('เกิดข้อผิดพลาดในการบันทึกการตั้งค่า');
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: 1,
        limit: 50,
        search: searchTerm
      });

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      error('เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้', 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/superadmin/vote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUserId: selectedUser._id,
          voteType: voteForm.voteType,
          points: parseInt(voteForm.points)
        })
      });

      if (res.ok) {
        const data = await res.json();
        success(data.message, 3000);
        setShowVoteModal(false);
        setVoteForm({ voteType: 'popularity_male', points: 1 });
        fetchUsers();
      } else {
        const errorData = await res.json();
        error(errorData.message || 'เกิดข้อผิดพลาดในการโหวต', 5000);
      }
    } catch (error) {
      console.error('Error voting:', error);
      error('เกิดข้อผิดพลาดในการโหวต', 5000);
    }
  };

  const handleAddCoins = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/superadmin/add-coins`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUserId: selectedUser._id,
          amount: parseInt(coinsForm.amount),
          reason: coinsForm.reason
        })
      });

      if (res.ok) {
        const data = await res.json();
        success(data.message, 3000);
        setShowCoinsModal(false);
        setCoinsForm({ amount: 1000, reason: 'SuperAdmin Grant' });
        fetchUsers();
      } else {
        const errorData = await res.json();
        error(errorData.message || 'เกิดข้อผิดพลาดในการเพิ่มเหรียญ', 5000);
      }
    } catch (error) {
      console.error('Error adding coins:', error);
      error('เกิดข้อผิดพลาดในการเพิ่มเหรียญ', 5000);
    }
  };

  const handleAddVotePoints = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/superadmin/add-vote-points`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUserId: selectedUser._id,
          amount: parseInt(votePointsForm.amount),
          reason: votePointsForm.reason
        })
      });

      if (res.ok) {
        const data = await res.json();
        success(data.message, 3000);
        setShowVotePointsModal(false);
        setVotePointsForm({ amount: 100, reason: 'SuperAdmin Grant' });
        fetchUsers();
      } else {
        const errorData = await res.json();
        error(errorData.message || 'เกิดข้อผิดพลาดในการเพิ่มคะแนนโหวต', 5000);
      }
    } catch (error) {
      console.error('Error adding vote points:', error);
      error('เกิดข้อผิดพลาดในการเพิ่มคะแนนโหวต', 5000);
    }
  };

  const handleViewUserStats = async (user) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/superadmin/user-stats/${user._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setUserStats(data.data);
        setSelectedUser(user);
        setShowUserStatsModal(true);
      } else {
        const errorData = await res.json();
        error(errorData.message || 'เกิดข้อผิดพลาดในการดึงสถิติผู้ใช้', 5000);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
      error('เกิดข้อผิดพลาดในการดึงสถิติผู้ใช้', 5000);
    }
  };

  const handleViewHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/superadmin/admin-actions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setAdminActions(data.data.actions);
        setShowHistoryModal(true);
      } else {
        const errorData = await res.json();
        error(errorData.message || 'เกิดข้อผิดพลาดในการดึงประวัติ', 5000);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      error('เกิดข้อผิดพลาดในการดึงประวัติ', 5000);
    }
  };

  const getMembershipBadge = (tier) => {
    const badges = {
      'platinum': { label: 'Platinum', className: 'bg-purple-100 text-purple-800' },
      'diamond': { label: 'Diamond', className: 'bg-blue-100 text-blue-800' },
      'vip2': { label: 'VIP 2', className: 'bg-indigo-100 text-indigo-800' },
      'vip1': { label: 'VIP 1', className: 'bg-violet-100 text-violet-800' },
      'vip': { label: 'VIP', className: 'bg-pink-100 text-pink-800' },
      'gold': { label: 'Gold', className: 'bg-yellow-100 text-yellow-800' },
      'silver': { label: 'Silver', className: 'bg-gray-100 text-gray-800' },
      'member': { label: 'Member', className: 'bg-slate-100 text-slate-800' }
    };
    
    const badge = badges[tier] || badges['member'];
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Crown className="h-8 w-8 text-yellow-500" />
            SuperAdmin Panel
          </h1>
          <p className="text-slate-600 mt-1">จัดการระบบด้วยสิทธิ์สูงสุด</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowPaymentSettingsModal(true)} variant="outline">
            <Shield size={16} className="mr-2" />
            ตั้งค่า Payment
          </Button>
          <Button onClick={handleViewHistory} variant="outline">
            <History size={16} className="mr-2" />
            ดูประวัติการกระทำ
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">ค้นหาผู้ใช้</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                <Input
                  id="search"
                  placeholder="ค้นหาด้วยชื่อ, อีเมล, หรือ username"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายชื่อผู้ใช้ ({users.length} คน)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-4 font-medium text-slate-700">ผู้ใช้</th>
                  <th className="text-left p-4 font-medium text-slate-700">ระดับ</th>
                  <th className="text-left p-4 font-medium text-slate-700">เหรียญ</th>
                  <th className="text-left p-4 font-medium text-slate-700">คะแนนโหวต</th>
                  <th className="text-left p-4 font-medium text-slate-700">สถานะ</th>
                  <th className="text-left p-4 font-medium text-slate-700">การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-semibold">
                            {user.firstName?.charAt(0) || user.username?.charAt(0) || 'U'}
                          </div>
                          {/* Online Status Indicator */}
                          <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} 
                               title={user.isOnline ? 'ออนไลน์' : 'ออฟไลน์'}></div>
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-slate-500">@{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {getMembershipBadge(user.membership?.tier)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Coins size={14} className="text-yellow-500" />
                        <span className="font-medium">{user.coins?.toLocaleString() || 0}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Vote size={14} className="text-blue-500" />
                        <span className="font-medium">{user.votePoints?.toLocaleString() || 0}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {user.isActive ? (
                          <Badge className="bg-green-100 text-green-800">ใช้งาน</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">ไม่ใช้งาน</Badge>
                        )}
                        {user.isBanned && (
                          <Badge className="bg-red-100 text-red-800">ถูกแบน</Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowVoteModal(true);
                          }}
                        >
                          <Vote size={14} className="mr-1" />
                          โหวต
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowCoinsModal(true);
                          }}
                        >
                          <Coins size={14} className="mr-1" />
                          เหรียญ
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowVotePointsModal(true);
                          }}
                        >
                          <Star size={14} className="mr-1" />
                          คะแนน
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewUserStats(user)}
                        >
                          <Eye size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Vote Modal */}
      <Dialog open={showVoteModal} onOpenChange={setShowVoteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Vote size={20} />
              โหวตให้ผู้ใช้
            </DialogTitle>
            <DialogDescription>
              โหวตให้ {selectedUser?.displayName || selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="voteType">ประเภทการโหวต</Label>
              <select
                id="voteType"
                value={voteForm.voteType}
                onChange={(e) => setVoteForm({...voteForm, voteType: e.target.value})}
                className="w-full p-2 border border-slate-200 rounded-md"
              >
                {voteTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="points">จำนวนคะแนน</Label>
              <Input
                id="points"
                type="number"
                min="1"
                value={voteForm.points}
                onChange={(e) => setVoteForm({...voteForm, points: e.target.value})}
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleVote} className="flex-1">
                <Vote size={16} className="mr-2" />
                โหวต
              </Button>
              <Button variant="outline" onClick={() => setShowVoteModal(false)} className="flex-1">
                ยกเลิก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Coins Modal */}
      <Dialog open={showCoinsModal} onOpenChange={setShowCoinsModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins size={20} />
              เพิ่มเหรียญ
            </DialogTitle>
            <DialogDescription>
              เพิ่มเหรียญให้ {selectedUser?.displayName || selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="coinsAmount">จำนวนเหรียญ</Label>
              <Input
                id="coinsAmount"
                type="number"
                min="1"
                value={coinsForm.amount}
                onChange={(e) => setCoinsForm({...coinsForm, amount: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="coinsReason">เหตุผล</Label>
              <Input
                id="coinsReason"
                value={coinsForm.reason}
                onChange={(e) => setCoinsForm({...coinsForm, reason: e.target.value})}
                placeholder="เหตุผลในการเพิ่มเหรียญ"
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleAddCoins} className="flex-1">
                <Coins size={16} className="mr-2" />
                เพิ่มเหรียญ
              </Button>
              <Button variant="outline" onClick={() => setShowCoinsModal(false)} className="flex-1">
                ยกเลิก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Vote Points Modal */}
      <Dialog open={showVotePointsModal} onOpenChange={setShowVotePointsModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star size={20} />
              เพิ่มคะแนนโหวต
            </DialogTitle>
            <DialogDescription>
              เพิ่มคะแนนโหวตให้ {selectedUser?.displayName || selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="votePointsAmount">จำนวนคะแนนโหวต</Label>
              <Input
                id="votePointsAmount"
                type="number"
                min="1"
                value={votePointsForm.amount}
                onChange={(e) => setVotePointsForm({...votePointsForm, amount: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="votePointsReason">เหตุผล</Label>
              <Input
                id="votePointsReason"
                value={votePointsForm.reason}
                onChange={(e) => setVotePointsForm({...votePointsForm, reason: e.target.value})}
                placeholder="เหตุผลในการเพิ่มคะแนนโหวต"
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleAddVotePoints} className="flex-1">
                <Star size={16} className="mr-2" />
                เพิ่มคะแนน
              </Button>
              <Button variant="outline" onClick={() => setShowVotePointsModal(false)} className="flex-1">
                ยกเลิก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Stats Modal */}
      <Dialog open={showUserStatsModal} onOpenChange={setShowUserStatsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye size={20} />
              สถิติผู้ใช้
            </DialogTitle>
            <DialogDescription>
              ข้อมูลสถิติของ {selectedUser?.displayName || selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          {userStats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>เหรียญ</Label>
                  <div className="text-2xl font-bold text-yellow-600">{userStats.user.coins?.toLocaleString() || 0}</div>
                </div>
                <div>
                  <Label>คะแนนโหวต</Label>
                  <div className="text-2xl font-bold text-blue-600">{userStats.user.votePoints?.toLocaleString() || 0}</div>
                </div>
              </div>
              <div>
                <Label>สถิติการโหวต</Label>
                <div className="space-y-2">
                  {userStats.voteStats.map((stat, index) => (
                    <div key={index} className="flex justify-between p-2 bg-slate-50 rounded">
                      <span>{stat._id}</span>
                      <span className="font-medium">{stat.totalVotes} คะแนน</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label>สถิติของขวัญ</Label>
                <div className="p-2 bg-slate-50 rounded">
                  <div className="flex justify-between">
                    <span>คะแนนของขวัญทั้งหมด</span>
                    <span className="font-medium">{userStats.giftStats.totalGiftVotes}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History size={20} />
              ประวัติการกระทำของ SuperAdmin
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {adminActions.map((action, index) => (
              <div key={index} className="p-4 border border-slate-200 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">
                      โหวตให้ {action.target?.displayName || action.target?.username}
                    </div>
                    <div className="text-sm text-slate-600">
                      ประเภท: {action.voteType} | คะแนน: {action.points}
                    </div>
                  </div>
                  <div className="text-sm text-slate-500">
                    {formatDate(action.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Settings Modal */}
      <Dialog open={showPaymentSettingsModal} onOpenChange={setShowPaymentSettingsModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              ตั้งค่า Payment System
            </DialogTitle>
            <DialogDescription>
              กำหนดการตั้งค่าระบบการชำระเงินสำหรับการทดสอบและพัฒนา
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Bypass Payment Mode</Label>
                <p className="text-sm text-slate-500">
                  เมื่อเปิดใช้งาน การชำระเงินจะข้ามไปเลยโดยไม่ต้องใช้ Rabbit Gateway
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${paymentSettings.bypassEnabled ? 'text-green-600' : 'text-slate-500'}`}>
                  {paymentSettings.bypassEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                </span>
                <input
                  type="checkbox"
                  checked={paymentSettings.bypassEnabled}
                  onChange={(e) => setPaymentSettings({
                    ...paymentSettings,
                    bypassEnabled: e.target.checked
                  })}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">คำเตือน</p>
                  <p className="text-sm text-yellow-700">
                    โหมดนี้สำหรับการทดสอบเท่านั้น อย่าเปิดใช้งานใน Production
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={savePaymentSettings}
              className="flex-1"
              disabled={paymentSettings.bypassEnabled}
            >
              <Shield className="h-4 w-4 mr-2" />
              บันทึกการตั้งค่า
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowPaymentSettingsModal(false)}
              className="flex-1"
            >
              ยกเลิก
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminPanel;

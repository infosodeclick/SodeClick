import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { useToast } from './ui/toast';
import { 
  Users, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Crown, 
  User, 
  Eye,
  Ban,
  Unlock,
  Mail,
  Clock,
  AlertTriangle,
  Key
} from 'lucide-react';

const UserManagement = () => {
  const { success, error, warning, info } = useToast();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [confirmData, setConfirmData] = useState(null);

  const [banForm, setBanForm] = useState({
    isBanned: false,
    banReason: '',
    banDuration: 1,
    banDurationType: 'days'
  });

  const [editForm, setEditForm] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    role: 'user',
    membership: { tier: 'member' }
  });

  const [resetPasswordForm, setResetPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [createForm, setCreateForm] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'male',
    lookingFor: 'both',
    location: '',
    role: 'user',
    membership: { tier: 'member' }
  });

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm]);

  const fetchUsers = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        search: searchTerm,
        sort: '-createdAt'
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
        setTotalPages(data.pagination.pages);
      }
         } catch (error) {
       console.error('Error fetching users:', error);
               error('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้', 5000);
     } finally {
      setIsLoading(false);
    }
  };

  const handleBanUser = async (userId) => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${userId}/ban-duration`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(banForm)
      });

      if (res.ok) {
        await fetchUsers();
        setShowBanModal(false);
        setBanForm({
          isBanned: false,
          banReason: '',
          banDuration: 1,
          banDurationType: 'days'
        });
        success(banForm.isBanned ? '✅ แบนผู้ใช้สำเร็จ' : '✅ ปลดแบนผู้ใช้สำเร็จ', 3000);
      }
         } catch (error) {
       console.error('Error banning user:', error);
               error('เกิดข้อผิดพลาดในการแบนผู้ใช้', 5000);
     }
  };

  const handleEditUser = async (userId) => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });

      if (res.ok) {
        await fetchUsers();
        setShowEditModal(false);
        success('✅ แก้ไขผู้ใช้สำเร็จ', 3000);
      }
         } catch (error) {
       console.error('Error editing user:', error);
               error('เกิดข้อผิดพลาดในการแก้ไขผู้ใช้', 5000);
     }
  };

  const handleCreateUser = async () => {
    // Validate required fields
    const requiredFields = ['username', 'email', 'password', 'firstName', 'lastName', 'dateOfBirth', 'gender', 'lookingFor', 'location'];
    const missingFields = requiredFields.filter(field => !createForm[field]);
    
    if (missingFields.length > 0) {
              error(`กรุณากรอกข้อมูลให้ครบถ้วน: ${missingFields.join(', ')}`, 5000);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(createForm.email)) {
              error('รูปแบบอีเมลไม่ถูกต้อง', 5000);
      return;
    }

    // Validate password length
    if (createForm.password.length < 6) {
              error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 5000);
      return;
    }

    // Check if username or email already exists in current users list
    const existingUser = users.find(user => 
      user.username === createForm.username || user.email === createForm.email
    );
    
    if (existingUser) {
      if (existingUser.username === createForm.username) {
        error('Username นี้มีผู้ใช้งานแล้ว กรุณาเลือก username อื่น', 5000);
        return;
      }
      if (existingUser.email === createForm.email) {
        error('อีเมลนี้มีผู้ใช้งานแล้ว กรุณาใช้อีเมลอื่น', 5000);
        return;
      }
    }

    // Show confirmation with user data
    const confirmData = {
      title: 'ยืนยันการสร้างผู้ใช้ใหม่',
      message: `คุณแน่ใจหรือไม่ที่จะสร้างผู้ใช้ใหม่?`,
      details: [
        { label: 'Username', value: createForm.username },
        { label: 'อีเมล', value: createForm.email },
        { label: 'ชื่อ', value: `${createForm.firstName} ${createForm.lastName}` },
        { label: 'เพศ', value: createForm.gender === 'male' ? 'ชาย' : createForm.gender === 'female' ? 'หญิง' : 'อื่นๆ' },
        { label: 'สนใจใน', value: createForm.lookingFor === 'male' ? 'ชาย' : createForm.lookingFor === 'female' ? 'หญิง' : 'ทั้งสองเพศ' },
        { label: 'ที่อยู่', value: createForm.location },
        { label: 'วันเกิด', value: createForm.dateOfBirth },
        { label: 'ระดับ', value: createForm.role === 'admin' ? 'แอดมิน' : 'ผู้ใช้' },
        { label: 'สมาชิก', value: createForm.membership.tier.toUpperCase() }
      ],
      onConfirm: () => createUser()
    };

    setConfirmData(confirmData);
    setShowConfirmModal(true);
    return;

      };

  const createUser = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createForm)
      });

      if (res.ok) {
        await fetchUsers();
        setShowCreateModal(false);
        setShowConfirmModal(false);
        setCreateForm({
          username: '',
          email: '',
          password: '',
          firstName: '',
          lastName: '',
          dateOfBirth: '',
          gender: 'male',
          lookingFor: 'both',
          location: '',
          role: 'user',
          membership: { tier: 'member' }
        });
        success(`✅ สร้างผู้ใช้สำเร็จ!\n\n` +
          `Username: ${createForm.username}\n` +
          `อีเมล: ${createForm.email}\n` +
          `ชื่อ: ${createForm.firstName} ${createForm.lastName}\n` +
          `ระดับ: ${createForm.role === 'admin' ? 'แอดมิน' : 'ผู้ใช้'}\n` +
          `สมาชิก: ${createForm.membership.tier.toUpperCase()}`, 8000);
      } else {
        const errorData = await res.json();
        console.error('Error response:', errorData);
        
        // Handle specific error messages
        if (errorData.message === 'User with this email or username already exists') {
          error('❌ ไม่สามารถสร้างผู้ใช้ได้\n\nอีเมลหรือ Username นี้มีผู้ใช้งานแล้ว\nกรุณาใช้ข้อมูลอื่น', 8000);
        } else if (errorData.message === 'Missing required fields') {
          error('❌ ไม่สามารถสร้างผู้ใช้ได้\n\nกรุณากรอกข้อมูลให้ครบถ้วน', 5000);
        } else if (errorData.message === 'Invalid email format') {
          error('❌ ไม่สามารถสร้างผู้ใช้ได้\n\nรูปแบบอีเมลไม่ถูกต้อง', 5000);
        } else if (errorData.message === 'Invalid date format for dateOfBirth') {
          error('❌ ไม่สามารถสร้างผู้ใช้ได้\n\nรูปแบบวันที่เกิดไม่ถูกต้อง', 5000);
        } else {
          error(`❌ ไม่สามารถสร้างผู้ใช้ได้\n\n${errorData.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'}`, 5000);
        }
      }
    } catch (error) {
      console.error('Error creating user:', error);
      error('เกิดข้อผิดพลาดในการเชื่อมต่อ', 5000);
    }
  };

  const handleDeleteUser = async (userId) => {
    const confirmData = {
      title: 'ยืนยันการลบผู้ใช้',
      message: 'คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้?',
      details: [],
      onConfirm: () => deleteUser(userId)
    };
    setConfirmData(confirmData);
    setShowConfirmModal(true);
  };

  const deleteUser = async (userId) => {

    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        await fetchUsers();
        setShowConfirmModal(false); // ปิด confirm modal
        success('✅ ลบผู้ใช้สำเร็จ', 3000); // แสดง 3 วินาทีแล้วหายไป
      } else {
        const errorData = await res.json();
        setShowConfirmModal(false); // ปิด confirm modal ในกรณี error response
        error(`❌ ไม่สามารถลบผู้ใช้ได้\n\n${errorData.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'}`, 5000);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setShowConfirmModal(false); // ปิด confirm modal ในกรณี error
      error('เกิดข้อผิดพลาดในการลบผู้ใช้', 5000); // แสดง error 5 วินาที
    }
  };

    const handleViewProfile = async (userId) => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${userId}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const userData = await res.json();
        setSelectedUser(userData);
        setShowProfileModal(true);
      }
         } catch (error) {
       console.error('Error fetching user profile:', error);
               error('เกิดข้อผิดพลาดในการโหลดโปรไฟล์ผู้ใช้', 5000);
     }
  };

  const validatePassword = (password) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    return hasUpperCase && hasNumber;
  };

  const handleResetPassword = async () => {
    // Validate password requirements
    if (!validatePassword(resetPasswordForm.newPassword)) {
      error('รหัสผ่านต้องมีตัวอักษรตัวใหญ่ 1 ตัวขึ้นไป และตัวเลข 1 ตัวขึ้นไป', 5000);
      return;
    }

    // Check if passwords match
    if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
      error('รหัสผ่านไม่ตรงกัน กรุณากรอกใหม่อีกครั้ง', 5000);
      return;
    }

    // Check password length
    if (resetPasswordForm.newPassword.length < 6) {
      error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 5000);
      return;
    }

    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${selectedUser._id}/reset-password`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPassword: resetPasswordForm.newPassword })
      });

      if (res.ok) {
        setShowResetPasswordModal(false);
        setResetPasswordForm({ newPassword: '', confirmPassword: '' });
        success('✅ รีเซ็ตรหัสผ่านสำเร็จ', 3000);
      } else {
        const errorData = await res.json();
        error(`เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน: ${errorData.message}`, 5000);
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      error('เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน', 5000);
    }
  };

  const getStatusBadge = (user) => {
    if (user.isBanned) {
      return <Badge variant="destructive">ถูกแบน</Badge>;
    }
    if (!user.isActive) {
      return <Badge variant="secondary">ไม่ใช้งาน</Badge>;
    }
    return <Badge variant="default">ใช้งาน</Badge>;
  };

  const getRoleBadge = (role) => {
    const colors = {
      user: 'bg-blue-100 text-blue-800',
      admin: 'bg-purple-100 text-purple-800',
      // superadmin: 'bg-red-100 text-red-800' // ซ่อน SuperAdmin
    };
    return <Badge className={colors[role] || 'bg-gray-100 text-gray-800'}>{role}</Badge>;
  };

  const getMembershipBadge = (tier) => {
    const colors = {
      member: 'bg-gray-100 text-gray-800',
      silver: 'bg-slate-100 text-slate-800',
      gold: 'bg-amber-100 text-amber-800',
      vip: 'bg-purple-100 text-purple-800',
      diamond: 'bg-blue-100 text-blue-800',
      platinum: 'bg-green-100 text-green-800'
    };
    return <Badge className={colors[tier] || 'bg-gray-100 text-gray-800'}>{tier}</Badge>;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <h1 className="text-xl font-bold text-slate-800">กำลังโหลดข้อมูลผู้ใช้...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-800 flex items-center gap-3">
              <Users size={32} />
              จัดการผู้ใช้
            </h1>
            <p className="text-slate-600 mt-1">จัดการข้อมูลผู้ใช้ทั้งหมดในระบบ</p>
          </div>
          <div className="flex gap-3">
            <Button 
              className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={16} className="mr-2" />
              เพิ่มผู้ใช้
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/admin'}>
              กลับไป Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-7xl mx-auto p-6">
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="search">ค้นหา</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="search"
                    placeholder="ค้นหาชื่อ, อีเมล, username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={fetchUsers}>
                  ค้นหา
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>รายชื่อผู้ใช้ ({users.filter(user => user.role !== 'superadmin').length} คน)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left p-4 font-medium text-slate-700">ผู้ใช้</th>
                    <th className="text-left p-4 font-medium text-slate-700">อีเมล</th>
                    <th className="text-left p-4 font-medium text-slate-700">สถานะ</th>
                    <th className="text-left p-4 font-medium text-slate-700">ระดับ</th>
                    <th className="text-left p-4 font-medium text-slate-700">สมาชิก</th>
                    <th className="text-left p-4 font-medium text-slate-700">วันที่สมัคร</th>
                    <th className="text-left p-4 font-medium text-slate-700">การจัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(user => user.role !== 'superadmin').map((user) => (
                    <tr key={user._id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-violet-400 rounded-full flex items-center justify-center text-white font-semibold">
                            {user.firstName?.charAt(0) || user.username?.charAt(0) || 'U'}
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
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-slate-400" />
                          <span className="text-sm">{user.email}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(user)}
                      </td>
                      <td className="p-4">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="p-4">
                        {getMembershipBadge(user.membership?.tier)}
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          {/* ซ่อนปุ่มการจัดการสำหรับ SuperAdmin */}
                          {user.role !== 'superadmin' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewProfile(user._id)}
                              >
                                <Eye size={14} />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setEditForm({
                                    username: user.username,
                                    firstName: user.firstName,
                                    lastName: user.lastName,
                                    email: user.email,
                                    role: user.role,
                                    membership: user.membership
                                  });
                                  setShowEditModal(true);
                                }}
                              >
                                <Edit size={14} />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setBanForm({
                                    isBanned: !user.isBanned,
                                    banReason: user.banReason || '',
                                    banDuration: 1,
                                    banDurationType: 'days'
                                  });
                                  setShowBanModal(true);
                                }}
                              >
                                {user.isBanned ? <Unlock size={14} /> : <Ban size={14} />}
                              </Button>
                                                             <Button
                                 size="sm"
                                 variant="outline"
                                 onClick={() => handleDeleteUser(user._id)}
                                 className="text-red-600 hover:text-red-700"
                               >
                                 <Trash2 size={14} />
                               </Button>
                               <Button
                                 size="sm"
                                 variant="outline"
                                 onClick={() => {
                                   setSelectedUser(user);
                                   setResetPasswordForm({ newPassword: '', confirmPassword: '' });
                                   setShowResetPasswordModal(true);
                                 }}
                                 className="text-blue-600 hover:text-blue-700"
                               >
                                 <Key size={14} />
                               </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    ก่อนหน้า
                  </Button>
                  <span className="flex items-center px-4 text-slate-600">
                    หน้า {currentPage} จาก {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    ถัดไป
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

             {/* Ban Modal */}
       <Dialog open={showBanModal} onOpenChange={setShowBanModal}>
         <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {banForm.isBanned ? <Ban size={20} /> : <Unlock size={20} />}
              {banForm.isBanned ? 'แบนผู้ใช้' : 'ปลดแบนผู้ใช้'}
            </DialogTitle>
            <DialogDescription>
              {banForm.isBanned ? 'ระบุเหตุผลและระยะเวลาในการแบนผู้ใช้' : 'ปลดแบนผู้ใช้เพื่อให้สามารถใช้งานได้อีกครั้ง'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {banForm.isBanned && (
              <>
                <div>
                  <Label htmlFor="banReason">เหตุผล</Label>
                  <Input
                    id="banReason"
                    value={banForm.banReason}
                    onChange={(e) => setBanForm({...banForm, banReason: e.target.value})}
                    placeholder="ระบุเหตุผลในการแบน"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="banDuration">ระยะเวลา</Label>
                    <Input
                      id="banDuration"
                      type="number"
                      value={banForm.banDuration}
                      onChange={(e) => setBanForm({...banForm, banDuration: parseInt(e.target.value)})}
                      min="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="banDurationType">หน่วย</Label>
                    <select
                      id="banDurationType"
                      value={banForm.banDurationType}
                      onChange={(e) => setBanForm({...banForm, banDurationType: e.target.value})}
                      className="w-full p-2 border border-slate-200 rounded-md"
                    >
                      <option value="hours">ชั่วโมง</option>
                      <option value="days">วัน</option>
                      <option value="months">เดือน</option>
                      <option value="permanent">ถาวร</option>
                    </select>
                  </div>
                </div>
              </>
            )}
            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={() => handleBanUser(selectedUser._id)}
              >
                {banForm.isBanned ? 'แบน' : 'ปลดแบน'}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowBanModal(false)}
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

             {/* Edit Modal */}
       <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
         <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit size={20} />
              แก้ไขผู้ใช้
            </DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลส่วนตัว ระดับ และสมาชิกของผู้ใช้
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editFirstName">ชื่อ</Label>
                <Input
                  id="editFirstName"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({...editForm, firstName: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="editLastName">นามสกุล</Label>
                <Input
                  id="editLastName"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({...editForm, lastName: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="editUsername">ชื่อผู้ใช้</Label>
              <Input
                id="editUsername"
                value={editForm.username}
                disabled
                className="bg-gray-100 cursor-not-allowed"
              />
            </div>
            <div>
              <Label htmlFor="editEmail">อีเมล</Label>
              <Input
                id="editEmail"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="editRole">ระดับ</Label>
              <select
                id="editRole"
                value={editForm.role}
                onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                className="w-full p-2 border border-slate-200 rounded-md"
              >
                <option value="user">ผู้ใช้</option>
                <option value="admin">แอดมิน</option>
                {/* ซ่อน SuperAdmin จากตัวเลือก */}
                {/* <option value="superadmin">ซูเปอร์แอดมิน</option> */}
              </select>
            </div>
            <div>
              <Label htmlFor="editMembership">สมาชิก</Label>
              <select
                id="editMembership"
                value={editForm.membership.tier}
                onChange={(e) => setEditForm({
                  ...editForm, 
                  membership: {...editForm.membership, tier: e.target.value}
                })}
                className="w-full p-2 border border-slate-200 rounded-md"
              >
                <option value="member">Member</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="vip">VIP</option>
                <option value="diamond">Diamond</option>
                <option value="platinum">Platinum</option>
              </select>
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={() => handleEditUser(selectedUser._id)}
              >
                บันทึก
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowEditModal(false)}
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus size={20} />
              เพิ่มผู้ใช้ใหม่
            </DialogTitle>
            <DialogDescription>
              สร้างผู้ใช้ใหม่พร้อมกำหนดระดับและสมาชิก
            </DialogDescription>
          </DialogHeader>
                     <div className="space-y-3">
             {/* Row 1: Username & Email */}
             <div className="grid grid-cols-2 gap-3">
               <div>
                 <Label htmlFor="createUsername" className="text-sm">Username</Label>
                 <Input
                   id="createUsername"
                   value={createForm.username}
                   onChange={(e) => setCreateForm({...createForm, username: e.target.value})}
                   className="h-9 text-sm"
                 />
               </div>
               <div>
                 <Label htmlFor="createEmail" className="text-sm">อีเมล</Label>
                 <Input
                   id="createEmail"
                   type="email"
                   value={createForm.email}
                   onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                   className="h-9 text-sm"
                 />
               </div>
             </div>
             
             {/* Row 2: Password & Date of Birth */}
             <div className="grid grid-cols-2 gap-3">
               <div>
                 <Label htmlFor="createPassword" className="text-sm">รหัสผ่าน</Label>
                 <Input
                   id="createPassword"
                   type="password"
                   value={createForm.password}
                   onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                   className="h-9 text-sm"
                 />
               </div>
               <div>
                 <Label htmlFor="createDateOfBirth" className="text-sm">วันเกิด</Label>
                 <Input
                   id="createDateOfBirth"
                   type="date"
                   value={createForm.dateOfBirth}
                   onChange={(e) => setCreateForm({...createForm, dateOfBirth: e.target.value})}
                   className="h-9 text-sm"
                 />
               </div>
             </div>
             
             {/* Row 3: First Name & Last Name */}
             <div className="grid grid-cols-2 gap-3">
               <div>
                 <Label htmlFor="createFirstName" className="text-sm">ชื่อ</Label>
                 <Input
                   id="createFirstName"
                   value={createForm.firstName}
                   onChange={(e) => setCreateForm({...createForm, firstName: e.target.value})}
                   className="h-9 text-sm"
                 />
               </div>
               <div>
                 <Label htmlFor="createLastName" className="text-sm">นามสกุล</Label>
                 <Input
                   id="createLastName"
                   value={createForm.lastName}
                   onChange={(e) => setCreateForm({...createForm, lastName: e.target.value})}
                   className="h-9 text-sm"
                 />
               </div>
             </div>
             
             {/* Row 4: Location & Gender */}
             <div className="grid grid-cols-2 gap-3">
               <div>
                 <Label htmlFor="createLocation" className="text-sm">ที่อยู่</Label>
                 <Input
                   id="createLocation"
                   value={createForm.location}
                   onChange={(e) => setCreateForm({...createForm, location: e.target.value})}
                   className="h-9 text-sm"
                 />
               </div>
               <div>
                 <Label htmlFor="createGender" className="text-sm">เพศ</Label>
                 <select
                   id="createGender"
                   value={createForm.gender}
                   onChange={(e) => setCreateForm({...createForm, gender: e.target.value})}
                   className="w-full h-9 p-2 border border-slate-200 rounded-md text-sm"
                 >
                   <option value="male">ชาย</option>
                   <option value="female">หญิง</option>
                   <option value="other">อื่นๆ</option>
                 </select>
               </div>
             </div>
             
             {/* Row 5: Looking For & Role */}
             <div className="grid grid-cols-2 gap-3">
               <div>
                 <Label htmlFor="createLookingFor" className="text-sm">สนใจใน</Label>
                 <select
                   id="createLookingFor"
                   value={createForm.lookingFor}
                   onChange={(e) => setCreateForm({...createForm, lookingFor: e.target.value})}
                   className="w-full h-9 p-2 border border-slate-200 rounded-md text-sm"
                 >
                   <option value="male">ชาย</option>
                   <option value="female">หญิง</option>
                   <option value="both">ทั้งสองเพศ</option>
                 </select>
               </div>
               <div>
                 <Label htmlFor="createRole" className="text-sm">ระดับ</Label>
                 <select
                   id="createRole"
                   value={createForm.role}
                   onChange={(e) => setCreateForm({...createForm, role: e.target.value})}
                   className="w-full h-9 p-2 border border-slate-200 rounded-md text-sm"
                 >
                   <option value="user">ผู้ใช้</option>
                   <option value="admin">แอดมิน</option>
                 </select>
               </div>
             </div>
             
             {/* Row 6: Membership */}
             <div>
               <Label htmlFor="createMembership" className="text-sm">สมาชิก</Label>
               <select
                 id="createMembership"
                 value={createForm.membership.tier}
                 onChange={(e) => setCreateForm({
                   ...createForm, 
                   membership: {...createForm.membership, tier: e.target.value}
                 })}
                 className="w-full h-9 p-2 border border-slate-200 rounded-md text-sm"
               >
                 <option value="member">Member</option>
                 <option value="silver">Silver</option>
                 <option value="gold">Gold</option>
                 <option value="vip">VIP</option>
                 <option value="diamond">Diamond</option>
                 <option value="platinum">Platinum</option>
               </select>
             </div>
                                                   {/* Enhanced Preview Section */}
              <div className="border-t border-gray-200 pt-4">
                <Label className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  ข้อมูลที่จะสร้าง
                </Label>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 gap-3">
                    {/* Personal Info Group */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-green-700 uppercase tracking-wide">ข้อมูลส่วนตัว</div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center justify-between bg-white/60 px-3 py-2 rounded-md">
                          <span className="font-medium text-gray-700">Username:</span>
                          <span className="text-gray-900 font-semibold">{createForm.username || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between bg-white/60 px-3 py-2 rounded-md">
                          <span className="font-medium text-gray-700">อีเมล:</span>
                          <span className="text-gray-900 font-semibold">{createForm.email || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between bg-white/60 px-3 py-2 rounded-md">
                          <span className="font-medium text-gray-700">ชื่อ:</span>
                          <span className="text-gray-900 font-semibold">{createForm.firstName || '-'} {createForm.lastName || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between bg-white/60 px-3 py-2 rounded-md">
                          <span className="font-medium text-gray-700">เพศ:</span>
                          <span className="text-gray-900 font-semibold">{createForm.gender === 'male' ? 'ชาย' : createForm.gender === 'female' ? 'หญิง' : 'อื่นๆ'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Preferences Group */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-green-700 uppercase tracking-wide">ความต้องการ</div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center justify-between bg-white/60 px-3 py-2 rounded-md">
                          <span className="font-medium text-gray-700">สนใจใน:</span>
                          <span className="text-gray-900 font-semibold">{createForm.lookingFor === 'male' ? 'ชาย' : createForm.lookingFor === 'female' ? 'หญิง' : 'ทั้งสองเพศ'}</span>
                        </div>
                        <div className="flex items-center justify-between bg-white/60 px-3 py-2 rounded-md">
                          <span className="font-medium text-gray-700">ที่อยู่:</span>
                          <span className="text-gray-900 font-semibold">{createForm.location || '-'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Account Group */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-green-700 uppercase tracking-wide">บัญชีผู้ใช้</div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center justify-between bg-white/60 px-3 py-2 rounded-md">
                          <span className="font-medium text-gray-700">วันเกิด:</span>
                          <span className="text-gray-900 font-semibold">{createForm.dateOfBirth || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between bg-white/60 px-3 py-2 rounded-md">
                          <span className="font-medium text-gray-700">ระดับ:</span>
                          <span className="text-gray-900 font-semibold">{createForm.role === 'admin' ? 'แอดมิน' : 'ผู้ใช้'}</span>
                        </div>
                        <div className="flex items-center justify-between bg-white/60 px-3 py-2 rounded-md col-span-2">
                          <span className="font-medium text-gray-700">สมาชิก:</span>
                          <span className="text-gray-900 font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-full text-xs">
                            {createForm.membership.tier.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

             <div className="flex gap-2 pt-2">
               <Button
                 size="sm"
                 className="flex-1 h-9"
                 onClick={handleCreateUser}
                 disabled={!createForm.username || !createForm.email || !createForm.password || !createForm.firstName || !createForm.lastName || !createForm.dateOfBirth || !createForm.location}
               >
                 สร้างผู้ใช้
               </Button>
               <Button
                 size="sm"
                 variant="outline"
                 className="flex-1 h-9"
                 onClick={() => setShowCreateModal(false)}
               >
                 ยกเลิก
               </Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>

             {/* Profile Modal */}
       <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
         <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User size={20} />
              โปรไฟล์ผู้ใช้
            </DialogTitle>
            <DialogDescription>
              ดูข้อมูลรายละเอียดของผู้ใช้
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-violet-400 rounded-full flex items-center justify-center text-white font-semibold text-xl">
                  {selectedUser.firstName?.charAt(0) || selectedUser.username?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-800">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </h3>
                  <p className="text-slate-600">@{selectedUser.username}</p>
                  <div className="flex gap-2 mt-2">
                    {getStatusBadge(selectedUser)}
                    {getRoleBadge(selectedUser.role)}
                    {getMembershipBadge(selectedUser.membership?.tier)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-600">ข้อมูลส่วนตัว</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-slate-400" />
                        <span className="text-sm">{selectedUser.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-slate-400" />
                        <span className="text-sm">สมัครเมื่อ: {formatDate(selectedUser.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-600">ข้อมูลสมาชิก</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Crown size={14} className="text-slate-400" />
                        <span className="text-sm">Coins: {selectedUser.coins}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-slate-400" />
                        <span className="text-sm">เข้าสู่ระบบล่าสุด: {formatDate(selectedUser.lastLogin)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {selectedUser.bio && (
                <div>
                  <Label className="text-sm font-medium text-slate-600">เกี่ยวกับตัว</Label>
                  <p className="mt-2 text-sm text-slate-700 bg-slate-50 p-3 rounded-md">
                    {selectedUser.bio}
                  </p>
                </div>
              )}

              {selectedUser.isBanned && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex items-center gap-2 text-red-800">
                    <Ban size={16} />
                    <span className="font-medium">ถูกแบน</span>
                  </div>
                  {selectedUser.banReason && (
                    <p className="text-sm text-red-700 mt-1">เหตุผล: {selectedUser.banReason}</p>
                  )}
                </div>
              )}
            </div>
          )}
                 </DialogContent>
       </Dialog>

       {/* Custom Confirmation Modal */}
       <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
         <DialogContent className="sm:max-w-md">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2 text-orange-600">
               <AlertTriangle size={20} />
               {confirmData?.title || 'ยืนยันการดำเนินการ'}
             </DialogTitle>
             <DialogDescription>
               {confirmData?.message || 'คุณแน่ใจหรือไม่ที่จะดำเนินการนี้?'}
             </DialogDescription>
           </DialogHeader>
           
           {confirmData?.details && confirmData.details.length > 0 && (
             <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
               <Label className="text-sm font-medium text-orange-700 mb-2">รายละเอียด:</Label>
               <div className="space-y-1 text-xs text-orange-700">
                 {confirmData.details.map((detail, index) => (
                   <div key={index} className="flex justify-between">
                     <span className="font-medium">{detail.label}:</span>
                     <span>{detail.value || '-'}</span>
                   </div>
                 ))}
               </div>
             </div>
           )}

           <div className="flex gap-3 pt-2">
             <Button
               onClick={() => {
                 confirmData?.onConfirm();
               }}
               className="flex-1 bg-orange-600 hover:bg-orange-700"
             >
               ยืนยัน
             </Button>
             <Button
               variant="outline"
               onClick={() => setShowConfirmModal(false)}
               className="flex-1"
             >
               ยกเลิก
             </Button>
           </div>
         </DialogContent>
       </Dialog>

       {/* Reset Password Modal */}
       <Dialog open={showResetPasswordModal} onOpenChange={setShowResetPasswordModal}>
         <DialogContent className="sm:max-w-md">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2 text-blue-600">
               <Key size={20} />
               รีเซ็ตรหัสผ่าน
             </DialogTitle>
             <DialogDescription>
               ตั้งรหัสผ่านใหม่สำหรับผู้ใช้ {selectedUser?.firstName} {selectedUser?.lastName} (@{selectedUser?.username})
             </DialogDescription>
           </DialogHeader>
           
           <div className="space-y-4">
             <div>
               <Label htmlFor="newPassword">รหัสผ่านใหม่</Label>
               <Input
                 id="newPassword"
                 type="password"
                 value={resetPasswordForm.newPassword}
                 onChange={(e) => setResetPasswordForm({...resetPasswordForm, newPassword: e.target.value})}
                 placeholder="กรอกรหัสผ่านใหม่"
               />
               <div className="mt-1 text-xs text-slate-500">
                 รหัสผ่านต้องมีตัวอักษรตัวใหญ่ 1 ตัวขึ้นไป และตัวเลข 1 ตัวขึ้นไป
               </div>
             </div>
             
             <div>
               <Label htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</Label>
               <Input
                 id="confirmPassword"
                 type="password"
                 value={resetPasswordForm.confirmPassword}
                 onChange={(e) => setResetPasswordForm({...resetPasswordForm, confirmPassword: e.target.value})}
                 placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
               />
             </div>

             <div className="flex gap-3">
               <Button
                 className="flex-1"
                 onClick={handleResetPassword}
                 disabled={!resetPasswordForm.newPassword || !resetPasswordForm.confirmPassword}
               >
                 บันทึก
               </Button>
               <Button
                 variant="outline"
                 className="flex-1"
                 onClick={() => {
                   setShowResetPasswordModal(false);
                   setResetPasswordForm({ newPassword: '', confirmPassword: '' });
                 }}
               >
                 ยกเลิก
               </Button>
             </div>
           </div>
         </DialogContent>
       </Dialog>
     </div>
   );
 };
 
 export default UserManagement;

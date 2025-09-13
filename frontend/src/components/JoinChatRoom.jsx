import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { 
  MessageCircle, 
  Users, 
  Coins,
  CreditCard,
  AlertTriangle,
  Check,
  X,
  Lock,
  Globe,
  Calendar,
  Hash,
  Settings
} from 'lucide-react';

const JoinChatRoom = () => {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [chatRoom, setChatRoom] = useState(null);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const fetchRoomInfo = async () => {
      try {
        const token = sessionStorage.getItem('token');
        if (!token) {
          setError('กรุณาเข้าสู่ระบบก่อน');
          setIsLoading(false);
          return;
        }

        // ดึงข้อมูลผู้ใช้
        const userRes = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!userRes.ok) {
          setError('กรุณาเข้าสู่ระบบก่อน');
          setIsLoading(false);
          return;
        }

        const userData = await userRes.json();
        setUser(userData.data?.user);

        // ดึงข้อมูลห้องแชท
        const roomRes = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/admin/chatrooms/join-by-invite`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inviteCode,
            userId: userData.data?.user._id
          })
        });

        if (roomRes.ok) {
          const roomData = await roomRes.json();
          setChatRoom(roomData.chatRoom);
        } else {
          const errorData = await roomRes.json();
          setError(errorData.message || 'ไม่สามารถเข้าร่วมห้องได้');
        }
      } catch (error) {
        console.error('Error fetching room info:', error);
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomInfo();
  }, [inviteCode]);

  const handleJoinRoom = async () => {
    setJoining(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/admin/chatrooms/join-by-invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inviteCode,
          userId: user._id
        })
      });

      if (res.ok) {
        const data = await res.json();
        alert('เข้าร่วมห้องแชทสำเร็จ!');
        navigate(`/chat/${data.chatRoom.id}`);
      } else {
        const errorData = await res.json();
        alert(errorData.message || 'ไม่สามารถเข้าร่วมห้องได้');
      }
    } catch (error) {
      console.error('Error joining room:', error);
      alert('เกิดข้อผิดพลาดในการเข้าร่วมห้อง');
    } finally {
      setJoining(false);
    }
  };

  const checkUserRequirements = () => {
    if (!user || !chatRoom) return { canJoin: false, issues: [] };

    const issues = [];

    // ตรวจสอบจำนวนเหรียญ
    if (chatRoom.entryConditions?.requiredCoins > 0) {
      if (user.coins < chatRoom.entryConditions.requiredCoins) {
        issues.push(`ต้องมีเหรียญอย่างน้อย ${chatRoom.entryConditions.requiredCoins} เหรียญ (คุณมี ${user.coins} เหรียญ)`);
      }
    }

    // ตรวจสอบเงื่อนไขพิเศษ
    if (chatRoom.entryConditions?.specialConditions) {
      const conditions = chatRoom.entryConditions.specialConditions.toLowerCase();
      
      if (conditions.includes('premium') && user.membership?.tier === 'member') {
        issues.push('ต้องเป็นสมาชิก Premium');
      }
      
      if (conditions.includes('gold') && user.membership?.tier !== 'gold') {
        issues.push('ต้องเป็นสมาชิก Gold');
      }
    }

    // ตรวจสอบการเสียเงินจริง
    if (chatRoom.entryConditions?.requireRealPayment) {
      issues.push(`ต้องชำระเงิน ${chatRoom.entryConditions.realPaymentAmount} บาท`);
    }

    return {
      canJoin: issues.length === 0,
      issues
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <h1 className="text-xl font-bold text-slate-800">กำลังโหลดข้อมูลห้องแชท...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <X className="h-5 w-5" />
              ไม่สามารถเข้าร่วมห้องได้
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">{error}</p>
            <Button 
              onClick={() => navigate('/')}
              className="w-full"
            >
              กลับหน้าหลัก
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const requirements = checkUserRequirements();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            เข้าร่วมห้องแชท
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* ข้อมูลห้องแชท */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">{chatRoom?.name}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                {chatRoom?.type === 'public' ? (
                  <Globe className="h-4 w-4 text-green-600" />
                ) : (
                  <Lock className="h-4 w-4 text-orange-600" />
                )}
                <span>{chatRoom?.type === 'public' ? 'สาธารณะ' : 'ส่วนตัว'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span>สมาชิก: {chatRoom?.stats?.totalMembers || 0}</span>
              </div>
            </div>
          </div>

          {/* เงื่อนไขการเข้าห้อง */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Settings className="h-4 w-4" />
              เงื่อนไขการเข้าห้อง
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {chatRoom?.entryFee > 0 && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
                  <Coins className="h-4 w-4 text-yellow-600" />
                  <span>ค่าเข้าห้อง: {chatRoom.entryFee} เหรียญ</span>
                </div>
              )}

              {chatRoom?.entryConditions?.requiredCoins > 0 && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <Coins className="h-4 w-4 text-blue-600" />
                  <span>ต้องมีเหรียญ: {chatRoom.entryConditions.requiredCoins} เหรียญ</span>
                </div>
              )}

              {chatRoom?.entryConditions?.requireRealPayment && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                  <CreditCard className="h-4 w-4 text-red-600" />
                  <span>ต้องชำระเงิน: {chatRoom.entryConditions.realPaymentAmount} บาท</span>
                </div>
              )}

              {chatRoom?.entryConditions?.specialConditions && (
                <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-purple-600" />
                  <span>เงื่อนไขพิเศษ: {chatRoom.entryConditions.specialConditions}</span>
                </div>
              )}
            </div>
          </div>

          {/* สถานะผู้ใช้ */}
          <div className="space-y-4">
            <h4 className="font-semibold">สถานะของคุณ</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Coins className="h-4 w-4 text-gray-600" />
                <span>เหรียญ: {user?.coins || 0} เหรียญ</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Badge variant="outline">
                  {user?.membership?.tier || 'Member'}
                </Badge>
              </div>
            </div>
          </div>

          {/* ข้อผิดพลาด */}
          {requirements.issues.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                <X className="h-4 w-4" />
                ไม่สามารถเข้าร่วมได้
              </h4>
              <ul className="space-y-1">
                {requirements.issues.map((issue, index) => (
                  <li key={index} className="text-red-700 text-sm">• {issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ปุ่มเข้าร่วม */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="flex-1"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleJoinRoom}
              disabled={!requirements.canJoin || joining}
              className="flex-1 flex items-center gap-2"
            >
              {joining ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  กำลังเข้าร่วม...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  เข้าร่วมห้อง
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinChatRoom;

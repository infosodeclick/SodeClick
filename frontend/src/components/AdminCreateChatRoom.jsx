import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  MessageCircle, 
  Settings, 
  Users, 
  Coins,
  CreditCard,
  Link,
  Copy,
  Check,
  AlertTriangle,
  Globe,
  Lock,
  Calendar,
  Hash
} from 'lucide-react';

const AdminCreateChatRoom = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdRoom, setCreatedRoom] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'private',
    entryFee: 0,
    entryConditions: {
      requiredCoins: 0,
      specialConditions: '',
      requireRealPayment: false,
      realPaymentAmount: 0
    },
    ageRestriction: {
      minAge: 18,
      maxAge: 100
    },
    settings: {
      maxMembers: 100,
      allowGifts: true,
      allowCoinGifts: true,
      moderationEnabled: false
    },
    inviteLink: {
      generateLink: false,
      expiresAt: '',
      maxUses: -1
    }
  });

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = sessionStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

      const res = await fetch(`${apiUrl}/api/admin/chatrooms/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        const data = await res.json();
        setCreatedRoom(data.chatRoom);
        setShowSuccess(true);
        
        // Reset form
        setFormData({
          name: '',
          description: '',
          type: 'private',
          entryFee: 0,
          entryConditions: {
            requiredCoins: 0,
            specialConditions: '',
            requireRealPayment: false,
            realPaymentAmount: 0
          },
          ageRestriction: {
            minAge: 18,
            maxAge: 100
          },
          settings: {
            maxMembers: 100,
            allowGifts: true,
            allowCoinGifts: true,
            moderationEnabled: false
          },
          inviteLink: {
            generateLink: false,
            expiresAt: '',
            maxUses: -1
          }
        });
      } else {
        const error = await res.json();
        console.error('Failed to create chat room:', error.message);
      }
    } catch (error) {
      console.error('Error creating chat room:', error);
              console.error('เกิดข้อผิดพลาดในการสร้างห้องแชท');
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteLink = async () => {
    if (createdRoom?.inviteLink?.code) {
      const link = `${window.location.origin}/join/${createdRoom.inviteLink.code}`;
      try {
        await navigator.clipboard.writeText(link);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } catch (error) {
        console.error('Failed to copy link:', error);
        console.error('ไม่สามารถคัดลอกลิงก์ได้');
      }
    }
  };

  if (showSuccess && createdRoom) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">สร้างห้องแชทสำเร็จ</h2>
          <Badge variant="outline" className="text-sm">
            Admin Panel
          </Badge>
        </div>

        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Check className="h-5 w-5" />
              สร้างห้องแชทสำเร็จ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">ชื่อห้อง</Label>
                <p className="text-lg font-semibold">{createdRoom.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">ประเภท</Label>
                <Badge variant={createdRoom.type === 'public' ? 'default' : 'secondary'}>
                  {createdRoom.type === 'public' ? 'สาธารณะ' : 'ส่วนตัว'}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">ค่าเข้าห้อง</Label>
                <p className="text-lg">{createdRoom.entryFee} เหรียญ</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">เงื่อนไขเหรียญ</Label>
                <p className="text-lg">{createdRoom.entryConditions.requiredCoins} เหรียญ</p>
              </div>
            </div>

            {createdRoom.inviteLink && (
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium text-gray-700">Invite Link</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyInviteLink}
                    className="flex items-center gap-2"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-4 w-4" />
                        คัดลอกแล้ว
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        คัดลอก
                      </>
                    )}
                  </Button>
                </div>
                <div className="bg-gray-100 p-2 rounded text-sm font-mono break-all">
                  {`${window.location.origin}/join/${createdRoom.inviteLink.code}`}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => setShowSuccess(false)}
                className="flex-1"
              >
                สร้างห้องใหม่
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/admin'}
              >
                กลับไปหน้า Admin
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">สร้างห้องแชทใหม่</h2>
        <Badge variant="outline" className="text-sm">
          Admin Panel
        </Badge>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              ข้อมูลพื้นฐาน
            </TabsTrigger>
            <TabsTrigger value="conditions" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              เงื่อนไข
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              การตั้งค่า
            </TabsTrigger>
            <TabsTrigger value="invite" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Invite Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>ข้อมูลพื้นฐาน</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">ชื่อห้อง *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="ชื่อห้องแชท"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">คำอธิบาย</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="คำอธิบายห้องแชท"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="type">ประเภทห้อง</Label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="type"
                        value="public"
                        checked={formData.type === 'public'}
                        onChange={(e) => handleInputChange('type', e.target.value)}
                      />
                      <Globe className="h-4 w-4" />
                      สาธารณะ
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="type"
                        value="private"
                        checked={formData.type === 'private'}
                        onChange={(e) => handleInputChange('type', e.target.value)}
                      />
                      <Lock className="h-4 w-4" />
                      ส่วนตัว
                    </label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="entryFee">ค่าเข้าห้อง (เหรียญ)</Label>
                  <Input
                    id="entryFee"
                    type="number"
                    min="0"
                    value={formData.entryFee}
                    onChange={(e) => handleInputChange('entryFee', parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conditions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>เงื่อนไขการเข้าห้อง</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="requiredCoins" className="flex items-center gap-2">
                    <Coins className="h-4 w-4" />
                    จำนวนเหรียญที่ต้องมี
                  </Label>
                  <Input
                    id="requiredCoins"
                    type="number"
                    min="0"
                    value={formData.entryConditions.requiredCoins}
                    onChange={(e) => handleInputChange('entryConditions.requiredCoins', parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="specialConditions">เงื่อนไขพิเศษ</Label>
                  <Input
                    id="specialConditions"
                    value={formData.entryConditions.specialConditions}
                    onChange={(e) => handleInputChange('entryConditions.specialConditions', e.target.value)}
                    placeholder="เช่น Premium, Gold, อายุ 20+"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="requireRealPayment"
                    checked={formData.entryConditions.requireRealPayment}
                    onCheckedChange={(checked) => handleInputChange('entryConditions.requireRealPayment', checked)}
                  />
                  <Label htmlFor="requireRealPayment" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    ต้องเสียเงินจริง
                  </Label>
                </div>

                {formData.entryConditions.requireRealPayment && (
                  <div>
                    <Label htmlFor="realPaymentAmount">จำนวนเงิน (บาท)</Label>
                    <Input
                      id="realPaymentAmount"
                      type="number"
                      min="0"
                      value={formData.entryConditions.realPaymentAmount}
                      onChange={(e) => handleInputChange('entryConditions.realPaymentAmount', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minAge">อายุขั้นต่ำ</Label>
                    <Input
                      id="minAge"
                      type="number"
                      min="18"
                      max="100"
                      value={formData.ageRestriction.minAge}
                      onChange={(e) => handleInputChange('ageRestriction.minAge', parseInt(e.target.value) || 18)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxAge">อายุสูงสุด</Label>
                    <Input
                      id="maxAge"
                      type="number"
                      min="18"
                      max="100"
                      value={formData.ageRestriction.maxAge}
                      onChange={(e) => handleInputChange('ageRestriction.maxAge', parseInt(e.target.value) || 100)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>การตั้งค่าห้อง</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="maxMembers">จำนวนสมาชิกสูงสุด</Label>
                  <Input
                    id="maxMembers"
                    type="number"
                    min="1"
                    max="1000"
                    value={formData.settings.maxMembers}
                    onChange={(e) => handleInputChange('settings.maxMembers', parseInt(e.target.value) || 100)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="allowGifts"
                      checked={formData.settings.allowGifts}
                      onCheckedChange={(checked) => handleInputChange('settings.allowGifts', checked)}
                    />
                    <Label htmlFor="allowGifts">อนุญาตให้ส่งของขวัญ</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="allowCoinGifts"
                      checked={formData.settings.allowCoinGifts}
                      onCheckedChange={(checked) => handleInputChange('settings.allowCoinGifts', checked)}
                    />
                    <Label htmlFor="allowCoinGifts">อนุญาตให้ส่งเหรียญ</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="moderationEnabled"
                      checked={formData.settings.moderationEnabled}
                      onCheckedChange={(checked) => handleInputChange('settings.moderationEnabled', checked)}
                    />
                    <Label htmlFor="moderationEnabled">เปิดใช้งานการตรวจสอบข้อความ</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invite" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Invite Link</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="generateLink"
                    checked={formData.inviteLink.generateLink}
                    onCheckedChange={(checked) => handleInputChange('inviteLink.generateLink', checked)}
                  />
                  <Label htmlFor="generateLink">สร้าง Invite Link</Label>
                </div>

                {formData.inviteLink.generateLink && (
                  <>
                    <div>
                      <Label htmlFor="expiresAt">วันหมดอายุ (ไม่บังคับ)</Label>
                      <Input
                        id="expiresAt"
                        type="datetime-local"
                        value={formData.inviteLink.expiresAt}
                        onChange={(e) => handleInputChange('inviteLink.expiresAt', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="maxUses">จำนวนครั้งที่ใช้สูงสุด (-1 = ไม่จำกัด)</Label>
                      <Input
                        id="maxUses"
                        type="number"
                        min="-1"
                        value={formData.inviteLink.maxUses}
                        onChange={(e) => handleInputChange('inviteLink.maxUses', parseInt(e.target.value) || -1)}
                        placeholder="-1"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.href = '/admin'}
          >
            ยกเลิก
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !formData.name}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                กำลังสร้าง...
              </>
            ) : (
              <>
                <MessageCircle className="h-4 w-4" />
                สร้างห้องแชท
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminCreateChatRoom;

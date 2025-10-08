import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  MessageCircle, 
  Search, 
  Trash2, 
  Users, 
  Image, 
  FileText,
  AlertTriangle,
  Eye,
  Globe,
  Lock,
  Star,
  MessageSquare
} from 'lucide-react';

const AdminChatManagement = () => {
  const [activeTab, setActiveTab] = useState('public-chatrooms');
  const [publicChatRooms, setPublicChatRooms] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteType, setDeleteType] = useState('');
  const [mainPublicRoomId, setMainPublicRoomId] = useState(null);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [selectedRoomMessages, setSelectedRoomMessages] = useState([]);
  const [selectedRoomInfo, setSelectedRoomInfo] = useState(null);

  useEffect(() => {
    if (activeTab === 'public-chatrooms') {
      fetchPublicChatRooms();
    } else if (activeTab === 'chatrooms') {
      fetchChatRooms();
    } else if (activeTab === 'messages') {
      fetchMessages();
    }
  }, [activeTab, currentPage, searchTerm]);

  const handleViewRoomMessages = async (room) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/messages?roomId=${room._id}&limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedRoomMessages(data.messages || []);
        setSelectedRoomInfo(room);
        setShowMessagesModal(true);
      } else {
        const error = await res.json();
        console.error('Failed to fetch room messages:', error.message);
      }
    } catch (error) {
      console.error('Error fetching room messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetMainPublicRoom = async (roomId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/chatrooms/${roomId}/set-main`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        setMainPublicRoomId(roomId);
        await fetchPublicChatRooms(); // รีเฟรชข้อมูล
        console.log('ห้องสาธารณะหลักถูกตั้งเรียบร้อยแล้ว');
      } else {
        const error = await res.json();
        console.error('Failed to set main public room:', error.message);
      }
    } catch (error) {
      console.error('Error setting main public room:', error);
    }
  };

  const fetchPublicChatRooms = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        search: searchTerm,
        sort: '-createdAt',
        type: 'public' // ดึงเฉพาะห้องแชทที่มีสถานะ public
      });

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/chatrooms?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        // กรองเฉพาะห้องแชทที่สร้างโดย admin หรือ superadmin
        const adminPublicRooms = data.chatRooms.filter(room => 
          room.type === 'public' && 
          (room.owner?.role === 'admin' || room.owner?.role === 'superadmin')
        );
        setPublicChatRooms(adminPublicRooms);
        
        // หาห้องหลัก
        const mainRoom = adminPublicRooms.find(room => room.isMainPublicRoom);
        if (mainRoom) {
          setMainPublicRoomId(mainRoom._id);
        }
        
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching public chat rooms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChatRooms = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        search: searchTerm,
        sort: '-createdAt'
      });

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/chatrooms?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        // กรองเฉพาะห้องแชทที่สร้างโดย user (ไม่ใช่ admin) - ทุกประเภท
        const userRooms = data.chatRooms.filter(room => 
          room.owner?.role !== 'admin' && 
          room.owner?.role !== 'superadmin'
        );
        setChatRooms(userRooms);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20,
        search: searchTerm,
        sort: '-createdAt'
      });

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/messages?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteChatRoom = async (roomId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/chatrooms/${roomId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        await fetchChatRooms();
        setShowDeleteModal(false);
        setDeleteTarget(null);
      } else {
        const error = await res.json();
        console.error('Failed to delete chat room:', error.message);
      }
    } catch (error) {
      console.error('Error deleting chat room:', error);
              console.error('Error deleting chat room');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      if (!messageId) {
        console.error('Message ID is required');
        console.error('ไม่พบ ID ของข้อความที่จะลบ');
        return;
      }

      console.log('Deleting message with ID:', messageId);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No authentication token found');
        console.error('ไม่พบ token การยืนยันตัวตน');
        return;
      }

      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      console.log('API URL:', apiUrl);
      
      const res = await fetch(`${apiUrl}/api/admin/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        console.log('Message deleted successfully');
        await fetchMessages();
        setShowDeleteModal(false);
        setDeleteTarget(null);
      } else {
        const error = await res.json();
        console.error('Failed to delete message:', error);
        console.error('Failed to delete message:', error.message);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
              console.error('เกิดข้อผิดพลาดในการลบข้อความ');
    }
  };

  const handleDeleteAllMessages = async (roomId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/messages/room/${roomId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        await fetchMessages();
        setShowDeleteModal(false);
        setDeleteTarget(null);
      } else {
        const error = await res.json();
        console.error('Failed to delete all messages:', error.message);
      }
    } catch (error) {
      console.error('Error deleting all messages:', error);
              console.error('Error deleting all messages');
    }
  };

  const handleDeleteAllImages = async (roomId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/images/room/${roomId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        await fetchMessages();
        setShowDeleteModal(false);
        setDeleteTarget(null);
      } else {
        const error = await res.json();
        console.error('Failed to delete all images:', error.message);
      }
    } catch (error) {
      console.error('Error deleting all images:', error);
              console.error('Error deleting all images');
    }
  };

  const confirmDelete = (target, type) => {
    console.log('Confirm delete:', { target, type, targetId: target._id || target.id });
    setDeleteTarget(target);
    setDeleteType(type);
    setShowDeleteModal(true);
  };

  const executeDelete = () => {
    if (!deleteTarget) {
      console.error('No delete target provided');
              console.error('ไม่พบข้อมูลที่จะลบ');
      return;
    }

    const targetId = deleteTarget._id || deleteTarget.id;
    console.log('Execute delete:', { deleteType, targetId, deleteTarget });

    if (!targetId) {
      console.error('No target ID found:', deleteTarget);
              console.error('ไม่พบ ID ของข้อมูลที่จะลบ');
      return;
    }

    switch (deleteType) {
      case 'chatroom':
        handleDeleteChatRoom(targetId);
        break;
      case 'message':
        handleDeleteMessage(targetId);
        break;
      case 'allMessages':
        handleDeleteAllMessages(targetId);
        break;
      case 'allImages':
        handleDeleteAllImages(targetId);
        break;
      default:
        console.error('Unknown delete type:', deleteType);
        console.error('ประเภทการลบไม่ถูกต้อง');
        break;
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('th-TH');
  };

  const truncateText = (text, maxLength = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">จัดการแชทและข้อความ</h2>
        <Badge variant="outline" className="text-sm">
          Admin Panel
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="public-chatrooms" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            ห้องแชทสาธารณะ
          </TabsTrigger>
          <TabsTrigger value="chatrooms" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            ห้องแชท
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            ข้อความ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="public-chatrooms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                ห้องแชทสาธารณะ (สร้างโดย Admin)
              </CardTitle>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="ค้นหาห้องแชทสาธารณะ (Admin)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {publicChatRooms.map((room) => (
                  <div key={room._id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{room.name}</h3>
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <Globe className="h-3 w-3 mr-1" />
                          สาธารณะ
                        </Badge>
                        {mainPublicRoomId === room._id && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            <Star className="h-3 w-3 mr-1" />
                            ห้องหลัก
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {room.description || 'ไม่มีคำอธิบาย'}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>เจ้าของ: {room.owner?.displayName || room.owner?.username}</span>
                        <span>สมาชิก: {room.stats?.totalMembers || 0}</span>
                        <span>ข้อความ: {room.stats?.totalMessages || 0}</span>
                        <span>สร้างเมื่อ: {formatDate(room.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetMainPublicRoom(room._id)}
                        className={`${mainPublicRoomId === room._id ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'text-blue-600 hover:text-blue-700'}`}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        {mainPublicRoomId === room._id ? 'ห้องหลัก' : 'หลัก'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewRoomMessages(room)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        ข้อความ
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => confirmDelete(room, 'chatroom')}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        ลบห้อง
                      </Button>
                    </div>
                  </div>
                ))}
                {publicChatRooms.length === 0 && !isLoading && (
                  <div className="text-center py-8 text-gray-500">
                    <Globe className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>ยังไม่มีห้องแชทสาธารณะที่สร้างโดย Admin</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chatrooms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                ห้องแชท (สร้างโดย User)
              </CardTitle>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="ค้นหาห้องแชท (User)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {chatRooms.map((room) => (
                  <div key={room._id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{room.name}</h3>
                        <Badge variant={room.type === 'public' ? 'default' : 'secondary'}>
                          {room.type === 'public' ? (
                            <>
                              <Globe className="h-3 w-3 mr-1" />
                              สาธารณะ
                            </>
                          ) : (
                            <>
                              <Lock className="h-3 w-3 mr-1" />
                              ส่วนตัว
                            </>
                          )}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {room.description || 'ไม่มีคำอธิบาย'}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>เจ้าของ: {room.owner?.displayName || room.owner?.username}</span>
                        <span>สมาชิก: {room.stats?.totalMembers || 0}</span>
                        <span>ข้อความ: {room.stats?.totalMessages || 0}</span>
                        <span>สร้างเมื่อ: {formatDate(room.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewRoomMessages(room)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        ข้อความ
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => confirmDelete(room, 'chatroom')}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        ลบห้อง
                      </Button>
                    </div>
                  </div>
                ))}
                {chatRooms.length === 0 && !isLoading && (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>ยังไม่มีห้องแชทที่สร้างโดย User</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                รายการข้อความ
              </CardTitle>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="ค้นหาข้อความ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message._id} className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">
                          {message.sender?.displayName || message.sender?.username}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {message.messageType}
                        </Badge>
                        {message.messageType === 'image' && (
                          <Image className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        {message.messageType === 'image' ? (
                          <span className="text-blue-600">รูปภาพ: {message.fileName}</span>
                        ) : (
                          truncateText(message.content, 100)
                        )}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>ห้อง: {message.chatRoom?.name}</span>
                        <span>ส่งเมื่อ: {formatDate(message.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => confirmDelete(message, 'message')}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        ลบ
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Messages Modal */}
      <Dialog open={showMessagesModal} onOpenChange={setShowMessagesModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              ข้อความในห้อง: {selectedRoomInfo?.name}
            </DialogTitle>
            <DialogDescription>
              จัดการข้อความและรูปภาพในห้องแชทนี้
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto max-h-[60vh]">
            {selectedRoomMessages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>ยังไม่มีข้อความในห้องนี้</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedRoomMessages.map((message) => (
                  <div key={message._id} className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">
                          {message.sender?.displayName || message.sender?.username}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {message.messageType}
                        </Badge>
                        {message.messageType === 'image' && (
                          <Image className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        {message.messageType === 'image' ? (
                          <span className="text-blue-600">รูปภาพ: {message.fileName}</span>
                        ) : (
                          message.content
                        )}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>ส่งเมื่อ: {formatDate(message.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => confirmDelete(message, 'message')}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        ลบ
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowMessagesModal(false)}>
              ปิด
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              ยืนยันการลบ
            </DialogTitle>
            <DialogDescription>
              {deleteType === 'chatroom' && (
                <>
                  คุณต้องการลบห้องแชท "{deleteTarget?.name}" หรือไม่?
                  <br />
                  <strong className="text-red-600">การดำเนินการนี้จะลบข้อความทั้งหมดในห้องด้วย</strong>
                </>
              )}
              {deleteType === 'message' && (
                <>
                  คุณต้องการลบข้อความนี้หรือไม่?
                  <br />
                  <strong className="text-red-600">การดำเนินการนี้ไม่สามารถยกเลิกได้</strong>
                </>
              )}
              {deleteType === 'allMessages' && (
                <>
                  คุณต้องการลบข้อความทั้งหมดในห้อง "{deleteTarget?.name}" หรือไม่?
                  <br />
                  <strong className="text-red-600">การดำเนินการนี้ไม่สามารถยกเลิกได้</strong>
                </>
              )}
              {deleteType === 'allImages' && (
                <>
                  คุณต้องการลบรูปภาพทั้งหมดในห้อง "{deleteTarget?.name}" หรือไม่?
                  <br />
                  <strong className="text-red-600">การดำเนินการนี้ไม่สามารถยกเลิกได้</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={executeDelete}>
              ลบ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminChatManagement;

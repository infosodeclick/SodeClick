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
  Lock
} from 'lucide-react';

const AdminChatManagement = () => {
  const [activeTab, setActiveTab] = useState('chatrooms');
  const [chatRooms, setChatRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteType, setDeleteType] = useState('');

  useEffect(() => {
    if (activeTab === 'chatrooms') {
      fetchChatRooms();
    } else if (activeTab === 'messages') {
      fetchMessages();
    }
  }, [activeTab, currentPage, searchTerm]);

  const fetchChatRooms = async () => {
    try {
      setIsLoading(true);
      const token = sessionStorage.getItem('token');
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
        setChatRooms(data.chatRooms);
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
      const token = sessionStorage.getItem('token');
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
      const token = sessionStorage.getItem('token');
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
      const token = sessionStorage.getItem('token');
      
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
      const token = sessionStorage.getItem('token');
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
      const token = sessionStorage.getItem('token');
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chatrooms" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            ห้องแชท
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            ข้อความ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chatrooms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                รายการห้องแชท
              </CardTitle>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="ค้นหาห้องแชท..."
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
                        onClick={() => confirmDelete(room, 'chatroom')}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        ลบห้อง
                      </Button>
                    </div>
                  </div>
                ))}
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

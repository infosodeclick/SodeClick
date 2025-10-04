import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Clock, AlertTriangle } from 'lucide-react';

const IdleWarningModal = ({ isOpen, onDismiss, onLogout }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Prevent modal from closing by clicking outside or pressing escape
  const handleOpenChange = (open) => {
    // Don't allow closing the modal through normal means
    // User must click one of the buttons
  };

  const handleDismiss = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      console.log('👆 User clicked "Still using" button');
      await onDismiss();
      console.log('✅ Idle warning dismissed successfully');
    } catch (error) {
      console.error('❌ Error dismissing idle warning:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await onLogout();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="sm:max-w-md w-[95vw] modern-card border-0 shadow-2xl p-0 rounded-3xl overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        <DialogTitle className="sr-only">
          เตือนการใช้งาน
        </DialogTitle>
        <DialogDescription className="sr-only">
          คุณจะถูกออกจากระบบในอีก 1 นาที
        </DialogDescription>
        
        {/* Header */}
        <div className="relative bg-gradient-to-br from-orange-500 to-red-500 p-6 text-white">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
              <AlertTriangle className="h-6 w-6" fill="white" />
            </div>
            <h2 className="text-xl font-bold">
              เตือนการใช้งาน
            </h2>
            <p className="text-sm text-white/80 mt-1">
              คุณจะถูกออกจากระบบในอีก 1 นาที
            </p>
          </div>
        </div>

        <div className="p-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 text-gray-600">
              <Clock className="h-5 w-5" />
              <span className="text-sm">
                เนื่องจากไม่มีการใช้งานเป็นเวลา 14 นาที
              </span>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={handleDismiss}
                disabled={isProcessing}
                className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onClickCapture={(e) => e.stopPropagation()}
              >
                {isProcessing ? 'กำลังประมวลผล...' : 'ยังใช้งานอยู่'}
              </Button>
              
              <Button 
                onClick={handleLogout}
                disabled={isProcessing}
                variant="outline"
                className="w-full h-12 border-gray-300 text-gray-600 hover:bg-gray-50 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onClickCapture={(e) => e.stopPropagation()}
              >
                {isProcessing ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IdleWarningModal;

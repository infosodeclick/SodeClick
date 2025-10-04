import React, { useState, useEffect } from 'react';
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

  // Add keyboard event handler as fallback
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isOpen && !isProcessing) {
        if (e.key === 'Enter' || e.key === ' ') {
          console.log('⌨️ Keyboard shortcut triggered - dismissing modal');
          e.preventDefault();
          handleDismiss();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, isProcessing]);

  const handleDismiss = async () => {
    console.log('🔄 handleDismiss called, isProcessing:', isProcessing);
    if (isProcessing) {
      console.log('⚠️ Already processing, ignoring click');
      return;
    }
    setIsProcessing(true);
    try {
      console.log('👆 User clicked "Still using" button');
      console.log('📞 Calling onDismiss function...');
      await onDismiss();
      console.log('✅ Idle warning dismissed successfully');
      console.log('🎯 Timer should be reset now - modal will close');
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
                onClick={(e) => {
                  console.log('🖱️ Button clicked directly');
                  e.preventDefault();
                  e.stopPropagation();
                  handleDismiss();
                }}
                onMouseDown={(e) => {
                  console.log('🖱️ Button mouse down');
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseUp={(e) => {
                  console.log('🖱️ Button mouse up');
                  e.preventDefault();
                  e.stopPropagation();
                }}
                disabled={isProcessing}
                className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ pointerEvents: 'auto', position: 'relative', zIndex: 1001 }}
              >
                {isProcessing ? 'กำลังประมวลผล...' : 'ยังใช้งานอยู่'}
              </Button>
              
              <Button 
                onClick={handleLogout}
                disabled={isProcessing}
                variant="outline"
                className="w-full h-12 border-gray-300 text-gray-600 hover:bg-gray-50 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
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

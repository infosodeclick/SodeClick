import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, RotateCw, ZoomIn, ZoomOut, Move, Crop } from 'lucide-react';
import { Button } from './ui/button';

const ImageCropModal = ({ 
  isOpen, 
  onClose, 
  imageFile, 
  onCropComplete,
  aspectRatio = 1, // 1 = square, 16/9 = landscape, 9/16 = portrait
  minCropSize = 100
}) => {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  
  const [imageLoaded, setImageLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 200, height: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropStart, setCropStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Load image when file changes
  useEffect(() => {
    if (imageFile && isOpen) {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setImageLoaded(true);
        
        // Initialize crop area to center of image
        const isMobile = window.innerWidth < 640;
        const containerWidth = isMobile ? Math.min(window.innerWidth - 32, 400) : 500;
        const containerHeight = isMobile ? Math.min(window.innerHeight * 0.4, 400) : 500;
        const cropSize = Math.min(containerWidth * 0.6, containerHeight * 0.6);
        const cropX = (containerWidth - cropSize) / 2;
        const cropY = (containerHeight - cropSize) / 2;
        
        setCropArea({
          x: cropX,
          y: cropY,
          width: cropSize,
          height: cropSize / aspectRatio
        });
        
        // Calculate initial scale to fit image in container
        const scaleX = containerWidth / img.width;
        const scaleY = containerHeight / img.height;
        setScale(Math.min(scaleX, scaleY) * 0.8);
        
        setPosition({
          x: (containerWidth - img.width * scale) / 2,
          y: (containerHeight - img.height * scale) / 2
        });
      };
      img.src = URL.createObjectURL(imageFile);
    }
  }, [imageFile, isOpen, aspectRatio, scale]);

  // Draw everything on canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    const img = imageRef.current;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Save context
    ctx.save();
    
    // Apply transformations
    ctx.translate(position.x + img.width * scale / 2, position.y + img.height * scale / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    
    // Draw image
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    
    // Restore context
    ctx.restore();
    
    // Draw overlay
    drawOverlay(ctx, canvas.width, canvas.height);
  }, [imageLoaded, scale, rotation, position, cropArea]);

  // Draw overlay with crop area
  const drawOverlay = (ctx, width, height) => {
    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, width, height);
    
    // Clear crop area
    ctx.clearRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
    
    // Redraw image in crop area
    ctx.save();
    ctx.translate(position.x + imageRef.current.width * scale / 2, position.y + imageRef.current.height * scale / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(imageRef.current, -imageRef.current.width / 2, -imageRef.current.height / 2);
    ctx.restore();
    
    // Crop area border with gradient effect
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
    
    // Inner border for better visibility
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(cropArea.x + 1, cropArea.y + 1, cropArea.width - 2, cropArea.height - 2);
    
    // Corner handles with better styling
    const isMobile = window.innerWidth < 640;
    const handleSize = isMobile ? 16 : 12;
    const handleColor = '#3b82f6';
    const handleBorderColor = '#ffffff';
    
    // Draw handles with border
    const corners = [
      { x: cropArea.x, y: cropArea.y }, // top-left
      { x: cropArea.x + cropArea.width, y: cropArea.y }, // top-right
      { x: cropArea.x, y: cropArea.y + cropArea.height }, // bottom-left
      { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height } // bottom-right
    ];
    
    corners.forEach(corner => {
      // Outer border
      ctx.fillStyle = handleBorderColor;
      ctx.fillRect(corner.x - handleSize/2 - 1, corner.y - handleSize/2 - 1, handleSize + 2, handleSize + 2);
      
      // Inner handle
      ctx.fillStyle = handleColor;
      ctx.fillRect(corner.x - handleSize/2, corner.y - handleSize/2, handleSize, handleSize);
    });
    
    // Center crosshair for better positioning
    const centerX = cropArea.x + cropArea.width / 2;
    const centerY = cropArea.y + cropArea.height / 2;
    const crosshairSize = 20;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    
    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(centerX - crosshairSize, centerY);
    ctx.lineTo(centerX + crosshairSize, centerY);
    ctx.stroke();
    
    // Vertical line
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - crosshairSize);
    ctx.lineTo(centerX, centerY + crosshairSize);
    ctx.stroke();
  };

  // Update canvas when dependencies change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Handle window resize for responsive canvas
  useEffect(() => {
    const handleResize = () => {
      if (imageRef.current && imageLoaded) {
        const isMobile = window.innerWidth < 640;
        const containerWidth = isMobile ? Math.min(window.innerWidth - 32, 400) : 500;
        const containerHeight = isMobile ? Math.min(window.innerHeight * 0.4, 400) : 500;
        
        // Update canvas size
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = containerWidth;
          canvas.height = containerHeight;
          
          // Recalculate scale to fit image
          const img = imageRef.current;
          const scaleX = containerWidth / img.width;
          const scaleY = containerHeight / img.height;
          const newScale = Math.min(scaleX, scaleY) * 0.8;
          setScale(newScale);
          
          // Recalculate position
          setPosition({
            x: (containerWidth - img.width * newScale) / 2,
            y: (containerHeight - img.height * newScale) / 2
          });
          
          // Recalculate crop area
          const cropSize = Math.min(containerWidth * 0.6, containerHeight * 0.6);
          const cropX = (containerWidth - cropSize) / 2;
          const cropY = (containerHeight - cropSize) / 2;
          
          setCropArea({
            x: cropX,
            y: cropY,
            width: cropSize,
            height: cropSize / aspectRatio
          });
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageLoaded, aspectRatio]);

  // Mouse event handlers
  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicking on crop area
    if (x >= cropArea.x && x <= cropArea.x + cropArea.width &&
        y >= cropArea.y && y <= cropArea.y + cropArea.height) {
      setIsDragging(true);
      setDragStart({ x: x - cropArea.x, y: y - cropArea.y });
    }
    
    // Check if clicking on corner handles
    const isMobile = window.innerWidth < 640;
    const handleSize = isMobile ? 16 : 12;
    const corners = [
      { x: cropArea.x, y: cropArea.y }, // top-left
      { x: cropArea.x + cropArea.width, y: cropArea.y }, // top-right
      { x: cropArea.x, y: cropArea.y + cropArea.height }, // bottom-left
      { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height } // bottom-right
    ];
    
    for (let i = 0; i < corners.length; i++) {
      const corner = corners[i];
      if (Math.abs(x - corner.x) <= handleSize && Math.abs(y - corner.y) <= handleSize) {
        setIsResizing(true);
        setCropStart({ ...cropArea });
        setDragStart({ x, y });
        break;
      }
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging && !isResizing) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (isDragging) {
      const newX = x - dragStart.x;
      const newY = y - dragStart.y;
      
      // Constrain to canvas bounds
      const canvasWidth = window.innerWidth < 640 ? Math.min(window.innerWidth - 32, 400) : 500;
      const canvasHeight = window.innerWidth < 640 ? Math.min(window.innerHeight * 0.4, 400) : 500;
      const constrainedX = Math.max(0, Math.min(canvasWidth - cropArea.width, newX));
      const constrainedY = Math.max(0, Math.min(canvasHeight - cropArea.height, newY));
      
      setCropArea(prev => ({
        ...prev,
        x: constrainedX,
        y: constrainedY
      }));
    } else if (isResizing) {
      const deltaX = x - dragStart.x;
      const deltaY = y - dragStart.y;
      
      const newWidth = Math.max(minCropSize, cropStart.width + deltaX);
      const newHeight = newWidth / aspectRatio;
      
      setCropArea(prev => ({
        ...prev,
        width: newWidth,
        height: newHeight
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  // Touch event handlers for mobile
  const handleTouchStart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    // Check if touching on crop area
    if (x >= cropArea.x && x <= cropArea.x + cropArea.width &&
        y >= cropArea.y && y <= cropArea.y + cropArea.height) {
      setIsDragging(true);
      setDragStart({ x: x - cropArea.x, y: y - cropArea.y });
    }
    
    // Check if touching on corner handles
    const isMobile = window.innerWidth < 640;
    const handleSize = isMobile ? 16 : 12;
    const corners = [
      { x: cropArea.x, y: cropArea.y }, // top-left
      { x: cropArea.x + cropArea.width, y: cropArea.y }, // top-right
      { x: cropArea.x, y: cropArea.y + cropArea.height }, // bottom-left
      { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height } // bottom-right
    ];
    
    for (let i = 0; i < corners.length; i++) {
      const corner = corners[i];
      if (Math.abs(x - corner.x) <= handleSize && Math.abs(y - corner.y) <= handleSize) {
        setIsResizing(true);
        setCropStart({ ...cropArea });
        setDragStart({ x, y });
        break;
      }
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (!isDragging && !isResizing) return;
    
    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    if (isDragging) {
      const newX = x - dragStart.x;
      const newY = y - dragStart.y;
      
      // Constrain to canvas bounds
      const canvasWidth = window.innerWidth < 640 ? Math.min(window.innerWidth - 32, 400) : 500;
      const canvasHeight = window.innerWidth < 640 ? Math.min(window.innerHeight * 0.4, 400) : 500;
      const constrainedX = Math.max(0, Math.min(canvasWidth - cropArea.width, newX));
      const constrainedY = Math.max(0, Math.min(canvasHeight - cropArea.height, newY));
      
      setCropArea(prev => ({
        ...prev,
        x: constrainedX,
        y: constrainedY
      }));
    } else if (isResizing) {
      const deltaX = x - dragStart.x;
      const deltaY = y - dragStart.y;
      
      const newWidth = Math.max(minCropSize, cropStart.width + deltaX);
      const newHeight = newWidth / aspectRatio;
      
      setCropArea(prev => ({
        ...prev,
        width: newWidth,
        height: newHeight
      }));
    }
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    setIsDragging(false);
    setIsResizing(false);
  };

  // Zoom controls
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Crop and return result
  const handleCrop = () => {
    if (!imageRef.current) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // ตั้งค่า image smoothing เพื่อคุณภาพที่ดีขึ้น
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // คำนวณขนาด canvas ที่เหมาะสมกับรูปภาพต้นฉบับ
    const img = imageRef.current;
    const sourceX = (cropArea.x - position.x) / scale;
    const sourceY = (cropArea.y - position.y) / scale;
    const sourceWidth = cropArea.width / scale;
    const sourceHeight = cropArea.height / scale;
    
    // ใช้ขนาดจริงของพื้นที่ที่ต้องการครอป (ไม่ใช่ขนาดที่แสดงบนหน้าจอ)
    canvas.width = sourceWidth;
    canvas.height = sourceHeight;
    
    // วาดรูปภาพที่ครอปแล้วด้วยขนาดจริง
    ctx.drawImage(
      img,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, sourceWidth, sourceHeight
    );
    
    // กำหนด format และ quality ตามไฟล์ต้นฉบับ
    const originalType = imageFile.type || 'image/png';
    const outputType = originalType.includes('png') ? 'image/png' : 'image/jpeg';
    const quality = outputType === 'image/jpeg' ? 1.0 : undefined; // PNG ไม่มี quality parameter
    
    // Convert to blob ด้วยคุณภาพสูงสุด
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], imageFile.name, { type: outputType });
        onCropComplete(file);
        onClose();
      }
    }, outputType, quality);
  };

  if (!isOpen || !imageFile) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[95vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
              <Crop className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">ปรับแต่งรูปภาพ</h3>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">ลากกรอบเพื่อเลือกพื้นที่ที่ต้องการ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
          >
            <X className="h-5 w-5 text-gray-500 group-hover:text-gray-700" />
          </button>
        </div>
        
        {/* Canvas Container */}
        <div className="p-3 sm:p-6">
          <div 
            ref={containerRef}
            className="relative bg-gray-100 rounded-xl overflow-hidden mx-auto shadow-lg border-2 border-gray-200"
            style={{ 
              width: window.innerWidth < 640 ? Math.min(window.innerWidth - 32, 400) : 500, 
              height: window.innerWidth < 640 ? Math.min(window.innerHeight * 0.4, 400) : 500 
            }}
          >
            <canvas
              ref={canvasRef}
              width={window.innerWidth < 640 ? Math.min(window.innerWidth - 32, 400) : 500}
              height={window.innerWidth < 640 ? Math.min(window.innerHeight * 0.4, 400) : 500}
              className="cursor-crosshair touch-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
            {/* Loading overlay */}
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin h-6 w-6 sm:h-8 sm:w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-xs sm:text-sm text-gray-600">กำลังโหลดรูปภาพ...</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Controls */}
        <div className="p-4 sm:p-6 border-t bg-gradient-to-r from-gray-50 to-blue-50">
          {/* Zoom and Rotate Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-6 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="flex items-center space-x-1 sm:space-x-2 bg-white rounded-lg p-1.5 sm:p-2 shadow-sm border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={scale <= 0.1}
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-gray-100"
                >
                  <ZoomOut className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <div className="w-12 sm:w-16 text-center">
                  <span className="text-xs sm:text-sm font-medium text-gray-700">
                    {Math.round(scale * 100)}%
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={scale >= 3}
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-gray-100"
                >
                  <ZoomIn className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRotate}
                className="bg-white hover:bg-gray-50 border-gray-200 text-xs sm:text-sm"
              >
                <RotateCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">หมุน 90°</span>
                <span className="sm:hidden">หมุน</span>
              </Button>
            </div>
            
            <div className="text-center sm:text-right">
              <p className="text-xs sm:text-sm font-medium text-gray-700">คำแนะนำ</p>
              <p className="text-xs text-gray-500 hidden sm:block">ลากกรอบเพื่อปรับตำแหน่ง • ลากมุมเพื่อปรับขนาด</p>
              <p className="text-xs text-gray-500 sm:hidden">แตะและลากเพื่อปรับแต่ง</p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
              <Move className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">ใช้เมาส์ลากเพื่อปรับแต่ง</span>
              <span className="sm:hidden">แตะและลากเพื่อปรับแต่ง</span>
            </div>
            
            <div className="flex space-x-2 sm:space-x-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 border-gray-300 hover:bg-gray-50 text-sm"
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleCrop}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg text-sm"
              >
                <Crop className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                ตัดรูป
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;

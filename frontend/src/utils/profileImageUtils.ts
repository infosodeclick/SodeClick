// Utility function to check if image exists at URL
const checkImageExists = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
};

// Utility function to generate correct profile image URL with fallback
export const getProfileImageUrlWithFallback = async (imagePath: string, userId?: string, baseUrl?: string): Promise<string> => {
  if (!imagePath) return '';
  
  // If already a full URL or data URL, return as is
  if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
    return imagePath;
  }
  
  const apiBaseUrl = baseUrl || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  
  console.log('🖼️ Processing image path with fallback:', imagePath, 'userId:', userId);
  
  // Handle profiles/ directory - try both locations
  if (imagePath.startsWith('profiles/')) {
    const fileName = imagePath.replace('profiles/', '');
    const fileUserId = userId || fileName.match(/profile-([a-f0-9]{24})-/)?.[1];
    
    if (fileUserId) {
      // Try new structure first: /uploads/users/{userId}/{fileName}
      const newStructureUrl = `${apiBaseUrl}/uploads/users/${fileUserId}/${fileName}`;
      const existsInNewStructure = await checkImageExists(newStructureUrl);
      
      if (existsInNewStructure) {
        console.log('✅ Found image in new structure:', newStructureUrl);
        return newStructureUrl;
      }
      
      // Try old structure: /uploads/profiles/{fileName}
      const oldStructureUrl = `${apiBaseUrl}/uploads/profiles/${fileName}`;
      const existsInOldStructure = await checkImageExists(oldStructureUrl);
      
      if (existsInOldStructure) {
        console.log('✅ Found image in old structure:', oldStructureUrl);
        return oldStructureUrl;
      }
      
      console.log('❌ Image not found in either structure');
      return newStructureUrl; // Return new structure URL as default
    }
    
    // Fallback: try profiles directory directly
    const fallbackUrl = `${apiBaseUrl}/uploads/profiles/${fileName}`;
    return fallbackUrl;
  }
  
  // Handle other formats
  const finalUrl = `${apiBaseUrl}/uploads/${imagePath}`;
  return finalUrl;
};

// Utility function to fix broken URLs with duplicate /profiles/
const fixBrokenUrl = (url: string): string => {
  if (!url) return url;
  
  // Fix the specific issue: remove /profiles/ when it appears after /users/{userId}/
  const brokenPattern = /\/uploads\/users\/([a-f0-9]{24})\/profiles\//;
  if (brokenPattern.test(url)) {
    const fixedUrl = url.replace('/profiles/', '/');
    console.log('🔧 Fixed broken URL:', url, '→', fixedUrl);
    return fixedUrl;
  }
  
  return url;
};

// Utility function to generate correct profile image URL
export const getProfileImageUrl = (imagePath: string, userId?: string, baseUrl?: string): string => {
  if (!imagePath || typeof imagePath !== 'string') return '';
  
  // If already a full URL or data URL, fix and return
  if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
    return fixBrokenUrl(imagePath);
  }
  
  const apiBaseUrl = baseUrl || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  
  console.log('🖼️ Processing image path:', imagePath, 'userId:', userId);
  console.log('🌐 API Base URL:', apiBaseUrl);
  
  
  // Handle new path format: users/{userId}/{filename}
  if (imagePath.startsWith('users/')) {
    const finalUrl = `${apiBaseUrl}/uploads/${imagePath}`;
    console.log('🔗 Generated URL (users/):', finalUrl);
    return finalUrl;
  }
  
  // Handle old path format: profile-{userId}-{timestamp}-{random}.{ext}
  if (imagePath.includes('profile-') && userId && imagePath.includes(userId)) {
    const newPath = `users/${userId}/${imagePath}`;
    const finalUrl = `${apiBaseUrl}/uploads/${newPath}`;
    console.log('🔗 Generated URL (profile-):', finalUrl);
    return finalUrl;
  }
  
  // Handle profiles/ directory - use new structure (users/{userId}/)
  if (imagePath.startsWith('profiles/')) {
    const fileName = imagePath.replace('profiles/', '');
    console.log('🔄 Removed profiles/ prefix, fileName:', fileName);
    
    // Extract userId from filename if not provided
    const fileUserId = userId || fileName.match(/profile-([a-f0-9]{24})-/)?.[1];
    console.log('📋 Extracted userId:', fileUserId, 'from fileName:', fileName);
    
    if (fileUserId) {
      // Use new structure: /uploads/users/{userId}/{fileName}
      const newStructureUrl = `${apiBaseUrl}/uploads/users/${fileUserId}/${fileName}`;
      console.log('🔗 Generated URL (users/{userId}/):', newStructureUrl);
      console.log('🔍 Debug - Full URL components:', {
        apiBaseUrl,
        fileUserId,
        fileName,
        finalUrl: newStructureUrl
      });
      
      
      return newStructureUrl;
    }
    
    // Fallback: try profiles directory directly
    const fallbackUrl = `${apiBaseUrl}/uploads/profiles/${fileName}`;
    console.log('🔗 Fallback URL (profiles/):', fallbackUrl);
    return fallbackUrl;
  }
  
  // Handle other formats
  const finalUrl = `${apiBaseUrl}/uploads/${imagePath}`;
  console.log('🔗 Generated URL (other):', finalUrl);
  return finalUrl;
};

// Utility function to get main profile image (synchronous version)
export const getMainProfileImage = (profileImages: string[], mainProfileImageIndex?: number, userId?: string): string => {
  if (!profileImages || profileImages.length === 0) {
    return '';
  }
  
  const index = mainProfileImageIndex || 0;
  const mainImage = profileImages[index];
  
  if (!mainImage || mainImage.startsWith('data:image/svg+xml')) {
    return '';
  }
  
  const imageUrl = getProfileImageUrl(mainImage, userId);
  
  // Apply final fix to ensure URL is correct
  return fixBrokenUrl(imageUrl);
};

// Utility function to get main profile image with fallback (asynchronous version)
export const getMainProfileImageWithFallback = async (profileImages: string[], mainProfileImageIndex?: number, userId?: string): Promise<string> => {
  if (!profileImages || profileImages.length === 0) {
    return '';
  }
  
  const index = mainProfileImageIndex || 0;
  const mainImage = profileImages[index];
  
  if (!mainImage || mainImage.startsWith('data:image/svg+xml')) {
    return '';
  }
  
  return await getProfileImageUrlWithFallback(mainImage, userId);
};

// ฟังก์ชันสำหรับ guest mode - ไม่ต้อง authentication
export const getProfileImageUrlGuest = (imagePath: string, userId?: string, baseUrl?: string): string => {
  // ใช้ฟังก์ชันเดิม แต่เพิ่ม fallback สำหรับ guest mode
  const url = getProfileImageUrl(imagePath, userId, baseUrl);
  
  // ถ้าไม่มี URL หรือ URL ไม่ถูกต้อง ให้ใช้ default avatar
  if (!url || url === '' || url.includes('undefined')) {
    console.log('🔄 Guest mode - using default avatar for:', imagePath);
    return getDefaultAvatarUrl();
  }
  
  return url;
};

// ฟังก์ชันสร้าง default avatar URL (ใช้ SVG data URLs)
export const getDefaultAvatarUrl = (gender: string = 'unknown'): string => {
  // สร้าง SVG avatars แบบ inline เพื่อไม่ต้องพึ่งพาไฟล์ภายนอก
  const avatars = {
    male: `data:image/svg+xml;base64,${btoa(`
      <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="maleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1E40AF;stop-opacity:1" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#maleGrad)"/>
        <circle cx="50" cy="35" r="15" fill="white" opacity="0.9"/>
        <ellipse cx="50" cy="75" rx="20" ry="15" fill="white" opacity="0.9"/>
      </svg>
    `)}`,
    female: `data:image/svg+xml;base64,${btoa(`
      <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="femaleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#EC4899;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#BE185D;stop-opacity:1" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#femaleGrad)"/>
        <circle cx="50" cy="35" r="12" fill="white" opacity="0.9"/>
        <ellipse cx="50" cy="75" rx="18" ry="12" fill="white" opacity="0.9"/>
        <path d="M35 25 Q50 15 65 25" stroke="white" stroke-width="3" fill="none" opacity="0.9"/>
      </svg>
    `)}`,
    unknown: `data:image/svg+xml;base64,${btoa(`
      <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="unknownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#6B7280;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#374151;stop-opacity:1" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#unknownGrad)"/>
        <circle cx="50" cy="35" r="15" fill="white" opacity="0.9"/>
        <ellipse cx="50" cy="75" rx="20" ry="15" fill="white" opacity="0.9"/>
        <circle cx="50" cy="35" r="8" fill="url(#unknownGrad)"/>
      </svg>
    `)}`
  };
  
  return avatars[gender as keyof typeof avatars] || avatars.unknown;
};

// ฟังก์ชันสำหรับ guest mode - ไม่ต้อง authentication (synchronous version)
export const getMainProfileImageGuest = (profileImages: string[], mainProfileImageIndex?: number, userId?: string, gender?: string): string => {
  if (!profileImages || profileImages.length === 0) {
    return getDefaultAvatarUrl(gender);
  }
  
  const index = mainProfileImageIndex || 0;
  const mainImage = profileImages[index];
  
  if (!mainImage || mainImage.startsWith('data:image/svg+xml')) {
    return getDefaultAvatarUrl(gender);
  }
  
  const imageUrl = getProfileImageUrl(mainImage, userId);
  
  // ถ้าไม่มี URL หรือ URL ไม่ถูกต้อง ให้ใช้ default avatar
  if (!imageUrl || imageUrl === '' || imageUrl.includes('undefined')) {
    return getDefaultAvatarUrl(gender);
  }
  
  return imageUrl;
};

/**
 * Media Processing Utilities
 * Handles aspect ratio detection and resizing for uploads
 */

// Supported aspect ratios
const ALLOWED_ASPECT_RATIOS = [
  { name: '16:9', ratio: 16 / 9, tolerance: 0.02 },
  { name: '9:16', ratio: 9 / 16, tolerance: 0.02 },
  { name: '1:1', ratio: 1, tolerance: 0.02 },
  { name: '4:5', ratio: 4 / 5, tolerance: 0.02 },
];

const DEFAULT_ASPECT_RATIO = { width: 4, height: 5 }; // 4:5 as default

/**
 * Check if aspect ratio matches any allowed ratios
 */
const isAllowedAspectRatio = (width: number, height: number): boolean => {
  const aspectRatio = width / height;
  
  return ALLOWED_ASPECT_RATIOS.some(allowed => 
    Math.abs(aspectRatio - allowed.ratio) <= allowed.tolerance
  );
};

/**
 * Calculate dimensions to fit within max bounds while maintaining aspect ratio
 */
const calculateFitDimensions = (
  width: number, 
  height: number, 
  maxWidth: number, 
  maxHeight: number
): { width: number; height: number } => {
  const aspectRatio = width / height;
  
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }
  
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }
  
  return { width: Math.round(width), height: Math.round(height) };
};

/**
 * Process an image file to ensure it meets aspect ratio requirements
 */
export const processImage = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      const { width, height } = img;
      
      // Check if aspect ratio is already allowed
      if (isAllowedAspectRatio(width, height)) {
        console.log(`Image aspect ratio ${width}:${height} is allowed, keeping original`);
        resolve(file);
        return;
      }
      
      // Resize to 4:5 aspect ratio
      console.log(`Image aspect ratio ${width}:${height} not allowed, resizing to 4:5`);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Calculate new dimensions with 4:5 aspect ratio
      // Use the original width as base and calculate height
      const targetAspectRatio = DEFAULT_ASPECT_RATIO.width / DEFAULT_ASPECT_RATIO.height;
      let newWidth = width;
      let newHeight = width / targetAspectRatio;
      
      // If resulting height is smaller than original, use height as base
      if (newHeight < height) {
        newHeight = height;
        newWidth = height * targetAspectRatio;
      }
      
      // Calculate dimensions to fit within reasonable bounds (max 2048px)
      const finalDimensions = calculateFitDimensions(newWidth, newHeight, 2048, 2560);
      
      canvas.width = finalDimensions.width;
      canvas.height = finalDimensions.height;
      
      // Fill with white background (in case image has transparency)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Calculate position to center the original image
      const scale = Math.min(canvas.width / width, canvas.height / height);
      const scaledWidth = width * scale;
      const scaledHeight = height * scale;
      const x = (canvas.width - scaledWidth) / 2;
      const y = (canvas.height - scaledHeight) / 2;
      
      // Draw image centered and scaled
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
      
      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          
          // Create new file with same name
          const newFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          
          resolve(newFile);
        },
        'image/jpeg',
        0.9
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
};

/**
 * Process a video file to ensure it meets aspect ratio requirements
 */
export const processVideo = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      
      const { videoWidth, videoHeight } = video;
      
      // Check if aspect ratio is already allowed
      if (isAllowedAspectRatio(videoWidth, videoHeight)) {
        console.log(`Video aspect ratio ${videoWidth}:${videoHeight} is allowed, keeping original`);
        resolve(file);
        return;
      }
      
      // For videos, we'll just log a message and keep original
      // Proper video transcoding would require server-side processing
      console.log(`Video aspect ratio ${videoWidth}:${videoHeight} not in allowed list`);
      console.log('Note: Video aspect ratio conversion requires server-side processing');
      console.log('Keeping original video file');
      
      // For now, accept the video as-is
      // In production, you'd want to send it to a server for transcoding
      resolve(file);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video'));
    };
    
    video.src = url;
  });
};

/**
 * Main function to process media files
 */
export const processMediaFile = async (file: File): Promise<File> => {
  if (file.type.startsWith('image/')) {
    return processImage(file);
  } else if (file.type.startsWith('video/')) {
    return processVideo(file);
  }
  
  // Unknown type, return as-is
  return file;
};

/**
 * Batch process multiple media files
 */
export const processMediaFiles = async (files: File[]): Promise<File[]> => {
  const processedFiles: File[] = [];
  
  for (const file of files) {
    try {
      const processed = await processMediaFile(file);
      processedFiles.push(processed);
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      // If processing fails, use original file
      processedFiles.push(file);
    }
  }
  
  return processedFiles;
};

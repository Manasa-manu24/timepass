import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AiOutlineCamera, AiOutlineClose, AiOutlineReload, AiOutlineCheck } from 'react-icons/ai';
import { BsCameraVideo, BsCameraVideoOff } from 'react-icons/bs';
import { MdRefresh } from 'react-icons/md';
import { toast } from 'sonner';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
  captureMode?: 'photo' | 'video';
}

const CameraCapture = ({ onCapture, onClose, captureMode = 'photo' }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [capturedVideo, setCapturedVideo] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: captureMode === 'video'
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Failed to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const imageUrl = URL.createObjectURL(blob);
          const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
          
          setCapturedImage(imageUrl);
          setCapturedFile(file);
          stopCamera();
        }
      }, 'image/jpeg', 0.95);
    }
  };

  const startRecording = () => {
    if (!stream) return;

    const options = { mimeType: 'video/webm' };
    const mediaRecorder = new MediaRecorder(stream, options);
    mediaRecorderRef.current = mediaRecorder;
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const file = new File([blob], `video-${Date.now()}.webm`, { type: 'video/webm' });
      const videoUrl = URL.createObjectURL(blob);
      
      setCapturedVideo(videoUrl);
      setCapturedFile(file);
      stopCamera();
    };

    mediaRecorder.start();
    setIsRecording(true);
    setRecordedChunks(chunks);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleCapture = () => {
    if (captureMode === 'video') {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    } else {
      capturePhoto();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedVideo(null);
    setCapturedFile(null);
    startCamera();
  };

  const handleShare = () => {
    if (capturedFile) {
      onCapture(capturedFile);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Camera View */}
      <div className="relative w-full h-full flex items-center justify-center">
        {capturedImage ? (
          // Preview captured photo
          <img src={capturedImage} alt="Captured" className="max-w-full max-h-full object-contain" />
        ) : capturedVideo ? (
          // Preview captured video
          <video 
            src={capturedVideo} 
            controls 
            className="max-w-full max-h-full object-contain" 
            autoPlay 
            loop
            crossOrigin="anonymous"
            preload="metadata"
            onError={(e) => console.error('Video preview error:', e)}
          />
        ) : (
          // Live camera view
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}

        {/* Top Controls */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <AiOutlineClose size={24} />
          </Button>

          {!capturedImage && !capturedVideo && (
            <Button
              variant="ghost"
              size="icon"
              onClick={switchCamera}
              className="text-white hover:bg-white/20"
            >
              <AiOutlineReload size={24} />
            </Button>
          )}
        </div>

        {/* Bottom Controls - Live Camera */}
        {!capturedImage && !capturedVideo && (
          <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-center items-center bg-gradient-to-t from-black/60 to-transparent">
            <Button
              onClick={handleCapture}
              size="icon"
              className={`w-20 h-20 rounded-full ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-white hover:bg-gray-200'
              }`}
            >
              {captureMode === 'video' ? (
                isRecording ? (
                  <BsCameraVideoOff size={32} className="text-white" />
                ) : (
                  <BsCameraVideo size={32} className="text-black" />
                )
              ) : (
                <AiOutlineCamera size={32} className="text-black" />
              )}
            </Button>
          </div>
        )}

        {/* Bottom Controls - Preview Mode */}
        {(capturedImage || capturedVideo) && (
          <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-center items-center gap-8 bg-gradient-to-t from-black/60 to-transparent">
            {/* Retake Button */}
            <Button
              onClick={handleRetake}
              size="icon"
              className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 text-white border-2 border-white"
            >
              <MdRefresh size={28} />
            </Button>

            {/* Share/Use Button */}
            <Button
              onClick={handleShare}
              size="icon"
              className="w-20 h-20 rounded-full bg-primary hover:bg-primary/90"
            >
              <AiOutlineCheck size={36} />
            </Button>
          </div>
        )}

        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full flex items-center gap-2 animate-pulse">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            <span className="font-semibold">Recording...</span>
          </div>
        )}

        {/* Mode Indicator - Only show during live camera */}
        {!capturedImage && !capturedVideo && (
          <div className="absolute top-20 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
            {captureMode === 'video' ? 'Video Mode' : 'Photo Mode'}
          </div>
        )}

        {/* Preview Instructions */}
        {(capturedImage || capturedVideo) && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm">
            Preview - Retake or Share
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;

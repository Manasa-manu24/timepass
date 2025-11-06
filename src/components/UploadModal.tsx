import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { AiOutlineCamera, AiOutlineVideoCamera, AiOutlineClose } from 'react-icons/ai';
import { BsCameraReels } from 'react-icons/bs';
import { Progress } from '@/components/ui/progress';
import { doc, getDoc } from 'firebase/firestore';
import CameraCapture from './CameraCapture';

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UploadModal = ({ open, onOpenChange }: UploadModalProps) => {
  const { user } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [postType, setPostType] = useState<'post' | 'reel' | 'story'>('post');
  const [showCamera, setShowCamera] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length > 10) {
      toast.error('Maximum 10 files allowed');
      return;
    }

    const oversized = files.find(f => f.size > 100 * 1024 * 1024);
    if (oversized) {
      toast.error('File size must be less than 100MB');
      return;
    }

    setSelectedFiles(files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCameraCapture = (file: File) => {
    setSelectedFiles([file]);
    setShowCamera(false);
  };

  const openCamera = () => {
    setShowCamera(true);
  };

  const handleUpload = async () => {
    if (!user || selectedFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    if (caption.length > 2200) {
      toast.error('Caption must be less than 2200 characters');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadPromises = selectedFiles.map(async (file, index) => {
        const url = await uploadToCloudinary(file);
        setUploadProgress(((index + 1) / selectedFiles.length) * 100);
        return url;
      });

      const mediaUrls = await Promise.all(uploadPromises);

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorUsername: userData?.username || user.email?.split('@')[0] || 'User',
        authorProfilePic: userData?.profilePicUrl || '',
        caption,
        mediaUrl: mediaUrls[0],
        media: mediaUrls,
        mediaType: selectedFiles[0].type.startsWith('video') ? 'video' : 'image',
        postType,
        likes: [],
        commentsCount: 0,
        timestamp: serverTimestamp()
      });

      toast.success('Posted successfully!');
      onOpenChange(false);
      
      setSelectedFiles([]);
      setCaption('');
      setPostType('post');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Post</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex gap-4">
              <Button
                variant={postType === 'post' ? 'default' : 'outline'}
                onClick={() => setPostType('post')}
                className="flex-1"
              >
                <AiOutlineCamera className="mr-2" size={20} />
                Post
              </Button>
              <Button
                variant={postType === 'reel' ? 'default' : 'outline'}
                onClick={() => setPostType('reel')}
                className="flex-1"
              >
                <BsCameraReels className="mr-2" size={20} />
                Reel
              </Button>
              <Button
                variant={postType === 'story' ? 'default' : 'outline'}
                onClick={() => setPostType('story')}
                className="flex-1"
              >
                <AiOutlineVideoCamera className="mr-2" size={20} />
                Story
              </Button>
            </div>

            {/* File Upload Options */}
            <div className="space-y-3">
              {/* Gallery Upload */}
              <div>
                <Label htmlFor="file-upload-desktop" className="cursor-pointer">
                  <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:bg-accent transition">
                    <AiOutlineCamera size={64} className="mx-auto mb-4 text-muted-foreground" />
                    <p className="text-base text-muted-foreground mb-2">
                      Drag photos and videos here
                    </p>
                    <p className="text-sm text-primary">or click to select from your computer</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Max 10 files, 100MB each
                    </p>
                  </div>
                </Label>
                <input
                  id="file-upload-desktop"
                  type="file"
                  accept={postType === 'reel' ? 'video/*' : 'image/*,video/*'}
                  multiple={postType !== 'reel'}
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Live Camera Capture */}
              <div 
                onClick={openCamera}
                className="cursor-pointer border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-accent transition"
              >
                <AiOutlineVideoCamera size={48} className="mx-auto mb-2 text-muted-foreground" />
                <p className="text-base text-muted-foreground">
                  Use Live Camera
                </p>
              </div>
            </div>

          {selectedFiles.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {selectedFiles.map((file, index) => (
                <div key={index} className="relative aspect-square">
                  {file.type.startsWith('video') ? (
                    <video
                      src={URL.createObjectURL(file)}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  )}
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1.5"
                    aria-label={`Remove file ${index + 1}`}
                  >
                    <AiOutlineClose size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <Label htmlFor="caption-desktop">Caption</Label>
            <Textarea
              id="caption-desktop"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              className="mt-2 min-h-[120px]"
              maxLength={2200}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {caption.length}/2200 characters
            </p>
          </div>

          {uploading && (
            <div>
              <Label>Uploading...</Label>
              <Progress value={uploadProgress} className="mt-2" />
            </div>
          )}

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              className="flex-1"
              disabled={uploading || selectedFiles.length === 0}
            >
              {uploading ? 'Uploading...' : 'Share'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Camera Capture Component */}
    {showCamera && (
      <CameraCapture
        onCapture={handleCameraCapture}
        onClose={() => setShowCamera(false)}
        captureMode={postType === 'reel' ? 'video' : 'photo'}
      />
    )}
  </>
  );
};

export default UploadModal;

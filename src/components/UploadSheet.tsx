import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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

interface UploadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UploadSheet = ({ open, onOpenChange }: UploadSheetProps) => {
  const { user } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [postType, setPostType] = useState<'post' | 'reel' | 'story'>('post');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length > 10) {
      toast.error('Maximum 10 files allowed');
      return;
    }

    // Check file sizes (max 100MB per file)
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
      // Upload files to Cloudinary
      const uploadPromises = selectedFiles.map(async (file, index) => {
        const url = await uploadToCloudinary(file);
        setUploadProgress(((index + 1) / selectedFiles.length) * 100);
        return url;
      });

      const mediaUrls = await Promise.all(uploadPromises);

      // Get user data for post
      const userDoc = await import('firebase/firestore').then(({ doc, getDoc }) => 
        getDoc(doc(db, 'users', user.uid))
      );
      const userData = userDoc.data();

      // Create post in Firestore
      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorUsername: userData?.username || user.email?.split('@')[0] || 'User',
        authorProfilePic: userData?.profilePicUrl || '',
        caption,
        mediaUrl: mediaUrls[0], // Primary media
        media: mediaUrls, // All media
        mediaType: selectedFiles[0].type.startsWith('video') ? 'video' : 'image',
        postType,
        likes: [],
        commentsCount: 0,
        timestamp: serverTimestamp()
      });

      toast.success('Posted successfully!');
      onOpenChange(false);
      
      // Reset form
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Create New Post</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Post Type Selection */}
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

          {/* File Input */}
          <div>
            <Label htmlFor="file-upload" className="cursor-pointer">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-accent transition">
                <AiOutlineCamera size={48} className="mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to select {postType === 'reel' ? 'video' : 'photos or videos'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Max 10 files, 100MB each
                </p>
              </div>
            </Label>
            <input
              id="file-upload"
              type="file"
              accept={postType === 'reel' ? 'video/*' : 'image/*,video/*'}
              multiple={postType !== 'reel'}
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="relative aspect-square">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                    aria-label={`Remove file ${index + 1}`}
                  >
                    <AiOutlineClose size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Caption */}
          <div>
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              className="mt-2 min-h-[100px]"
              maxLength={2200}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {caption.length}/2200 characters
            </p>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div>
              <Label>Uploading...</Label>
              <Progress value={uploadProgress} className="mt-2" />
            </div>
          )}

          {/* Actions */}
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
      </SheetContent>
    </Sheet>
  );
};

export default UploadSheet;

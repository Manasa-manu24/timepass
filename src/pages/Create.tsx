import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { processMediaFile } from '@/lib/mediaProcessor';
import { useAuth } from '@/contexts/AuthContext';
import TopBar from '@/components/TopBar';
import MobileBottomNav from '@/components/MobileBottomNav';
import DesktopSidebar from '@/components/DesktopSidebar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { AiOutlineCloudUpload } from 'react-icons/ai';

const Create = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !user) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);

    try {
      // Process media file for aspect ratio
      toast.info('Processing media...');
      const processedFile = await processMediaFile(file);
      
      // Upload to Cloudinary
      toast.info('Uploading...');
      const mediaUrl = await uploadToCloudinary(processedFile);

      // Get user data
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      // Create post in Firestore
      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorUsername: userData?.username || 'Anonymous',
        authorProfilePic: userData?.profilePicUrl || '',
        caption,
        mediaUrl,
        mediaType: file.type.startsWith('image/') ? 'image' : 'video',
        postType: 'post', // Regular post type
        likes: [],
        timestamp: serverTimestamp(),
        commentsCount: 0
      });

      toast.success('Post created successfully!');
      navigate('/');
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Create Post" />
      <DesktopSidebar />
      
      <main className="lg:ml-64 xl:ml-72 max-w-2xl mx-auto pt-14 lg:pt-8 pb-20 lg:pb-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Create New Post</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* File Upload */}
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                {preview ? (
                  <div className="space-y-4">
                    {file?.type.startsWith('image/') ? (
                      <img
                        src={preview}
                        alt="Preview"
                        className="max-h-96 mx-auto rounded-lg"
                      />
                    ) : (
                      <video
                        src={preview}
                        controls
                        className="max-h-96 mx-auto rounded-lg"
                        crossOrigin="anonymous"
                        preload="metadata"
                        onError={(e) => console.error('Video preview error:', e)}
                      />
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setFile(null);
                        setPreview('');
                      }}
                    >
                      Change File
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <AiOutlineCloudUpload size={48} className="mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Click to upload photo or video</p>
                  </label>
                )}
              </div>

              {/* Caption */}
              <div>
                <Textarea
                  placeholder="Write a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full"
                disabled={!file || uploading}
              >
                {uploading ? 'Posting...' : 'Share Post'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default Create;

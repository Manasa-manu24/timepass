import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import MobileBottomNav from '@/components/MobileBottomNav';
import DesktopSidebar from '@/components/DesktopSidebar';
import PostCard from '@/components/PostCard';
import PostCardSkeleton from '@/components/PostCardSkeleton';
import { Button } from '@/components/ui/button';
import { AiOutlineArrowLeft } from 'react-icons/ai';
import { toast } from 'sonner';

interface Post {
  id: string;
  authorId: string;
  authorUsername: string;
  authorProfilePic?: string;
  caption: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  likes: string[];
  timestamp: any;
  commentsCount: number;
}

const PostDetail = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedPosts, setSavedPosts] = useState<string[]>([]);

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) {
        navigate('/search');
        return;
      }

      try {
        // Fetch the post
        const postDoc = await getDoc(doc(db, 'posts', postId));
        if (!postDoc.exists()) {
          toast.error('Post not found');
          navigate('/search');
          return;
        }

        setPost({
          id: postDoc.id,
          ...postDoc.data()
        } as Post);

        // Fetch user's saved posts
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          setSavedPosts(userData?.savedPosts || []);
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        toast.error('Failed to load post');
        navigate('/search');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId, user, navigate]);

  const handleSaveToggle = async (postId: string, isSaved: boolean) => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      const currentSaved = userDoc.data()?.savedPosts || [];

      if (isSaved) {
        setSavedPosts([...currentSaved, postId]);
      } else {
        setSavedPosts(currentSaved.filter((id: string) => id !== postId));
      }
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* No TopBar - following Instagram pattern */}
      <DesktopSidebar />
      
      <main className="lg:ml-64 xl:ml-72 pb-20 lg:pb-0">
        {/* Back Button - Top Left (Mobile and Desktop) */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="hover:bg-accent"
            >
              <AiOutlineArrowLeft size={24} />
            </Button>
          </div>
        </div>

        {/* Post Content */}
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="p-4">
              <PostCardSkeleton />
            </div>
          ) : post ? (
            <div className="animate-in fade-in duration-300">
              <PostCard
                post={post}
                currentUserId={user?.uid}
                savedPosts={savedPosts}
                onSaveToggle={handleSaveToggle}
              />
            </div>
          ) : (
            <div className="text-center py-12 px-4">
              <p className="text-muted-foreground">Post not found</p>
              <Button
                onClick={() => navigate('/search')}
                className="mt-4"
              >
                Back to Explore
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation - Always visible */}
      <MobileBottomNav />
    </div>
  );
};

export default PostDetail;

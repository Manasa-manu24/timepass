import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import TopBar from '@/components/TopBar';
import MobileBottomNav from '@/components/MobileBottomNav';
import DesktopSidebar from '@/components/DesktopSidebar';
import PostCard from '@/components/PostCard';
import { BsBookmark } from 'react-icons/bs';

interface Post {
  id: string;
  authorId: string;
  authorUsername: string;
  authorProfilePic?: string;
  caption: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  likes: string[];
  timestamp: any; // Can be string, Date, or Firestore Timestamp
  commentsCount: number;
}

const Saved = () => {
  const { user } = useAuth();
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSavedPosts = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get user's saved post IDs
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        const savedIds = userData?.savedPosts || [];
        setSavedPostIds(savedIds);

        // Fetch all saved posts
        const postsPromises = savedIds.map((postId: string) => 
          getDoc(doc(db, 'posts', postId))
        );
        
        const postsDocs = await Promise.all(postsPromises);
        const postsData = postsDocs
          .filter(doc => doc.exists())
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Post[];
        
        // Filter out stories - they should only appear in Stories section
        const regularPosts = postsData.filter(post => (post as any).postType !== 'story');
        
        setSavedPosts(regularPosts);
      } catch (error) {
        console.error('Error fetching saved posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedPosts();
  }, [user]);

  const handleLike = async (postId: string) => {
    if (!user) return;

    const postRef = doc(db, 'posts', postId);
    const post = savedPosts.find(p => p.id === postId);
    
    if (!post) return;

    try {
      if (post.likes.includes(user.uid)) {
        await updateDoc(postRef, {
          likes: arrayRemove(user.uid)
        });
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(user.uid)
        });
      }
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  const handleSaveToggle = (postId: string, isSaved: boolean) => {
    if (!isSaved) {
      // Remove from saved posts
      setSavedPosts(savedPosts.filter(post => post.id !== postId));
      setSavedPostIds(savedPostIds.filter(id => id !== postId));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Saved" />
      <DesktopSidebar />
      
      <main className="lg:ml-64 xl:ml-72 max-w-2xl mx-auto pt-14 lg:pt-0 pb-20 lg:pb-8 px-4">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading saved posts...</p>
          </div>
        ) : savedPosts.length === 0 ? (
          <div className="text-center py-12">
            <BsBookmark size={64} className="mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Saved Posts</h2>
            <p className="text-muted-foreground">
              Save posts to view them later
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              No saved posts yet
            </p>
          </div>
        ) : (
          savedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user?.uid}
              onLike={handleLike}
              savedPosts={savedPostIds}
              onSaveToggle={handleSaveToggle}
            />
          ))
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default Saved;

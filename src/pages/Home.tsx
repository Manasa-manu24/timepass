import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import TopBar from '@/components/TopBar';
import MobileBottomNav from '@/components/MobileBottomNav';
import DesktopSidebar from '@/components/DesktopSidebar';
import Stories from '@/components/Stories';
import PostCard from '@/components/PostCard';

interface Post {
  id: string;
  authorId: string;
  authorUsername: string;
  authorProfilePic?: string;
  caption: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  postType?: 'post' | 'reel' | 'story';
  likes: string[];
  timestamp: any; // Can be string, Date, or Firestore Timestamp
  commentsCount: number;
}

const Home = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedPosts, setSavedPosts] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;

    // Fetch user's saved posts
    const fetchSavedPosts = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        setSavedPosts(userData?.savedPosts || []);
      } catch (error) {
        console.error('Error fetching saved posts:', error);
      }
    };

    fetchSavedPosts();
  }, [user]);

  useEffect(() => {
    // Listen to posts in real-time
    // Query without orderBy to avoid index requirement issues
    const postsQuery = query(
      collection(db, 'posts')
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      
      // Filter out stories - they should only appear in Stories section
      const regularPosts = postsData.filter(post => post.postType !== 'story');
      
      // Sort posts client-side by timestamp
      const sortedPosts = regularPosts.sort((a, b) => {
        // Helper to convert timestamp to milliseconds
        const getTime = (timestamp: any): number => {
          if (!timestamp) return 0;
          
          // If it's a Firestore Timestamp object
          if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
            return timestamp.toDate().getTime();
          }
          
          // If it's already a Date object
          if (timestamp instanceof Date) {
            return timestamp.getTime();
          }
          
          // If it's a string or number, try to convert
          const date = new Date(timestamp);
          return isNaN(date.getTime()) ? 0 : date.getTime();
        };
        
        const timeA = getTime(a.timestamp);
        const timeB = getTime(b.timestamp);
        return timeB - timeA; // Descending order (newest first)
      });
      
      setPosts(sortedPosts);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching posts:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLike = async (postId: string) => {
    if (!user) return;

    const postRef = doc(db, 'posts', postId);
    const post = posts.find(p => p.id === postId);
    
    if (!post) return;

    try {
      if (post.likes.includes(user.uid)) {
        // Unlike
        await updateDoc(postRef, {
          likes: arrayRemove(user.uid)
        });
      } else {
        // Like
        await updateDoc(postRef, {
          likes: arrayUnion(user.uid)
        });

        // Create notification for the post author (if not liking own post)
        if (user.uid !== post.authorId) {
          try {
            // Get current user's data for the notification
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const userData = userDoc.data();

            await addDoc(collection(db, 'notifications'), {
              userId: post.authorId,
              type: 'like',
              senderId: user.uid,
              senderUsername: userData?.username || user.email?.split('@')[0] || 'Someone',
              senderProfilePic: userData?.profilePicUrl || '',
              postId: postId,
              postType: post.postType || 'post',
              timestamp: serverTimestamp(),
              read: false
            });
          } catch (notifError) {
            console.error('Error creating notification:', notifError);
          }
        }
      }
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  const handleSaveToggle = (postId: string, isSaved: boolean) => {
    if (isSaved) {
      setSavedPosts([...savedPosts, postId]);
    } else {
      setSavedPosts(savedPosts.filter(id => id !== postId));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <DesktopSidebar />
      
      <main className="lg:ml-64 xl:ml-72 max-w-2xl mx-auto pt-14 lg:pt-0 pb-20 lg:pb-8">
        {/* Stories Section */}
        <Stories />
        
        {/* Posts Section */}
        <div className="px-4">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user?.uid}
                onLike={handleLike}
                savedPosts={savedPosts}
                onSaveToggle={handleSaveToggle}
              />
            ))
          )}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default Home;

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import TopBar from '@/components/TopBar';
import MobileBottomNav from '@/components/MobileBottomNav';
import DesktopSidebar from '@/components/DesktopSidebar';
import PostCard from '@/components/PostCard';

interface Post {
  id: string;
  authorId: string;
  authorUsername: string;
  authorProfilePic?: string;
  caption: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  likes: string[];
  timestamp: string;
  commentsCount: number;
}

const Home = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to posts in real-time
    const postsQuery = query(
      collection(db, 'posts'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      
      setPosts(postsData);
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
      }
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <DesktopSidebar />
      
      <main className="lg:ml-64 xl:ml-72 max-w-2xl mx-auto pt-14 lg:pt-0 pb-20 lg:pb-8 px-4">
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
            />
          ))
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default Home;

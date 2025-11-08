import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import MobileBottomNav from '@/components/MobileBottomNav';
import DesktopSidebar from '@/components/DesktopSidebar';
import ReelPlayer from '@/components/ReelPlayer';
import { Button } from '@/components/ui/button';
import { AiOutlineArrowLeft } from 'react-icons/ai';

interface Reel {
  id: string;
  authorId: string;
  authorUsername: string;
  authorProfilePic?: string;
  caption: string;
  mediaUrl: string;
  likes: string[];
  timestamp: any;
  commentsCount: number;
  mediaType?: 'image' | 'video';
}

const ReelsView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { postId } = useParams();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchReels = async () => {
      try {
        // Get all posts from Search (passed via location state) or fetch from Firestore
        const postsFromState = location.state?.posts || [];
        const startPostId = location.state?.startPostId || postId;

        let reelsData: Reel[] = [];

        if (postsFromState.length > 0) {
          // Use posts from state (from Search page)
          reelsData = postsFromState;
        } else if (startPostId) {
          // If only postId provided, fetch that specific post and surrounding posts
          const postDoc = await getDoc(doc(db, 'posts', startPostId));
          if (postDoc.exists()) {
            reelsData.push({
              id: postDoc.id,
              ...postDoc.data()
            } as Reel);
          }

          // Fetch more posts for context
          const postsQuery = query(collection(db, 'posts'));
          const snapshot = await getDocs(postsQuery);
          const allPosts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Reel[];

          // Filter out stories
          reelsData = allPosts.filter(post => (post as any).postType !== 'story');
        } else {
          // Fetch all posts
          const postsQuery = query(collection(db, 'posts'));
          const snapshot = await getDocs(postsQuery);
          reelsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Reel[];

          // Filter out stories
          reelsData = reelsData.filter(post => (post as any).postType !== 'story');
        }

        // Sort by timestamp (newest first)
        const sortedReels = reelsData.sort((a, b) => {
          const getTime = (timestamp: any): number => {
            if (!timestamp) return 0;
            if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
              return timestamp.toDate().getTime();
            }
            if (timestamp instanceof Date) {
              return timestamp.getTime();
            }
            const date = new Date(timestamp);
            return isNaN(date.getTime()) ? 0 : date.getTime();
          };

          return getTime(b.timestamp) - getTime(a.timestamp);
        });

        setReels(sortedReels);

        // Set initial index to the clicked post
        if (startPostId) {
          const index = sortedReels.findIndex(reel => reel.id === startPostId);
          if (index !== -1) {
            setCurrentIndex(index);
            // Scroll to the post after a brief delay
            setTimeout(() => {
              const container = containerRef.current;
              if (container) {
                const reelElements = container.querySelectorAll('.reel-item');
                if (reelElements[index]) {
                  reelElements[index].scrollIntoView({ behavior: 'auto' });
                }
              }
            }, 100);
          }
        }
      } catch (error) {
        console.error('Error fetching reels:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReels();
  }, [location.state, postId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0');
            setCurrentIndex(index);
          }
        });
      },
      { threshold: 0.5 }
    );

    const reelElements = container.querySelectorAll('.reel-item');
    reelElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [reels]);

  return (
    <div className="min-h-screen bg-black">
      <DesktopSidebar />
      
      {/* Desktop Back Button */}
      <div className="hidden lg:block fixed top-6 right-6 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border border-white/20"
        >
          <AiOutlineArrowLeft size={24} />
        </Button>
      </div>
      
      {/* Mobile Back Button */}
      <div className="lg:hidden fixed top-4 right-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border border-white/20"
        >
          <AiOutlineArrowLeft size={24} />
        </Button>
      </div>

      {/* Scroll indicator */}
      {!loading && reels.length > 0 && (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1">
          {reels.map((_, index) => (
            <div
              key={index}
              className={`w-1 h-8 rounded-full transition-all ${
                currentIndex === index ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      )}
      
      <main className="lg:ml-64 xl:ml-72 relative bg-black">
        <div 
          ref={containerRef}
          className="h-[100vh] overflow-y-scroll snap-y snap-mandatory scroll-smooth pt-14 lg:pt-0 pb-16 lg:pb-0 
                     scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent hover:scrollbar-thumb-white/50"
          style={{ 
            scrollSnapType: 'y mandatory',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255, 255, 255, 0.3) transparent'
          }}
        >
          {loading ? (
            <div className="h-[calc(100vh-3.5rem)] lg:h-screen flex items-center justify-center bg-black">
              <p className="text-white">Loading...</p>
            </div>
          ) : reels.length === 0 ? (
            <div className="h-[calc(100vh-3.5rem)] lg:h-screen flex items-center justify-center bg-black">
              <div className="text-center">
                <p className="text-white text-lg mb-4">No content available</p>
                <Button onClick={() => navigate('/search')}>Back to Search</Button>
              </div>
            </div>
          ) : (
            reels.map((reel, index) => (
              <div
                key={reel.id}
                data-index={index}
                className="reel-item h-[calc(100vh-3.5rem)] lg:h-screen snap-start snap-always flex items-center justify-center"
              >
                <ReelPlayer 
                  reel={reel} 
                  isActive={currentIndex === index}
                />
              </div>
            ))
          )}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default ReelsView;

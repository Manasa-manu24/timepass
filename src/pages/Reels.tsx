import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
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
  timestamp: any; // Can be string, Date, or Firestore Timestamp
  commentsCount: number;
  postType?: 'post' | 'reel' | 'story';
}

const Reels = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [allReels, setAllReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'reels' | 'friends'>('reels');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Query for ALL video posts (reels from the entire website)
    const reelsQuery = query(
      collection(db, 'posts'),
      where('mediaType', '==', 'video')
    );

    const unsubscribe = onSnapshot(reelsQuery, (snapshot) => {
      const reelsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Reel[];
      
      // Sort all video posts by timestamp (newest first)
      const sortedReels = reelsData.sort((a, b) => {
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
      
      setAllReels(sortedReels);
      setReels(sortedReels);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching reels:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter reels based on active tab
  useEffect(() => {
    const filterReels = async () => {
      if (activeTab === 'reels') {
        setReels(allReels);
      } else if (activeTab === 'friends' && user) {
        setLoading(true);
        try {
          // Get current user's following list
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          const following = userData?.following || [];

          if (following.length === 0) {
            setReels([]);
            setLoading(false);
            return;
          }

          // Filter reels to only show those liked by friends
          const friendLikedReels = allReels.filter(reel => 
            reel.likes.some(likeUserId => following.includes(likeUserId))
          );

          setReels(friendLikedReels);
        } catch (error) {
          console.error('Error filtering friend reels:', error);
          setReels([]);
        }
        setLoading(false);
      }
    };

    filterReels();
  }, [activeTab, allReels, user]);

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
      {/* TopBar hidden on Reels page for immersive full-screen experience */}
      <DesktopSidebar />
      
      {/* Header Tabs - Fixed at top center */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex gap-1 bg-white/10 backdrop-blur-md rounded-full p-1 border border-white/20">
        <button
          onClick={() => setActiveTab('reels')}
          className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
            activeTab === 'reels'
              ? 'bg-white text-black'
              : 'text-white hover:bg-white/10'
          }`}
        >
          Reels
        </button>
        <button
          onClick={() => setActiveTab('friends')}
          className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
            activeTab === 'friends'
              ? 'bg-white text-black'
              : 'text-white hover:bg-white/10'
          }`}
        >
          Friends
        </button>
      </div>
      
      {/* Desktop Back Button - Fixed position at top-right */}
      <div className="hidden lg:block fixed top-6 right-6 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          aria-label="Back to home"
          className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border border-white/20"
        >
          <AiOutlineArrowLeft size={24} />
        </Button>
      </div>
      
      {/* Mobile Back Button - Fixed position at top-right corner */}
      <div className="lg:hidden fixed top-4 right-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          aria-label="Back to home"
          className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border border-white/20"
        >
          <AiOutlineArrowLeft size={24} />
        </Button>
      </div>

      {/* Scroll indicator - Shows current reel position */}
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
              <p className="text-white">Loading reels...</p>
            </div>
          ) : reels.length === 0 ? (
            <div className="h-[calc(100vh-3.5rem)] lg:h-screen flex items-center justify-center bg-black">
              <div className="text-center">
                <p className="text-white text-lg mb-4">
                  {activeTab === 'friends' 
                    ? 'No reels liked by your friends yet' 
                    : 'No reels yet'}
                </p>
                {activeTab === 'reels' && (
                  <Button onClick={() => navigate('/create')}>Create your first reel</Button>
                )}
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

export default Reels;

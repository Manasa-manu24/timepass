import { useEffect, useState, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import TopBar from '@/components/TopBar';
import MobileBottomNav from '@/components/MobileBottomNav';
import DesktopSidebar from '@/components/DesktopSidebar';
import ReelPlayer from '@/components/ReelPlayer';

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
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Query for reels (posts with video mediaType)
    const reelsQuery = query(
      collection(db, 'posts'),
      where('mediaType', '==', 'video')
    );

    const unsubscribe = onSnapshot(reelsQuery, (snapshot) => {
      const reelsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Reel[];
      
      // Filter for reels or videos posted as reels and sort client-side
      const filteredReels = reelsData
        .filter(reel => !reel.postType || reel.postType === 'reel')
        .sort((a, b) => {
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
      
      setReels(filteredReels);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching reels:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
    <div className="min-h-screen bg-background">
      <TopBar title="Reels" />
      <DesktopSidebar />
      
      <main className="lg:ml-64 xl:ml-72">
        <div 
          ref={containerRef}
          className="h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth pt-14 lg:pt-0"
          style={{ scrollSnapType: 'y mandatory' }}
        >
          {loading ? (
            <div className="h-screen flex items-center justify-center">
              <p className="text-muted-foreground">Loading reels...</p>
            </div>
          ) : reels.length === 0 ? (
            <div className="h-screen flex items-center justify-center">
              <p className="text-muted-foreground">No reels yet. Create one!</p>
            </div>
          ) : (
            reels.map((reel, index) => (
              <div
                key={reel.id}
                data-index={index}
                className="reel-item h-screen snap-start"
                style={{ scrollSnapAlign: 'start' }}
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

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import TopBar from '@/components/TopBar';
import MobileBottomNav from '@/components/MobileBottomNav';
import DesktopSidebar from '@/components/DesktopSidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search as SearchIcon } from 'lucide-react';
import { AiOutlineArrowLeft } from 'react-icons/ai';
import { BsCameraReels } from 'react-icons/bs';

interface Post {
  id: string;
  authorId: string;
  authorUsername: string;
  authorProfilePic?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption: string;
  likes: string[];
  commentsCount: number;
  timestamp: any;
  postType?: 'post' | 'reel' | 'story';
}

const Search = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all posts and reels on mount (exclude stories)
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const postsQuery = query(
      collection(db, 'posts'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const postsData = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Post[];
      
      // Filter out stories - only show posts and reels
      const filteredData = postsData.filter(post => post.postType !== 'story');
      
      setAllPosts(filteredData);
      setFilteredPosts(filteredData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Filter posts when search query changes
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setFilteredPosts(allPosts);
      return;
    }

    const searchData = () => {
      // Filter posts by username or caption
      const filtered = allPosts.filter(post => 
        post.authorUsername?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.caption?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      setFilteredPosts(filtered);
    };

    const debounce = setTimeout(searchData, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, allPosts]);

  const handlePostClick = (post: Post) => {
    navigate(`/post/${post.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar showBackButton />
      <DesktopSidebar />
      
      <main className="lg:ml-64 xl:ml-72 pt-14 lg:pt-0 pb-20 lg:pb-0">
        <div className="max-w-5xl mx-auto p-4">
          {/* Desktop Back Button */}
          <div className="hidden lg:flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              aria-label="Back to home"
            >
              <AiOutlineArrowLeft size={24} />
            </Button>
            <h1 className="text-xl font-semibold">Explore</h1>
          </div>

          {/* Search Input */}
          <div className="relative mb-6">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              type="text"
              placeholder="Search by username or caption..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary"
            />
          </div>

          {/* Results Count */}
          {!loading && (
            <div className="mb-4 text-sm text-muted-foreground">
              {searchQuery ? (
                <p>Found {filteredPosts.length} result{filteredPosts.length !== 1 ? 's' : ''}</p>
              ) : (
                <p>{filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''} and reel{filteredPosts.length !== 1 ? 's' : ''}</p>
              )}
            </div>
          )}

          {/* Posts Grid */}
          {loading ? (
            <div className="grid grid-cols-3 gap-1 md:gap-4">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="aspect-square">
                  <Skeleton className="w-full h-full" />
                </div>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <SearchIcon size={64} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No posts found matching your search' : 'No posts available yet'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 md:gap-4 animate-in fade-in duration-300">
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className="aspect-square bg-secondary cursor-pointer group relative overflow-hidden rounded-sm"
                  onClick={() => handlePostClick(post)}
                >
                  {post.mediaType === 'video' || post.postType === 'reel' ? (
                    <>
                      <video
                        src={post.mediaUrl}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                      {/* Video/Reel indicator overlay */}
                      <div className="absolute top-2 right-2 z-10">
                        <BsCameraReels className="text-white drop-shadow-lg" size={20} />
                      </div>
                    </>
                  ) : (
                    <img
                      src={post.mediaUrl}
                      alt="Post"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                    <div className="flex items-center gap-2">
                      <span>❤️</span>
                      <span className="font-semibold">{post.likes.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>💬</span>
                      <span className="font-semibold">{post.commentsCount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default Search;

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import TopBar from '@/components/TopBar';
import MobileBottomNav from '@/components/MobileBottomNav';
import DesktopSidebar from '@/components/DesktopSidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search as SearchIcon, User as UserIcon } from 'lucide-react';
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

interface User {
  uid: string;
  username: string;
  displayName: string;
  profilePicUrl?: string;
  followers?: string[];
  following?: string[];
  bio?: string;
}

const Search = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);

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

  // Fetch users when searching
  useEffect(() => {
    const fetchUsers = async () => {
      if (!user) return;
      
      setUsersLoading(true);
      try {
        const usersQuery = query(collection(db, 'users'));
        const snapshot = await getDocs(usersQuery);
        const usersData = snapshot.docs
          .map(doc => ({
            uid: doc.id,
            ...doc.data()
          }))
          .filter(u => u.uid !== user.uid) as User[];
        
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setUsersLoading(false);
      }
    };

    fetchUsers();
  }, [user]);

  // Filter posts and users when search query changes
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setFilteredPosts(allPosts);
      setFilteredUsers([]);
      return;
    }

    const searchData = () => {
      const query = searchQuery.toLowerCase();
      
      // Filter posts by username or caption
      const filteredPostsData = allPosts.filter(post => 
        post.authorUsername?.toLowerCase().includes(query) ||
        post.caption?.toLowerCase().includes(query)
      );
      
      // Filter users by username or displayName
      const filteredUsersData = users.filter(u =>
        u.username?.toLowerCase().includes(query) ||
        u.displayName?.toLowerCase().includes(query)
      );
      
      setFilteredPosts(filteredPostsData);
      setFilteredUsers(filteredUsersData);
    };

    const debounce = setTimeout(searchData, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, allPosts, users]);

  const handlePostClick = (post: Post) => {
    // Navigate to reels view for full-screen display
    navigate(`/reels-view/${post.id}`, {
      state: {
        posts: filteredPosts,
        startPostId: post.id
      }
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar 
        showBackButton 
        isSearchPage={true}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <DesktopSidebar />
      
      <main className="lg:ml-64 xl:ml-72 pt-14 lg:pt-0 pb-20 lg:pb-0">
        <div className="max-w-5xl mx-auto p-4">
          {/* Desktop Back Button and Search */}
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

          {/* Desktop Search Input */}
          <div className="hidden lg:block relative mb-6">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              type="text"
              placeholder="Search by username or caption..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary"
            />
          </div>

          {/* User Results (when searching) */}
          {searchQuery && filteredUsers.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <UserIcon size={20} />
                Accounts
              </h2>
              <div className="space-y-2 bg-card rounded-lg border border-border overflow-hidden">
                {filteredUsers.map((userItem) => (
                  <Link
                    key={userItem.uid}
                    to={`/profile/${userItem.uid}`}
                    className="flex items-center gap-3 p-4 hover:bg-accent transition-all duration-200 hover:scale-[1.01] border-b border-border last:border-b-0"
                  >
                    <Avatar className="w-14 h-14 border-2 border-primary/20">
                      <AvatarImage src={userItem.profilePicUrl} alt={userItem.username} />
                      <AvatarFallback className="text-lg font-semibold">
                        {userItem.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{userItem.username}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {userItem.displayName}
                      </p>
                      {userItem.followers && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {userItem.followers.length} follower{userItem.followers.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Posts Section Header (when searching and has posts) */}
          {searchQuery && filteredPosts.length > 0 && (
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <SearchIcon size={20} />
              Posts & Reels
            </h2>
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
          ) : filteredPosts.length === 0 && filteredUsers.length === 0 && searchQuery ? (
            <div className="text-center py-12">
              <SearchIcon size={64} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No users or posts found matching your search
              </p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <SearchIcon size={64} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No posts available yet
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

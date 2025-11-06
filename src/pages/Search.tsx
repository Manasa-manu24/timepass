import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import TopBar from '@/components/TopBar';
import MobileBottomNav from '@/components/MobileBottomNav';
import DesktopSidebar from '@/components/DesktopSidebar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';

interface User {
  uid: string;
  username: string;
  displayName: string;
  profilePicUrl: string;
  followers: string[];
}

interface Post {
  id: string;
  mediaUrl: string;
  likes: string[];
  commentsCount: number;
}

const Search = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setUsers([]);
      setPosts([]);
      return;
    }

    const searchData = async () => {
      setLoading(true);
      try {
        // Search users
        const usersQuery = query(
          collection(db, 'users'),
          orderBy('username'),
          limit(20)
        );
        const usersSnapshot = await getDocs(usersQuery);
        const usersData = usersSnapshot.docs
          .map(doc => ({ uid: doc.id, ...doc.data() } as User))
          .filter(user => 
            user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.displayName.toLowerCase().includes(searchQuery.toLowerCase())
          );
        
        setUsers(usersData);

        // Search posts (you could add hashtag search here)
        const postsQuery = query(
          collection(db, 'posts'),
          orderBy('timestamp', 'desc'),
          limit(30)
        );
        const postsSnapshot = await getDocs(postsQuery);
        const postsData = postsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Post[];
        
        setPosts(postsData);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchData, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Search" />
      <DesktopSidebar />
      
      <main className="lg:ml-64 xl:ml-72 pt-14 lg:pt-0 pb-20 lg:pb-0">
        <div className="max-w-4xl mx-auto p-4">
          {/* Search Input */}
          <div className="relative mb-6">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              type="text"
              placeholder="Search users and hashtags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary"
              autoFocus
            />
          </div>

          {searchQuery.trim().length > 0 && (
            <Tabs defaultValue="users" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="users" className="flex-1">Users</TabsTrigger>
                <TabsTrigger value="posts" className="flex-1">Posts</TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="mt-6">
                {loading ? (
                  <p className="text-center text-muted-foreground py-8">Searching...</p>
                ) : users.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No users found</p>
                ) : (
                  <div className="space-y-4">
                    {users.map((user) => (
                      <Link
                        key={user.uid}
                        to={`/profile/${user.uid}`}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition"
                      >
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={user.profilePicUrl} />
                          <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{user.username}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {user.displayName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user.followers.length} followers
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="posts" className="mt-6">
                {loading ? (
                  <p className="text-center text-muted-foreground py-8">Searching...</p>
                ) : posts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No posts found</p>
                ) : (
                  <div className="grid grid-cols-3 gap-1 md:gap-2">
                    {posts.map((post) => (
                      <div
                        key={post.id}
                        className="aspect-square bg-secondary cursor-pointer group relative overflow-hidden"
                      >
                        <img
                          src={post.mediaUrl}
                          alt="Post"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
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
              </TabsContent>
            </Tabs>
          )}

          {searchQuery.trim().length === 0 && (
            <div className="text-center py-12">
              <SearchIcon size={64} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Search for users and posts</p>
            </div>
          )}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default Search;

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import TopBar from '@/components/TopBar';
import MobileBottomNav from '@/components/MobileBottomNav';
import DesktopSidebar from '@/components/DesktopSidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { BsGrid3X3 } from 'react-icons/bs';

interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  profilePicUrl: string;
  bio: string;
  followers: string[];
  following: string[];
}

interface Post {
  id: string;
  mediaUrl: string;
  likes: string[];
  commentsCount: number;
}

const Profile = () => {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;

      try {
        // Fetch user profile
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        }

        // Fetch user posts
        const postsQuery = query(
          collection(db, 'posts'),
          where('authorId', '==', userId)
        );
        const postsSnapshot = await getDocs(postsQuery);
        const postsData = postsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Post[];
        
        setPosts(postsData);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title="Profile" />
        <DesktopSidebar />
        <main className="lg:ml-64 xl:ml-72 pt-14 lg:pt-0">
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title="Profile" />
        <DesktopSidebar />
        <main className="lg:ml-64 xl:ml-72 pt-14 lg:pt-0">
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Profile not found</p>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  const isOwnProfile = currentUser?.uid === userId;

  return (
    <div className="min-h-screen bg-background">
      <TopBar title={profile.username} />
      <DesktopSidebar />
      
      <main className="lg:ml-64 xl:ml-72 max-w-4xl mx-auto pt-14 lg:pt-8 pb-20 lg:pb-8 px-4">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row gap-8 mb-12">
          <Avatar className="w-32 h-32 md:w-40 md:h-40">
            <AvatarImage src={profile.profilePicUrl} />
            <AvatarFallback className="text-4xl">
              {profile.username[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <h1 className="text-2xl font-light">{profile.username}</h1>
              {isOwnProfile ? (
                <Button variant="secondary">Edit Profile</Button>
              ) : (
                <Button>Follow</Button>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-8 mb-4">
              <div>
                <span className="font-semibold">{posts.length}</span>{' '}
                <span className="text-muted-foreground">posts</span>
              </div>
              <div>
                <span className="font-semibold">{profile.followers.length}</span>{' '}
                <span className="text-muted-foreground">followers</span>
              </div>
              <div>
                <span className="font-semibold">{profile.following.length}</span>{' '}
                <span className="text-muted-foreground">following</span>
              </div>
            </div>

            {/* Bio */}
            <div>
              <p className="font-semibold">{profile.displayName}</p>
              <p className="text-sm">{profile.bio}</p>
            </div>
          </div>
        </div>

        {/* Posts Grid */}
        <div className="border-t border-border pt-4">
          <div className="flex justify-center mb-4">
            <button className="flex items-center gap-2 px-4 py-2 border-t-2 border-foreground">
              <BsGrid3X3 />
              <span className="text-xs font-semibold uppercase">Posts</span>
            </button>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No posts yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 md:gap-4">
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
                      <span>{post.likes.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>💬</span>
                      <span>{post.commentsCount}</span>
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

export default Profile;

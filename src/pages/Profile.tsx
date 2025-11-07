import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import TopBar from '@/components/TopBar';
import MobileBottomNav from '@/components/MobileBottomNav';
import DesktopSidebar from '@/components/DesktopSidebar';
import EditProfileDialog from '@/components/EditProfileDialog';
import PostViewerModal from '@/components/PostViewerModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BsGrid3X3, BsCameraReels } from 'react-icons/bs';
import { AiOutlineSend, AiOutlineShareAlt, AiOutlineSetting } from 'react-icons/ai';
import { toast } from 'sonner';

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
  authorId: string;
  authorUsername: string;
  authorProfilePic?: string;
  caption?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  likes: string[];
  commentsCount: number;
  timestamp: any;
}

const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

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
      
      // Filter out stories - they should only appear in Stories section
      const regularPosts = postsData.filter(post => (post as any).postType !== 'story');
      
      setPosts(regularPosts);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  useEffect(() => {
    // Check if current user is following this profile
    const checkFollowStatus = async () => {
      if (!currentUser || !userId || currentUser.uid === userId) return;
      
      try {
        const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (currentUserDoc.exists()) {
          const following = currentUserDoc.data()?.following || [];
          setIsFollowing(following.includes(userId));
        }
      } catch (error) {
        console.error('Error checking follow status:', error);
      }
    };
    
    checkFollowStatus();
  }, [currentUser, userId]);

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    setIsViewerOpen(true);
  };

  const handlePostDeleted = () => {
    // Refresh the profile to update posts
    fetchProfile();
  };

  const handleFollow = async () => {
    if (!currentUser || !userId) {
      toast.error('Please sign in to follow users');
      return;
    }

    setFollowLoading(true);

    try {
      const currentUserRef = doc(db, 'users', currentUser.uid);
      const targetUserRef = doc(db, 'users', userId);

      if (isFollowing) {
        // Unfollow
        await updateDoc(currentUserRef, {
          following: arrayRemove(userId)
        });
        await updateDoc(targetUserRef, {
          followers: arrayRemove(currentUser.uid)
        });
        setIsFollowing(false);
        toast.success('Unfollowed successfully');
      } else {
        // Follow
        await updateDoc(currentUserRef, {
          following: arrayUnion(userId)
        });
        await updateDoc(targetUserRef, {
          followers: arrayUnion(currentUser.uid)
        });
        setIsFollowing(true);
        toast.success('Followed successfully');
      }

      // Refresh profile to update follower counts
      fetchProfile();
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
      toast.error('Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = () => {
    if (!userId || !profile) return;
    // Navigate to messages page - the Messages component will handle opening the chat
    navigate('/messages', { 
      state: { 
        selectedUser: {
          uid: userId,
          username: profile.username,
          email: '', // Not needed for chat
          profilePicUrl: profile.profilePicUrl
        }
      }
    });
  };

  const handleShareProfile = async () => {
    const profileUrl = `${window.location.origin}/profile/${userId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.username}'s profile`,
          text: `Check out ${profile?.username} on Timepass`,
          url: profileUrl,
        });
        toast.success('Profile shared successfully!');
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copying link
      try {
        await navigator.clipboard.writeText(profileUrl);
        toast.success('Profile link copied to clipboard!');
      } catch (error) {
        console.error('Error copying link:', error);
        toast.error('Failed to copy link');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
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
        <TopBar />
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
      <TopBar />
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
              {!isOwnProfile && (
                <Button
                  variant={isFollowing ? "outline" : "default"}
                  onClick={handleFollow}
                  disabled={followLoading}
                >
                  {followLoading ? 'Loading...' : isFollowing ? 'Unfollow' : 'Follow'}
                </Button>
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

        {/* Action Buttons Section - Before Posts */}
        <div className="mb-8 pb-8 border-b border-border">
          {isOwnProfile ? (
            // Own Profile: Edit Profile, Settings (mobile), and Share Profile
            <div className="flex gap-3 justify-center md:justify-start">
              <EditProfileDialog
                userId={userId!}
                currentUsername={profile.username}
                currentDisplayName={profile.displayName}
                currentBio={profile.bio}
                currentProfilePic={profile.profilePicUrl}
                onProfileUpdate={fetchProfile}
              />
              <Button
                variant="outline"
                onClick={() => navigate('/settings')}
                className="flex items-center gap-2 lg:hidden"
              >
                <AiOutlineSetting size={18} />
                Settings
              </Button>
              <Button
                variant="outline"
                onClick={handleShareProfile}
                className="flex items-center gap-2 flex-1 md:flex-initial"
              >
                <AiOutlineShareAlt size={18} />
                Share Profile
              </Button>
            </div>
          ) : (
            // Other User's Profile: Message Button and Following Status
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <Button
                  onClick={handleMessage}
                  className="flex items-center gap-2 flex-1"
                >
                  <AiOutlineSend size={18} />
                  Message
                </Button>
                <Button
                  variant="outline"
                  onClick={handleShareProfile}
                  className="flex items-center gap-2"
                >
                  <AiOutlineShareAlt size={18} />
                </Button>
              </div>
              {isFollowing && (
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Following
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    You are following this user
                  </span>
                </div>
              )}
            </div>
          )}
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
                  onClick={() => handlePostClick(post)}
                >
                  {post.mediaType === 'video' ? (
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

      <PostViewerModal
        post={selectedPost}
        isOpen={isViewerOpen}
        onClose={() => {
          setIsViewerOpen(false);
          setSelectedPost(null);
        }}
        currentUserId={currentUser?.uid}
        isOwnPost={isOwnProfile}
        onPostDeleted={handlePostDeleted}
      />
    </div>
  );
};

export default Profile;

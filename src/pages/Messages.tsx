import { useState, useEffect } from 'react';
import TopBar from '@/components/TopBar';
import MobileBottomNav from '@/components/MobileBottomNav';
import DesktopSidebar from '@/components/DesktopSidebar';
import ChatInterface from '@/components/ChatInterface';
import { AiOutlineSend, AiOutlineSearch } from 'react-icons/ai';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { collection, query, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface User {
  uid: string;
  username: string;
  email: string;
  profilePicUrl?: string;
  followers?: string[];
  following?: string[];
}

const Messages = () => {
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<string[]>([]);
  const [followingInProgress, setFollowingInProgress] = useState<string[]>([]);
  const [selectedChat, setSelectedChat] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchCurrentUserFollowing();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = users.filter(user =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers([]);
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersQuery = query(collection(db, 'users'));
      const snapshot = await getDocs(usersQuery);
      const usersData = snapshot.docs
        .map(doc => ({
          uid: doc.id,
          ...doc.data()
        }))
        .filter(user => user.uid !== currentUser?.uid) as User[];
      
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUserFollowing = async () => {
    if (!currentUser) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const following = userDoc.data()?.following || [];
        setFollowingUsers(following);
      }
    } catch (error) {
      console.error('Error fetching following:', error);
    }
  };

  const handleFollow = async (userId: string) => {
    if (!currentUser) {
      toast.error('Please sign in to follow users');
      return;
    }

    setFollowingInProgress(prev => [...prev, userId]);

    try {
      const currentUserRef = doc(db, 'users', currentUser.uid);
      const targetUserRef = doc(db, 'users', userId);
      
      const isFollowing = followingUsers.includes(userId);

      if (isFollowing) {
        // Unfollow
        await updateDoc(currentUserRef, {
          following: arrayRemove(userId)
        });
        await updateDoc(targetUserRef, {
          followers: arrayRemove(currentUser.uid)
        });
        setFollowingUsers(prev => prev.filter(id => id !== userId));
        toast.success('Unfollowed successfully');
      } else {
        // Follow
        await updateDoc(currentUserRef, {
          following: arrayUnion(userId)
        });
        await updateDoc(targetUserRef, {
          followers: arrayUnion(currentUser.uid)
        });
        setFollowingUsers(prev => [...prev, userId]);
        toast.success('Followed successfully');
      }

      // Refresh users to update counts
      fetchUsers();
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
      toast.error('Failed to update follow status');
    } finally {
      setFollowingInProgress(prev => prev.filter(id => id !== userId));
    }
  };

  const handleStartChat = (user: User) => {
    setSelectedChat(user);
  };

  const handleBackToList = () => {
    setSelectedChat(null);
  };

  // If a chat is selected, show the chat interface
  if (selectedChat) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title={selectedChat.username} />
        <DesktopSidebar />
        
        <main className="lg:ml-64 xl:ml-72 pt-14 lg:pt-0 pb-0 lg:pb-0 h-screen">
          <ChatInterface
            recipientId={selectedChat.uid}
            recipientUsername={selectedChat.username}
            recipientProfilePic={selectedChat.profilePicUrl}
            onBack={handleBackToList}
          />
        </main>

        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Messages" />
      <DesktopSidebar />
      
      <main className="lg:ml-64 xl:ml-72 pt-14 lg:pt-0 pb-20 lg:pb-0">
        <div className="max-w-4xl mx-auto">
          {/* Search Bar */}
          <div className="sticky top-0 lg:top-0 bg-background border-b border-border p-4 z-10">
            <div className="relative">
              <AiOutlineSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                type="text"
                placeholder="Search for users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {searchQuery.trim() ? (
              // Search Results
              filteredUsers.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-4">
                    {filteredUsers.length} {filteredUsers.length === 1 ? 'result' : 'results'} found
                  </p>
                  {filteredUsers.map((user) => {
                    const isFollowing = followingUsers.includes(user.uid);
                    const isLoading = followingInProgress.includes(user.uid);
                    const followerCount = user.followers?.length || 0;
                    
                    return (
                      <div
                        key={user.uid}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition"
                      >
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={user.profilePicUrl} />
                          <AvatarFallback>
                            {user.username[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{user.username}</p>
                          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStartChat(user)}
                            title="Send message"
                          >
                            <AiOutlineSend size={20} />
                          </Button>
                          <Button
                            variant={isFollowing ? "outline" : "default"}
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFollow(user.uid);
                            }}
                            disabled={isLoading}
                          >
                            {isLoading ? 'Loading...' : isFollowing ? 'Unfollow' : 'Follow'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <AiOutlineSearch size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No users found</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Try a different search term
                  </p>
                </div>
              )
            ) : (
              // Empty State
              <div className="text-center py-12">
                <AiOutlineSend size={64} className="mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">Your Messages</h2>
                <p className="text-muted-foreground mb-4">
                  Send private messages to friends
                </p>
                <p className="text-sm text-muted-foreground">
                  Search for users above to start a conversation
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default Messages;

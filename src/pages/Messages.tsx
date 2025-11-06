import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import TopBar from '@/components/TopBar';
import MobileBottomNav from '@/components/MobileBottomNav';
import DesktopSidebar from '@/components/DesktopSidebar';
import ChatInterface from '@/components/ChatInterface';
import { AiOutlineSend, AiOutlineSearch, AiOutlineArrowLeft } from 'react-icons/ai';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { collection, query, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface User {
  uid: string;
  username: string;
  email: string;
  profilePicUrl?: string;
  followers?: string[];
  following?: string[];
}

interface Chat {
  chatId: string;
  otherUser: User;
  lastMessage: string;
  lastMessageTime: any;
  lastMessageSender: string;
}

const Messages = () => {
  const { user: currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<string[]>([]);
  const [followingInProgress, setFollowingInProgress] = useState<string[]>([]);
  const [selectedChat, setSelectedChat] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchCurrentUserFollowing();
    fetchChats();
    
    // Check if navigated from profile with a selected user
    if (location.state?.selectedUser) {
      setSelectedChat(location.state.selectedUser);
    }
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

  const fetchChats = async () => {
    if (!currentUser) return;
    
    setChatsLoading(true);
    try {
      // Get all chats where current user is a participant
      const chatsQuery = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', currentUser.uid)
      );
      const chatsSnapshot = await getDocs(chatsQuery);
      
      const chatsData: Chat[] = [];
      
      for (const chatDoc of chatsSnapshot.docs) {
        const chatData = chatDoc.data();
        
        // Get the other user's ID
        const otherUserId = chatData.participants.find((id: string) => id !== currentUser.uid);
        
        if (otherUserId) {
          // Fetch the other user's data
          const userDoc = await getDoc(doc(db, 'users', otherUserId));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            chatsData.push({
              chatId: chatDoc.id,
              otherUser: {
                uid: otherUserId,
                username: userData.username || 'Unknown',
                email: userData.email || '',
                profilePicUrl: userData.profilePicUrl
              },
              lastMessage: chatData.lastMessage || '',
              lastMessageTime: chatData.lastMessageTime,
              lastMessageSender: chatData.lastMessageSender || ''
            });
          }
        }
      }
      
      // Sort by last message time (most recent first)
      chatsData.sort((a, b) => {
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        
        const aTime = a.lastMessageTime.toDate ? a.lastMessageTime.toDate() : new Date(a.lastMessageTime);
        const bTime = b.lastMessageTime.toDate ? b.lastMessageTime.toDate() : new Date(b.lastMessageTime);
        
        return bTime.getTime() - aTime.getTime();
      });
      
      setChats(chatsData);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setChatsLoading(false);
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
    // Refresh chats when returning from a conversation
    fetchChats();
  };

  // If a chat is selected, show the chat interface
  if (selectedChat) {
    return (
      <div className="min-h-screen bg-background flex flex-col h-screen overflow-hidden">
        {/* Minimal header with only back button for mobile */}
        <div className="lg:hidden flex-shrink-0 h-14 bg-card border-b border-border flex items-center px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackToList}
            aria-label="Back to messages"
          >
            <AiOutlineArrowLeft size={24} />
          </Button>
          <Link 
            to={`/profile/${selectedChat.uid}`}
            className="flex items-center gap-3 ml-3 hover:opacity-70 transition-opacity"
          >
            <Avatar className="w-10 h-10">
              <AvatarImage src={selectedChat.profilePicUrl} />
              <AvatarFallback>
                {selectedChat.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h2 className="font-semibold">{selectedChat.username}</h2>
          </Link>
        </div>
        
        <DesktopSidebar />
        
        {/* Chat interface fills remaining height */}
        <main className="lg:ml-64 xl:ml-72 flex-1 pt-0 lg:pt-0 flex flex-col overflow-hidden">
          <ChatInterface
            recipientId={selectedChat.uid}
            recipientUsername={selectedChat.username}
            recipientProfilePic={selectedChat.profilePicUrl}
            onBack={handleBackToList}
          />
        </main>

        {/* Hide bottom nav on mobile during chat session */}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar showBackButton />
      <DesktopSidebar />
      
      <main className="lg:ml-64 xl:ml-72 pt-14 lg:pt-0 pb-20 lg:pb-0">
        <div className="max-w-4xl mx-auto">
          {/* Desktop Back Button */}
          <div className="hidden lg:flex items-center gap-3 p-4 border-b border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              aria-label="Back to home"
            >
              <AiOutlineArrowLeft size={24} />
            </Button>
            <h1 className="text-xl font-semibold">Messages</h1>
          </div>

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
              // Conversations List or Empty State
              chatsLoading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Loading conversations...</p>
                </div>
              ) : chats.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-4">
                    Your Conversations
                  </p>
                  {chats.map((chat) => {
                    const getTimestampDate = (timestamp: any): Date => {
                      if (!timestamp) return new Date();
                      if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
                        return timestamp.toDate();
                      }
                      if (timestamp instanceof Date) return timestamp;
                      return new Date(timestamp);
                    };

                    const isOwnMessage = chat.lastMessageSender === currentUser?.uid;
                    const lastMessagePreview = chat.lastMessage.length > 50 
                      ? chat.lastMessage.substring(0, 50) + '...' 
                      : chat.lastMessage;

                    return (
                      <div
                        key={chat.chatId}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition cursor-pointer"
                        onClick={() => handleStartChat(chat.otherUser)}
                      >
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={chat.otherUser.profilePicUrl} />
                          <AvatarFallback>
                            {chat.otherUser.username[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{chat.otherUser.username}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {isOwnMessage ? 'You: ' : ''}{lastMessagePreview}
                          </p>
                        </div>
                        {chat.lastMessageTime && (
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(getTimestampDate(chat.lastMessageTime), { addSuffix: false })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
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
              )
            )}
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default Messages;

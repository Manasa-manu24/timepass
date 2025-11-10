import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AiOutlinePlus } from 'react-icons/ai';
import { ScrollArea } from '@/components/ui/scroll-area';
import UploadSheet from './UploadSheet';
import StoryViewer from './StoryViewer';

interface Story {
  id: string;
  userId: string;
  username: string;
  userProfilePic?: string;
  mediaUrl: string;
  timestamp: any;
  viewed?: string[]; // Array of user IDs who viewed this story (optional for backwards compatibility)
}

interface StoryGroup {
  userId: string;
  username: string;
  userProfilePic?: string;
  stories: Story[];
  hasUnviewed: boolean;
}

const Stories = () => {
  const { user } = useAuth();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [userStories, setUserStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'post' | 'reel' | 'story'>('post');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentStories, setCurrentStories] = useState<Story[]>([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [allStoryGroups, setAllStoryGroups] = useState<StoryGroup[]>([]);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [currentUserProfilePic, setCurrentUserProfilePic] = useState<string>('');

  // Fetch current user's profile picture
  useEffect(() => {
    if (!user?.uid) return;
    
    const fetchUserProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        setCurrentUserProfilePic(userData?.profilePicUrl || '');
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    
    fetchUserProfile();
  }, [user?.uid]);

  useEffect(() => {
    // Query for recent stories (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const storiesQuery = query(
      collection(db, 'posts'),
      where('postType', '==', 'story')
    );

    const unsubscribe = onSnapshot(storiesQuery, async (snapshot) => {
      const storiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Story[];

      // Filter stories from last 24 hours and ensure they have valid userId
      const recentStories = storiesData.filter(story => {
        // Must have timestamp and valid userId
        if (!story.timestamp || !story.userId) return false;
        
        const storyDate = story.timestamp?.toDate ? 
          story.timestamp.toDate() : 
          new Date(story.timestamp);
        
        return storyDate > oneDayAgo;
      });

      // Fetch missing usernames from user profiles
      const storiesWithUsernames = await Promise.all(
        recentStories.map(async (story) => {
          // If story already has username, use it
          if (story.username) return story;
          
          // Otherwise, fetch from users collection
          try {
            // Double-check userId exists before fetching
            if (!story.userId) {
              return { ...story, username: 'User', userProfilePic: '' };
            }
            
            const userDoc = await getDoc(doc(db, 'users', story.userId));
            const userData = userDoc.data();
            return {
              ...story,
              username: userData?.username || userData?.displayName || 'User',
              userProfilePic: story.userProfilePic || userData?.profilePicUrl || ''
            };
          } catch (error) {
            console.error('Error fetching user data:', error);
            return { ...story, username: 'User', userProfilePic: '' };
          }
        })
      );

      // Group stories by user (filter out stories without userId)
      const grouped = storiesWithUsernames.reduce((acc, story) => {
        // Skip stories without valid userId
        if (!story.userId) return acc;
        
        const existing = acc.find(g => g.userId === story.userId);
        
        if (existing) {
          existing.stories.push(story);
          // Update hasUnviewed if any story in the group is unviewed
          if (!(story.viewed || []).includes(user?.uid || '')) {
            existing.hasUnviewed = true;
          }
        } else {
          acc.push({
            userId: story.userId,
            username: story.username || 'User',
            userProfilePic: story.userProfilePic || '',
            stories: [story],
            hasUnviewed: !(story.viewed || []).includes(user?.uid || '')
          });
        }
        
        return acc;
      }, [] as StoryGroup[]);

      // Separate current user's stories from others
      const currentUserStories = grouped.find(g => g.userId === user?.uid);
      const otherStories = grouped.filter(g => g.userId !== user?.uid);

      // Set user's own stories separately
      setUserStories(currentUserStories?.stories || []);

      // Create complete list with user's stories first (if they exist)
      const completeList = currentUserStories 
        ? [currentUserStories, ...otherStories]
        : otherStories;
      
      setAllStoryGroups(completeList);

      // Sort other users' stories by: unviewed first, then by most recent story
      otherStories.sort((a, b) => {
        if (a.hasUnviewed && !b.hasUnviewed) return -1;
        if (!a.hasUnviewed && b.hasUnviewed) return 1;
        
        const latestA = Math.max(...a.stories.map(s => {
          const date = s.timestamp?.toDate ? s.timestamp.toDate() : new Date(s.timestamp);
          return date.getTime();
        }));
        
        const latestB = Math.max(...b.stories.map(s => {
          const date = s.timestamp?.toDate ? s.timestamp.toDate() : new Date(s.timestamp);
          return date.getTime();
        }));
        
        return latestB - latestA;
      });

      setStoryGroups(otherStories);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching stories:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleStoryClick = (storyGroup: StoryGroup) => {
    // Find the index of this group in all story groups
    const groupIndex = allStoryGroups.findIndex(g => g.userId === storyGroup.userId);
    setCurrentGroupIndex(groupIndex);
    setCurrentStories(storyGroup.stories);
    setCurrentStoryIndex(0);
    setViewerOpen(true);
  };

  const handleUserStoryClick = () => {
    if (userStories.length > 0) {
      // User has stories - view them
      setCurrentGroupIndex(0);
      setCurrentStories(userStories);
      setCurrentStoryIndex(0);
      setViewerOpen(true);
    } else {
      // No stories - open upload
      handleAddStory();
    }
  };

  const handleNextGroup = () => {
    if (currentGroupIndex < allStoryGroups.length - 1) {
      const nextGroup = allStoryGroups[currentGroupIndex + 1];
      setCurrentGroupIndex(currentGroupIndex + 1);
      setCurrentStories(nextGroup.stories);
      setCurrentStoryIndex(0);
    } else {
      setViewerOpen(false);
    }
  };

  const handlePreviousGroup = () => {
    if (currentGroupIndex > 0) {
      const prevGroup = allStoryGroups[currentGroupIndex - 1];
      setCurrentGroupIndex(currentGroupIndex - 1);
      setCurrentStories(prevGroup.stories);
      setCurrentStoryIndex(0);
    }
  };

  const handleAddStory = () => {
    setUploadMode('story');
    setUploadOpen(true);
  };

  if (loading) {
    return null; // Don't show anything while loading
  }

  return (
    <>
      <div className="border-b border-border bg-card">
        <ScrollArea className="w-full">
          <div className="flex gap-4 p-4 pb-3 overflow-x-auto">
            {/* Add Your Story / View Your Stories */}
            <button
              key="user-story"
              onClick={handleUserStoryClick}
              className="flex flex-col items-center gap-2 flex-shrink-0"
              aria-label={userStories.length > 0 ? "View your story" : "Add your story"}
            >
              <div className="relative">
                {userStories.length > 0 ? (
                  // User has stories - show with gradient ring and latest story preview
                  <div className="p-0.5 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-pink-500">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden ring-2 ring-card">
                      {userStories[0].mediaUrl && (
                        <img 
                          src={userStories[0].mediaUrl} 
                          alt="Your story"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  // No stories - show add button
                  <>
                    <Avatar className="w-16 h-16 ring-2 ring-border">
                      <AvatarImage src={currentUserProfilePic || ''} />
                      <AvatarFallback className="text-sm">
                        {user?.email?.[0].toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center ring-2 ring-card">
                      <AiOutlinePlus size={12} />
                    </div>
                  </>
                )}
              </div>
              <span className="text-xs font-medium max-w-[64px] truncate">
                {userStories.length > 0 ? 'Your story' : 'Your story'}
              </span>
            </button>

          {/* Story Groups */}
          {storyGroups.map((group) => (
            <button
              key={group.userId}
              onClick={() => handleStoryClick(group)}
              className="flex flex-col items-center gap-2 flex-shrink-0 hover:opacity-80 transition"
              aria-label={`View ${group.username}'s story`}
            >
              <div className="relative">
                <div className={`p-0.5 rounded-full ${
                  group.hasUnviewed 
                    ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-pink-500' 
                    : 'bg-border'
                }`}>
                  <Avatar className="w-16 h-16 ring-2 ring-card">
                    <AvatarImage src={group.userProfilePic} />
                    <AvatarFallback className="text-sm">
                      {group.username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <span className="text-xs font-medium max-w-[64px] truncate">
                {group.username || 'User'}
              </span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
    
    <UploadSheet 
      open={uploadOpen} 
      onOpenChange={setUploadOpen}
      defaultMode={uploadMode}
    />

    {/* Story Viewer */}
    {viewerOpen && currentStories.length > 0 && (
      <StoryViewer
        stories={currentStories}
        currentStoryIndex={currentStoryIndex}
        onClose={() => setViewerOpen(false)}
        onNext={handleNextGroup}
        onPrevious={handlePreviousGroup}
      />
    )}
  </>
  );
};

export default Stories;

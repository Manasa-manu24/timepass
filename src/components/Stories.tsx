import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AiOutlinePlus } from 'react-icons/ai';
import { ScrollArea } from '@/components/ui/scroll-area';
import UploadSheet from './UploadSheet';

interface Story {
  id: string;
  userId: string;
  username: string;
  userProfilePic?: string;
  mediaUrl: string;
  timestamp: any;
  viewed: string[]; // Array of user IDs who viewed this story
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
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'post' | 'reel' | 'story'>('post');

  useEffect(() => {
    // Query for recent stories (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const storiesQuery = query(
      collection(db, 'posts'),
      where('postType', '==', 'story')
    );

    const unsubscribe = onSnapshot(storiesQuery, (snapshot) => {
      const storiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Story[];

      // Filter stories from last 24 hours
      const recentStories = storiesData.filter(story => {
        if (!story.timestamp) return false;
        
        const storyDate = story.timestamp?.toDate ? 
          story.timestamp.toDate() : 
          new Date(story.timestamp);
        
        return storyDate > oneDayAgo;
      });

      // Group stories by user
      const grouped = recentStories.reduce((acc, story) => {
        const existing = acc.find(g => g.userId === story.userId);
        
        if (existing) {
          existing.stories.push(story);
        } else {
          acc.push({
            userId: story.userId,
            username: story.username,
            userProfilePic: story.userProfilePic,
            stories: [story],
            hasUnviewed: !story.viewed.includes(user?.uid || '')
          });
        }
        
        return acc;
      }, [] as StoryGroup[]);

      // Sort by: unviewed first, then by most recent story
      grouped.sort((a, b) => {
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

      setStoryGroups(grouped);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching stories:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleStoryClick = (storyGroup: StoryGroup) => {
    // TODO: Implement story viewer modal
    console.log('Open story viewer for:', storyGroup);
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
            {/* Add Your Story */}
            <button
              onClick={handleAddStory}
              className="flex flex-col items-center gap-2 flex-shrink-0"
              aria-label="Add your story"
            >
            <div className="relative">
              <Avatar className="w-16 h-16 ring-2 ring-border">
                <AvatarImage src={user?.photoURL || ''} />
                <AvatarFallback className="text-sm">
                  {user?.email?.[0].toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center ring-2 ring-card">
                <AiOutlinePlus size={12} />
              </div>
            </div>
            <span className="text-xs font-medium max-w-[64px] truncate">Your story</span>
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
                      {group.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <span className="text-xs font-medium max-w-[64px] truncate">
                {group.username}
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
  </>
  );
};

export default Stories;

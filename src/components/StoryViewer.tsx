import { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, addDoc, collection, increment, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AiOutlineClose, AiOutlineLeft, AiOutlineRight, AiOutlineEye, AiOutlineHeart, AiFillHeart, AiOutlineSend } from 'react-icons/ai';
import { BsVolumeMute, BsVolumeUp } from 'react-icons/bs';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Story {
  id: string;
  userId: string;
  username: string;
  userProfilePic?: string;
  mediaUrl: string;
  mediaType?: 'image' | 'video';
  timestamp: any;
  viewed?: string[]; // Array of user IDs who viewed this story (optional for backwards compatibility)
  likes?: string[]; // Array of user IDs who liked this story
  caption?: string;
}

interface StoryViewerProps {
  stories: Story[];
  currentStoryIndex: number;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

const StoryViewer = ({ 
  stories, 
  currentStoryIndex, 
  onClose,
  onNext,
  onPrevious 
}: StoryViewerProps) => {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(currentStoryIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [viewersList, setViewersList] = useState<Array<{ uid: string; username: string; profilePicUrl?: string }>>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentStory = stories[currentIndex];
  const isVideo = currentStory?.mediaUrl?.includes('.mp4') || 
                  currentStory?.mediaUrl?.includes('.webm') ||
                  currentStory?.mediaType === 'video';
  const isOwnStory = currentStory?.userId === user?.uid;
  
  const STORY_DURATION = 5000; // 5 seconds for images
  const PROGRESS_INTERVAL = 50; // Update progress every 50ms

  // Prevent body scroll on mobile when story viewer is open
  useEffect(() => {
    // Save current scroll position
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    
    // Save original styles
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalLeft = document.body.style.left;
    const originalWidth = document.body.style.width;
    const originalHeight = document.body.style.height;
    const originalTouchAction = document.body.style.touchAction;
    
    // Apply strict mobile scroll prevention
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = `-${scrollX}px`;
    document.body.style.width = '100%';
    document.body.style.height = '100vh';
    document.body.style.touchAction = 'none';
    
    // Prevent iOS rubber band effect
    const preventScroll = (e: TouchEvent) => {
      if (e.target instanceof HTMLElement) {
        // Allow scrolling only within specific scrollable elements
        const isScrollable = e.target.closest('.allow-scroll');
        if (!isScrollable) {
          e.preventDefault();
        }
      }
    };
    
    document.addEventListener('touchmove', preventScroll, { passive: false });
    
    return () => {
      // Restore original styles
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.left = originalLeft;
      document.body.style.width = originalWidth;
      document.body.style.height = originalHeight;
      document.body.style.touchAction = originalTouchAction;
      
      // Restore scroll position
      window.scrollTo(scrollX, scrollY);
      
      // Remove event listener
      document.removeEventListener('touchmove', preventScroll);
    };
  }, []);

  // Mark story as viewed
  useEffect(() => {
    const markAsViewed = async () => {
      if (!user || !currentStory) return;
      
      // Check if already viewed (handle undefined viewed array)
      const viewedArray = currentStory.viewed || [];
      if (viewedArray.includes(user.uid)) return;

      try {
        const storyRef = doc(db, 'posts', currentStory.id);
        await updateDoc(storyRef, {
          viewed: arrayUnion(user.uid)
        });
      } catch (error) {
        console.error('Error marking story as viewed:', error);
      }
    };

    markAsViewed();
  }, [currentStory, user]);

  // Check if user has liked the current story
  useEffect(() => {
    if (!user || !currentStory) return;
    
    const likesArray = currentStory.likes || [];
    setIsLiked(likesArray.includes(user.uid));
  }, [currentStory, user]);

  // Fetch viewers information for own stories
  useEffect(() => {
    const fetchViewers = async () => {
      if (!isOwnStory || !currentStory) {
        setViewersList([]);
        return;
      }

      const viewedArray = currentStory.viewed || [];
      
      // Filter out the story author from the viewers list
      const filteredViewers = viewedArray.filter(userId => userId !== currentStory.userId);
      
      if (filteredViewers.length === 0) {
        setViewersList([]);
        return;
      }

      setLoadingViewers(true);
      try {
        const viewers = await Promise.all(
          filteredViewers.map(async (userId) => {
            try {
              const userDoc = await getDoc(doc(db, 'users', userId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                return {
                  uid: userId,
                  username: userData.username || userData.displayName || 'User',
                  profilePicUrl: userData.profilePicUrl || ''
                };
              }
              return { uid: userId, username: 'User', profilePicUrl: '' };
            } catch (error) {
              console.error('Error fetching viewer data:', error);
              return { uid: userId, username: 'User', profilePicUrl: '' };
            }
          })
        );
        setViewersList(viewers);
      } catch (error) {
        console.error('Error fetching viewers:', error);
      } finally {
        setLoadingViewers(false);
      }
    };

    fetchViewers();
  }, [currentStory, isOwnStory]);

  // Handle story progression
  useEffect(() => {
    if (isPaused) return;

    if (isVideo && videoRef.current) {
      const video = videoRef.current;
      
      const updateProgress = () => {
        if (video.duration) {
          setProgress((video.currentTime / video.duration) * 100);
        }
      };

      const handleVideoEnd = () => {
        handleNext();
      };

      video.addEventListener('timeupdate', updateProgress);
      video.addEventListener('ended', handleVideoEnd);
      video.play().catch(console.error);

      return () => {
        video.removeEventListener('timeupdate', updateProgress);
        video.removeEventListener('ended', handleVideoEnd);
        video.pause();
      };
    } else {
      // Image story - use timer
      setProgress(0);
      const increment = (PROGRESS_INTERVAL / STORY_DURATION) * 100;
      
      intervalRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            handleNext();
            return 100;
          }
          return prev + increment;
        });
      }, PROGRESS_INTERVAL);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [currentIndex, isPaused, isVideo]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      // Last story in this group
      if (onNext) {
        onNext();
      } else {
        onClose();
      }
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    } else {
      // First story in this group
      if (onPrevious) {
        onPrevious();
      }
    }
  };

  const handleTap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    if (x < width / 3) {
      handlePrevious();
    } else if (x > (width * 2) / 3) {
      handleNext();
    } else {
      setIsPaused(prev => !prev);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const getTimestamp = () => {
    try {
      const date = currentStory.timestamp?.toDate ? 
        currentStory.timestamp.toDate() : 
        new Date(currentStory.timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return '';
    }
  };

  const handleStoryInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    setSendingComment(true);

    try {
      // Get user data
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const senderUsername = userData?.username || 'Anonymous';
      const senderProfilePic = userData?.profilePicUrl || '';

      if (!commentText.trim()) {
        // LIKE/UNLIKE STORY - when input is empty and heart is clicked
        if (isLiked) {
          // UNLIKE - Remove like from story
          await updateDoc(doc(db, 'posts', currentStory.id), {
            likes: arrayRemove(user.uid)
          });

          // Update local state immediately
          setIsLiked(false);
          toast.success('Story unliked');
        } else {
          // LIKE - Add like to story
          await updateDoc(doc(db, 'posts', currentStory.id), {
            likes: arrayUnion(user.uid)
          });

          // Update local state immediately
          setIsLiked(true);

          // Create notification for story author
          await addDoc(collection(db, 'notifications'), {
            userId: currentStory.userId,
            type: 'like',
            senderId: user.uid,
            senderUsername: senderUsername,
            senderProfilePic: senderProfilePic,
            postId: currentStory.id,
            postType: 'story',
            message: `liked your story`,
            timestamp: serverTimestamp(),
            read: false
          });

          toast.success('Story liked!');
        }
      } else {
        // SEND MESSAGE - when input has text
        const messageText = commentText.trim();
        
        // Generate chat ID (consistent for both users)
        const getChatId = () => {
          const ids = [user.uid, currentStory.userId].sort();
          return `${ids[0]}_${ids[1]}`;
        };
        
        const chatId = getChatId();
        const chatRef = doc(db, 'chats', chatId);
        
        // Create or update chat document
        const chatDoc = await getDoc(chatRef);
        if (!chatDoc.exists()) {
          await setDoc(chatRef, {
            participants: [user.uid, currentStory.userId],
            createdAt: serverTimestamp(),
            lastMessage: messageText,
            lastMessageTime: serverTimestamp(),
            lastMessageSender: user.uid
          });
        } else {
          await updateDoc(chatRef, {
            lastMessage: messageText,
            lastMessageTime: serverTimestamp(),
            lastMessageSender: user.uid
          });
        }

        // Add message to chat subcollection
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        await addDoc(messagesRef, {
          text: messageText,
          senderId: user.uid,
          timestamp: serverTimestamp(),
          seenBy: [user.uid],
          seenAt: null,
          isStoryReply: true, // Mark as story reply
          storyId: currentStory.id // Reference to the story
        });

        // Create notification for recipient
        await addDoc(collection(db, 'notifications'), {
          userId: currentStory.userId,
          type: 'message',
          senderId: user.uid,
          senderUsername: senderUsername,
          senderProfilePic: senderProfilePic,
          messagePreview: messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText,
          timestamp: serverTimestamp(),
          read: false
        });

        setCommentText('');
        toast.success('Message sent!');
      }
    } catch (error) {
      console.error('Error with story interaction:', error);
      toast.error(commentText.trim() ? 'Failed to send message' : (isLiked ? 'Failed to unlike story' : 'Failed to like story'));
    } finally {
      setSendingComment(false);
    }
  };

  if (!currentStory) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black overflow-hidden"
      style={{ 
        height: '100vh',
        maxHeight: '-webkit-fill-available',
        touchAction: 'none',
        WebkitOverflowScrolling: 'touch'
      } as React.CSSProperties}
    >
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
        {stories.map((story, index) => (
          <div key={story.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-100"
              style={{ 
                width: index < currentIndex ? '100%' : 
                       index === currentIndex ? `${progress}%` : '0%' 
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-4 left-0 right-0 z-20 flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 ring-2 ring-white">
            <AvatarImage src={currentStory.userProfilePic} />
            <AvatarFallback className="bg-primary text-white">
              {currentStory.username?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-white text-sm">{currentStory.username || 'User'}</p>
            <p className="text-xs text-white/70">{getTimestamp()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Seen By button - only show for own stories */}
          {isOwnStory && viewersList.length > 0 && (
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 gap-2"
                >
                  <AiOutlineEye size={20} />
                  <span className="text-sm">{viewersList.length}</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[60vh] rounded-t-2xl">
                <SheetHeader>
                  <SheetTitle>Seen by {viewersList.length} {viewersList.length === 1 ? 'person' : 'people'}</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-3 overflow-y-auto max-h-[calc(60vh-100px)]">
                  {loadingViewers ? (
                    <p className="text-center text-muted-foreground">Loading viewers...</p>
                  ) : (
                    viewersList.map((viewer) => (
                      <div key={viewer.uid} className="flex items-center gap-3 p-2 hover:bg-accent rounded-lg transition">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={viewer.profilePicUrl} />
                          <AvatarFallback>
                            {viewer.username[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-medium">{viewer.username}</p>
                      </div>
                    ))
                  )}
                </div>
              </SheetContent>
            </Sheet>
          )}
          {isVideo && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="text-white hover:bg-white/20"
            >
              {isMuted ? <BsVolumeMute size={20} /> : <BsVolumeUp size={20} />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <AiOutlineClose size={24} />
          </Button>
        </div>
      </div>

      {/* Story content */}
      <div 
        className="relative w-full flex items-center justify-center"
        onClick={handleTap}
        style={{ 
          height: '100vh',
          maxHeight: '-webkit-fill-available',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none'
        } as React.CSSProperties}
      >
        {isVideo ? (
          <video
            ref={videoRef}
            src={currentStory.mediaUrl}
            className="max-w-full max-h-full object-contain"
            muted={isMuted}
            playsInline
          />
        ) : (
          <img
            src={currentStory.mediaUrl}
            alt="Story"
            className="max-w-full max-h-full object-contain"
          />
        )}

        {/* Navigation hints */}
        <div className="absolute inset-0 flex">
          <div className="flex-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); handlePrevious(); }} />
          <div className="flex-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsPaused(prev => !prev); }} />
          <div className="flex-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleNext(); }} />
        </div>
      </div>

      {/* Caption */}
      {currentStory.caption && (
        <div className="absolute bottom-20 left-0 right-0 px-6 z-20">
          <p className="text-white text-sm text-center bg-black/50 backdrop-blur-sm rounded-lg p-3">
            {currentStory.caption}
          </p>
        </div>
      )}

      {/* Navigation arrows (desktop) */}
      {currentIndex > 0 && (
        <button
          onClick={handlePrevious}
          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 items-center justify-center bg-white/20 hover:bg-white/30 rounded-full text-white transition"
        >
          <AiOutlineLeft size={24} />
        </button>
      )}
      {currentIndex < stories.length - 1 && (
        <button
          onClick={handleNext}
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 items-center justify-center bg-white/20 hover:bg-white/30 rounded-full text-white transition"
        >
          <AiOutlineRight size={24} />
        </button>
      )}

      {/* Pause indicator */}
      {isPaused && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <div className="flex gap-2">
            <div className="w-1 h-12 bg-white rounded-full" />
            <div className="w-1 h-12 bg-white rounded-full" />
          </div>
        </div>
      )}

      {/* Comment Input - Instagram Style */}
      {!isOwnStory && (
        <form 
          onSubmit={handleStoryInteraction}
          className="absolute bottom-4 left-4 right-4 z-20 flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
          style={{ touchAction: 'auto' } as React.CSSProperties}
        >
          <div className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 flex items-center">
            <Input
              type="text"
              placeholder="Reply to story..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
              disabled={sendingComment}
              className="bg-transparent border-0 text-white placeholder:text-white/70 focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
              style={{ touchAction: 'auto' } as React.CSSProperties}
            />
          </div>
          <Button
            type="submit"
            disabled={sendingComment}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 disabled:opacity-50"
            title={commentText.trim() ? 'Send message' : isLiked ? 'Unlike story' : 'Like story'}
          >
            {commentText.trim() ? (
              <AiOutlineSend size={24} className="text-primary" />
            ) : isLiked ? (
              <AiFillHeart size={24} className="text-red-500" />
            ) : (
              <AiOutlineHeart size={24} className="text-white" />
            )}
          </Button>
        </form>
      )}
    </div>
  );
};

export default StoryViewer;

import { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { AiOutlineClose, AiOutlineLeft, AiOutlineRight } from 'react-icons/ai';
import { BsVolumeMute, BsVolumeUp } from 'react-icons/bs';
import { formatDistanceToNow } from 'date-fns';

interface Story {
  id: string;
  userId: string;
  username: string;
  userProfilePic?: string;
  mediaUrl: string;
  mediaType?: 'image' | 'video';
  timestamp: any;
  viewed?: string[]; // Array of user IDs who viewed this story (optional for backwards compatibility)
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentStory = stories[currentIndex];
  const isVideo = currentStory?.mediaUrl?.includes('.mp4') || 
                  currentStory?.mediaUrl?.includes('.webm') ||
                  currentStory?.mediaType === 'video';
  
  const STORY_DURATION = 5000; // 5 seconds for images
  const PROGRESS_INTERVAL = 50; // Update progress every 50ms

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

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
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
        className="relative w-full h-full flex items-center justify-center"
        onClick={handleTap}
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
    </div>
  );
};

export default StoryViewer;

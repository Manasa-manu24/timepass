import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AiOutlineHeart, AiFillHeart, AiOutlineComment, AiOutlineSend } from 'react-icons/ai';
import { BsThreeDots, BsVolumeMute, BsVolumeUp } from 'react-icons/bs';
import { BiRepost } from 'react-icons/bi';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { doc, updateDoc, arrayUnion, arrayRemove, addDoc, collection, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import CommentsDialog from '@/components/CommentsDialog';

interface ReelPlayerProps {
  reel: {
    id: string;
    authorId: string;
    authorUsername: string;
    authorProfilePic?: string;
    caption: string;
    mediaUrl: string;
    mediaType?: 'image' | 'video';
    likes: string[];
    commentsCount: number;
  };
  isActive: boolean;
}

const ReelPlayer = ({ reel, isActive }: ReelPlayerProps) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLiked, setIsLiked] = useState(user ? reel.likes.includes(user.uid) : false);
  const [isMuted, setIsMuted] = useState(false); // Changed to false for unmuted by default
  const [hasViewed, setHasViewed] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  useEffect(() => {
    // Only handle video playback if it's a video
    if (reel.mediaType === 'image') return;
    
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.play().catch(console.error);
      
      // Track view after 2 seconds
      const viewTimer = setTimeout(() => {
        if (!hasViewed) {
          setHasViewed(true);
          // TODO: Increment view count in Firestore
        }
      }, 2000);

      return () => clearTimeout(viewTimer);
    } else {
      video.pause();
    }
  }, [isActive, hasViewed, reel.mediaType]);

  const handleLike = async () => {
    if (!user) return;

    const postRef = doc(db, 'posts', reel.id);
    
    try {
      if (isLiked) {
        await updateDoc(postRef, {
          likes: arrayRemove(user.uid)
        });
        setIsLiked(false);
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(user.uid)
        });
        setIsLiked(true);

        // Create notification for the reel author (if not liking own reel)
        if (user.uid !== reel.authorId) {
          try {
            // Get current user's data for the notification
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const userData = userDoc.data();

            await addDoc(collection(db, 'notifications'), {
              userId: reel.authorId,
              type: 'like',
              senderId: user.uid,
              senderUsername: userData?.username || user.email?.split('@')[0] || 'Someone',
              senderProfilePic: userData?.profilePicUrl || '',
              postId: reel.id,
              postType: 'reel',
              timestamp: serverTimestamp(),
              read: false
            });
          } catch (notifError) {
            console.error('Error creating notification:', notifError);
          }
        }
      }
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleRepost = async () => {
    if (!user) {
      toast.error('Please sign in to repost');
      return;
    }

    try {
      // Get current user's data
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      // Create a new post that references the original reel
      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorUsername: userData?.username || user.email?.split('@')[0] || 'Anonymous',
        authorProfilePic: userData?.profilePicUrl || '',
        caption: `Reposted from @${reel.authorUsername}`,
        mediaUrl: reel.mediaUrl,
        mediaType: 'video',
        likes: [],
        comments: [],
        commentsCount: 0,
        timestamp: serverTimestamp(),
        isRepost: true,
        originalPostId: reel.id,
        originalAuthorId: reel.authorId,
        originalAuthorUsername: reel.authorUsername
      });

      // Create notification for the original author
      if (user.uid !== reel.authorId) {
        await addDoc(collection(db, 'notifications'), {
          userId: reel.authorId,
          type: 'repost',
          senderId: user.uid,
          senderUsername: userData?.username || user.email?.split('@')[0] || 'Someone',
          senderProfilePic: userData?.profilePicUrl || '',
          postId: reel.id,
          postType: 'reel',
          timestamp: serverTimestamp(),
          read: false
        });
      }

      toast.success('Reposted successfully!');
    } catch (error) {
      console.error('Error reposting:', error);
      toast.error('Failed to repost');
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/post/${reel.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${reel.authorUsername}'s reel`,
          text: reel.caption,
          url: shareUrl,
        });
        toast.success('Shared successfully!');
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copying link
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard!');
      } catch (error) {
        console.error('Error copying link:', error);
        toast.error('Failed to copy link');
      }
    }
  };

  return (
    <div className="relative w-full h-full bg-black">
      {/* Media - Image or Video */}
      {reel.mediaType === 'image' ? (
        <img
          src={reel.mediaUrl}
          alt={reel.caption}
          className="w-full h-full object-contain"
        />
      ) : (
        <video
          ref={videoRef}
          src={reel.mediaUrl}
          className="w-full h-full object-contain"
          loop
          muted={isMuted}
          playsInline
        />
      )}

      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

      {/* Top Right Menu */}
      <div className="absolute top-4 right-4 z-10">
        <Button variant="ghost" size="icon" className="text-white">
          <BsThreeDots size={24} />
        </Button>
      </div>

      {/* Side Actions - Adjusted for mobile bottom nav */}
      <div className="absolute right-4 bottom-40 lg:bottom-24 flex flex-col gap-5 lg:gap-6 z-10">
        <button
          onClick={handleLike}
          className="flex flex-col items-center gap-1"
          aria-label={isLiked ? 'Unlike' : 'Like'}
        >
          {isLiked ? (
            <AiFillHeart size={30} className="text-destructive lg:w-8 lg:h-8" />
          ) : (
            <AiOutlineHeart size={30} className="text-white lg:w-8 lg:h-8" />
          )}
          <span className="text-white text-xs font-semibold">
            {reel.likes.length}
          </span>
        </button>

        <button 
          className="flex flex-col items-center gap-1" 
          aria-label="Comment"
          onClick={() => setCommentsOpen(true)}
        >
          <AiOutlineComment size={30} className="text-white lg:w-8 lg:h-8" />
          <span className="text-white text-xs font-semibold">
            {reel.commentsCount}
          </span>
        </button>

        <button 
          className="flex flex-col items-center gap-1" 
          aria-label="Repost"
          onClick={handleRepost}
        >
          <BiRepost size={30} className="text-white lg:w-8 lg:h-8" />
        </button>

        <button 
          className="flex flex-col items-center gap-1" 
          aria-label="Share"
          onClick={handleShare}
        >
          <AiOutlineSend size={30} className="text-white lg:w-8 lg:h-8" />
        </button>

        {/* Only show mute button for videos */}
        {reel.mediaType !== 'image' && (
          <button 
            onClick={toggleMute}
            className="flex flex-col items-center gap-1"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <BsVolumeMute size={26} className="text-white lg:w-7 lg:h-7" />
            ) : (
              <BsVolumeUp size={26} className="text-white lg:w-7 lg:h-7" />
            )}
          </button>
        )}
      </div>

      {/* Bottom Info - Username and Caption - Adjusted for mobile bottom nav */}
      <div className="absolute bottom-20 lg:bottom-4 left-4 right-24 lg:right-20 z-10 flex flex-col gap-2">
        <div className="flex items-center gap-2 lg:gap-3">
          <Avatar className="w-8 h-8 lg:w-9 lg:h-9 ring-2 ring-white">
            <AvatarImage src={reel.authorProfilePic} />
            <AvatarFallback className="bg-primary text-white text-xs">
              {reel.authorUsername[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Link 
            to={`/profile/${reel.authorId}`}
            className="font-semibold text-white hover:opacity-70 transition-opacity text-sm lg:text-base"
          >
            {reel.authorUsername}
          </Link>
        </div>
        <p className="text-white text-xs lg:text-sm line-clamp-2 leading-relaxed">
          {reel.caption}
        </p>
      </div>

      {/* Comments Dialog */}
      <CommentsDialog
        postId={reel.id}
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
      />
    </div>
  );
};

export default ReelPlayer;

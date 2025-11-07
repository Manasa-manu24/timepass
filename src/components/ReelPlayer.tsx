import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AiOutlineHeart, AiFillHeart, AiOutlineComment, AiOutlineSend } from 'react-icons/ai';
import { BsThreeDots, BsVolumeMute, BsVolumeUp } from 'react-icons/bs';
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
  }, [isActive, hasViewed]);

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
      {/* Video */}
      <video
        ref={videoRef}
        src={reel.mediaUrl}
        className="w-full h-full object-contain"
        loop
        muted={isMuted}
        playsInline
      />

      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

      {/* Top Info */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 ring-2 ring-white">
            <AvatarImage src={reel.authorProfilePic} />
            <AvatarFallback className="bg-primary text-white">
              {reel.authorUsername[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Link 
            to={`/profile/${reel.authorId}`}
            className="font-semibold text-white hover:opacity-70 transition-opacity"
          >
            {reel.authorUsername}
          </Link>
        </div>
        <Button variant="ghost" size="icon" className="text-white">
          <BsThreeDots size={24} />
        </Button>
      </div>

      {/* Side Actions */}
      <div className="absolute right-4 bottom-24 flex flex-col gap-6 z-10">
        <button
          onClick={handleLike}
          className="flex flex-col items-center gap-1"
          aria-label={isLiked ? 'Unlike' : 'Like'}
        >
          {isLiked ? (
            <AiFillHeart size={32} className="text-destructive" />
          ) : (
            <AiOutlineHeart size={32} className="text-white" />
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
          <AiOutlineComment size={32} className="text-white" />
          <span className="text-white text-xs font-semibold">
            {reel.commentsCount}
          </span>
        </button>

        <button 
          className="flex flex-col items-center gap-1" 
          aria-label="Share"
          onClick={handleShare}
        >
          <AiOutlineSend size={32} className="text-white" />
        </button>

        <button 
          onClick={toggleMute}
          className="flex flex-col items-center gap-1"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <BsVolumeMute size={28} className="text-white" />
          ) : (
            <BsVolumeUp size={28} className="text-white" />
          )}
        </button>
      </div>

      {/* Bottom Caption */}
      <div className="absolute bottom-4 left-4 right-20 z-10">
        <p className="text-white text-sm line-clamp-2">
          <span className="font-semibold mr-2">{reel.authorUsername}</span>
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

import { useState } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Link } from 'react-router-dom';
import { AiOutlineHeart, AiFillHeart, AiOutlineComment, AiOutlineSend } from 'react-icons/ai';
import { BsBookmark, BsBookmarkFill, BsThreeDots } from 'react-icons/bs';
import { MdOutlineReport } from 'react-icons/md';
import { AiOutlineStar, AiFillStar } from 'react-icons/ai';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import CommentsDialog from '@/components/CommentsDialog';

interface PostCardProps {
  post: {
    id: string;
    authorId: string;
    authorUsername: string;
    authorProfilePic?: string;
    caption: string;
    mediaUrl: string;
    mediaType: 'image' | 'video';
    likes: string[];
    timestamp: any; // Can be string, Date, or Firestore Timestamp
    commentsCount: number;
  };
  currentUserId?: string;
  onLike?: (postId: string) => void;
  savedPosts?: string[];
  onSaveToggle?: (postId: string, isSaved: boolean) => void;
}

const PostCard = ({ post, currentUserId, onLike, savedPosts = [], onSaveToggle }: PostCardProps) => {
  const [isLiked, setIsLiked] = useState(
    currentUserId ? post.likes.includes(currentUserId) : false
  );
  const [isSaved, setIsSaved] = useState(
    savedPosts.includes(post.id)
  );
  const [isFavorited, setIsFavorited] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  // Helper function to convert timestamp to Date object
  const getTimestampDate = (timestamp: any): Date => {
    if (!timestamp) {
      return new Date(); // Return current date if no timestamp
    }
    
    // If it's a Firestore Timestamp object
    if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    // If it's already a Date object
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    // If it's a string or number, try to convert
    const date = new Date(timestamp);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return new Date(); // Return current date if invalid
    }
    
    return date;
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike?.(post.id);
  };

  const handleSave = async () => {
    if (!currentUserId) {
      toast.error('Please sign in to save posts');
      return;
    }

    try {
      const userRef = doc(db, 'users', currentUserId);
      
      if (isSaved) {
        // Unsave
        await updateDoc(userRef, {
          savedPosts: arrayRemove(post.id)
        });
        setIsSaved(false);
        toast.success('Post removed from saved');
      } else {
        // Save
        await updateDoc(userRef, {
          savedPosts: arrayUnion(post.id)
        });
        setIsSaved(true);
        toast.success('Post saved!');
      }
      
      onSaveToggle?.(post.id, !isSaved);
    } catch (error) {
      console.error('Error saving post:', error);
      toast.error('Failed to save post');
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/post/${post.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${post.authorUsername}'s post`,
          text: post.caption,
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

  const handleFavorite = async () => {
    if (!currentUserId) {
      toast.error('Please sign in to add favorites');
      return;
    }

    try {
      const userRef = doc(db, 'users', currentUserId);
      
      if (isFavorited) {
        // Remove from favorites
        await updateDoc(userRef, {
          favoritePosts: arrayRemove(post.id)
        });
        setIsFavorited(false);
        toast.success('Removed from favorites');
      } else {
        // Add to favorites
        await updateDoc(userRef, {
          favoritePosts: arrayUnion(post.id)
        });
        setIsFavorited(true);
        toast.success('Added to favorites!');
      }
    } catch (error) {
      console.error('Error favoriting post:', error);
      toast.error('Failed to update favorites');
    }
  };

  const handleReport = () => {
    toast.info('Report submitted. Thank you for helping keep our community safe.');
  };

  return (
    <Card className="mb-0 lg:mb-6 overflow-hidden border-x-0 lg:border-x rounded-none lg:rounded-lg border-b last:border-b-0 lg:border-b">
      {/* Post Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={post.authorProfilePic} />
            <AvatarFallback>{post.authorUsername[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <Link 
            to={`/profile/${post.authorId}`}
            className="font-semibold text-sm hover:opacity-70 transition-opacity"
          >
            {post.authorUsername}
          </Link>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <BsThreeDots />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleSave}>
              {isSaved ? (
                <>
                  <BsBookmarkFill className="mr-2 h-4 w-4" />
                  Remove from Saved
                </>
              ) : (
                <>
                  <BsBookmark className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleFavorite}>
              {isFavorited ? (
                <>
                  <AiFillStar className="mr-2 h-4 w-4 text-yellow-500" />
                  Remove from Favorites
                </>
              ) : (
                <>
                  <AiOutlineStar className="mr-2 h-4 w-4" />
                  Add to Favorites
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleReport} className="text-destructive">
              <MdOutlineReport className="mr-2 h-4 w-4" />
              Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Post Media */}
      <div className="w-full aspect-square bg-white flex items-center justify-center">
        {post.mediaType === 'image' ? (
          <img
            src={post.mediaUrl}
            alt={post.caption}
            className="w-full h-full object-contain"
          />
        ) : (
          <video
            src={post.mediaUrl}
            controls
            className="w-full h-full object-contain"
          />
        )}
      </div>

      {/* Post Actions */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLike}
              className="hover:opacity-70"
            >
              {isLiked ? (
                <AiFillHeart size={24} className="text-destructive" />
              ) : (
                <AiOutlineHeart size={24} />
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="hover:opacity-70"
              onClick={() => setCommentsOpen(true)}
            >
              <AiOutlineComment size={24} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="hover:opacity-70"
              onClick={handleShare}
            >
              <AiOutlineSend size={24} />
            </Button>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="hover:opacity-70"
            onClick={handleSave}
          >
            {isSaved ? (
              <BsBookmarkFill size={20} className="text-foreground" />
            ) : (
              <BsBookmark size={20} />
            )}
          </Button>
        </div>

        {/* Likes Count */}
        <div className="font-semibold text-sm mb-2">
          {post.likes.length} {post.likes.length === 1 ? 'like' : 'likes'}
        </div>

        {/* Caption */}
        <div className="text-sm mb-1">
          <span className="font-semibold mr-2">{post.authorUsername}</span>
          {post.caption}
        </div>

        {/* Comments Count */}
        {post.commentsCount > 0 && (
          <button 
            className="text-sm text-muted-foreground mb-2"
            onClick={() => setCommentsOpen(true)}
          >
            View all {post.commentsCount} comments
          </button>
        )}

        {/* Timestamp */}
        <div className="text-xs text-muted-foreground uppercase">
          {formatDistanceToNow(getTimestampDate(post.timestamp), { addSuffix: true })}
        </div>
      </div>

      {/* Comments Dialog */}
      <CommentsDialog
        postId={post.id}
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
      />
    </Card>
  );
};

export default PostCard;

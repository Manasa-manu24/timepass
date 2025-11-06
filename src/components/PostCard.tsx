import { useState } from 'react';
import { AiOutlineHeart, AiFillHeart, AiOutlineComment, AiOutlineSend } from 'react-icons/ai';
import { BsBookmark, BsThreeDots } from 'react-icons/bs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

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
    timestamp: string;
    commentsCount: number;
  };
  currentUserId?: string;
  onLike?: (postId: string) => void;
}

const PostCard = ({ post, currentUserId, onLike }: PostCardProps) => {
  const [isLiked, setIsLiked] = useState(
    currentUserId ? post.likes.includes(currentUserId) : false
  );

  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike?.(post.id);
  };

  return (
    <Card className="mb-6 overflow-hidden border rounded-lg">
      {/* Post Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={post.authorProfilePic} />
            <AvatarFallback>{post.authorUsername[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="font-semibold text-sm">{post.authorUsername}</span>
        </div>
        <Button variant="ghost" size="icon">
          <BsThreeDots />
        </Button>
      </div>

      {/* Post Media */}
      <div className="w-full aspect-square bg-secondary">
        {post.mediaType === 'image' ? (
          <img
            src={post.mediaUrl}
            alt={post.caption}
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            src={post.mediaUrl}
            controls
            className="w-full h-full object-cover"
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
            <Button variant="ghost" size="icon" className="hover:opacity-70">
              <AiOutlineComment size={24} />
            </Button>
            <Button variant="ghost" size="icon" className="hover:opacity-70">
              <AiOutlineSend size={24} />
            </Button>
          </div>
          <Button variant="ghost" size="icon" className="hover:opacity-70">
            <BsBookmark size={20} />
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
          <button className="text-sm text-muted-foreground mb-2">
            View all {post.commentsCount} comments
          </button>
        )}

        {/* Timestamp */}
        <div className="text-xs text-muted-foreground uppercase">
          {formatDistanceToNow(new Date(post.timestamp), { addSuffix: true })}
        </div>
      </div>
    </Card>
  );
};

export default PostCard;

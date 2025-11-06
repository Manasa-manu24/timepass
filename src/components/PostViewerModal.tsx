import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { doc, deleteDoc, getDoc, updateDoc, arrayRemove, arrayUnion, collection, query, where, onSnapshot, addDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BsThreeDots, BsBookmark, BsBookmarkFill } from 'react-icons/bs';
import { AiOutlineHeart, AiFillHeart, AiOutlineComment, AiOutlineSend } from 'react-icons/ai';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';

interface Post {
  id: string;
  authorId: string;
  authorUsername: string;
  authorProfilePic?: string;
  caption?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  likes: string[];
  commentsCount: number;
  timestamp: any;
}

interface Comment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  userProfilePic?: string;
  text: string;
  timestamp: any;
}

interface PostViewerModalProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  isOwnPost?: boolean;
  onPostDeleted?: () => void;
}

const PostViewerModal = ({ 
  post, 
  isOpen, 
  onClose, 
  currentUserId,
  isOwnPost,
  onPostDeleted 
}: PostViewerModalProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isLiked, setIsLiked] = useState(
    post && currentUserId ? post.likes.includes(currentUserId) : false
  );
  const [isSaved, setIsSaved] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    if (!post || !isOpen) return;

    // Fetch comments
    const commentsQuery = query(
      collection(db, 'comments'),
      where('postId', '==', post.id)
    );

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];

      // Sort by timestamp
      commentsData.sort((a, b) => {
        const dateA = getTimestampDate(a.timestamp);
        const dateB = getTimestampDate(b.timestamp);
        return dateA.getTime() - dateB.getTime();
      });

      setComments(commentsData);
    });

    return () => unsubscribe();
  }, [post, isOpen]);

  useEffect(() => {
    if (post && currentUserId) {
      setIsLiked(post.likes.includes(currentUserId));
      checkIfSaved();
    }
  }, [post, currentUserId]);

  const checkIfSaved = async () => {
    if (!currentUserId) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUserId));
      const savedPosts = userDoc.data()?.savedPosts || [];
      setIsSaved(savedPosts.includes(post?.id));
    } catch (error) {
      console.error('Error checking saved status:', error);
    }
  };

  if (!post) return null;

  // Helper function to convert timestamp to Date object
  const getTimestampDate = (timestamp: any): Date => {
    if (!timestamp) return new Date();
    if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    if (timestamp instanceof Date) return timestamp;
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return new Date();
    return date;
  };

  const handleDelete = async () => {
    if (!isOwnPost || !currentUserId) return;

    setDeleting(true);
    try {
      // Delete the post document
      await deleteDoc(doc(db, 'posts', post.id));

      // Remove post from all users' savedPosts arrays
      // Note: This is a simplified version. In production, you might want to use Cloud Functions
      toast.success('Post deleted successfully');
      
      setShowDeleteDialog(false);
      onClose();
      onPostDeleted?.();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    } finally {
      setDeleting(false);
    }
  };

  const handleLike = async () => {
    if (!currentUserId) {
      toast.error('Please sign in to like posts');
      return;
    }

    try {
      const postRef = doc(db, 'posts', post.id);
      
      if (isLiked) {
        await updateDoc(postRef, {
          likes: arrayRemove(currentUserId)
        });
        setIsLiked(false);
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(currentUserId)
        });
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleSave = async () => {
    if (!currentUserId) {
      toast.error('Please sign in to save posts');
      return;
    }

    try {
      const userRef = doc(db, 'users', currentUserId);
      
      if (isSaved) {
        await updateDoc(userRef, {
          savedPosts: arrayRemove(post.id)
        });
        setIsSaved(false);
        toast.success('Post removed from saved');
      } else {
        await updateDoc(userRef, {
          savedPosts: arrayUnion(post.id)
        });
        setIsSaved(true);
        toast.success('Post saved!');
      }
    } catch (error) {
      console.error('Error saving post:', error);
      toast.error('Failed to save post');
    }
  };

  const handlePostComment = async () => {
    if (!currentUserId || !newComment.trim()) return;

    setPostingComment(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUserId));
      const userData = userDoc.data();

      await addDoc(collection(db, 'comments'), {
        postId: post.id,
        userId: currentUserId,
        username: userData?.username || 'User',
        userProfilePic: userData?.profilePicUrl || '',
        text: newComment.trim(),
        timestamp: new Date().toISOString()
      });

      // Increment comment count
      await updateDoc(doc(db, 'posts', post.id), {
        commentsCount: increment(1)
      });

      setNewComment('');
      toast.success('Comment posted!');
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!currentUserId) return;

    try {
      await deleteDoc(doc(db, 'comments', commentId));
      
      // Decrement comment count
      await updateDoc(doc(db, 'posts', post.id), {
        commentsCount: increment(-1)
      });

      toast.success('Comment deleted');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl w-full h-[90vh] p-0 gap-0 overflow-hidden">
          <div className="flex flex-col md:flex-row h-full">
            {/* Media Section */}
            <div className="flex-1 bg-black flex items-center justify-center relative md:h-full h-[50vh]">
              {post.mediaType === 'video' ? (
                <video
                  src={post.mediaUrl}
                  controls
                  className="max-w-full max-h-full object-contain"
                  autoPlay
                  loop
                />
              ) : (
                <img
                  src={post.mediaUrl}
                  alt="Post"
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>

            {/* Info Section - Instagram-like design */}
            <div className="flex flex-col w-full md:w-96 lg:w-[400px] bg-card">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={post.authorProfilePic} />
                    <AvatarFallback>
                      {post.authorUsername[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-semibold text-sm">{post.authorUsername}</span>
                </div>
                
                {isOwnPost && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <BsThreeDots size={20} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-destructive focus:text-destructive cursor-pointer"
                      >
                        Delete Post
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Comments Section - Scrollable */}
              <ScrollArea className="flex-1 p-4">
                {/* Caption as first comment */}
                {post.caption && (
                  <div className="flex gap-3 mb-4">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={post.authorProfilePic} />
                      <AvatarFallback>
                        {post.authorUsername[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-semibold mr-2">{post.authorUsername}</span>
                        {post.caption}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(getTimestampDate(post.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Comments List */}
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 mb-4 group">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={comment.userProfilePic} />
                      <AvatarFallback>
                        {comment.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-semibold mr-2">{comment.username}</span>
                        {comment.text}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(getTimestampDate(comment.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                    {/* Delete button - only for comment owner */}
                    {comment.userId === currentUserId && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        aria-label="Delete comment"
                      >
                        <BsThreeDots size={16} />
                      </button>
                    )}
                  </div>
                ))}

                {comments.length === 0 && !post.caption && (
                  <div className="text-center text-muted-foreground py-8">
                    <p className="text-sm">No comments yet</p>
                    <p className="text-xs mt-1">Be the first to comment</p>
                  </div>
                )}
              </ScrollArea>

              {/* Actions Bar */}
              <div className="border-t p-4 space-y-3">
                {/* Like, Comment, Share, Save buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleLike}
                      className="hover:opacity-70 transition"
                    >
                      {isLiked ? (
                        <AiFillHeart size={24} className="text-red-500" />
                      ) : (
                        <AiOutlineHeart size={24} />
                      )}
                    </button>
                    <button className="hover:opacity-70 transition">
                      <AiOutlineComment size={24} />
                    </button>
                    <button className="hover:opacity-70 transition">
                      <AiOutlineSend size={24} />
                    </button>
                  </div>
                  <button
                    onClick={handleSave}
                    className="hover:opacity-70 transition"
                  >
                    {isSaved ? (
                      <BsBookmarkFill size={24} />
                    ) : (
                      <BsBookmark size={24} />
                    )}
                  </button>
                </div>

                {/* Likes count */}
                <p className="font-semibold text-sm">
                  {post.likes.length} {post.likes.length === 1 ? 'like' : 'likes'}
                </p>

                {/* Timestamp */}
                <p className="text-xs text-muted-foreground uppercase">
                  {formatDistanceToNow(getTimestampDate(post.timestamp), { addSuffix: true })}
                </p>
              </div>

              {/* Add Comment Input */}
              <div className="border-t p-4">
                <div className="flex items-center gap-2">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 border-none focus-visible:ring-0"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !postingComment) {
                        handlePostComment();
                      }
                    }}
                    disabled={postingComment}
                  />
                  <Button
                    onClick={handlePostComment}
                    disabled={!newComment.trim() || postingComment}
                    variant="ghost"
                    className="text-primary font-semibold"
                  >
                    {postingComment ? 'Posting...' : 'Post'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PostViewerModal;

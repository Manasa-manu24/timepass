import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Comment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  userProfilePic?: string;
  text: string;
  timestamp: any;
}

interface CommentsDialogProps {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CommentsDialog = ({ postId, open, onOpenChange }: CommentsDialogProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!open || !postId) return;

    setLoading(true);
    // Remove orderBy to avoid index requirement
    const commentsQuery = query(
      collection(db, 'comments'),
      where('postId', '==', postId)
    );

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      
      // Sort comments client-side by timestamp (newest first)
      const sortedComments = commentsData.sort((a, b) => {
        const getTime = (timestamp: any): number => {
          if (!timestamp) return 0;
          if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
            return timestamp.toDate().getTime();
          }
          if (timestamp instanceof Date) {
            return timestamp.getTime();
          }
          const date = new Date(timestamp);
          return isNaN(date.getTime()) ? 0 : date.getTime();
        };
        return getTime(b.timestamp) - getTime(a.timestamp);
      });
      
      setComments(sortedComments);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [postId, open]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commentText.trim() || !user) return;

    setPosting(true);

    try {
      // Get user data
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      // Add comment
      await addDoc(collection(db, 'comments'), {
        postId,
        userId: user.uid,
        username: userData?.username || 'Anonymous',
        userProfilePic: userData?.profilePicUrl || '',
        text: commentText.trim(),
        timestamp: new Date()
      });

      // Update comments count on post
      await updateDoc(doc(db, 'posts', postId), {
        commentsCount: increment(1)
      });

      setCommentText('');
      toast.success('Comment posted!');
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Comments</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={comment.userProfilePic} />
                    <AvatarFallback>
                      {comment.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{comment.username}</span>
                      <span className="text-xs text-muted-foreground">
                        {comment.timestamp ? (() => {
                          try {
                            const date = comment.timestamp?.toDate ? 
                              comment.timestamp.toDate() : 
                              new Date(comment.timestamp);
                            return formatDistanceToNow(date, { addSuffix: true });
                          } catch {
                            return 'Just now';
                          }
                        })() : 'Just now'}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handlePostComment} className="p-4 border-t flex gap-2">
          <Input
            placeholder="Add a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            disabled={posting}
          />
          <Button type="submit" disabled={!commentText.trim() || posting}>
            {posting ? 'Posting...' : 'Post'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CommentsDialog;

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface User {
  uid: string;
  username: string;
  displayName: string;
  profilePicUrl?: string;
}

interface FollowersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userIds: string[];
  title: 'Followers' | 'Following';
  currentProfileUserId: string;
}

const FollowersDialog = ({ open, onOpenChange, userIds, title, currentProfileUserId }: FollowersDialogProps) => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingStates, setFollowingStates] = useState<{ [key: string]: boolean }>({});
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const fetchUsers = async () => {
      if (!open || userIds.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const usersData: User[] = [];
        for (const userId of userIds) {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            usersData.push({
              uid: userId,
              ...userDoc.data()
            } as User);
          }
        }
        setUsers(usersData);

        // Check following states for current user
        if (currentUser) {
          const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
          const following = currentUserDoc.data()?.following || [];
          const states: { [key: string]: boolean } = {};
          usersData.forEach(user => {
            states[user.uid] = following.includes(user.uid);
          });
          setFollowingStates(states);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [open, userIds, currentUser]);

  const handleFollow = async (targetUserId: string) => {
    if (!currentUser) {
      toast.error('Please sign in to follow users');
      return;
    }

    setActionLoading({ ...actionLoading, [targetUserId]: true });

    try {
      const currentUserRef = doc(db, 'users', currentUser.uid);
      const targetUserRef = doc(db, 'users', targetUserId);
      const isFollowing = followingStates[targetUserId];

      if (isFollowing) {
        // Unfollow
        await updateDoc(currentUserRef, {
          following: arrayRemove(targetUserId)
        });
        await updateDoc(targetUserRef, {
          followers: arrayRemove(currentUser.uid)
        });
        setFollowingStates({ ...followingStates, [targetUserId]: false });
        toast.success('Unfollowed successfully');
      } else {
        // Follow
        await updateDoc(currentUserRef, {
          following: arrayUnion(targetUserId)
        });
        await updateDoc(targetUserRef, {
          followers: arrayUnion(currentUser.uid)
        });
        setFollowingStates({ ...followingStates, [targetUserId]: true });
        toast.success('Followed successfully');
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
      toast.error('Failed to update follow status');
    } finally {
      setActionLoading({ ...actionLoading, [targetUserId]: false });
    }
  };

  const handleUserClick = (userId: string) => {
    onOpenChange(false);
    navigate(`/profile/${userId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[400px] w-full pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">No {title.toLowerCase()} yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.uid} className="flex items-center justify-between gap-3">
                  <div 
                    className="flex items-center gap-3 flex-1 cursor-pointer hover:opacity-70 transition-opacity"
                    onClick={() => handleUserClick(user.uid)}
                  >
                    <Avatar className="w-11 h-11">
                      <AvatarImage src={user.profilePicUrl} />
                      <AvatarFallback>
                        {user.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">{user.username}</span>
                      <span className="text-xs text-muted-foreground">{user.displayName}</span>
                    </div>
                  </div>
                  {currentUser && user.uid !== currentUser.uid && (
                    <Button
                      variant={followingStates[user.uid] ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleFollow(user.uid)}
                      disabled={actionLoading[user.uid]}
                    >
                      {actionLoading[user.uid] 
                        ? 'Loading...' 
                        : followingStates[user.uid] 
                        ? 'Unfollow' 
                        : 'Follow'
                      }
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default FollowersDialog;

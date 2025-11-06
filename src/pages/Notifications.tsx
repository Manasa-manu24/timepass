import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import TopBar from '@/components/TopBar';
import MobileBottomNav from '@/components/MobileBottomNav';
import DesktopSidebar from '@/components/DesktopSidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { AiOutlineArrowLeft } from 'react-icons/ai';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'follow';
  senderId: string;
  senderUsername: string;
  senderProfilePic?: string;
  postId?: string;
  timestamp: any;
  read: boolean;
}

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const notifQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(notifQuery, (snapshot) => {
      const notifData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      
      notifData.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds);
      setNotifications(notifData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), {
        read: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationText = (notif: Notification) => {
    switch (notif.type) {
      case 'like':
        return 'liked your post';
      case 'comment':
        return 'commented on your post';
      case 'follow':
        return 'started following you';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar showBackButton />
      <DesktopSidebar />
      
      <main className="lg:ml-64 xl:ml-72 max-w-2xl mx-auto pt-14 lg:pt-0 pb-20 lg:pb-0">
        {/* Desktop Back Button */}
        <div className="hidden lg:flex items-center gap-3 p-4 border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            aria-label="Back to home"
          >
            <AiOutlineArrowLeft size={24} />
          </Button>
          <h1 className="text-xl font-semibold">Notifications</h1>
        </div>

        {/* Mobile Title */}
        <div className="lg:hidden border-b border-border p-4">
          <h1 className="text-xl font-semibold">Notifications</h1>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div>
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => !notif.read && markAsRead(notif.id)}
                className={`flex items-center gap-3 p-4 border-b border-border hover:bg-accent transition cursor-pointer ${
                  !notif.read ? 'bg-accent/50' : ''
                }`}
              >
                <Avatar className="w-11 h-11">
                  <AvatarImage src={notif.senderProfilePic} />
                  <AvatarFallback>
                    {notif.senderUsername[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-semibold">{notif.senderUsername}</span>{' '}
                    {getNotificationText(notif)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {notif.timestamp && notif.timestamp.toDate ? 
                      formatDistanceToNow(notif.timestamp.toDate(), { addSuffix: true }) : 
                      'Just now'
                    }
                  </p>
                </div>
                {!notif.read && (
                  <div className="w-2 h-2 bg-primary rounded-full" aria-label="Unread" />
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default Notifications;

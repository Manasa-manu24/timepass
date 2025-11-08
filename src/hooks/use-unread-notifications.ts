import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export const useUnreadNotifications = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    // Listen to unread notifications (excluding messages since they're shown separately)
    const notifQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(notifQuery, (snapshot) => {
      // Filter out message notifications since they're not shown in Notifications page
      const nonMessageNotifs = snapshot.docs.filter(doc => {
        const data = doc.data();
        return data.type !== 'message';
      });
      setUnreadCount(nonMessageNotifs.length);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { unreadCount, loading };
};

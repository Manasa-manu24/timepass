import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc as firestoreDoc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    // Listen to all chats where the user is a participant
    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
      try {
        let totalUnread = 0;

        // Check each chat for unread messages
        for (const chatDoc of snapshot.docs) {
          const chatData = chatDoc.data();
          const chatId = chatDoc.id;

          // Skip if there's no last message
          if (!chatData.lastMessage || !chatData.lastMessageSender) {
            continue;
          }

          // Only count as unread if the last message was NOT sent by the current user
          // This means someone else sent the most recent message
          if (chatData.lastMessageSender !== user.uid) {
            // Check if the user has read this message by looking at the chat's messages
            // For simplicity, we'll count it as unread if the last sender is not the current user
            // In a more advanced implementation, you could track read receipts
            totalUnread++;
          }
        }

        setUnreadCount(totalUnread);
        setLoading(false);
      } catch (error) {
        console.error('Error calculating unread messages:', error);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user]);

  return { unreadCount, loading };
};

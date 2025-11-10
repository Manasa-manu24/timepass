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

          // Only check if the last message was NOT sent by the current user
          if (chatData.lastMessageSender !== user.uid) {
            // Check the actual messages to see if they've been read
            const messagesRef = collection(db, 'chats', chatId, 'messages');
            const messagesQuery = query(messagesRef, where('senderId', '==', chatData.lastMessageSender));
            const messagesSnapshot = await getDocs(messagesQuery);
            
            // Check if there are any messages from the other user that haven't been seen
            let hasUnreadMessages = false;
            for (const msgDoc of messagesSnapshot.docs) {
              const msgData = msgDoc.data();
              const seenBy = msgData.seenBy || [];
              
              // If this message hasn't been seen by the current user, it's unread
              if (!seenBy.includes(user.uid)) {
                hasUnreadMessages = true;
                break;
              }
            }
            
            if (hasUnreadMessages) {
              totalUnread++;
            }
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

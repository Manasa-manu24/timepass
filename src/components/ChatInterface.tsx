import { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AiOutlineSend, AiOutlineArrowLeft } from 'react-icons/ai';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
}

interface ChatInterfaceProps {
  recipientId: string;
  recipientUsername: string;
  recipientProfilePic?: string;
  onBack: () => void;
}

const ChatInterface = ({ recipientId, recipientUsername, recipientProfilePic, onBack }: ChatInterfaceProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Generate chat ID (consistent for both users)
  const getChatId = () => {
    if (!user) return '';
    const ids = [user.uid, recipientId].sort();
    return `${ids[0]}_${ids[1]}`;
  };

  const chatId = getChatId();

  useEffect(() => {
    if (!chatId) return;

    // Create chat document if it doesn't exist
    const initializeChat = async () => {
      const chatRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);
      
      if (!chatDoc.exists()) {
        await setDoc(chatRef, {
          participants: [user!.uid, recipientId],
          createdAt: serverTimestamp(),
          lastMessage: null,
          lastMessageTime: null
        });
      }
    };

    initializeChat();

    // Listen to messages
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(messagesData);
    });

    return () => unsubscribe();
  }, [chatId, user, recipientId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user || sending) return;

    setSending(true);

    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      
      // Add message to subcollection
      await addDoc(messagesRef, {
        text: newMessage.trim(),
        senderId: user.uid,
        timestamp: serverTimestamp()
      });

      // Update chat document with last message info
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        lastMessage: newMessage.trim(),
        lastMessageTime: serverTimestamp(),
        lastMessageSender: user.uid
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const getTimestampDate = (timestamp: any): Date => {
    if (!timestamp) return new Date();
    if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    if (timestamp instanceof Date) return timestamp;
    return new Date(timestamp);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="lg:hidden"
        >
          <AiOutlineArrowLeft size={24} />
        </Button>
        <Avatar className="w-10 h-10">
          <AvatarImage src={recipientProfilePic} />
          <AvatarFallback>
            {recipientUsername[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="font-semibold">{recipientUsername}</h2>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Send a message to start the conversation
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.senderId === user?.uid;
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      isOwnMessage
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <p className="text-sm break-words">{message.text}</p>
                    <p className={`text-xs mt-1 ${isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {formatDistanceToNow(getTimestampDate(message.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-card">
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newMessage.trim() || sending}
          >
            <AiOutlineSend size={20} />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;

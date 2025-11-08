import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
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
  updateDoc,
  arrayUnion,
  where,
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AiOutlineSend, AiOutlineArrowLeft } from 'react-icons/ai';
import { BsCheckAll, BsThreeDots } from 'react-icons/bs';
import { MdEdit, MdContentCopy, MdDelete } from 'react-icons/md';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
  seenBy?: string[]; // Array of user IDs who have seen this message
  seenAt?: any; // Timestamp when message was seen
  isStoryReply?: boolean; // Flag if message is a reply to a story
  storyId?: string; // Reference to the story being replied to
  isEdited?: boolean; // Flag if message has been edited
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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
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

  // Mark messages as seen when viewing the chat
  useEffect(() => {
    if (!chatId || !user || messages.length === 0) return;

    const markMessagesAsSeen = async () => {
      try {
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        
        // Find messages sent by the other user that haven't been seen by current user
        const unseenMessages = messages.filter(msg => 
          msg.senderId !== user.uid && 
          (!msg.seenBy || !msg.seenBy.includes(user.uid))
        );

        // Mark each unseen message as seen
        for (const message of unseenMessages) {
          const messageRef = doc(db, 'chats', chatId, 'messages', message.id);
          await updateDoc(messageRef, {
            seenBy: arrayUnion(user.uid),
            seenAt: serverTimestamp()
          });
        }
      } catch (error) {
        console.error('Error marking messages as seen:', error);
      }
    };

    // Mark messages as seen after a short delay to ensure they're actually viewed
    const timer = setTimeout(markMessagesAsSeen, 1000);
    return () => clearTimeout(timer);
  }, [chatId, user, messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user || sending) return;

    setSending(true);

    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const messageText = newMessage.trim();
      
      // Add message to subcollection
      await addDoc(messagesRef, {
        text: messageText,
        senderId: user.uid,
        timestamp: serverTimestamp(),
        seenBy: [user.uid], // Sender has "seen" their own message
        seenAt: null
      });

      // Update chat document with last message info
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        lastMessage: messageText,
        lastMessageTime: serverTimestamp(),
        lastMessageSender: user.uid
      });

      // Create notification for the recipient
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();

        await addDoc(collection(db, 'notifications'), {
          userId: recipientId,
          type: 'message',
          senderId: user.uid,
          senderUsername: userData?.username || user.email?.split('@')[0] || 'Someone',
          senderProfilePic: userData?.profilePicUrl || '',
          messagePreview: messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText,
          timestamp: serverTimestamp(),
          read: false
        });
      } catch (notifError) {
        console.error('Error creating message notification:', notifError);
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = async (messageId: string, newText: string) => {
    if (!newText.trim()) return;

    try {
      const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
      await updateDoc(messageRef, {
        text: newText.trim(),
        isEdited: true
      });

      setEditingMessageId(null);
      setEditingText('');
      toast.success('Message edited');
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error('Failed to edit message');
    }
  };

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Message copied to clipboard');
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
      await deleteDoc(messageRef);
      toast.success('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const startEditing = (message: Message) => {
    setEditingMessageId(message.id);
    setEditingText(message.text);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditingText('');
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
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* Header - Only show on desktop, hidden on mobile (parent Messages.tsx has header) */}
      <div className="hidden lg:flex flex-shrink-0 items-center gap-3 p-4 border-b border-border bg-card">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
        >
          <AiOutlineArrowLeft size={24} />
        </Button>
        <Link 
          to={`/profile/${recipientId}`}
          className="flex items-center gap-3 flex-1 hover:opacity-70 transition-opacity"
        >
          <Avatar className="w-10 h-10">
            <AvatarImage src={recipientProfilePic} />
            <AvatarFallback>
              {recipientUsername[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h2 className="font-semibold">{recipientUsername}</h2>
        </Link>
      </div>

      {/* Messages - Scrollable area that takes remaining space */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 space-y-4">
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
              const isSeen = message.seenBy && message.seenBy.length > 1; // More than just sender
              const isEditing = editingMessageId === message.id;
              
              return (
                <div
                  key={message.id}
                  className={`flex group ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="relative">
                    {/* Story Reply Indicator */}
                    {message.isStoryReply && (
                      <div className={`text-xs mb-1 flex items-center gap-1 ${
                        isOwnMessage ? 'justify-end text-muted-foreground' : 'justify-start text-muted-foreground'
                      }`}>
                        <span className="italic">↩️ Replied to story</span>
                      </div>
                    )}
                    
                    <div className="flex items-start gap-2">
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          isOwnMessage
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {isEditing ? (
                          <div className="space-y-2">
                            <Input
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="text-sm"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleEditMessage(message.id, editingText)}
                                disabled={!editingText.trim()}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEditing}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm break-words">{message.text}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className={`text-xs ${isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                {formatDistanceToNow(getTimestampDate(message.timestamp), { addSuffix: true })}
                              </p>
                              {message.isEdited && (
                                <span className={`text-xs ${isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                  (edited)
                                </span>
                              )}
                              {isOwnMessage && isSeen && (
                                <div className="flex items-center gap-1">
                                  <BsCheckAll className={`text-sm ${isOwnMessage ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                                  <span className={`text-xs ${isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                    Seen
                                  </span>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                      
                      {/* Message Actions Menu */}
                      {!isEditing && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                            >
                              <BsThreeDots size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={isOwnMessage ? "end" : "start"}>
                            <DropdownMenuItem onClick={() => handleCopyMessage(message.text)}>
                              <MdContentCopy className="mr-2" size={16} />
                              Copy
                            </DropdownMenuItem>
                            {isOwnMessage && (
                              <>
                                <DropdownMenuItem onClick={() => startEditing(message)}>
                                  <MdEdit className="mr-2" size={16} />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteMessage(message.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <MdDelete className="mr-2" size={16} />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input - Fixed at bottom */}
      <form 
        onSubmit={handleSendMessage} 
        className="flex-shrink-0 p-4 border-t border-border bg-card"
      >
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending}
            className="flex-1"
            autoComplete="off"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newMessage.trim() || sending}
            aria-label="Send message"
          >
            <AiOutlineSend size={20} />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;

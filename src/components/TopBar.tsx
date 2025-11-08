import { Link, useNavigate } from 'react-router-dom';
import { AiOutlineHeart, AiOutlineSend, AiOutlineArrowLeft } from 'react-icons/ai';
import { MdOutlineLightMode, MdOutlineDarkMode } from 'react-icons/md';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useUnreadMessages } from '@/hooks/use-unread-messages';
import { useUnreadNotifications } from '@/hooks/use-unread-notifications';

const TopBar = ({ title, showBackButton }: { title?: string; showBackButton?: boolean }) => {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { unreadCount: messageCount } = useUnreadMessages();
  const { unreadCount: notificationCount } = useUnreadNotifications();

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card/98 backdrop-blur-xl border-b border-border z-50 shadow-sm">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left - Back Button or Logo */}
        {showBackButton ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            aria-label="Back to home"
            className="hover:bg-accent transition-all duration-200 active:scale-95"
          >
            <AiOutlineArrowLeft size={24} />
          </Button>
        ) : (
          <Link to="/" className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
            Timepass
          </Link>
        )}

        {/* Center - Optional Title */}
        {title && (
          <h1 className="text-base font-semibold">{title}</h1>
        )}

        {/* Right - Theme Toggle, Notifications & Messages */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="hover:bg-accent transition-all duration-200 active:scale-95"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <MdOutlineLightMode size={22} />
            ) : (
              <MdOutlineDarkMode size={22} />
            )}
          </Button>

          <Link 
            to="/notifications" 
            className="relative hover:opacity-80 transition-all duration-200 active:scale-95 p-2"
            aria-label={`Notifications ${notificationCount > 0 ? `(${notificationCount} unread)` : ''}`}
          >
            <AiOutlineHeart size={24} />
            {notificationCount > 0 && (
              <span 
                className="absolute top-0 right-0 w-5 h-5 bg-destructive text-destructive-foreground text-xs flex items-center justify-center rounded-full font-semibold animate-in zoom-in"
                aria-live="polite"
              >
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </Link>

          <Link 
            to="/messages" 
            className="relative hover:opacity-80 transition-all duration-200 active:scale-95 p-2"
            aria-label={`Messages ${messageCount > 0 ? `(${messageCount} unread)` : ''}`}
          >
            <AiOutlineSend size={24} />
            {messageCount > 0 && (
              <span 
                className="absolute top-0 right-0 w-5 h-5 bg-destructive text-destructive-foreground text-xs flex items-center justify-center rounded-full font-semibold animate-in zoom-in"
                aria-live="polite"
              >
                {messageCount > 9 ? '9+' : messageCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
};

export default TopBar;

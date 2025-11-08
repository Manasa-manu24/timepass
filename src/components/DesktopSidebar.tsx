import { Link, useLocation } from 'react-router-dom';
import { AiOutlineHome, AiFillHome, AiOutlineSetting, AiOutlineLogout, AiOutlineHeart, AiFillHeart } from 'react-icons/ai';
import { BsCameraReels, BsCameraReelsFill, BsBookmark, BsBookmarkFill } from 'react-icons/bs';
import { IoChatbubbleOutline, IoChatbubble } from 'react-icons/io5';
import { MdOutlineLightMode, MdOutlineDarkMode } from 'react-icons/md';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { useTheme } from 'next-themes';
import { useUnreadMessages } from '@/hooks/use-unread-messages';
import { useUnreadNotifications } from '@/hooks/use-unread-notifications';
import UploadModal from './UploadModal';
import { Search } from 'lucide-react';

const DesktopSidebar = () => {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { unreadCount: unreadMessages } = useUnreadMessages();
  const { unreadCount: unreadNotifications } = useUnreadNotifications();
  const location = useLocation();
  const [uploadOpen, setUploadOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const NavItem = ({ 
    to, 
    icon: Icon, 
    activeIcon: ActiveIcon, 
    label, 
    onClick,
    badge
  }: { 
    to?: string; 
    icon: any; 
    activeIcon?: any; 
    label: string; 
    onClick?: () => void;
    badge?: number;
  }) => {
    const active = to && isActive(to);
    const IconComponent = active && ActiveIcon ? ActiveIcon : Icon;

    const content = (
      <div className={`flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-accent transition-all duration-200 active:scale-95 ${active ? 'font-semibold bg-accent/50' : ''}`}>
        <div className="relative">
          <IconComponent size={28} className={active ? 'text-primary' : ''} />
          {badge !== undefined && badge > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center p-0 px-1 text-xs animate-in zoom-in"
            >
              {badge > 99 ? '99+' : badge}
            </Badge>
          )}
        </div>
        <span className="text-base">{label}</span>
      </div>
    );

    if (onClick) {
      return (
        <button onClick={onClick} className="w-full text-left" aria-label={label}>
          {content}
        </button>
      );
    }

    return (
      <Link to={to!} aria-label={label}>
        {content}
      </Link>
    );
  };

  return (
    <>
      <aside className="hidden lg:block fixed left-0 top-0 bottom-0 w-64 xl:w-72 bg-card/95 backdrop-blur-xl border-r border-border z-40 shadow-sm">
        <div className="flex flex-col h-full p-3">
          {/* Logo */}
          <Link to="/" className="text-2xl font-bold px-3 py-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
            Timepass
          </Link>

          {/* Navigation */}
          <nav className="flex-1 space-y-1" aria-label="Desktop navigation">
            <NavItem to="/" icon={AiOutlineHome} activeIcon={AiFillHome} label="Home" />
            <NavItem to="/search" icon={Search} label="Search" />
            <NavItem to="/reels" icon={BsCameraReels} activeIcon={BsCameraReelsFill} label="Reels" />
            <NavItem to="/messages" icon={IoChatbubbleOutline} activeIcon={IoChatbubble} label="Messages" badge={unreadMessages} />
            <NavItem to="/notifications" icon={AiOutlineHeart} activeIcon={AiFillHeart} label="Notifications" badge={unreadNotifications} />
            
            {/* Upload Button - Prominent */}
            <button
              onClick={() => setUploadOpen(true)}
              className="w-full px-3 py-3 mt-2 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 active:scale-95 font-medium"
              aria-label="Create new post"
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">+</span>
                <span className="text-base">Create</span>
              </div>
            </button>

            <NavItem to="/saved" icon={BsBookmark} activeIcon={BsBookmarkFill} label="Saved" />
            <NavItem to={`/profile/${user?.uid}`} icon={() => (
              <Avatar className={`w-7 h-7 ${isActive(`/profile/${user?.uid}`) ? 'ring-2 ring-foreground' : ''}`}>
                <AvatarImage src="" />
                <AvatarFallback className="text-xs">
                  {user?.email?.[0].toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            )} label="Profile" />
          </nav>

          {/* Bottom Actions */}
          <div className="space-y-1 border-t border-border pt-3">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-full text-left"
              aria-label="Toggle theme"
            >
              <div className="flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-accent transition-colors">
                {theme === 'dark' ? (
                  <>
                    <MdOutlineLightMode size={28} />
                    <span className="text-base">Light Mode</span>
                  </>
                ) : (
                  <>
                    <MdOutlineDarkMode size={28} />
                    <span className="text-base">Dark Mode</span>
                  </>
                )}
              </div>
            </button>
            <NavItem to="/settings" icon={AiOutlineSetting} label="Settings" />
            <NavItem icon={AiOutlineLogout} label="Logout" onClick={signOut} />
          </div>
        </div>
      </aside>

      <UploadModal open={uploadOpen} onOpenChange={setUploadOpen} />
    </>
  );
};

export default DesktopSidebar;

import { Link, useLocation } from 'react-router-dom';
import { AiOutlineHome, AiFillHome, AiOutlineSearch, AiOutlineCompass, AiOutlinePlusCircle } from 'react-icons/ai';
import { BsCameraReels, BsCameraReelsFill } from 'react-icons/bs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import UploadSheet from './UploadSheet';

const MobileBottomNav = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [uploadOpen, setUploadOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <nav 
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40"
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around h-16 px-2 safe-bottom">
          <Link 
            to="/" 
            className="flex items-center justify-center w-14 h-14 hover:opacity-70 transition"
            aria-label="Home"
            role="tab"
            aria-selected={isActive('/')}
          >
            {isActive('/') ? <AiFillHome size={28} /> : <AiOutlineHome size={28} />}
          </Link>

          <Link 
            to="/search" 
            className="flex items-center justify-center w-14 h-14 hover:opacity-70 transition"
            aria-label="Search"
            role="tab"
            aria-selected={isActive('/search')}
          >
            <AiOutlineSearch size={28} />
          </Link>

          {/* Create/Upload Button */}
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center justify-center w-14 h-14 hover:opacity-70 transition"
            aria-label="Upload content"
            role="tab"
          >
            <AiOutlinePlusCircle size={28} />
          </button>

          <Link 
            to="/reels" 
            className="flex items-center justify-center w-14 h-14 hover:opacity-70 transition"
            aria-label="Reels"
            role="tab"
            aria-selected={isActive('/reels')}
          >
            {isActive('/reels') ? <BsCameraReelsFill size={28} /> : <BsCameraReels size={28} />}
          </Link>

          <Link 
            to={`/profile/${user?.uid}`}
            className="flex items-center justify-center w-14 h-14 hover:opacity-70 transition"
            aria-label="Profile"
            role="tab"
            aria-selected={isActive(`/profile/${user?.uid}`)}
          >
            <Avatar className={`w-7 h-7 ${isActive(`/profile/${user?.uid}`) ? 'ring-2 ring-foreground' : ''}`}>
              <AvatarImage src="" />
              <AvatarFallback className="text-xs">
                {user?.email?.[0].toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </nav>

      <UploadSheet open={uploadOpen} onOpenChange={setUploadOpen} />
    </>
  );
};

export default MobileBottomNav;

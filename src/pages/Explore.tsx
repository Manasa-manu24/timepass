import TopBar from '@/components/TopBar';
import MobileBottomNav from '@/components/MobileBottomNav';
import DesktopSidebar from '@/components/DesktopSidebar';
import { AiOutlineCompass } from 'react-icons/ai';

const Explore = () => {
  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Explore" />
      <DesktopSidebar />
      
      <main className="lg:ml-64 xl:ml-72 pt-14 lg:pt-0 pb-20 lg:pb-0">
        <div className="max-w-5xl mx-auto py-8 px-4">
          <div className="text-center py-12">
            <AiOutlineCompass size={64} className="mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">Explore</h1>
            <p className="text-muted-foreground">Discover new content</p>
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default Explore;

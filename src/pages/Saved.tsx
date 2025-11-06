import TopBar from '@/components/TopBar';
import MobileBottomNav from '@/components/MobileBottomNav';
import DesktopSidebar from '@/components/DesktopSidebar';
import { BsBookmark } from 'react-icons/bs';

const Saved = () => {
  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Saved" />
      <DesktopSidebar />
      
      <main className="lg:ml-64 xl:ml-72 pt-14 lg:pt-0 pb-20 lg:pb-0">
        <div className="max-w-4xl mx-auto p-4">
          <div className="text-center py-12">
            <BsBookmark size={64} className="mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Saved Posts</h2>
            <p className="text-muted-foreground">
              Save posts to view them later
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              No saved posts yet
            </p>
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default Saved;

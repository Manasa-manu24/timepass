import TopBar from '@/components/TopBar';
import MobileBottomNav from '@/components/MobileBottomNav';
import DesktopSidebar from '@/components/DesktopSidebar';
import { AiOutlineSetting } from 'react-icons/ai';

const Settings = () => {
  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Settings" />
      <DesktopSidebar />
      
      <main className="lg:ml-64 xl:ml-72 pt-14 lg:pt-0 pb-20 lg:pb-0">
        <div className="max-w-4xl mx-auto p-4">
          <div className="text-center py-12">
            <AiOutlineSetting size={64} className="mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Settings</h2>
            <p className="text-muted-foreground">
              Manage your account settings
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Settings page coming soon!
            </p>
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default Settings;

import TopBar from '@/components/TopBar';
import MobileBottomNav from '@/components/MobileBottomNav';
import DesktopSidebar from '@/components/DesktopSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AiOutlineUser, AiOutlineMail, AiOutlineLogout, AiOutlineSafety } from 'react-icons/ai';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Settings = () => {
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Settings" />
      <DesktopSidebar />
      
      <main className="lg:ml-64 xl:ml-72 pt-14 lg:pt-0 pb-20 lg:pb-0">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-xl">
                    {user?.email?.[0].toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AiOutlineUser className="text-muted-foreground" />
                    <span className="font-medium">
                      {user?.displayName || 'User'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AiOutlineMail className="text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {user?.email}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
              <CardDescription>Manage your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AiOutlineSafety />
                  <span>Your account is secured with Firebase Authentication</span>
                </div>
                <Separator />
                <div className="pt-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full sm:w-auto">
                        <AiOutlineLogout className="mr-2" size={18} />
                        Logout
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
                        <AlertDialogDescription>
                          You will need to sign in again to access your account.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleLogout}>
                          Logout
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session Information */}
          <Card>
            <CardHeader>
              <CardTitle>Session Information</CardTitle>
              <CardDescription>Your login session details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium text-green-600">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Persistence:</span>
                  <span className="font-medium">Enabled</span>
                </div>
                <p className="text-xs text-muted-foreground pt-2">
                  Your session will remain active until you logout. Close the browser and reopen to verify persistence.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default Settings;

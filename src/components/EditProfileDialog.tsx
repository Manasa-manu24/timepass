import { useState, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AiOutlineCamera } from 'react-icons/ai';

interface EditProfileDialogProps {
  userId: string;
  currentUsername: string;
  currentDisplayName: string;
  currentBio: string;
  currentProfilePic: string;
  onProfileUpdate: () => void;
}

const EditProfileDialog = ({
  userId,
  currentUsername,
  currentDisplayName,
  currentBio,
  currentProfilePic,
  onProfileUpdate,
}: EditProfileDialogProps) => {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [bio, setBio] = useState(currentBio);
  const [profilePic, setProfilePic] = useState(currentProfilePic);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        setProfilePic(URL.createObjectURL(file));
      } else {
        toast.error('Please select an image file');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let profilePicUrl = currentProfilePic;

      // Upload new profile picture if selected
      if (selectedFile) {
        profilePicUrl = await uploadToCloudinary(selectedFile);
      }

      // Update user profile in Firestore
      await updateDoc(doc(db, 'users', userId), {
        displayName,
        bio,
        profilePicUrl,
      });

      toast.success('Profile updated successfully!');
      onProfileUpdate();
      setOpen(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(currentDisplayName);
    setBio(currentBio);
    setProfilePic(currentProfilePic);
    setSelectedFile(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">Edit Profile</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information here.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Profile Picture */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={profilePic} />
                <AvatarFallback className="text-2xl">
                  {currentUsername[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 hover:bg-primary/90 transition"
              >
                <AiOutlineCamera size={20} />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <p className="text-sm text-muted-foreground">
              Click camera icon to change profile picture
            </p>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              required
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={4}
              maxLength={150}
            />
            <p className="text-xs text-muted-foreground text-right">
              {bio.length}/150 characters
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileDialog;

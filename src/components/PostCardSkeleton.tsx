import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const PostCardSkeleton = () => {
  return (
    <Card className="mb-0 lg:mb-6 overflow-hidden border-x-0 lg:border-x rounded-none lg:rounded-lg border-b">
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="w-8 h-8" />
      </div>

      {/* Media */}
      <Skeleton className="w-full aspect-square" />

      {/* Actions */}
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="w-6 h-6" />
            <Skeleton className="w-6 h-6" />
            <Skeleton className="w-6 h-6" />
          </div>
          <Skeleton className="w-6 h-6" />
        </div>

        {/* Likes */}
        <Skeleton className="h-4 w-20" />

        {/* Caption */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Timestamp */}
        <Skeleton className="h-3 w-16" />
      </div>
    </Card>
  );
};

export default PostCardSkeleton;

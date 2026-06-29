// frontend/components/ui/Skeleton.tsx
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`shimmer rounded-card ${className}`} />;
}

export function PosterSkeleton() {
  return (
    <div className="w-full">
      <Skeleton className="aspect-poster w-full" />
      <Skeleton className="h-4 w-3/4 mt-2" />
      <Skeleton className="h-3 w-1/2 mt-1" />
    </div>
  );
}

export function RowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="px-4 md:px-8">
      <Skeleton className="h-6 w-48 mb-3" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="w-32 md:w-40 flex-shrink-0">
            <PosterSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

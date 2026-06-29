// frontend/app/player/page.tsx
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { Suspense } from 'react';

export default function PlayerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <VideoPlayer />
    </Suspense>
  );
}

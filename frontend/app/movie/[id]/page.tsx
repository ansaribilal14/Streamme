// frontend/app/movie/[id]/page.tsx
import { DetailPage } from '@/components/detail/DetailPage';
import { Suspense } from 'react';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DetailPage type="movie" />
    </Suspense>
  );
}

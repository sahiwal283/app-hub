'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/api';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    getCurrentUser()
      .then((data) => {
        if (data.user.globalRole !== 'admin') {
          router.replace('/dashboard');
          return;
        }
        router.replace('/settings');
      })
      .catch(() => {
        router.replace('/login');
      });
  }, [router]);

  return (
    <div className="app-shell flex items-center justify-center">
      <div className="loading-text">Redirecting...</div>
    </div>
  );
}

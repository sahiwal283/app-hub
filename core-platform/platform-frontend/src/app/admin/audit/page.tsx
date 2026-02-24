'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, getAuditLogs, User } from '@/lib/api';
import AppBrand from '@/components/app-brand';
import { safeDisplayText } from '@/lib/text';

interface AuditLog {
  id: string;
  userId: string | null;
  username: string | null;
  action: string;
  metadata: any;
  createdAt: string;
}

export default function AdminAuditPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((data) => {
        if (data.user.globalRole !== 'admin') {
          router.push('/dashboard');
          return;
        }
        setUser(data.user);
        loadLogs();
      })
      .catch(() => {
        router.push('/login');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  const loadLogs = async () => {
    try {
      const data = await getAuditLogs(100, 0);
      setLogs(data.logs);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  };

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="loading-text">Loading...</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard">
            <AppBrand />
          </Link>
          <div className="flex items-center space-x-3">
            <Link href="/settings" className="app-nav-link">
              Settings
            </Link>
            <Link href="/dashboard" className="app-nav-link">
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <h1 className="mb-6 text-3xl font-semibold tracking-tight">Audit Logs</h1>

          <div className="table-shell">
            <table className="min-w-full divide-y">
              <thead>
                <tr className="table-head">
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <tr key={log.id} className="table-row">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {safeDisplayText(log.username, 'System')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold">
                      {safeDisplayText(log.action, 'Action')}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted">
                      {safeDisplayText(log.metadata ? JSON.stringify(log.metadata) : '-', '-')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

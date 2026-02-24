'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { changePassword, getCurrentUser, User } from '@/lib/api';
import AppBrand from '@/components/app-brand';
import { safeDisplayText } from '@/lib/text';

export default function SettingsPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((data) => {
        setUser(data.user);
      })
      .catch(() => {
        router.push('/login');
      })
      .finally(() => {
        setInitializing(false);
      });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await changePassword(currentPassword, newPassword);
      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(safeDisplayText(err.message, 'Failed to change password'));
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="loading-text">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard">
            <AppBrand />
          </Link>
          <div className="flex items-center space-x-3">
            <Link href="/dashboard" className="app-nav-link">
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <h1 className="mb-6 text-3xl font-semibold tracking-tight">Settings</h1>

          <div className="app-card mb-6">
            <h2 className="mb-4 text-lg font-semibold">Change Password</h2>

            {error && (
              <div className="alert-error mb-4">
                <div className="text-sm">{error}</div>
              </div>
            )}

            {success && (
              <div className="alert-success mb-4">
                <div className="text-sm">{success}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="currentPassword"
                  className="form-label"
                >
                  Current Password
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  required
                  className="form-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div>
                <label
                  htmlFor="newPassword"
                  className="form-label"
                >
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  required
                  minLength={8}
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="form-label"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>

          {user.globalRole === 'admin' && (
            <section className="app-card">
              <h2 className="mb-2 text-lg font-semibold">Admin Panel</h2>
              <p className="mb-5 text-sm text-muted">
                Manage users, applications, and platform audit activity.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Link
                  href="/admin/users"
                  className="rounded-lg border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
                >
                  <h3 className="mb-1 text-base font-semibold">User Management</h3>
                  <p className="text-sm text-muted">Create, edit, and manage user accounts.</p>
                </Link>
                <Link
                  href="/admin/apps"
                  className="rounded-lg border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
                >
                  <h3 className="mb-1 text-base font-semibold">App Management</h3>
                  <p className="text-sm text-muted">Register apps and manage activation status.</p>
                </Link>
                <Link
                  href="/admin/audit"
                  className="rounded-lg border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
                >
                  <h3 className="mb-1 text-base font-semibold">Audit Logs</h3>
                  <p className="text-sm text-muted">Review administrative and system changes.</p>
                </Link>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

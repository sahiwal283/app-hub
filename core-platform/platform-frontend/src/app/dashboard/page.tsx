'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, User, App, logout } from '@/lib/api';
import AppBrand from '@/components/app-brand';
import { resolveIconSymbol } from '@/lib/icon-symbols';
import { safeDisplayText } from '@/lib/text';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((data) => {
        setUser(data.user);
      })
      .catch(() => {
        router.push('/login');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleAppLaunch = (app: App) => {
    const openInNewTab = (url: string) => {
      const newTab = window.open(url, '_blank', 'noopener,noreferrer');
      if (newTab) {
        newTab.focus();
      }
    };

    // External apps can launch directly when proxy routing is not configured.
    if (app.type === 'external' && app.externalUrl) {
      openInNewTab(app.externalUrl);
      return;
    }

    // Internal apps should be routed via /apps/{slug} by reverse proxy.
    openInNewTab(`/apps/${app.slug}`);
  };

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="loading-text">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const apps = user.apps || [];

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <AppBrand />
          <div className="flex items-center space-x-3">
            <span className="text-sm text-muted">
              {safeDisplayText(user.username, 'User')} ({user.globalRole})
            </span>
            <Link
              href="/settings"
              className="app-nav-link"
            >
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="btn btn-secondary px-3 py-1.5"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <h2 className="mb-6 text-3xl font-semibold tracking-tight">My Apps</h2>

          {apps.length === 0 ? (
            <div className="app-card py-12 text-center">
              <p className="text-muted">No apps assigned to your account.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {apps.map((app) => (
                <div
                  key={app.id}
                  className="app-card transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="rounded-md border border-slate-300 bg-slate-50 p-1 text-slate-600">
                        <span className="inline-block w-5 text-center text-base leading-none">
                          {resolveIconSymbol(app.iconSymbol)}
                        </span>
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold">{safeDisplayText(app.name, 'Untitled App')}</h3>
                        <p className="text-sm text-muted">v{safeDisplayText(app.version, '--')}</p>
                        {app.isBeta && <span className="badge badge-beta mt-1">Beta</span>}
                      </div>
                    </div>
                  </div>
                  <div className="mb-4">
                    <span
                      className={`badge ${
                        app.type === 'internal'
                          ? 'badge-secondary'
                          : 'badge-success'
                      }`}
                    >
                      {app.type}
                    </span>
                  </div>
                  <button
                    onClick={() => handleAppLaunch(app)}
                    className="btn btn-primary w-full"
                  >
                    Launch
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

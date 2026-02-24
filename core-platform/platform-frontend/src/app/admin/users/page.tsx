'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getCurrentUser,
  getUsers,
  getApps,
  createUser,
  updateUser,
  setUserPassword,
  User,
  App,
} from '@/lib/api';
import AppBrand from '@/components/app-brand';
import { safeDisplayText } from '@/lib/text';

interface UserListItem {
  id: string;
  username: string;
  globalRole: 'admin' | 'user';
  isActive: boolean;
  createdAt: string;
  appCount: number;
  assignedAppIds: string[];
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    globalRole: 'user' as 'admin' | 'user',
    isActive: true,
    appIds: [] as string[],
  });

  useEffect(() => {
    getCurrentUser()
      .then((data) => {
        if (data.user.globalRole !== 'admin') {
          router.push('/dashboard');
          return;
        }
        setUser(data.user);
        Promise.all([loadUsers(), loadApps()]);
      })
      .catch(() => {
        router.push('/login');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data.users);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const loadApps = async () => {
    try {
      const data = await getApps();
      setApps(data.apps.filter((app) => app.isActive));
    } catch (err) {
      console.error('Failed to load apps:', err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUser(formData);
      setShowCreateModal(false);
      setFormData({ username: '', password: '', globalRole: 'user', isActive: true, appIds: [] });
      loadUsers();
    } catch (err: any) {
      alert(safeDisplayText(err.message, 'Failed to create user'));
    }
  };

  const handleEdit = (user: UserListItem) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      password: '',
      globalRole: user.globalRole,
      isActive: user.isActive,
      appIds: user.assignedAppIds || [],
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await updateUser(selectedUser.id, {
        globalRole: formData.globalRole,
        isActive: formData.isActive,
        appIds: formData.appIds,
      });
      if (formData.password) {
        await setUserPassword(selectedUser.id, formData.password);
      }
      setShowEditModal(false);
      setSelectedUser(null);
      setFormData({ username: '', password: '', globalRole: 'user', isActive: true, appIds: [] });
      loadUsers();
    } catch (err: any) {
      alert(safeDisplayText(err.message, 'Failed to update user'));
    }
  };

  const toggleAppAssignment = (appId: string) => {
    setFormData((prev) => ({
      ...prev,
      appIds: prev.appIds.includes(appId)
        ? prev.appIds.filter((id) => id !== appId)
        : [...prev.appIds, appId],
    }));
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
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-semibold tracking-tight">User Management</h1>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              Create User
            </button>
          </div>

          <div className="table-shell">
            <table className="min-w-full divide-y">
              <thead>
                <tr className="table-head">
                  <th className="px-6 py-3">Username</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Apps</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => (
                  <tr key={u.id} className="table-row">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold">{safeDisplayText(u.username, 'User')}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span className={`badge ${u.globalRole === 'admin' ? 'badge-secondary' : 'badge-warn'}`}>
                        {u.globalRole}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span className={`badge ${u.isActive ? 'badge-success' : 'badge-warn'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted">{u.appCount}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <button onClick={() => handleEdit(u)} className="btn btn-secondary px-3 py-1.5">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showCreateModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Create User">
          <div className="modal-panel">
            <h2 className="modal-title">Create User</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="form-label">Username</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="form-label">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  className="form-input"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  value={formData.globalRole}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      globalRole: e.target.value as 'admin' | 'user',
                    })
                  }
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="check-input"
                />
                Active
              </label>
              <div>
                <label className="form-label">Assign Apps</label>
                <div className="selection-list">
                  <div className="space-y-2">
                    {apps.map((app) => (
                      <label key={app.id} className="check-label">
                        <input
                          type="checkbox"
                          checked={formData.appIds.includes(app.id)}
                          onChange={() => toggleAppAssignment(app.id)}
                          className="check-input"
                        />
                        <span>
                          {safeDisplayText(app.name, 'App')} ({safeDisplayText(app.slug, 'slug')})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && selectedUser && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Edit User">
          <div className="modal-panel">
            <h2 className="modal-title">Edit User</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="form-label">Username</label>
                <input
                  type="text"
                  disabled
                  className="form-input input-disabled"
                  value={formData.username}
                />
              </div>
              <div>
                <label className="form-label">New Password (leave blank to keep current)</label>
                <input
                  type="password"
                  minLength={8}
                  className="form-input"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  value={formData.globalRole}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      globalRole: e.target.value as 'admin' | 'user',
                    })
                  }
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="check-input"
                />
                Active
              </label>
              <div>
                <label className="form-label">Assign Apps</label>
                <div className="selection-list">
                  <div className="space-y-2">
                    {apps.map((app) => (
                      <label key={app.id} className="check-label">
                        <input
                          type="checkbox"
                          checked={formData.appIds.includes(app.id)}
                          onChange={() => toggleAppAssignment(app.id)}
                          className="check-input"
                        />
                        <span>
                          {safeDisplayText(app.name, 'App')} ({safeDisplayText(app.slug, 'slug')})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

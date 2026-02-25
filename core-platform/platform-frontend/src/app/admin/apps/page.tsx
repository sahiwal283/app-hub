'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, getApps, createApp, updateApp, deleteApp, App, User } from '@/lib/api';
import AppBrand from '@/components/app-brand';
import SymbolPicker from '@/components/symbol-picker';
import { getIconSymbolLabel, resolveIconSymbol } from '@/lib/icon-symbols';
import { safeDisplayText } from '@/lib/text';

const DEFAULT_APP_FORM = {
  name: '',
  slug: '',
  type: 'internal' as 'internal' | 'external',
  internalPath: '',
  externalUrl: '',
  iconSymbol: '◆',
  version: '1.0.0',
  isActive: true,
};

export default function AdminAppsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [formData, setFormData] = useState(DEFAULT_APP_FORM);
  const [initialEditFormSnapshot, setInitialEditFormSnapshot] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then((data) => {
        if (data.user.globalRole !== 'admin') {
          router.push('/dashboard');
          return;
        }
        setUser(data.user);
        loadApps();
      })
      .catch(() => {
        router.push('/login');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  const loadApps = async () => {
    try {
      const data = await getApps();
      setApps(data.apps);
    } catch (err) {
      console.error('Failed to load apps:', err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createApp(formData);
      closeCreateModal();
      loadApps();
    } catch (err: any) {
      alert(safeDisplayText(err.message, 'Failed to create app'));
    }
  };

  const handleEdit = (app: App) => {
    setSelectedApp(app);
    const nextFormData = {
      name: app.name,
      slug: app.slug,
      type: app.type,
      internalPath: app.internalPath || '',
      externalUrl: app.externalUrl || '',
      iconSymbol: resolveIconSymbol(app.iconSymbol),
      version: app.version,
      isActive: app.isActive,
    };
    setFormData(nextFormData);
    setInitialEditFormSnapshot(JSON.stringify(nextFormData));
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    try {
      await updateApp(selectedApp.id, formData);
      setShowEditModal(false);
      setSelectedApp(null);
      setInitialEditFormSnapshot(null);
      loadApps();
    } catch (err: any) {
      alert(safeDisplayText(err.message, 'Failed to update app'));
    }
  };

  const handleDelete = async (app: App) => {
    if (!confirm(`Are you sure you want to deactivate ${app.name}?`)) return;
    try {
      await deleteApp(app.id);
      loadApps();
    } catch (err: any) {
      alert(safeDisplayText(err.message, 'Failed to delete app'));
    }
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setFormData(DEFAULT_APP_FORM);
  };

  const closeEditModal = () => {
    const isDirty =
      initialEditFormSnapshot !== null &&
      JSON.stringify(formData) !== initialEditFormSnapshot;
    if (isDirty) {
      const shouldClose = window.confirm(
        'You have unsaved changes. Close without saving?'
      );
      if (!shouldClose) {
        return;
      }
    }
    setShowEditModal(false);
    setSelectedApp(null);
    setInitialEditFormSnapshot(null);
  };

  useEffect(() => {
    if (!showCreateModal && !showEditModal) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      if (showEditModal) {
        closeEditModal();
        return;
      }
      closeCreateModal();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showCreateModal, showEditModal, formData, initialEditFormSnapshot]);

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
            <h1 className="text-3xl font-semibold tracking-tight">App Management</h1>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              Create App
            </button>
          </div>

          <div className="table-shell">
            <table className="min-w-full divide-y">
              <thead>
                <tr className="table-head">
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Slug</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Version</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {apps.map((app) => (
                  <tr key={app.id} className="table-row">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold">
                      <span className="mr-2 inline-flex rounded-md border border-slate-300 bg-slate-50 p-1 align-middle text-slate-600">
                        <span className="inline-block w-4 text-center text-sm leading-none">
                          {resolveIconSymbol(app.iconSymbol)}
                        </span>
                      </span>
                      {safeDisplayText(app.name, 'Untitled App')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted">
                      {safeDisplayText(app.slug, 'slug')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span className={`badge ${app.type === 'internal' ? 'badge-secondary' : 'badge-success'}`}>
                        {app.type}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">{safeDisplayText(app.version, '--')}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span className={`badge ${app.isActive ? 'badge-success' : 'badge-warn'}`}>
                        {app.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(app)} className="btn btn-secondary px-3 py-1.5">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(app)} className="btn btn-danger px-3 py-1.5">
                          Deactivate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showCreateModal && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Create App"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateModal();
            }
          }}
        >
          <div className="modal-panel">
            <div className="modal-header">
              <h2 className="modal-title">Create App</h2>
              <button
                type="button"
                className="btn btn-secondary px-3 py-1"
                aria-label="Close create app modal"
                onClick={closeCreateModal}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreate} className="flex max-h-[78vh] flex-col">
              <div className="modal-body space-y-4 pr-1">
                <div>
                <label className="form-label">Name</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
                </div>
                <div>
                <label className="form-label">Slug</label>
                <input
                  type="text"
                  required
                  pattern="[a-z0-9-]+"
                  className="form-input"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                />
                </div>
                <div>
                <label className="form-label">Type</label>
                <select
                  className="form-select"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as 'internal' | 'external',
                    })
                  }
                >
                  <option value="internal">Internal</option>
                  <option value="external">External</option>
                </select>
                </div>
                {formData.type === 'internal' ? (
                  <div>
                  <label className="form-label">Internal Path</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={formData.internalPath}
                    onChange={(e) =>
                      setFormData({ ...formData, internalPath: e.target.value })
                    }
                  />
                  </div>
                ) : (
                  <div>
                  <label className="form-label">External URL</label>
                  <input
                    type="url"
                    required
                    className="form-input"
                    value={formData.externalUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, externalUrl: e.target.value })
                    }
                  />
                  </div>
                )}
                <div>
                <label className="form-label">Icon</label>
                <SymbolPicker
                  id="create-app-icon"
                  value={formData.iconSymbol}
                  onChange={(nextSymbol) => setFormData({ ...formData, iconSymbol: nextSymbol })}
                />
                <div className="mt-2 rounded-md border border-slate-300 bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Card preview</p>
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white text-base">
                      {resolveIconSymbol(formData.iconSymbol)}
                    </span>
                    <span>{safeDisplayText(formData.name, 'App Name')}</span>
                    <span className="text-xs text-slate-500">
                      ({getIconSymbolLabel(resolveIconSymbol(formData.iconSymbol))})
                    </span>
                  </div>
                </div>
                </div>
                <div>
                <label className="form-label">Version</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={formData.version}
                  onChange={(e) =>
                    setFormData({ ...formData, version: e.target.value })
                  }
                />
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
              </div>
              <div className="modal-actions">
                <button type="button" onClick={closeCreateModal} className="btn btn-secondary">
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

      {showEditModal && selectedApp && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Edit App"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeEditModal();
            }
          }}
        >
          <div className="modal-panel">
            <div className="modal-header">
              <h2 className="modal-title">Edit App</h2>
              <button
                type="button"
                className="btn btn-secondary px-3 py-1"
                aria-label="Close edit app modal"
                onClick={closeEditModal}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleUpdate} className="flex max-h-[78vh] flex-col">
              <div className="modal-body space-y-4 pr-1">
                <div>
                <label className="form-label">Name</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
                </div>
                <div>
                <label className="form-label">Slug</label>
                <input
                  type="text"
                  required
                  pattern="[a-z0-9-]+"
                  className="form-input"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                />
                </div>
                <div>
                <label className="form-label">Type</label>
                <select
                  className="form-select"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as 'internal' | 'external',
                    })
                  }
                >
                  <option value="internal">Internal</option>
                  <option value="external">External</option>
                </select>
                </div>
                {formData.type === 'internal' ? (
                  <div>
                  <label className="form-label">Internal Path</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={formData.internalPath}
                    onChange={(e) =>
                      setFormData({ ...formData, internalPath: e.target.value })
                    }
                  />
                  </div>
                ) : (
                  <div>
                  <label className="form-label">External URL</label>
                  <input
                    type="url"
                    required
                    className="form-input"
                    value={formData.externalUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, externalUrl: e.target.value })
                    }
                  />
                  </div>
                )}
                <div>
                <label className="form-label">Icon</label>
                <SymbolPicker
                  id="edit-app-icon"
                  value={formData.iconSymbol}
                  onChange={(nextSymbol) => setFormData({ ...formData, iconSymbol: nextSymbol })}
                />
                <div className="mt-2 rounded-md border border-slate-300 bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Card preview</p>
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white text-base">
                      {resolveIconSymbol(formData.iconSymbol)}
                    </span>
                    <span>{safeDisplayText(formData.name, 'App Name')}</span>
                    <span className="text-xs text-slate-500">
                      ({getIconSymbolLabel(resolveIconSymbol(formData.iconSymbol))})
                    </span>
                  </div>
                </div>
                </div>
                <div>
                <label className="form-label">Version</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={formData.version}
                  onChange={(e) =>
                    setFormData({ ...formData, version: e.target.value })
                  }
                />
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
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={closeEditModal}
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

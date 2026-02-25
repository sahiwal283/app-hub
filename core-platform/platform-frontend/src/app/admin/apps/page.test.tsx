import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminAppsPage from './page';
import * as api from '@/lib/api';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

jest.mock('@/lib/api', () => ({
  getCurrentUser: jest.fn(),
  getVersionMeta: jest.fn(),
  getApps: jest.fn(),
  createApp: jest.fn(),
  updateApp: jest.fn(),
  deleteApp: jest.fn(),
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('AdminAppsPage modal close behavior', () => {
  beforeEach(() => {
    mockedApi.getCurrentUser.mockResolvedValue({
      user: {
        id: 'u1',
        username: 'admin',
        globalRole: 'admin',
        isActive: true,
      },
    } as any);

    mockedApi.getApps.mockResolvedValue({
      apps: [
        {
          id: 'a1',
          name: 'Billing',
          slug: 'billing',
          type: 'internal',
          version: '1.0.0',
          isActive: true,
          iconSymbol: '◆',
          isBeta: true,
        },
      ],
    } as any);

    mockedApi.createApp.mockResolvedValue({ app: {} } as any);
    mockedApi.updateApp.mockResolvedValue({ app: {} } as any);
    mockedApi.deleteApp.mockResolvedValue({ app: {} } as any);
    mockedApi.getVersionMeta.mockResolvedValue({
      version: '1.6.1',
      build: 'test',
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('closes edit modal with Escape without triggering save', async () => {
    render(<AdminAppsPage />);

    await screen.findByText('App Management');
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('dialog', { name: 'Edit App' })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Edit App' })).not.toBeInTheDocument();
    });
    expect(mockedApi.updateApp).not.toHaveBeenCalled();
  });

  it('prompts before closing dirty edit form', async () => {
    const confirmMock = jest.spyOn(window, 'confirm').mockReturnValue(false);

    render(<AdminAppsPage />);

    await screen.findByText('App Management');
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('dialog', { name: 'Edit App' })).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('Billing'), {
      target: { value: 'Billing Updated' },
    });
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(confirmMock).toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Edit App' })).toBeInTheDocument();

    confirmMock.mockReturnValue(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Edit App' })).not.toBeInTheDocument();
    });
    expect(mockedApi.updateApp).not.toHaveBeenCalled();
    confirmMock.mockRestore();
  });

  it('renders Beta badge for beta apps', async () => {
    render(<AdminAppsPage />);
    await screen.findByText('App Management');

    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('submits create app with beta toggle enabled', async () => {
    render(<AdminAppsPage />);
    await screen.findByText('App Management');

    fireEvent.click(screen.getByRole('button', { name: 'Create App' }));

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Preview App' },
    });
    fireEvent.change(screen.getByLabelText('Slug'), {
      target: { value: 'preview-app' },
    });
    fireEvent.change(screen.getByLabelText('Internal Path'), {
      target: { value: '/preview' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mark as Beta' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mockedApi.createApp).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Preview App',
          slug: 'preview-app',
          internalPath: '/preview',
          isBeta: true,
        })
      );
    });
  });

  it('reopens create modal with clean default values', async () => {
    render(<AdminAppsPage />);
    await screen.findByText('App Management');

    fireEvent.click(screen.getByRole('button', { name: 'Create App' }));
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Temporary Name' },
    });
    fireEvent.change(screen.getByLabelText('Slug'), {
      target: { value: 'temporary-slug' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mark as Beta' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    fireEvent.click(screen.getByRole('button', { name: 'Create App' }));

    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.getByLabelText('Slug')).toHaveValue('');
    expect(screen.getByRole('checkbox', { name: 'Mark as Beta' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Active' })).toBeChecked();
  });
});

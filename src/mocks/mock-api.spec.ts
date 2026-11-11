import { DEMO_PASSWORD } from './data/users';
import { startMockApi } from './mock-api';

describe('mock API (in-page fetch interception)', () => {
  let stop: () => void;

  beforeEach(() => (stop = startMockApi()));
  afterEach(() => stop());

  const api = (path: string, init?: RequestInit) => fetch(new URL(path, location.origin), init);

  it('logs in and serves the dashboard with the issued access token', async () => {
    const login = await api('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'analyst@ledgerly.dev', password: DEMO_PASSWORD }),
    });
    expect(login.status).toBe(200);
    const { accessToken, user } = await login.json();
    expect(user.role).toBe('analyst');

    const dashboard = await api('/api/dashboard?range=3m', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(dashboard.status).toBe(200);
    expect((await dashboard.json()).cashflow).toHaveLength(3);
  });

  it('rejects API calls without a valid token', async () => {
    const response = await api('/api/dashboard');
    expect(response.status).toBe(401);
  });

  it('answers unknown API routes with 404 instead of hitting the network', async () => {
    const response = await api('/api/unknown');
    expect(response.status).toBe(404);
  });
});

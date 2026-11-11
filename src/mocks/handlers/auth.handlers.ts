import { delay, http, HttpResponse } from 'msw';

import type { AuthResponse, LoginRequest, RefreshRequest } from '../../app/core/auth/auth.models';
import { findUserById, MOCK_USERS, toPublicUser, type MockUserRecord } from '../data/users';
import { authenticate, unauthorized } from '../authenticate';
import { issueToken, verifyToken } from '../jwt';

function issueSession(user: MockUserRecord): AuthResponse {
  return {
    accessToken: issueToken(user.id, user.role, 'access'),
    refreshToken: issueToken(user.id, user.role, 'refresh'),
    user: toPublicUser(user),
  };
}

export const authHandlers = [
  http.post<never, LoginRequest>('/api/auth/login', async ({ request }) => {
    await delay(400);
    const { email, password } = await request.json();
    const user = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === email?.trim().toLowerCase() && u.password === password,
    );
    return user ? HttpResponse.json(issueSession(user)) : unauthorized('Invalid email or password');
  }),

  http.post<never, RefreshRequest>('/api/auth/refresh', async ({ request }) => {
    await delay(250);
    const { refreshToken } = await request.json();
    const payload = verifyToken(refreshToken, 'refresh');
    const user = payload && findUserById(payload.sub);
    return user ? HttpResponse.json(issueSession(user)) : unauthorized('Session expired');
  }),

  http.get('/api/auth/me', async ({ request }) => {
    await delay(150);
    const user = authenticate(request);
    return user ? HttpResponse.json(toPublicUser(user)) : unauthorized();
  }),
];

import { HttpResponse } from 'msw';

import { findUserById, type MockUserRecord } from './data/users';
import { verifyToken } from './jwt';

/** Resolves the user from a valid, unexpired `Authorization: Bearer <access token>` header. */
export function authenticate(request: Request): MockUserRecord | null {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '');
  const payload = verifyToken(token, 'access');
  return (payload && findUserById(payload.sub)) ?? null;
}

export const unauthorized = (message = 'Access token expired') =>
  HttpResponse.json({ message }, { status: 401 });

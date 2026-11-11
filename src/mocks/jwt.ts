/**
 * Fake JWT issuer for the mock backend.
 * Tokens are structurally valid (header.payload.signature) but NOT signed —
 * this is a demo; real token signing/verification belongs on a server.
 */

export type TokenType = 'access' | 'refresh';

export interface MockTokenPayload {
  sub: string;
  role: string;
  typ: TokenType;
  iat: number;
  exp: number;
}

export const ACCESS_TOKEN_TTL_SECONDS = 60;
export const REFRESH_TOKEN_TTL_SECONDS = 8 * 60 * 60;

const nowSeconds = (): number => Math.floor(Date.now() / 1000);

function base64UrlEncode(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  return atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='));
}

export function issueToken(sub: string, role: string, typ: TokenType): string {
  const iat = nowSeconds();
  const ttl = typ === 'access' ? ACCESS_TOKEN_TTL_SECONDS : REFRESH_TOKEN_TTL_SECONDS;
  const header = base64UrlEncode(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = base64UrlEncode(JSON.stringify({ sub, role, typ, iat, exp: iat + ttl }));
  return `${header}.${payload}.mock-signature`;
}

/** Returns the payload if the token is well-formed, of the expected type and not expired. */
export function verifyToken(
  token: string | null | undefined,
  typ: TokenType,
): MockTokenPayload | null {
  const encoded = token?.split('.')[1];
  if (!encoded) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as MockTokenPayload;
    return payload.typ === typ && payload.exp > nowSeconds() ? payload : null;
  } catch {
    return null;
  }
}

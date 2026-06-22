import { setItem, getItem, deleteItem } from "./storage";

const TOKEN_KEY = "auth_token";
const USER_ID_KEY = "auth_user_id";
const USER_EMAIL_KEY = "auth_email";

// Treat a token as expired this many seconds before its real `exp`, so a request
// that's in flight when the token lapses doesn't get rejected server-side.
const EXPIRY_LEEWAY_SECONDS = 30;

function base64UrlDecode(input: string): string {
  // JWT segments are base64url (-/_ instead of +//, no padding).
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  return atob(padded);
}

/** Returns the token's expiry in ms since epoch, or null if it has no/invalid `exp`. */
export function getTokenExpiry(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    if (typeof payload.exp !== "number") return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

/** True if the token is past its expiry (minus a small leeway). Tokens without an `exp` are not considered expired. */
export function isTokenExpired(token: string): boolean {
  const expiry = getTokenExpiry(token);
  if (expiry === null) return false;
  return Date.now() >= expiry - EXPIRY_LEEWAY_SECONDS * 1000;
}

export async function saveAuth(
  token: string,
  userId: string,
  email: string,
): Promise<void> {
  await setItem(TOKEN_KEY, token);
  await setItem(USER_ID_KEY, userId);
  await setItem(USER_EMAIL_KEY, email);
}

/**
 * Returns a valid auth token, or null. If a stored token has expired it is
 * cleared from secure storage and treated as logged-out.
 */
export async function getToken(): Promise<string | null> {
  const token = await getItem(TOKEN_KEY);
  if (token === null) return null;
  if (isTokenExpired(token)) {
    await logout();
    return null;
  }
  return token;
}

export async function getUserEmail(): Promise<string | null> {
  return getItem(USER_EMAIL_KEY);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return token !== null;
}

export async function logout(): Promise<void> {
  await deleteItem(TOKEN_KEY);
  await deleteItem(USER_ID_KEY);
  await deleteItem(USER_EMAIL_KEY);
}

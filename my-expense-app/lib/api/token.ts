/**
 * Token Management Utilities
 * Handles JWT parsing, validation, and expiration checks
 */

export interface DecodedToken {
  user_id: string;
  exp: number;
  iat: number;
  jti: string;
  token_type: string;
}

/**
 * Decode a JWT token without verification
 * Note: This is safe for client-side use since we're not verifying the signature
 * The server will verify the signature when the token is used
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const payload = parts[1];
    // Handle base64url encoding
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(jsonPayload) as DecodedToken;
  } catch (error) {
    console.error('[token] Failed to decode token:', error);
    return null;
  }
}

/**
 * Check if a token is expired
 * @param token JWT token string
 * @param bufferSeconds Number of seconds before actual expiry to consider expired (default: 60)
 * @returns true if token is expired or invalid
 */
export function isTokenExpired(token: string | null, bufferSeconds = 60): boolean {
  if (!token) return true;
  
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = decoded.exp;
  
  // Consider expired if within buffer time of expiry
  return expiresAt - now <= bufferSeconds;
}

/**
 * Get remaining time until token expires
 * @param token JWT token string
 * @returns Remaining seconds, or 0 if expired/invalid
 */
export function getTokenRemainingTime(token: string | null): number {
  if (!token) return 0;
  
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return 0;
  
  const now = Math.floor(Date.now() / 1000);
  const remaining = decoded.exp - now;
  
  return Math.max(0, remaining);
}

/**
 * Get access token from storage
 */
export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
}

/**
 * Get refresh token from storage
 */
export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
}

/**
 * Check if user has valid stored credentials
 * @returns true if valid access token exists and is not expired
 */
export function hasValidStoredToken(): boolean {
  const token = getStoredAccessToken();
  return !isTokenExpired(token, 0); // Check exact expiry
}

/**
 * Check if access token needs refresh (expired or about to expire)
 * @param bufferSeconds Refresh if token expires within this many seconds
 * @returns true if token needs refresh
 */
export function needsTokenRefresh(bufferSeconds = 300): boolean {
  const token = getStoredAccessToken();
  if (!token) return true;
  
  return isTokenExpired(token, bufferSeconds);
}

/**
 * Clear all auth tokens from storage
 */
export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('refresh_token');
}

/**
 * Store tokens in appropriate storage based on remember me preference
 */
export function storeTokens(
  accessToken: string,
  refreshToken: string,
  rememberMe: boolean
): void {
  if (typeof window === 'undefined') return;
  
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem('access_token', accessToken);
  storage.setItem('refresh_token', refreshToken);
}

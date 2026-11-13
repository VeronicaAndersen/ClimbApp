import { ApiError, SERVER_ERROR_MESSAGE, formatRateLimitMessage, toApiError } from "./apiError";

const apiUrl = import.meta.env.VITE_REACT_APP_API_URL;

const AUTH_FAILED_MESSAGE = "Autentisering misslyckades";

// ----------------------------------------------------------
// Cache Layer
// ----------------------------------------------------------
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(url: string, options: ApiOptions): string {
  return `${options.method || "GET"}:${url}`;
}

function getCachedData<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const isExpired = Date.now() - entry.timestamp > CACHE_TTL;
  if (isExpired) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

function setCachedData<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function clearCache(): void {
  cache.clear();
}

// ----------------------------------------------------------
// Token helpers — access token in memory, refresh token in sessionStorage
// (sessionStorage is cleared when the tab/browser closes; inaccessible to
//  other tabs; JS-readable but shorter-lived than localStorage)
// ----------------------------------------------------------
let _accessToken: string | null = null;
/** Epoch ms until which /auth/refresh is not called again after a 429. */
let _refreshBlockedUntil: number | null = null;

type TokenPair = { access_token: string; refresh_token: string };

function saveTokens(newTokens: TokenPair) {
  _accessToken = newTokens.access_token;
  sessionStorage.setItem("refresh_token", newTokens.refresh_token);
  _refreshBlockedUntil = null;
}

export function clearTokens(): void {
  _accessToken = null;
  sessionStorage.removeItem("refresh_token");
  _refreshBlockedUntil = null;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

/** Switch the active session without going through the login endpoint. */
export function switchSession(accessToken: string, refreshToken: string): void {
  _accessToken = accessToken;
  sessionStorage.setItem("refresh_token", refreshToken);
  _refreshBlockedUntil = null;
  clearCache();
}

export function isLoggedIn(): boolean {
  return sessionStorage.getItem("refresh_token") !== null;
}

/**
 * Call once at app startup. If a refresh token exists in sessionStorage but
 * the access token is gone (page reload), eagerly exchange it so the first
 * authenticated requests don't hit a 401.
 *
 * Never rejects, so the app always renders: a network error or a 429/5xx
 * leaves the refresh token in place and surfaces on the first real request.
 */
export async function initializeAuth(): Promise<void> {
  if (!_accessToken && sessionStorage.getItem("refresh_token")) {
    try {
      await attemptRefresh();
    } catch {
      // Network failure: keep the session; requests will report the error.
    }
  }
}

// ----------------------------------------------------------
// Refresh
//
// At most one refresh request is in flight, and a failed refresh is never
// retried here. Only a 4xx other than 429 means the refresh token was
// rejected and logs the user out; a 429 or 5xx keeps the session. After a
// 429, further refreshes fail fast until Retry-After has passed.
// ----------------------------------------------------------
export type RefreshResult =
  | { kind: "refreshed"; tokens: TokenPair }
  | { kind: "failed"; error: ApiError };

/** Wait used when a 429 from /auth/refresh has no readable Retry-After. */
const DEFAULT_REFRESH_BACKOFF_SECONDS = 30;

let _refreshPromise: Promise<RefreshResult> | null = null;

function isTokenPair(value: unknown): value is TokenPair {
  if (typeof value !== "object" || value === null) return false;
  const { access_token, refresh_token } = value as Record<string, unknown>;
  return typeof access_token === "string" && typeof refresh_token === "string";
}

async function refreshOnce(): Promise<RefreshResult> {
  const rt = sessionStorage.getItem("refresh_token");
  if (!rt) {
    return { kind: "failed", error: new ApiError({ status: 401, message: AUTH_FAILED_MESSAGE }) };
  }

  if (_refreshBlockedUntil !== null) {
    const remainingMs = _refreshBlockedUntil - Date.now();
    if (remainingMs > 0) {
      const retryAfterSeconds = Math.ceil(remainingMs / 1000);
      const error = new ApiError({
        status: 429,
        message: formatRateLimitMessage(retryAfterSeconds),
        retryAfterSeconds,
      });
      return { kind: "failed", error };
    }
    _refreshBlockedUntil = null;
  }

  const response = await fetch(`${apiUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: rt }),
  });

  if (!response.ok) {
    const error = await toApiError(response);
    if (error.isRateLimited) {
      const waitSeconds = error.retryAfterSeconds ?? DEFAULT_REFRESH_BACKOFF_SECONDS;
      _refreshBlockedUntil = Date.now() + waitSeconds * 1000;
    } else if (error.isClientError) {
      clearTokens(); // the refresh token was rejected — force re-login
    }
    return { kind: "failed", error };
  }

  const data: unknown = await response.json().catch(() => null);
  if (!isTokenPair(data)) {
    return { kind: "failed", error: new ApiError({ status: 500, message: SERVER_ERROR_MESSAGE }) };
  }
  saveTokens(data);
  return { kind: "refreshed", tokens: data };
}

function attemptRefresh(): Promise<RefreshResult> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = refreshOnce().finally(() => {
    _refreshPromise = null;
  });

  return _refreshPromise;
}

// ----------------------------------------------------------
// Generic API handler
// ----------------------------------------------------------
interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: string;
  skipCache?: boolean;
}

async function apiRequest<T>(
  url: string,
  options: ApiOptions = {},
  requiresAuth = false
): Promise<T> {
  const cacheKey = getCacheKey(url, options);
  const method = options.method || "GET";

  // Check cache for GET requests
  if (method === "GET" && !options.skipCache) {
    const cachedData = getCachedData<T>(cacheKey);
    if (cachedData !== null) {
      return cachedData;
    }
  }

  const fetchWithToken = async (token?: string) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    };

    if (requiresAuth && token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return fetch(url, {
      ...options,
      headers,
    });
  };

  const initialToken = requiresAuth ? getAccessToken() : null;
  let response = await fetchWithToken(initialToken ?? undefined);

  // One refresh and one retry at most: a second 401 is thrown below.
  if (requiresAuth && response.status === 401) {
    const refreshed = await attemptRefresh();
    if (refreshed.kind === "failed") {
      // A 429 or 5xx from /auth/refresh is passed on as is so the UI can say
      // "try again later" instead of "session expired".
      if (refreshed.error.isRateLimited || refreshed.error.status >= 500) throw refreshed.error;
      throw new ApiError({ status: 401, message: AUTH_FAILED_MESSAGE });
    }
    response = await fetchWithToken(refreshed.tokens.access_token);
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  const raw = await response.text();
  if (!raw) return null as T;

  try {
    const data = JSON.parse(raw) as T;

    // Cache GET requests
    if (method === "GET" && !options.skipCache) {
      setCachedData(cacheKey, data);
    }

    // Invalidate cache for mutations
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const basePath = url.split("?")[0];
      const resourceType = basePath.split("/").slice(0, -1).join("/") || basePath;

      for (const key of cache.keys()) {
        if (key.includes(basePath) || key.includes(resourceType)) {
          cache.delete(key);
        }
      }
    }

    return data;
  } catch {
    throw new Error("Oväntad respons från servern");
  }
}

// Problem stats types
interface ProblemStats {
  problem_no: number;
  total_competitors: number;
  got_top_count: number;
  got_bonus_count: number;
  got_top_percentage: number;
  got_bonus_percentage: number;
}

interface LevelStatsResponse {
  level: number;
  problems: ProblemStats[];
}

// ----------------------------------------------------------
// Safe helper methods
// ----------------------------------------------------------
export const api = {
  get: <T>(path: string, auth = false, skipCache = false) =>
    apiRequest<T>(`${apiUrl}${path}`, { method: "GET", skipCache }, auth),

  post: <T, B extends object>(path: string, body: B, auth = false) =>
    apiRequest<T>(`${apiUrl}${path}`, { method: "POST", body: JSON.stringify(body) }, auth),

  put: <T, B extends object>(path: string, body: B, auth = false) =>
    apiRequest<T>(`${apiUrl}${path}`, { method: "PUT", body: JSON.stringify(body) }, auth),

  patch: <T, B extends object>(path: string, body: B, auth = false) =>
    apiRequest<T>(`${apiUrl}${path}`, { method: "PATCH", body: JSON.stringify(body) }, auth),

  delete: <T>(path: string, auth = false) =>
    apiRequest<T>(`${apiUrl}${path}`, { method: "DELETE" }, auth),

  // Get problem stats for a competition level
  getLevelStats: (compId: number, level: number, auth = false) =>
    api.get<LevelStatsResponse>(`/competitions/${compId}/level/${level}/stats`, auth),
};

export const tokens = { saveTokens };

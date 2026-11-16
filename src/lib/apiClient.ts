import {
  ApiError,
  MAX_RETRY_AFTER_SECONDS,
  SERVER_ERROR_MESSAGE,
  formatRateLimitMessage,
  toApiError,
} from "./apiError";

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
/**
 * Bumped whenever the active session changes (login, refresh, switch,
 * logout). A refresh that finishes after a change belongs to a session that
 * is no longer active and must neither save nor clear tokens.
 */
let _sessionGeneration = 0;

type TokenPair = { access_token: string; refresh_token: string };

function startNewSession(accessToken: string | null, refreshToken: string | null): void {
  _accessToken = accessToken;
  if (refreshToken === null) sessionStorage.removeItem("refresh_token");
  else sessionStorage.setItem("refresh_token", refreshToken);
  _refreshBlockedUntil = null;
  _sessionGeneration += 1;
}

function saveTokens(newTokens: TokenPair) {
  startNewSession(newTokens.access_token, newTokens.refresh_token);
}

export function clearTokens(): void {
  startNewSession(null, null);
}

export function getAccessToken(): string | null {
  return _accessToken;
}

/** Switch the active session without going through the login endpoint. */
export function switchSession(accessToken: string, refreshToken: string): void {
  startNewSession(accessToken, refreshToken);
  clearCache();
}

export function isLoggedIn(): boolean {
  return sessionStorage.getItem("refresh_token") !== null;
}

/** How long the startup refresh may take before the app renders without it. */
export const STARTUP_REFRESH_TIMEOUT_MS = 10_000;

/**
 * Call once at app startup. If a refresh token exists in sessionStorage but
 * the access token is gone (page reload), eagerly exchange it so the first
 * authenticated requests don't hit a 401.
 *
 * Never rejects and gives up after STARTUP_REFRESH_TIMEOUT_MS, so the app
 * always renders: a network error, timeout or 429/5xx leaves the refresh
 * token in place and surfaces on the first real request.
 */
export async function initializeAuth(): Promise<void> {
  if (_accessToken || !sessionStorage.getItem("refresh_token")) return;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STARTUP_REFRESH_TIMEOUT_MS);
  try {
    await attemptRefresh(controller.signal);
  } catch {
    // Network failure or timeout: keep the session; requests will report it.
  } finally {
    clearTimeout(timer);
  }
}

// ----------------------------------------------------------
// Refresh
//
// At most one refresh request per session is in flight, and a failed refresh
// is never retried here. Only a 400, 401, 403 or 422 means the refresh token
// was rejected and logs the user out; a 429, 5xx or other status keeps the
// session. After a 429, further refreshes fail fast until Retry-After has
// passed (capped at MAX_RETRY_AFTER_SECONDS).
// ----------------------------------------------------------
export type RefreshResult =
  | { kind: "refreshed"; tokens: TokenPair }
  | { kind: "failed"; error: ApiError }
  /** The session changed while the refresh was in flight; its result was dropped. */
  | { kind: "superseded" };

/** Wait used when a 429 from /auth/refresh has no readable Retry-After. */
const DEFAULT_REFRESH_BACKOFF_SECONDS = 30;

/** /auth/refresh statuses that mean the refresh token itself was refused. */
const REFRESH_TOKEN_REJECTED_STATUSES = new Set([400, 401, 403, 422]);

let _refresh: { generation: number; promise: Promise<RefreshResult> } | null = null;

function isTokenPair(value: unknown): value is TokenPair {
  if (typeof value !== "object" || value === null) return false;
  const { access_token, refresh_token } = value as Record<string, unknown>;
  return typeof access_token === "string" && typeof refresh_token === "string";
}

function authFailedError(): ApiError {
  return new ApiError({ status: 401, message: AUTH_FAILED_MESSAGE });
}

async function refreshOnce(generation: number, signal?: AbortSignal): Promise<RefreshResult> {
  const rt = sessionStorage.getItem("refresh_token");
  if (!rt) return { kind: "failed", error: authFailedError() };

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
    signal,
  });
  const isStillCurrent = () => generation === _sessionGeneration;

  if (!response.ok) {
    const error = await toApiError(response);
    if (!isStillCurrent()) return { kind: "superseded" };
    if (error.isRateLimited) {
      const waitSeconds = Math.min(
        error.retryAfterSeconds ?? DEFAULT_REFRESH_BACKOFF_SECONDS,
        MAX_RETRY_AFTER_SECONDS
      );
      _refreshBlockedUntil = Date.now() + waitSeconds * 1000;
    } else if (REFRESH_TOKEN_REJECTED_STATUSES.has(error.status)) {
      clearTokens(); // the refresh token was rejected — force re-login
    }
    return { kind: "failed", error };
  }

  const data: unknown = await response.json().catch(() => null);
  if (!isStillCurrent()) return { kind: "superseded" };
  if (!isTokenPair(data)) {
    return { kind: "failed", error: new ApiError({ status: 500, message: SERVER_ERROR_MESSAGE }) };
  }
  saveTokens(data);
  return { kind: "refreshed", tokens: data };
}

/** Refresh the active session, sharing one request between concurrent callers. */
function attemptRefresh(signal?: AbortSignal): Promise<RefreshResult> {
  const generation = _sessionGeneration;
  if (_refresh && _refresh.generation === generation) return _refresh.promise;

  const promise = refreshOnce(generation, signal).finally(() => {
    if (_refresh?.promise === promise) _refresh = null;
  });
  _refresh = { generation, promise };
  return promise;
}

/**
 * Access token to retry a request with after it got a 401 for `sentToken`.
 * If the token has changed since the request was sent (another request
 * refreshed it, or the user switched session), that newer token is used
 * without starting another refresh.
 */
async function tokenAfterUnauthorized(sentToken: string | null): Promise<string> {
  const current = getAccessToken();
  if (current !== null && current !== sentToken) return current;

  const refreshed = await attemptRefresh();
  switch (refreshed.kind) {
    case "refreshed":
      return refreshed.tokens.access_token;
    case "superseded": {
      const now = getAccessToken();
      if (now === null) throw authFailedError(); // logged out meanwhile
      return now;
    }
    case "failed":
      // A 429 or 5xx from /auth/refresh is passed on as is so the UI can say
      // "try again later" instead of "session expired".
      if (refreshed.error.isRateLimited || refreshed.error.status >= 500) throw refreshed.error;
      throw authFailedError();
  }
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

  const sentToken = requiresAuth ? getAccessToken() : null;
  let response = await fetchWithToken(sentToken ?? undefined);

  // One retry at most: a second 401 is thrown below.
  if (requiresAuth && response.status === 401) {
    response = await fetchWithToken(await tokenAfterUnauthorized(sentToken));
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

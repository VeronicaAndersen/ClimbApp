import {
  ApiError,
  MAX_RETRY_AFTER_SECONDS,
  SERVER_ERROR_MESSAGE,
  formatRateLimitMessage,
  toApiError,
} from "./apiError";
import { queryClient } from "./queryClient";

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
/**
 * Bumped when the account in use may change (login, switch, logout), but not
 * on a refresh. A request is only retried after a 401 if this is unchanged,
 * so a write sent for one account can never be replayed as another.
 */
let _accountGeneration = 0;

type TokenPair = { access_token: string; refresh_token: string };

/**
 * Store tokens. `newAccount` is false only for a refresh of the same account.
 * On an account change (login, signup, switch, logout) both response caches
 * are dropped, so data fetched for one account is never shown to another.
 */
function storeTokens(accessToken: string | null, refreshToken: string | null, newAccount: boolean) {
  _accessToken = accessToken;
  if (refreshToken === null) sessionStorage.removeItem("refresh_token");
  else sessionStorage.setItem("refresh_token", refreshToken);
  _refreshBlockedUntil = null;
  _sessionGeneration += 1;
  if (newAccount) {
    _accountGeneration += 1;
    clearCache();
    // Drops cached data and refetches mounted queries with the new tokens.
    void queryClient.resetQueries();
  }
}

/** Save tokens from a login or signup. */
function saveTokens(newTokens: TokenPair) {
  storeTokens(newTokens.access_token, newTokens.refresh_token, true);
}

export function clearTokens(): void {
  storeTokens(null, null, true);
}

export function getAccessToken(): string | null {
  return _accessToken;
}

/** Switch the active session without going through the login endpoint. */
export function switchSession(accessToken: string, refreshToken: string): void {
  storeTokens(accessToken, refreshToken, true);
}

export function isLoggedIn(): boolean {
  return sessionStorage.getItem("refresh_token") !== null;
}

/**
 * Call once at app startup. If a refresh token exists in sessionStorage but
 * the access token is gone (page reload), eagerly exchange it so the first
 * authenticated requests don't hit a 401.
 *
 * Never rejects, and the refresh settles within REFRESH_TIMEOUT_MS, so the
 * app always renders: a network error, timeout or 429/5xx leaves the refresh
 * token in place and surfaces on the first real request.
 */
export async function initializeAuth(): Promise<void> {
  if (_accessToken || !sessionStorage.getItem("refresh_token")) return;
  try {
    await attemptRefresh();
  } catch {
    // Network failure: keep the session; requests will report it.
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

/**
 * Longest a refresh may take. The refresh owns this timeout, not a caller,
 * so every request sharing it is settled and the next 401 can start a fresh
 * one; a hung refresh can't block the app after the network recovers.
 */
export const REFRESH_TIMEOUT_MS = 10_000;

export const REFRESH_TIMEOUT_MESSAGE = "Servern svarade inte i tid. Försök igen om en stund.";

/** Status of an ApiError for a request that got no HTTP response (timeout). */
const NO_RESPONSE_STATUS = 0;

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

export const SESSION_CHANGED_MESSAGE =
  "Du bytte konto eller loggade ut medan begäran pågick. Försök igen.";

/** A request got a 401 after the account changed; it is not retried. */
function sessionChangedError(): ApiError {
  return new ApiError({ status: 401, message: SESSION_CHANGED_MESSAGE });
}

async function refreshOnce(generation: number): Promise<RefreshResult> {
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

  // Bound the whole exchange. On timeout every waiter gets a timeout error
  // and the session is kept, as for a network error; a response that still
  // arrives later is ignored because isStillCurrent() is then false.
  const controller = new AbortController();
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<RefreshResult>((resolve) => {
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
      const error = new ApiError({ status: NO_RESPONSE_STATUS, message: REFRESH_TIMEOUT_MESSAGE });
      resolve({ kind: "failed", error });
    }, REFRESH_TIMEOUT_MS);
  });
  const isStillCurrent = () => !timedOut && generation === _sessionGeneration;
  try {
    return await Promise.race([
      exchangeRefreshToken(rt, controller.signal, isStillCurrent),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST /auth/refresh and apply the result. Nothing is saved or cleared once
 * `isStillCurrent()` is false (the refresh timed out or the session changed).
 */
async function exchangeRefreshToken(
  refreshToken: string,
  signal: AbortSignal,
  isStillCurrent: () => boolean
): Promise<RefreshResult> {
  const response = await fetch(`${apiUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    signal,
  });

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
  storeTokens(data.access_token, data.refresh_token, false); // same account
  return { kind: "refreshed", tokens: data };
}

/** Refresh the active session, sharing one request between concurrent callers. */
function attemptRefresh(): Promise<RefreshResult> {
  const generation = _sessionGeneration;
  if (_refresh && _refresh.generation === generation) return _refresh.promise;

  const promise = refreshOnce(generation).finally(() => {
    if (_refresh?.promise === promise) _refresh = null;
  });
  _refresh = { generation, promise };
  return promise;
}

/**
 * Access token to retry a request with after it got a 401 for `sentToken`,
 * which was sent while `sentAccount` was the account generation.
 *
 * If the account has changed (login, switch, logout) the request is rejected,
 * never replayed as another account. If only the token has changed (another
 * request refreshed it), the newer token is used without a second refresh.
 */
async function tokenAfterUnauthorized(
  sentToken: string | null,
  sentAccount: number
): Promise<string> {
  if (_accountGeneration !== sentAccount) throw sessionChangedError();

  const current = getAccessToken();
  if (current !== null && current !== sentToken) return current;

  const refreshed = await attemptRefresh();
  switch (refreshed.kind) {
    case "refreshed":
      // Saved only if nothing changed meanwhile, so this is still sentAccount.
      return refreshed.tokens.access_token;
    case "superseded": {
      // The session changed during the refresh: by a login, switch or logout
      // (reject), or else by a newer refresh of the same account (use it).
      if (_accountGeneration !== sentAccount) throw sessionChangedError();
      const now = getAccessToken();
      if (now === null) throw authFailedError();
      return now;
    }
    case "failed":
      // A 429, 5xx or timeout from /auth/refresh is passed on as is so the UI
      // can say "try again later" instead of "session expired".
      if (
        refreshed.error.isRateLimited ||
        refreshed.error.status >= 500 ||
        refreshed.error.status === NO_RESPONSE_STATUS
      ) {
        throw refreshed.error;
      }
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
  const sentAccount = _accountGeneration;
  let response = await fetchWithToken(sentToken ?? undefined);

  // One retry at most, and only for the same account: a second 401 is thrown below.
  if (requiresAuth && response.status === 401) {
    response = await fetchWithToken(await tokenAfterUnauthorized(sentToken, sentAccount));
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  // Invalidate cache for mutations. Done before reading the body, because a
  // successful mutation often has none (204) and must still clear stale GETs.
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const basePath = url.split("?")[0];
    const resourceType = basePath.split("/").slice(0, -1).join("/") || basePath;

    for (const key of cache.keys()) {
      if (key.includes(basePath) || key.includes(resourceType)) {
        cache.delete(key);
      }
    }
  }

  const raw = await response.text();
  if (!raw) return null as T;

  try {
    const data = JSON.parse(raw) as T;

    // Cache GET requests
    if (method === "GET" && !options.skipCache) {
      setCachedData(cacheKey, data);
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

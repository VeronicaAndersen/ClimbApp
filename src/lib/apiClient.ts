const apiUrl = import.meta.env.VITE_REACT_APP_API_URL;

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

function saveTokens(newTokens: { access_token: string; refresh_token: string }) {
  _accessToken = newTokens.access_token;
  sessionStorage.setItem("refresh_token", newTokens.refresh_token);
}

export function clearTokens(): void {
  _accessToken = null;
  sessionStorage.removeItem("refresh_token");
}

function getAccessToken(): string | null {
  return _accessToken;
}

export function isLoggedIn(): boolean {
  return sessionStorage.getItem("refresh_token") !== null;
}

// ----------------------------------------------------------
// Refresh
// ----------------------------------------------------------
async function attemptRefresh() {
  const rt = sessionStorage.getItem("refresh_token");
  if (!rt) return null;

  const response = await fetch(`${apiUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: rt }),
  });

  if (!response.ok) {
    clearTokens(); // tokens are no longer valid — force re-login
    return null;
  }

  const data = await response.json().catch(() => null);
  if (data) saveTokens(data);
  return data;
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

  if (requiresAuth && response.status === 401) {
    const newTokens = await attemptRefresh();
    if (!newTokens) throw new Error("Autentisering misslyckades");
    response = await fetchWithToken(newTokens.access_token);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Fel: ${response.status}`);
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
};

export const tokens = { saveTokens };

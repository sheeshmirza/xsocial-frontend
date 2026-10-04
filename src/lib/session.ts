import { api } from "@/src/config/api";
import { AuthResponseSchema, TokenSet } from "@/src/lib/schemas";
import { telemetry } from "@/src/lib/telemetry";

const ACCESS_TOKEN_KEY = "xs.accessToken";
const REFRESH_TOKEN_KEY = "xs.refreshToken";
const MAIN_DASHBOARD_URL_KEY = "xs.mainDashboardUrl";
const REQUEST_TIMEOUT_MS = 15000;
const MAX_NETWORK_RETRIES = 2;
const INITIAL_RETRY_DELAY_MS = 800;

let refreshInFlight: Promise<string> | null = null;

const isBrowser = typeof window !== "undefined";

/**
 * Normalizes request headers into a Headers instance
 */
const normalizeHeaders = (headers?: HeadersInit): Headers => {
  return new Headers(headers || {});
};

/**
 * Checks whether Content-Type should be defaulted to JSON
 */
const shouldSetJsonContentType = (body: RequestInit["body"]) => {
  if (!body) return false;
  if (typeof FormData !== "undefined" && body instanceof FormData) return false;
  return true;
};

/**
 * Parses response JSON safely without throwing
 */
export const parseJsonSafely = async (response: Response) =>
  response.json().catch(() => null);

/**
 * Sleeper utility for exponential backoff
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch wrapper with AbortController timeout and signal propagation
 */
export const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> => {
  if (typeof AbortController === "undefined") {
    return fetch(input, init);
  }

  const sourceSignal = init.signal;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException("Request timed out", "TimeoutError"));
  }, timeoutMs);

  const abortFromSource = () => {
    if (!controller.signal.aborted) {
      controller.abort(sourceSignal?.reason);
    }
  };

  if (sourceSignal?.aborted) {
    abortFromSource();
  } else if (sourceSignal) {
    sourceSignal.addEventListener("abort", abortFromSource, { once: true });
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted && controller.signal.reason?.name === "TimeoutError") {
      telemetry.trackEvent({
        name: "request_timeout",
        category: "network",
        severity: "warning",
        data: { url: String(input) },
      });
      throw new Error(`Request timed out after ${timeoutMs / 1000}s. Please check your connection.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    if (sourceSignal) {
      sourceSignal.removeEventListener("abort", abortFromSource);
    }
  }
};

/**
 * Resilient fetch with exponential backoff on network failures / transient 5xx errors
 */
export const fetchWithRetry = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  retries = MAX_NETWORK_RETRIES,
  delayMs = INITIAL_RETRY_DELAY_MS,
): Promise<Response> => {
  let attempt = 0;
  let lastError: unknown = null;

  while (attempt <= retries) {
    try {
      const response = await fetchWithTimeout(input, init);
      // If 502/503/504 transient server error and we have retries left, retry
      if ([502, 503, 504].includes(response.status) && attempt < retries) {
        attempt += 1;
        await sleep(delayMs * Math.pow(2, attempt - 1));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      // Do not retry client aborts
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      if (attempt < retries) {
        attempt += 1;
        await sleep(delayMs * Math.pow(2, attempt - 1));
        continue;
      }
      break;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Network request failed after retries.");
};

export const getAccessToken = (): string => {
  if (!isBrowser) return "";
  return localStorage.getItem(ACCESS_TOKEN_KEY) || "";
};

export const getRefreshToken = (): string => {
  if (!isBrowser) return "";
  return localStorage.getItem(REFRESH_TOKEN_KEY) || "";
};

export const setSessionTokens = (tokens: TokenSet) => {
  if (!isBrowser) return;
  if (tokens.accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  }
  if (tokens.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
};

export const clearSession = () => {
  if (!isBrowser) return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(MAIN_DASHBOARD_URL_KEY);
};

export const logoutSession = async () => {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await fetchWithTimeout(api.auth.logout(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({ refreshToken }),
      }, 5000);
    }
  } catch (error) {
    telemetry.captureException(error, { context: "logout" });
  } finally {
    clearSession();
  }
};

export const setMainDashboardUrl = (url: string) => {
  if (!isBrowser || !url) return;
  localStorage.setItem(MAIN_DASHBOARD_URL_KEY, url);
};

export const getMainDashboardUrl = (): string => {
  if (!isBrowser) return "";
  return localStorage.getItem(MAIN_DASHBOARD_URL_KEY) || "";
};

const runRefreshSession = async (): Promise<string> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return "";
  }

  try {
    const response = await fetchWithRetry(api.auth.refresh(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    }, 1);

    const rawData = await parseJsonSafely(response);
    if (!response.ok) {
      clearSession();
      return "";
    }

    const parsed = AuthResponseSchema.safeParse(rawData);
    const data = parsed.success ? parsed.data : rawData;

    const accessToken =
      data?.data?.tokens?.accessToken ||
      data?.tokens?.accessToken ||
      data?.token ||
      data?.accessToken;
    const nextRefreshToken =
      data?.data?.tokens?.refreshToken ||
      data?.tokens?.refreshToken ||
      data?.refreshToken ||
      refreshToken;

    if (!accessToken || typeof accessToken !== "string") {
      clearSession();
      return "";
    }

    setSessionTokens({
      accessToken,
      refreshToken: nextRefreshToken,
    });

    return accessToken;
  } catch (err) {
    telemetry.captureException(err, { context: "token_refresh" });
    clearSession();
    return "";
  }
};

export const refreshSession = async (): Promise<string> => {
  if (!refreshInFlight) {
    refreshInFlight = runRefreshSession().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};

export const isJwtExpired = (token: string, bufferSeconds = 30): boolean => {
  if (!token) return true;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    const parsed = JSON.parse(jsonPayload);
    if (!parsed.exp) return false;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    return parsed.exp <= nowInSeconds + bufferSeconds;
  } catch {
    return true;
  }
};

export const isAuthenticated = (): boolean => {
  if (!isBrowser) return false;
  return Boolean(getAccessToken() || getRefreshToken());
};

export const ensureAccessToken = async (): Promise<string> => {
  const existing = getAccessToken();
  if (existing && !isJwtExpired(existing)) {
    return existing;
  }
  return refreshSession();
};

export const authFetch = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  allowRetry = true,
): Promise<Response> => {
  const token = await ensureAccessToken();
  if (!token) {
    clearSession();
    throw new Error("Session expired. Please sign in again.");
  }

  const headers = normalizeHeaders(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  if (!headers.has("Content-Type") && shouldSetJsonContentType(init.body)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetchWithRetry(input, {
    ...init,
    headers,
  });

  if (response.status === 401 && allowRetry) {
    const refreshed = await refreshSession();
    if (!refreshed) {
      clearSession();
      throw new Error("Session expired. Please sign in again.");
    }

    const retryHeaders = normalizeHeaders(init.headers);
    retryHeaders.set("Authorization", `Bearer ${refreshed}`);
    if (!retryHeaders.has("Content-Type") && shouldSetJsonContentType(init.body)) {
      retryHeaders.set("Content-Type", "application/json");
    }

    const retryResponse = await fetchWithRetry(input, {
      ...init,
      headers: retryHeaders,
    });

    if (retryResponse.status === 401) {
      clearSession();
    }
    return retryResponse;
  }

  if (response.status === 401) {
    clearSession();
  }

  return response;
};

export class ApiHttpError extends Error {
  public status: number;
  public details?: any;

  constructor(status: number, message: string, details?: any) {
    super(message);
    this.name = "ApiHttpError";
    this.status = status;
    this.details = details;
  }
}

export const authJsonFetch = async <T = any>(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<T> => {
  const response = await authFetch(input, init);
  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      `Request failed with status ${response.status}`;

    if (response.status === 401) {
      clearSession();
      if (
        isBrowser &&
        !window.location.pathname.startsWith("/signin") &&
        !window.location.pathname.startsWith("/signup") &&
        !window.location.pathname.startsWith("/verify-email") &&
        !window.location.pathname.startsWith("/forgot-password") &&
        !window.location.pathname.startsWith("/reset-password")
      ) {
        window.location.href = `/signin?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
    }

    throw new ApiHttpError(response.status, message, payload);
  }

  return payload as T;
};

export const jsonFetch = async <T = any>(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<T> => {
  const response = await fetchWithRetry(input, init);
  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    const message = payload?.message || payload?.error || `Request failed with status ${response.status}`;
    throw new ApiHttpError(response.status, message, payload);
  }

  return payload as T;
};

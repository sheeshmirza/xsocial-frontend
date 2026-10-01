import { api } from "@/src/config/api";

const ACCESS_TOKEN_KEY = "xs.accessToken";
const REFRESH_TOKEN_KEY = "xs.refreshToken";
const MAIN_DASHBOARD_URL_KEY = "xs.mainDashboardUrl";
const REQUEST_TIMEOUT_MS = 15000;

let refreshInFlight: Promise<string> | null = null;

type TokenSet = {
  accessToken?: string;
  refreshToken?: string;
};

const isBrowser = typeof window !== "undefined";

const normalizeHeaders = (headers?: HeadersInit): Headers => {
  const next = new Headers(headers || {});
  return next;
};

const shouldSetJsonContentType = (body: RequestInit["body"]) => {
  if (!body) {
    return false;
  }
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    return false;
  }
  return true;
};

const parseJsonSafely = async (response: Response) =>
  response.json().catch(() => null);

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS,
) => {
  if (typeof AbortController === "undefined") {
    return fetch(input, init);
  }

  const sourceSignal = init.signal;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const abortFromSource = () => {
    if (!controller.signal.aborted) {
      controller.abort();
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
  } finally {
    clearTimeout(timeoutId);
    if (sourceSignal) {
      sourceSignal.removeEventListener("abort", abortFromSource);
    }
  }
};

export const getAccessToken = (): string => {
  if (!isBrowser) {
    return "";
  }
  return localStorage.getItem(ACCESS_TOKEN_KEY) || "";
};

export const getRefreshToken = (): string => {
  if (!isBrowser) {
    return "";
  }
  return localStorage.getItem(REFRESH_TOKEN_KEY) || "";
};

export const setSessionTokens = (tokens: TokenSet) => {
  if (!isBrowser) {
    return;
  }
  if (tokens.accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  }
  if (tokens.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
};

export const clearSession = () => {
  if (!isBrowser) {
    return;
  }
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(MAIN_DASHBOARD_URL_KEY);
};

export const logoutSession = async () => {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await fetch(api.auth.logout(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch (_error) {
    // Best-effort logout. Local session is cleared regardless.
  } finally {
    clearSession();
  }
};

export const setMainDashboardUrl = (url: string) => {
  if (!isBrowser || !url) {
    return;
  }
  localStorage.setItem(MAIN_DASHBOARD_URL_KEY, url);
};

export const getMainDashboardUrl = (): string => {
  if (!isBrowser) {
    return "";
  }
  return localStorage.getItem(MAIN_DASHBOARD_URL_KEY) || "";
};

const runRefreshSession = async (): Promise<string> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return "";
  }

  try {
    const response = await fetchWithTimeout(api.auth.refresh(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await parseJsonSafely(response);
    if (!response.ok) {
      clearSession();
      return "";
    }

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
  } catch (_error) {
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

export const isJwtExpired = (token: string, bufferSeconds = 15): boolean => {
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

  const response = await fetchWithTimeout(input, {
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
    if (
      !retryHeaders.has("Content-Type") &&
      shouldSetJsonContentType(init.body)
    ) {
      retryHeaders.set("Content-Type", "application/json");
    }

    const retryResponse = await fetchWithTimeout(input, {
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

export const authJsonFetch = async <T = any>(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<T> => {
  const response = await authFetch(input, init);
  const payload = await parseJsonSafely(response);

  if (!response.ok) {
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
        window.location.href = "/signin";
      }
      throw new Error("Session expired. Please sign in again.");
    }
    const message =
      payload?.message ||
      payload?.error ||
      "Request failed";
    throw new Error(message);
  }

  return payload as T;
};

export const jsonFetch = async <T = any>(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<T> => {
  const response = await fetchWithTimeout(input, init);
  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    throw new Error(payload?.message || "Request failed");
  }

  return payload as T;
};

"use client";

import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import { api } from "@/src/config/api";
import AppIcon from "@/src/components/ui/AppIcon";

type Profile = {
  id?: string;
  name?: string;
  email?: string;
};

const CHATGPT_XSOCIAL_URL =
  "https://chatgpt.com/plugins/plugins_6abe9a135fb08191b06ab57d40f44e2e";

/**
 * Validates that redirect URI has a safe scheme and valid structure.
 */
function isSafeRedirectUri(uri: string): boolean {
  try {
    const parsed = new URL(uri);
    return (
      parsed.protocol === "https:" ||
      (parsed.protocol === "http:" &&
        (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1"))
    );
  } catch {
    return false;
  }
}

export default function MCPAuthorizePage() {
  const emailId = useId();
  const passwordId = useId();

  const [transaction, setTransaction] = useState("");
  const [oauthAccessToken, setOAuthAccessToken] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setTransaction(params.get("transaction") || "");
    }
  }, []);

  const hasTransaction = useMemo(() => Boolean(transaction), [transaction]);

  const parseResponse = async (response: Response) => {
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(
        payload?.message ||
          payload?.error ||
          "Could not complete the sign-in request.",
      );
    }
    return payload;
  };

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!transaction) {
      setError("Please start the connection from ChatGPT to link your account.");
      return;
    }

    setLoading(true);
    try {
      const payload = await parseResponse(
        await fetch(api.auth.login(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }),
      );

      const accessToken =
        payload?.data?.tokens?.accessToken ||
        payload?.tokens?.accessToken ||
        payload?.token ||
        payload?.accessToken;

      if (!accessToken) {
        throw new Error("Could not verify your sign-in.");
      }

      setOAuthAccessToken(accessToken);
      const user = payload?.data?.user || payload?.user;
      setProfile({
        id: user?.id,
        name: user?.fullName || user?.name || "",
        email: user?.email || email.trim(),
      });
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function decide(action: "allow" | "deny") {
    setError("");

    if (!transaction) {
      setError("Please start the connection from ChatGPT to link your account.");
      return;
    }

    setDecisionLoading(true);
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      };

      if (action === "allow") {
        if (!oauthAccessToken) {
          throw new Error("Please sign in before allowing access.");
        }
        headers.Authorization = `Bearer ${oauthAccessToken}`;
      }

      const body = new URLSearchParams({
        transaction,
        action,
      });

      const payload = await parseResponse(
        await fetch(api.oauth.authorize(), {
          method: "POST",
          headers,
          body,
        }),
      );

      setOAuthAccessToken("");

      if (!payload?.redirect_uri) {
        throw new Error("Could not find return address.");
      }

      // Security: Validate redirect_uri to prevent Open Redirect attacks
      if (!isSafeRedirectUri(payload.redirect_uri)) {
        throw new Error("Could not verify security of the return address.");
      }

      window.location.assign(payload.redirect_uri);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not complete connection. Please try again.",
      );
      setDecisionLoading(false);
    }
  }

  if (!hasTransaction) {
    return (
      <main className="auth-shell" id="main-content">
        <section className="auth-card text-center" aria-labelledby="chatgpt-auth-title">
          <p className="eyebrow">XSocial</p>
          <div className="card-title-row justify-center">
            <span className="icon-token" aria-hidden="true">
              <AppIcon name="bot" className="app-icon" />
            </span>
            <p className="subtitle-inline">OAuth Handshake</p>
          </div>
          <h1 id="chatgpt-auth-title">Start from ChatGPT</h1>
          <p className="subtitle">
            This page is the XSocial authorization screen used after ChatGPT
            starts an OAuth connection. Opening this URL directly does not
            create an active OAuth transaction.
          </p>
          <a
            href={CHATGPT_XSOCIAL_URL}
            className="solid-link inline-flex items-center justify-center w-full min-h-[44px] mt-4 no-underline text-sm font-semibold"
          >
            Return to XSocial in ChatGPT
          </a>
        </section>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="auth-shell" id="main-content">
        <section className="auth-card" aria-labelledby="signin-auth-title">
          <p className="eyebrow">XSocial</p>
          <div className="card-title-row">
            <span className="icon-token" aria-hidden="true">
              <AppIcon name="shield" className="app-icon" />
            </span>
            <p className="subtitle-inline">Connect to ChatGPT</p>
          </div>
          <h1 id="signin-auth-title">Sign in to XSocial</h1>
          <p className="subtitle">
            Use your XSocial account to authorize ChatGPT to access your
            connected social media workspace.
          </p>

          <form onSubmit={handleLogin} className="auth-form">
            <div>
              <label htmlFor={emailId}>Email address</label>
              <input
                id={emailId}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label htmlFor={passwordId}>Password</label>
              <input
                id={passwordId}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                minLength={8}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="primary-btn">
              {loading ? "Signing in..." : "Continue"}
            </button>
          </form>

          {error && <p className="message error" role="alert">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="auth-shell" id="main-content">
      <section className="auth-card" aria-labelledby="allow-auth-title">
        <p className="eyebrow">XSocial</p>
        <div className="card-title-row">
          <span className="icon-token" aria-hidden="true">
            <AppIcon name="check" className="app-icon" />
          </span>
          <p className="subtitle-inline">Authorize ChatGPT</p>
        </div>
        <h1 id="allow-auth-title">Allow access?</h1>
        <p className="subtitle">
          ChatGPT is requesting access to the XSocial account below.
        </p>

        <div className="message mb-4 bg-slate-50 border border-slate-200 text-slate-800">
          <strong>{profile.name || "Your XSocial account"}</strong>
          <br />
          <span className="text-xs text-slate-600">{profile.email}</span>
        </div>

        <div className="message mb-4 bg-slate-50 border border-slate-200 text-slate-800">
          <strong>Requested permissions</strong>
          <br />
          <span className="text-xs text-slate-600">
            Manage brands, scheduled posts, social accounts, and publishing.
          </span>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <button
            type="button"
            onClick={() => decide("allow")}
            disabled={decisionLoading}
            className="primary-btn w-full py-2.5"
          >
            {decisionLoading ? "Connecting..." : "Allow access"}
          </button>
          <button
            type="button"
            onClick={() => decide("deny")}
            disabled={decisionLoading}
            className="outline-btn w-full py-2.5"
          >
            Deny
          </button>
        </div>

        {error && <p className="message error mt-3" role="alert">{error}</p>}
      </section>
    </main>
  );
}

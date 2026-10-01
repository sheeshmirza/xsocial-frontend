"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getApiUrl, api } from "@/src/config/api";

type Profile = {
  id?: string;
  name?: string;
  email?: string;
};

const CHATGPT_XSOCIAL_URL =
  "https://chatgpt.com/plugins/plugins_6abe9a135fb08191b06ab57d40f44e2e";

export default function MCPAuthorizePage() {
  const [transaction, setTransaction] = useState("");
  const [oauthAccessToken, setOAuthAccessToken] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTransaction(params.get("transaction") || "");
  }, []);

  const hasTransaction = useMemo(() => Boolean(transaction), [transaction]);

  const parseResponse = async (response: Response) => {
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(
        payload?.message ||
          payload?.error ||
          "The OAuth request could not be completed.",
      );
    }
    return payload;
  };

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!transaction) {
      setError("Start the connection from ChatGPT so a valid OAuth session can be created.");
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
        throw new Error("xSocial did not return a valid access token.");
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
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  async function decide(action: "allow" | "deny") {
    setError("");

    if (!transaction) {
      setError("Start the connection from ChatGPT so a valid OAuth session can be created.");
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
        await fetch(getApiUrl("/oauth/authorize"), {
          method: "POST",
          headers,
          body,
        }),
      );

      setOAuthAccessToken("");

      if (!payload?.redirect_uri) {
        throw new Error("xSocial did not return the OAuth redirect.");
      }

      window.location.assign(payload.redirect_uri);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The OAuth request could not be completed.",
      );
      setDecisionLoading(false);
    }
  }

  if (!hasTransaction) {
    return (
      <main className="auth-shell" id="main-content">
        <section className="auth-card">
          <p className="eyebrow">XSocial</p>
          <h1>Start from ChatGPT</h1>
          <p className="subtitle">
            This page is the xSocial authorization screen used after ChatGPT
            starts an OAuth connection. Opening this URL directly does not
            create an OAuth session.
          </p>
          <a
            href={CHATGPT_XSOCIAL_URL}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              minHeight: 44,
              marginTop: 16,
              textDecoration: "none",
            }}
          >
            Return to xSocial in ChatGPT
          </a>
        </section>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="auth-shell" id="main-content">
        <section className="auth-card">
          <p className="eyebrow">XSocial</p>
          <div className="card-title-row">
            <span className="icon-token" aria-hidden="true">
              🔐
            </span>
            <p className="subtitle-inline">Connect to ChatGPT</p>
          </div>
          <h1>Sign in to xSocial</h1>
          <p className="subtitle">
            Use your xSocial account to authorize ChatGPT to access your
            connected social media workspace.
          </p>

          <form onSubmit={handleLogin} className="auth-form">
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                minLength={8}
                required
              />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Continue"}
            </button>
          </form>

          {error && <p className="message error">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="auth-shell" id="main-content">
      <section className="auth-card">
        <p className="eyebrow">XSocial</p>
        <div className="card-title-row">
          <span className="icon-token" aria-hidden="true">
            ✓
          </span>
          <p className="subtitle-inline">Authorize ChatGPT</p>
        </div>
        <h1>Allow access?</h1>
        <p className="subtitle">
          ChatGPT is requesting access to the xSocial account below.
        </p>

        <div className="message" style={{ marginBottom: 16 }}>
          <strong>{profile.name || "Your xSocial account"}</strong>
          <br />
          {profile.email}
        </div>

        <div className="message" style={{ marginBottom: 16 }}>
          <strong>Requested access</strong>
          <br />
          Manage brands, analytics, scheduled posts, publishing, inbox
          conversations, SmartLinks, and reports.
        </div>

        <button
          type="button"
          onClick={() => decide("allow")}
          disabled={decisionLoading}
        >
          {decisionLoading ? "Connecting..." : "Allow access"}
        </button>
        <button
          type="button"
          onClick={() => decide("deny")}
          disabled={decisionLoading}
          style={{ marginTop: 10 }}
        >
          Deny
        </button>

        {error && <p className="message error">{error}</p>}
      </section>
    </main>
  );
}

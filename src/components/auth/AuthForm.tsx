"use client";

import Link from "next/link";
import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/config/api";
import AppIcon from "@/src/components/ui/AppIcon";
import {
  ensureAccessToken,
  jsonFetch,
  setMainDashboardUrl,
  setSessionTokens,
} from "@/src/lib/session";

type AuthMode = "signin" | "signup";

type Props = {
  mode: AuthMode;
};

export default function AuthForm({ mode }: Props) {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "signin") return;

    let isMounted = true;
    ensureAccessToken().then((token) => {
      if (isMounted && token) {
        router.replace("/dashboard");
      }
    });

    return () => {
      isMounted = false;
    };
  }, [mode, router]);

  const content = useMemo(
    () =>
      mode === "signup"
        ? {
            title: "Create your account",
            subtitle: "Plan, create, and schedule content across your social channels.",
            button: "Create Account",
            swapLabel: "Already have an account?",
            swapLink: "/signin",
            swapAction: "Sign In",
          }
        : {
            title: "Welcome back",
            subtitle: "Sign in to plan, publish, and manage your social content.",
            button: "Sign In",
            swapLabel: "Don't have an account?",
            swapLink: "/signup",
            swapAction: "Create Account",
          },
    [mode],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const endpoint = mode === "signup" ? api.auth.signup() : api.auth.login();
      const data = await jsonFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      if (mode === "signin") {
        const mainDashboardUrl = data?.data?.navigation?.mainDashboardUrl;
        const accessToken =
          data?.data?.tokens?.accessToken ||
          data?.tokens?.accessToken ||
          data?.token ||
          data?.accessToken;
        const refreshToken =
          data?.data?.tokens?.refreshToken ||
          data?.tokens?.refreshToken ||
          data?.refreshToken;

        setSessionTokens({
          accessToken,
          refreshToken,
        });

        if (mainDashboardUrl) {
          setMainDashboardUrl(mainDashboardUrl);
        }

        setSuccess("Welcome back. Redirecting to workspace...");
        router.replace("/dashboard");
        return;
      }

      if (data?.verificationToken) {
        setSuccess("Account created successfully. Redirecting to verify your email...");
        router.push(`/verify-email?token=${encodeURIComponent(data.verificationToken)}`);
        return;
      }

      setSuccess("Account created successfully. Please verify your email before signing in.");
      router.push("/signin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell" id="main-content">
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="eyebrow">XSocial</p>
        <div className="card-title-row">
          <span className="icon-token" aria-hidden="true">
            <AppIcon name={mode === "signin" ? "shield" : "users"} className="app-icon" />
          </span>
          <p className="subtitle-inline">
            {mode === "signin" ? "Secure sign in" : "Set up your workspace"}
          </p>
        </div>
        <h1 id="auth-title">{content.title}</h1>
        <p className="subtitle">{content.subtitle}</p>

        <form onSubmit={handleSubmit} className="auth-form" noValidate={false}>
          <div>
            <label htmlFor={emailId}>Email address</label>
            <input
              id={emailId}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
            />
          </div>

          <div>
            <label htmlFor={passwordId}>Password</label>
            <input
              id={passwordId}
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={8}
              required
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
            />
          </div>

          <button type="submit" disabled={loading} className="primary-btn">
            {loading ? "Processing..." : content.button}
          </button>
        </form>

        {mode === "signin" && (
          <p className="swap-cta">
            <Link href="/forgot-password">Forgot your password?</Link>
          </p>
        )}

        {error && (
          <p id={errorId} className="message error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="message success" role="status">
            {success}
          </p>
        )}

        <p className="swap-cta">
          {content.swapLabel} <Link href={content.swapLink}>{content.swapAction}</Link>
        </p>
      </section>
    </main>
  );
}

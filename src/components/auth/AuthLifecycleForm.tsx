"use client";

import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppIcon from "@/src/components/ui/AppIcon";
import { api } from "@/src/config/api";
import { jsonFetch } from "@/src/lib/session";

type Mode = "verify" | "forgot" | "reset";

type Props = { mode: Mode };

const copy: Record<Mode, { title: string; subtitle: string; button: string }> = {
  verify: {
    title: "Confirm your email",
    subtitle: "Paste the confirmation code from your email to activate your account.",
    button: "Confirm Email",
  },
  forgot: {
    title: "Forgot your password?",
    subtitle: "Enter your email address and we'll send you a link to choose a new password.",
    button: "Send Reset Link",
  },
  reset: {
    title: "Set a new password",
    subtitle: "Enter your reset code and choose a new password to secure your account.",
    button: "Save New Password",
  },
};

export default function AuthLifecycleForm({ mode }: Props) {
  const router = useRouter();
  const emailId = useId();
  const tokenId = useId();
  const passwordId = useId();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const queryToken = new URLSearchParams(window.location.search).get("token");
      if (queryToken) setToken(queryToken);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const requests: Record<Mode, { endpoint: string; body: Record<string, string> }> = {
      verify: { endpoint: api.auth.verifyEmail(), body: { token: token.trim() } },
      forgot: { endpoint: api.auth.forgotPassword(), body: { email: email.trim() } },
      reset: { endpoint: api.auth.resetPassword(), body: { token: token.trim(), newPassword: password } },
    };

    try {
      const request = requests[mode];
      const payload = await jsonFetch(request.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request.body),
      });

      setMessage({ type: "success", text: payload?.message || "Request completed successfully." });

      if (mode === "forgot" && payload?.resetToken) {
        timerRef.current = setTimeout(
          () => router.replace(`/reset-password?token=${encodeURIComponent(payload.resetToken)}`),
          1200,
        );
      } else if (mode !== "forgot") {
        timerRef.current = setTimeout(() => router.replace("/signin"), 1000);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Something went wrong. Please check your information and try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell" id="main-content">
      <section className="auth-card" aria-labelledby="lifecycle-title">
        <p className="eyebrow">XSocial</p>
        <div className="card-title-row">
          <span className="icon-token" aria-hidden="true">
            <AppIcon name="shield" className="app-icon" />
          </span>
          <p className="subtitle-inline">Account Security</p>
        </div>
        <h1 id="lifecycle-title">{copy[mode].title}</h1>
        <p className="subtitle">{copy[mode].subtitle}</p>

        <form onSubmit={submit} className="auth-form">
          {mode === "forgot" ? (
            <div>
              <label htmlFor={emailId}>Email address</label>
              <input
                id={emailId}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>
          ) : (
            <>
              <div>
                <label htmlFor={tokenId}>Confirmation code</label>
                <input
                  id={tokenId}
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  required
                  placeholder="Paste the code from your email"
                />
              </div>
              {mode === "reset" ? (
                <div>
                  <label htmlFor={passwordId}>New password</label>
                  <input
                    id={passwordId}
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={8}
                    maxLength={128}
                    required
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                  />
                </div>
              ) : null}
            </>
          )}

          <button type="submit" disabled={loading} className="primary-btn">
            {loading ? "Please wait..." : copy[mode].button}
          </button>
        </form>

        {message && (
          <p
            className={`message ${message.type}`}
            role={message.type === "error" ? "alert" : "status"}
          >
            {message.text}
          </p>
        )}
      </section>
    </main>
  );
}

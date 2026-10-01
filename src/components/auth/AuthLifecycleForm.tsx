"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppIcon from "@/src/components/ui/AppIcon";
import { api } from "@/src/config/api";
import { jsonFetch } from "@/src/lib/session";

type Mode = "verify" | "forgot" | "reset";

type Props = { mode: Mode };

const copy: Record<Mode, { title: string; subtitle: string; button: string }> = {
  verify: {
    title: "Verify your email",
    subtitle: "Paste the verification token from your email to activate your account.",
    button: "Verify Email",
  },
  forgot: {
    title: "Reset your password",
    subtitle: "Enter your email and we will send reset instructions if the account exists.",
    button: "Send Reset Instructions",
  },
  reset: {
    title: "Choose a new password",
    subtitle: "Use the reset token from your email and create a new password.",
    button: "Reset Password",
  },
};

export default function AuthLifecycleForm({ mode }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const queryToken = new URLSearchParams(window.location.search).get("token");
    if (queryToken) setToken(queryToken);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const requests: Record<Mode, { endpoint: string; body: Record<string, string> }> = {
      verify: { endpoint: api.auth.verifyEmail(), body: { token } },
      forgot: { endpoint: api.auth.forgotPassword(), body: { email: email.trim() } },
      reset: { endpoint: api.auth.resetPassword(), body: { token, newPassword: password } },
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
        setTimeout(() => router.replace(`/reset-password?token=${encodeURIComponent(payload.resetToken)}`), 1200);
      } else if (mode !== "forgot") {
        setTimeout(() => router.replace("/signin"), 900);
      }
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Request failed" });
    } finally {
      setLoading(false);
    }
  }

  const fields = mode === "forgot" ? (
    <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>
  ) : (
    <>
      <label>Verification token<input value={token} onChange={(event) => setToken(event.target.value)} required /></label>
      {mode === "reset" ? <label>New password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={128} required autoComplete="new-password" /></label> : null}
    </>
  );

  return (
    <main className="auth-shell" id="main-content">
      <section className="auth-card">
        <p className="eyebrow">XSocial</p>
        <div className="card-title-row"><span className="icon-token" aria-hidden="true"><AppIcon name="shield" className="app-icon" /></span><p className="subtitle-inline">Account security</p></div>
        <h1>{copy[mode].title}</h1>
        <p className="subtitle">{copy[mode].subtitle}</p>
        <form onSubmit={submit} className="auth-form">
          {fields}
          <button type="submit" disabled={loading}>{loading ? "Processing..." : copy[mode].button}</button>
        </form>
        {message && <p className={`message ${message.type}`}>{message.text}</p>}
      </section>
    </main>
  );
}

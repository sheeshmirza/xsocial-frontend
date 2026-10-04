"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  api,
  type SupportedSocialPlatform,
  SUPPORTED_SOCIAL_PLATFORMS,
} from "@/src/config/api";
import AppIcon from "@/src/components/ui/AppIcon";

type Status = "loading" | "success" | "error";

type OAuthProvider =
  | SupportedSocialPlatform
  | "facebook"
  | "x"
  | "twitter"
  | "youtube";

const supportedProviderSet = new Set<string>(SUPPORTED_SOCIAL_PLATFORMS);

const isSupportedProvider = (
  value: OAuthProvider,
): value is SupportedSocialPlatform => supportedProviderSet.has(value);

type Props = {
  provider: OAuthProvider;
  label: string;
  dashboardSocial?: string;
};

export default function OAuthCallbackHandler({
  provider,
  label,
  dashboardSocial,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState(
    `Finalizing your ${label} connection...`,
  );
  const executedRef = useRef(false);

  useEffect(() => {
    if (executedRef.current) return;
    executedRef.current = true;

    let redirectTimer: ReturnType<typeof setTimeout> | null = null;

    const redirect = (nextStatus: Status, nextMessage: string) => {
      setStatus(nextStatus);
      setMessage(nextMessage);
      redirectTimer = setTimeout(() => {
        const socialTag = dashboardSocial || provider;
        router.replace(
          `/accounts?connected=${socialTag}&status=${nextStatus}&message=${encodeURIComponent(nextMessage)}`,
        );
      }, 1000);
    };

    async function handleCallback() {
      if (!isSupportedProvider(provider)) {
        return redirect(
          "error",
          `${label} integration is not enabled in this backend. Supported providers: ${SUPPORTED_SOCIAL_PLATFORMS.join(
            ", ",
          )}.`,
        );
      }

      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state");
      const error = params.get("error");
      const errorDescription = params.get("error_description");

      if (error) {
        return redirect("error", errorDescription || error);
      }
      if (!code) {
        return redirect("error", "Missing OAuth authorization code.");
      }

      const callbackKey = `oauth-callback:${provider}:${code}:${state || ""}`;
      const callbackInFlightKey = `${callbackKey}:in-flight`;

      if (window.sessionStorage.getItem(callbackKey)) {
        return redirect("success", `${label} account connected successfully.`);
      }
      if (window.sessionStorage.getItem(callbackInFlightKey)) {
        return;
      }
      window.sessionStorage.setItem(callbackInFlightKey, "1");

      try {
        const callbackEndpoint = api.social.callback(provider, "");
        const callbackUrl = callbackEndpoint.startsWith("http")
          ? new URL(callbackEndpoint)
          : new URL(callbackEndpoint, window.location.origin);

        callbackUrl.searchParams.set("code", code);
        callbackUrl.searchParams.set("format", "json");
        if (state) {
          callbackUrl.searchParams.set("state", state);
        }

        const response = await fetch(callbackUrl.toString(), {
          headers: {
            Accept: "application/json",
          },
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.message || `Failed to connect ${label} account.`);
        }

        window.sessionStorage.setItem(callbackKey, "handled");
        redirect(
          "success",
          data?.message || `${label} account connected successfully.`,
        );
      } catch (err) {
        window.sessionStorage.removeItem(callbackKey);
        redirect(
          "error",
          err instanceof Error
            ? err.message
            : "Unable to complete authentication.",
        );
      } finally {
        window.sessionStorage.removeItem(callbackInFlightKey);
      }
    }

    handleCallback();

    return () => {
      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
    };
  }, [dashboardSocial, label, provider, router]);

  return (
    <main className="dashboard-shell" id="main-content">
      <section className="dashboard-card">
        <p className="eyebrow">{label}</p>
        <div className="card-title-row">
          <span className="icon-token" aria-hidden="true">
            <AppIcon
              name={
                status === "loading"
                  ? "clock"
                  : status === "success"
                    ? "check"
                    : "alert"
              }
              className="app-icon"
            />
          </span>
          <p className="subtitle-inline">OAuth handshake</p>
        </div>
        <h1>
          {status === "loading"
            ? "Connecting your account..."
            : status === "success"
              ? "Account connected"
              : "Connection failed"}
        </h1>
        <p className="subtitle">{message}</p>
        {status === "error" && (
          <div className="mt-4">
            <Link
              href="/accounts"
              className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              Return to Social Accounts
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

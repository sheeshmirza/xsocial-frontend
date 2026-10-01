"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  api,
  type SupportedSocialPlatform,
  SUPPORTED_SOCIAL_PLATFORMS,
} from "@/src/config/api";
import AppIcon from "@/src/components/ui/AppIcon";
import CrmShell from "@/src/components/ui/CrmShell";
import { authJsonFetch, clearSession, logoutSession } from "@/src/lib/session";

type Platform = SupportedSocialPlatform;

type SocialAccount = {
  _id: string;
  id?: string;
  platform: Platform;
  platformId?: string;
  platformDisplayName?: string;
  platformUsername?: string;
  platformMetadata?: {
    accountType?: string;
  };
};

type SocialAccountsResponse = {
  data?: SocialAccount[];
};

type ConnectResponse = {
  authUrl?: string;
  url?: string;
  platform?: string;
  data?: {
    authUrl?: string;
    url?: string;
    platform?: string;
  };
};

const platformCards = [
  { platform: "instagram", label: "Instagram" },
  { platform: "linkedin", label: "LinkedIn" },
] satisfies Array<{ platform: Platform; label: string }>;

const supportedPlatformSet = new Set<string>(SUPPORTED_SOCIAL_PLATFORMS);

const normalizeSocialAccount = (account: SocialAccount): SocialAccount => {
  const resolvedId = account._id || account.id || "";
  return {
    ...account,
    _id: resolvedId,
    id: resolvedId,
    platform: String(account.platform || "").toLowerCase() as Platform,
  };
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<Platform | null>(null);
  const [busyAccountId, setBusyAccountId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const redirectToSignIn = () => {
    clearSession();
    window.location.href = "/signin";
  };

  const connectedAccounts = accounts;

  const connectedPlatformsCount = useMemo(
    () => new Set(connectedAccounts.map((account) => account.platform)).size,
    [connectedAccounts],
  );

  const groupedAccounts = useMemo(() => {
    return platformCards.map(({ platform, label }) => ({
      platform,
      label,
      items: connectedAccounts.filter(
        (account) => account.platform === platform,
      ),
    }));
  }, [connectedAccounts]);

  const unconnectedPlatformsCount =
    platformCards.length - connectedPlatformsCount;

  const formatAccountLabel = (account: SocialAccount) => {
    const accountType = account.platformMetadata?.accountType || "personal";
    const kindLabel =
      accountType === "organization" || accountType === "page"
        ? "Page"
        : "Profile";
    const primary =
      account.platformDisplayName ||
      account.platformUsername ||
      account.platformId ||
      "Linked Account";
    return { kindLabel, primary };
  };

  async function loadAccounts(signal?: AbortSignal) {
    try {
      setLoading(true);
      const payload = await authJsonFetch<SocialAccountsResponse>(
        api.social.accounts(),
        {
          signal,
        },
      );
      const items = Array.isArray(payload?.data) ? payload.data : [];
      setAccounts(
        items.map(normalizeSocialAccount).filter((account): account is SocialAccount =>
          supportedPlatformSet.has(account.platform),
        ),
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to load social accounts";
      if (errorMessage.toLowerCase().includes("session expired")) {
        redirectToSignIn();
        return;
      }
      setMessage({
        type: "error",
        text: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect(platform: SupportedSocialPlatform) {
    try {
      setConnecting(platform);
      const payload = await authJsonFetch<ConnectResponse>(
        api.social.connect(platform),
        {
          method: "POST",
        },
      );

      const authUrl =
        payload?.data?.authUrl ||
        payload?.authUrl ||
        payload?.data?.url ||
        payload?.url;
      if (!authUrl) {
        throw new Error("OAuth URL unavailable");
      }

      window.location.href = authUrl;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unable to connect account";
      if (errorMessage.toLowerCase().includes("session expired")) {
        redirectToSignIn();
        return;
      }
      setMessage({
        type: "error",
        text: errorMessage,
      });
      setConnecting(null);
    }
  }

  async function handleAccountAction(
    accountId: string,
    action: "refresh" | "disconnect",
  ) {
    try {
      setBusyAccountId(accountId);
      await authJsonFetch(
        action === "refresh"
          ? api.social.refreshToken()
          : api.social.disconnect(accountId),
        {
          method: action === "refresh" ? "POST" : "DELETE",
          ...(action === "refresh"
            ? { body: JSON.stringify({ socialId: accountId }) }
            : {}),
        },
      );
      await loadAccounts();
      setMessage({
        type: "success",
        text: action === "refresh" ? "Account token refreshed." : "Account disconnected.",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unable to update account";
      if (errorMessage.toLowerCase().includes("session expired")) {
        redirectToSignIn();
        return;
      }
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setBusyAccountId(null);
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const connected = params.get("connected");
      const status = params.get("status");
      const paramMsg = params.get("message");
      if (connected) {
        const platformName = connected.charAt(0).toUpperCase() + connected.slice(1);
        if (status === "error") {
          setMessage({
            type: "error",
            text: paramMsg || `Failed to connect ${platformName} account.`,
          });
        } else {
          setMessage({
            type: "success",
            text: paramMsg || `Successfully connected ${platformName} account!`,
          });
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (paramMsg) {
        setMessage({
          type: status === "error" ? "error" : "success",
          text: paramMsg,
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    const controller = new AbortController();
    loadAccounts(controller.signal);

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <CrmShell
      pageTitle="Social Accounts"
      pageSubtitle="Connect the profiles you use to publish and keep access up to date."
      breadcrumbs={["XSocial", "Channels", "Social Accounts"]}
      onSignOut={async () => {
        await logoutSession();
        window.location.href = "/signin";
      }}
      actions={
        <>
          <button type="button" className="outline-btn" onClick={() => loadAccounts()}>
            Refresh Sync
          </button>
          <Link href="/dashboard" className="primary-btn">
            Open Dashboard
          </Link>
        </>
      }
      filters={
        <>
          <div className="filter-chip">
            <AppIcon name="users" className="app-icon" />
            Connected profiles: {connectedAccounts.length}
          </div>
          <div className="filter-chip">
            <AppIcon name="link" className="app-icon" />
            Platforms live: {connectedPlatformsCount} / {platformCards.length}
          </div>
          <div className="filter-chip">
            <AppIcon name="bot" className="app-icon" />
            Pending setup: {unconnectedPlatformsCount}
          </div>
        </>
      }
    >
      <section className="crm-grid crm-grid-accounts">
        <header className="workspace-head">
          <h2 className="section-title">
            <span className="icon-token" aria-hidden="true">
              <AppIcon name="link" className="app-icon" />
            </span>
            Connected Accounts
          </h2>
          <p>
            Connect Instagram and LinkedIn profiles to publish directly from
            your workspace. You can refresh access or disconnect an account at any time.
          </p>
          <div className="workspace-kpis">
            <article className="kpi-card">
              <p className="kpi-label">Profiles Connected</p>
              <p className="kpi-value">{connectedAccounts.length}</p>
            </article>
            <article className="kpi-card">
              <p className="kpi-label">Platforms Live</p>
              <p className="kpi-value">{connectedPlatformsCount}</p>
            </article>
            <article className="kpi-card">
              <p className="kpi-label">Need Setup</p>
              <p className="kpi-value">{unconnectedPlatformsCount}</p>
            </article>
          </div>
          {message && (
            <p className={`message ${message.type}`}>{message.text}</p>
          )}
        </header>

        <section className="crm-panel sidebar-panel">
          <h3 className="section-title section-title-small">
            <span className="icon-token" aria-hidden="true">
              <AppIcon name="shield" className="app-icon" />
            </span>
            Account Access
          </h3>
          <ul className="sidebar-list">
            <li>Connect accounts securely through each platform&apos;s authorization flow.</li>
            <li>Use the right profile or page for every publishing workflow.</li>
            <li>Refresh access when a platform token expires.</li>
            <li>Disconnect an account whenever you no longer need it.</li>
          </ul>
        </section>

        {loading ? (
          <p className="dash-state">Loading connected accounts...</p>
        ) : (
          <div className="platform-grid">
            {groupedAccounts.map(({ platform, label, items }) => {
              return (
                <article key={platform} className="platform-card">
                  <h2 className="section-title section-title-small">
                    <span className="icon-token" aria-hidden="true">
                      <AppIcon name="link" className="app-icon" />
                    </span>
                    {label}
                  </h2>
                  {items.length ? (
                    <>
                      <p className="platform-status connected">
                        Live ({items.length})
                      </p>
                      <div className="account-list">
                        {items.map((account) => {
                          const info = formatAccountLabel(account);
                          return (
                            <div
                              key={account._id}
                              className="account-list-item"
                            >
                              <p className="platform-meta">{info.primary}</p>
                              <p className="account-kind">{info.kindLabel}</p>
                              <div className="account-actions">
                                <button
                                  type="button"
                                  className="outline-btn"
                                  onClick={() => handleAccountAction(account._id, "refresh")}
                                  disabled={busyAccountId === account._id}
                                >
                                  Refresh Token
                                </button>
                                <button
                                  type="button"
                                  className="outline-btn"
                                  onClick={() => handleAccountAction(account._id, "disconnect")}
                                  disabled={busyAccountId === account._id}
                                >
                                  Disconnect
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="platform-status disconnected">
                        Awaiting authorization
                      </p>
                      <button
                        className="connect-btn"
                        disabled={connecting === platform}
                        onClick={() => handleConnect(platform)}
                      >
                        {connecting === platform
                          ? "Redirecting..."
                          : `Authorize ${label}`}
                      </button>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </CrmShell>
  );
}

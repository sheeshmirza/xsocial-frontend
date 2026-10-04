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
import Modal from "@/src/components/ui/Modal";
import { CardSkeleton } from "@/src/components/ui/Skeleton";
import { useToast } from "@/src/components/ui/ToastContext";
import ErrorBoundary from "@/src/components/ui/ErrorBoundary";
import { authJsonFetch, clearSession, logoutSession } from "@/src/lib/session";
import type { SocialAccount } from "@/src/lib/schemas";

type Platform = SupportedSocialPlatform;

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
  const toast = useToast();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<Platform | null>(null);
  const [busyAccountId, setBusyAccountId] = useState<string | null>(null);
  const [accountToDisconnect, setAccountToDisconnect] = useState<SocialAccount | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

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
      items: connectedAccounts.filter((account) => account.platform === platform),
    }));
  }, [connectedAccounts]);

  const unconnectedPlatformsCount = platformCards.length - connectedPlatformsCount;

  const formatAccountLabel = (account: SocialAccount) => {
    const accountType = account.platformMetadata?.accountType || "personal";
    const kindLabel =
      accountType === "organization" || accountType === "page" ? "Page" : "Profile";
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
      const payload = await authJsonFetch<SocialAccountsResponse>(api.social.accounts(), {
        signal,
      });
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
        error instanceof Error ? error.message : "Unable to load social accounts.";
      if (errorMessage.toLowerCase().includes("session expired")) {
        redirectToSignIn();
        return;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect(platform: SupportedSocialPlatform) {
    try {
      setConnecting(platform);
      const payload = await authJsonFetch<ConnectResponse>(api.social.connect(platform), {
        method: "POST",
      });

      const authUrl =
        payload?.data?.authUrl ||
        payload?.authUrl ||
        payload?.data?.url ||
        payload?.url;
      if (!authUrl) {
        throw new Error("OAuth connection URL unavailable.");
      }

      window.location.href = authUrl;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unable to initiate authorization.";
      if (errorMessage.toLowerCase().includes("session expired")) {
        redirectToSignIn();
        return;
      }
      toast.error(errorMessage);
      setConnecting(null);
    }
  }

  async function handleRefreshToken(accountId: string) {
    try {
      setBusyAccountId(accountId);
      await authJsonFetch(api.social.refreshToken(), {
        method: "POST",
        body: JSON.stringify({ socialId: accountId }),
      });
      await loadAccounts();
      toast.success("Account authorization token refreshed successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to refresh token.");
    } finally {
      setBusyAccountId(null);
    }
  }

  async function confirmDisconnect() {
    if (!accountToDisconnect) return;
    try {
      setDisconnecting(true);
      await authJsonFetch(api.social.disconnect(accountToDisconnect._id), {
        method: "DELETE",
      });
      toast.success("Social account disconnected.");
      setAccountToDisconnect(null);
      await loadAccounts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to disconnect account.");
    } finally {
      setDisconnecting(false);
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
          toast.error(paramMsg || `Failed to connect ${platformName} account.`);
        } else {
          toast.success(paramMsg || `Successfully connected ${platformName} account!`);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (paramMsg) {
        if (status === "error") toast.error(paramMsg);
        else toast.success(paramMsg);
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
      pageSubtitle="Connect profiles to publish content and keep authorization up to date."
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
            Platforms active: {connectedPlatformsCount} / {platformCards.length}
          </div>
          <div className="filter-chip">
            <AppIcon name="bot" className="app-icon" />
            Pending setup: {unconnectedPlatformsCount}
          </div>
        </>
      }
    >
      <ErrorBoundary fallbackTitle="Accounts overview encountered an issue">
        <section className="crm-grid crm-grid-accounts">
          <header className="workspace-head">
            <h2 className="section-title">
              <span className="icon-token" aria-hidden="true">
                <AppIcon name="link" className="app-icon" />
              </span>
              Connected Accounts
            </h2>
            <p>
              Connect Instagram and LinkedIn profiles to publish directly from your workspace. You
              can refresh access or disconnect an account at any time.
            </p>
            <div className="workspace-kpis">
              <article className="kpi-card">
                <p className="kpi-label">Profiles Connected</p>
                <p className="kpi-value">{connectedAccounts.length}</p>
              </article>
              <article className="kpi-card">
                <p className="kpi-label">Platforms Active</p>
                <p className="kpi-value">{connectedPlatformsCount}</p>
              </article>
              <article className="kpi-card">
                <p className="kpi-label">Awaiting Setup</p>
                <p className="kpi-value">{unconnectedPlatformsCount}</p>
              </article>
            </div>
          </header>

          <section className="crm-panel sidebar-panel">
            <h3 className="section-title section-title-small">
              <span className="icon-token" aria-hidden="true">
                <AppIcon name="shield" className="app-icon" />
              </span>
              OAuth Security & RBAC
            </h3>
            <ul className="text-xs text-slate-600 flex flex-col gap-2 mt-3 pl-4 list-disc">
              <li>Connect accounts securely through standard OAuth 2.0 PKCE handshakes.</li>
              <li>Tokens are isolated per workspace to enforce team boundary privacy.</li>
              <li>Refresh access when a platform bearer token reaches expiration.</li>
              <li>Disconnect accounts immediately when revoking social access.</li>
            </ul>
          </section>

          {loading ? (
            <div className="platform-grid">
              <CardSkeleton />
              <CardSkeleton />
            </div>
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
                          Live Connected ({items.length})
                        </p>
                        <div className="account-list">
                          {items.map((account) => {
                            const info = formatAccountLabel(account);
                            return (
                              <div key={account._id} className="account-list-item">
                                <p className="platform-meta">{info.primary}</p>
                                <p className="account-kind">{info.kindLabel}</p>
                                <div className="account-actions flex gap-2 mt-2">
                                  <button
                                    type="button"
                                    className="outline-btn text-xs px-2.5 py-1"
                                    onClick={() => handleRefreshToken(account._id)}
                                    disabled={busyAccountId === account._id}
                                  >
                                    {busyAccountId === account._id ? "Refreshing..." : "Refresh Token"}
                                  </button>
                                  <button
                                    type="button"
                                    className="outline-btn text-xs px-2.5 py-1 text-red-600 hover:border-red-300"
                                    onClick={() => setAccountToDisconnect(account)}
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
                          className="connect-btn mt-3"
                          disabled={connecting === platform}
                          onClick={() => handleConnect(platform)}
                        >
                          {connecting === platform ? "Redirecting..." : `Authorize ${label}`}
                        </button>
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </ErrorBoundary>

      {/* Disconnect Account Modal */}
      <Modal
        isOpen={Boolean(accountToDisconnect)}
        onClose={() => setAccountToDisconnect(null)}
        title="Disconnect Social Account?"
        description={`Are you sure you want to disconnect this ${accountToDisconnect?.platform} account? Scheduled posts targeting this handle will fail until reconnected.`}
        confirmLabel="Disconnect Account"
        isDestructive
        onConfirm={confirmDisconnect}
        isLoading={disconnecting}
      />
    </CrmShell>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { normalizeSocialAccount } from "@/src/lib/utils";
import { SocialAccountsResponseSchema } from "@/src/lib/schemas";
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

export default function AccountsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [connecting, setConnecting] = useState<Platform | null>(null);
  const [busyAccountId, setBusyAccountId] = useState<string | null>(null);
  const [accountToDisconnect, setAccountToDisconnect] = useState<SocialAccount | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const redirectToSignIn = () => {
    clearSession();
    window.location.href = "/signin";
  };

  // TanStack Query Caching
  const {
    data: accounts = [],
    isLoading: loading,
    refetch: refetchAccounts,
  } = useQuery({
    queryKey: ["social-accounts"],
    queryFn: async () => {
      try {
        const payload = await authJsonFetch<SocialAccountsResponse>(
          api.social.accounts(),
          {},
          SocialAccountsResponseSchema,
        );
        const items = Array.isArray(payload?.data) ? payload.data : [];
        return items
          .map(normalizeSocialAccount)
          .filter((account): account is SocialAccount =>
            supportedPlatformSet.has(account.platform),
          );
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unable to load social accounts.";
        if (msg.toLowerCase().includes("session expired")) {
          redirectToSignIn();
        }
        throw error;
      }
    },
  });

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
        throw new Error("Could not start connection with social platform.");
      }

      window.location.href = authUrl;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Could not connect account. Please try again.";
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
      await queryClient.invalidateQueries({ queryKey: ["social-accounts"] });
      toast.success("Account connection refreshed successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not refresh account connection.");
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
      toast.success("Account disconnected.");
      setAccountToDisconnect(null);
      await queryClient.invalidateQueries({ queryKey: ["social-accounts"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not disconnect account.");
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
          toast.error(paramMsg || `Could not connect ${platformName} account.`);
        } else {
          toast.success(paramMsg || `Connected your ${platformName} account!`);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (paramMsg) {
        if (status === "error") toast.error(paramMsg);
        else toast.success(paramMsg);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [toast]);

  return (
    <CrmShell
      pageTitle="Connected Accounts"
      pageSubtitle="Connect your social media accounts so you can publish directly from XSocial."
      breadcrumbs={["XSocial", "Connected Accounts"]}
      onSignOut={async () => {
        await logoutSession();
        window.location.href = "/signin";
      }}
      actions={
        <>
          <button
            type="button"
            className="outline-btn"
            onClick={() => refetchAccounts()}
          >
            Refresh
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
            Accounts: {connectedAccounts.length}
          </div>
          <div className="filter-chip">
            <AppIcon name="link" className="app-icon" />
            Connected: {connectedPlatformsCount} of {platformCards.length}
          </div>
          <div className="filter-chip">
            <AppIcon name="bot" className="app-icon" />
            Not connected: {unconnectedPlatformsCount}
          </div>
        </>
      }
    >
      <ErrorBoundary fallbackTitle="Could not load accounts">
        <section className="crm-grid crm-grid-accounts">
          <header className="workspace-head">
            <h2 className="section-title">
              <span className="icon-token" aria-hidden="true">
                <AppIcon name="link" className="app-icon" />
              </span>
              Connected Accounts
            </h2>
            <p>
              Connect Instagram and LinkedIn accounts to publish directly from XSocial. You
              can refresh access or disconnect an account at any time.
            </p>
            <div className="workspace-kpis">
              <article className="kpi-card">
                <p className="kpi-label">Connected Accounts</p>
                <p className="kpi-value">{connectedAccounts.length}</p>
              </article>
              <article className="kpi-card">
                <p className="kpi-label">Platforms</p>
                <p className="kpi-value">{connectedPlatformsCount}</p>
              </article>
              <article className="kpi-card">
                <p className="kpi-label">Available to Connect</p>
                <p className="kpi-value">{unconnectedPlatformsCount}</p>
              </article>
            </div>
          </header>

          <section className="crm-panel sidebar-panel">
            <h3 className="section-title section-title-small">
              <span className="icon-token" aria-hidden="true">
                <AppIcon name="shield" className="app-icon" />
              </span>
              Privacy & Security
            </h3>
            <ul className="text-xs text-slate-600 flex flex-col gap-2 mt-3 pl-4 list-disc">
              <li>Connect directly using official sign-in from Instagram and LinkedIn.</li>
              <li>Your social passwords are never seen or stored by XSocial.</li>
              <li>Refresh your connection anytime if a social platform requests re-confirmation.</li>
              <li>Disconnect any account immediately whenever you choose.</li>
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
                          Connected ({items.length})
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
                                    {busyAccountId === account._id ? "Refreshing..." : "Refresh Connection"}
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
                          Not connected
                        </p>
                        <button
                          className="connect-btn mt-3"
                          disabled={connecting === platform}
                          onClick={() => handleConnect(platform)}
                        >
                          {connecting === platform ? "Opening sign-in..." : `Connect ${label}`}
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
        title="Disconnect Account?"
        description={`Are you sure you want to disconnect this ${accountToDisconnect?.platform} account? Any scheduled posts for this account will be paused until you reconnect.`}
        confirmLabel="Disconnect Account"
        isDestructive
        onConfirm={confirmDisconnect}
        isLoading={disconnecting}
      />
    </CrmShell>
  );
}

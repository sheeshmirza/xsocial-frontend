"use client";

import Link from "next/link";
import AppIcon from "@/src/components/ui/AppIcon";
import { KpiSkeleton } from "@/src/components/ui/Skeleton";
import type { SocialAccount } from "@/src/lib/schemas";

interface AccountFilterBarProps {
  accounts: SocialAccount[];
  loading: boolean;
  selectedFilterIds: string[];
  onToggleFilter: (id: string) => void;
  onClearFilters: () => void;
  metrics: {
    connectedCount: number;
    drafts: number;
    scheduled: number;
    published: number;
  };
}

const platformLabelByName: Record<string, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
};

export default function AccountFilterBar({
  accounts,
  loading,
  selectedFilterIds,
  onToggleFilter,
  onClearFilters,
  metrics,
}: AccountFilterBarProps) {
  const formatAccountLabel = (account: SocialAccount) => {
    const accountType = account.platformMetadata?.accountType || "personal";
    const primaryLabel =
      account.platformDisplayName ||
      account.platformUsername ||
      account.platformId ||
      "Account";
    const accountKind =
      accountType === "organization" || accountType === "page" ? "Page" : "Profile";
    return `${primaryLabel} (${accountKind})`;
  };

  return (
    <header className="workspace-head">
      <h2 className="section-title">
        <span className="icon-token" aria-hidden="true">
          <AppIcon name="home" className="app-icon" />
        </span>
        Your Content at a Glance
      </h2>
      <p>
        Keep track of your social posts and see how your channels are doing.
      </p>

      <div className="dashboard-account-filter">
        <div className="dashboard-account-filter-head">
          <div>
            <h3 className="section-title section-title-small">Filter by Account</h3>
            <p>
              Choose an account to focus on its posts, or view all of them together.
            </p>
          </div>
          <button
            type="button"
            className="outline-btn text-xs"
            onClick={onClearFilters}
            disabled={!selectedFilterIds.length}
          >
            Show All Accounts
          </button>
        </div>

        {loading ? (
          <p className="composer-empty">Loading your accounts...</p>
        ) : !accounts.length ? (
          <p className="composer-empty">
            You haven't connected any accounts yet. Head over to{" "}
            <Link href="/accounts" className="link-inline">
              Connected Accounts
            </Link>{" "}
            to link your Instagram or LinkedIn.
          </p>
        ) : (
          <>
            <div className="composer-accounts">
              {accounts.map((account) => (
                <button
                  key={`filter-${account._id}`}
                  type="button"
                  className={`pill-btn ${selectedFilterIds.includes(account._id) ? "active" : ""}`}
                  onClick={() => onToggleFilter(account._id)}
                >
                  {platformLabelByName[account.platform] || account.platform}:{" "}
                  {formatAccountLabel(account)}
                </button>
              ))}
            </div>
            <p className="composer-empty">
              {selectedFilterIds.length
                ? `Showing posts for ${selectedFilterIds.length} selected account(s).`
                : "Showing posts for all your connected accounts."}
            </p>
          </>
        )}
      </div>

      <div className="workspace-kpis">
        {loading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <article className="kpi-card">
              <p className="kpi-label">Connected Accounts</p>
              <p className="kpi-value">{metrics.connectedCount}</p>
            </article>
            <article className="kpi-card">
              <p className="kpi-label">Drafts</p>
              <p className="kpi-value">{metrics.drafts}</p>
            </article>
            <article className="kpi-card">
              <p className="kpi-label">Scheduled Posts</p>
              <p className="kpi-value">{metrics.scheduled}</p>
            </article>
            <article className="kpi-card">
              <p className="kpi-label">Published Posts</p>
              <p className="kpi-value">{metrics.published}</p>
            </article>
          </>
        )}
      </div>
    </header>
  );
}

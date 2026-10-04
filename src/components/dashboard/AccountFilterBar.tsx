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
        Content Overview & Workspace Stats
      </h2>
      <p>
        Monitor publishing activity and filter real-time metrics across your connected handles.
      </p>

      <div className="dashboard-account-filter">
        <div className="dashboard-account-filter-head">
          <div>
            <h3 className="section-title section-title-small">Account Filter</h3>
            <p>
              Select profiles to isolate analytics and post queues. Leave empty to view all connected accounts.
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
          <p className="composer-empty">Loading connected profiles...</p>
        ) : !accounts.length ? (
          <p className="composer-empty">
            No connected accounts found. Go to the{" "}
            <Link href="/accounts" className="link-inline">
              Social Accounts
            </Link>{" "}
            page to authorize your handles.
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
                ? `Showing dashboard data for ${selectedFilterIds.length} selected profile(s).`
                : "Showing workspace data for all connected channels."}
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
              <p className="kpi-label">Active Handles</p>
              <p className="kpi-value">{metrics.connectedCount}</p>
            </article>
            <article className="kpi-card">
              <p className="kpi-label">Draft Posts</p>
              <p className="kpi-value">{metrics.drafts}</p>
            </article>
            <article className="kpi-card">
              <p className="kpi-label">Scheduled Jobs</p>
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

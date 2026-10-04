"use client";

import { useEffect, useMemo, useState } from "react";
import AppIcon from "@/src/components/ui/AppIcon";
import CrmShell from "@/src/components/ui/CrmShell";
import ErrorBoundary from "@/src/components/ui/ErrorBoundary";
import { useToast } from "@/src/components/ui/ToastContext";
import AccountFilterBar from "@/src/components/dashboard/AccountFilterBar";
import PostComposer from "@/src/components/dashboard/PostComposer";
import ScheduledPostsTable from "@/src/components/dashboard/ScheduledPostsTable";
import PublishedPostsTable from "@/src/components/dashboard/PublishedPostsTable";
import PostApprovalsModal from "@/src/components/dashboard/PostApprovalsModal";
import { api, SUPPORTED_SOCIAL_PLATFORMS } from "@/src/config/api";
import { authJsonFetch, clearSession, logoutSession } from "@/src/lib/session";
import type { PostItem, SocialAccount } from "@/src/lib/schemas";

const supportedPlatformSet = new Set<string>(SUPPORTED_SOCIAL_PLATFORMS);

const normalizeSocialAccount = (account: any): SocialAccount => {
  const resolvedId = account._id || account.id || "";
  return {
    ...account,
    _id: resolvedId,
    id: resolvedId,
    platform: String(account.platform || "").toLowerCase() as any,
  };
};

export default function DashboardPage() {
  const toast = useToast();

  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountFilterIds, setAccountFilterIds] = useState<string[]>([]);

  const [posts, setPosts] = useState<PostItem[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  // Approvals Modal state
  const [approvalsModalOpen, setApprovalsModalOpen] = useState(false);

  const localTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    [],
  );

  const redirectToSignIn = () => {
    clearSession();
    window.location.href = "/signin";
  };

  async function loadAccounts(signal?: AbortSignal) {
    try {
      setAccountsLoading(true);
      const payload = await authJsonFetch<{ data?: any[] }>(api.social.accounts(), { signal });
      const rawAccounts = Array.isArray(payload?.data) ? payload.data : [];
      setAccounts(
        rawAccounts
          .map(normalizeSocialAccount)
          .filter((acc) => supportedPlatformSet.has(acc.platform)),
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const msg = error instanceof Error ? error.message : "Failed to load social accounts.";
      if (msg.toLowerCase().includes("session expired")) {
        redirectToSignIn();
        return;
      }
      toast.error(msg);
    } finally {
      setAccountsLoading(false);
    }
  }

  async function loadPosts(signal?: AbortSignal) {
    try {
      setPostsLoading(true);
      const params = new URLSearchParams();
      params.append("limit", "100");
      params.append("sortBy", "createdAt");
      params.append("order", "desc");
      accountFilterIds.forEach((id) => params.append("accountIds", id));

      const payload = await authJsonFetch<{ data?: PostItem[] }>(
        api.posts.list(`?${params.toString()}`),
        { signal },
      );

      const items = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? (payload as any)
          : [];

      const normalized = items.map((p: any) => ({
        ...p,
        _id: p.id || p._id,
      }));

      setPosts(normalized);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const msg = error instanceof Error ? error.message : "Unable to load workspace posts.";
      if (msg.toLowerCase().includes("session expired")) {
        redirectToSignIn();
        return;
      }
      toast.error(msg);
    } finally {
      setPostsLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    loadAccounts(controller.signal);

    // Parse notification from query string if present
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const status = p.get("status");
      const message = p.get("message");
      if (status && message) {
        if (status === "success") toast.success(message);
        else toast.error(message);
        window.history.replaceState({}, "", "/dashboard");
      }
    }

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadPosts(controller.signal);
    return () => controller.abort();
  }, [accountFilterIds]);

  const toggleAccountFilter = (accountId: string) => {
    setAccountFilterIds((prev) =>
      prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId],
    );
  };

  const clearAccountFilters = () => {
    setAccountFilterIds([]);
  };

  // Filtered views
  const scheduledPosts = useMemo(
    () => posts.filter((p) => p.status === "scheduled" && p.reviewStatus !== "pending"),
    [posts],
  );

  const publishedPosts = useMemo(
    () =>
      posts.filter(
        (p) =>
          p.status === "published" ||
          (Array.isArray(p.platformResponses) &&
            p.platformResponses.some((r) => r.status === "success")),
      ),
    [posts],
  );

  const pendingApprovalPosts = useMemo(
    () => posts.filter((p) => p.reviewStatus === "pending"),
    [posts],
  );

  const metrics = useMemo(
    () => ({
      connectedCount: accounts.length,
      drafts: posts.filter((p) => p.status === "draft").length,
      scheduled: scheduledPosts.length,
      published: publishedPosts.length,
    }),
    [accounts.length, posts, scheduledPosts.length, publishedPosts.length],
  );

  return (
    <CrmShell
      pageTitle="Workspace Dashboard"
      pageSubtitle="Create, schedule, and track content across your authorized social handles."
      breadcrumbs={["XSocial", "Workspace", "Dashboard"]}
      onSignOut={async () => {
        await logoutSession();
        window.location.href = "/signin";
      }}
      actions={
        <div className="flex items-center gap-2">
          {pendingApprovalPosts.length > 0 && (
            <button
              type="button"
              className="outline-btn text-xs font-semibold text-amber-700 border-amber-300 hover:bg-amber-50"
              onClick={() => setApprovalsModalOpen(true)}
            >
              Approvals Queue ({pendingApprovalPosts.length})
            </button>
          )}
          <button type="button" className="outline-btn text-xs" onClick={() => loadPosts()}>
            Refresh Feeds
          </button>
        </div>
      }
      filters={
        <>
          <div className="filter-chip">
            <AppIcon name="users" className="app-icon" />
            Active handles: {accounts.length}
          </div>
          <div className="filter-chip">
            <AppIcon name="calendar" className="app-icon" />
            Scheduled queue: {scheduledPosts.length}
          </div>
          <div className="filter-chip">
            <AppIcon name="publish" className="app-icon" />
            Total items: {posts.length}
          </div>
        </>
      }
    >
      <div className="crm-grid crm-grid-dashboard">
        <ErrorBoundary fallbackTitle="Analytics summary encountered an error">
          <AccountFilterBar
            accounts={accounts}
            loading={accountsLoading}
            selectedFilterIds={accountFilterIds}
            onToggleFilter={toggleAccountFilter}
            onClearFilters={clearAccountFilters}
            metrics={metrics}
          />
        </ErrorBoundary>

        <ErrorBoundary fallbackTitle="Content composer encountered an error">
          <PostComposer
            accounts={accounts}
            localTimezone={localTimezone}
            onPostCreated={loadPosts}
          />
        </ErrorBoundary>

        <ErrorBoundary fallbackTitle="Scheduled queue encountered an error">
          <ScheduledPostsTable
            posts={scheduledPosts}
            accounts={accounts}
            loading={postsLoading}
            onReload={loadPosts}
            localTimezone={localTimezone}
          />
        </ErrorBoundary>

        <div className="col-span-12">
          <ErrorBoundary fallbackTitle="Published history encountered an error">
            <PublishedPostsTable
              posts={publishedPosts}
              loading={postsLoading}
              onReload={loadPosts}
            />
          </ErrorBoundary>
        </div>
      </div>

      {/* Approvals Modal (Complete Backend Mapping for /submit-approval, /approve, /reject) */}
      <PostApprovalsModal
        isOpen={approvalsModalOpen}
        onClose={() => setApprovalsModalOpen(false)}
        pendingPosts={pendingApprovalPosts}
        onReload={loadPosts}
      />
    </CrmShell>
  );
}

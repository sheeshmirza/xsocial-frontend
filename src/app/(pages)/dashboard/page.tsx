"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { SocialAccountsResponseSchema } from "@/src/lib/schemas";
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
  const queryClient = useQueryClient();

  const [accountFilterIds, setAccountFilterIds] = useState<string[]>([]);
  const [approvalsModalOpen, setApprovalsModalOpen] = useState(false);

  const localTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    [],
  );

  const redirectToSignIn = () => {
    clearSession();
    window.location.href = "/signin";
  };

  // TanStack Query: Social Accounts
  const {
    data: accounts = [],
    isLoading: accountsLoading,
  } = useQuery({
    queryKey: ["social-accounts"],
    queryFn: async () => {
      try {
        const payload = await authJsonFetch<{ data?: any[] }>(
          api.social.accounts(),
          {},
          SocialAccountsResponseSchema,
        );
        const rawAccounts = Array.isArray(payload?.data) ? payload.data : [];
        return rawAccounts
          .map(normalizeSocialAccount)
          .filter((acc) => supportedPlatformSet.has(acc.platform));
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Failed to load social accounts.";
        if (msg.toLowerCase().includes("session expired")) {
          redirectToSignIn();
        }
        throw error;
      }
    },
  });

  // TanStack Query: Posts
  const {
    data: posts = [],
    isLoading: postsLoading,
    refetch: refetchPosts,
  } = useQuery<PostItem[]>({
    queryKey: ["posts", accountFilterIds],
    queryFn: async (): Promise<PostItem[]> => {
      try {
        const params = new URLSearchParams();
        params.append("limit", "100");
        params.append("sortBy", "createdAt");
        params.append("order", "desc");
        accountFilterIds.forEach((id) => params.append("accountIds", id));

        const payload = await authJsonFetch<{ data?: PostItem[] }>(
          api.posts.list(`?${params.toString()}`),
        );

        const items = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? (payload as any)
            : [];

        return items.map((p: any) => ({
          ...p,
          _id: p.id || p._id,
        }));
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unable to load workspace posts.";
        if (msg.toLowerCase().includes("session expired")) {
          redirectToSignIn();
        }
        throw error;
      }
    },
  });

  const toggleAccountFilter = (accountId: string) => {
    setAccountFilterIds((prev) =>
      prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId],
    );
  };

  const clearAccountFilters = () => {
    setAccountFilterIds([]);
  };

  const handlePostMutated = async () => {
    await queryClient.invalidateQueries({ queryKey: ["posts"] });
  };

  // Filtered views
  const scheduledPosts = useMemo(
    () => posts.filter((p: PostItem) => p.status === "scheduled" && p.reviewStatus !== "pending"),
    [posts],
  );

  const publishedPosts = useMemo(
    () =>
      posts.filter(
        (p: PostItem) =>
          p.status === "published" ||
          (Array.isArray(p.platformResponses) &&
            p.platformResponses.some((r) => r.status === "success")),
      ),
    [posts],
  );

  const pendingApprovalPosts = useMemo(
    () => posts.filter((p: PostItem) => p.reviewStatus === "pending"),
    [posts],
  );

  const metrics = useMemo(
    () => ({
      connectedCount: accounts.length,
      drafts: posts.filter((p: PostItem) => p.status === "draft").length,
      scheduled: scheduledPosts.length,
      published: publishedPosts.length,
    }),
    [accounts.length, posts, scheduledPosts.length, publishedPosts.length],
  );

  return (
    <CrmShell
      pageTitle="Dashboard"
      pageSubtitle="Create, schedule, and view posts across all your social media accounts."
      breadcrumbs={["XSocial", "Dashboard"]}
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
              Needs Approval ({pendingApprovalPosts.length})
            </button>
          )}
          <button
            type="button"
            className="outline-btn text-xs"
            onClick={() => refetchPosts()}
          >
            Refresh
          </button>
        </div>
      }
      filters={
        <>
          <div className="filter-chip">
            Accounts: {accounts.length}
          </div>
          <div className="filter-chip">
            Scheduled: {scheduledPosts.length}
          </div>
          <div className="filter-chip">
            Published: {publishedPosts.length}
          </div>
        </>
      }
    >
      <div className="crm-grid crm-grid-dashboard">
        <ErrorBoundary fallbackTitle="Could not display account stats">
          <AccountFilterBar
            accounts={accounts}
            loading={accountsLoading}
            selectedFilterIds={accountFilterIds}
            onToggleFilter={toggleAccountFilter}
            onClearFilters={clearAccountFilters}
            metrics={metrics}
          />
        </ErrorBoundary>

        <ErrorBoundary fallbackTitle="Could not load post creator">
          <PostComposer
            accounts={accounts}
            localTimezone={localTimezone}
            onPostCreated={handlePostMutated}
          />
        </ErrorBoundary>

        <ErrorBoundary fallbackTitle="Could not load scheduled posts">
          <ScheduledPostsTable
            posts={scheduledPosts}
            accounts={accounts}
            loading={postsLoading}
            onReload={handlePostMutated}
            localTimezone={localTimezone}
          />
        </ErrorBoundary>

        <div className="col-span-12">
          <ErrorBoundary fallbackTitle="Could not load published posts">
            <PublishedPostsTable
              posts={publishedPosts}
              loading={postsLoading}
              onReload={handlePostMutated}
            />
          </ErrorBoundary>
        </div>
      </div>

      <PostApprovalsModal
        isOpen={approvalsModalOpen}
        onClose={() => setApprovalsModalOpen(false)}
        pendingPosts={pendingApprovalPosts}
        onReload={handlePostMutated}
      />
    </CrmShell>
  );
}

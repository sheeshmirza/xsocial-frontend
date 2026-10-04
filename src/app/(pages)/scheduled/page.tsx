"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import CrmShell from "@/src/components/ui/CrmShell";
import ErrorBoundary from "@/src/components/ui/ErrorBoundary";
import AppIcon from "@/src/components/ui/AppIcon";
import CalendarTimeline from "@/src/components/calendar/CalendarTimeline";
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

export default function ScheduledPostsPage() {
  const queryClient = useQueryClient();

  const localTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    [],
  );

  const redirectToSignIn = () => {
    clearSession();
    window.location.href = "/signin";
  };

  // TanStack Query: Accounts
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
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
    data: allPosts = [],
    isLoading: postsLoading,
    refetch: refetchPosts,
  } = useQuery<PostItem[]>({
    queryKey: ["posts"],
    queryFn: async (): Promise<PostItem[]> => {
      try {
        const payload = await authJsonFetch<{ data?: PostItem[] }>(
          api.posts.list("?limit=100&sortBy=createdAt&order=desc"),
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
        const msg = error instanceof Error ? error.message : "Unable to load scheduled posts.";
        if (msg.toLowerCase().includes("session expired")) {
          redirectToSignIn();
        }
        throw error;
      }
    },
  });

  // Filter to scheduled posts only
  const scheduledPosts = useMemo(
    () =>
      allPosts.filter(
        (p: PostItem) => p.status === "scheduled" && p.reviewStatus !== "pending",
      ),
    [allPosts],
  );

  const recurringPostsCount = useMemo(
    () => scheduledPosts.filter((p) => (p.recurrence || "once") !== "once").length,
    [scheduledPosts],
  );

  const handlePostMutated = async () => {
    await queryClient.invalidateQueries({ queryKey: ["posts"] });
  };

  return (
    <CrmShell
      pageTitle="Scheduled Posts"
      pageSubtitle="View, organize, and manage your upcoming content on a visual calendar timeline."
      breadcrumbs={["XSocial", "Scheduled Posts"]}
      onSignOut={async () => {
        await logoutSession();
        window.location.href = "/signin";
      }}
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="primary-btn inline-flex items-center gap-1.5 text-xs px-3.5 py-2 font-semibold no-underline"
          >
            <AppIcon name="plus" className="w-3.5 h-3.5" />
            Create Post
          </Link>
          <button
            type="button"
            className="outline-btn text-xs px-3 py-2"
            onClick={() => refetchPosts()}
          >
            Refresh
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {/* KPI Overview Cards */}
        <div className="workspace-kpis">
          <article className="kpi-card">
            <p className="kpi-label">Scheduled Posts</p>
            <p className="kpi-value">{scheduledPosts.length}</p>
          </article>
          <article className="kpi-card">
            <p className="kpi-label">Repeating Posts</p>
            <p className="kpi-value">{recurringPostsCount}</p>
          </article>
          <article className="kpi-card">
            <p className="kpi-label">Connected Accounts</p>
            <p className="kpi-value">{accounts.length}</p>
          </article>
          <article className="kpi-card">
            <p className="kpi-label">Your Timezone</p>
            <p className="kpi-value text-base font-semibold truncate pt-2">
              {localTimezone}
            </p>
          </article>
        </div>

        {/* Interactive Calendar-Based Timeline Component */}
        <ErrorBoundary fallbackTitle="Could not load the calendar schedule">
          <CalendarTimeline
            posts={scheduledPosts}
            accounts={accounts}
            loading={postsLoading || accountsLoading}
            onReload={handlePostMutated}
            localTimezone={localTimezone}
            onOpenComposer={() => {
              window.location.href = "/dashboard";
            }}
          />
        </ErrorBoundary>
      </div>
    </CrmShell>
  );
}

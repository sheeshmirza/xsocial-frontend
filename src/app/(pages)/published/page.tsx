"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import CrmShell from "@/src/components/ui/CrmShell";
import ErrorBoundary from "@/src/components/ui/ErrorBoundary";
import AppIcon from "@/src/components/ui/AppIcon";
import Modal from "@/src/components/ui/Modal";
import { TableSkeleton } from "@/src/components/ui/Skeleton";
import { useToast } from "@/src/components/ui/ToastContext";
import { api, SUPPORTED_SOCIAL_PLATFORMS } from "@/src/config/api";
import { authJsonFetch, clearSession, logoutSession } from "@/src/lib/session";
import { formatDate } from "@/src/lib/utils";
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

type ViewMode = "cards" | "table";

export default function PublishedPostsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Inspect Post State
  const [inspectingPost, setInspectingPost] = useState<PostItem | null>(null);

  // Single Action State
  const [resharingId, setResharingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

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
        const msg = error instanceof Error ? error.message : "Unable to load published posts.";
        if (msg.toLowerCase().includes("session expired")) {
          redirectToSignIn();
        }
        throw error;
      }
    },
  });

  // Filter to published posts only
  const publishedPosts = useMemo(
    () =>
      allPosts.filter(
        (p: PostItem) =>
          p.status === "published" ||
          (Array.isArray(p.platformResponses) &&
            p.platformResponses.some((r) => r.status === "success")),
      ),
    [allPosts],
  );

  // Filter by platform & search
  const filteredPosts = useMemo(() => {
    return publishedPosts.filter((post) => {
      if (platformFilter !== "all") {
        if (!post.selectedPlatforms?.includes(platformFilter as any)) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = post.title?.toLowerCase().includes(q);
        const matchesCaption = post.caption?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCaption) return false;
      }
      return true;
    });
  }, [publishedPosts, platformFilter, searchQuery]);

  // Unique channels used in published posts
  const uniqueChannelsCount = useMemo(() => {
    const set = new Set<string>();
    publishedPosts.forEach((p) => {
      p.selectedPlatforms?.forEach((plt) => set.add(plt));
    });
    return set.size;
  }, [publishedPosts]);

  // Bulk actions
  const allSelected =
    filteredPosts.length > 0 && filteredPosts.every((p) => selectedIds.includes(p._id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPosts.map((p) => p._id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  async function handleReshare(postId: string) {
    setResharingId(postId);
    try {
      await authJsonFetch(api.posts.reshare(postId), { method: "POST" });
      toast.success("Post shared again successfully!");
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not share post again.");
    } finally {
      setResharingId(null);
    }
  }

  async function confirmDelete() {
    if (!postToDelete) return;
    setDeletingId(postToDelete);
    try {
      await authJsonFetch(api.posts.deletePublished(postToDelete), { method: "DELETE" });
      setSelectedIds((prev) => prev.filter((id) => id !== postToDelete));
      toast.success("Post removed from history.");
      setPostToDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove post.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleBulkDelete() {
    if (!selectedIds.length) return;
    setBulkDeleting(true);
    try {
      await authJsonFetch(api.posts.bulkDeletePublished(), {
        method: "DELETE",
        body: JSON.stringify({ ids: selectedIds }),
      });
      toast.success(`${selectedIds.length} posts removed from history.`);
      setSelectedIds([]);
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove selected posts.");
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <CrmShell
      pageTitle="Published Posts"
      pageSubtitle="Browse your full publishing history, view delivered channels, and re-share past posts."
      breadcrumbs={["XSocial", "Published Posts"]}
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
            <p className="kpi-label">Published Posts</p>
            <p className="kpi-value">{publishedPosts.length}</p>
          </article>
          <article className="kpi-card">
            <p className="kpi-label">Channels Used</p>
            <p className="kpi-value">{uniqueChannelsCount}</p>
          </article>
          <article className="kpi-card">
            <p className="kpi-label">Connected Accounts</p>
            <p className="kpi-value">{accounts.length}</p>
          </article>
          <article className="kpi-card">
            <p className="kpi-label">Delivery Status</p>
            <p className="kpi-value text-emerald-600 font-semibold text-xl pt-2">
              100% Active
            </p>
          </article>
        </div>

        {/* Filter and View Switcher Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  viewMode === "cards"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setViewMode("cards")}
              >
                <AppIcon name="grid" className="w-3.5 h-3.5" />
                Cards Timeline
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  viewMode === "table"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setViewMode("table")}
              >
                <AppIcon name="trend" className="w-3.5 h-3.5" />
                Table View
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className={`pill-btn text-xs ${platformFilter === "all" ? "active" : ""}`}
                onClick={() => setPlatformFilter("all")}
              >
                All Channels
              </button>
              <button
                type="button"
                className={`pill-btn text-xs ${platformFilter === "instagram" ? "active" : ""}`}
                onClick={() => setPlatformFilter("instagram")}
              >
                Instagram
              </button>
              <button
                type="button"
                className={`pill-btn text-xs ${platformFilter === "linkedin" ? "active" : ""}`}
                onClick={() => setPlatformFilter("linkedin")}
              >
                LinkedIn
              </button>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search published posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs px-3 py-2 pl-8 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-600"
            />
            <span className="absolute left-2.5 top-2.5 text-slate-400">
              <AppIcon name="search" className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="bulk-action-bar p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-3">
            <span className="text-xs font-bold text-amber-900">
              {selectedIds.length} post(s) selected
            </span>
            <button
              type="button"
              className="outline-btn danger-btn text-xs px-3 py-1.5"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? "Removing..." : "Delete Selected"}
            </button>
            <button
              type="button"
              className="outline-btn text-xs px-3 py-1.5 ml-auto"
              onClick={() => setSelectedIds([])}
            >
              Clear Selection
            </button>
          </div>
        )}

        {/* Content View */}
        <ErrorBoundary fallbackTitle="Could not load published posts">
          {postsLoading || accountsLoading ? (
            <TableSkeleton rows={4} cols={5} />
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl bg-white border border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
                <AppIcon name="publish" className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">
                No published posts found
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery || platformFilter !== "all"
                  ? "Try adjusting your search terms or channel filters."
                  : "You haven't published any posts yet. Start by creating and publishing a post!"}
              </p>
              <Link
                href="/dashboard"
                className="primary-btn text-xs px-4 py-2 mt-4 inline-flex items-center gap-1.5 no-underline"
              >
                <AppIcon name="plus" className="w-3.5 h-3.5" />
                Create a Post Now
              </Link>
            </div>
          ) : viewMode === "cards" ? (
            /* CARDS TIMELINE VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPosts.map((post) => {
                const isSelected = selectedIds.includes(post._id);

                return (
                  <article
                    key={post._id}
                    className={`bg-white rounded-2xl border p-5 shadow-sm transition-all flex flex-col justify-between gap-4 ${
                      isSelected
                        ? "border-sky-600 ring-2 ring-sky-600/20 bg-sky-50/20"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(post._id)}
                            aria-label={`Select ${post.title || post._id}`}
                          />
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Published
                          </span>
                        </div>

                        <span className="text-[11px] text-slate-500 font-medium">
                          {formatDate(post.publishedTime || post.createdAt)}
                        </span>
                      </div>

                      {post.title && (
                        <h5 className="font-bold text-xs text-slate-900 line-clamp-1">
                          {post.title}
                        </h5>
                      )}

                      <p className="text-xs text-slate-700 whitespace-pre-wrap line-clamp-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        {post.caption}
                      </p>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-1">
                          {post.selectedPlatforms?.map((plt) => (
                            <span
                              key={plt}
                              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700"
                            >
                              {plt}
                            </span>
                          ))}
                        </div>

                        {post.media?.length ? (
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <AppIcon name="link" className="w-3.5 h-3.5" />
                            {post.media.length} media
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setInspectingPost(post)}
                        className="outline-btn text-xs px-2.5 py-1"
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReshare(post._id)}
                        disabled={resharingId === post._id}
                        className="outline-btn text-xs px-2.5 py-1"
                        title="Share this post again"
                      >
                        {resharingId === post._id ? "Sharing..." : "Share Again"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPostToDelete(post._id)}
                        disabled={deletingId === post._id}
                        className="outline-btn danger-btn text-xs px-2.5 py-1"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* DATA TABLE VIEW */
            <div className="posts-table-wrap bg-white rounded-2xl border border-slate-200 p-4 shadow-sm" role="region" aria-label="Published posts list">
              <table className="posts-table">
                <thead>
                  <tr>
                    <th scope="col" className="w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all published posts"
                      />
                    </th>
                    <th scope="col">Title & Message</th>
                    <th scope="col">Channels Shared</th>
                    <th scope="col">Published On</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPosts.map((post) => {
                    const isSelected = selectedIds.includes(post._id);

                    return (
                      <tr key={post._id} className={isSelected ? "row-selected" : ""}>
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(post._id)}
                            aria-label={`Select ${post.title || post._id}`}
                          />
                        </td>
                        <td>
                          {post.title && <p className="post-title">{post.title}</p>}
                          <p className="post-caption line-clamp-2">{post.caption}</p>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {post.selectedPlatforms?.map((plt) => (
                              <span
                                key={plt}
                                className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700"
                              >
                                {plt}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <p className="post-date font-semibold">
                            {formatDate(post.publishedTime || post.createdAt)}
                          </p>
                        </td>
                        <td>
                          <span className="status-pill status-published">PUBLISHED</span>
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              className="outline-btn text-xs px-2.5 py-1"
                              onClick={() => setInspectingPost(post)}
                            >
                              Details
                            </button>
                            <button
                              type="button"
                              className="outline-btn text-xs px-2.5 py-1"
                              onClick={() => handleReshare(post._id)}
                              disabled={resharingId === post._id}
                            >
                              {resharingId === post._id ? "Sharing..." : "Share Again"}
                            </button>
                            <button
                              type="button"
                              className="outline-btn danger-btn text-xs px-2.5 py-1"
                              onClick={() => setPostToDelete(post._id)}
                              disabled={deletingId === post._id}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </ErrorBoundary>
      </div>

      {/* Inspect Single Post Modal */}
      <Modal
        isOpen={Boolean(inspectingPost)}
        onClose={() => setInspectingPost(null)}
        title={inspectingPost?.title || "Post Details"}
        cancelLabel="Close"
      >
        {inspectingPost ? (
          <div className="flex flex-col gap-3 text-xs text-slate-700">
            <div>
              <span className="font-bold uppercase text-slate-500 block mb-1">Message</span>
              <p className="p-3 bg-slate-50 rounded-lg whitespace-pre-wrap border border-slate-200">
                {inspectingPost.caption}
              </p>
            </div>
            {inspectingPost.firstComment && (
              <div>
                <span className="font-bold uppercase text-slate-500 block mb-1">First Comment</span>
                <p className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  {inspectingPost.firstComment}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <div>
                <span className="font-bold text-slate-500 block">Published on:</span>
                <p>{formatDate(inspectingPost.publishedTime || inspectingPost.createdAt)}</p>
              </div>
              <div>
                <span className="font-bold text-slate-500 block">Post Type:</span>
                <p className="uppercase">{inspectingPost.postType || "Standard"}</p>
              </div>
            </div>
            {inspectingPost.media?.length ? (
              <div>
                <span className="font-bold text-slate-500 block mb-1">
                  Photos & Videos ({inspectingPost.media.length}):
                </span>
                <div className="flex flex-col gap-1">
                  {inspectingPost.media.map((m, idx) => (
                    <a
                      key={idx}
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-700 hover:underline truncate block"
                    >
                      {m.name || m.url}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* Delete Published Post Modal */}
      <Modal
        isOpen={Boolean(postToDelete)}
        onClose={() => setPostToDelete(null)}
        title="Remove Post from History?"
        description="This removes the post from your history list. (Note: this does not delete the post from your social media account)."
        confirmLabel="Remove from History"
        isDestructive
        onConfirm={confirmDelete}
        isLoading={Boolean(deletingId)}
      />
    </CrmShell>
  );
}

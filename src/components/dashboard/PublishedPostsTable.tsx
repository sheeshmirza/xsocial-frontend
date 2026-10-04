"use client";

import Link from "next/link";
import { useState } from "react";
import AppIcon from "@/src/components/ui/AppIcon";
import Modal from "@/src/components/ui/Modal";
import { TableSkeleton } from "@/src/components/ui/Skeleton";
import { useToast } from "@/src/components/ui/ToastContext";
import { api } from "@/src/config/api";
import { authJsonFetch } from "@/src/lib/session";
import { formatDate } from "@/src/lib/utils";
import type { PostItem } from "@/src/lib/schemas";

interface PublishedPostsTableProps {
  posts: PostItem[];
  loading: boolean;
  onReload: () => Promise<void> | void;
}

export default function PublishedPostsTable({
  posts,
  loading,
  onReload,
}: PublishedPostsTableProps) {
  const toast = useToast();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inspectingPost, setInspectingPost] = useState<PostItem | null>(null);
  const [loadingInspection, setLoadingInspection] = useState(false);
  const [resharingId, setResharingId] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const allSelected = posts.length > 0 && posts.every((p) => selectedIds.includes(p._id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(posts.map((p) => p._id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  async function handleInspect(postId: string) {
    setLoadingInspection(true);
    try {
      const payload = await authJsonFetch<{ data?: PostItem }>(api.posts.get(postId));
      setInspectingPost(payload?.data || posts.find((p) => p._id === postId) || null);
    } catch {
      // Fallback to local memory if single get endpoint fails
      setInspectingPost(posts.find((p) => p._id === postId) || null);
    } finally {
      setLoadingInspection(false);
    }
  }

  async function handleReshare(postId: string) {
    setResharingId(postId);
    try {
      await authJsonFetch(api.posts.reshare(postId), { method: "POST" });
      toast.success("Post shared again successfully!");
      await onReload();
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
      await onReload();
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
      await onReload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove selected posts.");
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <section className="posts-board mt-6" aria-labelledby="published-heading">
      <div className="flex items-center justify-between mb-4">
        <h3 id="published-heading" className="section-title section-title-small">
          <span className="icon-token" aria-hidden="true">
            <AppIcon name="trend" className="app-icon" />
          </span>
          Published Posts ({posts.length})
        </h3>
        <Link
          href="/published"
          className="text-xs font-semibold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1"
        >
          View Full History &rarr;
        </Link>
      </div>

      {loading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : posts.length === 0 ? (
        <p className="composer-empty">You haven't published any posts yet.</p>
      ) : (
        <>
          {selectedIds.length > 0 && (
            <div className="bulk-action-bar">
              <span className="bulk-action-count">{selectedIds.length} selected</span>
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
                Clear
              </button>
            </div>
          )}

          <div className="posts-table-wrap" role="region" aria-label="Published posts">
            <table className="posts-table">
              <thead>
                <tr>
                  <th scope="col" className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all published posts"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th scope="col">Title & Message</th>
                  <th scope="col">Channels Shared</th>
                  <th scope="col">Published On</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => {
                  const isSelected = selectedIds.includes(post._id);

                  return (
                    <tr key={post._id} className={isSelected ? "row-selected" : ""}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Select ${post.title || post._id}`}
                          checked={isSelected}
                          onChange={() => toggleSelectOne(post._id)}
                        />
                      </td>
                      <td>
                        {post.title ? <p className="post-title">{post.title}</p> : null}
                        <p className="post-caption line-clamp-2">{post.caption || "-"}</p>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {post.selectedPlatforms.map((plt) => (
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
                        {post.publishedExpiresAt && (
                          <p className="text-[11px] text-slate-500 mt-1">
                            Expires: {formatDate(post.publishedExpiresAt)}
                          </p>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            className="outline-btn text-xs px-2.5 py-1"
                            onClick={() => handleInspect(post._id)}
                          >
                            View Details
                          </button>
                          <button
                            type="button"
                            className="outline-btn text-xs px-2.5 py-1"
                            onClick={() => handleReshare(post._id)}
                            disabled={resharingId === post._id}
                            title="Share this post again"
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
        </>
      )}

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
    </section>
  );
}

"use client";

import { useState } from "react";
import AppIcon from "@/src/components/ui/AppIcon";
import Modal from "@/src/components/ui/Modal";
import { TableSkeleton } from "@/src/components/ui/Skeleton";
import { useToast } from "@/src/components/ui/ToastContext";
import { api } from "@/src/config/api";
import { authJsonFetch } from "@/src/lib/session";
import { formatDate } from "@/src/lib/utils";
import type { PostItem, SocialAccount, RecurrenceUnit } from "@/src/lib/schemas";

interface ScheduledPostsTableProps {
  posts: PostItem[];
  accounts: SocialAccount[];
  loading: boolean;
  onReload: () => Promise<void> | void;
  localTimezone: string;
}

const recurrenceUnitOptions: Array<{ value: RecurrenceUnit; label: string }> = [
  { value: "minute", label: "Minutes" },
  { value: "hour", label: "Hours" },
  { value: "day", label: "Days" },
  { value: "week", label: "Weeks" },
  { value: "month", label: "Months" },
];

export default function ScheduledPostsTable({
  posts,
  accounts,
  loading,
  onReload,
  localTimezone,
}: ScheduledPostsTableProps) {
  const toast = useToast();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingPost, setEditingPost] = useState<PostItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editTimezone, setEditTimezone] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Single Action IDs
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingRecurrenceId, setTogglingRecurrenceId] = useState<string | null>(null);

  // Bulk Action Flags
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);

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

  function startEdit(post: PostItem) {
    setEditingPost(post);
    setEditTitle(post.title || "");
    setEditCaption(post.caption || "");
    setEditTimezone(post.timezone || localTimezone);

    if (post.scheduledTime) {
      const d = new Date(post.scheduledTime);
      if (!Number.isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, "0");
        setEditDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
        setEditTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
      }
    }
  }

  async function handleSaveEdit() {
    if (!editingPost || !editDate || !editTime) {
      toast.error("Please pick both a date and a time.");
      return;
    }

    setSavingEdit(true);
    try {
      await authJsonFetch(api.posts.update(editingPost._id), {
        method: "PUT",
        body: JSON.stringify({
          title: editTitle.trim(),
          caption: editCaption.trim(),
        }),
      });

      await authJsonFetch(api.posts.schedule(editingPost._id), {
        method: "POST",
        body: JSON.stringify({
          date: editDate,
          time: editTime,
          timezone: editTimezone || localTimezone,
        }),
      });

      toast.success("Scheduled post updated successfully!");
      setEditingPost(null);
      await onReload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update scheduled post.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleToggleRecurrence(post: PostItem) {
    setTogglingRecurrenceId(post._id);
    try {
      if (post.recurrencePaused) {
        await authJsonFetch(api.posts.resumeRecurrence(post._id), { method: "POST" });
        toast.success("Repeating schedule resumed.");
      } else {
        await authJsonFetch(api.posts.pauseRecurrence(post._id), { method: "POST" });
        toast.success("Repeating schedule paused.");
      }
      await onReload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update repeating schedule.");
    } finally {
      setTogglingRecurrenceId(null);
    }
  }

  async function confirmDeletePost() {
    if (!postToDelete) return;
    setDeletingId(postToDelete);
    try {
      await authJsonFetch(api.posts.deleteScheduled(postToDelete), { method: "DELETE" });
      setSelectedIds((prev) => prev.filter((id) => id !== postToDelete));
      toast.success("Scheduled post deleted successfully.");
      setPostToDelete(null);
      await onReload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete scheduled post.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleBulkDelete() {
    if (!selectedIds.length) return;
    setBulkProcessing(true);
    try {
      await authJsonFetch(api.posts.bulkDeleteScheduled(), {
        method: "DELETE",
        body: JSON.stringify({ ids: selectedIds }),
      });
      toast.success(`${selectedIds.length} scheduled posts deleted.`);
      setSelectedIds([]);
      await onReload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete selected posts.");
    } finally {
      setBulkProcessing(false);
    }
  }

  async function handleBulkPause() {
    if (!selectedIds.length) return;
    setBulkProcessing(true);
    try {
      const result = await authJsonFetch<{ data?: { pausedCount: number } }>(
        api.posts.bulkPauseRecurrence(),
        {
          method: "POST",
          body: JSON.stringify({ ids: selectedIds }),
        },
      );
      toast.success(`${result?.data?.pausedCount ?? selectedIds.length} recurring posts paused.`);
      await onReload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not pause repeating posts.");
    } finally {
      setBulkProcessing(false);
    }
  }

  async function handleBulkResume() {
    if (!selectedIds.length) return;
    setBulkProcessing(true);
    try {
      const result = await authJsonFetch<{ data?: { resumedCount: number } }>(
        api.posts.bulkResumeRecurrence(),
        {
          method: "POST",
          body: JSON.stringify({ ids: selectedIds }),
        },
      );
      toast.success(`${result?.data?.resumedCount ?? selectedIds.length} recurring posts resumed.`);
      await onReload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resume repeating posts.");
    } finally {
      setBulkProcessing(false);
    }
  }

  return (
    <section className="posts-board" aria-labelledby="scheduled-heading">
      <div className="flex items-center justify-between mb-4">
        <h3 id="scheduled-heading" className="section-title section-title-small">
          <span className="icon-token" aria-hidden="true">
            <AppIcon name="calendar" className="app-icon" />
          </span>
          Scheduled Posts ({posts.length})
        </h3>
      </div>

      {loading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : posts.length === 0 ? (
        <p className="composer-empty">You don't have any scheduled posts yet.</p>
      ) : (
        <>
          {selectedIds.length > 0 && (
            <div className="bulk-action-bar">
              <span className="bulk-action-count">{selectedIds.length} selected</span>
              <button
                type="button"
                className="outline-btn danger-btn text-xs px-3 py-1.5"
                onClick={handleBulkDelete}
                disabled={bulkProcessing}
              >
                Delete Selected
              </button>
              <button
                type="button"
                className="outline-btn text-xs px-3 py-1.5"
                onClick={handleBulkPause}
                disabled={bulkProcessing}
              >
                Pause Repeating
              </button>
              <button
                type="button"
                className="outline-btn text-xs px-3 py-1.5"
                onClick={handleBulkResume}
                disabled={bulkProcessing}
              >
                Resume Repeating
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

          <div className="posts-table-wrap" role="region" aria-label="Scheduled posts">
            <table className="posts-table">
              <thead>
                <tr>
                  <th scope="col" className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all scheduled posts"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th scope="col">Title & Message</th>
                  <th scope="col">Scheduled Time</th>
                  <th scope="col">Repeat</th>
                  <th scope="col">Channels</th>
                  <th scope="col" className="text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => {
                  const isRecurring = (post.recurrence || "once") !== "once";
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
                        <p className="post-date font-semibold">
                          {formatDate(post.scheduledTime)}
                        </p>
                        <p className="post-date text-[11px] text-slate-500">
                          {post.timezone || localTimezone}
                        </p>
                      </td>
                      <td>
                        <span className="status-pill status-scheduled">
                          {(post.recurrence || "once").toUpperCase()}
                          {post.recurrencePaused ? " (PAUSED)" : ""}
                        </span>
                      </td>
                      <td>
                        <p className="post-platforms">
                          {post.selectedPlatforms.join(", ") || "All channels"}
                        </p>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            className="outline-btn text-xs px-2.5 py-1"
                            onClick={() => startEdit(post)}
                          >
                            Edit
                          </button>
                          {isRecurring && (
                            <button
                              type="button"
                              className="outline-btn text-xs px-2.5 py-1"
                              onClick={() => handleToggleRecurrence(post)}
                              disabled={togglingRecurrenceId === post._id}
                            >
                              {post.recurrencePaused ? "Resume" : "Pause"}
                            </button>
                          )}
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

      {/* Edit Scheduled Modal */}
      <Modal
        isOpen={Boolean(editingPost)}
        onClose={() => setEditingPost(null)}
        title="Edit Scheduled Post"
        description="Change your post text or update when it will be published."
        confirmLabel="Save Changes"
        onConfirm={handleSaveEdit}
        isLoading={savingEdit}
      >
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">
              Title
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">
              Message
            </label>
            <textarea
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value)}
              rows={3}
              className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">
                Date
              </label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">
                Time
              </label>
              <input
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(postToDelete)}
        onClose={() => setPostToDelete(null)}
        title="Delete Scheduled Post?"
        description="This post will be permanently canceled and will not be published."
        confirmLabel="Delete Post"
        isDestructive
        onConfirm={confirmDeletePost}
        isLoading={Boolean(deletingId)}
      />
    </section>
  );
}

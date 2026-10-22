"use client";

import { useState } from "react";
import Modal from "@/src/components/ui/Modal";
import { useToast } from "@/src/components/ui/ToastContext";
import { api } from "@/src/config/api";
import { authJsonFetch } from "@/src/lib/session";
import { formatDate } from "@/src/lib/utils";
import type { PostItem } from "@/src/lib/schemas";

interface PostApprovalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingPosts: PostItem[];
  onReload: () => Promise<void> | void;
}

export default function PostApprovalsModal({
  isOpen,
  onClose,
  pendingPosts,
  onReload,
}: PostApprovalsModalProps) {
  const toast = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectingPostId, setRejectingPostId] = useState<string | null>(null);

  async function handleApprove(postId: string) {
    setProcessingId(postId);
    try {
      await authJsonFetch(api.posts.approve(postId), { method: "POST" });
      toast.success("Post approved! It is now scheduled to be published.");
      await onReload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not approve post.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(postId: string) {
    setProcessingId(postId);
    try {
      await authJsonFetch(api.posts.reject(postId), {
        method: "POST",
        body: JSON.stringify({ reason: rejectionReason.trim() }),
      });
      toast.success("Post sent back to creator with your notes.");
      setRejectingPostId(null);
      setRejectionReason("");
      await onReload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not return post.");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Posts Needing Approval"
      description="Review posts from your team before they are published."
      cancelLabel="Close"
    >
      <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
        {pendingPosts.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            <p className="font-semibold text-slate-700">No posts waiting for approval.</p>
            <p className="mt-1">You&apos;re all caught up!</p>
          </div>
        ) : (
          pendingPosts.map((post) => (
            <div
              key={post._id}
              className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">
                    {post.title || "Untitled Post"}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Created: {formatDate(post.createdAt)} • Channels:{" "}
                    {post.selectedPlatforms.join(", ") || "All"}
                  </p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  Needs Review
                </span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap">
                {post.caption}
              </div>

              {rejectingPostId === post._id ? (
                <div className="flex flex-col gap-2 p-3 bg-white rounded-lg border border-red-200">
                  <label className="text-[11px] font-semibold text-slate-700">
                    Notes for the author (what should be changed):
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Please update the discount code and use our brand logo..."
                    className="text-xs p-2 border rounded-md"
                    rows={2}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setRejectingPostId(null)}
                      className="outline-btn text-xs px-2.5 py-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(post._id)}
                      disabled={processingId === post._id}
                      className="outline-btn danger-btn text-xs px-2.5 py-1"
                    >
                      {processingId === post._id ? "Sending..." : "Send Back"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setRejectingPostId(post._id)}
                    disabled={processingId === post._id}
                    className="outline-btn danger-btn text-xs px-3 py-1.5"
                  >
                    Request Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(post._id)}
                    disabled={processingId === post._id}
                    className="primary-btn text-xs px-3 py-1.5"
                  >
                    {processingId === post._id ? "Approving..." : "Approve Post"}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}

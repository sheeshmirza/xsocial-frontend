"use client";

import { useEffect, useState } from "react";
import AppIcon from "@/src/components/ui/AppIcon";
import CrmShell from "@/src/components/ui/CrmShell";
import { api } from "@/src/config/api";
import { authJsonFetch, clearSession } from "@/src/lib/session";

interface InboxMessage {
  id?: string;
  sender: string;
  senderName?: string;
  text: string;
  timestamp: string;
  isFromAccount: boolean;
}

interface InboxConversation {
  id?: string;
  _id?: string;
  platform: "instagram" | "linkedin";
  participantName: string;
  participantId?: string;
  lastMessageSnippet: string;
  lastMessageTime: string;
  status: "open" | "closed" | "archived";
  unreadCount?: number;
  messages?: InboxMessage[];
}

interface CannedReply {
  id?: string;
  _id?: string;
  title: string;
  content: string;
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<InboxConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [cannedReplies, setCannedReplies] = useState<CannedReply[]>([]);
  const [showCannedModal, setShowCannedModal] = useState(false);
  const [newCannedTitle, setNewCannedTitle] = useState("");
  const [newCannedContent, setNewCannedContent] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const getConvId = (c: InboxConversation) => c.id || c._id || "";
  const getCannedId = (cr: CannedReply) => cr.id || cr._id || "";

  async function loadInbox() {
    setLoading(true);
    try {
      let query = `?status=${statusFilter}`;
      if (platformFilter !== "all") query += `&platform=${platformFilter}`;
      const resp = await authJsonFetch<{ data?: InboxConversation[] }>(api.inbox.list(query));
      const list = resp?.data || [];
      const normalized = list.map((c) => ({ ...c, _id: getConvId(c) }));
      setConversations(normalized);
      if (normalized.length > 0 && !selectedConv) {
        setSelectedConv(normalized[0]);
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to load conversations" });
    } finally {
      setLoading(false);
    }
  }

  async function loadCanned() {
    try {
      const resp = await authJsonFetch<{ data?: CannedReply[] }>(api.inbox.cannedReplies());
      setCannedReplies(resp?.data || []);
    } catch {
      // Ignore canned fetch errors silently
    }
  }

  useEffect(() => {
    loadInbox();
    loadCanned();
  }, [platformFilter, statusFilter]);

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedConv || !replyText.trim()) return;
    const convId = getConvId(selectedConv);
    setSending(true);
    try {
      await authJsonFetch(api.inbox.reply(convId), {
        method: "POST",
        body: JSON.stringify({ message: replyText.trim() }),
      });
      const newMsg: InboxMessage = {
        sender: "me",
        senderName: "You",
        text: replyText.trim(),
        timestamp: new Date().toISOString(),
        isFromAccount: true,
      };
      setSelectedConv({
        ...selectedConv,
        messages: [...(selectedConv.messages || []), newMsg],
        lastMessageSnippet: newMsg.text,
      });
      setReplyText("");
      setMessage({ type: "success", text: "Reply sent successfully!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to send reply" });
    } finally {
      setSending(false);
    }
  }

  async function handleUpdateStatus(status: "open" | "closed" | "archived") {
    if (!selectedConv) return;
    const convId = getConvId(selectedConv);
    try {
      await authJsonFetch(api.inbox.updateStatus(convId), {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setSelectedConv({ ...selectedConv, status });
      await loadInbox();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update status" });
    }
  }

  async function handleCreateCanned(e: React.FormEvent) {
    e.preventDefault();
    if (!newCannedTitle.trim() || !newCannedContent.trim()) return;
    try {
      await authJsonFetch(api.inbox.cannedReplies(), {
        method: "POST",
        body: JSON.stringify({ title: newCannedTitle.trim(), content: newCannedContent.trim() }),
      });
      setNewCannedTitle("");
      setNewCannedContent("");
      setShowCannedModal(false);
      await loadCanned();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to save template" });
    }
  }

  return (
    <CrmShell
      pageTitle="Unified Inbox"
      pageSubtitle="Engage with comments, DMs, and mentions across LinkedIn and Instagram in real-time."
      breadcrumbs={["XSocial", "Inbox"]}
      onSignOut={() => {
        clearSession();
        window.location.href = "/signin";
      }}
    >
      {message && (
        <div className={`message-banner ${message.type === "error" ? "error" : "success"}`}>
          <p>{message.text}</p>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border rounded-lg bg-white font-medium"
          >
            <option value="all">All Channels</option>
            <option value="linkedin">LinkedIn</option>
            <option value="instagram">Instagram</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border rounded-lg bg-white font-medium"
          >
            <option value="open">Open</option>
            <option value="closed">Resolved</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setShowCannedModal(true)}
          className="text-xs bg-white border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5"
        >
          <AppIcon name="bolt" className="w-3.5 h-3.5 text-amber-600" />
          Canned Templates ({cannedReplies.length})
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[640px]">
        {/* Conversations List */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col h-full overflow-hidden md:col-span-1">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
            Threads ({conversations.length})
          </h2>
          <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
            {loading ? (
              <p className="text-xs text-slate-400 py-6 text-center">Loading conversations...</p>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                <AppIcon name="send" className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No messages found.
              </div>
            ) : (
              conversations.map((c) => {
                const cId = getConvId(c);
                const isSelected = selectedConv && getConvId(selectedConv) === cId;
                return (
                  <button
                    key={cId}
                    type="button"
                    onClick={() => setSelectedConv(c)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? "bg-teal-50/50 border-teal-600 shadow-sm"
                        : "bg-white border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-slate-900 truncate">
                        {c.participantName}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {c.platform}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{c.lastMessageSnippet}</p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Conversation Thread & Reply */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col h-full overflow-hidden md:col-span-2">
          {selectedConv ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{selectedConv.participantName}</h3>
                  <p className="text-[11px] text-slate-500">
                    Platform: <span className="capitalize">{selectedConv.platform}</span> • Status:{" "}
                    <span className="capitalize font-semibold">{selectedConv.status}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {selectedConv.status !== "closed" ? (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus("closed")}
                      className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50"
                    >
                      Mark Resolved
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus("open")}
                      className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-2 pr-1">
                {(selectedConv.messages || [
                  {
                    sender: selectedConv.participantName,
                    text: selectedConv.lastMessageSnippet,
                    timestamp: selectedConv.lastMessageTime || new Date().toISOString(),
                    isFromAccount: false,
                  },
                ]).map((m, idx) => (
                  <div
                    key={idx}
                    className={`max-w-[80%] rounded-2xl p-3 text-xs ${
                      m.isFromAccount
                        ? "self-end bg-teal-700 text-white rounded-tr-none"
                        : "self-start bg-slate-100 text-slate-800 rounded-tl-none"
                    }`}
                  >
                    <p>{m.text}</p>
                    <span
                      className={`text-[9px] mt-1 block ${
                        m.isFromAccount ? "text-teal-200" : "text-slate-400"
                      }`}
                    >
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>

              {/* Canned reply quick chips */}
              {cannedReplies.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto py-2 border-t border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Quick:</span>
                  {cannedReplies.map((cr) => (
                    <button
                      key={getCannedId(cr)}
                      type="button"
                      onClick={() => setReplyText(cr.content)}
                      className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full whitespace-nowrap"
                    >
                      {cr.title}
                    </button>
                  ))}
                </div>
              )}

              {/* Reply Input Form */}
              <form onSubmit={handleSendReply} className="flex gap-2 pt-2 border-t border-slate-200/80">
                <input
                  type="text"
                  placeholder="Type a response..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border rounded-xl outline-none focus:ring-2 focus:ring-teal-600 bg-white"
                  required
                />
                <button
                  type="submit"
                  disabled={sending || !replyText.trim()}
                  className="bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
                >
                  <AppIcon name="send" className="w-3.5 h-3.5" />
                  {sending ? "Sending..." : "Reply"}
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              Select a conversation to reply
            </div>
          )}
        </div>
      </div>

      {/* Canned Templates Modal */}
      {showCannedModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="font-bold text-base mb-4">Canned Reply Templates</h3>
            <form onSubmit={handleCreateCanned} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Thanks for connecting"
                  value={newCannedTitle}
                  onChange={(e) => setNewCannedTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Content</label>
                <textarea
                  placeholder="e.g. Thanks for reaching out! We appreciate your feedback..."
                  value={newCannedContent}
                  onChange={(e) => setNewCannedContent(e.target.value)}
                  className="w-full text-xs px-3 py-2 border rounded-lg h-24"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCannedModal(false)}
                  className="text-xs px-3 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs px-4 py-2 bg-teal-700 text-white rounded-lg font-medium"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CrmShell>
  );
}

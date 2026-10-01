"use client";

import { useEffect, useState } from "react";
import AppIcon from "@/src/components/ui/AppIcon";
import CrmShell from "@/src/components/ui/CrmShell";
import { api } from "@/src/config/api";
import { authJsonFetch, clearSession } from "@/src/lib/session";

interface Autolist {
  id?: string;
  _id?: string;
  name: string;
  isActive: boolean;
  timeSlots?: { dayOfWeek: number; hour: number; minute: number }[];
  postCount?: number;
  createdAt?: string;
}

interface RSSFeed {
  id?: string;
  _id?: string;
  feedUrl: string;
  targetPlatforms?: string[];
}

export default function AutolistsPage() {
  const [autolists, setAutolists] = useState<Autolist[]>([]);
  const [rssFeeds, setRssFeeds] = useState<RSSFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [rssUrl, setRssUrl] = useState("");
  const [rssName, setRssName] = useState("");
  const [creating, setCreating] = useState(false);
  const [addingRss, setAddingRss] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const getListId = (l: Autolist) => l.id || l._id || "";
  const getFeedId = (f: RSSFeed) => f.id || f._id || "";

  async function loadData() {
    setLoading(true);
    try {
      const [listResp, rssResp] = await Promise.all([
        authJsonFetch<{ data?: Autolist[] }>(api.autolists.list()),
        authJsonFetch<{ data?: RSSFeed[] }>(api.autolists.rssList()),
      ]);
      setAutolists((listResp?.data || []).map((l) => ({ ...l, _id: getListId(l) })));
      setRssFeeds((rssResp?.data || []).map((f) => ({ ...f, _id: getFeedId(f) })));
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to load autolists" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreateAutolist(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await authJsonFetch(api.autolists.create(), {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          targetPlatforms: ["linkedin", "instagram"],
          timeSlots: [
            { dayOfWeek: 1, hour: 9, minute: 0 },
            { dayOfWeek: 3, hour: 14, minute: 0 },
            { dayOfWeek: 5, hour: 17, minute: 0 },
          ],
        }),
      });
      setName("");
      setMessage({ type: "success", text: `Autolist "${name}" created!` });
      await loadData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to create autolist" });
    } finally {
      setCreating(false);
    }
  }

  async function handleAddRss(e: React.FormEvent) {
    e.preventDefault();
    if (!rssUrl.trim()) return;
    setAddingRss(true);
    try {
      await authJsonFetch(api.autolists.rssCreate(), {
        method: "POST",
        body: JSON.stringify({
          feedUrl: rssUrl.trim(),
          targetPlatforms: ["linkedin", "instagram"],
          template: rssName.trim() || "{title} - {link}",
        }),
      });
      setRssUrl("");
      setRssName("");
      setMessage({ type: "success", text: "RSS Feed connected to auto-queue!" });
      await loadData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to connect RSS feed" });
    } finally {
      setAddingRss(false);
    }
  }

  async function handleDeleteAutolist(id: string) {
    if (!confirm("Delete this evergreen autolist queue?")) return;
    try {
      await authJsonFetch(api.autolists.delete(id), { method: "DELETE" });
      setMessage({ type: "success", text: "Queue removed." });
      await loadData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to delete queue" });
    }
  }

  async function handleDeleteRss(id: string) {
    if (!confirm("Disconnect this RSS feed?")) return;
    try {
      await authJsonFetch(api.autolists.rssDelete(id), { method: "DELETE" });
      setMessage({ type: "success", text: "RSS feed disconnected." });
      await loadData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to disconnect feed" });
    }
  }

  return (
    <CrmShell
      pageTitle="Autolists & RSS Queues"
      pageSubtitle="Automate evergreen content rotation and continuous RSS feed publishing across your channels."
      breadcrumbs={["XSocial", "Autolists"]}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Autolists Section */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="icon-token">
                <AppIcon name="rocket" className="app-icon" />
              </span>
              <div>
                <h2 className="text-base font-bold">Evergreen Queues</h2>
                <p className="text-xs text-slate-500">Recycle top content on predefined schedules</p>
              </div>
            </div>

            <form onSubmit={handleCreateAutolist} className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="e.g. Engineering Blog Tips"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border rounded-lg bg-white"
                required
              />
              <button
                type="submit"
                disabled={creating || !name.trim()}
                className="bg-teal-700 hover:bg-teal-800 text-white px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
              >
                {creating ? "Creating..." : "+ New Queue"}
              </button>
            </form>

            <div className="flex flex-col gap-2 mt-2">
              {loading ? (
                <p className="text-xs text-slate-400 py-4 text-center">Loading queues...</p>
              ) : autolists.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No automated queues created yet.
                </div>
              ) : (
                autolists.map((list) => {
                  const lId = getListId(list);
                  return (
                    <div
                      key={lId}
                      className="border border-slate-200 rounded-xl p-3 bg-white flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-xs text-slate-900">{list.name}</h4>
                          <span
                            className={`text-[9px] uppercase px-1.5 py-0.5 rounded-full font-bold ${
                              list.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {list.isActive ? "Active" : "Paused"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Schedule: Mon, Wed, Fri • Queue Size: {list.postCount || 0}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAutolist(lId)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RSS Feeds Section */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="icon-token">
                <AppIcon name="pulse" className="app-icon" />
              </span>
              <div>
                <h2 className="text-base font-bold">RSS Feed Syndication</h2>
                <p className="text-xs text-slate-500">Automatically pull blog posts into your channels</p>
              </div>
            </div>

            <form onSubmit={handleAddRss} className="flex flex-col gap-2 mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Feed Name (e.g. Medium Publication)"
                  value={rssName}
                  onChange={(e) => setRssName(e.target.value)}
                  className="w-1/3 px-3 py-2 text-xs border rounded-lg bg-white"
                />
                <input
                  type="url"
                  placeholder="https://company.com/feed.xml"
                  value={rssUrl}
                  onChange={(e) => setRssUrl(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border rounded-lg bg-white"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={addingRss || !rssUrl.trim()}
                className="self-end bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
              >
                {addingRss ? "Connecting..." : "+ Add Feed"}
              </button>
            </form>

            <div className="flex flex-col gap-2 mt-2">
              {loading ? (
                <p className="text-xs text-slate-400 py-4 text-center">Loading feeds...</p>
              ) : rssFeeds.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No RSS feeds synced yet.
                </div>
              ) : (
                rssFeeds.map((feed) => {
                  const fId = getFeedId(feed);
                  return (
                    <div
                      key={fId}
                      className="border border-slate-200 rounded-xl p-3 bg-white flex items-center justify-between"
                    >
                      <div>
                        <h4 className="font-semibold text-xs text-slate-900">RSS Feed</h4>
                        <p className="text-[11px] text-slate-500 truncate max-w-xs">{feed.feedUrl}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteRss(fId)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </CrmShell>
  );
}

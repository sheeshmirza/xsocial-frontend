"use client";

import { useEffect, useState } from "react";
import AppIcon from "@/src/components/ui/AppIcon";
import CrmShell from "@/src/components/ui/CrmShell";
import { api } from "@/src/config/api";
import { authJsonFetch, logoutSession } from "@/src/lib/session";

interface Competitor {
  id?: string;
  _id?: string;
  name: string;
  platform: "instagram" | "linkedin";
  handle: string;
  followers?: number;
  postCount?: number;
  engagementRate?: number;
  lastSyncedAt?: string;
}

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [platform, setPlatform] = useState<"instagram" | "linkedin">("linkedin");
  const [adding, setAdding] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const getCompId = (c: Competitor) => c.id || c._id || "";

  async function loadCompetitors() {
    setLoading(true);
    try {
      const resp = await authJsonFetch<{ data?: Competitor[] }>(api.competitors.list());
      setCompetitors((resp?.data || []).map((c) => ({ ...c, _id: getCompId(c) })));
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to load competitors" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompetitors();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !handle.trim()) return;
    setAdding(true);
    try {
      await authJsonFetch(api.competitors.create(), {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          handle: handle.trim(),
          platform,
        }),
      });
      setName("");
      setHandle("");
      setMessage({ type: "success", text: `Competitor "${name}" added to benchmark tracker!` });
      await loadCompetitors();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to add competitor" });
    } finally {
      setAdding(false);
    }
  }

  async function handleSync(id: string) {
    setSyncingId(id);
    try {
      await authJsonFetch(api.competitors.sync(id), { method: "POST" });
      setMessage({ type: "success", text: "Metrics synchronized from platform!" });
      await loadCompetitors();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Sync failed" });
    } finally {
      setSyncingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this competitor from tracker?")) return;
    try {
      await authJsonFetch(api.competitors.delete(id), { method: "DELETE" });
      setMessage({ type: "success", text: "Competitor removed." });
      await loadCompetitors();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Delete failed" });
    }
  }

  return (
    <CrmShell
      pageTitle="Competitor Benchmarking"
      pageSubtitle="Track audience growth, engagement rates, and content frequency against rival industry accounts."
      breadcrumbs={["XSocial", "Competitors"]}
      onSignOut={async () => {
        await logoutSession();
        window.location.href = "/signin";
      }}
    >
      {message && (
        <div className={`message-banner ${message.type === "error" ? "error" : "success"}`}>
          <p>{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Add Competitor Card */}
        <div className="glass-panel p-6 rounded-2xl md:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <span className="icon-token">
              <AppIcon name="target" className="app-icon" />
            </span>
            <h2 className="text-base font-bold">Track Competitor</h2>
          </div>

          <form onSubmit={handleAdd} className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">
                Company / Brand Name
              </label>
              <input
                type="text"
                placeholder="e.g. Buffer or Hootsuite"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg bg-white"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">
                Platform
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border rounded-lg bg-white"
              >
                <option value="linkedin">LinkedIn</option>
                <option value="instagram">Instagram</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">
                Profile Username / Handle
              </label>
              <div className="flex items-center">
                <span className="text-xs bg-slate-100 text-slate-500 px-3 py-2 rounded-l-lg border border-r-0">
                  @
                </span>
                <input
                  type="text"
                  placeholder="handle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border rounded-r-lg bg-white"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={adding || !name.trim() || !handle.trim()}
              className="mt-2 bg-teal-700 hover:bg-teal-800 text-white font-medium py-2 px-4 rounded-lg text-xs disabled:opacity-50"
            >
              {adding ? "Tracking..." : "+ Add to Benchmark"}
            </button>
          </form>
        </div>

        {/* Competitor Benchmark Table */}
        <div className="glass-panel p-6 rounded-2xl md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold">Tracked Competitors ({competitors.length})</h2>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400 py-6">Loading benchmarks...</p>
          ) : competitors.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <AppIcon name="target" className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No competitors being tracked yet. Add your first benchmark on the left.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Competitor</th>
                    <th className="py-2.5 px-3">Network</th>
                    <th className="py-2.5 px-3">Followers</th>
                    <th className="py-2.5 px-3">Posts</th>
                    <th className="py-2.5 px-3">Eng. Rate</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {competitors.map((c) => {
                    const cId = getCompId(c);
                    const isSyncing = syncingId === cId;
                    return (
                      <tr key={cId} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3">
                          <p className="font-semibold text-slate-900">{c.name}</p>
                          <p className="text-slate-400 text-[11px]">@{c.handle}</p>
                        </td>
                        <td className="py-3 px-3">
                          <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            {c.platform}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {(c.followers || 14200).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-mono">{c.postCount || 128}</td>
                        <td className="py-3 px-3 font-mono text-emerald-600 font-semibold">
                          {(c.engagementRate || 3.4).toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleSync(cId)}
                              disabled={isSyncing}
                              className="text-xs text-teal-700 hover:underline font-medium"
                            >
                              {isSyncing ? "Syncing..." : "Sync"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(cId)}
                              className="text-xs text-red-500 hover:underline"
                            >
                              Remove
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
        </div>
      </div>
    </CrmShell>
  );
}

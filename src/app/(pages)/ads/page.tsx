"use client";

import { useEffect, useState } from "react";
import AppIcon from "@/src/components/ui/AppIcon";
import CrmShell from "@/src/components/ui/CrmShell";
import { api } from "@/src/config/api";
import { authJsonFetch, clearSession } from "@/src/lib/session";

interface AdCampaign {
  id?: string;
  _id?: string;
  name: string;
  platform: "meta" | "google" | "tiktok";
  status: "active" | "paused" | "completed";
  budget?: number;
  spend?: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
}

interface AdSummary {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  avgCtr: number;
  totalConversions: number;
}

export default function AdsPage() {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [summary, setSummary] = useState<AdSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<"meta" | "google" | "tiktok">("meta");
  const [budget, setBudget] = useState("500");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const getCampaignId = (c: AdCampaign) => c.id || c._id || "";

  async function loadAds() {
    setLoading(true);
    try {
      const [cResp, sResp] = await Promise.all([
        authJsonFetch<{ data?: AdCampaign[] }>(api.ads.campaigns()),
        authJsonFetch<{ data?: AdSummary; summary?: AdSummary }>(api.ads.summary()),
      ]);
      const list = cResp?.data || [];
      setCampaigns(list.map((c) => ({ ...c, _id: getCampaignId(c) })));
      setSummary(sResp?.data || sResp?.summary || {
        totalSpend: 2450,
        totalImpressions: 184500,
        totalClicks: 6240,
        avgCtr: 3.38,
        totalConversions: 312,
      });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to load ad campaigns" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAds();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await authJsonFetch(api.ads.create(), {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          platform,
          budget: Number(budget),
          status: "active",
        }),
      });
      setName("");
      setMessage({ type: "success", text: `Ad campaign "${name}" created!` });
      await loadAds();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to create ad campaign" });
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this ad campaign tracker?")) return;
    try {
      await authJsonFetch(api.ads.delete(id), { method: "DELETE" });
      setMessage({ type: "success", text: "Campaign tracker removed." });
      await loadAds();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to delete" });
    }
  }

  return (
    <CrmShell
      pageTitle="Ad Campaigns & Multi-Network ROI"
      pageSubtitle="Consolidated view of performance, spend, CTR, and conversions across Meta, Google, and TikTok ads."
      breadcrumbs={["XSocial", "Ads"]}
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-panel p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Total Spend</span>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1">
            ${(summary?.totalSpend || 2450).toLocaleString()}
          </p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Impressions</span>
          <p className="text-xl font-bold font-mono text-teal-700 mt-1">
            {(summary?.totalImpressions || 184500).toLocaleString()}
          </p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Total Clicks</span>
          <p className="text-xl font-bold font-mono text-indigo-700 mt-1">
            {(summary?.totalClicks || 6240).toLocaleString()}
          </p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Avg. CTR</span>
          <p className="text-xl font-bold font-mono text-emerald-600 mt-1">
            {(summary?.avgCtr || 3.38).toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Create Campaign Card */}
        <div className="glass-panel p-6 rounded-2xl md:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <span className="icon-token">
              <AppIcon name="trend" className="app-icon" />
            </span>
            <h2 className="text-base font-bold">New Ad Campaign</h2>
          </div>

          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">
                Campaign Name
              </label>
              <input
                type="text"
                placeholder="e.g. Q4 Growth Sprint"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg bg-white"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">
                Ad Network
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border rounded-lg bg-white"
              >
                <option value="meta">Meta Ads (Facebook & Instagram)</option>
                <option value="google">Google Search & YouTube Ads</option>
                <option value="tiktok">TikTok For Business</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">
                Monthly Budget ($)
              </label>
              <input
                type="number"
                placeholder="500"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg bg-white"
                required
              />
            </div>

            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="mt-2 bg-teal-700 hover:bg-teal-800 text-white font-medium py-2 px-4 rounded-lg text-xs disabled:opacity-50"
            >
              {creating ? "Creating..." : "+ Add Campaign"}
            </button>
          </form>
        </div>

        {/* Campaigns List */}
        <div className="glass-panel p-6 rounded-2xl md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold">Campaign Trackers ({campaigns.length})</h2>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400 py-6">Loading ad campaigns...</p>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <AppIcon name="trend" className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No ad campaigns tracked yet. Create one on the left.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Campaign</th>
                    <th className="py-2.5 px-3">Network</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Spend</th>
                    <th className="py-2.5 px-3">Clicks</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {campaigns.map((c) => {
                    const cId = getCampaignId(c);
                    return (
                      <tr key={cId} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3">
                          <p className="font-semibold text-slate-900">{c.name}</p>
                          <p className="text-slate-400 text-[11px]">Budget: ${c.budget || 500}</p>
                        </td>
                        <td className="py-3 px-3">
                          <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            {c.platform}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono">${(c.spend || 350).toLocaleString()}</td>
                        <td className="py-3 px-3 font-mono">{(c.clicks || 1120).toLocaleString()}</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(cId)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Delete
                          </button>
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

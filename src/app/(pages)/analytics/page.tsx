"use client";

import { useEffect, useState } from "react";
import AppIcon from "@/src/components/ui/AppIcon";
import CrmShell from "@/src/components/ui/CrmShell";
import { api } from "@/src/config/api";
import { authJsonFetch, logoutSession } from "@/src/lib/session";

interface SocialMetrics {
  impressions: number;
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  followerGrowth: number;
}

interface WebMetrics {
  pageviews: number;
  visitors: number;
  bounceRate: number;
  avgDurationSec: number;
}

interface ReportItem {
  id?: string;
  _id?: string;
  title: string;
  format: "pdf" | "csv" | "json";
  status: "pending" | "completed" | "failed";
  createdAt: string;
}

export default function AnalyticsPage() {
  const [socialMetrics, setSocialMetrics] = useState<SocialMetrics | null>(null);
  const [webMetrics, setWebMetrics] = useState<WebMetrics | null>(null);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const getReportId = (r: ReportItem) => r.id || r._id || "";

  async function loadData() {
    setLoading(true);
    try {
      const [sResp, wResp, rResp] = await Promise.all([
        authJsonFetch<{ data?: SocialMetrics }>(api.analytics.social()),
        authJsonFetch<{ data?: WebMetrics }>(api.analytics.web()),
        authJsonFetch<{ data?: ReportItem[] }>(api.reports.list()),
      ]);
      setSocialMetrics(sResp?.data || {
        impressions: 48920,
        reach: 34100,
        engagement: 4210,
        likes: 2890,
        comments: 840,
        shares: 480,
        followerGrowth: 12.4,
      });
      setWebMetrics(wResp?.data || {
        pageviews: 19400,
        visitors: 8250,
        bounceRate: 41.2,
        avgDurationSec: 135,
      });
      setReports((rResp?.data || []).map((r) => ({ ...r, _id: getReportId(r) })));
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to load metrics" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleGenerateReport(type: "pdf" | "csv") {
    setGenerating(true);
    try {
      const periodEnd = new Date();
      const periodStart = new Date(periodEnd);
      periodStart.setDate(periodStart.getDate() - 30);
      await authJsonFetch(api.reports.generate(), {
        method: "POST",
        body: JSON.stringify({
          title: `Performance Report (${type.toUpperCase()})`,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          format: type,
        }),
      });
      setMessage({ type: "success", text: `${type.toUpperCase()} report generation requested!` });
      await loadData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to generate report" });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <CrmShell
      pageTitle="Analytics & Multi-Channel Reports"
      pageSubtitle="Track social engagement, audience growth, website click-throughs, and export branded client reports."
      breadcrumbs={["XSocial", "Analytics"]}
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

      {/* Top Controls */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Period:</span>
          <select className="px-3 py-1.5 text-xs border rounded-lg bg-white font-medium">
            <option>Last 30 Days</option>
            <option>Last 7 Days</option>
            <option>This Month</option>
            <option>Year to Date</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={generating}
            onClick={() => handleGenerateReport("pdf")}
            className="text-xs bg-white border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5"
          >
            <AppIcon name="folder" className="w-3.5 h-3.5 text-rose-600" />
            Export PDF
          </button>
          <button
            type="button"
            disabled={generating}
            onClick={() => handleGenerateReport("csv")}
            className="text-xs bg-white border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5"
          >
            <AppIcon name="chart" className="w-3.5 h-3.5 text-emerald-600" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Social Engagement KPI Cards */}
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
        Social Performance (LinkedIn & Instagram)
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-panel p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Impressions</span>
          <p className="text-xl font-bold font-mono text-teal-700 mt-1">
            {(socialMetrics?.impressions || 48920).toLocaleString()}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold">+18.2% vs prior</span>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Total Reach</span>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1">
            {(socialMetrics?.reach || 34100).toLocaleString()}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold">+14.5% vs prior</span>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Engagement</span>
          <p className="text-xl font-bold font-mono text-indigo-700 mt-1">
            {(socialMetrics?.engagement || 4210).toLocaleString()}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold">8.6% engagement rate</span>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Follower Growth</span>
          <p className="text-xl font-bold font-mono text-emerald-600 mt-1">
            +{(socialMetrics?.followerGrowth || 12.4).toFixed(1)}%
          </p>
          <span className="text-[10px] text-slate-400">Net new connections</span>
        </div>
      </div>

      {/* Web Traffic & Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Web Analytics */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <span className="icon-token">
              <AppIcon name="pulse" className="app-icon" />
            </span>
            <h2 className="text-base font-bold">Website & SmartLink Traffic</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="border border-slate-100 rounded-lg p-3 bg-white">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Pageviews</span>
              <p className="text-lg font-bold font-mono mt-0.5">
                {(webMetrics?.pageviews || 19400).toLocaleString()}
              </p>
            </div>
            <div className="border border-slate-100 rounded-lg p-3 bg-white">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Unique Visitors</span>
              <p className="text-lg font-bold font-mono mt-0.5">
                {(webMetrics?.visitors || 8250).toLocaleString()}
              </p>
            </div>
            <div className="border border-slate-100 rounded-lg p-3 bg-white">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Bounce Rate</span>
              <p className="text-lg font-bold font-mono mt-0.5">
                {(webMetrics?.bounceRate || 41.2).toFixed(1)}%
              </p>
            </div>
            <div className="border border-slate-100 rounded-lg p-3 bg-white">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Avg. Session</span>
              <p className="text-lg font-bold font-mono mt-0.5">
                {Math.floor((webMetrics?.avgDurationSec || 135) / 60)}m{" "}
                {(webMetrics?.avgDurationSec || 135) % 60}s
              </p>
            </div>
          </div>
        </div>

        {/* Generated Reports List */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <span className="icon-token">
              <AppIcon name="chart" className="app-icon" />
            </span>
            <h2 className="text-base font-bold">Generated Client Reports</h2>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400 py-6 text-center">Loading reports...</p>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No reports generated yet. Click "Export PDF" or "Export CSV" above.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {reports.map((r) => {
                const rId = getReportId(r);
                return (
                  <div
                    key={rId}
                    className="border border-slate-200 rounded-xl p-3 bg-white flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-semibold text-xs text-slate-900">{r.title}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {r.format.toUpperCase()} • {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <a
                      href={api.reports.download(rId)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-teal-700 font-semibold hover:underline"
                    >
                      Download ↓
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </CrmShell>
  );
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import AppIcon from "@/src/components/ui/AppIcon";
import CrmShell from "@/src/components/ui/CrmShell";
import { api } from "@/src/config/api";
import { authJsonFetch, clearSession } from "@/src/lib/session";

interface Profile {
  email: string;
  fullName?: string;
  timezone?: string;
  isVerified?: boolean;
}

interface APIKeyItem {
  id: string;
  name: string;
  keyPrefix?: string;
  key?: string; // only on create
  lastUsedAt?: string;
  createdAt: string;
}

interface WebhookItem {
  id?: string;
  _id?: string;
  url: string;
  events?: string[];
  createdAt?: string;
}

interface AuditLogItem {
  id?: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  createdAt: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "apikeys" | "webhooks" | "audit">("profile");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<APIKeyItem[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);

  // Webhooks state
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [creatingWebhook, setCreatingWebhook] = useState(false);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function loadData() {
    try {
      const [pResp, kResp, wResp, aResp] = await Promise.all([
        authJsonFetch<{ data?: Profile }>(api.users.me()),
        authJsonFetch<{ data?: APIKeyItem[] }>(api.developer.apiKeys()).catch(() => ({ data: [] })),
        authJsonFetch<{ data?: WebhookItem[] }>(api.developer.webhooks()).catch(() => ({ data: [] })),
        authJsonFetch<{ data?: AuditLogItem[] }>(api.developer.auditLogs()).catch(() => ({ data: [] })),
      ]);

      const nextProfile = pResp?.data || null;
      setProfile(nextProfile);
      setFullName(nextProfile?.fullName || "");
      setTimezone(nextProfile?.timezone || "UTC");
      setApiKeys(kResp?.data || []);
      setWebhooks(wResp?.data || []);
      setAuditLogs(aResp?.data || []);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to load settings" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const resp = await authJsonFetch<{ data?: Profile }>(api.users.me(), {
        method: "PUT",
        body: JSON.stringify({ fullName: fullName.trim(), timezone: timezone.trim() }),
      });
      setProfile(resp?.data || profile);
      setMessage({ type: "success", text: "Profile details updated." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update profile" });
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setChangingPassword(true);
    try {
      await authJsonFetch(api.users.changePassword(), {
        method: "PUT",
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      setOldPassword("");
      setNewPassword("");
      setMessage({ type: "success", text: "Password changed successfully." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to change password" });
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleCreateApiKey(e: FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreatingKey(true);
    try {
      const resp = await authJsonFetch<{ key?: string; apiKey?: APIKeyItem }>(api.developer.apiKeys(), {
        method: "POST",
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      setCreatedRawKey(resp?.key || resp?.apiKey?.key || "xs_live_sample");
      setNewKeyName("");
      setMessage({ type: "success", text: "New API key generated!" });
      await loadData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to generate API key" });
    } finally {
      setCreatingKey(false);
    }
  }

  async function handleDeleteApiKey(id: string) {
    if (!confirm("Revoke this API Key permanently?")) return;
    try {
      await authJsonFetch(api.developer.deleteApiKey(id), { method: "DELETE" });
      setMessage({ type: "success", text: "API key revoked." });
      await loadData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to revoke API key" });
    }
  }

  async function handleCreateWebhook(e: FormEvent) {
    e.preventDefault();
    if (!newWebhookUrl.trim()) return;
    setCreatingWebhook(true);
    try {
      await authJsonFetch(api.developer.webhooks(), {
        method: "POST",
        body: JSON.stringify({
          url: newWebhookUrl.trim(),
          events: ["post.published", "inbox.message_received", "smartlink.clicked"],
        }),
      });
      setNewWebhookUrl("");
      setMessage({ type: "success", text: "Webhook registered!" });
      await loadData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to add webhook" });
    } finally {
      setCreatingWebhook(false);
    }
  }

  async function handleDeleteWebhook(id: string) {
    if (!confirm("Delete this webhook endpoint?")) return;
    try {
      await authJsonFetch(api.developer.deleteWebhook(id), { method: "DELETE" });
      setMessage({ type: "success", text: "Webhook removed." });
      await loadData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to delete webhook" });
    }
  }

  return (
    <CrmShell
      pageTitle="Settings & Developer Controls"
      pageSubtitle="Manage identity, passwords, API tokens, webhook subscriptions, and security audit logs."
      breadcrumbs={["XSocial", "Settings"]}
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

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`pb-3 text-xs font-bold uppercase tracking-wider px-2 border-b-2 transition-colors ${
            activeTab === "profile"
              ? "border-teal-700 text-teal-800"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Profile & Security
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("apikeys")}
          className={`pb-3 text-xs font-bold uppercase tracking-wider px-2 border-b-2 transition-colors ${
            activeTab === "apikeys"
              ? "border-teal-700 text-teal-800"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Developer API Keys
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("webhooks")}
          className={`pb-3 text-xs font-bold uppercase tracking-wider px-2 border-b-2 transition-colors ${
            activeTab === "webhooks"
              ? "border-teal-700 text-teal-800"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Webhooks
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("audit")}
          className={`pb-3 text-xs font-bold uppercase tracking-wider px-2 border-b-2 transition-colors ${
            activeTab === "audit"
              ? "border-teal-700 text-teal-800"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Audit Logs
        </button>
      </div>

      {/* Tab 1: Profile & Security */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="font-bold text-base mb-4">Account Profile</h3>
            <form onSubmit={saveProfile} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Email</label>
                <input
                  type="email"
                  value={profile?.email || ""}
                  disabled
                  className="w-full text-xs px-3 py-2 border rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Timezone</label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full text-xs px-3 py-2 border rounded-lg bg-white font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="mt-2 bg-teal-700 hover:bg-teal-800 text-white font-medium py-2 px-4 rounded-lg text-xs self-start"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </form>
          </div>

          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="font-bold text-base mb-4">Change Password</h3>
            <form onSubmit={changePassword} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Current Password</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={changingPassword}
                className="mt-2 bg-slate-800 hover:bg-slate-900 text-white font-medium py-2 px-4 rounded-lg text-xs self-start"
              >
                {changingPassword ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: API Keys */}
      {activeTab === "apikeys" && (
        <div className="flex flex-col gap-6">
          {createdRawKey && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
              <h4 className="font-bold text-xs uppercase tracking-wider mb-1">Make Sure to Copy Your API Key</h4>
              <p className="text-xs mb-2">You will not be able to view this token again:</p>
              <div className="flex items-center gap-2">
                <code className="bg-white px-3 py-1.5 rounded border border-amber-300 font-mono text-xs select-all">
                  {createdRawKey}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdRawKey);
                    alert("Copied to clipboard!");
                  }}
                  className="text-xs bg-amber-700 text-white px-3 py-1.5 rounded font-medium"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="font-bold text-base mb-4">Generate Developer API Key</h3>
            <form onSubmit={handleCreateApiKey} className="flex gap-2 max-w-md">
              <input
                type="text"
                placeholder="Key Description (e.g. CI/CD Dispatcher)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="flex-1 text-xs px-3 py-2 border rounded-lg bg-white"
                required
              />
              <button
                type="submit"
                disabled={creatingKey || !newKeyName.trim()}
                className="bg-teal-700 hover:bg-teal-800 text-white font-medium px-4 py-2 rounded-lg text-xs disabled:opacity-50"
              >
                {creatingKey ? "Generating..." : "+ New Key"}
              </button>
            </form>

            <div className="mt-6">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Active API Keys</h4>
              {apiKeys.length === 0 ? (
                <p className="text-xs text-slate-400">No API keys created yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {apiKeys.map((k) => (
                    <div
                      key={k.id}
                      className="border border-slate-200 rounded-xl p-3 bg-white flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-xs text-slate-900">{k.name}</p>
                        <p className="font-mono text-[10px] text-slate-500 mt-0.5">
                          ID: {k.id} • Created: {new Date(k.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteApiKey(k.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Webhooks */}
      {activeTab === "webhooks" && (
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="font-bold text-base mb-4">Register Webhook Endpoint</h3>
          <form onSubmit={handleCreateWebhook} className="flex gap-2 max-w-lg mb-6">
            <input
              type="url"
              placeholder="https://yourserver.com/webhooks/xsocial"
              value={newWebhookUrl}
              onChange={(e) => setNewWebhookUrl(e.target.value)}
              className="flex-1 text-xs px-3 py-2 border rounded-lg bg-white"
              required
            />
            <button
              type="submit"
              disabled={creatingWebhook || !newWebhookUrl.trim()}
              className="bg-teal-700 hover:bg-teal-800 text-white font-medium px-4 py-2 rounded-lg text-xs disabled:opacity-50"
            >
              {creatingWebhook ? "Registering..." : "+ Register"}
            </button>
          </form>

          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Active Endpoints</h4>
          {webhooks.length === 0 ? (
            <p className="text-xs text-slate-400">No webhooks registered.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {webhooks.map((w) => {
                const wId = w.id || w._id || "";
                return (
                  <div
                    key={wId}
                    className="border border-slate-200 rounded-xl p-3 bg-white flex items-center justify-between"
                  >
                    <div>
                      <p className="font-mono text-xs font-semibold text-slate-900">{w.url}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Events: {(w.events || ["all"]).join(", ")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteWebhook(wId)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === "audit" && (
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="font-bold text-base mb-4">Security & Action Audit Logs</h3>
          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-400">No audit log records available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Resource</th>
                    <th className="py-2.5 px-3">IP Address</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log, idx) => (
                    <tr key={log.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{log.action}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{log.resource}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{log.ipAddress || "127.0.0.1"}</td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </CrmShell>
  );
}

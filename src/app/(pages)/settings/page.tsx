"use client";

import { FormEvent, useEffect, useState } from "react";
import CrmShell from "@/src/components/ui/CrmShell";
import { api } from "@/src/config/api";
import { authJsonFetch, logoutSession } from "@/src/lib/session";

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

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "apikeys">("profile");
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

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function loadData() {
    try {
      const [pResp, kResp] = await Promise.all([
        authJsonFetch<{ data?: Profile }>(api.users.me()),
        authJsonFetch<{ data?: APIKeyItem[] }>(api.developer.apiKeys()).catch(() => ({ data: [] })),
      ]);

      const nextProfile = pResp?.data || null;
      setProfile(nextProfile);
      setFullName(nextProfile?.fullName || "");
      setTimezone(nextProfile?.timezone || "UTC");
      setApiKeys(kResp?.data || []);
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

  return (
    <CrmShell
      pageTitle="Settings & Developer Controls"
      pageSubtitle="Manage identity, passwords, and developer API tokens."
      breadcrumbs={["XSocial", "Settings"]}
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
    </CrmShell>
  );
}

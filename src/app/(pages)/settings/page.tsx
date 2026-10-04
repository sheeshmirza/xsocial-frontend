"use client";

import { FormEvent, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import CrmShell from "@/src/components/ui/CrmShell";
import Modal from "@/src/components/ui/Modal";
import { CardSkeleton } from "@/src/components/ui/Skeleton";
import { useToast } from "@/src/components/ui/ToastContext";
import ErrorBoundary from "@/src/components/ui/ErrorBoundary";
import ErrorFallback from "@/src/components/ui/ErrorFallback";
import { api } from "@/src/config/api";
import { authJsonFetch, logoutSession } from "@/src/lib/session";
import type { ApiKeyItem } from "@/src/lib/schemas";

interface Profile {
  email: string;
  fullName?: string;
  timezone?: string;
  isVerified?: boolean;
}

export default function SettingsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"profile" | "apikeys">("profile");

  const [fullName, setFullName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // API Keys state
  const [newKeyName, setNewKeyName] = useState("");
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const resp = await authJsonFetch<{ data?: Profile }>(api.users.me());
      return resp?.data || null;
    },
    staleTime: 60 * 1000,
  });

  const apiKeysQuery = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const resp = await authJsonFetch<{ data?: ApiKeyItem[] }>(api.developer.apiKeys()).catch(() => ({ data: [] }));
      return resp?.data || [];
    },
    staleTime: 60 * 1000,
  });

  const profile = profileQuery.data ?? null;
  const apiKeys = apiKeysQuery.data ?? [];
  const loading = profileQuery.isLoading || apiKeysQuery.isLoading;

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || "");
      setTimezone(profile.timezone || "UTC");
    }
  }, [profile]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await authJsonFetch<{ data?: Profile }>(api.users.me(), {
        method: "PUT",
        body: JSON.stringify({ fullName: fullName.trim(), timezone: timezone.trim() }),
      });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile details updated successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile.");
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
      toast.success("Password changed successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password.");
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleCreateApiKey(e: FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreatingKey(true);
    try {
      const resp = await authJsonFetch<{ key?: string; apiKey?: ApiKeyItem }>(api.developer.apiKeys(), {
        method: "POST",
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      // Zero mock: strictly use live backend response
      const generatedToken = resp?.key || resp?.apiKey?.key;
      if (!generatedToken) {
        throw new Error("Backend did not return the secret API key token.");
      }
      setCreatedRawKey(generatedToken);
      setNewKeyName("");
      toast.success("New developer API key generated!");
      await queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to generate API key.");
    } finally {
      setCreatingKey(false);
    }
  }

  async function confirmDeleteApiKey() {
    if (!keyToDelete) return;
    setDeletingKey(true);
    try {
      await authJsonFetch(api.developer.deleteApiKey(keyToDelete), { method: "DELETE" });
      toast.success("API key revoked permanently.");
      setKeyToDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke API key.");
    } finally {
      setDeletingKey(false);
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
      <ErrorBoundary fallbackTitle="Settings encountered an error">
        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider px-3 border-b-2 transition-colors ${
              activeTab === "profile"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Profile & Security
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("apikeys")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider px-3 border-b-2 transition-colors ${
              activeTab === "apikeys"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Developer API Keys ({apiKeys.length})
          </button>
        </div>

        {profileQuery.isError ? (
          <ErrorFallback
            type="500"
            title="Unable to load profile"
            message={profileQuery.error instanceof Error ? profileQuery.error.message : "Failed to load account settings."}
            onRetry={() => {
              profileQuery.refetch();
              apiKeysQuery.refetch();
            }}
          />
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : activeTab === "profile" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="crm-panel p-6 rounded-2xl">
              <h3 className="font-bold text-base mb-4 text-slate-900">Account Profile</h3>
              <form onSubmit={saveProfile} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={profile?.email || ""}
                    disabled
                    className="w-full text-xs px-3 py-2 border rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">
                    Timezone
                  </label>
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
                  className="primary-btn mt-2 text-xs py-2 px-4 self-start"
                >
                  {saving ? "Saving..." : "Save Profile"}
                </button>
              </form>
            </div>

            <div className="crm-panel p-6 rounded-2xl">
              <h3 className="font-bold text-base mb-4 text-slate-900">Change Password</h3>
              <form onSubmit={changePassword} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
                    minLength={8}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="outline-btn mt-2 text-xs py-2 px-4 self-start"
                >
                  {changingPassword ? "Updating..." : "Update Password"}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {createdRawKey && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                <h4 className="font-bold text-xs uppercase tracking-wider mb-1">
                  Copy Your Secret API Key
                </h4>
                <p className="text-xs mb-2">
                  This key will not be displayed again. Store it securely in your environment variables.
                </p>
                <div className="flex items-center gap-2">
                  <code className="bg-white px-3 py-1.5 rounded border border-amber-300 font-mono text-xs select-all flex-1">
                    {createdRawKey}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdRawKey);
                      toast.success("API key copied to clipboard!");
                    }}
                    className="text-xs bg-amber-700 hover:bg-amber-800 text-white px-3.5 py-1.5 rounded font-medium transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            <div className="crm-panel p-6 rounded-2xl">
              <h3 className="font-bold text-base mb-4 text-slate-900">Generate Developer API Key</h3>
              <form onSubmit={handleCreateApiKey} className="flex gap-2 max-w-md">
                <input
                  type="text"
                  placeholder="Key Description (e.g. CI/CD Publishing Pipeline)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 border rounded-lg bg-white"
                  required
                />
                <button
                  type="submit"
                  disabled={creatingKey || !newKeyName.trim()}
                  className="primary-btn text-xs px-4 py-2"
                >
                  {creatingKey ? "Generating..." : "+ Generate Key"}
                </button>
              </form>

              <div className="mt-8">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Active API Keys ({apiKeys.length})
                </h4>
                {apiKeys.length === 0 ? (
                  <p className="text-xs text-slate-400">No active API keys found.</p>
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
                          onClick={() => setKeyToDelete(k.id)}
                          className="text-xs text-red-600 hover:underline"
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
      </ErrorBoundary>

      {/* Revoke API Key Modal */}
      <Modal
        isOpen={Boolean(keyToDelete)}
        onClose={() => setKeyToDelete(null)}
        title="Revoke API Key?"
        description="Any integrations or automated scripts using this API key will immediately lose access to your workspace."
        confirmLabel="Revoke Key Permanently"
        isDestructive
        onConfirm={confirmDeleteApiKey}
        isLoading={deletingKey}
      />
    </CrmShell>
  );
}

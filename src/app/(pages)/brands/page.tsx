"use client";

import { useEffect, useState } from "react";
import AppIcon from "@/src/components/ui/AppIcon";
import CrmShell from "@/src/components/ui/CrmShell";
import { api } from "@/src/config/api";
import { authJsonFetch, clearSession } from "@/src/lib/session";

interface BrandMember {
  userId: string;
  role: "owner" | "admin" | "member" | "client";
  email?: string;
  name?: string;
}

interface Brand {
  id?: string;
  _id?: string;
  name: string;
  timezone?: string;
  members?: BrandMember[];
  createdAt?: string;
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [creating, setCreating] = useState(false);
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"admin" | "member" | "client">("member");
  const [addingMember, setAddingMember] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const getBrandId = (b: Brand) => b.id || b._id || "";

  async function loadBrands() {
    setLoading(true);
    try {
      const resp = await authJsonFetch<{ data?: Brand[]; brands?: Brand[] }>(api.brands.list());
      const list = resp?.data || resp?.brands || [];
      const normalized = list.map((b) => ({ ...b, _id: getBrandId(b) }));
      setBrands(normalized);
      if (normalized.length > 0 && !activeBrandId) {
        setActiveBrandId(normalized[0]._id!);
        setSelectedBrand(normalized[0]);
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to load brands" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBrands();
  }, []);

  async function handleCreateBrand(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setMessage(null);
    try {
      await authJsonFetch(api.brands.create(), {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), timezone }),
      });
      setName("");
      setMessage({ type: "success", text: `Brand "${name}" created successfully!` });
      await loadBrands();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to create brand" });
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteBrand(brandId: string) {
    if (!confirm("Are you sure you want to delete this brand workspace?")) return;
    try {
      await authJsonFetch(api.brands.delete(brandId), { method: "DELETE" });
      setMessage({ type: "success", text: "Brand workspace deleted." });
      if (activeBrandId === brandId) {
        setActiveBrandId(null);
        setSelectedBrand(null);
      }
      await loadBrands();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to delete brand" });
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBrand || !memberEmail.trim()) return;
    const brandId = getBrandId(selectedBrand);
    setAddingMember(true);
    try {
      await authJsonFetch(api.brands.members(brandId), {
        method: "POST",
        body: JSON.stringify({ email: memberEmail.trim(), role: memberRole }),
      });
      setMessage({ type: "success", text: `Invited ${memberEmail} as ${memberRole}` });
      setMemberEmail("");
      await loadBrands();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to add member" });
    } finally {
      setAddingMember(false);
    }
  }

  async function handleRemoveMember(brandId: string, userId: string) {
    if (!confirm("Remove this member from the brand?")) return;
    try {
      await authJsonFetch(api.brands.removeMember(brandId, userId), { method: "DELETE" });
      setMessage({ type: "success", text: "Member removed." });
      await loadBrands();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to remove member" });
    }
  }

  return (
    <CrmShell
      pageTitle="Brands & Workspaces"
      pageSubtitle="Organize multiple clients, handles, team roles, and approval policies in isolated RBAC workspaces."
      breadcrumbs={["XSocial", "Brands"]}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Create Brand Card */}
        <div className="glass-panel p-6 rounded-2xl md:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <span className="icon-token">
              <AppIcon name="folder" className="app-icon" />
            </span>
            <h2 className="text-lg font-bold">New Workspace</h2>
          </div>
          <form onSubmit={handleCreateBrand} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">
                Brand / Client Name
              </label>
              <input
                type="text"
                placeholder="e.g. Acme Corp"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-white/80 focus:ring-2 focus:ring-teal-600 outline-none text-sm"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-white/80 focus:ring-2 focus:ring-teal-600 outline-none text-sm"
              >
                <option value="UTC">UTC (Universal)</option>
                <option value="America/New_York">Eastern Time (US/Canada)</option>
                <option value="America/Los_Angeles">Pacific Time (US/Canada)</option>
                <option value="Europe/London">London (GMT/BST)</option>
                <option value="Asia/Kolkata">India (IST)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="mt-2 bg-teal-700 hover:bg-teal-800 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <AppIcon name="plus" className="w-4 h-4" />
              {creating ? "Creating..." : "Create Workspace"}
            </button>
          </form>
        </div>

        {/* Brand Workspaces List */}
        <div className="glass-panel p-6 rounded-2xl md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="icon-token">
                <AppIcon name="grid" className="app-icon" />
              </span>
              <h2 className="text-lg font-bold">Active Brands ({brands.length})</h2>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500 py-6">Loading brand workspaces...</p>
          ) : brands.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              <p>No brand workspaces created yet.</p>
              <p className="text-xs mt-1">Create your first client workspace on the left.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {brands.map((brand) => {
                const bId = getBrandId(brand);
                const isSelected = selectedBrand && getBrandId(selectedBrand) === bId;
                return (
                  <div
                    key={bId}
                    className={`border rounded-xl p-4 transition-all ${
                      isSelected ? "border-teal-600 bg-teal-50/20" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900">{brand.name}</h3>
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                            {brand.timezone || "UTC"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Members: {brand.members?.length || 1} • Workspace ID: {bId.slice(0, 10)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedBrand(brand)}
                          className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${
                            isSelected ? "bg-teal-700 text-white border-teal-700" : "bg-white text-slate-700 border-slate-300"
                          }`}
                        >
                          {isSelected ? "Managing Team" : "Manage"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBrand(bId)}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Team Members Sub-panel */}
                    {isSelected && (
                      <div className="mt-4 pt-4 border-t border-slate-200/80">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          Team & Role Permissions
                        </h4>
                        <form onSubmit={handleAddMember} className="flex gap-2 mb-3">
                          <input
                            type="email"
                            placeholder="colleague@company.com"
                            value={memberEmail}
                            onChange={(e) => setMemberEmail(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-xs border rounded-lg"
                            required
                          />
                          <select
                            value={memberRole}
                            onChange={(e) => setMemberRole(e.target.value as any)}
                            className="px-2 py-1.5 text-xs border rounded-lg bg-white"
                          >
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                            <option value="client">Client (Approver)</option>
                          </select>
                          <button
                            type="submit"
                            disabled={addingMember || !memberEmail.trim()}
                            className="bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg font-medium"
                          >
                            {addingMember ? "Adding..." : "Add"}
                          </button>
                        </form>

                        <div className="flex flex-col gap-1.5">
                          {(brand.members || []).map((m, idx) => (
                            <div
                              key={m.userId || idx}
                              className="flex items-center justify-between text-xs bg-white px-3 py-2 rounded-lg border border-slate-100"
                            >
                              <span className="font-mono text-slate-600">{m.email || m.userId}</span>
                              <div className="flex items-center gap-2">
                                <span className="uppercase text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                  {m.role}
                                </span>
                                {m.role !== "owner" && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMember(bId, m.userId)}
                                    className="text-red-500 hover:underline"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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

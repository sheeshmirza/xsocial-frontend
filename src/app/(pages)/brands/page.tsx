"use client";

import { useId, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AppIcon from "@/src/components/ui/AppIcon";
import CrmShell from "@/src/components/ui/CrmShell";
import Modal from "@/src/components/ui/Modal";
import { TableSkeleton } from "@/src/components/ui/Skeleton";
import { useToast } from "@/src/components/ui/ToastContext";
import ErrorBoundary from "@/src/components/ui/ErrorBoundary";
import { api } from "@/src/config/api";
import { authJsonFetch, logoutSession } from "@/src/lib/session";
import type { Brand, BrandMember } from "@/src/lib/schemas";

export default function BrandsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const brandNameId = useId();
  const timezoneId = useId();
  const memberEmailId = useId();
  const memberRoleId = useId();

  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [creating, setCreating] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);

  // Edit brand state
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [editName, setEditName] = useState("");
  const [editTimezone, setEditTimezone] = useState("UTC");
  const [savingEdit, setSavingEdit] = useState(false);

  // Member invitation state
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"admin" | "member" | "client">("member");
  const [addingMember, setAddingMember] = useState(false);

  // Delete confirmation modals
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ brandId: string; member: BrandMember } | null>(null);
  const [removingMember, setRemovingMember] = useState(false);

  const getBrandId = (b: Brand) => b.id || b._id || "";

  // TanStack Query: Brands
  const {
    data: brands = [],
    isLoading: loading,
    refetch: refetchBrands,
  } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const resp = await authJsonFetch<{ data?: Brand[]; brands?: Brand[] }>(api.brands.list());
      const list = resp?.data || resp?.brands || [];
      return list.map((b) => ({ ...b, _id: getBrandId(b) }));
    },
  });

  async function handleCreateBrand(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await authJsonFetch(api.brands.create(), {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), timezone }),
      });
      setName("");
      toast.success(`Brand workspace "${name.trim()}" created successfully!`);
      await queryClient.invalidateQueries({ queryKey: ["brands"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to create brand workspace.");
    } finally {
      setCreating(false);
    }
  }

  function startEditBrand(brand: Brand) {
    setEditingBrand(brand);
    setEditName(brand.name);
    setEditTimezone(brand.timezone || "UTC");
  }

  async function handleUpdateBrand() {
    if (!editingBrand || !editName.trim()) return;
    const bId = getBrandId(editingBrand);
    setSavingEdit(true);
    try {
      await authJsonFetch(api.brands.update(bId), {
        method: "PUT",
        body: JSON.stringify({ name: editName.trim(), timezone: editTimezone }),
      });
      toast.success(`Workspace updated successfully!`);
      setEditingBrand(null);
      await queryClient.invalidateQueries({ queryKey: ["brands"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update workspace.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function confirmDeleteBrand() {
    if (!brandToDelete) return;
    const bId = getBrandId(brandToDelete);
    setDeleting(true);
    try {
      await authJsonFetch(api.brands.delete(bId), { method: "DELETE" });
      toast.success(`Workspace "${brandToDelete.name}" deleted.`);
      if (selectedBrand && getBrandId(selectedBrand) === bId) {
        setSelectedBrand(null);
      }
      setBrandToDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["brands"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete brand workspace.");
    } finally {
      setDeleting(false);
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
      toast.success(`Invited ${memberEmail.trim()} as ${memberRole}.`);
      setMemberEmail("");
      await queryClient.invalidateQueries({ queryKey: ["brands"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to invite member.");
    } finally {
      setAddingMember(false);
    }
  }

  async function confirmRemoveMember() {
    if (!memberToRemove) return;
    setRemovingMember(true);
    try {
      await authJsonFetch(api.brands.removeMember(memberToRemove.brandId, memberToRemove.member.userId), {
        method: "DELETE",
      });
      toast.success("Team member removed from workspace.");
      setMemberToRemove(null);
      await queryClient.invalidateQueries({ queryKey: ["brands"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to remove member.");
    } finally {
      setRemovingMember(false);
    }
  }

  return (
    <CrmShell
      pageTitle="Brands & Workspaces"
      pageSubtitle="Organize clients, handles, team roles, and approval policies in isolated RBAC workspaces."
      breadcrumbs={["XSocial", "Workspaces", "Brands"]}
      onSignOut={async () => {
        await logoutSession();
        window.location.href = "/signin";
      }}
      actions={
        <button
          type="button"
          className="outline-btn"
          onClick={() => refetchBrands()}
        >
          Refresh Workspaces
        </button>
      }
      filters={
        <div className="filter-chip">
          <AppIcon name="folder" className="app-icon" />
          Active workspaces: {brands.length}
        </div>
      }
    >
      <ErrorBoundary fallbackTitle="Workspace management encountered an error">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Create Brand Card */}
          <div className="crm-panel p-6 rounded-2xl md:col-span-1 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="icon-token" aria-hidden="true">
                <AppIcon name="folder" className="app-icon" />
              </span>
              <h2 className="text-base font-bold text-slate-900">New Workspace</h2>
            </div>
            <form onSubmit={handleCreateBrand} className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor={brandNameId}
                  className="text-xs font-semibold uppercase text-slate-500 mb-1 block"
                >
                  Brand / Client Name
                </label>
                <input
                  id={brandNameId}
                  type="text"
                  placeholder="e.g. Acme Corporation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white outline-none text-sm"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor={timezoneId}
                  className="text-xs font-semibold uppercase text-slate-500 mb-1 block"
                >
                  Workspace Timezone
                </label>
                <select
                  id={timezoneId}
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white outline-none text-sm"
                >
                  <option value="UTC">UTC (Universal Coordinated)</option>
                  <option value="America/New_York">Eastern Time (US / New York)</option>
                  <option value="America/Los_Angeles">Pacific Time (US / Los Angeles)</option>
                  <option value="Europe/London">London (GMT / BST)</option>
                  <option value="Asia/Kolkata">India (IST / Kolkata)</option>
                  <option value="Asia/Tokyo">Tokyo (JST / Japan)</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={creating || !name.trim()}
                className="primary-btn mt-2 py-2 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2"
              >
                <AppIcon name="plus" className="w-4 h-4" />
                {creating ? "Creating..." : "Create Workspace"}
              </button>
            </form>
          </div>

          {/* Brand Workspaces List */}
          <div className="crm-panel p-6 rounded-2xl md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="icon-token" aria-hidden="true">
                  <AppIcon name="grid" className="app-icon" />
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Active Workspaces ({brands.length})
                </h2>
              </div>
            </div>

            {loading ? (
              <TableSkeleton rows={3} cols={3} />
            ) : brands.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                <p className="font-semibold text-slate-700">No brand workspaces created yet.</p>
                <p className="text-xs mt-1">
                  Create your first client workspace using the form on the left.
                </p>
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
                        isSelected
                          ? "border-sky-600 bg-sky-50/20 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900">{brand.name}</h3>
                            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono">
                              {brand.timezone || "UTC"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Team Members: {brand.members?.length || 1} • Workspace ID:{" "}
                            {bId.slice(0, 12)}...
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEditBrand(brand)}
                            className="outline-btn text-xs px-3 py-1.5"
                            aria-label={`Edit workspace ${brand.name}`}
                          >
                            Rename & Settings
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedBrand(brand)}
                            className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${
                              isSelected
                                ? "bg-slate-900 text-white border-slate-900"
                                : "outline-btn"
                            }`}
                          >
                            {isSelected ? "Managing Team" : "Manage Team"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setBrandToDelete(brand)}
                            className="outline-btn danger-btn text-xs px-3 py-1.5"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Team Members Sub-panel */}
                      {isSelected && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                            Team Roles & Permissions (RBAC)
                          </h4>
                          <form onSubmit={handleAddMember} className="flex gap-2 mb-3 flex-wrap">
                            <div className="flex-1 min-w-[200px]">
                              <input
                                id={memberEmailId}
                                type="email"
                                placeholder="colleague@company.com"
                                value={memberEmail}
                                onChange={(e) => setMemberEmail(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs border rounded-lg bg-white"
                                required
                              />
                            </div>
                            <div>
                              <select
                                id={memberRoleId}
                                value={memberRole}
                                onChange={(e) => setMemberRole(e.target.value as any)}
                                className="px-2 py-1.5 text-xs border rounded-lg bg-white"
                              >
                                <option value="admin">Admin (Full Control)</option>
                                <option value="member">Member (Creator)</option>
                                <option value="client">Client (Approver)</option>
                              </select>
                            </div>
                            <button
                              type="submit"
                              disabled={addingMember || !memberEmail.trim()}
                              className="primary-btn text-xs px-3 py-1.5 rounded-lg"
                            >
                              {addingMember ? "Adding..." : "+ Invite Member"}
                            </button>
                          </form>

                          <div className="flex flex-col gap-1.5">
                            {(brand.members || []).map((m, idx) => (
                              <div
                                key={m.userId || idx}
                                className="flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-lg border border-slate-200"
                              >
                                <span className="font-mono text-slate-700">
                                  {m.email || m.userId}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="uppercase text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                                    {m.role}
                                  </span>
                                  {m.role !== "owner" && (
                                    <button
                                      type="button"
                                      onClick={() => setMemberToRemove({ brandId: bId, member: m })}
                                      className="text-red-600 hover:underline ml-2"
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
      </ErrorBoundary>

      {/* Edit Brand Modal */}
      <Modal
        isOpen={Boolean(editingBrand)}
        onClose={() => setEditingBrand(null)}
        title="Edit Brand Workspace"
        description="Update the workspace display name and primary timezone."
        confirmLabel="Save Changes"
        onConfirm={handleUpdateBrand}
        isLoading={savingEdit}
      >
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">
              Workspace Name
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">
              Timezone
            </label>
            <select
              value={editTimezone}
              onChange={(e) => setEditTimezone(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
            >
              <option value="UTC">UTC (Universal Coordinated)</option>
              <option value="America/New_York">Eastern Time (US / New York)</option>
              <option value="America/Los_Angeles">Pacific Time (US / Los Angeles)</option>
              <option value="Europe/London">London (GMT / BST)</option>
              <option value="Asia/Kolkata">India (IST / Kolkata)</option>
              <option value="Asia/Tokyo">Tokyo (JST / Japan)</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Delete Brand Modal */}
      <Modal
        isOpen={Boolean(brandToDelete)}
        onClose={() => setBrandToDelete(null)}
        title="Delete Workspace?"
        description={`Are you sure you want to delete "${brandToDelete?.name}"? All associated posts and permissions will be permanently removed.`}
        confirmLabel="Delete Workspace"
        isDestructive
        onConfirm={confirmDeleteBrand}
        isLoading={deleting}
      />

      {/* Remove Member Modal */}
      <Modal
        isOpen={Boolean(memberToRemove)}
        onClose={() => setMemberToRemove(null)}
        title="Remove Team Member?"
        description={`Remove ${memberToRemove?.member.email || memberToRemove?.member.userId} from this workspace?`}
        confirmLabel="Remove Member"
        isDestructive
        onConfirm={confirmRemoveMember}
        isLoading={removingMember}
      />
    </CrmShell>
  );
}

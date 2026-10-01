"use client";

import { useEffect, useState } from "react";
import AppIcon from "@/src/components/ui/AppIcon";
import CrmShell from "@/src/components/ui/CrmShell";
import { api } from "@/src/config/api";
import { authJsonFetch, logoutSession } from "@/src/lib/session";

interface LinkButton {
  title: string;
  url: string;
}

interface SmartLink {
  id?: string;
  _id?: string;
  slug: string;
  title: string;
  bio?: string;
  buttons?: LinkButton[];
  theme?: string;
  views?: number;
  clicks?: number;
  createdAt?: string;
}

export default function SmartLinksPage() {
  const [pages, setPages] = useState<SmartLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [theme, setTheme] = useState("dark");
  const [buttons, setButtons] = useState<LinkButton[]>([
    { title: "Official Website", url: "https://example.com" },
    { title: "Latest Announcement", url: "https://example.com/news" },
  ]);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const getPageId = (p: SmartLink) => p.id || p._id || "";

  async function loadSmartLinks() {
    setLoading(true);
    try {
      const resp = await authJsonFetch<{ data?: SmartLink[] }>(api.smartlinks.list());
      const list = resp?.data || [];
      setPages(list.map((p) => ({ ...p, _id: getPageId(p) })));
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to load link-in-bio pages" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSmartLinks();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!slug.trim() || !title.trim()) return;
    setCreating(true);
    try {
      await authJsonFetch(api.smartlinks.create(), {
        method: "POST",
        body: JSON.stringify({
          slug: slug.trim().toLowerCase(),
          title: title.trim(),
          bio: bio.trim(),
          theme,
          buttons: buttons.filter((b) => b.title && b.url),
        }),
      });
      setMessage({ type: "success", text: `Bio link "${slug}" created successfully!` });
      setSlug("");
      setTitle("");
      setBio("");
      await loadSmartLinks();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to create bio page" });
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this SmartLink page?")) return;
    try {
      await authJsonFetch(api.smartlinks.delete(id), { method: "DELETE" });
      setMessage({ type: "success", text: "Page deleted." });
      await loadSmartLinks();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to delete page" });
    }
  }

  return (
    <CrmShell
      pageTitle="SmartLinks (Link-in-Bio)"
      pageSubtitle="Drive traffic from Instagram & LinkedIn profiles to high-converting branded landing pages."
      breadcrumbs={["XSocial", "SmartLinks"]}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Builder Form */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <span className="icon-token">
              <AppIcon name="link" className="app-icon" />
            </span>
            <h2 className="text-base font-bold">Bio Page Builder</h2>
          </div>

          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">
                Custom Handle / Slug
              </label>
              <div className="flex items-center">
                <span className="text-xs bg-slate-100 text-slate-500 px-3 py-2 rounded-l-lg border border-r-0">
                  xsocial.bio/
                </span>
                <input
                  type="text"
                  placeholder="brandname"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border rounded-r-lg outline-none bg-white font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">
                Display Title
              </label>
              <input
                type="text"
                placeholder="Acme Social HQ"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg outline-none bg-white"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">
                Bio Description
              </label>
              <textarea
                placeholder="Connecting high-growth teams with modern social tools."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg outline-none bg-white h-16"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">
                Theme Style
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg bg-white"
              >
                <option value="dark">Midnight Dark (Modern)</option>
                <option value="light">Clean Minimalist Light</option>
                <option value="gradient">Ocean Breeze Gradient</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Action Buttons ({buttons.length})
                </label>
                <button
                  type="button"
                  onClick={() => setButtons([...buttons, { title: "New Link", url: "https://" }])}
                  className="text-xs text-teal-700 font-semibold"
                >
                  + Add Link
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {buttons.map((b, i) => (
                  <div key={i} className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Button Label"
                      value={b.title}
                      onChange={(e) => {
                        const copy = [...buttons];
                        copy[i].title = e.target.value;
                        setButtons(copy);
                      }}
                      className="w-1/2 px-2.5 py-1.5 text-xs border rounded-lg"
                      required
                    />
                    <input
                      type="url"
                      placeholder="Destination URL"
                      value={b.url}
                      onChange={(e) => {
                        const copy = [...buttons];
                        copy[i].url = e.target.value;
                        setButtons(copy);
                      }}
                      className="flex-1 px-2.5 py-1.5 text-xs border rounded-lg"
                      required
                    />
                    {buttons.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setButtons(buttons.filter((_, idx) => idx !== i))}
                        className="text-xs text-red-500 px-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={creating || !slug.trim() || !title.trim()}
              className="mt-2 bg-teal-700 hover:bg-teal-800 text-white font-medium py-2 px-4 rounded-lg text-xs transition-colors disabled:opacity-50"
            >
              {creating ? "Building Page..." : "Publish Bio Link"}
            </button>
          </form>
        </div>

        {/* Live Mockup Preview & Pages List */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold">Active Bio Pages ({pages.length})</h2>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400 py-6">Loading smartlinks...</p>
          ) : pages.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <AppIcon name="link" className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No SmartLink pages published yet. Build your first one on the left.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pages.map((p) => {
                const pId = getPageId(p);
                return (
                  <div key={pId} className="border border-slate-200 rounded-xl p-4 bg-white flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-teal-700">/{p.slug}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full uppercase">
                          {p.theme || "dark"}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 mt-1">{p.title}</h3>
                      {p.bio && <p className="text-xs text-slate-500 mt-1">{p.bio}</p>}

                      <div className="mt-3 flex flex-col gap-1.5">
                        {(p.buttons || []).map((btn, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-50 text-[11px] font-medium px-3 py-1.5 rounded-lg border border-slate-100 truncate text-slate-700"
                          >
                            🔗 {btn.title}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs">
                      <span className="text-slate-400 text-[11px]">
                        Views: {p.views || 0} • Clicks: {p.clicks || 0}
                      </span>
                      <div className="flex items-center gap-2">
                        <a
                          href={`http://localhost:5000/v1/bio/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-teal-700 hover:underline font-medium text-xs"
                        >
                          View Live ↗
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDelete(pId)}
                          className="text-red-500 hover:underline text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
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

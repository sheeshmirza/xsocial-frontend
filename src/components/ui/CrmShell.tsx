"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import AppIcon from "@/src/components/ui/AppIcon";
import { logoutSession } from "@/src/lib/session";

type NavItem = {
  label: string;
  href: string;
  icon:
    | "home"
    | "publish"
    | "users"
    | "settings"
    | "folder"
    | "send"
    | "link"
    | "rocket"
    | "target"
    | "trend"
    | "chart";
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

type CrmShellProps = {
  pageTitle: string;
  pageSubtitle?: string;
  breadcrumbs?: string[];
  actions?: ReactNode;
  filters?: ReactNode;
  onSignOut?: () => Promise<void> | void;
  children: ReactNode;
};

const navGroups: NavGroup[] = [
  {
    title: "Main Menu",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "home" },
      { label: "Connected Accounts", href: "/accounts", icon: "users" },
      { label: "Brands & Workspaces", href: "/brands", icon: "folder" },
    ],
  },
  {
    title: "Preferences",
    items: [
      { label: "Settings", href: "/settings", icon: "settings" },
    ],
  },
];

export default function CrmShell({
  pageTitle,
  pageSubtitle,
  breadcrumbs = ["XSocial", pageTitle],
  actions,
  filters,
  onSignOut,
  children,
}: CrmShellProps) {
  const pathname = usePathname();
  const safePathname = pathname || "";
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    if (onSignOut) {
      await onSignOut();
    } else {
      await logoutSession();
      window.location.href = "/signin";
    }
  };

  useEffect(() => {
    if (!mobileOpen) return;

    // Lock body scroll on mobile when drawer is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileOpen]);

  const allItems = useMemo(() => navGroups.flatMap((g) => g.items), []);

  const activeLabel = useMemo(() => {
    return allItems.find((item) => safePathname.startsWith(item.href))?.label || "Workspace";
  }, [allItems, safePathname]);

  return (
    <div className="crm-app-shell">
      <header className="crm-topnav glass-panel">
        <div className="crm-topnav-left">
          <button
            type="button"
            className="icon-btn mobile-only"
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
            aria-controls="crm-sidebar"
            onClick={() => setMobileOpen(true)}
          >
            <AppIcon name="menu" className="app-icon" />
          </button>
          <div className="crm-brand-mark">
            <span className="brand-icon" aria-hidden="true">
              <AppIcon name="spark" className="app-icon" />
            </span>
            <div>
              <p className="crm-brand-title">XSocial</p>
              <p className="crm-brand-subtitle">{activeLabel}</p>
            </div>
          </div>
        </div>

        <div className="crm-topnav-right">
          <button
            type="button"
            className="ghost-btn"
            onClick={handleSignOut}
            aria-label="Sign out of XSocial"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="crm-body">
        <aside
          id="crm-sidebar"
          aria-label="Workspace navigation"
          className={`crm-sidebar glass-panel ${mobileOpen ? "open" : ""}`}
        >
          <div className="crm-sidebar-head mobile-only flex items-center justify-between pb-3 border-b border-slate-200">
            <p className="font-bold text-xs uppercase tracking-wider text-slate-700">Navigation</p>
            <button
              type="button"
              className="icon-btn"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
            >
              <AppIcon name="close" className="app-icon" />
            </button>
          </div>

          {navGroups.map((group) => (
            <div key={group.title} className="crm-nav-group">
              <p className="crm-nav-title">{group.title}</p>
              {group.items.map((item) => {
                const active = safePathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    className={`crm-nav-link ${active ? "active" : ""}`}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMobileOpen(false)}
                  >
                    <AppIcon name={item.icon} className="app-icon" />
                    <span>
                      <strong>{item.label}</strong>
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </aside>

        {mobileOpen ? (
          <button
            type="button"
            className="crm-overlay"
            aria-label="Close navigation overlay"
            onClick={() => setMobileOpen(false)}
          />
        ) : null}

        <main className="crm-main" id="main-content">
          <div className="crm-page-header">
            <div>
              <nav aria-label="Breadcrumb">
                <p className="crm-breadcrumbs">{breadcrumbs.join(" / ")}</p>
              </nav>
              <h1>{pageTitle}</h1>
              {pageSubtitle ? <p className="subtitle">{pageSubtitle}</p> : null}
            </div>
            <div className="crm-page-actions">{actions}</div>
          </div>
          {filters ? <div className="crm-page-filters">{filters}</div> : null}
          {children}
        </main>
      </div>
    </div>
  );
}

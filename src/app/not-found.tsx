import Link from "next/link";
import AppIcon from "@/src/components/ui/AppIcon";

export default function NotFound() {
  return (
    <main className="dashboard-shell" id="main-content">
      <section className="dashboard-card not-found-card">
        <p className="eyebrow">XSocial</p>
        <div className="card-title-row">
          <span className="icon-token" aria-hidden="true">
            <AppIcon name="alert" className="app-icon" />
          </span>
          <p className="subtitle-inline">404 error</p>
        </div>
        <h1>Page not found</h1>
        <p className="subtitle">The page you requested does not exist or is no longer available.</p>
        <div className="hero-actions">
          <Link href="/signin" className="solid-link">Return to sign in</Link>
        </div>
      </section>
    </main>
  );
}
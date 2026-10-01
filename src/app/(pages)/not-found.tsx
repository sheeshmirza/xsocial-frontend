import Link from "next/link";

export default function NotFound() {
  return (
    <main className="dashboard-shell" id="main-content">
      <section className="dashboard-card">
        <p className="eyebrow">XSocial</p>
        <h1>Page not found</h1>
        <p className="subtitle">The page you requested does not exist.</p>
        <p className="swap-cta">
          Return to <Link href="/signin">Sign In</Link>
        </p>
      </section>
    </main>
  );
}

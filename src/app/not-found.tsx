import Link from "next/link";
import AppIcon from "@/src/components/ui/AppIcon";

export default function NotFound() {
  return (
    <main className="dashboard-shell" id="main-content">
      <section className="dashboard-card not-found-card text-center max-w-lg p-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 mb-4 mx-auto">
          <AppIcon name="alert" className="w-7 h-7" />
        </div>
        <p className="eyebrow text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">
          404 Not Found
        </p>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Page not found</h1>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          The page you requested does not exist or has been moved to a different workspace route.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard" className="primary-btn inline-flex items-center gap-2 px-5 py-2.5">
            <AppIcon name="home" className="w-4 h-4" />
            Go to Dashboard
          </Link>
          <Link href="/signin" className="outline-btn inline-flex items-center gap-2 px-5 py-2.5">
            Return to Sign In
          </Link>
        </div>
      </section>
    </main>
  );
}
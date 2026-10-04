import type { Metadata, Viewport } from "next";
import QueryProvider from "@/src/components/providers/QueryProvider";
import { ToastProvider } from "@/src/components/ui/ToastContext";
import OfflineIndicator from "@/src/components/ui/OfflineIndicator";
import "./global.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#1f6d82",
};

export const metadata: Metadata = {
  title: {
    default: "XSocial | AI-Powered Social Media Management",
    template: "%s | XSocial",
  },
  description:
    "XSocial is an AI-powered social automation platform. Plan, create, schedule, publish, and automate content across Instagram and LinkedIn with multi-workspace RBAC.",
  applicationName: "XSocial",
  keywords: [
    "XSocial",
    "social media automation",
    "AI social media",
    "social media management",
    "content scheduling",
    "cross-posting",
    "social publishing",
    "Instagram automation",
    "LinkedIn automation",
  ],
  authors: [{ name: "XSocial Team" }],
  creator: "XSocial",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <QueryProvider>
          <ToastProvider>
            {children}
            <OfflineIndicator />
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
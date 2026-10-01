import type { Metadata } from "next";
import "./global.css";

export const metadata: Metadata = {
  title: {
    default: "XSocial",
    template: "%s | XSocial",
  },
  description:
    "XSocial is an AI-powered social network automation platform that helps you create, schedule, publish, and automate content across multiple social networks.",
  applicationName: "XSocial",
  keywords: [
    "XSocial",
    "social media automation",
    "AI social media",
    "social media management",
    "content scheduling",
    "cross-posting",
    "social publishing",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
import type { Metadata } from "next";
import AuthLifecycleForm from "@/src/components/auth/AuthLifecycleForm";

export const metadata: Metadata = {
  title: "Verify Email",
  description: "Verify your email address to activate your XSocial workspace.",
};

export default function VerifyEmailPage() {
  return <AuthLifecycleForm mode="verify" />;
}

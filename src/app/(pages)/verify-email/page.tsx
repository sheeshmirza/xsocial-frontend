import type { Metadata } from "next";
import AuthLifecycleForm from "@/src/components/auth/AuthLifecycleForm";

export const metadata: Metadata = {
  title: "Confirm Email",
  description: "Confirm your email address to activate your XSocial account.",
};

export default function VerifyEmailPage() {
  return <AuthLifecycleForm mode="verify" />;
}

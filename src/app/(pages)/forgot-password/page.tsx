import type { Metadata } from "next";
import AuthLifecycleForm from "@/src/components/auth/AuthLifecycleForm";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Request a password reset link for your XSocial account.",
};

export default function ForgotPasswordPage() {
  return <AuthLifecycleForm mode="forgot" />;
}

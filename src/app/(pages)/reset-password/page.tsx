import type { Metadata } from "next";
import AuthLifecycleForm from "@/src/components/auth/AuthLifecycleForm";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set a new password for your XSocial account.",
};

export default function ResetPasswordPage() {
  return <AuthLifecycleForm mode="reset" />;
}

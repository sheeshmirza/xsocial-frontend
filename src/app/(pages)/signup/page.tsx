import type { Metadata } from "next";
import AuthForm from "@/src/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Sign Up",
  description:
    "Create your XSocial account to plan, schedule, and publish your social media posts.",
};

export default function SignUpPage() {
  return <AuthForm mode="signup" />;
}

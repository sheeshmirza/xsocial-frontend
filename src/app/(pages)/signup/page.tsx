import type { Metadata } from "next";
import AuthForm from "@/src/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Sign Up",
  description:
    "Create your XSocial account and start automating your social media workflows.",
};

export default function SignUpPage() {
  return <AuthForm mode="signup" />;
}

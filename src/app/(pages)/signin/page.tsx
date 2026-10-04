import type { Metadata } from "next";
import AuthForm from "@/src/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your XSocial account to manage and schedule your social media posts.",
};

export default function SignInPage() {
  return <AuthForm mode="signin" />;
}

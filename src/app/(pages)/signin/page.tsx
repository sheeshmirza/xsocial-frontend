//Reviewed

import type { Metadata } from "next";
import AuthForm from "@/src/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your XSocial account and continue automating your social media workflows.",
};

export default function SignInPage() {
  return <AuthForm mode="signin" />;
}

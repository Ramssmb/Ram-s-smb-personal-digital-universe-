import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { currentAdmin } from "@/server/auth/guard";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // Only same-site admin paths are allowed as a redirect target (no open redirect).
  const target = next && /^\/admin(\/[\w\-/]*)?$/.test(next) ? next : "/admin";
  if (await currentAdmin()) redirect(target);
  return (
    <main id="main" className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <p className="eyebrow">Dashboard</p>
        <h1 className="mt-2 text-h2 font-semibold">Sign in</h1>
        <p className="mt-2 text-small text-fg-muted">Only the site owner can sign in.</p>
        <LoginForm next={target} />
      </div>
    </main>
  );
}

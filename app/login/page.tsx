"use client";

import Link from "next/link";
import { useState } from "react";
import { Chrome, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const supabase = createSupabaseBrowserClient();

  async function loginWithGoogle() {
    if (!supabase) {
      toast.info("Add Supabase environment variables to enable OAuth.");
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` }
    });
  }

  async function loginWithEmail(event: React.FormEvent) {
    event.preventDefault();
    if (!email) return;
    if (!supabase) {
      toast.info("Add Supabase environment variables to enable email login.");
      return;
    }
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` }
    });
    toast.success("Magic link sent.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-glow">
        <Link href="/" className="text-sm text-muted transition hover:text-white">
          PlanTogether
        </Link>
        <h1 className="mt-6 text-3xl font-semibold text-white">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Use Google OAuth or email login through Supabase Auth.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Button type="button" onClick={loginWithGoogle}>
            <Chrome size={17} />
            Continue with Google
          </Button>
          <form className="flex flex-col gap-3" onSubmit={loginWithEmail}>
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            <Button variant="outline" type="submit">
              <Mail size={17} />
              Send magic link
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}

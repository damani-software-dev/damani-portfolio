import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const Route = createFileRoute("/admin_/login")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/admin" });
  },
  head: () => ({
    meta: [
      { title: "Sign in — Portfolio CMS" },
      { name: "description", content: "Administrator sign-in." },
      { property: "og:title", content: "Sign in — Portfolio CMS" },
      { property: "og:description", content: "Administrator sign-in." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = schema.safeParse({ email: form.get("email"), password: form.get("password") });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check the form.");
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setBusy(false);
    if (error) return setError(error.message === "Invalid login credentials" ? "Incorrect email or password." : error.message);
    navigate({ to: "/admin" });
  }

  async function onReset(email: string) {
    const r = z.string().email().safeParse(email.trim());
    if (!r.success) return setError("Enter your email above first.");
    const { error } = await supabase.auth.resetPasswordForEmail(r.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) setError(error.message);
    else setResetSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm border border-border bg-card p-8" noValidate>
        <p className="eyebrow">Portfolio CMS</p>
        <h1 className="display mt-2 text-4xl">Sign in</h1>
        <div className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
        {resetSent && <p role="status" className="mt-4 text-sm text-success">Check your inbox for a reset link.</p>}
        <Button type="submit" className="mt-6 w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
        <button
          type="button"
          className="mt-4 text-sm text-muted-foreground hover:text-foreground"
          onClick={(e) => onReset((e.currentTarget.form?.elements.namedItem("email") as HTMLInputElement).value)}
        >
          Forgot password?
        </button>
      </form>
    </main>
  );
}

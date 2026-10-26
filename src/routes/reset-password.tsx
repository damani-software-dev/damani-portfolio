import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password" },
      { name: "description", content: "Choose a new administrator password." },
      { property: "og:title", content: "Set a new password" },
      { property: "og:description", content: "Choose a new administrator password." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const pw = String(new FormData(e.currentTarget).get("password") ?? "");
    if (pw.length < 8) return setError("Use at least 8 characters.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setError(error.message);
    navigate({ to: "/admin" });
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm border border-border bg-card p-8">
        <h1 className="display text-4xl">New password</h1>
        <div className="mt-6 space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" />
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
        <Button type="submit" className="mt-6 w-full" disabled={busy}>{busy ? "Saving…" : "Save password"}</Button>
      </form>
    </main>
  );
}

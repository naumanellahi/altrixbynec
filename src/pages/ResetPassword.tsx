import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase puts a recovery session in the URL hash (#access_token=...&type=recovery)
    // The client auto-parses and fires PASSWORD_RECOVERY when ready.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setReady(true);
      }
    });

    // Fallback: check existing session after a tick
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) setReady(true);
      else {
        // Wait a moment for the hash exchange to settle
        setTimeout(async () => {
          const { data: d2 } = await supabase.auth.getSession();
          if (d2.session) setReady(true);
          else setInvalid("This password reset link is invalid or has expired. Please request a new one.");
        }, 800);
      }
    })();

    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async () => {
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
        return;
      }
      setDone(true);
      toast.success("Password updated. You can now sign in.");
      // Sign out so the user logs in with their new password explicitly
      await supabase.auth.signOut();
      setTimeout(() => navigate("/"), 1800);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-hero-grid grid place-items-center px-6 py-10">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader>
          <CardTitle className="font-display text-xl flex items-center gap-2">
            <KeyRound className="h-5 w-5" /> Set a new password
          </CardTitle>
          <p className="text-sm text-muted-foreground">Choose a strong password you haven't used before.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {invalid && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive flex gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {invalid}
            </div>
          )}
          {done ? (
            <div className="rounded-xl bg-primary/10 border border-primary/30 p-4 text-sm flex gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <div>
                <p className="font-medium">Password updated</p>
                <p className="text-muted-foreground">Redirecting you to sign in…</p>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); if (!busy && ready) void submit(); }}
              className="space-y-3"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">New password</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" disabled={!ready} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm password</label>
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" autoComplete="new-password" disabled={!ready} />
              </div>
              <Button type="submit" variant="hero" size="xl" className="w-full" disabled={busy || !ready}>
                {busy ? "Updating…" : ready ? "Update password" : "Verifying link…"}
              </Button>
            </form>
          )}

          <Button variant="ghost" className="w-full" onClick={() => navigate(-1)}>Back</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;

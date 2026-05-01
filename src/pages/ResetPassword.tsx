import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { KeyRound, CheckCircle2, AlertCircle, Mail, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const passwordSchema = z.string().min(8, "Password must be at least 8 characters");
const emailSchema = z.string().email("Please enter a valid email");

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = useMemo(() => {
    const r = searchParams.get("returnTo");
    if (r && r.startsWith("/")) return r;
    return "/";
  }, [searchParams]);

  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // Resend flow state
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendSentTo, setResendSentTo] = useState<string | null>(null);

  // Detect URL-level errors from Supabase (e.g. expired/invalid)
  useEffect(() => {
    const hash = window.location.hash || "";
    const qs = window.location.search || "";
    const combined = (hash.startsWith("#") ? hash.slice(1) : hash) + "&" + qs.replace(/^\?/, "");
    const params = new URLSearchParams(combined);
    const errCode = params.get("error_code") || params.get("error");
    const errDesc = params.get("error_description");
    if (errCode) {
      const isExpired = /expired|otp_expired|access_denied/i.test(errCode) || /expired/i.test(errDesc || "");
      setExpired(
        isExpired
          ? "Your password reset link has expired. For your security, links are only valid for a short time."
          : (errDesc?.replace(/\+/g, " ") || "This reset link is invalid. Please request a new one.")
      );
      return;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setReady(true);
      }
    });

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) setReady(true);
      else {
        setTimeout(async () => {
          const { data: d2 } = await supabase.auth.getSession();
          if (d2.session) setReady(true);
          else setExpired("This password reset link is invalid or has expired. Please request a new one.");
        }, 900);
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
      await supabase.auth.signOut();
      // Send the user back to the login page they came from
      setTimeout(() => navigate(returnTo, { replace: true }), 1600);
    } finally {
      setBusy(false);
    }
  };

  const resendLink = async () => {
    const parsed = emailSchema.safeParse(resendEmail.trim());
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setResending(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password?returnTo=${encodeURIComponent(returnTo)}`;
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo });
      if (error) {
        toast.error(error.message);
        return;
      }
      setResendSentTo(parsed.data);
      toast.success(`New reset link sent to ${parsed.data}`);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-hero-grid grid place-items-center px-6 py-10">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader>
          <CardTitle className="font-display text-xl flex items-center gap-2">
            <KeyRound className="h-5 w-5" /> {expired ? "Reset link expired" : "Set a new password"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {expired
              ? "Request a fresh link below — it only takes a moment."
              : "Choose a strong password you haven't used before."}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {expired ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive flex gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Link no longer valid</p>
                  <p className="text-destructive/80">{expired}</p>
                </div>
              </div>

              {resendSentTo ? (
                <div className="rounded-xl bg-primary/10 border border-primary/30 p-4 text-sm flex gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div>
                    <p className="font-medium">Email sent</p>
                    <p className="text-muted-foreground">
                      A new reset link is on its way to <span className="font-medium">{resendSentTo}</span>. Check your inbox and spam folder.
                    </p>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={(e) => { e.preventDefault(); if (!resending) void resendLink(); }}
                  className="space-y-3"
                >
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" /> Your email
                    </label>
                    <Input
                      type="email"
                      autoComplete="email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="name@school.com"
                    />
                  </div>
                  <Button type="submit" variant="hero" size="xl" className="w-full" disabled={resending}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${resending ? "animate-spin" : ""}`} />
                    {resending ? "Sending…" : "Resend reset link"}
                  </Button>
                </form>
              )}

              {resendSentTo && (
                <Button
                  variant="soft"
                  className="w-full"
                  onClick={() => { setResendSentTo(null); }}
                >
                  Send to a different email
                </Button>
              )}
            </div>
          ) : done ? (
            <div className="rounded-xl bg-primary/10 border border-primary/30 p-4 text-sm flex gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <div>
                <p className="font-medium">Password updated</p>
                <p className="text-muted-foreground">Redirecting you back to sign in…</p>
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

          <Button variant="ghost" className="w-full" onClick={() => navigate(returnTo)}>
            Back to sign in
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;

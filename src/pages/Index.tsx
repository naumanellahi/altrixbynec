import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Brain, ShieldCheck, Eye, MessageSquare, ArrowRight, KeyRound, Loader2, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SpotlightBackdrop } from "@/components/visual/SpotlightBackdrop";
import { AltrixLogo } from "@/components/AltrixLogo";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { MASTER_SUPER_ADMIN_EMAIL } from "@/hooks/usePlatformSuperAdmin";
import { type EduverseRole } from "@/lib/eduverse-roles";
import {
  getRecentEmails,
  getResetCooldownRemaining,
  rememberRecentEmail,
  rememberResetEmail,
  requestPasswordResetLink,
  startResetCooldown,
} from "@/lib/password-reset";

const emailSchema = z.string().email();
const passwordSchema = z.string().min(8);

const ROLE_PRIORITY: EduverseRole[] = [
  "super_admin",
  "school_owner",
  "principal",
  "vice_principal",
  "school_admin",
  "academic_coordinator",
  "hr_manager",
  "accountant",
  "marketing_staff",
  "counselor",
  "teacher",
  "parent",
  "student",
];

const roleToPathSegment = (role: EduverseRole) => {
  if (role === "hr_manager") return "hr";
  if (role === "marketing_staff") return "marketing";
  return role;
};

const resolveDestinationRole = (roles: EduverseRole[]): EduverseRole | null => {
  for (const r of ROLE_PRIORITY) if (roles.includes(r)) return r;
  return roles[0] ?? null;
};

const Index = () => {
  const params = useParams();
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const [schoolSlug, setSchoolSlug] = useState(params.schoolSlug || "beacon");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "error" | "info" } | null>(null);
  const [resetCooldown, setResetCooldown] = useState(0);
  const [recentEmails, setRecentEmails] = useState<string[]>(() => getRecentEmails());
  const emailInputRef = useRef<HTMLInputElement>(null);

  const focusEmail = () => {
    requestAnimationFrame(() => emailInputRef.current?.focus());
  };
  const showError = (text: string) => setMessage({ text, tone: "error" });
  const showSuccess = (text: string) => setMessage({ text, tone: "success" });
  const showInfo = (text: string) => setMessage({ text, tone: "info" });

  const safeSlug = useMemo(
    () => schoolSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, ""),
    [schoolSlug],
  );

  const tenant = useTenant(safeSlug || undefined);

  useEffect(() => {
    if (!email && recentEmails.length > 0) setEmail(recentEmails[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const tick = () => setResetCooldown(email.trim() ? getResetCooldownRemaining(email) : 0);
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [email]);

  const features = [
    { icon: Brain, title: "AI Features", desc: "Smart insights for performance and decision-making." },
    { icon: ShieldCheck, title: "Privacy & Security", desc: "Secure, role-based, protected data system." },
    { icon: Eye, title: "Transparency", desc: "Clear visibility with real-time data." },
    { icon: MessageSquare, title: "Communication", desc: "Unified messaging across all roles." },
  ];

  const routeUserAfterLogin = async (userId: string) => {
    if (tenant.status !== "ready") {
      showError("School not found. Please check the school code.");
      await supabase.auth.signOut();
      return;
    }
    const schoolId = tenant.schoolId;

    const { data: authUser } = await supabase.auth.getUser();
    const signedInEmail = authUser.user?.email?.toLowerCase() ?? null;
    if (signedInEmail === MASTER_SUPER_ADMIN_EMAIL) {
      const { data: psa } = await supabase
        .from("platform_super_admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (psa?.user_id) {
        navigate("/super_admin");
        return;
      }
    }

    const { data: membership } = await supabase
      .from("school_memberships")
      .select("id")
      .eq("school_id", schoolId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership) {
      showError("Your account is not a member of this school.");
      await supabase.auth.signOut();
      return;
    }

    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("school_id", schoolId)
      .eq("user_id", userId);

    const roles = (rolesData || []).map((r) => r.role as EduverseRole);
    const destRole = resolveDestinationRole(roles);

    if (!destRole) {
      showError("No role assigned to your account for this school. Contact an administrator.");
      await supabase.auth.signOut();
      return;
    }

    navigate(`/${tenant.slug}/${roleToPathSegment(destRole)}`);
  };

  const doLogin = async () => {
    setMessage(null);
    if (!safeSlug) return showError("Please enter your school code.");
    if (tenant.status === "loading") return showInfo("Verifying school code…");
    if (tenant.status === "error") return showError(tenant.error || "School not found.");
    if (tenant.status !== "ready") return showError("School not found.");

    const parsedEmail = emailSchema.safeParse(email.trim());
    const parsedPassword = passwordSchema.safeParse(password);
    if (!parsedEmail.success) {
      focusEmail();
      return showError("Please enter a valid email.");
    }
    if (!parsedPassword.success) return showError("Password must be at least 8 characters.");

    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: parsedEmail.data,
        password,
      });
      if (error) {
        showError(error.message);
        return;
      }
      rememberRecentEmail(parsedEmail.data);
      setRecentEmails(getRecentEmails());
      if (data.user) await routeUserAfterLogin(data.user.id);
    } finally {
      setBusy(false);
    }
  };

  const doForgotPassword = async () => {
    setMessage(null);
    const parsedEmail = emailSchema.safeParse(email.trim());
    if (!parsedEmail.success) {
      focusEmail();
      return showError("Enter your email above, then try again.");
    }
    const cooldown = getResetCooldownRemaining(parsedEmail.data);
    if (cooldown > 0) {
      setResetCooldown(cooldown);
      return showInfo(`Please wait ${cooldown}s before requesting another reset link.`);
    }
    setBusy(true);
    try {
      const returnTo = `/${safeSlug}/auth`;
      const result = await requestPasswordResetLink(parsedEmail.data, returnTo);
      if (!result.ok) {
        focusEmail();
        return showError(result.error || "Unable to send reset link. Please try again shortly.");
      }
      const seconds = result.cooldownSeconds || 60;
      rememberResetEmail(parsedEmail.data);
      startResetCooldown(parsedEmail.data, seconds);
      setResetCooldown(seconds);
      const remaining =
        typeof result.remainingRequests === "number"
          ? ` You have ${result.remainingRequests} reset request${result.remainingRequests === 1 ? "" : "s"} left today.`
          : "";
      showSuccess(`We sent a password reset link to ${parsedEmail.data}. Check your inbox and spam folder.${remaining}`);
    } finally {
      setBusy(false);
    }
  };

  const tenantBadge =
    tenant.status === "ready"
      ? { label: tenant.school.name, tone: "ok" as const }
      : tenant.status === "error"
        ? { label: "School not found", tone: "err" as const }
        : safeSlug
          ? { label: "Checking…", tone: "neutral" as const }
          : null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-hero-grid">
      <SpotlightBackdrop />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <AltrixLogo size="md" />
          <span className="text-xs text-muted-foreground hidden md:inline">School Operating System</span>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <div className="flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 shadow-elevated">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Admin-created users only</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16 pt-4">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Title — always first */}
          <motion.section
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
            className="order-1 space-y-5 text-center lg:col-start-1 lg:row-start-1 lg:text-left lg:pt-6"
          >
            <AltrixLogo size="lg" className="text-5xl md:text-6xl" />
            <h1 className={cn("font-display text-balance text-3xl font-semibold tracking-tight md:text-4xl")}>
              The AI-Powered Operating System for Modern Schools
            </h1>
            <p className="mx-auto max-w-2xl text-balance text-base text-muted-foreground md:text-lg lg:mx-0">
              One unified platform for academics, finance, HR, communication, and AI-driven insights — built for 12 distinct roles.
            </p>
          </motion.section>

          {/* Login — mobile: 2nd (right after title). Desktop: right column spanning both rows */}
          <motion.section
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="order-2 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-start lg:pt-6"
          >
            <div className="mx-auto w-full max-w-md rounded-2xl bg-surface p-6 shadow-elevated">
              <div className="mb-5 text-center">
                <h2 className="font-display text-2xl font-semibold tracking-tight">Sign in to your school</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter your school code and credentials.
                </p>
              </div>

              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!busy) void doLogin();
                }}
              >
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="school-code">School Code</label>
                  <div className="relative">
                    <Input
                      id="school-code"
                      value={schoolSlug}
                      onChange={(e) => setSchoolSlug(e.target.value)}
                      placeholder="e.g. beacon"
                      aria-label="School code"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className={cn(
                        "pr-9",
                        tenant.status === "ready" && "border-primary/60 focus-visible:ring-primary/30",
                        tenant.status === "error" && "border-destructive/60 focus-visible:ring-destructive/30",
                      )}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                      {!safeSlug ? null : tenant.status === "loading" ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : tenant.status === "ready" ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : tenant.status === "error" ? (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      ) : null}
                    </div>
                  </div>
                  {tenantBadge && (
                    <p
                      className={cn(
                        "text-xs flex items-center gap-1",
                        tenantBadge.tone === "ok" && "text-primary",
                        tenantBadge.tone === "err" && "text-destructive",
                        tenantBadge.tone === "neutral" && "text-muted-foreground",
                      )}
                    >
                      {tenantBadge.tone === "ok" && <CheckCircle2 className="h-3 w-3" />}
                      {tenantBadge.tone === "err" && <AlertCircle className="h-3 w-3" />}
                      {tenantBadge.tone === "neutral" && <Loader2 className="h-3 w-3 animate-spin" />}
                      <span>
                        {tenantBadge.tone === "ok" ? `Verified: ${tenantBadge.label}` : tenantBadge.label}
                      </span>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="login-email">Email</label>
                  <Input
                    id="login-email"
                    name="email"
                    ref={emailInputRef}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@school.com"
                    type="email"
                    autoComplete="username"
                    inputMode="email"
                    list="saved-emails"
                  />
                  {recentEmails.length > 0 && (
                    <datalist id="saved-emails">
                      {recentEmails.map((e) => (
                        <option key={e} value={e} />
                      ))}
                    </datalist>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium" htmlFor="login-password">Password</label>
                    <button
                      type="button"
                      onClick={() => { if (!busy && resetCooldown <= 0) void doForgotPassword(); }}
                      disabled={busy || resetCooldown > 0}
                      className="text-xs text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                    >
                      {resetCooldown > 0 ? `Resend in ${resetCooldown}s` : "Forgot password?"}
                    </button>
                  </div>
                  <Input
                    id="login-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    type="password"
                    autoComplete="current-password"
                  />
                </div>

                <Button
                  type="submit"
                  variant="hero"
                  size="xl"
                  className="w-full"
                  disabled={busy || tenant.status !== "ready"}
                >
                  {busy ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…</>
                  ) : tenant.status === "loading" && safeSlug ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying school…</>
                  ) : tenant.status === "error" ? (
                    "Invalid school code"
                  ) : !safeSlug ? (
                    "Enter school code to continue"
                  ) : (
                    <>Sign in <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </form>

              {message && (
                <div
                  role={message.tone === "error" ? "alert" : "status"}
                  className={cn(
                    "mt-4 rounded-xl p-3 text-sm flex items-start gap-2 border",
                    message.tone === "success" && "bg-primary/10 border-primary/30 text-foreground",
                    message.tone === "error" && "bg-destructive/10 border-destructive/30 text-destructive",
                    message.tone === "info" && "bg-accent border-border text-accent-foreground",
                  )}
                >
                  {message.tone === "success" && <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />}
                  {message.tone === "error" && <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
                  {message.tone === "info" && <Info className="h-4 w-4 mt-0.5 shrink-0 opacity-70" />}
                  <span className="flex-1">{message.text}</span>
                </div>
              )}

              <p className="mt-5 text-center text-xs text-muted-foreground">
                Demo school: <span className="font-medium text-foreground">beacon</span> · Accounts are created by administrators.
              </p>
            </div>
          </motion.section>

          {/* Features — mobile: 3rd. Desktop: left column below title */}
          <motion.section
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.6 }}
            className="order-3 lg:col-start-1 lg:row-start-2"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {features.map((f) => (
                <div key={f.title} className="rounded-2xl bg-surface p-4 shadow-elevated text-left">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10">
                    <f.icon className="h-4 w-4 text-primary" />
                  </div>
                  <p className="mt-2 font-display text-sm font-semibold tracking-tight">{f.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
};

export default Index;

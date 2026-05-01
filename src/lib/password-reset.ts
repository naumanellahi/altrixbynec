import { supabase } from "@/integrations/supabase/client";

export const RESET_LINK_TTL_SECONDS = 60 * 60;
export const RESET_RESEND_COOLDOWN_SECONDS = 60;
export const RESET_DAILY_LIMIT = 3;

export type PasswordResetRequestResult = {
  ok: boolean;
  error?: string;
  code?: string;
  cooldownSeconds?: number;
  remainingRequests?: number;
};

export const buildResetRedirectUrl = (returnTo: string) =>
  `${window.location.origin}/reset-password?returnTo=${encodeURIComponent(returnTo)}`;

export const requestPasswordResetLink = async (email: string, returnTo: string) => {
  const redirectTo = buildResetRedirectUrl(returnTo);
  const { data, error } = await supabase.functions.invoke<PasswordResetRequestResult>("password-reset-request", {
    body: { email, redirectTo },
  });

  if (error) {
    return {
      ok: false,
      error: data?.error || error.message || "Unable to send the reset link right now. Please try again shortly.",
      code: data?.code,
    } satisfies PasswordResetRequestResult;
  }

  return (data ?? { ok: true, cooldownSeconds: RESET_RESEND_COOLDOWN_SECONDS }) as PasswordResetRequestResult;
};

const cooldownKey = (email: string) => `password-reset-cooldown:${email.trim().toLowerCase()}`;
const LAST_RESET_EMAIL_KEY = "password-reset-last-email";

export const rememberResetEmail = (email: string) => {
  localStorage.setItem(LAST_RESET_EMAIL_KEY, email.trim().toLowerCase());
};

export const getRememberedResetEmail = () => localStorage.getItem(LAST_RESET_EMAIL_KEY) || "";

export const startResetCooldown = (email: string, seconds = RESET_RESEND_COOLDOWN_SECONDS) => {
  localStorage.setItem(cooldownKey(email), String(Date.now() + seconds * 1000));
};

export const getResetCooldownRemaining = (email: string) => {
  const raw = localStorage.getItem(cooldownKey(email));
  const until = raw ? Number(raw) : 0;
  if (!Number.isFinite(until)) return 0;
  const remaining = Math.ceil((until - Date.now()) / 1000);
  if (remaining <= 0) {
    localStorage.removeItem(cooldownKey(email));
    return 0;
  }
  return remaining;
};

export const formatDuration = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

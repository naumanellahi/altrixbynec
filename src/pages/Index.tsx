import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Brain, ShieldCheck, Eye, MessageSquare, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SpotlightBackdrop } from "@/components/visual/SpotlightBackdrop";
import { AltrixLogo } from "@/components/AltrixLogo";

const Index = () => {
  const [schoolSlug, setSchoolSlug] = useState("beacon");
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const safeSlug = useMemo(() => schoolSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, ""), [schoolSlug]);

  const features = [
    { icon: Brain, title: "AI Features", desc: "Smart insights for performance and decision-making." },
    { icon: ShieldCheck, title: "Privacy & Security", desc: "Secure, role-based, protected data system." },
    { icon: Eye, title: "Transparency", desc: "Clear visibility with real-time data." },
    { icon: MessageSquare, title: "Communication", desc: "Unified messaging across all roles." },
  ];

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

      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16 pt-8">
        <motion.section
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          className="mx-auto max-w-3xl space-y-5 text-center"
        >
          <AltrixLogo size="lg" className="text-5xl md:text-6xl" />
          <h1 className={cn("font-display text-balance text-3xl font-semibold tracking-tight md:text-4xl")}>
            The AI-Powered Operating System for Modern Schools
          </h1>
          <p className="mx-auto max-w-2xl text-balance text-base text-muted-foreground md:text-lg">
            One unified platform for academics, finance, HR, communication, and AI-driven insights — built for 12 distinct roles.
          </p>

          <div className="mx-auto mt-6 max-w-xl rounded-2xl bg-surface p-4 shadow-elevated">
            <p className="mb-3 text-sm font-medium text-foreground">Enter your School Code</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input value={schoolSlug} onChange={(e) => setSchoolSlug(e.target.value)} placeholder="e.g. beacon" aria-label="School code" />
              <Button variant="hero" size="xl" onClick={() => { if (safeSlug) navigate(`/${safeSlug}/auth`); }}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Demo school: <span className="font-medium text-foreground">beacon</span>
            </p>
          </div>
        </motion.section>

        <motion.section
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.6 }}
          className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl bg-surface p-5 shadow-elevated">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="mt-3 font-display font-semibold tracking-tight">{f.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </motion.section>
      </main>
    </div>
  );
};

export default Index;

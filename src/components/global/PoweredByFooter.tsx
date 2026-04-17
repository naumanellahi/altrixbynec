export function PoweredByFooter() {
  return (
    <div className="pointer-events-none fixed bottom-2 right-3 z-[60] text-[10px] text-muted-foreground/70">
      <span className="pointer-events-auto rounded-full bg-background/70 px-2 py-1 backdrop-blur-sm border border-border/40">
        AltRix: powered by{" "}
        <a
          href="https://naumanellahi.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground/80 hover:text-primary transition-colors"
        >
          NAUMAN ELLAHI
        </a>
      </span>
    </div>
  );
}

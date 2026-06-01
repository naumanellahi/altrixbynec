export function PoweredByFooter() {
  const content = (
    <span className="pointer-events-auto rounded-full bg-background/70 px-2 py-1 backdrop-blur-sm border border-border/40">
      AltRix - School Operating System
    </span>
  );

  return (
    <>
      {/* Desktop / tablet: fixed bottom-right badge */}
      <div
        data-print="hide"
        className="pointer-events-none fixed bottom-2 right-3 z-[60] hidden text-[10px] text-muted-foreground/70 sm:block print:hidden"
      >
        {content}
      </div>
      {/* Mobile: inline footer at the end of page content, lifted above bottom nav */}
      <div
        data-print="hide"
        className="flex justify-center px-3 pt-6 pb-[calc(env(safe-area-inset-bottom)+6rem)] text-[10px] text-muted-foreground/70 sm:hidden print:hidden"
      >
        {content}
      </div>
    </>
  );
}

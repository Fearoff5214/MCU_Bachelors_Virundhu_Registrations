/** Slow-moving neon aurora behind hero sections. Pure CSS, cheap on budget phones. */
export function Aurora() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute -left-1/4 -top-1/3 size-[70vmax] animate-aurora rounded-full bg-magenta/25 blur-[120px]" />
      <div className="absolute -right-1/4 top-0 size-[55vmax] animate-aurora rounded-full bg-cyan/20 blur-[120px] [animation-delay:-6s]" />
      <div className="absolute bottom-[-30%] left-1/3 size-[45vmax] animate-aurora rounded-full bg-saffron/15 blur-[120px] [animation-delay:-12s]" />
    </div>
  );
}

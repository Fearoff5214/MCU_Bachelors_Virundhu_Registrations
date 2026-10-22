import { KovaiSkyline } from "./kovai-skyline";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line">
      <KovaiSkyline className="h-28 opacity-70" />
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 pb-10 text-xs text-mute sm:flex-row sm:justify-between sm:px-6">
        <p>
          Made in <span className="text-saffron">Kovai</span> with filter coffee ☕
        </p>
        <p>© {new Date().getFullYear()} Bachelors Virundhu · MCU</p>
      </div>
    </footer>
  );
}

"use client";

import confetti from "canvas-confetti";
import { useEffect } from "react";
import { T } from "./copy";

export function Celebrate() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#00e5ff", "#ff2e88", "#c6ff00", "#ff9f1c"];
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.3 }, colors });
    const id = setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { y: 0.2 }, colors }), 400);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="mb-8 rounded-2xl border border-lime/40 bg-lime/10 p-5">
      <p className="font-display text-2xl font-bold text-lime">
        <T k="confirmed" />
      </p>
      <p className="mt-1 text-sm text-ink/80">
        <T k="confirmedSub" />
      </p>
    </div>
  );
}

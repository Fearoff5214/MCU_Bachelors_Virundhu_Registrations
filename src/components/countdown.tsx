"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCopy } from "./copy";

export function HoldCountdown({ expiresAt }: { expiresAt: string }) {
  const t = useCopy();
  const router = useRouter();
  const end = new Date(expiresAt).getTime();
  const [left, setLeft] = useState(() => Math.max(0, end - Date.now()));

  useEffect(() => {
    const id = setInterval(() => {
      const ms = Math.max(0, end - Date.now());
      setLeft(ms);
      if (ms === 0) {
        clearInterval(id);
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [end, router]);

  const mm = String(Math.floor(left / 60000)).padStart(2, "0");
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
  const urgent = left < 120_000;

  return (
    <div className={`flex items-center justify-between rounded-xl border p-4 ${urgent ? "border-danger/50 bg-danger/10" : "border-cyan/30 bg-cyan/5"}`}>
      <span className="text-sm text-mute">{left === 0 ? t("holdExpired") : t("holdTimer")}</span>
      <span className={`font-mono text-2xl font-bold tabular-nums ${urgent ? "text-danger" : "text-cyan"}`}>
        {mm}:{ss}
      </span>
    </div>
  );
}

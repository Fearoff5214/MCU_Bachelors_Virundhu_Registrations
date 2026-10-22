"use client";

import clsx from "clsx";
import type { Html5Qrcode } from "html5-qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ScanResponse } from "@/lib/checkin";

type Shown = ScanResponse | { result: "error"; message: string };

const COOLDOWN_MS = 2500;

export function Scanner({ events }: { events: { id: string; name: string }[] }) {
  const [eventId, setEventId] = useState("");
  const [shown, setShown] = useState<Shown | null>(null);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const lastRef = useRef<{ token: string; at: number }>({ token: "", at: 0 });
  const busyRef = useRef(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bv-scan-event");
      if (saved && events.some((e) => e.id === saved)) setEventId(saved);
      else if (events.length === 1) setEventId(events[0].id);
    } catch {}
  }, [events]);

  const submit = useCallback(
    async (payload: { token?: string; code?: string }) => {
      if (!eventId || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      try {
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ eventId, ...payload }),
        });
        const data = res.ok ? ((await res.json()) as ScanResponse) : { result: "error" as const, message: `Server error ${res.status}` };
        setShown(data);
        if (data.result === "valid") {
          setCount((c) => c + 1);
          navigator.vibrate?.(120);
        } else {
          navigator.vibrate?.([200, 80, 200, 80, 200]);
        }
      } catch {
        setShown({ result: "error", message: "No network. Check the connection and scan again." });
        navigator.vibrate?.([400]);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [eventId],
  );

  // Camera lifecycle
  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      const scanner = new Html5Qrcode("qr-reader", { verbose: false });
      scannerRef.current = scanner;
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 12, qrbox: (w, h) => ({ width: Math.min(w, h) * 0.75, height: Math.min(w, h) * 0.75 }) },
          (text) => {
            const now = Date.now();
            // Same QR held in front of the camera fires repeatedly: ignore repeats within the cooldown.
            if (text === lastRef.current.token && now - lastRef.current.at < COOLDOWN_MS) return;
            lastRef.current = { token: text, at: now };
            submit({ token: text });
          },
          () => {},
        );
        setCameraError(null);
      } catch (e) {
        setCameraError(e instanceof Error ? e.message : "Camera unavailable. Allow camera access, or type codes below.");
      }
    })();
    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s?.isScanning) s.stop().then(() => s.clear()).catch(() => {});
    };
  }, [eventId, submit]);

  const tone =
    !shown ? "idle" : shown.result === "valid" ? "ok" : shown.result === "already_used" ? "warn" : "bad";

  return (
    <div className="space-y-4">
      <select
        value={eventId}
        onChange={(e) => {
          setEventId(e.target.value);
          setShown(null);
          try {
            localStorage.setItem("bv-scan-event", e.target.value);
          } catch {}
        }}
        className="min-h-12 w-full rounded-xl border border-line bg-night px-3 text-base"
      >
        <option value="">Select event to scan…</option>
        {events.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>

      {eventId && (
        <>
          <div className="relative overflow-hidden rounded-2xl border border-line bg-black">
            <div id="qr-reader" className="aspect-square w-full [&_video]:!h-full [&_video]:!w-full [&_video]:object-cover" />
            {busy && <div className="absolute inset-0 grid place-items-center bg-black/50 text-lg font-bold">Checking…</div>}
          </div>
          {cameraError && <p className="rounded-xl border border-saffron/40 bg-saffron/10 p-3 text-sm text-saffron">{cameraError}</p>}

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (manual.trim()) submit({ code: manual.trim() });
              setManual("");
            }}
          >
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Type code: BV-XXXX-XXXX"
              autoCapitalize="characters"
              className="min-h-12 flex-1 rounded-xl border border-line bg-night px-3 font-mono uppercase tracking-wider"
            />
            <button className="min-h-12 rounded-xl bg-cyan px-4 font-bold text-void" disabled={busy}>
              Check
            </button>
          </form>
          <p className="text-center text-xs text-mute">Checked in on this device: {count}</p>
        </>
      )}

      {/* Full-screen verdict: readable from arm's length in a crowd. Tap to dismiss. */}
      {shown && (
        <button
          type="button"
          onClick={() => setShown(null)}
          className={clsx(
            "fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 p-8 text-center",
            tone === "ok" && "bg-lime text-void",
            tone === "warn" && "bg-saffron text-void",
            tone === "bad" && "bg-danger text-white",
          )}
        >
          <Verdict shown={shown} />
          <span className="mt-8 text-sm font-semibold opacity-70">Tap to scan next</span>
        </button>
      )}
    </div>
  );
}

function Verdict({ shown }: { shown: Shown }) {
  if (shown.result === "error") {
    return (
      <>
        <p className="font-display text-5xl font-black">ERROR</p>
        <p className="text-lg">{shown.message}</p>
      </>
    );
  }
  if (shown.result === "invalid") {
    return (
      <>
        <p className="text-7xl">✕</p>
        <p className="font-display text-5xl font-black">INVALID</p>
        <p className="text-lg">Fake or damaged QR. Do not allow entry.</p>
      </>
    );
  }
  const details = (
    <div className="mt-2 space-y-1">
      <p className="font-mono text-2xl font-bold tracking-widest">{shown.code}</p>
      <p className="text-xl font-semibold">{shown.holder ?? "—"}</p>
      <p className="text-lg opacity-80">{shown.tier}</p>
    </div>
  );
  if (shown.result === "valid") {
    return (
      <>
        <p className="text-7xl">✓</p>
        <p className="font-display text-6xl font-black">VALID</p>
        {details}
      </>
    );
  }
  if (shown.result === "already_used") {
    const at = shown.checkedInAt
      ? new Date(shown.checkedInAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })
      : "";
    return (
      <>
        <p className="text-7xl">⚠</p>
        <p className="font-display text-5xl font-black">ALREADY USED</p>
        <p className="text-xl font-bold">
          at {at}
          {shown.checkedInBy ? ` by ${shown.checkedInBy}` : ""}
        </p>
        {details}
      </>
    );
  }
  return (
    <>
      <p className="text-7xl">✕</p>
      <p className="font-display text-5xl font-black">{shown.result === "cancelled" ? "CANCELLED" : "WRONG EVENT"}</p>
      {details}
    </>
  );
}

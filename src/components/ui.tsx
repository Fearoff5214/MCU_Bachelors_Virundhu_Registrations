import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-lime text-void font-bold shadow-[0_0_24px_-4px_var(--color-lime)] hover:shadow-[0_0_36px_-2px_var(--color-lime)] hover:brightness-110",
  ghost: "border border-line text-ink hover:border-cyan hover:text-cyan",
  danger: "bg-danger text-white font-semibold hover:brightness-110",
};

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm tracking-wide transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40";

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={clsx(base, variants[variant], className)} {...props} />;
}

export function ButtonLink({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={clsx(base, variants[variant], className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={clsx("glass rounded-2xl", className)} {...props} />;
}

export function Chip({ className, color = "cyan", ...props }: ComponentProps<"span"> & { color?: "cyan" | "magenta" | "lime" | "saffron" }) {
  const colors = {
    cyan: "border-cyan/40 text-cyan bg-cyan/10",
    magenta: "border-magenta/40 text-magenta bg-magenta/10",
    lime: "border-lime/40 text-lime bg-lime/10",
    saffron: "border-saffron/40 text-saffron bg-saffron/10",
  };
  return (
    <span
      className={clsx("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider", colors[color], className)}
      {...props}
    />
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={clsx(
        "min-h-11 w-full rounded-xl border border-line bg-night px-3.5 text-sm text-ink placeholder:text-mute/60 outline-none transition focus:border-cyan focus:ring-2 focus:ring-cyan/20",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={clsx("mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mute", className)} {...props} />;
}

export function PageTitle({ children, kicker }: { children: React.ReactNode; kicker?: React.ReactNode }) {
  return (
    <div className="mb-8 pt-8">
      {kicker && <p className="mb-2 text-xs font-semibold uppercase tracking-[.25em] text-cyan">{kicker}</p>}
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{children}</h1>
    </div>
  );
}

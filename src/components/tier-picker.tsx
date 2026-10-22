"use client";

import clsx from "clsx";
import { useActionState, useState } from "react";
import { startCheckout } from "@/app/checkout/actions";
import { rupees } from "@/lib/format";
import type { PublicTier, SalesState } from "@/lib/queries";
import { useCopy } from "./copy";
import { Button } from "./ui";

export function TierPicker({
  slug,
  tiers,
  state,
  signedIn,
}: {
  slug: string;
  tiers: PublicTier[];
  state: SalesState;
  signedIn: boolean;
}) {
  const t = useCopy();
  const firstAvailable = tiers.find((x) => x.available > 0);
  const [tierId, setTierId] = useState(firstAvailable?.id ?? "");
  const [qty, setQty] = useState(1);
  const [result, action, pending] = useActionState(startCheckout, {});

  const tier = tiers.find((x) => x.id === tierId);
  const maxQty = tier ? Math.min(tier.maxPerUser, tier.available, 10) : 1;
  const disabled = state !== "open" || !tier || tier.available === 0;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="tierId" value={tierId} />
      <input type="hidden" name="qty" value={qty} />

      <div className="space-y-3" role="radiogroup">
        {tiers.map((x) => {
          const soldOut = x.available === 0;
          const low = !soldOut && x.available <= Math.max(10, x.capacity * 0.05);
          const selected = x.id === tierId;
          return (
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              key={x.id}
              disabled={soldOut || state !== "open"}
              onClick={() => {
                setTierId(x.id);
                setQty(1);
              }}
              className={clsx(
                "flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left transition",
                selected ? "border-lime bg-lime/10 shadow-[0_0_24px_-10px_var(--color-lime)]" : "border-line hover:border-cyan/60",
                soldOut && "opacity-50",
              )}
            >
              <div>
                <p className="font-display font-bold">{x.name}</p>
                {x.description && <p className="mt-0.5 text-xs text-mute">{x.description}</p>}
                {soldOut ? (
                  <p className="mt-1 text-xs font-semibold text-danger">{t("soldOut")}</p>
                ) : low ? (
                  <p className="mt-1 text-xs font-semibold text-saffron">{t("fewLeft")}</p>
                ) : null}
              </div>
              <p className="shrink-0 font-display text-xl font-bold text-lime">{rupees(x.pricePaise)}</p>
            </button>
          );
        })}
      </div>

      {tier && state === "open" && (
        <div className="flex items-center justify-between rounded-xl border border-line p-3">
          <span className="text-sm text-mute">{t("qty")}</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="grid size-10 place-items-center rounded-lg border border-line text-lg disabled:opacity-30"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              aria-label="Fewer tickets"
            >
              −
            </button>
            <span className="w-6 text-center font-display text-lg font-bold">{qty}</span>
            <button
              type="button"
              className="grid size-10 place-items-center rounded-lg border border-line text-lg disabled:opacity-30"
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              disabled={qty >= maxQty}
              aria-label="More tickets"
            >
              +
            </button>
          </div>
        </div>
      )}

      {result.error && (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger" role="alert">
          {result.error === "Housefull" ? t("soldOut") : result.error}
        </p>
      )}

      {/* Sticky on mobile so the CTA is always under the thumb */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-void/90 p-4 backdrop-blur-xl md:static md:border-0 md:bg-transparent md:p-0">
        <Button type="submit" className="w-full" disabled={disabled || pending}>
          {pending
            ? "…"
            : state === "sold_out"
              ? t("soldOut")
              : state === "not_open"
                ? t("notOpen")
                : state === "closed"
                  ? t("closed")
                  : signedIn
                    ? `${t("buy")} · ${tier ? rupees(tier.pricePaise * qty) : ""}`
                    : t("signInToBuy")}
        </Button>
      </div>
    </form>
  );
}

"use client";

import clsx from "clsx";
import { useActionState, useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import {
  type ActionState,
  deleteTier,
  refundOrder,
  resendEmail,
  saveEvent,
  saveTier,
  setRole,
} from "../actions";

function slugifyClient(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function Status({ state, className }: { state: ActionState; className?: string }) {
  if (!state) return null;
  return (
    <p role="status" className={clsx("text-sm", state.error ? "text-danger" : "text-lime", className)}>
      {state.error ?? state.ok}
    </p>
  );
}

const textarea =
  "w-full rounded-xl border border-line bg-night px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-mute/60 focus:border-cyan focus:ring-2 focus:ring-cyan/20";
const select =
  "min-h-11 w-full rounded-xl border border-line bg-night px-3 text-sm text-ink outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20";

export type EventFormValues = {
  id?: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  venue: string;
  startsAt: string;
  bannerUrl: string;
  vibeTags: string;
  salesOpenAt: string;
  salesCloseAt: string;
  status: "draft" | "published" | "closed";
};

export function EventForm({ initial }: { initial?: EventFormValues }) {
  const [state, action, pending] = useActionState(saveEvent, null);
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugifyClient(e.target.value));
          }}
        />
      </div>
      <div>
        <Label htmlFor="slug">Slug (URL)</Label>
        <Input
          id="slug"
          name="slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          placeholder="auto from name"
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="tagline">Tagline</Label>
        <Input id="tagline" name="tagline" defaultValue={initial?.tagline} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="description">Description</Label>
        <textarea id="description" name="description" rows={5} className={textarea} defaultValue={initial?.description} />
      </div>
      <div>
        <Label htmlFor="venue">Venue</Label>
        <Input id="venue" name="venue" required defaultValue={initial?.venue} />
      </div>
      <div>
        <Label htmlFor="startsAt">Starts at (IST)</Label>
        <Input id="startsAt" name="startsAt" type="datetime-local" required defaultValue={initial?.startsAt} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="bannerUrl">Banner image URL</Label>
        <Input id="bannerUrl" name="bannerUrl" type="url" defaultValue={initial?.bannerUrl} placeholder="https://…" />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="vibeTags">Vibe tags (comma separated)</Label>
        <Input id="vibeTags" name="vibeTags" defaultValue={initial?.vibeTags} placeholder="college-fest, DJ-night, standup" />
      </div>
      <div>
        <Label htmlFor="salesOpenAt">Sales open (IST, optional)</Label>
        <Input id="salesOpenAt" name="salesOpenAt" type="datetime-local" defaultValue={initial?.salesOpenAt} />
      </div>
      <div>
        <Label htmlFor="salesCloseAt">Sales close (IST, optional)</Label>
        <Input id="salesCloseAt" name="salesCloseAt" type="datetime-local" defaultValue={initial?.salesCloseAt} />
      </div>
      <div>
        <Label htmlFor="status">Status</Label>
        <select id="status" name="status" className={select} defaultValue={initial?.status ?? "draft"}>
          <option value="draft">Draft (hidden)</option>
          <option value="published">Published (on sale)</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      <div className="flex items-end gap-4 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : initial?.id ? "Save event" : "Create event"}
        </Button>
        <Status state={state} />
      </div>
    </form>
  );
}

export type TierFormValues = {
  id?: string;
  name: string;
  description: string;
  price: string;
  capacity: string;
  maxPerUser: string;
  sortOrder: string;
  sold?: number;
  held?: number;
};

export function TierForm({ eventId, initial }: { eventId: string; initial?: TierFormValues }) {
  const [state, action, pending] = useActionState(saveTier, null);
  const [delState, delAction, delPending] = useActionState(deleteTier, null);
  const canDelete = initial?.id && !initial.sold && !initial.held;

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-6">
      <input type="hidden" name="eventId" value={eventId} />
      {initial?.id && <input type="hidden" name="tierId" value={initial.id} />}
      <div className="sm:col-span-2">
        <Label>Name</Label>
        <Input name="name" required defaultValue={initial?.name} placeholder="General" />
      </div>
      <div>
        <Label>Price (₹)</Label>
        <Input name="price" type="number" min={0} step="0.01" required defaultValue={initial?.price} />
      </div>
      <div>
        <Label>Capacity</Label>
        <Input name="capacity" type="number" min={Math.max(1, (initial?.sold ?? 0) + (initial?.held ?? 0))} required defaultValue={initial?.capacity} />
      </div>
      <div>
        <Label>Max / person</Label>
        <Input name="maxPerUser" type="number" min={1} max={10} required defaultValue={initial?.maxPerUser ?? "4"} />
      </div>
      <div>
        <Label>Order</Label>
        <Input name="sortOrder" type="number" min={0} defaultValue={initial?.sortOrder ?? "0"} />
      </div>
      <div className="sm:col-span-6">
        <Label>Description</Label>
        <Input name="description" defaultValue={initial?.description} placeholder="What's included" />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-6">
        <Button type="submit" disabled={pending} className="min-h-10">
          {pending ? "Saving…" : initial?.id ? "Update tier" : "Add tier"}
        </Button>
        {canDelete && (
          <Button type="submit" variant="ghost" formAction={delAction} disabled={delPending} className="min-h-10" formNoValidate>
            Delete
          </Button>
        )}
        {initial?.id && (
          <span className="text-xs text-mute">
            Sold <b className="text-ink">{initial.sold}</b> · On hold <b className="text-ink">{initial.held}</b>
          </span>
        )}
        <Status state={delState ?? state} />
      </div>
    </form>
  );
}

export function ResendButton({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(resendEmail, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      <Button type="submit" variant="ghost" disabled={pending} className="min-h-9 px-3 text-xs">
        {pending ? "Queuing…" : "Resend email"}
      </Button>
      <Status state={state} className="text-xs" />
    </form>
  );
}

/** Two-step refund: first click arms the button, second click submits. */
export function RefundButton({ orderId, amount }: { orderId: string; amount: string }) {
  const [state, action, pending] = useActionState(refundOrder, null);
  const [armed, setArmed] = useState(false);

  if (state?.ok) return <Status state={state} className="text-xs" />;

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      {armed ? (
        <>
          <Button type="submit" variant="danger" disabled={pending} className="min-h-9 px-3 text-xs">
            {pending ? "Refunding…" : `Confirm refund ${amount}`}
          </Button>
          <Button type="button" variant="ghost" className="min-h-9 px-3 text-xs" onClick={() => setArmed(false)}>
            Keep
          </Button>
        </>
      ) : (
        <Button type="button" variant="ghost" className="min-h-9 px-3 text-xs hover:border-danger hover:text-danger" onClick={() => setArmed(true)}>
          Cancel / refund
        </Button>
      )}
      <Status state={state} className="text-xs" />
    </form>
  );
}

export function PromoteForm() {
  const [state, action, pending] = useActionState(setRole, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end">
      <div>
        <Label htmlFor="email">Google email</Label>
        <Input id="email" name="email" type="email" required placeholder="volunteer@gmail.com" />
      </div>
      <div>
        <Label htmlFor="role">Role</Label>
        <select id="role" name="role" className={select} defaultValue="staff">
          <option value="staff">Staff (scanner)</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Grant access"}
      </Button>
      <Status state={state} className="sm:col-span-3" />
    </form>
  );
}

export function DemoteButton({ email, disabled }: { email: string; disabled?: boolean }) {
  const [state, action, pending] = useActionState(setRole, null);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="role" value="buyer" />
      <Button type="submit" variant="ghost" disabled={pending || disabled} className="min-h-9 px-3 text-xs" title={disabled ? "You can't demote yourself" : undefined}>
        Remove access
      </Button>
      <Status state={state} className="text-xs" />
    </form>
  );
}

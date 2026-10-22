import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

export const roleEnum = pgEnum("role", ["buyer", "staff", "admin"]);
export const eventStatusEnum = pgEnum("event_status", ["draft", "published", "closed"]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "paid",
  "failed",
  "expired",
  "refunded",
]);
export const ticketStatusEnum = pgEnum("ticket_status", ["valid", "used", "cancelled"]);
export const outboxStatusEnum = pgEnum("outbox_status", ["pending", "sent", "failed"]);
export const scanResultEnum = pgEnum("scan_result", ["valid", "already_used", "cancelled", "invalid"]);

// ---------- Auth.js tables ----------

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  phone: text("phone"),
  role: roleEnum("role").notNull().default("buyer"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ---------- Ticketing ----------

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline"),
  description: text("description").notNull().default(""),
  venue: text("venue").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  bannerUrl: text("banner_url"),
  vibeTags: text("vibe_tags").array().notNull().default(sql`'{}'::text[]`),
  salesOpenAt: timestamp("sales_open_at", { withTimezone: true }),
  salesCloseAt: timestamp("sales_close_at", { withTimezone: true }),
  status: eventStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ticketTiers = pgTable(
  "ticket_tiers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    pricePaise: integer("price_paise").notNull(),
    capacity: integer("capacity").notNull(),
    sold: integer("sold").notNull().default(0),
    held: integer("held").notNull().default(0),
    maxPerUser: integer("max_per_user").notNull().default(4),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    // The database itself refuses to oversell, even if application code has a bug.
    check("tier_inventory_ok", sql`${t.sold} >= 0 AND ${t.held} >= 0 AND ${t.sold} + ${t.held} <= ${t.capacity}`),
    index("tiers_event_idx").on(t.eventId),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    tierId: uuid("tier_id")
      .notNull()
      .references(() => ticketTiers.id),
    qty: integer("qty").notNull(),
    amountPaise: integer("amount_paise").notNull(),
    status: orderStatusEnum("status").notNull().default("pending"),
    provider: text("provider").notNull(),
    providerOrderId: text("provider_order_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("orders_provider_order_idx").on(t.provider, t.providerOrderId),
    index("orders_user_idx").on(t.userId),
    index("orders_pending_expiry_idx").on(t.status, t.expiresAt),
  ],
);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    tierId: uuid("tier_id")
      .notNull()
      .references(() => ticketTiers.id),
    status: ticketStatusEnum("status").notNull().default("valid"),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    checkedInBy: text("checked_in_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("tickets_user_idx").on(t.userId), index("tickets_event_idx").on(t.eventId, t.status)],
);

export const emailOutbox = pgTable(
  "email_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    to: text("to").notNull(),
    status: outboxStatusEnum("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("outbox_due_idx").on(t.status, t.nextAttemptAt)],
);

export const scanLog = pgTable(
  "scan_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id").references(() => tickets.id),
    staffId: text("staff_id")
      .notNull()
      .references(() => users.id),
    result: scanResultEnum("result").notNull(),
    scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("scan_log_ticket_idx").on(t.ticketId)],
);

export type Event = typeof events.$inferSelect;
export type TicketTier = typeof ticketTiers.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type User = typeof users.$inferSelect;

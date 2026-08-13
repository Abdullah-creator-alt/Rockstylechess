import { bigint, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const currencyEnum = pgEnum('currency', ['chips', 'gems']);
export const purchaseStatusEnum = pgEnum('purchase_status', ['pending', 'completed', 'refunded']);
export const cosmeticCategoryEnum = pgEnum('cosmetic_category', ['board', 'piece', 'avatar']);

// Real-money IAP ledger. `providerTransactionId` is unique specifically to
// guard against double-crediting a replayed/retried store receipt.
export const purchases = pgTable('purchases', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  packId: text('pack_id').notNull(),
  currencyGranted: currencyEnum('currency_granted').notNull(),
  amountGranted: bigint('amount_granted', { mode: 'number' }).notNull(),
  priceUsdCents: integer('price_usd_cents').notNull(),
  provider: text('provider').notNull(),
  providerTransactionId: text('provider_transaction_id').notNull().unique(),
  status: purchaseStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const vipGrants = pgTable('vip_grants', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  activeUntil: timestamp('active_until', { withTimezone: true }).notNull(),
  source: text('source').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Catalog (forge.tsx's boards/pieces/avatars) -- only ownership is tracked
// per-user below, the catalog content itself is small/static enough to seed
// once rather than model as heavily as user-generated data.
export const cosmeticItems = pgTable('cosmetic_items', {
  id: varchar('id', { length: 40 }).primaryKey(),
  category: cosmeticCategoryEnum('category').notNull(),
  name: text('name').notNull(),
  gemPrice: integer('gem_price').notNull().default(0),
  metadata: jsonb('metadata'),
});

export const userCosmetics = pgTable(
  'user_cosmetics',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    itemId: varchar('item_id', { length: 40 })
      .notNull()
      .references(() => cosmeticItems.id, { onDelete: 'cascade' }),
    unlockedAt: timestamp('unlocked_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.itemId] })],
);

// bots.tsx's roster stays a client-side constant (like cosmetics above) --
// this only tracks which locked bots a user has unlocked.
export const botUnlocks = pgTable(
  'bot_unlocks',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    botId: text('bot_id').notNull(),
    unlockedAt: timestamp('unlocked_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.botId] })],
);

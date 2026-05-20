import { pgTable, serial, integer, text, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { userProfilesTable } from "./userProfiles";

export const pushTokensTable = pgTable(
  "push_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => userProfilesTable.id, { onDelete: "cascade" })
      .notNull(),
    token: text("token").notNull(),
    platform: text("platform").notNull().default("expo"), // expo | apns | fcm
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique("unique_user_token").on(t.userId, t.token)]
);

export type PushToken = typeof pushTokensTable.$inferSelect;

import { pgTable, serial, text, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { userProfilesTable } from "./userProfiles";
import { jobsTable } from "./jobs";

export const swipeActionsTable = pgTable(
  "swipe_actions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => userProfilesTable.id)
      .notNull(),
    jobId: integer("job_id")
      .references(() => jobsTable.id)
      .notNull(),
    direction: text("direction").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [unique("unique_user_job").on(table.userId, table.jobId)]
);

export const insertSwipeActionSchema = createInsertSchema(swipeActionsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertSwipeAction = z.infer<typeof insertSwipeActionSchema>;
export type SwipeAction = typeof swipeActionsTable.$inferSelect;

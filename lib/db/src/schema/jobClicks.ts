import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { jobsTable } from "./jobs";
import { userProfilesTable } from "./userProfiles";

export const jobClicksTable = pgTable("job_clicks", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id")
    .references(() => jobsTable.id, { onDelete: "cascade" })
    .notNull(),
  userId: integer("user_id").references(() => userProfilesTable.id, { onDelete: "set null" }),
  source: text("source").notNull().default("apply_button"), // apply_button | card_tap
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type JobClick = typeof jobClicksTable.$inferSelect;

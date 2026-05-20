import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { userProfilesTable } from "./userProfiles";

export const userMetricsTable = pgTable("user_metrics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => userProfilesTable.id)
    .notNull()
    .unique(),
  swipesLeft: integer("swipes_left").default(0).notNull(),
  swipesRight: integer("swipes_right").default(0).notNull(),
  applicationsClicked: integer("applications_clicked").default(0).notNull(),
  lastActiveAt: timestamp("last_active_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const employerProfilesTable = pgTable("employer_profiles", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  companyName: text("company_name").notNull(),
  companyWebsite: text("company_website"),
  companyLogoUrl: text("company_logo_url"),
  description: text("description"),
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEmployerProfileSchema = createInsertSchema(employerProfilesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployerProfile = z.infer<typeof insertEmployerProfileSchema>;
export type EmployerProfile = typeof employerProfilesTable.$inferSelect;

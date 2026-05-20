import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  externalId: text("external_id").unique(),
  title: text("title").notNull(),
  companyId: integer("company_id").references(() => companiesTable.id),
  location: text("location"),
  remoteType: text("remote_type").notNull().default("onsite"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  jobType: text("job_type").notNull().default("fulltime"),
  experienceLevel: text("experience_level").notNull().default("mid"),
  tags: text("tags").array().notNull().default([]),
  shortDescription: text("short_description").notNull(),
  fullDescription: text("full_description").notNull(),
  applyUrl: text("apply_url").notNull(),
  source: text("source").notNull().default("manual"),
  isActive: boolean("is_active").notNull().default(true),
  // Employer posting fields
  postedByEmployerId: integer("posted_by_employer_id"),
  isPaidListing: boolean("is_paid_listing").notNull().default(false),
  stripePaymentId: text("stripe_payment_id"),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;

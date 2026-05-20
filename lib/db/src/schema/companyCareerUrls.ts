import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const companyCareerUrlsTable = pgTable("company_career_urls", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  careerUrl: text("career_url").notNull().unique(),
  atsType: text("ats_type").notNull().default("greenhouse"), // greenhouse | lever | workable | generic
  lastImportedAt: timestamp("last_imported_at"),
  lastImportCount: text("last_import_count").default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCompanyCareerUrlSchema = createInsertSchema(companyCareerUrlsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertCompanyCareerUrl = z.infer<typeof insertCompanyCareerUrlSchema>;
export type CompanyCareerUrl = typeof companyCareerUrlsTable.$inferSelect;

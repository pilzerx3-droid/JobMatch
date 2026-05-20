import { pgTable, serial, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userProfilesTable = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  name: text("name"),
  email: text("email").notNull(),
  role: text("role").notNull().default("job_seeker"), // job_seeker | employer | admin
  experienceLevel: text("experience_level"),
  preferredLocation: text("preferred_location"),
  remotePreference: text("remote_preference"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  jobCategories: text("job_categories").array().notNull().default([]),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  // Professional profile fields
  headline: text("headline"),
  bio: text("bio"),
  yearsExperience: integer("years_experience"),
  skills: text("skills").array().notNull().default([]),
  linkedinUrl: text("linkedin_url"),
  githubUrl: text("github_url"),
  portfolioUrl: text("portfolio_url"),
  resumeUrl: text("resume_url"),
  education: jsonb("education").$type<Array<{
    school: string;
    degree: string;
    field: string;
    startYear: number;
    endYear?: number;
  }>>().notNull().default([]),
  workExperience: jsonb("work_experience").$type<Array<{
    company: string;
    title: string;
    startDate: string;
    endDate?: string;
    description?: string;
  }>>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserProfileSchema = createInsertSchema(userProfilesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfilesTable.$inferSelect;

import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { userProfilesTable } from "./userProfiles";

export const userDocumentsTable = pgTable("user_documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => userProfilesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull().default("other"),
  objectPath: text("object_path").notNull(),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  extractedText: text("extracted_text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UserDocument = typeof userDocumentsTable.$inferSelect;

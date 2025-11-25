import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // References auth.users
  email: text("email").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"), // Profile avatar URL
  role: text("role").notNull().default("trainee"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  displayName: true,
  role: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  taskName: text("task_name").notNull(),
  toolType: text("tool_type").notNull(),
  difficulty: text("difficulty").notNull(),
  notes: text("notes"),
  videoUrl: text("video_url"), // Deprecated - use videoPath instead
  videoPath: text("video_path"), // Storage path in Supabase Storage
  videoSize: integer("video_size"), // File size in bytes
  videoMimeType: text("video_mime_type"), // MIME type
  videoDuration: integer("video_duration"), // Duration in seconds
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("submissions_user_id_idx").on(table.userId),
  index("submissions_status_idx").on(table.status),
  index("submissions_created_at_idx").on(table.createdAt),
]);

export const insertSubmissionSchema = createInsertSchema(submissions).pick({
  userId: true,
  taskName: true,
  toolType: true,
  difficulty: true,
  notes: true,
  videoUrl: true,
  videoPath: true,
  videoSize: true,
  videoMimeType: true,
  videoDuration: true,
}).extend({
  videoPath: z.string().nullable().optional(),
  videoSize: z.number().nullable().optional(),
  videoMimeType: z.string().nullable().optional(),
  videoDuration: z.number().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissions.$inferSelect;

export const aiEvaluations = pgTable("ai_evaluations", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id").notNull().references(() => submissions.id),
  accuracy: integer("accuracy").notNull(),
  stability: integer("stability").notNull(),
  completionTime: text("completion_time").notNull(),
  toolUsage: integer("tool_usage").notNull(),
  overallScore: integer("overall_score").notNull(),
  feedback: text("feedback"),
  analysisPoints: text("analysis_points").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("ai_evaluations_submission_id_idx").on(table.submissionId),
]);

export const insertAIEvaluationSchema = createInsertSchema(aiEvaluations).pick({
  submissionId: true,
  accuracy: true,
  stability: true,
  completionTime: true,
  toolUsage: true,
  overallScore: true,
  feedback: true,
  analysisPoints: true,
});

export type InsertAIEvaluation = z.infer<typeof insertAIEvaluationSchema>;
export type AIEvaluation = typeof aiEvaluations.$inferSelect;

export const trainerFeedback = pgTable("trainer_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id").notNull().references(() => submissions.id),
  trainerId: uuid("trainer_id").notNull().references(() => users.id),
  overallAssessment: text("overall_assessment").notNull(),
  trainerScore: integer("trainer_score"),
  nextSteps: text("next_steps").array(),
  attachmentPaths: text("attachment_paths").array(), // Storage paths for attachments
  attachmentNames: text("attachment_names").array(), // Original filenames
  approved: boolean("approved").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("trainer_feedback_submission_id_idx").on(table.submissionId),
  index("trainer_feedback_trainer_id_idx").on(table.trainerId),
]);

export const insertTrainerFeedbackSchema = createInsertSchema(trainerFeedback).pick({
  submissionId: true,
  trainerId: true,
  overallAssessment: true,
  trainerScore: true,
  nextSteps: true,
  approved: true,
});

export type InsertTrainerFeedback = z.infer<typeof insertTrainerFeedbackSchema>;
export type TrainerFeedback = typeof trainerFeedback.$inferSelect;

export const waitlistEntries = pgTable("waitlist_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  organization: text("organization"),
  roleFocus: text("role_focus"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWaitlistEntrySchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  organization: z
    .string()
    .trim()
    .max(120, "Organization name is too long")
    .optional(),
  roleFocus: z
    .string()
    .trim()
    .max(120, "Role focus is too long")
    .optional(),
});

export type InsertWaitlistEntry = z.infer<typeof insertWaitlistEntrySchema>;
export type WaitlistEntry = typeof waitlistEntries.$inferSelect;

import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("trainee"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const submissions = pgTable("submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  taskName: text("task_name").notNull(),
  toolType: text("tool_type").notNull(),
  difficulty: text("difficulty").notNull(),
  notes: text("notes"),
  videoUrl: text("video_url"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSubmissionSchema = createInsertSchema(submissions).pick({
  userId: true,
  taskName: true,
  toolType: true,
  difficulty: true,
  notes: true,
  videoUrl: true,
});

export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissions.$inferSelect;

export const aiEvaluations = pgTable("ai_evaluations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id").notNull().references(() => submissions.id),
  accuracy: integer("accuracy").notNull(),
  stability: integer("stability").notNull(),
  completionTime: text("completion_time").notNull(),
  toolUsage: integer("tool_usage").notNull(),
  overallScore: integer("overall_score").notNull(),
  feedback: text("feedback"),
  analysisPoints: text("analysis_points").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id").notNull().references(() => submissions.id),
  trainerId: varchar("trainer_id").notNull().references(() => users.id),
  overallAssessment: text("overall_assessment").notNull(),
  trainerScore: integer("trainer_score"),
  nextSteps: text("next_steps").array(),
  approved: boolean("approved").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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

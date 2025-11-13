import {
  type User,
  type InsertUser,
  type Submission,
  type InsertSubmission,
  type AIEvaluation,
  type InsertAIEvaluation,
  type TrainerFeedback,
  type InsertTrainerFeedback,
  type WaitlistEntry,
  type InsertWaitlistEntry,
  users,
  submissions,
  aiEvaluations,
  trainerFeedback,
  waitlistEntries,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Submission methods
  getSubmission(id: string): Promise<Submission | undefined>;
  getSubmissionsByUser(userId: string): Promise<Submission[]>;
  getAllSubmissions(): Promise<Submission[]>;
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  updateSubmissionStatus(id: string, status: string): Promise<void>;

  // AI Evaluation methods
  getAIEvaluation(submissionId: string): Promise<AIEvaluation | undefined>;
  createAIEvaluation(evaluation: InsertAIEvaluation): Promise<AIEvaluation>;

  // Trainer Feedback methods
  getTrainerFeedback(submissionId: string): Promise<TrainerFeedback | undefined>;
  createTrainerFeedback(feedback: InsertTrainerFeedback): Promise<TrainerFeedback>;

  // Waitlist methods
  createWaitlistEntry(entry: InsertWaitlistEntry): Promise<WaitlistEntry | null>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Submission methods
  async getSubmission(id: string): Promise<Submission | undefined> {
    const result = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
    return result[0];
  }

  async getSubmissionsByUser(userId: string): Promise<Submission[]> {
    return db
      .select()
      .from(submissions)
      .where(eq(submissions.userId, userId))
      .orderBy(desc(submissions.createdAt));
  }

  async getAllSubmissions(): Promise<Submission[]> {
    return db.select().from(submissions).orderBy(desc(submissions.createdAt));
  }

  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    const result = await db.insert(submissions).values(insertSubmission).returning();
    return result[0];
  }

  async updateSubmissionStatus(id: string, status: string): Promise<void> {
    await db.update(submissions).set({ status }).where(eq(submissions.id, id));
  }

  // AI Evaluation methods
  async getAIEvaluation(submissionId: string): Promise<AIEvaluation | undefined> {
    const result = await db
      .select()
      .from(aiEvaluations)
      .where(eq(aiEvaluations.submissionId, submissionId))
      .limit(1);
    return result[0];
  }

  async createAIEvaluation(insertEvaluation: InsertAIEvaluation): Promise<AIEvaluation> {
    const result = await db.insert(aiEvaluations).values(insertEvaluation).returning();
    return result[0];
  }

  // Trainer Feedback methods
  async getTrainerFeedback(submissionId: string): Promise<TrainerFeedback | undefined> {
    const result = await db
      .select()
      .from(trainerFeedback)
      .where(eq(trainerFeedback.submissionId, submissionId))
      .limit(1);
    return result[0];
  }

  async createTrainerFeedback(insertFeedback: InsertTrainerFeedback): Promise<TrainerFeedback> {
    const result = await db.insert(trainerFeedback).values(insertFeedback).returning();
    return result[0];
  }

  // Waitlist methods
  async createWaitlistEntry(entry: InsertWaitlistEntry): Promise<WaitlistEntry | null> {
    const result = await db
      .insert(waitlistEntries)
      .values(entry)
      .onConflictDoNothing({ target: waitlistEntries.email })
      .returning();
    return result[0] ?? null;
  }
}

export const storage = new DatabaseStorage();

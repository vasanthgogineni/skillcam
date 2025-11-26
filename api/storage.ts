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
import { db } from "../server/db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserRole(id: string, role: string): Promise<void>;

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
  // User methods - only use our custom users table (Stack Auth handles sync separately)
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    console.log("Storage.createUser: Input data:", JSON.stringify(insertUser));
    
    // Check if user exists first
    const existingUser = await this.getUser(insertUser.id);
    
    if (existingUser) {
      console.log("Storage.createUser: User already exists, updating instead");
      // User exists, update all fields including role
      const updated = await db.update(users)
        .set({
          email: insertUser.email,
          displayName: insertUser.displayName,
          role: insertUser.role, // Explicitly set the role
        })
        .where(eq(users.id, insertUser.id))
        .returning();
      
      console.log("Storage.createUser: Updated user:", JSON.stringify(updated[0]));
      return updated[0];
    } else {
      console.log("Storage.createUser: Creating new user");
      // User doesn't exist, insert with explicit role
      const inserted = await db.insert(users)
        .values({
          id: insertUser.id,
          email: insertUser.email,
          displayName: insertUser.displayName,
          role: insertUser.role, // Explicitly set the role
        })
        .returning();
      
      console.log("Storage.createUser: Inserted user:", JSON.stringify(inserted[0]));
      return inserted[0];
    }
  }

  async updateUserRole(id: string, role: string): Promise<void> {
    console.log("Storage.updateUserRole: Updating user", id, "to role:", role);
    await db.update(users).set({ role }).where(eq(users.id, id));
    console.log("Storage.updateUserRole: Update complete");
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
    console.log("Storage.createSubmission: Input data:", JSON.stringify(insertSubmission, null, 2));
    const result = await db.insert(submissions).values(insertSubmission).returning();
    console.log("Storage.createSubmission: Created submission:", JSON.stringify(result[0], null, 2));
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

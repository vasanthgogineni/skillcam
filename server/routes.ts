import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import {
  insertAIEvaluationSchema,
  insertWaitlistEntrySchema,
} from "@shared/schema";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://yrdmimdkhsdzqjjdajvv.supabase.co";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZG1pbWRraHNkenFqamRhanZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MzgxMjksImV4cCI6MjA3OTUxNDEyOX0.gKCFOG9qMkBKal0RwUZohP8jsdSqWioDU2zx8Jw_JC4";
const supabase = createClient(supabaseUrl, supabaseKey);

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No authorization header" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    let dbUser = await storage.getUser(user.id);

    if (!dbUser) {
      // Fallback creation if trigger didn't fire or race condition
      console.log("User not found in DB, creating...", user.id);
      dbUser = await storage.createUser({
        id: user.id,
        email: user.email!,
        role: (user.user_metadata?.role as "trainee" | "trainer") || "trainee",
        displayName: user.user_metadata?.display_name,
      });
    }

    (req as any).user = {
      userId: dbUser.id,
      role: dbUser.role,
      username: dbUser.email
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || user.role !== role) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

export function registerRoutes(app: Express) {
  const waitlistInputSchema = insertWaitlistEntrySchema;

  app.post("/api/waitlist", async (req: Request, res: Response) => {
    try {
      const waitlistInput = waitlistInputSchema.parse(req.body);
      const organization = waitlistInput.organization?.trim();
      const roleFocus = waitlistInput.roleFocus?.trim();

      const payload = {
        email: waitlistInput.email.trim(),
        organization: organization ? organization : undefined,
        roleFocus: roleFocus ? roleFocus : undefined,
      };

      const entry = await storage.createWaitlistEntry(payload);

      if (entry) {
        return res.status(201).json({ success: true });
      }

      res.status(200).json({
        success: true,
        alreadyJoined: true,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message ?? "Unable to join waitlist" });
    }
  });

  app.get("/api/users/me", requireAuth, async (req: Request, res: Response) => {
    try {
      const authUser = (req as any).user;
      const user = await storage.getUser(authUser.userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/users/me", requireAuth, async (req: Request, res: Response) => {
    try {
      const authUser = (req as any).user;
      const { role } = req.body;

      if (role && !["trainee", "trainer"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      if (role && role !== authUser.role) {
        await storage.updateUserRole(authUser.userId, role);
      }

      const user = await storage.getUser(authUser.userId);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Removed /api/users/sync as it's no longer needed with Supabase Auth triggers/middleware fallback

  app.get("/api/submissions", requireAuth, async (req: Request, res: Response) => {
    try {
      const authUser = (req as any).user;
      if (authUser.role === "trainee") {
        const submissions = await storage.getSubmissionsByUser(authUser.userId);
        res.json(submissions);
      } else {
        const submissions = await storage.getAllSubmissions();
        res.json(submissions);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/submissions/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const authUser = (req as any).user;
      const submission = await storage.getSubmission(req.params.id);
      
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      if (authUser.role === "trainee" && submission.userId !== authUser.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      res.json(submission);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/submissions", requireAuth, async (req: Request, res: Response) => {
    try {
      const authUser = (req as any).user;
      const { taskName, toolType, difficulty, notes, videoUrl } = req.body;
      
      const submission = await storage.createSubmission({
        userId: authUser.userId,
        taskName,
        toolType,
        difficulty,
        notes: notes || "",
        videoUrl: videoUrl || "",
      });
      
      res.json(submission);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/submissions/:id/status", requireAuth, requireRole("trainer"), async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      await storage.updateSubmissionStatus(req.params.id, status);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/evaluations/:submissionId", requireAuth, async (req: Request, res: Response) => {
    try {
      const evaluation = await storage.getAIEvaluation(req.params.submissionId);
      
      if (!evaluation) {
        return res.status(404).json({ error: "Evaluation not found" });
      }

      res.json(evaluation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/evaluations", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = insertAIEvaluationSchema.parse(req.body);
      const evaluation = await storage.createAIEvaluation(data);
      await storage.updateSubmissionStatus(data.submissionId, "ai-evaluated");
      res.json(evaluation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/feedback/:submissionId", requireAuth, async (req: Request, res: Response) => {
    try {
      const feedback = await storage.getTrainerFeedback(req.params.submissionId);
      
      if (!feedback) {
        return res.status(404).json({ error: "Feedback not found" });
      }

      res.json(feedback);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/feedback", requireAuth, requireRole("trainer"), async (req: Request, res: Response) => {
    try {
      const authUser = (req as any).user;
      const { submissionId, overallAssessment, trainerScore, nextSteps, approved } = req.body;
      
      const feedback = await storage.createTrainerFeedback({
        submissionId,
        trainerId: authUser.userId,
        overallAssessment,
        trainerScore,
        nextSteps,
        approved,
      });
      
      await storage.updateSubmissionStatus(
        submissionId,
        approved ? "approved" : "trainer-reviewed"
      );
      
      res.json(feedback);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/submissions/:id/details", requireAuth, async (req: Request, res: Response) => {
    try {
      const authUser = (req as any).user;
      const submission = await storage.getSubmission(req.params.id);
      
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      if (authUser.role === "trainee" && submission.userId !== authUser.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const aiEvaluation = await storage.getAIEvaluation(req.params.id);
      const trainerFeedbackData = await storage.getTrainerFeedback(req.params.id);

      res.json({
        submission,
        aiEvaluation,
        trainerFeedback: trainerFeedbackData,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}

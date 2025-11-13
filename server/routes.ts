import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertSubmissionSchema,
  insertAIEvaluationSchema,
  insertTrainerFeedbackSchema,
  insertWaitlistEntrySchema,
} from "@shared/schema";
import bcrypt from "bcrypt";

// Authentication middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

// Role check middleware
function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.session.role !== role) {
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

      // Trim inputs
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

  // Auth routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, password, role: requestedRole } = req.body;
      
      // Allow users to register as trainee or trainer
      const role = requestedRole === "trainer" ? "trainer" : "trainee";
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        role,
      });

      // Set session
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;

      // Don't send password back
      const { password: _, createdAt, ...userResponse } = user;
      res.json(userResponse);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Set session
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;

      const { password: _, createdAt, ...userResponse } = user;
      res.json(userResponse);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: "User not found" });
      }
      const { password: _, createdAt, ...userResponse } = user;
      res.json(userResponse);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Submission routes
  app.get("/api/submissions", requireAuth, async (req: Request, res: Response) => {
    try {
      // Trainees can only see their own submissions
      // Trainers can see all submissions
      if (req.session.role === "trainee") {
        const submissions = await storage.getSubmissionsByUser(req.session.userId!);
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
      const submission = await storage.getSubmission(req.params.id);
      
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Check ownership for trainees
      if (req.session.role === "trainee" && submission.userId !== req.session.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      res.json(submission);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/submissions", requireAuth, async (req: Request, res: Response) => {
    try {
      // Use the authenticated user's ID instead of accepting it from the request
      const { taskName, toolType, difficulty, notes, videoUrl } = req.body;
      
      const submission = await storage.createSubmission({
        userId: req.session.userId!,
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

  // AI Evaluation routes
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
      
      // Update submission status
      await storage.updateSubmissionStatus(data.submissionId, "ai-evaluated");
      
      res.json(evaluation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Trainer Feedback routes
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
      const { submissionId, overallAssessment, trainerScore, nextSteps, approved } = req.body;
      
      const feedback = await storage.createTrainerFeedback({
        submissionId,
        trainerId: req.session.userId!,
        overallAssessment,
        trainerScore,
        nextSteps,
        approved,
      });
      
      // Update submission status
      await storage.updateSubmissionStatus(
        submissionId,
        approved ? "approved" : "trainer-reviewed"
      );
      
      res.json(feedback);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Combined data endpoint for submission details
  app.get("/api/submissions/:id/details", requireAuth, async (req: Request, res: Response) => {
    try {
      const submission = await storage.getSubmission(req.params.id);
      
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Check ownership for trainees
      if (req.session.role === "trainee" && submission.userId !== req.session.userId) {
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

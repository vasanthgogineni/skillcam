import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import serverless from "serverless-http";
import multer from "multer";
import { storage } from "./storage";
import {
  insertAIEvaluationSchema,
  insertWaitlistEntrySchema,
} from "@shared/schema";
import { createClient } from "@supabase/supabase-js";
import {
  uploadFile,
  getSignedUrl,
  deleteFile,
  BUCKETS,
} from "./supabaseStorage";

const app = express();

// Optional: fail fast if env vars are missing
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.warn("Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars");
}

const supabaseUrl =
  process.env.SUPABASE_URL || "https://yrdmimdkhsdzqjjdajvv.supabase.co";
const supabaseKey =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZG1pbWRraHNkenFqamRhanZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MzgxMjksImV4cCI6MjA3OTUxNDEyOX0.gKCFOG9qMkBKal0RwUZohP8jsdSqWioDU2zx8Jw_JC4";

const supabase = createClient(supabaseUrl, supabaseKey);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args: any[]) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

// ---------- Auth + helpers ----------

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No authorization header" });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    let dbUser = await storage.getUser(user.id);

    if (!dbUser) {
      console.log("User not found in DB, creating...", user.id);
      dbUser = await storage.createUser({
        id: user.id,
        email: user.email!,
        role:
          (user.user_metadata?.role as "trainee" | "trainer") || "trainee",
        displayName: user.user_metadata?.display_name,
      });
    }

    (req as any).user = {
      userId: dbUser.id,
      role: dbUser.role,
      username: dbUser.email,
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

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 250 * 1024 * 1024, // 250MB
  },
});

// ---------- ROUTES ----------

const waitlistInputSchema = insertWaitlistEntrySchema;

app.post("/api/waitlist", async (req: Request, res: Response) => {
  try {
    const waitlistInput = waitlistInputSchema.parse(req.body);
    const organization = waitlistInput.organization?.trim();
    const roleFocus = waitlistInput.roleFocus?.trim();

    const payload = {
      email: waitlistInput.email.trim(),
      organization: organization || undefined,
      roleFocus: roleFocus || undefined,
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
    res
      .status(400)
      .json({ error: error.message ?? "Unable to join waitlist" });
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

app.patch(
  "/api/users/me",
  requireAuth,
  async (req: Request, res: Response) => {
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
  }
);

app.get("/api/submissions", requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    let submissions;

    if (authUser.role === "trainee") {
      submissions = await storage.getSubmissionsByUser(authUser.userId);
    } else {
      submissions = await storage.getAllSubmissions();
    }

    const enrichedSubmissions = await Promise.all(
      submissions.map(async (submission: any) => {
        const aiEval = await storage.getAIEvaluation(submission.id);
        return {
          ...submission,
          aiScore: aiEval?.overallScore || null,
        };
      })
    );

    res.json(enrichedSubmissions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get(
  "/api/submissions/:id",
  requireAuth,
  async (req: Request, res: Response) => {
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
  }
);

app.post("/api/submissions", requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const {
      taskName,
      toolType,
      difficulty,
      notes,
      videoUrl,
      videoPath,
      videoSize,
      videoMimeType,
      videoDuration,
    } = req.body;

    const normalizedVideoPath =
      videoPath && videoPath.trim() ? videoPath.trim() : null;

    const submissionData = {
      userId: authUser.userId,
      taskName,
      toolType,
      difficulty,
      notes: notes || "",
      videoUrl: videoUrl || "",
      videoPath: normalizedVideoPath,
      videoSize: videoSize ? parseInt(String(videoSize)) : null,
      videoMimeType: videoMimeType || null,
      videoDuration: videoDuration ? parseInt(String(videoDuration)) : null,
    };

    const submission = await storage.createSubmission(submissionData);

    res.json(submission);
  } catch (error: any) {
    console.error("Error creating submission:", error);
    res.status(400).json({ error: error.message });
  }
});

app.patch(
  "/api/submissions/:id/status",
  requireAuth,
  requireRole("trainer"),
  async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      await storage.updateSubmissionStatus(req.params.id, status);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

app.get(
  "/api/evaluations/:submissionId",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const evaluation = await storage.getAIEvaluation(
        req.params.submissionId
      );

      if (!evaluation) {
        return res.status(404).json({ error: "Evaluation not found" });
      }

      res.json(evaluation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

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

app.get(
  "/api/feedback/:submissionId",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const feedback = await storage.getTrainerFeedback(
        req.params.submissionId
      );

      if (!feedback) {
        return res.status(404).json({ error: "Feedback not found" });
      }

      res.json(feedback);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.post(
  "/api/feedback",
  requireAuth,
  requireRole("trainer"),
  async (req: Request, res: Response) => {
    try {
      const authUser = (req as any).user;
      const {
        submissionId,
        overallAssessment,
        trainerScore,
        nextSteps,
        approved,
      } = req.body;

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
  }
);

app.get(
  "/api/submissions/:id/details",
  requireAuth,
  async (req: Request, res: Response) => {
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
      const trainerFeedbackData = await storage.getTrainerFeedback(
        req.params.id
      );

      res.json({
        submission,
        aiEvaluation,
        trainerFeedback: trainerFeedbackData,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Upload submission video
app.post(
  "/api/uploads/submission-video",
  requireAuth,
  upload.single("video"),
  async (req: Request, res: Response) => {
    try {
      const authUser = (req as any).user;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      if (!file.mimetype.startsWith("video/")) {
        return res
          .status(400)
          .json({ error: "Only video files are allowed" });
      }

      const uploadResult = await uploadFile(
        BUCKETS.SUBMISSION_VIDEOS,
        file.buffer,
        file.originalname,
        authUser.userId,
        false,
        file.mimetype
      );

      if (uploadResult.error) {
        return res.status(500).json({ error: uploadResult.error });
      }

      res.json({
        path: uploadResult.path,
        size: file.size,
        mimeType: file.mimetype,
        originalName: file.originalname,
      });
    } catch (error: any) {
      console.error("Video upload error:", error);
      res.status(500).json({ error: error.message || "Upload failed" });
    }
  }
);

// Get signed URL
app.get(
  "/api/uploads/signed-url",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { bucket, path } = req.query;

      if (!bucket || !path) {
        return res
          .status(400)
          .json({ error: "Missing bucket or path parameter" });
      }

      const authUser = (req as any).user;
      const decodedPath = decodeURIComponent(path as string);
      const pathParts = decodedPath.split("/");
      const fileUserId = pathParts[0];

      if (authUser.role !== "trainer" && fileUserId !== authUser.userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const result = await getSignedUrl(
        bucket as string,
        decodedPath,
        3600
      );

      if (result.error || !result.url) {
        return res
          .status(500)
          .json({ error: result.error || "Failed to generate signed URL" });
      }

      res.json({ url: result.url });
    } catch (error: any) {
      console.error("Get signed URL error:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to get signed URL" });
    }
  }
);

// Upload trainer attachment
app.post(
  "/api/uploads/trainer-attachment",
  requireAuth,
  requireRole("trainer"),
  upload.single("attachment"),
  async (req: Request, res: Response) => {
    try {
      const authUser = (req as any).user;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
      ];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({
          error: "Only images (JPEG, PNG, GIF, WebP) and PDFs are allowed",
        });
      }

      const uploadResult = await uploadFile(
        BUCKETS.TRAINER_ATTACHMENTS,
        file.buffer,
        file.originalname,
        authUser.userId,
        false,
        file.mimetype
      );

      if (uploadResult.error) {
        return res.status(500).json({ error: uploadResult.error });
      }

      res.json({
        path: uploadResult.path,
        size: file.size,
        mimeType: file.mimetype,
        originalName: file.originalname,
      });
    } catch (error: any) {
      console.error("Attachment upload error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Upload profile avatar
app.post(
  "/api/uploads/profile-avatar",
  requireAuth,
  upload.single("avatar"),
  async (req: Request, res: Response) => {
    try {
      const authUser = (req as any).user;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({
          error: "Only images (JPEG, PNG, WebP) are allowed",
        });
      }

      const uploadResult = await uploadFile(
        BUCKETS.PROFILE_AVATARS,
        file.buffer,
        file.originalname,
        authUser.userId,
        true,
        file.mimetype
      );

      if (uploadResult.error) {
        return res.status(500).json({ error: uploadResult.error });
      }

      res.json({
        path: uploadResult.path,
        publicUrl: uploadResult.publicUrl,
        size: file.size,
        mimeType: file.mimetype,
      });
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete file
app.delete(
  "/api/uploads/:bucket/:path(*)",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const authUser = (req as any).user;
      const { bucket, path } = req.params;

      const pathParts = path.split("/");
      const fileUserId = pathParts[0];

      if (fileUserId !== authUser.userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const result = await deleteFile(bucket, path);

      if (result.error) {
        return res.status(500).json({ error: result.error });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete file error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Global error handler
app.use(
  (err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  }
);

// Export for Vercel
export default serverless(app);

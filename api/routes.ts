import type { Express, Request, Response, NextFunction } from "express";
import multer from "multer";
import { storage } from "../server/storage";
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
  getFileMetadata,
  supabaseAdmin,
} from "../server/supabaseStorage";

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

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 250 * 1024 * 1024, // 250MB max file size
  },
});

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
      let submissions;

      if (authUser.role === "trainee") {
        submissions = await storage.getSubmissionsByUser(authUser.userId);
      } else {
        submissions = await storage.getAllSubmissions();
      }

      // Enrich with AI evaluation scores
      const enrichedSubmissions = await Promise.all(
        submissions.map(async (submission) => {
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
      const { taskName, toolType, difficulty, notes, videoUrl, videoPath, videoSize, videoMimeType, videoDuration } = req.body;
      
      console.log("=== Creating Submission ===");
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      console.log("videoPath received:", videoPath);
      console.log("videoSize received:", videoSize);
      console.log("videoMimeType received:", videoMimeType);
      
      // Ensure videoPath is a string or null, not empty string
      const normalizedVideoPath = videoPath && videoPath.trim() ? videoPath.trim() : null;
      
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
      
      console.log("Submission data to save:", JSON.stringify(submissionData, null, 2));
      
      const submission = await storage.createSubmission(submissionData);
      
      console.log("Submission created:", JSON.stringify(submission, null, 2));
      console.log("Created submission videoPath:", submission.videoPath);
      
      res.json(submission);
    } catch (error: any) {
      console.error("Error creating submission:", error);
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

  // File Upload Endpoints

  // Get a signed upload URL for submission videos (client uploads directly to Supabase)
  app.post("/api/uploads/submission-video-url", requireAuth, async (req: Request, res: Response) => {
    try {
      const authUser = (req as any).user;
      const { fileName, mimeType } = req.body || {};

      if (!fileName) {
        return res.status(400).json({ error: "fileName is required" });
      }

      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const path = `${authUser.userId}/${timestamp}-${sanitizedFileName}`;

      const { data, error } = await supabaseAdmin.storage
        .from(BUCKETS.SUBMISSION_VIDEOS)
        .createSignedUploadUrl(path, 60 * 30); // 30 minutes

      if (error || !data?.signedUrl || !data?.token) {
        console.error("Create signed upload URL error:", error);
        return res.status(500).json({ error: error?.message || "Failed to create signed upload URL" });
      }

      res.json({
        path,
        signedUrl: data.signedUrl,
        token: data.token,
        expiresIn: data.expiresIn ?? 60 * 30,
        mimeType: mimeType || "application/octet-stream",
      });
    } catch (error: any) {
      console.error("=== Create signed upload URL error ===");
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      res.status(500).json({ error: error.message || "Failed to create signed upload URL" });
    }
  });

  // Upload submission video
  app.post("/api/uploads/submission-video", requireAuth, upload.single("video"), async (req: Request, res: Response) => {
    try {
      console.log("=== Upload Video Request ===");
      const authUser = (req as any).user;
      console.log("Auth user:", authUser);

      const file = req.file;
      console.log("File received:", file ? `${file.originalname} (${file.size} bytes, ${file.mimetype})` : "NO FILE");

      if (!file) {
        console.error("No file in request");
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Validate file type
      if (!file.mimetype.startsWith("video/")) {
        console.error("Invalid file type:", file.mimetype);
        return res.status(400).json({ error: "Only video files are allowed" });
      }

      console.log("Uploading to Supabase Storage...");
      console.log("Bucket:", BUCKETS.SUBMISSION_VIDEOS);
      console.log("User ID:", authUser.userId);

      // Upload to Supabase Storage
      const uploadResult = await uploadFile(
        BUCKETS.SUBMISSION_VIDEOS,
        file.buffer,
        file.originalname,
        authUser.userId,
        false, // Private
        file.mimetype // Pass the MIME type
      );

      console.log("Upload result:", uploadResult);

      if (uploadResult.error) {
        console.error("Supabase upload error:", uploadResult.error);
        return res.status(500).json({ error: uploadResult.error });
      }

      console.log("Upload successful!");

      // Return file metadata
      res.json({
        path: uploadResult.path,
        size: file.size,
        mimeType: file.mimetype,
        originalName: file.originalname,
      });
    } catch (error: any) {
      console.error("=== Video upload error ===");
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      res.status(500).json({ error: error.message || "Upload failed" });
    }
  });

  // Get signed URL for viewing private files
  app.get("/api/uploads/signed-url", requireAuth, async (req: Request, res: Response) => {
    try {
      const { bucket, path } = req.query;

      console.log("=== Get Signed URL Request ===");
      console.log("Bucket:", bucket);
      console.log("Path:", path);
      console.log("Path type:", typeof path);

      if (!bucket || !path) {
        console.error("Missing bucket or path parameter");
        return res.status(400).json({ error: "Missing bucket or path parameter" });
      }

      const authUser = (req as any).user;
      console.log("Auth user:", authUser);

      // Decode the path in case it's URL encoded
      const decodedPath = decodeURIComponent(path as string);
      console.log("Decoded path:", decodedPath);

      // Verify user has access to this file
      const pathParts = decodedPath.split("/");
      const fileUserId = pathParts[0];
      console.log("File user ID:", fileUserId);
      console.log("Auth user ID:", authUser.userId);
      console.log("User role:", authUser.role);

      if (authUser.role !== "trainer" && fileUserId !== authUser.userId) {
        console.error("Access denied - user doesn't own file and isn't trainer");
        return res.status(403).json({ error: "Access denied" });
      }

      console.log("Calling getSignedUrl with:", { bucket, path: decodedPath });
      const result = await getSignedUrl(bucket as string, decodedPath, 3600);

      console.log("getSignedUrl result:", result);

      if (result.error) {
        console.error("getSignedUrl error:", result.error);
        return res.status(500).json({ error: result.error });
      }

      if (!result.url) {
        console.error("No URL returned from getSignedUrl");
        return res.status(500).json({ error: "Failed to generate signed URL" });
      }

      console.log("Signed URL generated successfully");
      res.json({ url: result.url });
    } catch (error: any) {
      console.error("=== Get signed URL exception ===");
      console.error("Error:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      res.status(500).json({ error: error.message || "Failed to get signed URL" });
    }
  });

  // Upload trainer attachment (images/PDFs for feedback)
  app.post("/api/uploads/trainer-attachment", requireAuth, requireRole("trainer"), upload.single("attachment"), async (req: Request, res: Response) => {
    try {
      const authUser = (req as any).user;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Validate file type
      const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
      ];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({
          error: "Only images (JPEG, PNG, GIF, WebP) and PDFs are allowed"
        });
      }

      // Upload to Supabase Storage
      const uploadResult = await uploadFile(
        BUCKETS.TRAINER_ATTACHMENTS,
        file.buffer,
        file.originalname,
        authUser.userId,
        false, // Private
        file.mimetype // Pass the MIME type
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
  });

  // Upload profile avatar
  app.post("/api/uploads/profile-avatar", requireAuth, upload.single("avatar"), async (req: Request, res: Response) => {
    try {
      const authUser = (req as any).user;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Validate file type
      const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
      ];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({
          error: "Only images (JPEG, PNG, WebP) are allowed"
        });
      }

      // Upload to Supabase Storage (public bucket)
      const uploadResult = await uploadFile(
        BUCKETS.PROFILE_AVATARS,
        file.buffer,
        file.originalname,
        authUser.userId,
        true, // Public
        file.mimetype // Pass the MIME type
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
  });

  // Delete a file
  app.delete("/api/uploads/:bucket/:path(*)", requireAuth, async (req: Request, res: Response) => {
    try {
      const authUser = (req as any).user;
      const { bucket, path } = req.params;

      // Verify user owns this file
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
  });
}

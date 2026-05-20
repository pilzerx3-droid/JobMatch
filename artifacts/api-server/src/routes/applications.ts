import { Router } from "express";
import { db } from "@workspace/db";
import { applicationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;
    const apps = await db
      .select()
      .from(applicationsTable)
      .where(eq(applicationsTable.clerkId, userProfile.clerkId))
      .orderBy(desc(applicationsTable.createdAt));
    res.json({ applications: apps, total: apps.length });
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;
    const { jobId, coverLetter, notes } = req.body;

    if (!jobId) {
      res.status(400).json({ error: "jobId is required" });
      return;
    }

    // Check for existing application to avoid duplicates
    const existing = await db
      .select({ id: applicationsTable.id })
      .from(applicationsTable)
      .where(
        and(
          eq(applicationsTable.clerkId, userProfile.clerkId),
          eq(applicationsTable.jobId, Number(jobId))
        )
      )
      .limit(1);

    if (existing.length > 0) {
      res.status(200).json({ id: existing[0].id, message: "Already applied" });
      return;
    }

    const [app] = await db
      .insert(applicationsTable)
      .values({
        clerkId: userProfile.clerkId,
        jobId: Number(jobId),
        status: "submitted",
        coverLetter: coverLetter ?? null,
        notes: notes ?? null,
      })
      .returning();

    res.status(201).json(app);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;
    const id = Number(req.params.id);

    const [existing] = await db
      .select({ id: applicationsTable.id })
      .from(applicationsTable)
      .where(
        and(
          eq(applicationsTable.id, id),
          eq(applicationsTable.clerkId, userProfile.clerkId)
        )
      )
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Application not found" });
      return;
    }

    await db.delete(applicationsTable).where(eq(applicationsTable.id, id));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;

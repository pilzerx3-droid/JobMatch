import { Router } from "express";
import { db } from "@workspace/db";
import {
  jobsTable,
  companiesTable,
  swipeActionsTable,
  userProfilesTable,
} from "@workspace/db";
import { eq, and, notInArray, desc, count, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();

type UserProfile = typeof userProfilesTable.$inferSelect;
type JobRow = typeof jobsTable.$inferSelect;
type CompanyRow = typeof companiesTable.$inferSelect;

function calculateMatchScore(job: JobRow, user: UserProfile): number {
  let score = 0;

  if (user.experienceLevel) {
    if (job.experienceLevel === user.experienceLevel || job.experienceLevel === "any") {
      score += 34;
    }
  } else {
    score += 17;
  }

  if (user.remotePreference) {
    if (
      user.remotePreference === "any" ||
      job.remoteType === user.remotePreference
    ) {
      score += 33;
    }
  } else {
    score += 17;
  }

  if (!user.preferredLocation || job.remoteType === "remote") {
    score += 33;
  } else if (
    job.location &&
    job.location.toLowerCase().includes(user.preferredLocation.toLowerCase())
  ) {
    score += 33;
  }

  return Math.min(100, score);
}

function formatJob(
  job: JobRow,
  company: CompanyRow | null,
  user: UserProfile,
  isSaved = false
) {
  return {
    id: job.id,
    title: job.title,
    company: company
      ? {
          id: company.id,
          name: company.name,
          logoUrl: company.logoUrl,
          website: company.website,
          description: company.description,
        }
      : { id: 0, name: "Unknown Company" },
    location: job.location,
    remoteType: job.remoteType,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    jobType: job.jobType,
    experienceLevel: job.experienceLevel,
    tags: job.tags ?? [],
    shortDescription: job.shortDescription,
    fullDescription: job.fullDescription,
    applyUrl: job.applyUrl,
    source: job.source,
    matchScore: calculateMatchScore(job, user),
    isSaved,
    createdAt: job.createdAt?.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;
    const { page = "1", limit = "10", experienceLevel, remoteType } = req.query as Record<string, string>;

    const swipedRows = await db
      .select({ jobId: swipeActionsTable.jobId })
      .from(swipeActionsTable)
      .where(eq(swipeActionsTable.userId, userProfile.id));

    const swipedIds = swipedRows.map((r) => r.jobId);

    const conditions = [eq(jobsTable.isActive, true)];
    if (swipedIds.length > 0) {
      conditions.push(notInArray(jobsTable.id, swipedIds) as any);
    }
    if (experienceLevel) conditions.push(eq(jobsTable.experienceLevel, experienceLevel) as any);
    if (remoteType) conditions.push(eq(jobsTable.remoteType, remoteType) as any);

    const where = and(...conditions);
    const offset = (Number(page) - 1) * Number(limit);

    const [jobs, totalRows] = await Promise.all([
      db
        .select({ job: jobsTable, company: companiesTable })
        .from(jobsTable)
        .leftJoin(companiesTable, eq(jobsTable.companyId, companiesTable.id))
        .where(where)
        .orderBy(desc(jobsTable.createdAt))
        .limit(Number(limit))
        .offset(offset),
      db.select({ count: count() }).from(jobsTable).where(where),
    ]);

    const total = Number(totalRows[0]?.count ?? 0);

    res.json({
      jobs: jobs.map(({ job, company }) => formatJob(job, company, userProfile, false)),
      total,
      hasMore: offset + jobs.length < total,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:jobId", requireAuth, async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;
    const jobId = Number(req.params.jobId);

    const [result] = await db
      .select({ job: jobsTable, company: companiesTable })
      .from(jobsTable)
      .leftJoin(companiesTable, eq(jobsTable.companyId, companiesTable.id))
      .where(eq(jobsTable.id, jobId))
      .limit(1);

    if (!result) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const saved = await db
      .select()
      .from(swipeActionsTable)
      .where(
        and(
          eq(swipeActionsTable.userId, userProfile.id),
          eq(swipeActionsTable.jobId, jobId),
          eq(swipeActionsTable.direction, "right")
        )
      )
      .limit(1);

    res.json(formatJob(result.job, result.company, userProfile, saved.length > 0));
  } catch (err) {
    next(err);
  }
});

router.post("/:jobId/swipe", requireAuth, async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;
    const jobId = Number(req.params.jobId);
    const { direction } = req.body;

    if (!["left", "right"].includes(direction)) {
      res.status(400).json({ error: "Direction must be left or right" });
      return;
    }

    const existing = await db
      .select()
      .from(swipeActionsTable)
      .where(
        and(
          eq(swipeActionsTable.userId, userProfile.id),
          eq(swipeActionsTable.jobId, jobId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(swipeActionsTable)
        .set({ direction })
        .where(eq(swipeActionsTable.id, existing[0].id));
    } else {
      await db.insert(swipeActionsTable).values({
        userId: userProfile.id,
        jobId,
        direction,
      });
    }

    res.json({ success: true, saved: direction === "right" });
  } catch (err) {
    next(err);
  }
});

export default router;

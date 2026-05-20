import { Router } from "express";
import { db } from "@workspace/db";
import {
  jobsTable,
  companiesTable,
  swipeActionsTable,
  userProfilesTable,
  jobClicksTable,
} from "@workspace/db";
import { eq, and, notInArray, desc, count, ilike, or, sql } from "drizzle-orm";
import { optionalAuth, requireAuth, type AuthRequest } from "../middlewares/requireAuth";
import { syncFromRemotive, jobsCount } from "../services/syncJobs";

const router = Router();

type UserProfile = typeof userProfilesTable.$inferSelect;
type JobRow = typeof jobsTable.$inferSelect;
type CompanyRow = typeof companiesTable.$inferSelect;

const LEVEL_ORDER = ["junior", "mid", "senior", "lead", "executive"];

function adjacentLevel(jobLevel: string, userLevel: string): boolean {
  const ji = LEVEL_ORDER.indexOf(jobLevel);
  const ui = LEVEL_ORDER.indexOf(userLevel);
  return ji >= 0 && ui >= 0 && Math.abs(ji - ui) === 1;
}

function calculateMatchScore(job: JobRow, user: UserProfile): number {
  let score = 0;

  // Experience level match (0–30 pts)
  if (user.experienceLevel) {
    if (job.experienceLevel === user.experienceLevel || job.experienceLevel === "any") {
      score += 30;
    } else if (adjacentLevel(job.experienceLevel, user.experienceLevel)) {
      score += 15;
    }
  } else {
    score += 15;
  }

  // Remote preference match (0–25 pts)
  if (user.remotePreference) {
    if (user.remotePreference === "any" || job.remoteType === user.remotePreference) {
      score += 25;
    }
  } else {
    score += 12;
  }

  // Location match (0–20 pts)
  if (!user.preferredLocation || job.remoteType === "remote") {
    score += 20;
  } else if (
    job.location &&
    job.location.toLowerCase().includes(user.preferredLocation.toLowerCase())
  ) {
    score += 20;
  }

  // Salary match (0–15 pts)
  if (user.salaryMin && job.salaryMax) {
    if (job.salaryMax >= user.salaryMin) {
      score += 15;
    } else if (job.salaryMax >= user.salaryMin * 0.8) {
      score += 7;
    }
  } else if (user.salaryMin && job.salaryMin) {
    if (job.salaryMin >= user.salaryMin * 0.9) {
      score += 12;
    }
  } else {
    score += 7;
  }

  // Category / tag match (0–10 pts)
  if (user.jobCategories && user.jobCategories.length > 0 && job.tags.length > 0) {
    const userCats = new Set(user.jobCategories.map((c) => c.toLowerCase()));
    const tagMatch = job.tags.some((t) => userCats.has(t.toLowerCase()));
    const titleMatch = job.tags.some(
      (t) =>
        job.title.toLowerCase().includes(t.toLowerCase()) ||
        (user.jobCategories ?? []).some((c) =>
          job.title.toLowerCase().includes(c.toLowerCase())
        )
    );
    if (tagMatch || titleMatch) score += 10;
    else score += 3;
  } else {
    score += 5;
  }

  return Math.min(100, Math.round(score));
}

function serializeJob(
  job: JobRow,
  company: CompanyRow | null,
  matchScore: number | null,
  isSaved: boolean
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
    isPaidListing: job.isPaidListing,
    viewCount: job.viewCount,
    matchScore,
    isSaved,
    createdAt: job.createdAt?.toISOString(),
    expiresAt: job.expiresAt?.toISOString() ?? null,
  };
}

let syncPromise: Promise<void> | null = null;

async function ensureJobs() {
  if ((await jobsCount()) < 30) {
    await syncFromRemotive(200, true);
  }
}

router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const userProfile = (req as AuthRequest).userProfile ?? null;

    if (!syncPromise) {
      syncPromise = ensureJobs().catch(() => {});
    }
    await syncPromise;

    const {
      page = "1",
      limit = "10",
      search,
      jobType,
      experienceLevel,
      remoteType,
      location,
      category,
    } = req.query as Record<string, string>;

    const conditions: ReturnType<typeof eq>[] = [eq(jobsTable.isActive, true)];

    if (userProfile) {
      const swipedRows = await db
        .select({ jobId: swipeActionsTable.jobId })
        .from(swipeActionsTable)
        .where(eq(swipeActionsTable.userId, userProfile.id));
      const swipedIds = swipedRows.map((r) => r.jobId);
      if (swipedIds.length > 0) {
        conditions.push(notInArray(jobsTable.id, swipedIds) as any);
      }
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(jobsTable.title, q),
          ilike(jobsTable.shortDescription, q),
          sql`${jobsTable.tags}::text ILIKE ${q}`
        ) as any
      );
    }
    if (jobType) conditions.push(eq(jobsTable.jobType, jobType) as any);
    if (experienceLevel) conditions.push(eq(jobsTable.experienceLevel, experienceLevel) as any);
    if (remoteType) conditions.push(eq(jobsTable.remoteType, remoteType) as any);
    if (location && location.trim()) {
      conditions.push(ilike(jobsTable.location, `%${location.trim()}%`) as any);
    }
    if (category && category.trim()) {
      conditions.push(
        sql`${jobsTable.tags}::text ILIKE ${`%${category.trim()}%`}` as any
      );
    }

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

    const jobsWithScores = jobs.map(({ job, company }) => ({
      job,
      company,
      score: userProfile ? calculateMatchScore(job, userProfile) : null,
    }));

    // Sort by match score descending for authenticated users
    if (userProfile) {
      jobsWithScores.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    }

    res.json({
      jobs: jobsWithScores.map(({ job, company, score }) =>
        serializeJob(job, company, score, false)
      ),
      total,
      hasMore: offset + jobs.length < total,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:jobId", optionalAuth, async (req, res, next) => {
  try {
    const userProfile = (req as AuthRequest).userProfile ?? null;
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

    let isSaved = false;
    if (userProfile) {
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
      isSaved = saved.length > 0;
    }

    res.json(
      serializeJob(
        result.job,
        result.company,
        userProfile ? calculateMatchScore(result.job, userProfile) : null,
        isSaved
      )
    );
  } catch (err) {
    next(err);
  }
});

router.post("/:jobId/click", optionalAuth, async (req, res, next) => {
  try {
    const userProfile = (req as AuthRequest).userProfile ?? null;
    const jobId = Number(req.params.jobId);
    const { source: clickSource = "apply_button" } = req.body ?? {};

    await db.insert(jobClicksTable).values({
      jobId,
      userId: userProfile?.id ?? null,
      source: clickSource,
    });

    await db
      .update(jobsTable)
      .set({ viewCount: sql`${jobsTable.viewCount} + 1` })
      .where(eq(jobsTable.id, jobId));

    res.json({ success: true });
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
        and(eq(swipeActionsTable.userId, userProfile.id), eq(swipeActionsTable.jobId, jobId))
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(swipeActionsTable)
        .set({ direction })
        .where(eq(swipeActionsTable.id, existing[0].id));
    } else {
      await db.insert(swipeActionsTable).values({ userId: userProfile.id, jobId, direction });
    }

    res.json({ success: true, saved: direction === "right" });
  } catch (err) {
    next(err);
  }
});

export default router;

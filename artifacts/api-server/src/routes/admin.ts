import { Router } from "express";
import { db } from "@workspace/db";
import {
  jobsTable,
  companiesTable,
  userProfilesTable,
  swipeActionsTable,
} from "@workspace/db";
import { eq, desc, count, gte } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/requireAuth";
import { syncFromRemotive } from "../services/syncJobs";

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get("/users", async (_req, res, next) => {
  try {
    const users = await db
      .select()
      .from(userProfilesTable)
      .orderBy(desc(userProfilesTable.createdAt));
    res.json({
      users: users.map((u) => ({
        id: u.id,
        clerkId: u.clerkId,
        name: u.name,
        email: u.email,
        experienceLevel: u.experienceLevel,
        preferredLocation: u.preferredLocation,
        remotePreference: u.remotePreference,
        salaryMin: u.salaryMin,
        salaryMax: u.salaryMax,
        jobCategories: u.jobCategories ?? [],
        onboardingCompleted: u.onboardingCompleted,
        isAdmin: u.isAdmin,
        createdAt: u.createdAt?.toISOString(),
      })),
      total: users.length,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/jobs", async (req, res, next) => {
  try {
    const { page = "1", limit = "20" } = req.query as Record<string, string>;
    const offset = (Number(page) - 1) * Number(limit);

    const [jobs, totalRows] = await Promise.all([
      db
        .select({ job: jobsTable, company: companiesTable })
        .from(jobsTable)
        .leftJoin(companiesTable, eq(jobsTable.companyId, companiesTable.id))
        .orderBy(desc(jobsTable.createdAt))
        .limit(Number(limit))
        .offset(offset),
      db.select({ count: count() }).from(jobsTable),
    ]);

    const total = Number(totalRows[0]?.count ?? 0);

    res.json({
      jobs: jobs.map(({ job, company }) => ({
        id: job.id,
        title: job.title,
        company: company
          ? { id: company.id, name: company.name, logoUrl: company.logoUrl }
          : { id: 0, name: "Unknown" },
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
        matchScore: null,
        isSaved: false,
        createdAt: job.createdAt?.toISOString(),
      })),
      total,
      hasMore: offset + jobs.length < total,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/jobs", async (req, res, next) => {
  try {
    const {
      title,
      companyId,
      companyName,
      location,
      remoteType,
      salaryMin,
      salaryMax,
      jobType,
      experienceLevel,
      tags,
      shortDescription,
      fullDescription,
      applyUrl,
    } = req.body;

    let resolvedCompanyId = companyId;
    if (!companyId && companyName) {
      const [newCompany] = await db
        .insert(companiesTable)
        .values({ name: companyName })
        .returning();
      resolvedCompanyId = newCompany.id;
    }

    const [job] = await db
      .insert(jobsTable)
      .values({
        title,
        companyId: resolvedCompanyId,
        location,
        remoteType: remoteType ?? "onsite",
        salaryMin,
        salaryMax,
        jobType: jobType ?? "fulltime",
        experienceLevel: experienceLevel ?? "any",
        tags: tags ?? [],
        shortDescription,
        fullDescription,
        applyUrl,
        source: "admin",
      })
      .returning();

    res.status(201).json(job);
  } catch (err) {
    next(err);
  }
});

router.patch("/jobs/:jobId", async (req, res, next) => {
  try {
    const jobId = Number(req.params.jobId);
    const updates = req.body;
    const [updated] = await db
      .update(jobsTable)
      .set(updates)
      .where(eq(jobsTable.id, jobId))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete("/jobs/:jobId", async (req, res, next) => {
  try {
    await db.delete(jobsTable).where(eq(jobsTable.id, Number(req.params.jobId)));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get("/analytics", async (_req, res, next) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      [totalUsersRow],
      [totalJobsRow],
      [totalSwipesRow],
      [totalSavedRow],
      [swipesLast7Row],
      [newUsersLast7Row],
    ] = await Promise.all([
      db.select({ count: count() }).from(userProfilesTable),
      db.select({ count: count() }).from(jobsTable),
      db.select({ count: count() }).from(swipeActionsTable),
      db
        .select({ count: count() })
        .from(swipeActionsTable)
        .where(eq(swipeActionsTable.direction, "right")),
      db
        .select({ count: count() })
        .from(swipeActionsTable)
        .where(gte(swipeActionsTable.createdAt, sevenDaysAgo)),
      db
        .select({ count: count() })
        .from(userProfilesTable)
        .where(gte(userProfilesTable.createdAt, sevenDaysAgo)),
    ]);

    res.json({
      totalUsers: Number(totalUsersRow?.count ?? 0),
      totalJobs: Number(totalJobsRow?.count ?? 0),
      totalSwipes: Number(totalSwipesRow?.count ?? 0),
      totalSaved: Number(totalSavedRow?.count ?? 0),
      swipesLast7Days: Number(swipesLast7Row?.count ?? 0),
      newUsersLast7Days: Number(newUsersLast7Row?.count ?? 0),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/jobs/import", async (_req, res, next) => {
  try {
    const result = await syncFromRemotive(150, true);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;

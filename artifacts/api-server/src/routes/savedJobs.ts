import { Router } from "express";
import { db } from "@workspace/db";
import { jobsTable, companiesTable, swipeActionsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;

    const rows = await db
      .select({ job: jobsTable, company: companiesTable })
      .from(swipeActionsTable)
      .innerJoin(jobsTable, eq(swipeActionsTable.jobId, jobsTable.id))
      .leftJoin(companiesTable, eq(jobsTable.companyId, companiesTable.id))
      .where(
        and(
          eq(swipeActionsTable.userId, userProfile.id),
          eq(swipeActionsTable.direction, "right")
        )
      )
      .orderBy(desc(swipeActionsTable.createdAt));

    res.json({
      savedJobs: rows.map(({ job, company }) => ({
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
        matchScore: null,
        isSaved: true,
        createdAt: job.createdAt?.toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/:jobId", requireAuth, async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;

    await db.delete(swipeActionsTable).where(
      and(
        eq(swipeActionsTable.userId, userProfile.id),
        eq(swipeActionsTable.jobId, Number(req.params.jobId))
      )
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;

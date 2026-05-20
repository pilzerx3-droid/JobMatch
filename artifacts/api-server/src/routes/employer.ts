import { Router } from "express";
import { db } from "@workspace/db";
import {
  employerProfilesTable,
  jobsTable,
  companiesTable,
  swipeActionsTable,
  jobClicksTable,
} from "@workspace/db";
import { eq, count, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();
router.use(requireAuth);

function serializeEmployerProfile(p: typeof employerProfilesTable.$inferSelect) {
  return {
    id: p.id,
    clerkId: p.clerkId,
    companyName: p.companyName,
    companyWebsite: p.companyWebsite,
    companyLogoUrl: p.companyLogoUrl,
    description: p.description,
    isVerified: p.isVerified,
    createdAt: p.createdAt.toISOString(),
  };
}

// GET /employer/me
router.get("/me", async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;
    const [profile] = await db
      .select()
      .from(employerProfilesTable)
      .where(eq(employerProfilesTable.clerkId, userProfile.clerkId))
      .limit(1);

    if (!profile) {
      res.status(404).json({ error: "No employer profile found" });
      return;
    }
    res.json(serializeEmployerProfile(profile));
  } catch (err) {
    next(err);
  }
});

// POST /employer/me — create employer profile
router.post("/me", async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;
    const { companyName, companyWebsite, companyLogoUrl, description } = req.body;

    if (!companyName?.trim()) {
      res.status(400).json({ error: "companyName is required" });
      return;
    }

    const existing = await db
      .select({ id: employerProfilesTable.id })
      .from(employerProfilesTable)
      .where(eq(employerProfilesTable.clerkId, userProfile.clerkId))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Employer profile already exists" });
      return;
    }

    const [profile] = await db
      .insert(employerProfilesTable)
      .values({
        clerkId: userProfile.clerkId,
        companyName: companyName.trim(),
        companyWebsite: companyWebsite ?? null,
        companyLogoUrl: companyLogoUrl ?? null,
        description: description ?? null,
      })
      .returning();

    // Update user role to employer
    const { userProfilesTable } = await import("@workspace/db");
    await db
      .update(userProfilesTable)
      .set({ role: "employer", onboardingCompleted: true, updatedAt: new Date() })
      .where(eq(userProfilesTable.id, userProfile.id));

    res.status(201).json(serializeEmployerProfile(profile));
  } catch (err) {
    next(err);
  }
});

// PATCH /employer/me
router.patch("/me", async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;
    const { companyName, companyWebsite, companyLogoUrl, description } = req.body;

    const [profile] = await db
      .update(employerProfilesTable)
      .set({
        ...(companyName ? { companyName: companyName.trim() } : {}),
        ...(companyWebsite !== undefined ? { companyWebsite } : {}),
        ...(companyLogoUrl !== undefined ? { companyLogoUrl } : {}),
        ...(description !== undefined ? { description } : {}),
        updatedAt: new Date(),
      })
      .where(eq(employerProfilesTable.clerkId, userProfile.clerkId))
      .returning();

    if (!profile) {
      res.status(404).json({ error: "Employer profile not found" });
      return;
    }
    res.json(serializeEmployerProfile(profile));
  } catch (err) {
    next(err);
  }
});

// GET /employer/jobs
router.get("/jobs", async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;
    const [employerProfile] = await db
      .select()
      .from(employerProfilesTable)
      .where(eq(employerProfilesTable.clerkId, userProfile.clerkId))
      .limit(1);

    if (!employerProfile) {
      res.status(404).json({ error: "Employer profile not found" });
      return;
    }

    const jobs = await db
      .select({ job: jobsTable, company: companiesTable })
      .from(jobsTable)
      .leftJoin(companiesTable, eq(jobsTable.companyId, companiesTable.id))
      .where(eq(jobsTable.postedByEmployerId, employerProfile.id));

    // Get analytics per job
    const jobsWithStats = await Promise.all(
      jobs.map(async ({ job, company }) => {
        const [saveRow] = await db
          .select({ count: count() })
          .from(swipeActionsTable)
          .where(and(eq(swipeActionsTable.jobId, job.id), eq(swipeActionsTable.direction, "right")));

        const [clickRow] = await db
          .select({ count: count() })
          .from(jobClicksTable)
          .where(eq(jobClicksTable.jobId, job.id));

        return {
          id: job.id,
          title: job.title,
          company: company ? { id: company.id, name: company.name, logoUrl: company.logoUrl } : null,
          location: job.location,
          remoteType: job.remoteType,
          jobType: job.jobType,
          experienceLevel: job.experienceLevel,
          isActive: job.isActive,
          isPaidListing: job.isPaidListing,
          viewCount: job.viewCount,
          saveCount: Number(saveRow?.count ?? 0),
          clickCount: Number(clickRow?.count ?? 0),
          createdAt: job.createdAt.toISOString(),
          expiresAt: job.expiresAt?.toISOString() ?? null,
        };
      })
    );

    res.json({ jobs: jobsWithStats, total: jobsWithStats.length });
  } catch (err) {
    next(err);
  }
});

// POST /employer/jobs — create job posting
router.post("/jobs", async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;
    const [employerProfile] = await db
      .select()
      .from(employerProfilesTable)
      .where(eq(employerProfilesTable.clerkId, userProfile.clerkId))
      .limit(1);

    if (!employerProfile) {
      res.status(403).json({ error: "Employer profile required" });
      return;
    }

    const {
      title, location, remoteType, salaryMin, salaryMax,
      jobType, experienceLevel, tags, shortDescription, fullDescription, applyUrl,
    } = req.body;

    // Find or create company from employer profile
    let [company] = await db
      .select()
      .from(companiesTable)
      .where(eq(companiesTable.name, employerProfile.companyName))
      .limit(1);

    if (!company) {
      [company] = await db
        .insert(companiesTable)
        .values({
          name: employerProfile.companyName,
          logoUrl: employerProfile.companyLogoUrl ?? null,
          website: employerProfile.companyWebsite ?? null,
          description: employerProfile.description ?? null,
        })
        .returning();
    }

    // Create job (inactive until payment)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const [job] = await db
      .insert(jobsTable)
      .values({
        title: title.trim(),
        companyId: company.id,
        location: location ?? null,
        remoteType: remoteType ?? "onsite",
        salaryMin: salaryMin ?? null,
        salaryMax: salaryMax ?? null,
        jobType: jobType ?? "fulltime",
        experienceLevel: experienceLevel ?? "mid",
        tags: tags ?? [],
        shortDescription: shortDescription.trim(),
        fullDescription: fullDescription.trim(),
        applyUrl: applyUrl.trim(),
        source: "employer",
        isActive: false, // inactive until payment confirmed
        isPaidListing: false,
        postedByEmployerId: employerProfile.id,
        expiresAt,
      })
      .returning();

    // TODO: Create Stripe checkout session here when Stripe is configured
    // For now return job with a message about payment
    res.status(201).json({
      jobId: job.id,
      checkoutUrl: null,
      message:
        "Job created. Configure Stripe to enable payment and publishing. See setup instructions.",
    });
  } catch (err) {
    next(err);
  }
});

// GET /employer/jobs/:jobId/analytics
router.get("/jobs/:jobId/analytics", async (req, res, next) => {
  try {
    const { userProfile } = req as unknown as AuthRequest;
    const jobId = Number(req.params.jobId);

    const [employerProfile] = await db
      .select()
      .from(employerProfilesTable)
      .where(eq(employerProfilesTable.clerkId, userProfile.clerkId))
      .limit(1);

    if (!employerProfile) {
      res.status(403).json({ error: "Employer profile required" });
      return;
    }

    const [jobRow] = await db
      .select()
      .from(jobsTable)
      .where(and(eq(jobsTable.id, jobId), eq(jobsTable.postedByEmployerId, employerProfile.id)))
      .limit(1);

    if (!jobRow) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const [[saveRow], [clickRow]] = await Promise.all([
      db
        .select({ count: count() })
        .from(swipeActionsTable)
        .where(and(eq(swipeActionsTable.jobId, jobId), eq(swipeActionsTable.direction, "right"))),
      db
        .select({ count: count() })
        .from(jobClicksTable)
        .where(eq(jobClicksTable.jobId, jobId)),
    ]);

    const views = jobRow.viewCount;
    const saves = Number(saveRow?.count ?? 0);
    const clicks = Number(clickRow?.count ?? 0);

    res.json({
      jobId,
      title: jobRow.title,
      views,
      saves,
      clicks,
      clickThroughRate: views > 0 ? Math.round((clicks / views) * 100 * 10) / 10 : 0,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

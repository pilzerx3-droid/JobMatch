import { Router } from "express";
import { db } from "@workspace/db";
import { userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();

function formatProfile(profile: typeof userProfilesTable.$inferSelect) {
  return {
    id: profile.id,
    clerkId: profile.clerkId,
    name: profile.name,
    email: profile.email,
    experienceLevel: profile.experienceLevel,
    preferredLocation: profile.preferredLocation,
    remotePreference: profile.remotePreference,
    salaryMin: profile.salaryMin,
    salaryMax: profile.salaryMax,
    jobCategories: profile.jobCategories ?? [],
    onboardingCompleted: profile.onboardingCompleted,
    isAdmin: profile.isAdmin,
    createdAt: profile.createdAt?.toISOString(),
  };
}

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;
    res.json(formatProfile(userProfile));
  } catch (err) {
    next(err);
  }
});

router.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;
    const {
      name,
      experienceLevel,
      preferredLocation,
      remotePreference,
      salaryMin,
      salaryMax,
      jobCategories,
    } = req.body;

    const [updated] = await db
      .update(userProfilesTable)
      .set({
        name: name ?? userProfile.name,
        experienceLevel: experienceLevel ?? userProfile.experienceLevel,
        preferredLocation: preferredLocation ?? userProfile.preferredLocation,
        remotePreference: remotePreference ?? userProfile.remotePreference,
        salaryMin: salaryMin ?? userProfile.salaryMin,
        salaryMax: salaryMax ?? userProfile.salaryMax,
        jobCategories: jobCategories ?? userProfile.jobCategories,
        updatedAt: new Date(),
      })
      .where(eq(userProfilesTable.id, userProfile.id))
      .returning();

    res.json(formatProfile(updated));
  } catch (err) {
    next(err);
  }
});

router.post("/me/complete-onboarding", requireAuth, async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;
    const {
      experienceLevel,
      preferredLocation,
      remotePreference,
      salaryMin,
      salaryMax,
      jobCategories,
    } = req.body;

    const [updated] = await db
      .update(userProfilesTable)
      .set({
        experienceLevel,
        preferredLocation,
        remotePreference,
        salaryMin,
        salaryMax,
        jobCategories: jobCategories ?? [],
        onboardingCompleted: true,
        updatedAt: new Date(),
      })
      .where(eq(userProfilesTable.id, userProfile.id))
      .returning();

    res.json(formatProfile(updated));
  } catch (err) {
    next(err);
  }
});

export default router;

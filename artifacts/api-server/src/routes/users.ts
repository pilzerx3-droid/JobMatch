import { Router } from "express";
import { db } from "@workspace/db";
import { userProfilesTable, pushTokensTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();

function formatProfile(profile: typeof userProfilesTable.$inferSelect) {
  return {
    id: profile.id,
    clerkId: profile.clerkId,
    name: profile.name,
    email: profile.email,
    role: profile.role,
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
      name, role, experienceLevel, preferredLocation,
      remotePreference, salaryMin, salaryMax, jobCategories,
    } = req.body;

    const [updated] = await db
      .update(userProfilesTable)
      .set({
        name: name ?? userProfile.name,
        ...(role ? { role } : {}),
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
      experienceLevel, preferredLocation, remotePreference,
      salaryMin, salaryMax, jobCategories,
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

router.post("/me/push-token", requireAuth, async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;
    const { token, platform = "expo" } = req.body;

    if (!token?.trim()) {
      res.status(400).json({ error: "token is required" });
      return;
    }

    // Upsert — if same user+token exists, just reactivate it
    const existing = await db
      .select({ id: pushTokensTable.id })
      .from(pushTokensTable)
      .where(
        and(
          eq(pushTokensTable.userId, userProfile.id),
          eq(pushTokensTable.token, token)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(pushTokensTable)
        .set({ isActive: true })
        .where(eq(pushTokensTable.id, existing[0].id));
    } else {
      await db.insert(pushTokensTable).values({
        userId: userProfile.id,
        token: token.trim(),
        platform,
        isActive: true,
      });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;

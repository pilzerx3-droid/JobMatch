import { Router } from "express";
import { db } from "@workspace/db";
import {
  userProfilesTable,
  pushTokensTable,
  swipeActionsTable,
  jobClicksTable,
} from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();

function computeCompleteness(profile: typeof userProfilesTable.$inferSelect): number {
  let score = 0;
  if (profile.name?.trim()) score += 5;
  if (profile.headline?.trim()) score += 15;
  if (profile.bio?.trim()) score += 10;
  if (profile.yearsExperience != null) score += 5;
  if (profile.skills && profile.skills.length > 0) score += 15;
  if (profile.workExperience && (profile.workExperience as unknown[]).length > 0) score += 15;
  if (profile.education && (profile.education as unknown[]).length > 0) score += 10;
  if (profile.linkedinUrl?.trim()) score += 5;
  if (profile.experienceLevel) score += 5;
  if (profile.remotePreference) score += 5;
  if (profile.jobCategories && profile.jobCategories.length > 0) score += 10;
  return Math.min(score, 100);
}

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
    headline: profile.headline,
    bio: profile.bio,
    yearsExperience: profile.yearsExperience,
    skills: profile.skills ?? [],
    linkedinUrl: profile.linkedinUrl,
    githubUrl: profile.githubUrl,
    portfolioUrl: profile.portfolioUrl,
    resumeUrl: profile.resumeUrl,
    education: profile.education ?? [],
    workExperience: profile.workExperience ?? [],
    profileCompleteness: computeCompleteness(profile),
  };
}

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;

    const [leftCount, rightCount, clickCount] = await Promise.all([
      db
        .select({ count: count() })
        .from(swipeActionsTable)
        .where(
          and(
            eq(swipeActionsTable.userId, userProfile.id),
            eq(swipeActionsTable.direction, "left")
          )
        ),
      db
        .select({ count: count() })
        .from(swipeActionsTable)
        .where(
          and(
            eq(swipeActionsTable.userId, userProfile.id),
            eq(swipeActionsTable.direction, "right")
          )
        ),
      db
        .select({ count: count() })
        .from(jobClicksTable)
        .where(eq(jobClicksTable.userId, userProfile.id)),
    ]);

    res.json({
      ...formatProfile(userProfile),
      swipesLeft: Number(leftCount[0]?.count ?? 0),
      swipesRight: Number(rightCount[0]?.count ?? 0),
      applicationsClicked: Number(clickCount[0]?.count ?? 0),
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;
    const {
      name,
      role,
      experienceLevel,
      preferredLocation,
      remotePreference,
      salaryMin,
      salaryMax,
      jobCategories,
      headline,
      bio,
      yearsExperience,
      skills,
      linkedinUrl,
      githubUrl,
      portfolioUrl,
      resumeUrl,
      education,
      workExperience,
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
        headline: headline !== undefined ? headline : userProfile.headline,
        bio: bio !== undefined ? bio : userProfile.bio,
        yearsExperience: yearsExperience !== undefined ? yearsExperience : userProfile.yearsExperience,
        skills: skills !== undefined ? skills : userProfile.skills,
        linkedinUrl: linkedinUrl !== undefined ? linkedinUrl : userProfile.linkedinUrl,
        githubUrl: githubUrl !== undefined ? githubUrl : userProfile.githubUrl,
        portfolioUrl: portfolioUrl !== undefined ? portfolioUrl : userProfile.portfolioUrl,
        resumeUrl: resumeUrl !== undefined ? resumeUrl : userProfile.resumeUrl,
        education: education !== undefined ? education : userProfile.education,
        workExperience: workExperience !== undefined ? workExperience : userProfile.workExperience,
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

router.post("/me/push-token", requireAuth, async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;
    const { token, platform = "expo" } = req.body;

    if (!token?.trim()) {
      res.status(400).json({ error: "token is required" });
      return;
    }

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

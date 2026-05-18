import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

export interface AuthRequest extends Request {
  userProfile: typeof userProfilesTable.$inferSelect;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuth(req as any);
    const clerkUserId = auth?.userId;

    if (!clerkUserId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    let profile = await db.query.userProfilesTable.findFirst({
      where: eq(userProfilesTable.clerkId, clerkUserId),
    });

    if (!profile) {
      const claims = auth.sessionClaims as Record<string, unknown> | null;
      const email =
        (claims?.email as string) ||
        (claims?.primary_email_address as string) ||
        "";
      const firstName = (claims?.firstName as string) || (claims?.given_name as string) || "";
      const lastName = (claims?.lastName as string) || (claims?.family_name as string) || "";
      const name = [firstName, lastName].filter(Boolean).join(" ") || null;

      [profile] = await db
        .insert(userProfilesTable)
        .values({ clerkId: clerkUserId, email, name })
        .returning();
    }

    (req as AuthRequest).userProfile = profile;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const profile = (req as AuthRequest).userProfile;
  if (!profile?.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

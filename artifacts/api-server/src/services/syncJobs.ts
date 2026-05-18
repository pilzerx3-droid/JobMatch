import { db } from "@workspace/db";
import { jobsTable, companiesTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  company_logo_url?: string;
  category: string;
  tags: string[];
  job_type: string;
  publication_date: string;
  candidate_required_location: string;
  salary?: string;
  description: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSalary(salary?: string): { min: number | null; max: number | null } {
  if (!salary) return { min: null, max: null };

  const hourlyMatch = salary.match(/\$(\d+(?:,\d+)?)\s*[-–]\s*\$(\d+(?:,\d+)?)\s*\/\s*hour/i);
  if (hourlyMatch) {
    return {
      min: parseInt(hourlyMatch[1].replace(",", "")) * 2080,
      max: parseInt(hourlyMatch[2].replace(",", "")) * 2080,
    };
  }

  const kMatch = salary.match(/\$(\d+)k\s*[-–]\s*\$(\d+)k/i);
  if (kMatch) {
    return { min: parseInt(kMatch[1]) * 1000, max: parseInt(kMatch[2]) * 1000 };
  }

  const numMatch = salary.match(/\$(\d+(?:,\d+)?)\s*[-–]\s*\$(\d+(?:,\d+)?)/);
  if (numMatch) {
    return {
      min: parseInt(numMatch[1].replace(",", "")),
      max: parseInt(numMatch[2].replace(",", "")),
    };
  }

  return { min: null, max: null };
}

function inferExperienceLevel(title: string): string {
  const t = title.toLowerCase();
  if (/\b(director|vp\b|chief|cto|ceo|coo|head of|c-level)\b/.test(t)) return "executive";
  if (/\b(lead|principal|staff|architect)\b/.test(t)) return "lead";
  if (/\b(senior|sr\.?)\b/.test(t)) return "senior";
  if (/\b(junior|jr\.?|entry.?level|graduate)\b/.test(t)) return "junior";
  return "mid";
}

function mapJobType(remotiveType: string): string {
  const map: Record<string, string> = {
    full_time: "fulltime",
    contract: "contract",
    part_time: "parttime",
    internship: "internship",
  };
  return map[remotiveType] ?? "fulltime";
}

let lastSyncAt = 0;
const SYNC_COOLDOWN_MS = 60 * 60 * 1000;

export async function syncFromRemotive(
  limit = 150,
  force = false
): Promise<{ imported: number; message: string }> {
  const now = Date.now();
  if (!force && now - lastSyncAt < SYNC_COOLDOWN_MS) {
    return { imported: 0, message: "Skipped — synced recently" };
  }

  const res = await fetch(`https://remotive.com/api/remote-jobs?limit=${limit}`, {
    headers: { "User-Agent": "SwipeJobs/1.0" },
  });
  if (!res.ok) throw new Error(`Remotive API error: ${res.status}`);

  const data = (await res.json()) as { jobs: RemotiveJob[] };
  const jobs = data.jobs ?? [];

  let imported = 0;

  for (const rJob of jobs) {
    try {
      const externalId = `remotive-${rJob.id}`;

      const existing = await db
        .select({ id: jobsTable.id })
        .from(jobsTable)
        .where(eq(jobsTable.externalId, externalId))
        .limit(1);

      if (existing.length > 0) continue;

      let [company] = await db
        .select()
        .from(companiesTable)
        .where(eq(companiesTable.name, rJob.company_name))
        .limit(1);

      if (!company) {
        [company] = await db
          .insert(companiesTable)
          .values({ name: rJob.company_name, logoUrl: rJob.company_logo_url ?? null })
          .returning();
      } else if (rJob.company_logo_url && !company.logoUrl) {
        await db
          .update(companiesTable)
          .set({ logoUrl: rJob.company_logo_url })
          .where(eq(companiesTable.id, company.id));
      }

      const fullDescription = stripHtml(rJob.description);
      const shortDescription =
        fullDescription.slice(0, 220).trimEnd() + (fullDescription.length > 220 ? "…" : "");
      const { min, max } = parseSalary(rJob.salary);

      await db.insert(jobsTable).values({
        externalId,
        title: rJob.title,
        companyId: company.id,
        location: rJob.candidate_required_location || "Worldwide",
        remoteType: "remote",
        salaryMin: min,
        salaryMax: max,
        jobType: mapJobType(rJob.job_type),
        experienceLevel: inferExperienceLevel(rJob.title),
        tags: rJob.tags.slice(0, 10),
        shortDescription,
        fullDescription,
        applyUrl: rJob.url,
        source: "remotive",
        isActive: true,
      });

      imported++;
    } catch {
      // Skip problematic jobs
    }
  }

  lastSyncAt = Date.now();
  return { imported, message: `Imported ${imported} new jobs from Remotive` };
}

export async function jobsCount(): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(jobsTable)
    .where(eq(jobsTable.isActive, true));
  return Number(row?.count ?? 0);
}

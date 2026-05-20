import { db } from "@workspace/db";
import { jobsTable, companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

interface JSearchJob {
  job_id: string;
  employer_name: string;
  employer_logo?: string;
  job_title: string;
  job_description: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_is_remote: boolean;
  job_employment_type?: string;
  job_apply_link: string;
  job_min_salary?: number;
  job_max_salary?: number;
  job_salary_period?: string;
  job_required_skills?: string[];
}

interface JSearchResponse {
  status: string;
  data: JSearchJob[];
}

const SEARCH_QUERIES = [
  "software engineer remote",
  "product manager remote",
  "data scientist remote",
  "frontend developer",
  "backend developer",
  "devops engineer",
  "marketing manager",
  "ux designer",
];

function mapEmploymentType(t?: string): string {
  if (!t) return "fulltime";
  const map: Record<string, string> = {
    FULLTIME: "fulltime",
    PARTTIME: "parttime",
    CONTRACTOR: "contract",
    INTERN: "internship",
  };
  return map[t.toUpperCase()] ?? "fulltime";
}

function inferRemoteType(job: JSearchJob): string {
  if (job.job_is_remote) return "remote";
  return "onsite";
}

function inferExperienceLevel(title: string): string {
  const t = title.toLowerCase();
  if (/\b(director|vp\b|chief|cto|ceo|head of)\b/.test(t)) return "executive";
  if (/\b(lead|principal|staff|architect)\b/.test(t)) return "lead";
  if (/\b(senior|sr\.?)\b/.test(t)) return "senior";
  if (/\b(junior|jr\.?|entry.?level|graduate|intern)\b/.test(t)) return "junior";
  return "mid";
}

function buildLocation(job: JSearchJob): string {
  if (job.job_is_remote) return "Remote";
  const parts = [job.job_city, job.job_state, job.job_country].filter(Boolean);
  return parts.join(", ") || "Unknown";
}

function normalizeSalary(value?: number, period?: string): number | null {
  if (!value || value <= 0) return null;
  if (!period) return value > 1000 ? value : null;
  const p = period.toUpperCase();
  if (p === "HOUR") return Math.round(value * 2080);
  if (p === "MONTH") return Math.round(value * 12);
  return value;
}

async function upsertCompany(name: string, logoUrl?: string | null) {
  let [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.name, name))
    .limit(1);
  if (!company) {
    [company] = await db
      .insert(companiesTable)
      .values({ name, logoUrl: logoUrl ?? null })
      .returning();
  } else if (logoUrl && !company.logoUrl) {
    await db
      .update(companiesTable)
      .set({ logoUrl })
      .where(eq(companiesTable.id, company.id));
    company.logoUrl = logoUrl;
  }
  return company;
}

async function fetchJSearchPage(query: string, page: number, apiKey: string): Promise<JSearchJob[]> {
  const url = new URL("https://jsearch.p.rapidapi.com/search");
  url.searchParams.set("query", query);
  url.searchParams.set("page", String(page));
  url.searchParams.set("num_pages", "1");

  const res = await fetch(url.toString(), {
    headers: {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      "User-Agent": "SwipeJobs/1.0",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) return [];
  const data = (await res.json()) as JSearchResponse;
  if (data.status !== "OK") return [];
  return data.data ?? [];
}

export async function syncJSearch(): Promise<{ imported: number; skipped: number }> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    return { imported: 0, skipped: 0 };
  }

  let imported = 0;
  let skipped = 0;

  const tasks = SEARCH_QUERIES.flatMap((query) => [
    fetchJSearchPage(query, 1, apiKey),
    fetchJSearchPage(query, 2, apiKey),
  ]);

  const results = await Promise.allSettled(tasks);
  const allJobs: JSearchJob[] = [];
  const seen = new Set<string>();

  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const job of result.value) {
        if (!seen.has(job.job_id)) {
          seen.add(job.job_id);
          allJobs.push(job);
        }
      }
    }
  }

  for (const job of allJobs) {
    try {
      if (!job.job_title?.trim() || !job.job_apply_link?.trim() || !job.employer_name?.trim()) {
        skipped++;
        continue;
      }

      const externalId = `jsearch-${job.job_id}`;
      const existing = await db
        .select({ id: jobsTable.id })
        .from(jobsTable)
        .where(eq(jobsTable.externalId, externalId))
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      const company = await upsertCompany(
        job.employer_name.trim(),
        job.employer_logo || null
      );

      const fullDescription = (job.job_description ?? "").trim();
      const short =
        fullDescription.slice(0, 240).trimEnd() +
        (fullDescription.length > 240 ? "…" : "");

      const salaryMin = normalizeSalary(job.job_min_salary, job.job_salary_period);
      const salaryMax = normalizeSalary(job.job_max_salary, job.job_salary_period);

      await db.insert(jobsTable).values({
        externalId,
        title: job.job_title.trim(),
        companyId: company.id,
        location: buildLocation(job),
        remoteType: inferRemoteType(job),
        salaryMin,
        salaryMax,
        jobType: mapEmploymentType(job.job_employment_type),
        experienceLevel: inferExperienceLevel(job.job_title),
        tags: (job.job_required_skills ?? []).slice(0, 10),
        shortDescription: short || job.job_title,
        fullDescription: fullDescription || job.job_title,
        applyUrl: job.job_apply_link.trim(),
        source: "jsearch",
        isActive: true,
      });

      imported++;
    } catch {
      skipped++;
    }
  }

  return { imported, skipped };
}

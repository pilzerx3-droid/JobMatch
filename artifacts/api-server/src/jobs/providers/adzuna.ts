import { db } from "@workspace/db";
import { jobsTable, companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

interface AdzunaJob {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  salary_min?: number;
  salary_max?: number;
  contract_type?: string;
  description: string;
  redirect_url: string;
  category?: { tag: string };
  created: string;
}

interface AdzunaResponse {
  results: AdzunaJob[];
}

const COUNTRIES = ["us", "gb", "de", "nl", "ca"];
const PAGES_PER_COUNTRY = 5;
const RESULTS_PER_PAGE = 50;

function mapContractType(ct?: string): string {
  if (!ct) return "fulltime";
  const map: Record<string, string> = {
    permanent: "fulltime",
    contract: "contract",
    part_time: "parttime",
    temporary: "contract",
    internship: "internship",
  };
  return map[ct.toLowerCase()] ?? "fulltime";
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

function inferExperienceLevel(title: string): string {
  const t = title.toLowerCase();
  if (/\b(director|vp\b|chief|cto|ceo|head of)\b/.test(t)) return "executive";
  if (/\b(lead|principal|staff|architect)\b/.test(t)) return "lead";
  if (/\b(senior|sr\.?)\b/.test(t)) return "senior";
  if (/\b(junior|jr\.?|entry.?level|graduate|intern)\b/.test(t)) return "junior";
  return "mid";
}

function looksEnglish(text: string): boolean {
  const nonAscii = (text.match(/[^\x00-\x7F]/g) ?? []).length;
  return nonAscii / text.length < 0.08;
}

async function upsertCompany(name: string) {
  let [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.name, name))
    .limit(1);
  if (!company) {
    [company] = await db
      .insert(companiesTable)
      .values({ name, logoUrl: null })
      .returning();
  }
  return company;
}

async function fetchAdzunaPage(
  country: string,
  page: number,
  appId: string,
  appKey: string
): Promise<AdzunaJob[]> {
  const url = new URL(
    `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}`
  );
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("results_per_page", String(RESULTS_PER_PAGE));
  url.searchParams.set("content-type", "application/json");
  url.searchParams.set("what_or", "developer engineer designer product manager data analyst marketing");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "SwipeJobs/1.0" },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) return [];
  const data = (await res.json()) as AdzunaResponse;
  return data.results ?? [];
}

export async function syncAdzuna(): Promise<{ imported: number; skipped: number }> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    return { imported: 0, skipped: 0 };
  }

  let imported = 0;
  let skipped = 0;

  const fetchTasks = COUNTRIES.flatMap((country) =>
    Array.from({ length: PAGES_PER_COUNTRY }, (_, i) =>
      fetchAdzunaPage(country, i + 1, appId, appKey)
    )
  );

  const pageResults = await Promise.allSettled(fetchTasks);
  const allJobs: AdzunaJob[] = [];
  const seen = new Set<string>();

  for (const result of pageResults) {
    if (result.status === "fulfilled") {
      for (const job of result.value) {
        if (!seen.has(job.id)) {
          seen.add(job.id);
          allJobs.push(job);
        }
      }
    }
  }

  for (const job of allJobs) {
    try {
      if (!job.title?.trim() || !job.redirect_url?.trim() || !job.company?.display_name?.trim()) {
        skipped++;
        continue;
      }
      if (!looksEnglish(job.title)) {
        skipped++;
        continue;
      }

      const externalId = `adzuna-${job.id}`;
      const existing = await db
        .select({ id: jobsTable.id })
        .from(jobsTable)
        .where(eq(jobsTable.externalId, externalId))
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      const company = await upsertCompany(job.company.display_name.trim());
      const fullDescription = stripHtml(job.description ?? "");
      const short =
        fullDescription.slice(0, 240).trimEnd() +
        (fullDescription.length > 240 ? "…" : "");

      await db.insert(jobsTable).values({
        externalId,
        title: job.title.trim(),
        companyId: company.id,
        location: job.location?.display_name?.trim() || "Remote",
        remoteType: "hybrid",
        salaryMin: job.salary_min && job.salary_min > 1000 ? Math.round(job.salary_min) : null,
        salaryMax: job.salary_max && job.salary_max > 1000 ? Math.round(job.salary_max) : null,
        jobType: mapContractType(job.contract_type),
        experienceLevel: inferExperienceLevel(job.title),
        tags: [],
        shortDescription: short || job.title,
        fullDescription: fullDescription || job.title,
        applyUrl: job.redirect_url.trim(),
        source: "adzuna",
        isActive: true,
      });

      imported++;
    } catch {
      skipped++;
    }
  }

  return { imported, skipped };
}

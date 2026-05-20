import { db } from "@workspace/db";
import { jobsTable, companiesTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";

// ─── Remotive types ───────────────────────────────────────────────────────────
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

// ─── RemoteOK types ───────────────────────────────────────────────────────────
interface RemoteOKJob {
  id: string;
  slug: string;
  company: string;
  company_logo?: string;
  logo?: string;
  position: string;
  tags: string[];
  description: string;
  location?: string;
  apply_url?: string;
  url?: string;
  salary_min?: number;
  salary_max?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

  const hourlyRange = salary.match(/\$(\d+(?:,\d+)?)\s*[-–]\s*\$(\d+(?:,\d+)?)\s*\/\s*hour/i);
  if (hourlyRange) {
    return {
      min: parseInt(hourlyRange[1].replace(",", "")) * 2080,
      max: parseInt(hourlyRange[2].replace(",", "")) * 2080,
    };
  }
  const kRange = salary.match(/\$(\d+(?:\.\d+)?)k\s*[-–]\s*\$(\d+(?:\.\d+)?)k/i);
  if (kRange) {
    return {
      min: Math.round(parseFloat(kRange[1]) * 1000),
      max: Math.round(parseFloat(kRange[2]) * 1000),
    };
  }
  const kOne = salary.match(/\$(\d+(?:\.\d+)?)k/i);
  if (kOne) {
    const n = Math.round(parseFloat(kOne[1]) * 1000);
    return { min: n, max: n };
  }
  const numRange = salary.match(/\$(\d+(?:,\d+)?)\s*[-–]\s*\$(\d+(?:,\d+)?)/);
  if (numRange) {
    return {
      min: parseInt(numRange[1].replace(",", "")),
      max: parseInt(numRange[2].replace(",", "")),
    };
  }
  return { min: null, max: null };
}

function inferExperienceLevel(title: string): string {
  const t = title.toLowerCase();
  if (/\b(director|vp\b|chief|cto|ceo|coo|head of|c-level)\b/.test(t)) return "executive";
  if (/\b(lead|principal|staff|architect)\b/.test(t)) return "lead";
  if (/\b(senior|sr\.?)\b/.test(t)) return "senior";
  if (/\b(junior|jr\.?|entry.?level|graduate|intern)\b/.test(t)) return "junior";
  return "mid";
}

function mapRemotiveJobType(t: string): string {
  const map: Record<string, string> = {
    full_time: "fulltime",
    contract: "contract",
    part_time: "parttime",
    internship: "internship",
  };
  return map[t] ?? "fulltime";
}

function inferJobTypeFromTags(tags: string[]): string {
  const joined = tags.join(" ").toLowerCase();
  if (/\bcontract\b/.test(joined)) return "contract";
  if (/\bpart.?time\b/.test(joined)) return "parttime";
  if (/\bintern\b/.test(joined)) return "internship";
  return "fulltime";
}

// Rough English-language check (reject strings with high non-ASCII ratio)
function looksEnglish(text: string): boolean {
  const nonAscii = (text.match(/[^\x00-\x7F]/g) ?? []).length;
  return nonAscii / text.length < 0.05;
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

async function insertJob(values: Parameters<typeof db.insert>[0] extends never ? never : {
  externalId: string;
  title: string;
  companyId: number;
  location: string;
  remoteType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  jobType: string;
  experienceLevel: string;
  tags: string[];
  shortDescription: string;
  fullDescription: string;
  applyUrl: string;
  source: string;
  isActive: boolean;
}) {
  await db.insert(jobsTable).values(values);
}

// ─── Remotive sync ────────────────────────────────────────────────────────────
async function fetchRemotive(): Promise<RemotiveJob[]> {
  const categories = [
    "software-dev",
    "devops-sysadmin",
    "product",
    "design",
    "data",
    "marketing",
    "customer-support",
    "writing",
    "finance-legal",
    "human-resources",
  ];

  const all: RemotiveJob[] = [];
  const seen = new Set<number>();

  const results = await Promise.allSettled(
    categories.map((cat) =>
      fetch(`https://remotive.com/api/remote-jobs?category=${cat}&limit=50`, {
        headers: { "User-Agent": "SwipeJobs/1.0" },
        signal: AbortSignal.timeout(8000),
      }).then((r) => r.json() as Promise<{ jobs: RemotiveJob[] }>)
    )
  );

  for (const r of results) {
    if (r.status === "fulfilled") {
      for (const job of r.value.jobs ?? []) {
        if (!seen.has(job.id)) {
          seen.add(job.id);
          all.push(job);
        }
      }
    }
  }
  return all;
}

async function syncRemotive(): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;
  const jobs = await fetchRemotive();

  for (const rJob of jobs) {
    try {
      if (!rJob.title?.trim() || !rJob.url?.trim() || !rJob.company_name?.trim()) {
        skipped++;
        continue;
      }
      if (!looksEnglish(rJob.title)) {
        skipped++;
        continue;
      }

      const externalId = `remotive-${rJob.id}`;
      const existing = await db
        .select({ id: jobsTable.id })
        .from(jobsTable)
        .where(eq(jobsTable.externalId, externalId))
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      const company = await upsertCompany(rJob.company_name, rJob.company_logo_url);
      const fullDescription = stripHtml(rJob.description ?? "");
      const short =
        fullDescription.slice(0, 240).trimEnd() + (fullDescription.length > 240 ? "…" : "");
      const { min, max } = parseSalary(rJob.salary);

      await insertJob({
        externalId,
        title: rJob.title.trim(),
        companyId: company.id,
        location: rJob.candidate_required_location?.trim() || "Worldwide",
        remoteType: "remote",
        salaryMin: min,
        salaryMax: max,
        jobType: mapRemotiveJobType(rJob.job_type),
        experienceLevel: inferExperienceLevel(rJob.title),
        tags: (rJob.tags ?? []).slice(0, 10),
        shortDescription: short || rJob.title,
        fullDescription: fullDescription || rJob.title,
        applyUrl: rJob.url.trim(),
        source: "remotive",
        isActive: true,
      });

      imported++;
    } catch {
      skipped++;
    }
  }

  return { imported, skipped };
}

// ─── RemoteOK sync ────────────────────────────────────────────────────────────
async function syncRemoteOK(): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  let rawJobs: RemoteOKJob[] = [];
  try {
    const res = await fetch("https://remoteok.com/api", {
      headers: {
        "User-Agent": "SwipeJobs/1.0",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });
    const data = (await res.json()) as (RemoteOKJob | { legal: string })[];
    rawJobs = (data as RemoteOKJob[]).filter(
      (j): j is RemoteOKJob => typeof j.id === "string" && j.id.length > 0
    );
  } catch {
    return { imported: 0, skipped: 0 };
  }

  for (const rJob of rawJobs) {
    try {
      if (!rJob.position?.trim() || !rJob.company?.trim()) {
        skipped++;
        continue;
      }
      if (!looksEnglish(rJob.position)) {
        skipped++;
        continue;
      }

      const applyUrl = rJob.apply_url || rJob.url || "";
      if (!applyUrl) {
        skipped++;
        continue;
      }

      const externalId = `remoteok-${rJob.id}`;
      const existing = await db
        .select({ id: jobsTable.id })
        .from(jobsTable)
        .where(eq(jobsTable.externalId, externalId))
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      const logo = rJob.company_logo || rJob.logo || undefined;
      const company = await upsertCompany(rJob.company, logo || null);

      const fullDescription = stripHtml(rJob.description ?? "");
      const short =
        fullDescription.slice(0, 240).trimEnd() + (fullDescription.length > 240 ? "…" : "");

      const salaryMin =
        rJob.salary_min && rJob.salary_min > 1000 ? rJob.salary_min : null;
      const salaryMax =
        rJob.salary_max && rJob.salary_max > 1000 ? rJob.salary_max : null;

      const tags = (rJob.tags ?? []).slice(0, 10);

      await insertJob({
        externalId,
        title: rJob.position.trim(),
        companyId: company.id,
        location: rJob.location?.trim() || "Worldwide",
        remoteType: "remote",
        salaryMin,
        salaryMax,
        jobType: inferJobTypeFromTags(tags),
        experienceLevel: inferExperienceLevel(rJob.position),
        tags,
        shortDescription: short || rJob.position,
        fullDescription: fullDescription || rJob.position,
        applyUrl: applyUrl.trim(),
        source: "remoteok",
        isActive: true,
      });

      imported++;
    } catch {
      skipped++;
    }
  }

  return { imported, skipped };
}

// ─── Public API ───────────────────────────────────────────────────────────────
let lastSyncAt = 0;
const SYNC_COOLDOWN_MS = 30 * 60 * 1000;

export async function syncFromRemotive(
  _limit = 200,
  force = false
): Promise<{ imported: number; skipped: number; message: string }> {
  const now = Date.now();
  if (!force && now - lastSyncAt < SYNC_COOLDOWN_MS) {
    return { imported: 0, skipped: 0, message: "Skipped — synced recently" };
  }

  const [r1, r2] = await Promise.all([syncRemotive(), syncRemoteOK()]);

  const imported = r1.imported + r2.imported;
  const skipped = r1.skipped + r2.skipped;

  lastSyncAt = Date.now();
  return {
    imported,
    skipped,
    message: `Imported ${imported} new jobs (Remotive: ${r1.imported}, RemoteOK: ${r2.imported}, skipped: ${skipped})`,
  };
}

export async function jobsCount(): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(jobsTable)
    .where(eq(jobsTable.isActive, true));
  return Number(row?.count ?? 0);
}

import { db } from "@workspace/db";
import { jobsTable, companiesTable, companyCareerUrlsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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

function inferExperienceLevel(title: string): string {
  const t = title.toLowerCase();
  if (/\b(director|vp\b|chief|cto|head of)\b/.test(t)) return "executive";
  if (/\b(lead|principal|staff|architect)\b/.test(t)) return "lead";
  if (/\b(senior|sr\.?)\b/.test(t)) return "senior";
  if (/\b(junior|jr\.?|entry.?level|intern)\b/.test(t)) return "junior";
  return "mid";
}

function mapJobType(t: string): string {
  const lower = t.toLowerCase();
  if (lower.includes("contract")) return "contract";
  if (lower.includes("part")) return "parttime";
  if (lower.includes("intern")) return "internship";
  return "fulltime";
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
  }
  return company;
}

async function insertJobIfNew(values: {
  externalId: string;
  title: string;
  companyId: number;
  location: string;
  remoteType: string;
  jobType: string;
  experienceLevel: string;
  tags: string[];
  shortDescription: string;
  fullDescription: string;
  applyUrl: string;
  source: string;
}): Promise<boolean> {
  const existing = await db
    .select({ id: jobsTable.id })
    .from(jobsTable)
    .where(eq(jobsTable.externalId, values.externalId))
    .limit(1);

  if (existing.length > 0) return false;

  await db.insert(jobsTable).values({ ...values, isActive: true });
  return true;
}

// ─── Greenhouse ───────────────────────────────────────────────────────────────
interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  location: { name: string };
  content: string;
  departments?: { name: string }[];
  offices?: { name: string }[];
  metadata?: { name: string; value: string | null }[];
}

async function importFromGreenhouse(
  companyName: string,
  slug: string
): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`, {
    headers: { "User-Agent": "SwipeJobs/1.0" },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Greenhouse API error: ${res.status}`);

  const data = (await res.json()) as { jobs: GreenhouseJob[] };
  const company = await upsertCompany(companyName);

  for (const job of data.jobs ?? []) {
    try {
      if (!job.title?.trim() || !job.absolute_url?.trim()) {
        skipped++;
        continue;
      }

      const fullDescription = stripHtml(job.content ?? "");
      const short = fullDescription.slice(0, 240).trimEnd() + (fullDescription.length > 240 ? "…" : "");
      const location = job.location?.name || "Worldwide";
      const isRemote = location.toLowerCase().includes("remote");

      const ok = await insertJobIfNew({
        externalId: `greenhouse-${job.id}`,
        title: job.title.trim(),
        companyId: company.id,
        location,
        remoteType: isRemote ? "remote" : "onsite",
        jobType: "fulltime",
        experienceLevel: inferExperienceLevel(job.title),
        tags: (job.departments ?? []).map((d) => d.name).slice(0, 5),
        shortDescription: short || job.title,
        fullDescription: fullDescription || job.title,
        applyUrl: job.absolute_url.trim(),
        source: "greenhouse",
      });

      if (ok) imported++;
      else skipped++;
    } catch {
      skipped++;
    }
  }

  return { imported, skipped };
}

// ─── Lever ────────────────────────────────────────────────────────────────────
interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl?: string;
  categories?: { location?: string; team?: string; commitment?: string };
  description: string;
  descriptionPlain: string;
}

async function importFromLever(
  companyName: string,
  slug: string
): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  const res = await fetch(
    `https://api.lever.co/v0/postings/${slug}?mode=json&limit=250`,
    {
      headers: { "User-Agent": "SwipeJobs/1.0" },
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!res.ok) throw new Error(`Lever API error: ${res.status}`);

  const data = (await res.json()) as LeverPosting[];
  const company = await upsertCompany(companyName);

  for (const posting of data ?? []) {
    try {
      if (!posting.text?.trim() || !posting.hostedUrl?.trim()) {
        skipped++;
        continue;
      }

      const fullDescription = stripHtml(posting.description ?? posting.descriptionPlain ?? "");
      const short = fullDescription.slice(0, 240).trimEnd() + (fullDescription.length > 240 ? "…" : "");
      const location = posting.categories?.location || "Worldwide";
      const isRemote = location.toLowerCase().includes("remote");
      const commitment = posting.categories?.commitment ?? "";
      const team = posting.categories?.team ?? "";

      const ok = await insertJobIfNew({
        externalId: `lever-${posting.id}`,
        title: posting.text.trim(),
        companyId: company.id,
        location,
        remoteType: isRemote ? "remote" : "onsite",
        jobType: mapJobType(commitment),
        experienceLevel: inferExperienceLevel(posting.text),
        tags: team ? [team] : [],
        shortDescription: short || posting.text,
        fullDescription: fullDescription || posting.text,
        applyUrl: (posting.applyUrl || posting.hostedUrl).trim(),
        source: "lever",
      });

      if (ok) imported++;
      else skipped++;
    } catch {
      skipped++;
    }
  }

  return { imported, skipped };
}

// ─── Workable ─────────────────────────────────────────────────────────────────
interface WorkableJob {
  id: string;
  title: string;
  shortlink: string;
  url: string;
  location: { city?: string; region?: string; country?: string; telecommuting?: boolean };
  department?: string;
  full_title?: string;
  description?: string;
  employment_type?: string;
}

async function importFromWorkable(
  companyName: string,
  subdomain: string
): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  const res = await fetch(`https://apply.workable.com/api/v3/accounts/${subdomain}/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "SwipeJobs/1.0",
    },
    body: JSON.stringify({ query: "", location: [], department: [], worktype: [], remote: [] }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Workable API error: ${res.status}`);

  const data = (await res.json()) as { results: WorkableJob[] };
  const company = await upsertCompany(companyName);

  for (const job of data.results ?? []) {
    try {
      if (!job.title?.trim() || !job.shortlink?.trim()) {
        skipped++;
        continue;
      }

      const isRemote = job.location?.telecommuting ?? false;
      const location = [job.location?.city, job.location?.country].filter(Boolean).join(", ") || "Worldwide";
      const fullDescription = stripHtml(job.description ?? "");
      const short = fullDescription.slice(0, 240).trimEnd() + (fullDescription.length > 240 ? "…" : "");

      const ok = await insertJobIfNew({
        externalId: `workable-${job.id}`,
        title: job.title.trim(),
        companyId: company.id,
        location: isRemote ? "Remote" : location,
        remoteType: isRemote ? "remote" : "onsite",
        jobType: mapJobType(job.employment_type ?? ""),
        experienceLevel: inferExperienceLevel(job.title),
        tags: job.department ? [job.department] : [],
        shortDescription: short || job.title,
        fullDescription: fullDescription || job.title,
        applyUrl: job.shortlink.trim(),
        source: "workable",
      });

      if (ok) imported++;
      else skipped++;
    } catch {
      skipped++;
    }
  }

  return { imported, skipped };
}

// ─── Generic ATS slug extraction ─────────────────────────────────────────────
function extractSlug(url: string, atsType: string): string {
  try {
    const parsed = new URL(url);
    const parts = parsed.hostname.split(".");
    const path = parsed.pathname.replace(/^\//, "").split("/")[0];

    if (atsType === "greenhouse") {
      // https://boards.greenhouse.io/{slug}/jobs
      return parsed.pathname.split("/")[1] ?? path;
    }
    if (atsType === "lever") {
      // https://jobs.lever.co/{slug}
      return path || parts[0];
    }
    if (atsType === "workable") {
      // https://apply.workable.com/{slug}
      return path || parts[0];
    }
    return path || parts[0];
  } catch {
    return url;
  }
}

// ─── Public dispatcher ────────────────────────────────────────────────────────
export async function importFromCareerUrl(
  urlId: number
): Promise<{ imported: number; skipped: number; message: string }> {
  const [entry] = await db
    .select()
    .from(companyCareerUrlsTable)
    .where(eq(companyCareerUrlsTable.id, urlId))
    .limit(1);

  if (!entry) throw new Error("Career URL not found");

  const slug = extractSlug(entry.careerUrl, entry.atsType);
  let result = { imported: 0, skipped: 0 };

  switch (entry.atsType) {
    case "greenhouse":
      result = await importFromGreenhouse(entry.companyName, slug);
      break;
    case "lever":
      result = await importFromLever(entry.companyName, slug);
      break;
    case "workable":
      result = await importFromWorkable(entry.companyName, slug);
      break;
    default:
      throw new Error(`Unsupported ATS type: ${entry.atsType}`);
  }

  await db
    .update(companyCareerUrlsTable)
    .set({
      lastImportedAt: new Date(),
      lastImportCount: String(result.imported),
    })
    .where(eq(companyCareerUrlsTable.id, urlId));

  return {
    ...result,
    message: `Imported ${result.imported} new jobs from ${entry.atsType} (${entry.companyName})`,
  };
}

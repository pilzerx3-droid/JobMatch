import { Router } from "express";
import { db } from "@workspace/db";
import {
  jobsTable,
  companiesTable,
  userProfilesTable,
  swipeActionsTable,
} from "@workspace/db";
import { eq, desc, count, and, gte, sql } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

const MOCK_COMPANIES = [
  { name: "Stripe", website: "https://stripe.com", description: "Financial infrastructure for the internet." },
  { name: "Vercel", website: "https://vercel.com", description: "Build and deploy the best web experiences with The Frontend Cloud." },
  { name: "Linear", website: "https://linear.app", description: "The issue tracking tool you'll enjoy using." },
  { name: "Figma", website: "https://figma.com", description: "Design, prototype, and gather feedback all in one place." },
  { name: "Notion", website: "https://notion.so", description: "The all-in-one workspace for notes, tasks, wikis, and databases." },
  { name: "Anthropic", website: "https://anthropic.com", description: "AI safety company and maker of Claude." },
  { name: "Shopify", website: "https://shopify.com", description: "Commerce platform for businesses of all sizes." },
  { name: "Databricks", website: "https://databricks.com", description: "The data and AI company." },
  { name: "Retool", website: "https://retool.com", description: "Build internal tools remarkably fast." },
  { name: "Loom", website: "https://loom.com", description: "Video messaging for work." },
];

const MOCK_JOBS = [
  {
    title: "Senior Frontend Engineer",
    remoteType: "remote",
    jobType: "fulltime",
    experienceLevel: "senior",
    salaryMin: 150000,
    salaryMax: 200000,
    location: "Remote",
    tags: ["React", "TypeScript", "Next.js", "TailwindCSS"],
    shortDescription: "Join our world-class frontend team building beautiful, high-performance web applications used by millions.",
    fullDescription: "We are looking for a Senior Frontend Engineer to join our growing engineering team. You will work closely with design and backend teams to ship new features and improve performance across our platform.\n\nResponsibilities:\n- Build and maintain React applications with TypeScript\n- Collaborate with designers on responsive, accessible UI\n- Mentor junior engineers and conduct code reviews\n- Drive frontend best practices and architectural decisions\n\nRequirements:\n- 5+ years of frontend engineering experience\n- Expert-level React and TypeScript skills\n- Experience with Next.js and server-side rendering\n- Strong understanding of web performance and optimization\n- Experience with testing (Jest, Playwright)",
    applyUrl: "https://jobs.example.com/senior-frontend",
  },
  {
    title: "Backend Engineer - Infrastructure",
    remoteType: "hybrid",
    jobType: "fulltime",
    experienceLevel: "mid",
    salaryMin: 130000,
    salaryMax: 180000,
    location: "San Francisco, CA",
    tags: ["Go", "Kubernetes", "AWS", "PostgreSQL"],
    shortDescription: "Help us build the infrastructure that powers payments for millions of businesses worldwide.",
    fullDescription: "As a Backend Engineer on our Infrastructure team, you'll design and build the systems that handle billions of dollars in payments annually.\n\nResponsibilities:\n- Design and implement highly available, distributed systems\n- Build and maintain our data pipeline infrastructure\n- Optimize database performance and query patterns\n- Respond to and resolve production incidents\n\nRequirements:\n- 3+ years of backend engineering experience\n- Proficiency in Go, Python, or similar systems language\n- Experience with Kubernetes and container orchestration\n- Strong SQL and database design skills\n- Experience with AWS or GCP",
    applyUrl: "https://jobs.example.com/backend-infra",
  },
  {
    title: "Machine Learning Engineer",
    remoteType: "remote",
    jobType: "fulltime",
    experienceLevel: "senior",
    salaryMin: 180000,
    salaryMax: 250000,
    location: "Remote",
    tags: ["Python", "PyTorch", "LLMs", "MLOps"],
    shortDescription: "Build and deploy state-of-the-art ML models that power AI features for our customers.",
    fullDescription: "We are looking for an ML Engineer to join our AI team and help us build the next generation of AI-powered features.\n\nResponsibilities:\n- Train and fine-tune large language models\n- Design and implement ML pipelines and evaluation frameworks\n- Deploy models to production with proper monitoring\n- Collaborate with product teams to identify ML opportunities\n\nRequirements:\n- 4+ years of ML engineering experience\n- Deep expertise in PyTorch or TensorFlow\n- Experience with LLMs, fine-tuning, and RLHF\n- Strong Python programming skills\n- Experience with distributed training on GPU clusters",
    applyUrl: "https://jobs.example.com/ml-engineer",
  },
  {
    title: "Product Designer",
    remoteType: "hybrid",
    jobType: "fulltime",
    experienceLevel: "mid",
    salaryMin: 120000,
    salaryMax: 160000,
    location: "New York, NY",
    tags: ["Figma", "Design Systems", "User Research", "Prototyping"],
    shortDescription: "Design experiences that delight millions of users. Own end-to-end design for our core product flows.",
    fullDescription: "As a Product Designer at our company, you'll be responsible for shaping the user experience of our flagship product.\n\nResponsibilities:\n- Own the design of key product areas from discovery to delivery\n- Run user research and usability testing\n- Create and maintain design system components\n- Collaborate closely with engineering and product management\n\nRequirements:\n- 3+ years of product design experience\n- Expert Figma skills\n- Experience with design systems and component libraries\n- Strong portfolio demonstrating end-to-end design process\n- Experience with mobile app design",
    applyUrl: "https://jobs.example.com/product-designer",
  },
  {
    title: "DevOps / Platform Engineer",
    remoteType: "remote",
    jobType: "fulltime",
    experienceLevel: "mid",
    salaryMin: 140000,
    salaryMax: 190000,
    location: "Remote",
    tags: ["Terraform", "AWS", "Docker", "CI/CD"],
    shortDescription: "Build and operate the platform that enables our engineering team to ship 100x faster.",
    fullDescription: "We are hiring a Platform Engineer to improve developer productivity and infrastructure reliability across our entire engineering organization.\n\nResponsibilities:\n- Design and implement CI/CD pipelines\n- Manage cloud infrastructure with Terraform and Pulumi\n- Build internal developer tooling and platforms\n- Ensure security, reliability, and compliance of our systems\n\nRequirements:\n- 3+ years of DevOps or platform engineering experience\n- Expertise in AWS, GCP, or Azure\n- Strong Terraform and IaC skills\n- Experience with Kubernetes in production\n- Familiarity with security best practices",
    applyUrl: "https://jobs.example.com/devops",
  },
  {
    title: "Full-Stack Engineer",
    remoteType: "remote",
    jobType: "fulltime",
    experienceLevel: "junior",
    salaryMin: 80000,
    salaryMax: 120000,
    location: "Remote",
    tags: ["React", "Node.js", "TypeScript", "PostgreSQL"],
    shortDescription: "A great first role for a motivated engineer to join a fast-growing startup and make a real impact.",
    fullDescription: "We're looking for a talented Junior Full-Stack Engineer to join our scrappy, high-impact team.\n\nResponsibilities:\n- Build and ship new features across the full stack\n- Write clean, well-tested code\n- Participate in code reviews and team rituals\n- Work directly with founders and customers\n\nRequirements:\n- 1+ year of professional software engineering experience\n- Familiarity with React and Node.js\n- Basic understanding of SQL databases\n- Strong willingness to learn and grow",
    applyUrl: "https://jobs.example.com/fullstack-junior",
  },
  {
    title: "Staff Software Engineer",
    remoteType: "hybrid",
    jobType: "fulltime",
    experienceLevel: "lead",
    salaryMin: 220000,
    salaryMax: 320000,
    location: "Seattle, WA",
    tags: ["Architecture", "Leadership", "Distributed Systems", "Java"],
    shortDescription: "Lead technical direction for our core platform serving 500M+ users. Shape our next 5 years.",
    fullDescription: "As a Staff Engineer, you will define our technical strategy, lead complex cross-team initiatives, and raise the bar for engineering excellence across the organization.\n\nResponsibilities:\n- Lead the design of major platform capabilities\n- Partner with engineering leadership to define technical roadmap\n- Mentor senior engineers and drive culture of technical excellence\n- Lead incident response and post-mortems for critical systems\n\nRequirements:\n- 10+ years of software engineering experience\n- Proven track record leading large-scale technical initiatives\n- Deep expertise in distributed systems and cloud architecture\n- Strong communication and cross-functional collaboration skills",
    applyUrl: "https://jobs.example.com/staff-engineer",
  },
  {
    title: "Data Engineer",
    remoteType: "remote",
    jobType: "fulltime",
    experienceLevel: "mid",
    salaryMin: 130000,
    salaryMax: 170000,
    location: "Remote",
    tags: ["Python", "Spark", "dbt", "Snowflake"],
    shortDescription: "Build the data infrastructure that helps us make data-driven decisions at massive scale.",
    fullDescription: "Join our Data team to build and maintain the pipelines and infrastructure that power our analytics and machine learning systems.\n\nResponsibilities:\n- Design and build data pipelines using Spark and dbt\n- Maintain and optimize our data warehouse\n- Work with data scientists to build feature stores\n- Ensure data quality and reliability\n\nRequirements:\n- 3+ years of data engineering experience\n- Proficiency in Python and SQL\n- Experience with Snowflake, BigQuery, or Redshift\n- Experience with orchestration tools like Airflow or Dagster",
    applyUrl: "https://jobs.example.com/data-engineer",
  },
  {
    title: "iOS Engineer",
    remoteType: "onsite",
    jobType: "fulltime",
    experienceLevel: "mid",
    salaryMin: 150000,
    salaryMax: 200000,
    location: "Austin, TX",
    tags: ["Swift", "SwiftUI", "UIKit", "Xcode"],
    shortDescription: "Build native iOS experiences used by tens of millions of users. Own features end-to-end.",
    fullDescription: "We're looking for an experienced iOS Engineer to join our mobile team and help us deliver world-class experiences to our iPhone users.\n\nResponsibilities:\n- Build beautiful, high-performance iOS features in Swift\n- Collaborate with designers on pixel-perfect implementations\n- Optimize app performance and battery usage\n- Conduct technical interviews and code reviews\n\nRequirements:\n- 3+ years of iOS development experience\n- Expertise in Swift and SwiftUI\n- Experience shipping apps to the App Store\n- Strong understanding of iOS design patterns and best practices",
    applyUrl: "https://jobs.example.com/ios-engineer",
  },
  {
    title: "Security Engineer",
    remoteType: "remote",
    jobType: "fulltime",
    experienceLevel: "senior",
    salaryMin: 170000,
    salaryMax: 230000,
    location: "Remote",
    tags: ["Security", "Penetration Testing", "Cloud Security", "SOC 2"],
    shortDescription: "Protect our platform and customer data. Build security infrastructure for a hypergrowth company.",
    fullDescription: "As a Security Engineer, you'll own our security program and help us stay ahead of threats as we scale.\n\nResponsibilities:\n- Lead security reviews for new features and infrastructure\n- Conduct penetration testing and vulnerability assessments\n- Build security tooling and automation\n- Manage incident response for security events\n- Drive SOC 2 and ISO 27001 compliance\n\nRequirements:\n- 5+ years of security engineering experience\n- Experience with cloud security (AWS, GCP)\n- Strong knowledge of web application security (OWASP)\n- Experience with security tooling (SIEM, EDR, vulnerability scanners)",
    applyUrl: "https://jobs.example.com/security-engineer",
  },
];

router.get("/users", async (_req, res, next) => {
  try {
    const users = await db.select().from(userProfilesTable).orderBy(desc(userProfilesTable.createdAt));
    res.json({
      users: users.map((u) => ({
        id: u.id,
        clerkId: u.clerkId,
        name: u.name,
        email: u.email,
        experienceLevel: u.experienceLevel,
        preferredLocation: u.preferredLocation,
        remotePreference: u.remotePreference,
        salaryMin: u.salaryMin,
        salaryMax: u.salaryMax,
        jobCategories: u.jobCategories ?? [],
        onboardingCompleted: u.onboardingCompleted,
        isAdmin: u.isAdmin,
        createdAt: u.createdAt?.toISOString(),
      })),
      total: users.length,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/jobs", async (req, res, next) => {
  try {
    const { page = "1", limit = "20" } = req.query as Record<string, string>;
    const offset = (Number(page) - 1) * Number(limit);

    const [jobs, totalRows] = await Promise.all([
      db
        .select({ job: jobsTable, company: companiesTable })
        .from(jobsTable)
        .leftJoin(companiesTable, eq(jobsTable.companyId, companiesTable.id))
        .orderBy(desc(jobsTable.createdAt))
        .limit(Number(limit))
        .offset(offset),
      db.select({ count: count() }).from(jobsTable),
    ]);

    const total = Number(totalRows[0]?.count ?? 0);

    res.json({
      jobs: jobs.map(({ job, company }) => ({
        id: job.id,
        title: job.title,
        company: company ? { id: company.id, name: company.name, logoUrl: company.logoUrl } : { id: 0, name: "Unknown" },
        location: job.location,
        remoteType: job.remoteType,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        jobType: job.jobType,
        experienceLevel: job.experienceLevel,
        tags: job.tags ?? [],
        shortDescription: job.shortDescription,
        fullDescription: job.fullDescription,
        applyUrl: job.applyUrl,
        source: job.source,
        matchScore: null,
        isSaved: false,
        createdAt: job.createdAt?.toISOString(),
      })),
      total,
      hasMore: offset + jobs.length < total,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/jobs", async (req, res, next) => {
  try {
    const {
      title,
      companyId,
      companyName,
      location,
      remoteType,
      salaryMin,
      salaryMax,
      jobType,
      experienceLevel,
      tags,
      shortDescription,
      fullDescription,
      applyUrl,
    } = req.body;

    let resolvedCompanyId = companyId;

    if (!companyId && companyName) {
      const [newCompany] = await db
        .insert(companiesTable)
        .values({ name: companyName })
        .returning();
      resolvedCompanyId = newCompany.id;
    }

    const [job] = await db
      .insert(jobsTable)
      .values({
        title,
        companyId: resolvedCompanyId,
        location,
        remoteType: remoteType ?? "onsite",
        salaryMin,
        salaryMax,
        jobType: jobType ?? "fulltime",
        experienceLevel: experienceLevel ?? "any",
        tags: tags ?? [],
        shortDescription,
        fullDescription,
        applyUrl,
        source: "admin",
      })
      .returning();

    res.status(201).json(job);
  } catch (err) {
    next(err);
  }
});

router.patch("/jobs/:jobId", async (req, res, next) => {
  try {
    const jobId = Number(req.params.jobId);
    const updates = req.body;

    const [updated] = await db
      .update(jobsTable)
      .set(updates)
      .where(eq(jobsTable.id, jobId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete("/jobs/:jobId", async (req, res, next) => {
  try {
    await db.delete(jobsTable).where(eq(jobsTable.id, Number(req.params.jobId)));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get("/analytics", async (_req, res, next) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      [totalUsersRow],
      [totalJobsRow],
      [totalSwipesRow],
      [totalSavedRow],
      [swipesLast7Row],
      [newUsersLast7Row],
    ] = await Promise.all([
      db.select({ count: count() }).from(userProfilesTable),
      db.select({ count: count() }).from(jobsTable),
      db.select({ count: count() }).from(swipeActionsTable),
      db.select({ count: count() }).from(swipeActionsTable).where(eq(swipeActionsTable.direction, "right")),
      db.select({ count: count() }).from(swipeActionsTable).where(gte(swipeActionsTable.createdAt, sevenDaysAgo)),
      db.select({ count: count() }).from(userProfilesTable).where(gte(userProfilesTable.createdAt, sevenDaysAgo)),
    ]);

    res.json({
      totalUsers: Number(totalUsersRow?.count ?? 0),
      totalJobs: Number(totalJobsRow?.count ?? 0),
      totalSwipes: Number(totalSwipesRow?.count ?? 0),
      totalSaved: Number(totalSavedRow?.count ?? 0),
      swipesLast7Days: Number(swipesLast7Row?.count ?? 0),
      newUsersLast7Days: Number(newUsersLast7Row?.count ?? 0),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/jobs/import", async (_req, res, next) => {
  try {
    let imported = 0;

    for (const mockCompany of MOCK_COMPANIES) {
      const existing = await db
        .select()
        .from(companiesTable)
        .where(eq(companiesTable.name, mockCompany.name))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(companiesTable).values(mockCompany);
      }
    }

    const companies = await db.select().from(companiesTable);
    const companyMap = Object.fromEntries(companies.map((c) => [c.name, c.id]));

    const mockCompanyNames = MOCK_COMPANIES.map((c) => c.name);

    for (let i = 0; i < MOCK_JOBS.length; i++) {
      const mockJob = MOCK_JOBS[i];
      const companyName = mockCompanyNames[i % mockCompanyNames.length];
      const companyId = companyMap[companyName];

      const existingJob = await db
        .select()
        .from(jobsTable)
        .where(sql`${jobsTable.title} = ${mockJob.title} AND ${jobsTable.companyId} = ${companyId}`)
        .limit(1);

      if (existingJob.length === 0) {
        await db.insert(jobsTable).values({
          ...mockJob,
          companyId,
          source: "import",
        });
        imported++;
      }
    }

    res.json({
      imported,
      message: `Successfully imported ${imported} jobs from mock feed`,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

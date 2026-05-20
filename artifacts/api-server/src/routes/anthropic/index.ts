import { Router } from "express";
import { db } from "@workspace/db";
import { conversations, messages, userDocumentsTable, jobsTable } from "@workspace/db";
import { eq, and, desc, asc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../../middlewares/requireAuth";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const BASE_CAREER_SYSTEM_PROMPT = `You are an expert career coach helping users get hired faster. You provide personalized, actionable advice on:
- Resume writing and ATS optimization
- Tailored cover letter generation
- Interview preparation and practice (behavioral, technical, case)
- Career path guidance and goal setting
- Salary negotiation strategies and market benchmarking
- LinkedIn profile optimization
- Job search strategy and networking

Be concise, warm, and encouraging. Lead with actionable advice. When helping craft documents (resumes, cover letters), always provide concrete examples, not just tips. Ask clarifying questions when needed to personalize your advice.`;

async function buildSystemPrompt(userId: number): Promise<string> {
  const docs = await db
    .select({
      name: userDocumentsTable.name,
      type: userDocumentsTable.type,
      extractedText: userDocumentsTable.extractedText,
    })
    .from(userDocumentsTable)
    .where(eq(userDocumentsTable.userId, userId));

  const docSections = docs
    .filter((d) => d.extractedText?.trim())
    .map(
      (d) =>
        `=== ${d.type.toUpperCase().replace(/_/g, " ")}: ${d.name} ===\n${d.extractedText!.slice(0, 8000)}`
    )
    .join("\n\n");

  if (!docSections) return BASE_CAREER_SYSTEM_PROMPT;

  return `${BASE_CAREER_SYSTEM_PROMPT}

--- USER'S UPLOADED DOCUMENTS ---
The user has provided the following documents. Use them to give highly personalised advice:

${docSections}
--- END OF DOCUMENTS ---`;
}

const router = Router();

router.get("/conversations", requireAuth, async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;
    const list = await db
      .select()
      .from(conversations)
      .where(eq(conversations.clerkId, userProfile.clerkId))
      .orderBy(desc(conversations.createdAt));
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.post("/conversations", requireAuth, async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;
    const { title } = req.body;
    const [conv] = await db
      .insert(conversations)
      .values({
        clerkId: userProfile.clerkId,
        title: title?.trim() || "New Conversation",
      })
      .returning();
    res.status(201).json(conv);
  } catch (err) {
    next(err);
  }
});

router.get("/conversations/:id", requireAuth, async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;
    const id = Number(req.params.id);
    const [conv] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.clerkId, userProfile.clerkId)))
      .limit(1);
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt));
    res.json({ ...conv, messages: msgs });
  } catch (err) {
    next(err);
  }
});

router.delete("/conversations/:id", requireAuth, async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;
    const id = Number(req.params.id);
    const [conv] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.clerkId, userProfile.clerkId)))
      .limit(1);
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    await db.delete(conversations).where(eq(conversations.id, id));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.get("/conversations/:id/messages", requireAuth, async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;
    const id = Number(req.params.id);
    const [conv] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.clerkId, userProfile.clerkId)))
      .limit(1);
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt));
    res.json(msgs);
  } catch (err) {
    next(err);
  }
});

router.post("/conversations/:id/messages", requireAuth, async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;
    const id = Number(req.params.id);
    const { content } = req.body;

    if (!content?.trim()) {
      res.status(400).json({ error: "content is required" });
      return;
    }

    const [conv] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.clerkId, userProfile.clerkId)))
      .limit(1);
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    await db.insert(messages).values({
      conversationId: id,
      role: "user",
      content: content.trim(),
    });

    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt));

    const chatMessages = history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const systemPrompt = await buildSystemPrompt(userProfile.id);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let fullResponse = "";

    try {
      const stream = anthropic.messages.stream({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: systemPrompt,
        messages: chatMessages,
      });

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          fullResponse += event.delta.text;
          res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
        }
      }

      await db.insert(messages).values({
        conversationId: id,
        role: "assistant",
        content: fullResponse || "I'm sorry, I couldn't generate a response. Please try again.",
      });
    } catch {
      res.write(`data: ${JSON.stringify({ error: "AI response failed" })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    next(err);
  }
});

router.post("/prepare-application", requireAuth, async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;
    const { jobId } = req.body;

    if (!jobId) {
      res.status(400).json({ error: "jobId is required" });
      return;
    }

    const [job] = await db
      .select()
      .from(jobsTable)
      .where(eq(jobsTable.id, Number(jobId)))
      .limit(1);

    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const docs = await db
      .select({
        name: userDocumentsTable.name,
        type: userDocumentsTable.type,
        extractedText: userDocumentsTable.extractedText,
      })
      .from(userDocumentsTable)
      .where(eq(userDocumentsTable.userId, userProfile.id));

    const resumeDocs = docs.filter((d) => d.extractedText?.trim());

    const docContext = resumeDocs.length
      ? resumeDocs
          .map(
            (d) =>
              `=== ${d.type.toUpperCase().replace(/_/g, " ")}: ${d.name} ===\n${d.extractedText!.slice(0, 6000)}`
          )
          .join("\n\n")
      : "No documents uploaded yet.";

    const jobContext = `
Job Title: ${job.title}
Company: ${job.companyId}
Location: ${job.location}
Job Type: ${job.jobType}
Experience Level: ${job.experienceLevel}
Description: ${job.fullDescription?.slice(0, 3000) ?? job.shortDescription}
`.trim();

    const prompt = `You are an expert career coach. Based on the candidate's documents and the job description below, generate:

1. A tailored cover letter (3–4 paragraphs, professional but warm, ATS-friendly)
2. A one-sentence summary of why this candidate is a strong fit
3. 3–5 key selling points to highlight in the application

USER'S DOCUMENTS:
${docContext}

JOB DESCRIPTION:
${jobContext}

Respond ONLY with valid JSON in this exact format:
{
  "coverLetter": "...",
  "summary": "...",
  "keyPoints": ["...", "...", "..."]
}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";

    let parsed: { coverLetter: string; summary: string; keyPoints: string[] };
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch?.[0] ?? raw);
    } catch {
      parsed = {
        coverLetter: raw,
        summary: "Could not parse summary.",
        keyPoints: [],
      };
    }

    res.json(parsed);
  } catch (err) {
    next(err);
  }
});

export default router;

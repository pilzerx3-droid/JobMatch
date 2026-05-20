import { Router } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq, and, desc, asc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../../middlewares/requireAuth";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const CAREER_SYSTEM_PROMPT = `You are an expert career coach helping users get hired faster. You provide personalized, actionable advice on:
- Resume writing and ATS optimization
- Tailored cover letter generation
- Interview preparation and practice (behavioral, technical, case)
- Career path guidance and goal setting
- Salary negotiation strategies and market benchmarking
- LinkedIn profile optimization
- Job search strategy and networking

Be concise, warm, and encouraging. Lead with actionable advice. When helping craft documents (resumes, cover letters), always provide concrete examples, not just tips. Ask clarifying questions when needed to personalize your advice.`;

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

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let fullResponse = "";

    try {
      const stream = anthropic.messages.stream({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: CAREER_SYSTEM_PROMPT,
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
    } catch (streamErr) {
      res.write(`data: ${JSON.stringify({ error: "AI response failed" })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    next(err);
  }
});

export default router;

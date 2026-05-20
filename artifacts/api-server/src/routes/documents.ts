import { Router } from "express";
import { db } from "@workspace/db";
import { userDocumentsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";
import { ObjectStorageService } from "../lib/objectStorage";

const router = Router();
const storageService = new ObjectStorageService();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;
    const docs = await db
      .select()
      .from(userDocumentsTable)
      .where(eq(userDocumentsTable.userId, userProfile.id))
      .orderBy(desc(userDocumentsTable.createdAt));
    res.json({ documents: docs });
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;
    const { name, type, objectPath, mimeType, sizeBytes } = req.body;

    if (!name?.trim() || !type || !objectPath?.trim()) {
      res.status(400).json({ error: "name, type, and objectPath are required" });
      return;
    }

    const [doc] = await db
      .insert(userDocumentsTable)
      .values({
        userId: userProfile.id,
        name: name.trim(),
        type,
        objectPath: objectPath.trim(),
        mimeType: mimeType || null,
        sizeBytes: sizeBytes || null,
      })
      .returning();

    extractTextAsync(doc.id, objectPath.trim(), mimeType).catch(() => {});

    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const { userProfile } = req as AuthRequest;
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db
      .delete(userDocumentsTable)
      .where(and(eq(userDocumentsTable.id, id), eq(userDocumentsTable.userId, userProfile.id)));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

async function extractTextAsync(docId: number, objectPath: string, mimeType?: string) {
  try {
    const file = await storageService.getObjectEntityFile(objectPath);
    const [buffer] = await file.download();

    let text = "";

    if (mimeType === "application/pdf") {
      const pdfParseModule = await import("pdf-parse");
      const pdfParse = pdfParseModule as unknown as (buf: Buffer) => Promise<{ text: string }>;
      const result = await pdfParse(buffer);
      text = result.text ?? "";
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value ?? "";
    } else if (mimeType?.startsWith("text/")) {
      text = buffer.toString("utf-8");
    }

    if (text.trim()) {
      await db
        .update(userDocumentsTable)
        .set({ extractedText: text.slice(0, 50000) })
        .where(eq(userDocumentsTable.id, docId));
    }
  } catch {
    // Text extraction is best-effort — failure is silent
  }
}

export default router;

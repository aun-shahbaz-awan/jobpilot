import { eq } from "drizzle-orm";
import { db } from "./db";
import { files } from "./db/schema";

export async function extractText(buffer: Buffer, filename: string): Promise<string> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      return (await parser.getText()).text.trim();
    } finally {
      await parser.destroy();
    }
  }
  if (lower.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    return (await mammoth.extractRawText({ buffer })).value.trim();
  }
  if (lower.endsWith(".txt") || lower.endsWith(".md")) return buffer.toString("utf8").trim();
  throw new Error("Upload a PDF, DOCX or TXT file.");
}

export async function saveResumeFile(name: string, mime: string, buffer: Buffer) {
  const row = { id: "resume", name, mime, data: buffer.toString("base64"), size: buffer.length, createdAt: Date.now() };
  await db.insert(files).values(row).onConflictDoUpdate({ target: files.id, set: row });
}

export async function getResumeFile() {
  const [row] = await db.select().from(files).where(eq(files.id, "resume"));
  return row ? { ...row, buffer: Buffer.from(row.data, "base64") } : null;
}

export async function resumeInfo() {
  const [row] = await db.select({ name: files.name, size: files.size, createdAt: files.createdAt }).from(files).where(eq(files.id, "resume"));
  return row ?? null;
}

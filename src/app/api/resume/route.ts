import { getResumeFile } from "@/lib/resume";

export async function GET() {
  const file = await getResumeFile();
  if (!file) return new Response("No CV uploaded", { status: 404 });
  return new Response(new Uint8Array(file.buffer), {
    headers: { "content-type": file.mime, "content-disposition": `inline; filename="${file.name.replace(/"/g, "")}"` },
  });
}

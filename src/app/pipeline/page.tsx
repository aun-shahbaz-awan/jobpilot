import { connection } from "next/server";
import { pipelineJobs } from "@/lib/queries";
import { Kanban } from "@/components/kanban";

export default async function Pipeline() {
  await connection();
  const cards = await pipelineJobs();
  return (
    <div>
      <header className="mb-5">
        <h1 className="text-3xl font-bold">Pipeline</h1>
        <p className="text-ink-2">Drag a card, or use its menu, to move it. Moving to Applied sets a follow-up date.</p>
      </header>
      <Kanban cards={cards} now={Date.now()} />
    </div>
  );
}

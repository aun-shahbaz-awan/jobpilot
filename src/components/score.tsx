import { scoreTone } from "@/lib/format";

const RING: Record<string, string> = { good: "var(--good)", mid: "var(--mid)", low: "var(--low)" };

/** Match score as a ring with the number inside. */
export function ScoreRing({ score, minScore = 60, size = 44 }: { score: number; minScore?: number; size?: number }) {
  const tone = scoreTone(score, minScore);
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Match score ${score} out of 100`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--sunken)" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={RING[tone]} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} />
      </svg>
      <span className="font-display absolute inset-0 flex items-center justify-center font-semibold tabular-nums" style={{ fontSize: size * 0.34 }}>
        {score}
      </span>
    </div>
  );
}

/**
 * One segment per skill the job asks for: solid when you have it, outlined when you don't.
 * Nice-to-have skills are shorter.
 */
export function SkillMeter({ matched, missing, required, nice, bonus }: { matched: string[]; missing: string[]; required: string[]; nice: string[]; bonus: string[] }) {
  const have = new Set(matched);
  const partialSet = new Set(required.filter((s) => !have.has(s) && !missing.includes(s)));
  const bonusSet = new Set(bonus);
  if (!required.length && !nice.length) return <span className="text-xs text-ink-3">No skills detected</span>;
  return (
    <div className="flex flex-wrap items-end gap-[3px]" aria-label={`${matched.length} of ${required.length} required skills`}>
      {required.map((s) => (
        <span
          key={s}
          title={`${s}: ${have.has(s) ? "you have it" : partialSet.has(s) ? "related experience" : "missing"}`}
          className="h-3 w-3 rounded-[3px] border"
          style={{
            background: have.has(s) ? "var(--good)" : partialSet.has(s) ? "var(--mid-soft)" : "transparent",
            borderColor: have.has(s) ? "var(--good)" : partialSet.has(s) ? "var(--mid)" : "var(--low)",
          }}
        />
      ))}
      {nice.length > 0 && <span className="mx-0.5 h-3 w-px bg-line" />}
      {nice.map((s) => (
        <span
          key={s}
          title={`${s} (nice to have): ${bonusSet.has(s) ? "you have it" : "missing"}`}
          className="h-2 w-2 rounded-[2px] border"
          style={{ background: bonusSet.has(s) ? "var(--good)" : "transparent", borderColor: bonusSet.has(s) ? "var(--good)" : "var(--low)" }}
        />
      ))}
    </div>
  );
}

export function SkillChips({ skills, tone }: { skills: string[]; tone: "good" | "missing" | "neutral" }) {
  const cls = tone === "good" ? "bg-good-soft text-good" : tone === "missing" ? "border border-dashed border-low text-ink-2" : "bg-sunken text-ink-2";
  return (
    <div className="flex flex-wrap gap-1">
      {skills.map((s) => (
        <span key={s} className={`chip ${cls}`}>
          {s}
        </span>
      ))}
    </div>
  );
}

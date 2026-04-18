export const STAGES = [
  {
    value: "stage_1_fyi",
    order: 1,
    label: "Stage 1 — Friendly FYI",
    description: "Warm, collaborative. No threats, no legal language.",
  },
  {
    value: "stage_2_formal_notice",
    order: 2,
    label: "Stage 2 — Formal Notice",
    description: "Professional. Cites by-law. Requests written response.",
  },
  {
    value: "stage_3_contravention_notice",
    order: 3,
    label: "Stage 3 — Contravention Notice",
    description: "BCCM Form 10 structure. Identifies contravention, requires remedy.",
  },
  {
    value: "stage_4_enforcement",
    order: 4,
    label: "Stage 4 — Enforcement / Dispute",
    description: "Notice of intent to lodge BCCM dispute or seek adjudication.",
  },
] as const;

export type StageValue = typeof STAGES[number]["value"];

export function stageLabel(v: string | null): string {
  return STAGES.find((s) => s.value === v)?.label ?? v ?? "";
}

export function stageOrder(v: string | null): number {
  return STAGES.find((s) => s.value === v)?.order ?? 0;
}

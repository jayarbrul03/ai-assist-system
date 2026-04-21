import { Scale } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Hidden-but-noticeable legal-lodgement warning.
 * Used on:
 *   - Stage 2+ formal communication drafts
 *   - Records request drafts
 *   - Investigation download cover
 *   - Case-file PDF footer (HTML variant)
 *
 * Small, italic, amber-tinted. Not dismissible. Consistent copy across the app.
 */
export function LegalLodgementWarning({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2 rounded-md border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-amber-900/85",
        compact ? "text-xs" : "text-[13px]",
        "italic",
        className,
      )}
    >
      <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
      <p className="leading-snug">
        General information only. Before any formal lodgement with the BCCM
        Commissioner, an adjudicator, or a tribunal, consult a legal specialist.
        Parity is not a law firm.
      </p>
    </div>
  );
}

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DISCLAIMER } from "@/lib/claude/prompts";

export function DisclaimerStrip({
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
        "flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900",
        compact ? "text-xs" : "text-sm",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className="leading-snug">{DISCLAIMER}</p>
    </div>
  );
}

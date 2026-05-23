import { STATUS_COLOR, STATUS_LABEL, type ChamadoStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: ChamadoStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STATUS_COLOR[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
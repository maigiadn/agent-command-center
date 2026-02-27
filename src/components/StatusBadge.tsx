import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = "active" | "inactive" | "error" | "success" | "running";

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-success/15 text-success border-success/30" },
  success: { label: "Success", className: "bg-success/15 text-success border-success/30" },
  running: { label: "Running", className: "bg-warning/15 text-warning border-warning/30" },
  inactive: { label: "Inactive", className: "bg-muted text-muted-foreground border-border" },
  error: { label: "Error", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

export function StatusBadge({ status }: { status: StatusType }) {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={cn("font-mono text-xs gap-1.5", config.className)}>
      <span
        className={cn("h-1.5 w-1.5 rounded-full", {
          "bg-success status-pulse": status === "active" || status === "success",
          "bg-warning status-pulse": status === "running",
          "bg-muted-foreground": status === "inactive",
          "bg-destructive": status === "error",
        })}
      />
      {config.label}
    </Badge>
  );
}

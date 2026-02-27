import { mockLogs } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, AlertTriangle } from "lucide-react";

export default function Logs() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Execution Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          History of all triggered workflow executions
        </p>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-mono text-xs">Workflow</TableHead>
              <TableHead className="font-mono text-xs">Status</TableHead>
              <TableHead className="font-mono text-xs hidden sm:table-cell">Duration</TableHead>
              <TableHead className="font-mono text-xs hidden md:table-cell">Details</TableHead>
              <TableHead className="font-mono text-xs text-right">Triggered</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockLogs.map((log) => (
              <TableRow key={log.id} className="hover:bg-accent/40">
                <TableCell className="font-medium">{log.webhookName}</TableCell>
                <TableCell>
                  <StatusBadge status={log.status} />
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground hidden sm:table-cell">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {log.duration}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground hidden md:table-cell max-w-xs truncate">
                  {log.message ? (
                    <span className="inline-flex items-center gap-1 text-destructive">
                      <AlertTriangle className="h-3 w-3" />
                      {log.message}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground font-mono">
                  {new Date(log.triggeredAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

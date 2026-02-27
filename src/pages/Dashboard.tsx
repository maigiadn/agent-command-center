import { useNavigate } from "react-router-dom";
import { mockWebhooks } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Play, Zap } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Webhook Registry</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage and trigger your n8n workflow endpoints
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Workflows", value: mockWebhooks.length, icon: Zap },
          { label: "Active", value: mockWebhooks.filter((w) => w.status === "active").length, icon: Zap },
          { label: "Errors", value: mockWebhooks.filter((w) => w.status === "error").length, icon: Zap },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border bg-card p-4 space-y-1"
          >
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              {stat.label}
            </p>
            <p className="text-2xl font-semibold font-mono text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-mono text-xs">Name</TableHead>
              <TableHead className="font-mono text-xs hidden md:table-cell">Description</TableHead>
              <TableHead className="font-mono text-xs">Status</TableHead>
              <TableHead className="font-mono text-xs hidden sm:table-cell">Last Run</TableHead>
              <TableHead className="font-mono text-xs text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockWebhooks.map((wh) => (
              <TableRow key={wh.id} className="hover:bg-accent/40">
                <TableCell className="font-medium">{wh.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm hidden md:table-cell max-w-xs truncate">
                  {wh.description}
                </TableCell>
                <TableCell>
                  <StatusBadge status={wh.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground font-mono hidden sm:table-cell">
                  {wh.lastRun
                    ? new Date(wh.lastRun).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                    onClick={() => navigate(`/execute?id=${wh.id}`)}
                    disabled={wh.status === "inactive"}
                  >
                    <Play className="h-3 w-3" />
                    Execute
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

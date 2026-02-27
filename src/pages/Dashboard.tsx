import { useState } from "react";
import { mockWebhooks, executeWorkflow } from "@/lib/api";
import type { Webhook, WorkflowResult } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Play, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

export default function Dashboard() {
  const [webhooks] = useState<Webhook[]>([...mockWebhooks]);
  const [runDialog, setRunDialog] = useState<Webhook | null>(null);
  const [inputData, setInputData] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WorkflowResult | null>(null);

  const openRun = (wh: Webhook) => {
    setRunDialog(wh);
    setInputData("");
    setResult(null);
  };

  const handleRun = async () => {
    if (!runDialog) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await executeWorkflow(runDialog.id, inputData || undefined);
      setResult(res);
    } catch {
      setResult({ success: false, error: "Unexpected error" });
    } finally {
      setLoading(false);
    }
  };

  const formatLastRun = (date?: string) => {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ngày trước`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Workflows</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Chọn workflow và nhấn "Chạy" để kích hoạt
        </p>
      </div>

      {/* Workflow cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {webhooks.map((wh) => (
          <div
            key={wh.id}
            className="rounded-lg border border-border bg-card p-5 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium text-foreground leading-tight">{wh.name}</h3>
              <StatusBadge status={wh.status} />
            </div>
            <p className="text-sm text-muted-foreground flex-1 line-clamp-2">
              {wh.description}
            </p>
            <div className="flex items-center justify-between mt-auto pt-2">
              {wh.lastRun ? (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatLastRun(wh.lastRun)}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Chưa chạy</span>
              )}
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => openRun(wh)}
                disabled={wh.status === "inactive"}
              >
                <Play className="h-3 w-3" />
                Chạy
              </Button>
            </div>
          </div>
        ))}
        {webhooks.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-12">
            Chưa có workflow nào. Vào Settings để thêm.
          </div>
        )}
      </div>

      {/* Run dialog */}
      <Dialog open={!!runDialog} onOpenChange={(open) => !open && setRunDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Chạy: {runDialog?.name}</DialogTitle>
            <DialogDescription>{runDialog?.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Input area */}
            {!result && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm">Dữ liệu đầu vào (JSON, tùy chọn)</Label>
                  <Textarea
                    value={inputData}
                    onChange={(e) => setInputData(e.target.value)}
                    placeholder='{"key": "value"}'
                    className="font-mono text-sm min-h-[80px]"
                    disabled={loading}
                  />
                </div>
                <Button
                  onClick={handleRun}
                  disabled={loading}
                  className="w-full gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang chạy...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Chạy Workflow
                    </>
                  )}
                </Button>
              </>
            )}

            {/* Result display */}
            {result && (
              <div className="space-y-3">
                <div
                  className={`flex items-center gap-2 p-3 rounded-lg ${
                    result.success
                      ? "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {result.success ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 shrink-0" />
                  )}
                  <span className="font-medium text-sm">
                    {result.success ? "Thành công" : "Lỗi"}
                  </span>
                  {result.duration && (
                    <span className="ml-auto text-xs opacity-70">{result.duration}</span>
                  )}
                </div>

                {/* Response body */}
                <div className="rounded-lg border border-border bg-muted/50 p-3 max-h-[300px] overflow-auto">
                  <pre className="text-xs font-mono whitespace-pre-wrap break-words text-foreground">
                    {result.error
                      ? result.error
                      : JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setResult(null)}
                  className="w-full"
                >
                  Chạy lại
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

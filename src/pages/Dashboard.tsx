import { useState, useEffect } from "react";
import { fetchWebhooks, executeWorkflow } from "@/lib/api";
import type { Webhook, WorkflowResult } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Play, Loader2, CheckCircle2, XCircle, Clock, Plus, Trash2 } from "lucide-react";

export default function Dashboard() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [runDialog, setRunDialog] = useState<Webhook | null>(null);
  const [keyValuePairs, setKeyValuePairs] = useState<{ key: string, value: string }[]>([{ key: "", value: "" }]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WorkflowResult | null>(null);

  // Load webhooks from backend on mount
  const loadWebhooks = async () => {
    const res = await fetchWebhooks();
    if (res.data) setWebhooks(res.data);
  };

  useEffect(() => {
    loadWebhooks();
  }, []);

  const openRun = (wh: Webhook) => {
    setRunDialog(wh);
    setKeyValuePairs([{ key: "", value: "" }]);
    setResult(null);
  };

  const handleRun = async () => {
    if (!runDialog) return;
    setLoading(true);
    setResult(null);
    try {
      const payloadObj: Record<string, any> = {};
      keyValuePairs.forEach(({ key, value }) => {
        if (key.trim()) {
          let parsedValue: any = value;
          try {
            // only try to parse if it's likely an object, array, boolean, number, or null
            const trimmed = value.trim();
            if (
              trimmed.startsWith("{") ||
              trimmed.startsWith("[") ||
              trimmed === "true" ||
              trimmed === "false" ||
              trimmed === "null" ||
              !isNaN(Number(trimmed))
            ) {
              parsedValue = JSON.parse(value);
            }
          } catch (e) {
            // fallback to string
          }
          payloadObj[key.trim()] = parsedValue;
        }
      });
      const inputData = Object.keys(payloadObj).length > 0 ? JSON.stringify(payloadObj) : undefined;

      const res = await executeWorkflow(runDialog.id, inputData);
      setResult(res);
      // Refresh webhooks to update lastRun timestamp
      await loadWebhooks();
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
                <div className="space-y-4">
                  <Label className="text-sm">Dữ liệu đầu vào (Tùy chọn)</Label>
                  <div className="space-y-2">
                    {keyValuePairs.map((pair, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <Input
                          placeholder="Key (VD: prompt)"
                          value={pair.key}
                          onChange={(e) => {
                            const newPairs = [...keyValuePairs];
                            newPairs[index].key = e.target.value;
                            setKeyValuePairs(newPairs);
                          }}
                          className="flex-1 font-mono text-sm"
                          disabled={loading}
                        />
                        <Textarea
                          placeholder="Value (Văn bản hoặc JSON)"
                          value={pair.value}
                          onChange={(e) => {
                            const newPairs = [...keyValuePairs];
                            newPairs[index].value = e.target.value;
                            setKeyValuePairs(newPairs);
                          }}
                          className="flex-1 font-mono text-sm min-h-[40px] max-h-[200px]"
                          disabled={loading}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newPairs = keyValuePairs.filter((_, i) => i !== index);
                            setKeyValuePairs(newPairs);
                          }}
                          disabled={loading || (keyValuePairs.length === 1 && !keyValuePairs[0].key)}
                          className="text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setKeyValuePairs([...keyValuePairs, { key: "", value: "" }])}
                    disabled={loading}
                    className="w-full gap-2 border-dashed"
                  >
                    <Plus className="h-4 w-4" />
                    Thêm trường
                  </Button>
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
                  className={`flex items-center gap-2 p-3 rounded-lg ${result.success
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

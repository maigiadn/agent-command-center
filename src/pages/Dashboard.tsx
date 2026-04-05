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
  const [keyValuePairs, setKeyValuePairs] = useState<{ key: string, value: string, isDefault?: boolean }[]>([{ key: "", value: "" }]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WorkflowResult | null>(null);

  // Project grouping state
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

    // Initialize with default keys if they exist, otherwise a single empty row
    if (wh.defaultKeys && wh.defaultKeys.length > 0) {
      setKeyValuePairs(wh.defaultKeys.map(k => ({ key: k, value: "", isDefault: true })));
    } else {
      setKeyValuePairs([{ key: "", value: "" }]);
    }

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

  // Extract unique projects
  const projects = Array.from(new Set(webhooks.map(wh => wh.project || "Mặc định"))).sort();

  // Set default selected project
  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0]);
    }
  }, [projects, selectedProject]);

  // Filter webhooks
  const filteredWebhooks = webhooks.filter(wh => {
    const projectMatch = selectedProject === null || (wh.project || "Mặc định") === selectedProject;
    const searchMatch = searchQuery === "" ||
      wh.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wh.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return projectMatch && searchMatch;
  });

  return (
    <div className="flex flex-col gap-4 md:gap-6 h-[calc(100vh-7rem)] md:h-[calc(100vh-8rem)]">
      {/* Sidebar for Projects - horizontal scroll on mobile, vertical sidebar on desktop */}
      <div className="md:hidden shrink-0">
        <h2 className="text-base font-semibold tracking-tight mb-2">Dự án</h2>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {projects.map(project => (
            <button
              key={project}
              onClick={() => setSelectedProject(project)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm transition-colors ${selectedProject === project
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
            >
              {project}
              <span className="ml-1.5 text-xs opacity-70">
                {webhooks.filter(w => (w.project || "Mặc định") === project).length}
              </span>
            </button>
          ))}
          {projects.length === 0 && (
            <div className="text-sm text-muted-foreground italic">Không có dự án</div>
          )}
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Sidebar for Projects - desktop only */}
        <div className="hidden md:flex w-64 shrink-0 flex-col gap-2">
          <h2 className="text-lg font-semibold tracking-tight px-2">Dự án</h2>
          <div className="flex-1 overflow-y-auto space-y-1 pr-2">
            {projects.map(project => (
              <button
                key={project}
                onClick={() => setSelectedProject(project)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedProject === project
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
              >
                {project}
                <span className="ml-2 rtl:mr-2 text-xs opacity-70 float-right">
                  {webhooks.filter(w => (w.project || "Mặc định") === project).length}
                </span>
              </button>
            ))}
            {projects.length === 0 && (
              <div className="text-sm text-muted-foreground px-2 italic">Không có dự án</div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col space-y-4 md:space-y-6 overflow-hidden">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Workflows</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Chọn workflow và nhấn "Chạy" để kích hoạt
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Tìm kiếm workflow..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:max-w-md"
            />
          </div>

          {/* Workflow cards */}
          <div className="flex-1 overflow-y-auto pr-0 md:pr-2 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {filteredWebhooks.map((wh) => (
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
            {filteredWebhooks.length === 0 && webhooks.length > 0 && (
              <div className="col-span-full text-center text-muted-foreground py-12">
                Không tìm thấy workflow nào phù hợp.
              </div>
            )}
            {webhooks.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground py-12">
                Chưa có workflow nào. Vào Settings để thêm.
              </div>
            )}
            </div>
          </div>
        </div>
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
                            if (pair.isDefault) return;
                            const newPairs = [...keyValuePairs];
                            newPairs[index].key = e.target.value;
                            setKeyValuePairs(newPairs);
                          }}
                          className={`flex-1 font-mono text-sm ${pair.isDefault ? "bg-muted text-muted-foreground" : ""}`}
                          disabled={loading || pair.isDefault}
                          readOnly={pair.isDefault}
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
                          disabled={loading || pair.isDefault || (keyValuePairs.length === 1 && !keyValuePairs[0].key)}
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

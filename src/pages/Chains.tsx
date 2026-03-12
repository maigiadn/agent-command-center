import { useState, useEffect } from "react";
import {
  fetchChains, createChain, updateChain, deleteChain, fetchPrompts,
} from "@/lib/api";
import type { Chain, Prompt } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Pencil, Trash2, ArrowRight, Link2, GripVertical,
  Copy, Check, ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Helpers ────────────────────────────────────────────────────
function extractVariables(content: string): string[] {
  const matches = content.match(/\[([^\]]+)\]/g);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.slice(1, -1)))];
}

function renderPrompt(content: string, values: Record<string, string>): string {
  let result = content;
  Object.entries(values).forEach(([key, value]) => {
    result = result.split(`[${key}]`).join(value || `[${key}]`);
  });
  return result;
}

interface StepForm {
  promptId: string;
  outputVariable: string;
}

export default function Chains() {
  const { toast } = useToast();
  const [chains, setChains] = useState<Chain[]>([]);
  const [allPrompts, setAllPrompts] = useState<Prompt[]>([]);
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Expandable step state
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [stepVarValues, setStepVarValues] = useState<Record<string, Record<string, string>>>({});
  const [copiedStepId, setCopiedStepId] = useState<string | null>(null);

  // Form
  const [form, setForm] = useState({ name: "", description: "" });
  const [steps, setSteps] = useState<StepForm[]>([]);
  const [saving, setSaving] = useState(false);

  // ─── Load Data ─────────────────────────────────────────────
  const loadChains = async () => {
    const res = await fetchChains();
    if (res.data) setChains(res.data);
  };

  const loadPrompts = async () => {
    const res = await fetchPrompts();
    if (res.data) setAllPrompts(res.data);
  };

  useEffect(() => { loadChains(); loadPrompts(); }, []);

  // ─── Dialog Handlers ───────────────────────────────────────
  const openAdd = () => {
    setEditingId(null);
    setForm({ name: "", description: "" });
    setSteps([{ promptId: "", outputVariable: "" }]);
    setDialogOpen(true);
  };

  const openEdit = (chain: Chain) => {
    setEditingId(chain.id);
    setForm({ name: chain.name, description: chain.description });
    setSteps(chain.steps.map(s => ({ promptId: s.promptId, outputVariable: s.outputVariable })));
    setDialogOpen(true);
  };

  const addStep = () => {
    setSteps(prev => [...prev, { promptId: "", outputVariable: "" }]);
  };

  const removeStep = (index: number) => {
    setSteps(prev => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: keyof StepForm, value: string) => {
    setSteps(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= steps.length) return;
    setSteps(prev => {
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Lỗi", description: "Tên chuỗi là bắt buộc", variant: "destructive" });
      return;
    }
    const validSteps = steps.filter(s => s.promptId);
    if (validSteps.length === 0) {
      toast({ title: "Lỗi", description: "Cần ít nhất 1 bước", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: form.name,
        description: form.description,
        steps: validSteps.map((s, i) => ({
          promptId: s.promptId,
          order: i + 1,
          outputVariable: s.outputVariable,
        })),
      };

      if (editingId) {
        await updateChain(editingId, body);
        toast({ title: "Đã cập nhật chuỗi" });
      } else {
        await createChain(body);
        toast({ title: "Đã tạo chuỗi mới" });
      }
      await loadChains();
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteChain(deleteId);
    toast({ title: "Đã xoá chuỗi" });
    if (selectedChain?.id === deleteId) setSelectedChain(null);
    await loadChains();
    setDeleteId(null);
  };

  const getPromptName = (promptId: string) => {
    return allPrompts.find(p => p.id === promptId)?.name || promptId;
  };

  const getPromptContent = (promptId: string) => {
    return allPrompts.find(p => p.id === promptId)?.content || "";
  };

  const toggleStep = (stepId: string, promptId: string) => {
    if (expandedStepId === stepId) {
      setExpandedStepId(null);
    } else {
      setExpandedStepId(stepId);
      // Initialize variable values for this step if not already done
      if (!stepVarValues[stepId]) {
        const content = getPromptContent(promptId);
        const vars = extractVariables(content);
        const values: Record<string, string> = {};
        vars.forEach(v => { values[v] = ""; });
        setStepVarValues(prev => ({ ...prev, [stepId]: values }));
      }
    }
  };

  const updateStepVar = (stepId: string, varName: string, value: string) => {
    setStepVarValues(prev => ({
      ...prev,
      [stepId]: { ...(prev[stepId] || {}), [varName]: value },
    }));
  };

  const copyStepPrompt = async (stepId: string, promptId: string) => {
    const content = getPromptContent(promptId);
    const values = stepVarValues[stepId] || {};
    const rendered = renderPrompt(content, values);
    await navigator.clipboard.writeText(rendered);
    setCopiedStepId(stepId);
    setTimeout(() => setCopiedStepId(null), 2000);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 overflow-hidden rounded-lg border border-border">
      {/* ═══ Left: Chain List ═══ */}
      <div className="w-80 shrink-0 border-r border-border flex flex-col bg-card/50">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold">Chuỗi Prompt</h2>
          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={openAdd}>
            <Plus className="h-3 w-3" /> Tạo chuỗi
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {chains.map(chain => (
              <button
                key={chain.id}
                onClick={() => setSelectedChain(chain)}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  selectedChain?.id === chain.id
                    ? "bg-primary/10 border border-primary/30 shadow-sm"
                    : "hover:bg-muted border border-transparent"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-medium text-sm line-clamp-1">{chain.name}</span>
                    {chain.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{chain.description}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {chain.steps.length} bước
                  </Badge>
                </div>
              </button>
            ))}
            {chains.length === 0 && (
              <div className="text-center text-muted-foreground py-12 text-sm">
                Chưa có chuỗi prompt nào.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ═══ Right: Chain Detail ═══ */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {selectedChain ? (
          <>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{selectedChain.name}</h2>
                {selectedChain.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedChain.description}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => openEdit(selectedChain)}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" /> Sửa
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(selectedChain.id)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Xoá
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3 max-w-2xl mx-auto">
                {selectedChain.steps.map((step, index) => {
                  const isExpanded = expandedStepId === step.id;
                  const promptContent = getPromptContent(step.promptId);
                  const vars = extractVariables(promptContent);
                  const values = stepVarValues[step.id] || {};
                  const isCopied = copiedStepId === step.id;

                  return (
                    <div key={step.id}>
                      <div className={`rounded-lg border transition-all ${
                        isExpanded
                          ? "border-primary/40 bg-card shadow-md"
                          : "border-border bg-card/50 hover:border-primary/20 hover:bg-card/80 cursor-pointer"
                      }`}>
                        {/* Step Header — always visible, clickable */}
                        <button
                          onClick={() => toggleStep(step.id, step.promptId)}
                          className="w-full text-left p-4 flex items-center gap-3"
                        >
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm shrink-0 transition-colors ${
                            isExpanded ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {step.promptName || getPromptName(step.promptId)}
                            </p>
                            {step.outputVariable && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Biến đầu ra: <span className="font-mono text-primary">{step.outputVariable}</span>
                              </p>
                            )}
                          </div>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`} />
                        </button>

                        {/* Expanded Content */}
                        {isExpanded && promptContent && (
                          <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
                            {/* Prompt content with highlighted variables */}
                            <div className="rounded-lg bg-muted/50 border border-border p-3">
                              <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                                {promptContent.split(/(\[[^\]]+\])/).map((part, i) =>
                                  part.match(/^\[.+\]$/) ? (
                                    <span key={i} className="bg-primary/20 text-primary px-1 rounded font-semibold">{part}</span>
                                  ) : (
                                    <span key={i}>{part}</span>
                                  )
                                )}
                              </pre>
                            </div>

                            {/* Variable inputs */}
                            {vars.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Điền biến số</p>
                                {vars.map(v => (
                                  <div key={v} className="flex items-center gap-2">
                                    <Label className="text-xs font-mono w-28 shrink-0 text-muted-foreground">[{v}]</Label>
                                    <Input
                                      value={values[v] || ""}
                                      onChange={(e) => updateStepVar(step.id, v, e.target.value)}
                                      placeholder={`Nhập ${v}...`}
                                      className="text-sm h-8 font-mono"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Rendered preview (if any var is filled) */}
                            {vars.length > 0 && Object.values(values).some(v => v.trim()) && (
                              <div className="rounded-lg bg-background border border-primary/20 p-3">
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Kết quả</p>
                                <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed text-foreground">
                                  {renderPrompt(promptContent, values)}
                                </pre>
                              </div>
                            )}

                            {/* Copy button */}
                            <Button
                              size="sm"
                              variant={isCopied ? "secondary" : "default"}
                              className="gap-1.5 w-full"
                              onClick={() => copyStepPrompt(step.id, step.promptId)}
                            >
                              {isCopied ? (
                                <><Check className="h-3.5 w-3.5 text-green-500" /> Đã copy!</>
                              ) : (
                                <><Copy className="h-3.5 w-3.5" /> Copy Prompt</>
                              )}
                            </Button>
                          </div>
                        )}

                        {/* No prompt content message */}
                        {isExpanded && !promptContent && (
                          <div className="px-4 pb-4 border-t border-border/50 pt-3">
                            <p className="text-sm text-muted-foreground italic">Prompt này không có nội dung hoặc đã bị xoá.</p>
                          </div>
                        )}
                      </div>

                      {index < selectedChain.steps.length - 1 && (
                        <div className="flex justify-center py-1">
                          <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <Link2 className="h-12 w-12 mx-auto opacity-20" />
              <p className="text-sm">Chọn một chuỗi để xem chi tiết</p>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Create/Edit Dialog ═══ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Sửa chuỗi" : "Tạo chuỗi mới"}</DialogTitle>
            <DialogDescription>Nối nhiều prompt thành một quy trình tự động.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Tên chuỗi *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="VD: Chuỗi viết content SEO"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mô tả</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Mô tả quy trình..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Các bước</Label>
                <Button variant="outline" size="sm" onClick={addStep} className="h-7 gap-1 text-xs">
                  <Plus className="h-3 w-3" /> Thêm bước
                </Button>
              </div>
              <div className="space-y-2">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveStep(index, -1)}
                        disabled={index === 0}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveStep(index, 1)}
                        disabled={index === steps.length - 1}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
                      >
                        ▼
                      </button>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground w-5 text-center">{index + 1}</span>
                    <select
                      value={step.promptId}
                      onChange={(e) => updateStep(index, "promptId", e.target.value)}
                      className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="">— Chọn prompt —</option>
                      {allPrompts.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <Input
                      value={step.outputVariable}
                      onChange={(e) => updateStep(index, "outputVariable", e.target.value)}
                      placeholder="Biến ra"
                      className="w-24 h-8 text-xs font-mono"
                    />
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive"
                      onClick={() => removeStep(index)}
                      disabled={steps.length === 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Huỷ</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Đang lưu..." : editingId ? "Lưu" : "Tạo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá chuỗi prompt?</AlertDialogTitle>
            <AlertDialogDescription>Hành động này không thể hoàn tác.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Xoá</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

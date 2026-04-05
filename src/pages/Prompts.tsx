import { useState, useEffect, useMemo } from "react";
import {
  fetchFolders, createFolder, updateFolder, deleteFolder,
  fetchPrompts, createPrompt, updatePrompt, deletePrompt, toggleFavorite,
  fetchVersions, restoreVersion,
  logUsage, fetchUsageLogs, fetchTags,
  exportBackup, importBackup,
} from "@/lib/api";
import type { PromptFolder, Prompt, PromptVersion, PromptUsageLog } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Pencil, Trash2, FolderPlus, Star, Copy, Check,
  Search, Tag, History, BarChart3, Heart, Download, Upload,
  ChevronRight, FileText, Sparkles, X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft } from "lucide-react";

// ─── Helper: extract variables from prompt content ─────────────
function extractVariables(content: string): string[] {
  const matches = content.match(/\[([^\]]+)\]/g);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.slice(1, -1)))];
}

// ─── Helper: render prompt with variable values ─────────────────
function renderPrompt(content: string, values: Record<string, string>): string {
  let result = content;
  Object.entries(values).forEach(([key, value]) => {
    result = result.split(`[${key}]`).join(value || `[${key}]`);
  });
  return result;
}

// ─── Star Rating Component ──────────────────────────────────────
function StarRating({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => !readonly && onChange?.(i)}
          className={`${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"} transition-transform`}
          disabled={readonly}
        >
          <Star
            className={`h-4 w-4 ${i <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
          />
        </button>
      ))}
    </div>
  );
}

export default function Prompts() {
  const { toast } = useToast();

  // ─── State ─────────────────────────────────────────────────
  const [folders, setFolders] = useState<PromptFolder[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Mobile navigation state
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<'folders' | 'prompts' | 'details'>('folders');

  // Dialogs
  const [folderDialog, setFolderDialog] = useState(false);
  const [promptDialog, setPromptDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ type: "folder" | "prompt"; id: string } | null>(null);
  const [runMode, setRunMode] = useState(false);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [renderedResult, setRenderedResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Version history
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [usageLogs, setUsageLogs] = useState<PromptUsageLog[]>([]);

  // Forms
  const [folderForm, setFolderForm] = useState({ name: "", description: "" });
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [promptForm, setPromptForm] = useState({ name: "", content: "", tags: "" as string, folderId: null as string | null, changeNote: "" });
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);

  // Usage rating
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingNote, setRatingNote] = useState("");

  const [saving, setSaving] = useState(false);

  // ─── Load Data ─────────────────────────────────────────────
  const loadFolders = async () => {
    const res = await fetchFolders();
    if (res.data) setFolders(res.data);
  };

  const loadPrompts = async () => {
    const params: { folderId?: string; search?: string; tag?: string } = {};
    if (selectedFolderId) params.folderId = selectedFolderId;
    if (searchQuery) params.search = searchQuery;
    if (selectedTag) params.tag = selectedTag;
    const res = await fetchPrompts(params);
    if (res.data) {
      setPrompts(res.data);
      // Auto-switch to prompts view on mobile when a folder is selected
      if (isMobile && selectedFolderId && mobileView === 'folders') {
        setMobileView('prompts');
      }
    }
  };

  const loadTags = async () => {
    const res = await fetchTags();
    if (res.data) setAllTags(res.data);
  };

  useEffect(() => { loadFolders(); loadTags(); }, []);
  useEffect(() => { loadPrompts(); }, [selectedFolderId, searchQuery, selectedTag]);

  const loadPromptDetails = async (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setRunMode(false);
    setRenderedResult(null);
    const [versRes, usageRes] = await Promise.all([
      fetchVersions(prompt.id),
      fetchUsageLogs(prompt.id),
    ]);
    if (versRes.data) setVersions(versRes.data);
    if (usageRes.data) setUsageLogs(usageRes.data);
    
    // Auto-switch to details view on mobile
    if (isMobile) {
      setMobileView('details');
    }
  };

  // ─── Folder CRUD ───────────────────────────────────────────
  const openAddFolder = () => {
    setEditingFolderId(null);
    setFolderForm({ name: "", description: "" });
    setFolderDialog(true);
  };

  const openEditFolder = (f: PromptFolder) => {
    setEditingFolderId(f.id);
    setFolderForm({ name: f.name, description: f.description });
    setFolderDialog(true);
  };

  const handleSaveFolder = async () => {
    if (!folderForm.name.trim()) {
      toast({ title: "Lỗi", description: "Tên thư mục là bắt buộc", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editingFolderId) {
        await updateFolder(editingFolderId, folderForm);
        toast({ title: "Đã cập nhật thư mục" });
      } else {
        await createFolder(folderForm);
        toast({ title: "Đã tạo thư mục mới" });
      }
      await loadFolders();
      setFolderDialog(false);
    } finally {
      setSaving(false);
    }
  };

  // ─── Prompt CRUD ───────────────────────────────────────────
  const openAddPrompt = () => {
    setEditingPromptId(null);
    setPromptForm({ name: "", content: "", tags: "", folderId: selectedFolderId, changeNote: "" });
    setPromptDialog(true);
  };

  const openEditPrompt = (p: Prompt) => {
    setEditingPromptId(p.id);
    setPromptForm({
      name: p.name,
      content: p.content,
      tags: p.tags.join(", "),
      folderId: p.folderId,
      changeNote: "",
    });
    setPromptDialog(true);
  };

  const handleSavePrompt = async () => {
    if (!promptForm.name.trim()) {
      toast({ title: "Lỗi", description: "Tên prompt là bắt buộc", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const tags = promptForm.tags.split(",").map(t => t.trim()).filter(Boolean);
      if (editingPromptId) {
        const res = await updatePrompt(editingPromptId, {
          name: promptForm.name,
          content: promptForm.content,
          tags,
          folderId: promptForm.folderId,
          changeNote: promptForm.changeNote,
        });
        if (res.data) {
          toast({ title: "Đã cập nhật prompt" });
          await loadPromptDetails(res.data);
        }
      } else {
        const res = await createPrompt({
          name: promptForm.name,
          content: promptForm.content,
          tags,
          folderId: promptForm.folderId,
        });
        if (res.data) {
          toast({ title: "Đã tạo prompt mới" });
          setSelectedPrompt(res.data);
        }
      }
      await loadPrompts();
      await loadTags();
      setPromptDialog(false);
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteDialog) return;
    if (deleteDialog.type === "folder") {
      await deleteFolder(deleteDialog.id);
      toast({ title: "Đã xoá thư mục" });
      if (selectedFolderId === deleteDialog.id) setSelectedFolderId(null);
    } else {
      await deletePrompt(deleteDialog.id);
      toast({ title: "Đã xoá prompt" });
      if (selectedPrompt?.id === deleteDialog.id) setSelectedPrompt(null);
    }
    await loadFolders();
    await loadPrompts();
    setDeleteDialog(null);
  };

  // ─── Run Prompt ────────────────────────────────────────────
  const startRun = () => {
    if (!selectedPrompt) return;
    const vars = extractVariables(selectedPrompt.content);
    const values: Record<string, string> = {};
    vars.forEach(v => { values[v] = ""; });
    setVariableValues(values);
    setRenderedResult(null);
    setRunMode(true);
    setRatingValue(0);
    setRatingNote("");
  };

  const executeRun = () => {
    if (!selectedPrompt) return;
    const rendered = renderPrompt(selectedPrompt.content, variableValues);
    setRenderedResult(rendered);
  };

  const copyResult = async () => {
    if (!renderedResult) return;
    await navigator.clipboard.writeText(renderedResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submitRating = async () => {
    if (!selectedPrompt) return;
    await logUsage(selectedPrompt.id, {
      rating: ratingValue,
      note: ratingNote,
      resultPreview: renderedResult?.substring(0, 200) || "",
    });
    toast({ title: "Đã lưu đánh giá" });
    await loadPrompts();
    const [usageRes] = await Promise.all([fetchUsageLogs(selectedPrompt.id)]);
    if (usageRes.data) setUsageLogs(usageRes.data);
    // Refresh selected prompt
    const res = await fetchPrompts({ folderId: selectedFolderId || undefined });
    if (res.data) {
      setPrompts(res.data);
      const updated = res.data.find(p => p.id === selectedPrompt.id);
      if (updated) setSelectedPrompt(updated);
    }
    setRatingValue(0);
    setRatingNote("");
  };

  // ─── Version Restore ──────────────────────────────────────
  const handleRestore = async (versionId: string) => {
    if (!selectedPrompt) return;
    const res = await restoreVersion(selectedPrompt.id, versionId);
    if (res.data) {
      toast({ title: "Đã khôi phục phiên bản" });
      await loadPrompts();
      await loadPromptDetails(res.data);
    }
  };

  // ─── Favorite ──────────────────────────────────────────────
  const handleToggleFavorite = async (p: Prompt) => {
    const res = await toggleFavorite(p.id);
    if (res.data) {
      await loadPrompts();
      if (selectedPrompt?.id === p.id) setSelectedPrompt(res.data);
    }
  };

  // ─── Backup ────────────────────────────────────────────────
  const handleExport = async () => {
    const res = await exportBackup();
    if (res.data) {
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prompt-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Đã xuất backup" });
    }
  };

  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const res = await importBackup(json.data || json);
        if (res.data) {
          toast({ title: "Nhập thành công", description: `Đã nhập ${Object.values(res.data.imported).reduce((a, b) => a + b, 0)} mục` });
          await loadFolders();
          await loadPrompts();
          await loadTags();
        }
      } catch {
        toast({ title: "Lỗi", description: "File JSON không hợp lệ", variant: "destructive" });
      }
    };
    input.click();
  };

  // ─── Computed ──────────────────────────────────────────────
  const variables = useMemo(() => {
    if (!selectedPrompt) return [];
    return extractVariables(selectedPrompt.content);
  }, [selectedPrompt]);

  const folderPromptCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    prompts.forEach(p => {
      const fid = p.folderId || "__none__";
      counts[fid] = (counts[fid] || 0) + 1;
    });
    return counts;
  }, [prompts]);

  return (
    <div className="flex h-[calc(100vh-7rem)] md:h-[calc(100vh-8rem)] gap-0 overflow-hidden rounded-lg border border-border">
      {/* ═══ Left: Folders Sidebar ═══ */}
      <div className={`${isMobile && mobileView !== 'folders' ? 'hidden' : 'flex'} w-full md:w-64 shrink-0 border-r border-border bg-card/50 flex-col`}>
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-foreground">Thư mục</h2>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleImport} title="Nhập backup">
                <Upload className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleExport} title="Xuất backup">
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={openAddFolder} title="Thêm thư mục">
                <FolderPlus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Tìm prompt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {/* All prompts */}
            <button
              onClick={() => setSelectedFolderId(null)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                !selectedFolderId
                  ? "bg-primary text-primary-foreground font-medium"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate flex-1">Tất cả</span>
            </button>

            {folders.map(f => (
              <div key={f.id} className="group relative">
                <button
                  onClick={() => setSelectedFolderId(f.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                    selectedFolderId === f.id
                      ? "bg-primary text-primary-foreground font-medium"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${selectedFolderId === f.id ? "rotate-90" : ""}`} />
                  <span className="truncate flex-1">{f.name}</span>
                </button>
                <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-0.5">
                  <button onClick={() => openEditFolder(f)} className="p-1 rounded hover:bg-accent">
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </button>
                  <button onClick={() => setDeleteDialog({ type: "folder", id: f.id })} className="p-1 rounded hover:bg-destructive/10">
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Tags section */}
          {allTags.length > 0 && (
            <div className="p-3 border-t border-border">
              <div className="flex items-center gap-1.5 mb-2">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tags</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {allTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTag === tag ? "default" : "secondary"}
                    className="cursor-pointer text-[10px] px-1.5 py-0"
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ═══ Center: Prompt List ═══ */}
      <div className={`${isMobile && mobileView !== 'prompts' ? 'hidden' : 'flex'} w-full md:w-80 shrink-0 border-r border-border flex-col bg-background`}>
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isMobile && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileView('folders')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <h2 className="text-sm font-semibold text-foreground">
              Prompts
              {selectedTag && <span className="ml-1 text-xs font-normal text-muted-foreground">• #{selectedTag}</span>}
            </h2>
          </div>
          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={openAddPrompt}>
            <Plus className="h-3 w-3" /> Thêm
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {prompts.map(p => (
              <button
                key={p.id}
                onClick={() => loadPromptDetails(p)}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  selectedPrompt?.id === p.id
                    ? "bg-primary/10 border border-primary/30 shadow-sm"
                    : "hover:bg-muted border border-transparent"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-sm leading-tight line-clamp-1">{p.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleFavorite(p); }}
                    className="shrink-0 mt-0.5"
                  >
                    <Heart className={`h-3.5 w-3.5 ${p.isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground/40 hover:text-red-400"}`} />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.content}</p>
                <div className="flex items-center gap-2 mt-2">
                  {p.tags.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                      {tag}
                    </Badge>
                  ))}
                  <div className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground">
                    {p.avgRating > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {p.avgRating}
                      </span>
                    )}
                    <span>{p.usageCount}×</span>
                  </div>
                </div>
              </button>
            ))}
            {prompts.length === 0 && (
              <div className="text-center text-muted-foreground py-12 text-sm">
                Chưa có prompt nào.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ═══ Right: Detail Panel ═══ */}
      <div className={`${isMobile && mobileView !== 'details' ? 'hidden' : 'flex'} flex-1 flex-col overflow-hidden bg-background`}>
        {selectedPrompt ? (
          <>
            {/* Header */}
            <div className="p-3 md:p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {isMobile && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setMobileView('prompts')}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <div className="min-w-0">
                  <h2 className="text-base md:text-lg font-semibold truncate">{selectedPrompt.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] md:text-xs text-muted-foreground">
                    <span>v{selectedPrompt.currentVersion}</span>
                    <span className="hidden md:inline">•</span>
                    <span className="hidden md:inline">{selectedPrompt.usageCount} lần sử dụng</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => openEditPrompt(selectedPrompt)}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" /> Sửa
                </Button>
                <Button size="sm" onClick={startRun} className="gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Chạy
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <Tabs defaultValue="content" className="h-full flex flex-col">
                <div className="px-4 border-b border-border">
                  <TabsList className="h-9">
                    <TabsTrigger value="content" className="text-xs gap-1.5"><FileText className="h-3.5 w-3.5" /> Nội dung</TabsTrigger>
                    <TabsTrigger value="history" className="text-xs gap-1.5"><History className="h-3.5 w-3.5" /> Lịch sử</TabsTrigger>
                    <TabsTrigger value="analytics" className="text-xs gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Phân tích</TabsTrigger>
                  </TabsList>
                </div>

                {/* ── Tab: Content / Run ── */}
                <TabsContent value="content" className="flex-1 overflow-auto mt-0 p-4">
                  {!runMode ? (
                    <div className="space-y-4">
                      <div className="rounded-lg bg-muted/50 border border-border p-4">
                        <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                          {selectedPrompt.content.split(/(\[[^\]]+\])/).map((part, i) =>
                            part.match(/^\[.+\]$/) ? (
                              <span key={i} className="bg-primary/20 text-primary px-1 rounded font-semibold">{part}</span>
                            ) : (
                              <span key={i}>{part}</span>
                            )
                          )}
                        </pre>
                      </div>
                      {variables.length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Biến số</span>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {variables.map(v => (
                              <Badge key={v} variant="outline" className="text-xs">{v}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedPrompt.tags.length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tags</span>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {selectedPrompt.tags.map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">#{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ── Run Mode ── */
                    <div className="space-y-4">
                      {!renderedResult ? (
                        <>
                          {variables.length > 0 ? (
                            <div className="space-y-3">
                              <h3 className="text-sm font-medium">Điền biến số</h3>
                              {variables.map(v => (
                                <div key={v} className="space-y-1">
                                  <Label className="text-xs font-mono">[{v}]</Label>
                                  <Input
                                    value={variableValues[v] || ""}
                                    onChange={(e) => setVariableValues(prev => ({ ...prev, [v]: e.target.value }))}
                                    placeholder={`Nhập giá trị cho ${v}...`}
                                    className="font-mono text-sm"
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Prompt này không có biến số.</p>
                          )}
                          <div className="flex gap-2">
                            <Button onClick={executeRun} className="gap-1.5">
                              <Sparkles className="h-3.5 w-3.5" /> Tạo kết quả
                            </Button>
                            <Button variant="outline" onClick={() => setRunMode(false)}>Huỷ</Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="rounded-lg bg-muted/50 border border-border p-4 relative">
                            <Button
                              variant="ghost" size="icon"
                              className="absolute top-2 right-2 h-7 w-7"
                              onClick={copyResult}
                            >
                              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                            </Button>
                            <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed pr-8">
                              {renderedResult}
                            </pre>
                          </div>
                          <div className="rounded-lg border border-border p-4 space-y-3">
                            <h3 className="text-sm font-medium">Đánh giá kết quả</h3>
                            <StarRating value={ratingValue} onChange={setRatingValue} />
                            <Input
                              placeholder="Ghi chú (VD: Dùng tốt cho email lạnh)"
                              value={ratingNote}
                              onChange={(e) => setRatingNote(e.target.value)}
                              className="text-sm"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={submitRating} disabled={ratingValue === 0}>
                                Lưu đánh giá
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setRenderedResult(null); setRunMode(false); }}>
                                Đóng
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* ── Tab: Version History ── */}
                <TabsContent value="history" className="flex-1 overflow-auto mt-0 p-4">
                  <div className="space-y-3">
                    {versions.map(v => (
                      <div key={v.id} className="rounded-lg border border-border p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">v{v.version}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(v.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          {v.version !== selectedPrompt.currentVersion && (
                            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => handleRestore(v.id)}>
                              Khôi phục
                            </Button>
                          )}
                        </div>
                        {v.changeNote && (
                          <p className="text-xs text-muted-foreground italic">{v.changeNote}</p>
                        )}
                        <pre className="text-xs font-mono bg-muted/50 rounded p-2 whitespace-pre-wrap line-clamp-4">{v.content}</pre>
                      </div>
                    ))}
                    {versions.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">Chưa có lịch sử phiên bản.</p>
                    )}
                  </div>
                </TabsContent>

                {/* ── Tab: Analytics ── */}
                <TabsContent value="analytics" className="flex-1 overflow-auto mt-0 p-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg border border-border p-3 text-center">
                        <p className="text-2xl font-bold">{selectedPrompt.usageCount}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Lượt dùng</p>
                      </div>
                      <div className="rounded-lg border border-border p-3 text-center">
                        <p className="text-2xl font-bold">{selectedPrompt.avgRating || "—"}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Đánh giá TB</p>
                      </div>
                      <div className="rounded-lg border border-border p-3 text-center">
                        <p className="text-2xl font-bold">v{selectedPrompt.currentVersion}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Phiên bản</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-2">Lịch sử sử dụng</h3>
                      <div className="space-y-2">
                        {usageLogs.map(log => (
                          <div key={log.id} className="rounded-lg border border-border p-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <StarRating value={log.rating} readonly />
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(log.usedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            {log.note && <p className="text-xs text-muted-foreground">{log.note}</p>}
                            {log.resultPreview && (
                              <p className="text-xs font-mono bg-muted/50 rounded p-1.5 line-clamp-2">{log.resultPreview}</p>
                            )}
                          </div>
                        ))}
                        {usageLogs.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-8">Chưa có lịch sử sử dụng.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <FileText className="h-12 w-12 mx-auto opacity-20" />
              <p className="text-sm">Chọn một prompt để xem chi tiết</p>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Dialogs ═══ */}

      {/* Folder Dialog */}
      <Dialog open={folderDialog} onOpenChange={setFolderDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingFolderId ? "Sửa thư mục" : "Thêm thư mục"}</DialogTitle>
            <DialogDescription>Tạo thư mục để phân loại prompt.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Tên thư mục *</Label>
              <Input
                value={folderForm.name}
                onChange={(e) => setFolderForm(f => ({ ...f, name: e.target.value }))}
                placeholder="VD: Viết content"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mô tả</Label>
              <Input
                value={folderForm.description}
                onChange={(e) => setFolderForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Mô tả ngắn..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialog(false)}>Huỷ</Button>
            <Button onClick={handleSaveFolder} disabled={saving}>
              {saving ? "Đang lưu..." : editingFolderId ? "Lưu" : "Tạo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prompt Dialog */}
      <Dialog open={promptDialog} onOpenChange={setPromptDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPromptId ? "Sửa Prompt" : "Thêm Prompt"}</DialogTitle>
            <DialogDescription>
              Dùng [tên_biến] để tạo biến số động. VD: [chủ_đề], [giọng_văn]
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Tên prompt *</Label>
              <Input
                value={promptForm.name}
                onChange={(e) => setPromptForm(f => ({ ...f, name: e.target.value }))}
                placeholder="VD: Viết bài blog SEO"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Thư mục</Label>
              <select
                value={promptForm.folderId || ""}
                onChange={(e) => setPromptForm(f => ({ ...f, folderId: e.target.value || null }))}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">— Không có thư mục —</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nội dung prompt</Label>
              <Textarea
                value={promptForm.content}
                onChange={(e) => setPromptForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Viết bài blog về [chủ_đề] theo giọng [giọng_văn], dài [độ_dài] từ."
                rows={6}
                className="font-mono text-sm"
              />
              {promptForm.content && extractVariables(promptForm.content).length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {extractVariables(promptForm.content).map(v => (
                    <Badge key={v} variant="outline" className="text-[10px]">{v}</Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tags (phân cách bằng dấu phẩy)</Label>
              <Input
                value={promptForm.tags}
                onChange={(e) => setPromptForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="blog, seo, content"
              />
            </div>
            {editingPromptId && (
              <div className="space-y-1.5">
                <Label className="text-xs">Ghi chú thay đổi</Label>
                <Input
                  value={promptForm.changeNote}
                  onChange={(e) => setPromptForm(f => ({ ...f, changeNote: e.target.value }))}
                  placeholder="VD: Thêm biến đối_tượng"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromptDialog(false)}>Huỷ</Button>
            <Button onClick={handleSavePrompt} disabled={saving}>
              {saving ? "Đang lưu..." : editingPromptId ? "Lưu" : "Tạo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá {deleteDialog?.type === "folder" ? "thư mục" : "prompt"}?</AlertDialogTitle>
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

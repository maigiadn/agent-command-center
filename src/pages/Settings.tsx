import { useState, useEffect } from "react";
import { fetchWebhooks, createWebhook, updateWebhook, deleteWebhook } from "@/lib/api";
import type { Webhook } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, Pencil, Trash2, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WebhookFormData {
  name: string;
  description: string;
  n8nWebhookUrl: string;
  status: "active" | "inactive";
  defaultKeys: string[];
  project: string;
}

const emptyForm: WebhookFormData = {
  name: "",
  description: "",
  n8nWebhookUrl: "",
  status: "active",
  defaultKeys: [],
  project: "Mặc định",
};

const DRAFT_KEY = "workflow-draft";

export default function Settings() {
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<WebhookFormData>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasDraft, setHasDraft] = useState(() => !!localStorage.getItem(DRAFT_KEY));

  // Load webhooks from backend on mount
  const loadWebhooks = async () => {
    const res = await fetchWebhooks();
    if (res.data) setWebhooks(res.data);
  };

  useEffect(() => {
    loadWebhooks();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        setForm(JSON.parse(draft));
      } catch {
        setForm({ ...emptyForm });
      }
    } else {
      setForm({ ...emptyForm });
    }
    setDialogOpen(true);
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
    setForm({ ...emptyForm });
  };

  // Auto-save draft when form changes (only for new workflow, not edit)
  useEffect(() => {
    if (dialogOpen && !editingId) {
      const isBlank = JSON.stringify(form) === JSON.stringify(emptyForm);
      if (!isBlank) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
        setHasDraft(true);
      } else {
        localStorage.removeItem(DRAFT_KEY);
        setHasDraft(false);
      }
    }
  }, [form, dialogOpen, editingId]);

  const openEdit = (wh: Webhook) => {
    setEditingId(wh.id);
    setForm({
      name: wh.name,
      description: wh.description,
      n8nWebhookUrl: wh.n8nWebhookUrl,
      status: wh.status,
      defaultKeys: wh.defaultKeys || [],
      project: wh.project || "Mặc định",
    });
    setDialogOpen(true);
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const res = await deleteWebhook(deletingId);
    if (res.error) {
      toast({ title: "Lỗi", description: res.error, variant: "destructive" });
    } else {
      toast({ title: "Đã xoá", description: "Workflow đã được xoá." });
      await loadWebhooks();
    }
    setDeleteDialogOpen(false);
    setDeletingId(null);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.n8nWebhookUrl.trim()) {
      toast({
        title: "Thiếu thông tin",
        description: "Tên và n8n Webhook URL là bắt buộc.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const res = await updateWebhook(editingId, form);
        if (res.error) {
          toast({ title: "Lỗi", description: res.error, variant: "destructive" });
          return;
        }
        toast({ title: "Đã cập nhật" });
      } else {
        const res = await createWebhook(form);
        if (res.error) {
          toast({ title: "Lỗi", description: res.error, variant: "destructive" });
          return;
        }
        toast({ title: "Đã tạo workflow mới" });
        localStorage.removeItem(DRAFT_KEY);
        setHasDraft(false);
      }
      await loadWebhooks();
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">Cài đặt</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Quản lý danh sách workflow và Webhook URL
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 relative w-full md:w-auto">
          <Plus className="h-4 w-4" /> Thêm Workflow
          {hasDraft && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-orange-500 border-2 border-background animate-pulse" title="Có bản nháp chưa hoàn thành" />
          )}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Tìm kiếm workflow..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:max-w-md"
        />
      </div>

      {/* Webhook list */}
      <div className="space-y-4">
        {webhooks
          .filter(wh =>
            wh.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            wh.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (wh.project || "Mặc định").toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((wh) => (
            <div
              key={wh.id}
              className="flex flex-col md:flex-row md:items-center justify-between rounded-lg border border-border bg-card p-4 gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <span className="font-medium text-sm md:text-base truncate max-w-[200px] md:max-w-none">{wh.name}</span>
                  <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-[10px] md:text-xs font-medium text-secondary-foreground">
                    {wh.project || "Mặc định"}
                  </span>
                  <StatusBadge status={wh.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 md:line-clamp-1">
                  {wh.description}
                </p>
              </div>
              <div className="flex items-center gap-1 self-end md:self-center">
                <Button variant="ghost" size="sm" className="h-8 w-8 px-0" onClick={() => openEdit(wh)} aria-label="Sửa">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 px-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => confirmDelete(wh.id)}
                  aria-label="Xoá"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        {webhooks.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            Chưa có workflow nào. Nhấn "Thêm Workflow" để bắt đầu.
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{editingId ? "Sửa Workflow" : "Thêm Workflow"}</DialogTitle>
              {!editingId && hasDraft && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearDraft}
                  className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  <RotateCcw className="h-3 w-3" />
                  Xóa nháp
                </Button>
              )}
            </div>
            <DialogDescription>
              Cấu hình tên và URL webhook trên n8n của bạn.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tên workflow *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="VD: Server Health Report"
              />
            </div>

            <div className="space-y-2">
              <Label>n8n Webhook URL *</Label>
              <Input
                value={form.n8nWebhookUrl}
                onChange={(e) => setForm((f) => ({ ...f, n8nWebhookUrl: e.target.value }))}
                placeholder="https://n8n.yourdomain.com/webhook/..."
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                URL webhook từ n8n workflow của bạn
              </p>
            </div>

            <div className="space-y-2">
              <Label>Dự án (Project)</Label>
              <Input
                value={form.project}
                onChange={(e) => setForm((f) => ({ ...f, project: e.target.value }))}
                placeholder="VD: App Backend"
              />
            </div>

            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Workflow này dùng để làm gì?"
                rows={2}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Các Key Mặc Định</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setForm(f => ({ ...f, defaultKeys: [...f.defaultKeys, ""] }))}
                  className="h-8 gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Thêm key
                </Button>
              </div>

              <div className="space-y-2">
                {form.defaultKeys.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2 border rounded-md border-dashed">
                    Chưa có key mặc định.
                  </p>
                )}
                {form.defaultKeys.map((key, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={key}
                      onChange={(e) => {
                        const newKeys = [...form.defaultKeys];
                        newKeys[index] = e.target.value;
                        setForm(f => ({ ...f, defaultKeys: newKeys }));
                      }}
                      placeholder="VD: prompt, user_id..."
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newKeys = form.defaultKeys.filter((_, i) => i !== index);
                        setForm(f => ({ ...f, defaultKeys: newKeys }));
                      }}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Kích hoạt</Label>
              <Switch
                checked={form.status === "active"}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, status: checked ? "active" : "inactive" }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Huỷ
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Đang lưu..." : editingId ? "Lưu" : "Tạo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
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

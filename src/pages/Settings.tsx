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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WebhookFormData {
  name: string;
  description: string;
  n8nWebhookUrl: string;
  status: "active" | "inactive";
}

const emptyForm: WebhookFormData = {
  name: "",
  description: "",
  n8nWebhookUrl: "",
  status: "active",
};

export default function Settings() {
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<WebhookFormData>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

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
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEdit = (wh: Webhook) => {
    setEditingId(wh.id);
    setForm({
      name: wh.name,
      description: wh.description,
      n8nWebhookUrl: wh.n8nWebhookUrl,
      status: wh.status,
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
      }
      await loadWebhooks();
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cài đặt</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quản lý danh sách workflow và Webhook URL
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> Thêm Workflow
        </Button>
      </div>

      {/* Webhook list */}
      <div className="space-y-2">
        {webhooks.map((wh) => (
          <div
            key={wh.id}
            className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <span className="font-medium truncate">{wh.name}</span>
                <StatusBadge status={wh.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate font-mono">
                {wh.n8nWebhookUrl}
              </p>
            </div>
            <div className="flex items-center gap-1 ml-4 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => openEdit(wh)} aria-label="Sửa">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => confirmDelete(wh.id)}
                aria-label="Xoá"
                className="text-destructive hover:text-destructive"
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Sửa Workflow" : "Thêm Workflow"}</DialogTitle>
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
              <Label>Mô tả</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Workflow này dùng để làm gì?"
                rows={2}
              />
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

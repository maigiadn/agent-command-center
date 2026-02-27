import { useState } from "react";
import { mockWebhooks, mockSchema } from "@/lib/api";
import type { Webhook, SchemaField } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WebhookFormData {
  name: string;
  description: string;
  endpoint: string;
  n8nWebhookUrl: string;
  status: "active" | "inactive" | "error";
  fields: SchemaField[];
}

const emptyField: SchemaField = {
  name: "",
  label: "",
  type: "text",
  required: false,
  placeholder: "",
};

const emptyForm: WebhookFormData = {
  name: "",
  description: "",
  endpoint: "",
  n8nWebhookUrl: "",
  status: "inactive",
  fields: [],
};

export default function Settings() {
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<Webhook[]>([...mockWebhooks]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<WebhookFormData>({ ...emptyForm });

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEdit = (wh: Webhook) => {
    setEditingId(wh.id);
    // Load existing schema fields if available
    const existingFields =
      mockSchema.webhookId === wh.id ? [...mockSchema.fields] : [];
    setForm({
      name: wh.name,
      description: wh.description,
      endpoint: wh.endpoint,
      n8nWebhookUrl: wh.n8nWebhookUrl || "",
      status: wh.status,
      fields: existingFields,
    });
    setDialogOpen(true);
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (!deletingId) return;
    setWebhooks((prev) => prev.filter((w) => w.id !== deletingId));
    toast({ title: "Webhook deleted", description: "Configuration removed." });
    setDeleteDialogOpen(false);
    setDeletingId(null);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.endpoint.trim()) {
      toast({
        title: "Validation error",
        description: "Name and endpoint are required.",
        variant: "destructive",
      });
      return;
    }

    if (editingId) {
      setWebhooks((prev) =>
        prev.map((w) =>
          w.id === editingId
            ? {
                ...w,
                name: form.name,
                description: form.description,
                endpoint: form.endpoint,
                n8nWebhookUrl: form.n8nWebhookUrl,
                status: form.status,
              }
            : w
        )
      );
      toast({ title: "Webhook updated" });
    } else {
      const newId = `wh-${String(Date.now()).slice(-4)}`;
      setWebhooks((prev) => [
        ...prev,
        {
          id: newId,
          name: form.name,
          description: form.description,
          endpoint: form.endpoint,
          status: form.status,
        },
      ]);
      toast({ title: "Webhook created" });
    }
    setDialogOpen(false);
  };

  // Schema field helpers
  const addField = () =>
    setForm((f) => ({ ...f, fields: [...f.fields, { ...emptyField }] }));

  const updateField = (idx: number, patch: Partial<SchemaField>) =>
    setForm((f) => ({
      ...f,
      fields: f.fields.map((field, i) =>
        i === idx ? { ...field, ...patch } : field
      ),
    }));

  const removeField = (idx: number) =>
    setForm((f) => ({ ...f, fields: f.fields.filter((_, i) => i !== idx) }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage webhook configurations and schemas
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> Add Webhook
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
              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                {wh.endpoint}
              </p>
            </div>
            <div className="flex items-center gap-1 ml-4 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openEdit(wh)}
                aria-label="Edit"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => confirmDelete(wh.id)}
                aria-label="Delete"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {webhooks.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            No webhooks configured. Click "Add Webhook" to get started.
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Webhook" : "New Webhook"}
            </DialogTitle>
            <DialogDescription>
              Configure the webhook endpoint and its form schema.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="My Workflow"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      status: v as WebhookFormData["status"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Endpoint URL *</Label>
              <Input
                value={form.endpoint}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endpoint: e.target.value }))
                }
                placeholder="/api/webhooks/my-workflow"
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="What does this workflow do?"
                rows={2}
              />
            </div>

            {/* Schema fields */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-base">Schema Fields</Label>
                <Button variant="outline" size="sm" onClick={addField}>
                  <Plus className="h-3 w-3 mr-1" /> Add Field
                </Button>
              </div>

              {form.fields.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No fields defined. Add fields to build the execution form.
                </p>
              )}

              {form.fields.map((field, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-2 items-end rounded-md border border-border bg-muted/30 p-3"
                >
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Name
                    </Label>
                    <Input
                      value={field.name}
                      onChange={(e) =>
                        updateField(idx, { name: e.target.value })
                      }
                      placeholder="field_name"
                      className="font-mono text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Label
                    </Label>
                    <Input
                      value={field.label}
                      onChange={(e) =>
                        updateField(idx, { label: e.target.value })
                      }
                      placeholder="Display Label"
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Type
                    </Label>
                    <Select
                      value={field.type}
                      onValueChange={(v) =>
                        updateField(idx, {
                          type: v as SchemaField["type"],
                        })
                      }
                    >
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="textarea">Textarea</SelectItem>
                        <SelectItem value="select">Select</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="file">File</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1 pt-4">
                    <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.required ?? false}
                        onChange={(e) =>
                          updateField(idx, { required: e.target.checked })
                        }
                        className="accent-primary"
                      />
                      Req
                    </label>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => removeField(idx)}
                    aria-label="Remove field"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingId ? "Save Changes" : "Create Webhook"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete webhook?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The webhook configuration will be
              permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

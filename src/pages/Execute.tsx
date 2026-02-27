import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { mockWebhooks, mockSchema, apiCall } from "@/lib/api";
import type { SchemaField } from "@/types";
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
import { toast } from "sonner";
import { Loader2, Send, CheckCircle2 } from "lucide-react";

const payloadFormats = [
  { label: "application/json", value: "application/json" },
  { label: "multipart/form-data", value: "multipart/form-data" },
  { label: "text/plain", value: "text/plain" },
];

export default function Execute() {
  const [searchParams] = useSearchParams();
  const webhookId = searchParams.get("id") || mockWebhooks[0]?.id;
  const webhook = mockWebhooks.find((w) => w.id === webhookId);

  const schema = mockSchema; // In production: fetch from GET /api/webhooks/:id/schema
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [payloadFormat, setPayloadFormat] = useState("application/json");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitted(false);

    // Simulate API call — in production: POST /api/execute/:id
    await new Promise((r) => setTimeout(r, 1500));

    // const { data, error } = await apiCall(`/api/execute/${webhookId}`, {
    //   method: "POST",
    //   headers: { "Content-Type": payloadFormat },
    //   body: JSON.stringify(formData),
    // });

    setSubmitting(false);
    setSubmitted(true);
    toast.success("Workflow triggered successfully");
    setTimeout(() => setSubmitted(false), 3000);
  };

  const renderField = (field: SchemaField) => {
    switch (field.type) {
      case "text":
      case "number":
        return (
          <Input
            type={field.type}
            placeholder={field.placeholder}
            value={formData[field.name] || ""}
            onChange={(e) => handleChange(field.name, e.target.value)}
            className="bg-muted/50 border-border font-mono text-sm"
          />
        );
      case "textarea":
        return (
          <Textarea
            placeholder={field.placeholder}
            value={formData[field.name] || ""}
            onChange={(e) => handleChange(field.name, e.target.value)}
            className="bg-muted/50 border-border font-mono text-sm min-h-[80px]"
          />
        );
      case "select":
        return (
          <Select
            value={formData[field.name] || ""}
            onValueChange={(v) => handleChange(field.name, v)}
          >
            <SelectTrigger className="bg-muted/50 border-border font-mono text-sm">
              <SelectValue placeholder={field.placeholder || "Select..."} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "date":
        return (
          <Input
            type="date"
            value={formData[field.name] || ""}
            onChange={(e) => handleChange(field.name, e.target.value)}
            className="bg-muted/50 border-border font-mono text-sm"
          />
        );
      case "file":
        return (
          <Input
            type="file"
            onChange={(e) =>
              handleChange(field.name, e.target.files?.[0] || null)
            }
            className="bg-muted/50 border-border font-mono text-sm"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Execute Workflow</h1>
        {webhook && (
          <p className="text-sm text-muted-foreground mt-1">
            {webhook.name} — {webhook.description}
          </p>
        )}
      </div>

      {/* Webhook selector */}
      <div className="space-y-2">
        <Label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          Workflow
        </Label>
        <Select value={webhookId || ""} onValueChange={() => {}}>
          <SelectTrigger className="bg-muted/50 border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {mockWebhooks.map((wh) => (
              <SelectItem key={wh.id} value={wh.id}>
                {wh.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dynamic form fields */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-5">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          Parameters
        </p>
        {schema.fields.map((field) => (
          <div key={field.name} className="space-y-1.5">
            <Label className="text-sm">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {renderField(field)}
          </div>
        ))}
      </div>

      {/* Payload format + submit */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="space-y-1.5 flex-1">
          <Label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Payload Format
          </Label>
          <Select value={payloadFormat} onValueChange={setPayloadFormat}>
            <SelectTrigger className="bg-muted/50 border-border font-mono text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {payloadFormats.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="gap-2 glow-primary"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : submitted ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {submitting ? "Executing..." : submitted ? "Sent!" : "Execute"}
        </Button>
      </div>
    </div>
  );
}

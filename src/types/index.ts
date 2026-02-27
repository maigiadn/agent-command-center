export interface Webhook {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive" | "error";
  lastRun?: string;
  endpoint: string;
}

export interface SchemaField {
  name: string;
  label: string;
  type: "text" | "number" | "select" | "file" | "date" | "textarea";
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
}

export interface WebhookSchema {
  webhookId: string;
  fields: SchemaField[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  status?: {
    type: "info" | "running" | "success" | "error";
    message: string;
  };
}

export interface ExecutionLog {
  id: string;
  webhookName: string;
  triggeredAt: string;
  status: "success" | "error" | "running";
  duration?: string;
  message?: string;
}

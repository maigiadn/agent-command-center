export interface Webhook {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  n8nWebhookUrl: string;
  lastRun?: string;
  defaultKeys?: string[];
  project?: string;
}

export interface WorkflowResult {
  success: boolean;
  data?: unknown;
  error?: string;
  duration?: string;
}

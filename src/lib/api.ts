import type { Webhook, WebhookSchema, ExecutionLog, ChatMessage } from "@/types";

// Mock data for frontend development
export const mockWebhooks: Webhook[] = [
  {
    id: "wh-001",
    name: "Server Health Report",
    description: "Generates a full health check report for all production servers",
    status: "active",
    lastRun: "2026-02-27T08:30:00Z",
    endpoint: "/api/webhooks/wh-001",
  },
  {
    id: "wh-002",
    name: "Database Backup",
    description: "Triggers a full PostgreSQL backup to S3 cold storage",
    status: "active",
    lastRun: "2026-02-26T23:00:00Z",
    endpoint: "/api/webhooks/wh-002",
  },
  {
    id: "wh-003",
    name: "Deploy Staging",
    description: "Deploys the latest main branch to the staging environment",
    status: "inactive",
    endpoint: "/api/webhooks/wh-003",
  },
  {
    id: "wh-004",
    name: "Send Weekly Digest",
    description: "Compiles and sends the weekly analytics digest to the team",
    status: "active",
    lastRun: "2026-02-24T09:00:00Z",
    endpoint: "/api/webhooks/wh-004",
  },
  {
    id: "wh-005",
    name: "SSL Certificate Check",
    description: "Scans all domains for expiring SSL certificates",
    status: "error",
    lastRun: "2026-02-27T06:00:00Z",
    endpoint: "/api/webhooks/wh-005",
  },
];

export const mockSchema: WebhookSchema = {
  webhookId: "wh-001",
  fields: [
    { name: "target_server", label: "Target Server", type: "select", required: true, options: [
      { label: "Production US-East", value: "prod-us-east" },
      { label: "Production EU-West", value: "prod-eu-west" },
      { label: "Staging", value: "staging" },
    ]},
    { name: "report_type", label: "Report Type", type: "select", required: true, options: [
      { label: "Full Report", value: "full" },
      { label: "Summary Only", value: "summary" },
      { label: "Errors Only", value: "errors" },
    ]},
    { name: "email_to", label: "Send Report To", type: "text", required: true, placeholder: "team@example.com" },
    { name: "notes", label: "Additional Notes", type: "textarea", placeholder: "Any specific areas to check..." },
    { name: "schedule_date", label: "Schedule Date", type: "date" },
    { name: "attachment", label: "Config Override", type: "file" },
  ],
};

export const mockLogs: ExecutionLog[] = [
  { id: "log-001", webhookName: "Server Health Report", triggeredAt: "2026-02-27T08:30:00Z", status: "success", duration: "12.4s" },
  { id: "log-002", webhookName: "SSL Certificate Check", triggeredAt: "2026-02-27T06:00:00Z", status: "error", duration: "3.1s", message: "Connection timeout on domain api.example.com" },
  { id: "log-003", webhookName: "Database Backup", triggeredAt: "2026-02-26T23:00:00Z", status: "success", duration: "45.2s" },
  { id: "log-004", webhookName: "Send Weekly Digest", triggeredAt: "2026-02-24T09:00:00Z", status: "success", duration: "8.7s" },
  { id: "log-005", webhookName: "Deploy Staging", triggeredAt: "2026-02-23T14:15:00Z", status: "success", duration: "67.3s" },
  { id: "log-006", webhookName: "Server Health Report", triggeredAt: "2026-02-23T08:30:00Z", status: "success", duration: "11.8s" },
  { id: "log-007", webhookName: "SSL Certificate Check", triggeredAt: "2026-02-22T06:00:00Z", status: "success", duration: "2.9s" },
];

export const mockChatMessages: ChatMessage[] = [
  {
    id: "msg-001",
    role: "assistant",
    content: "Welcome to Agent Command Center. I can help you trigger workflows, check statuses, and manage your n8n automations. What would you like to do?",
    timestamp: "2026-02-27T09:00:00Z",
  },
];

// API helper with error handling
export async function apiCall<T>(
  url: string,
  options?: RequestInit
): Promise<{ data?: T; error?: string }> {
  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json", ...options?.headers },
      ...options,
    });
    if (!res.ok) {
      const errorText = await res.text().catch(() => "Unknown error");
      return { error: `Error ${res.status}: ${errorText}` };
    }
    const data = await res.json();
    return { data };
  } catch (err: any) {
    return { error: err.message || "Network error" };
  }
}

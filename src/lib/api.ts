import type { Webhook, WorkflowResult } from "@/types";

export const mockWebhooks: Webhook[] = [
  {
    id: "wh-001",
    name: "Server Health Report",
    description: "Kiểm tra sức khỏe toàn bộ server production",
    status: "active",
    lastRun: "2026-02-27T08:30:00Z",
    n8nWebhookUrl: "https://n8n.local/webhook/server-health",
  },
  {
    id: "wh-002",
    name: "Database Backup",
    description: "Sao lưu PostgreSQL lên S3",
    status: "active",
    lastRun: "2026-02-26T23:00:00Z",
    n8nWebhookUrl: "https://n8n.local/webhook/db-backup",
  },
  {
    id: "wh-003",
    name: "Deploy Staging",
    description: "Deploy nhánh main lên môi trường staging",
    status: "inactive",
    n8nWebhookUrl: "https://n8n.local/webhook/deploy-staging",
  },
  {
    id: "wh-004",
    name: "Send Weekly Digest",
    description: "Gửi báo cáo phân tích hàng tuần cho team",
    status: "active",
    lastRun: "2026-02-24T09:00:00Z",
    n8nWebhookUrl: "https://n8n.local/webhook/weekly-digest",
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

// Execute a workflow via proxy (mock for now)
export async function executeWorkflow(
  webhookId: string,
  inputData?: string
): Promise<WorkflowResult> {
  // In production, this calls /api/execute/:id which proxies to n8n
  // For now, simulate a response
  await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));

  const random = Math.random();
  if (random > 0.85) {
    return {
      success: false,
      error: "Connection timeout: n8n instance không phản hồi",
      duration: "5.0s",
    };
  }

  return {
    success: true,
    data: {
      status: "completed",
      message: `Workflow ${webhookId} đã chạy thành công`,
      timestamp: new Date().toISOString(),
      result: {
        items_processed: Math.floor(Math.random() * 100) + 1,
        output: "All checks passed",
      },
    },
    duration: `${(Math.random() * 10 + 1).toFixed(1)}s`,
  };
}

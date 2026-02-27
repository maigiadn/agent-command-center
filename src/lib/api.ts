import type { Webhook, WorkflowResult } from "@/types";

// ─── Generic API helper ─────────────────────────────────────────
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

// ─── Webhook CRUD ───────────────────────────────────────────────

export async function fetchWebhooks(): Promise<{ data?: Webhook[]; error?: string }> {
  return apiCall<Webhook[]>("/api/webhooks");
}

export async function createWebhook(
  body: Omit<Webhook, "id" | "lastRun">
): Promise<{ data?: Webhook; error?: string }> {
  return apiCall<Webhook>("/api/webhooks", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateWebhook(
  id: string,
  body: Omit<Webhook, "id" | "lastRun">
): Promise<{ data?: Webhook; error?: string }> {
  return apiCall<Webhook>(`/api/webhooks/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteWebhook(
  id: string
): Promise<{ data?: { success: boolean }; error?: string }> {
  return apiCall<{ success: boolean }>(`/api/webhooks/${id}`, {
    method: "DELETE",
  });
}

// ─── Execute (proxy to n8n) ─────────────────────────────────────

export async function executeWorkflow(
  webhookId: string,
  inputData?: string
): Promise<WorkflowResult> {
  let payload: unknown = {};
  if (inputData) {
    try {
      payload = JSON.parse(inputData);
    } catch {
      return { success: false, error: "Dữ liệu đầu vào không phải JSON hợp lệ", duration: "0.0s" };
    }
  }

  const result = await apiCall<WorkflowResult>(`/api/execute/${webhookId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (result.error) {
    return { success: false, error: result.error, duration: "0.0s" };
  }

  return result.data as WorkflowResult;
}

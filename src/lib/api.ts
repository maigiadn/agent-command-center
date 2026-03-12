import type { Webhook, WorkflowResult, PromptFolder, Prompt, PromptVersion, Chain, PromptUsageLog } from "@/types";

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

// ─── Prompt Manager: Folders ────────────────────────────────────

export const fetchFolders = () =>
  apiCall<PromptFolder[]>("/api/prompts/folders");

export const createFolder = (body: { name: string; description?: string; icon?: string; parentId?: string | null }) =>
  apiCall<PromptFolder>("/api/prompts/folders", { method: "POST", body: JSON.stringify(body) });

export const updateFolder = (id: string, body: { name: string; description?: string; icon?: string; parentId?: string | null; sortOrder?: number }) =>
  apiCall<PromptFolder>(`/api/prompts/folders/${id}`, { method: "PUT", body: JSON.stringify(body) });

export const deleteFolder = (id: string) =>
  apiCall<{ success: boolean }>(`/api/prompts/folders/${id}`, { method: "DELETE" });

// ─── Prompt Manager: Prompts ────────────────────────────────────

export const fetchPrompts = (params?: { folderId?: string; search?: string; tag?: string }) => {
  const query = new URLSearchParams();
  if (params?.folderId) query.set("folderId", params.folderId);
  if (params?.search) query.set("search", params.search);
  if (params?.tag) query.set("tag", params.tag);
  const qs = query.toString();
  return apiCall<Prompt[]>(`/api/prompts${qs ? `?${qs}` : ""}`);
};

export const fetchPrompt = (id: string) =>
  apiCall<Prompt>(`/api/prompts/${id}`);

export const createPrompt = (body: { folderId?: string | null; name: string; content?: string; tags?: string[] }) =>
  apiCall<Prompt>("/api/prompts", { method: "POST", body: JSON.stringify(body) });

export const updatePrompt = (id: string, body: { folderId?: string | null; name: string; content?: string; tags?: string[]; changeNote?: string }) =>
  apiCall<Prompt>(`/api/prompts/${id}`, { method: "PUT", body: JSON.stringify(body) });

export const deletePrompt = (id: string) =>
  apiCall<{ success: boolean }>(`/api/prompts/${id}`, { method: "DELETE" });

export const toggleFavorite = (id: string) =>
  apiCall<Prompt>(`/api/prompts/${id}/favorite`, { method: "PATCH" });

export const fetchTags = () =>
  apiCall<string[]>("/api/prompts/tags");

// ─── Prompt Manager: Versions ───────────────────────────────────

export const fetchVersions = (promptId: string) =>
  apiCall<PromptVersion[]>(`/api/prompts/${promptId}/versions`);

export const restoreVersion = (promptId: string, versionId: string) =>
  apiCall<Prompt>(`/api/prompts/${promptId}/restore/${versionId}`, { method: "POST" });

// ─── Prompt Manager: Usage / Analytics ──────────────────────────

export const logUsage = (promptId: string, body: { rating?: number; note?: string; resultPreview?: string }) =>
  apiCall<PromptUsageLog>(`/api/prompts/${promptId}/usage`, { method: "POST", body: JSON.stringify(body) });

export const fetchUsageLogs = (promptId: string) =>
  apiCall<PromptUsageLog[]>(`/api/prompts/${promptId}/usage`);

// ─── Prompt Manager: Chains ─────────────────────────────────────

export const fetchChains = () =>
  apiCall<Chain[]>("/api/chains");

export const createChain = (body: { name: string; description?: string; steps?: { promptId: string; order?: number; outputVariable?: string }[] }) =>
  apiCall<Chain>("/api/chains", { method: "POST", body: JSON.stringify(body) });

export const updateChain = (id: string, body: { name: string; description?: string; steps?: { promptId: string; order?: number; outputVariable?: string }[] }) =>
  apiCall<Chain>(`/api/chains/${id}`, { method: "PUT", body: JSON.stringify(body) });

export const deleteChain = (id: string) =>
  apiCall<{ success: boolean }>(`/api/chains/${id}`, { method: "DELETE" });

// ─── Backup ─────────────────────────────────────────────────────

export const exportBackup = () =>
  apiCall<any>("/api/backup/export");

export const importBackup = (data: any) =>
  apiCall<{ success: boolean; imported: Record<string, number> }>("/api/backup/import", { method: "POST", body: JSON.stringify({ data }) });

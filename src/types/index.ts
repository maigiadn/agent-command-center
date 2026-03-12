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

// ─── Prompt Manager Types ───────────────────────────────────────

export interface PromptFolder {
  id: string;
  name: string;
  description: string;
  icon: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Prompt {
  id: string;
  folderId: string | null;
  name: string;
  content: string;
  tags: string[];
  isFavorite: boolean;
  usageCount: number;
  avgRating: number;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface PromptVersion {
  id: string;
  promptId: string;
  version: number;
  content: string;
  changeNote: string;
  createdAt: string;
}

export interface Chain {
  id: string;
  name: string;
  description: string;
  steps: ChainStep[];
  createdAt: string;
  updatedAt: string;
}

export interface ChainStep {
  id: string;
  chainId: string;
  stepOrder: number;
  promptId: string;
  promptName?: string;
  outputVariable: string;
}

export interface PromptUsageLog {
  id: string;
  promptId: string;
  rating: number;
  note: string;
  resultPreview: string;
  usedAt: string;
}

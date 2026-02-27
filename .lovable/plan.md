

# Simplify Agent Command Center UI

## Problem
The current interface has 5 pages (Dashboard, Execute, Chat, Logs, Settings) with complex concepts like "Schema Fields", "Payload Format", dynamic form engines, etc. This is overwhelming for non-technical users. The core need is simple: **trigger n8n webhooks and see results**.

## New Simplified Architecture

### Reduce from 5 pages to 2 pages:

1. **Home (/)** - List of workflows with a "Run" button for each
2. **Settings (/settings)** - Manage webhook configurations (add/edit/delete)

Remove: Execute page, Chat page, Logs page (can be added back later if needed).

### Home Page - "My Workflows"
- Clean card grid showing each workflow (name, description, status)
- Each card has a prominent **"Run"** button
- Clicking "Run" opens a simple dialog:
  - Shows the workflow name
  - A single optional text area for "Input data (JSON)" - for advanced users who need to pass parameters
  - A "Run Workflow" button
  - After submission: show a loading spinner, then display the **response from n8n** directly in the dialog (formatted JSON or plain text)
  - Clear success/error states
- Recent run history shown as a small badge or timestamp on each card ("Last run: 2 min ago")

### Settings Page - Simplified
- Remove Schema Fields editor entirely (no more dynamic form building)
- Keep only essential fields per webhook:
  - **Workflow name** (e.g., "Server Health Report")
  - **n8n Webhook URL** (e.g., `https://n8n.local/webhook/server-health`)
  - **Description** (optional)
  - **Active/Inactive** toggle
- Simple add/edit/delete with a clean dialog

### Navigation
- Simplify sidebar to just 2 items: **Workflows** and **Settings**
- Remove Chat, Logs, Execute nav items

## Technical Changes

### Files to modify:
1. **`src/types/index.ts`** - Simplify types: remove `SchemaField`, `WebhookSchema`, `ChatMessage`. Simplify `Webhook` (remove `endpoint`, keep `n8nWebhookUrl` as required). Add `WorkflowResult` type for displaying responses.

2. **`src/lib/api.ts`** - Remove `mockSchema`, `mockChatMessages`, `mockLogs`. Simplify `mockWebhooks`. Add a mock `executeWorkflow()` function that simulates calling `/api/execute/:id` and returning a result.

3. **`src/pages/Dashboard.tsx`** - Rewrite as the main Workflows page with card grid and run dialog. Include inline result display.

4. **`src/pages/Settings.tsx`** - Simplify: remove Schema Fields section, keep only name/URL/description/status fields.

5. **`src/App.tsx`** - Remove routes for `/execute`, `/chat`, `/logs`. Keep only `/` and `/settings`.

6. **`src/components/AppSidebar.tsx`** - Remove Execute, Chat, Logs nav items. Keep only "Workflows" and "Settings".

### Files to delete:
- `src/pages/Execute.tsx`
- `src/pages/Chat.tsx`
- `src/pages/Logs.tsx`

### Key UX Decisions:
- The "Run" dialog shows the actual HTTP response from n8n, so users can see what happened
- No more "Payload Format" selector - always send JSON
- No more dynamic form engine - just an optional JSON input for power users
- Vietnamese-friendly: clean labels, minimal jargon

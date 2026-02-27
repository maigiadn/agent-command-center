import { useState, useRef, useEffect } from "react";
import { mockChatMessages } from "@/lib/api";
import type { ChatMessage } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Bot, User, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>(mockChatMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Simulate assistant response — in production: POST /api/chat
    await new Promise((r) => setTimeout(r, 1200));

    const assistantMsg: ChatMessage = {
      id: `msg-${Date.now() + 1}`,
      role: "assistant",
      content: getSimulatedResponse(userMsg.content),
      timestamp: new Date().toISOString(),
      status: userMsg.content.toLowerCase().includes("run")
        ? { type: "running", message: "Workflow started — Server Health Report" }
        : undefined,
    };
    setMessages((prev) => [...prev, assistantMsg]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Agent Chat</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Natural language interface to your workflows
        </p>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-3 max-w-2xl",
              msg.role === "user" ? "ml-auto flex-row-reverse" : ""
            )}
          >
            <div
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                msg.role === "user"
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div className="space-y-2">
              <div
                className={cn(
                  "rounded-lg px-4 py-3 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-foreground"
                )}
              >
                {msg.content}
              </div>
              {msg.status && (
                <div
                  className={cn(
                    "rounded-md px-3 py-2 flex items-center gap-2 text-xs font-mono",
                    {
                      "bg-warning/10 text-warning border border-warning/20":
                        msg.status.type === "running",
                      "bg-success/10 text-success border border-success/20":
                        msg.status.type === "success",
                      "bg-destructive/10 text-destructive border border-destructive/20":
                        msg.status.type === "error",
                      "bg-primary/10 text-primary border border-primary/20":
                        msg.status.type === "info",
                    }
                  )}
                >
                  <Zap className="h-3 w-3 status-pulse" />
                  {msg.status.message}
                </div>
              )}
              <p className="text-[10px] font-mono text-muted-foreground">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 max-w-2xl">
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-muted text-muted-foreground shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-lg px-4 py-3 bg-card border border-border">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border pt-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Try "Run the server report" or "Check SSL status"...'
            className="bg-muted/50 border-border font-mono text-sm"
          />
          <Button type="submit" disabled={loading || !input.trim()} className="gap-1.5 glow-primary shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function getSimulatedResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("run") && lower.includes("report"))
    return "I've triggered the Server Health Report workflow. You'll receive the results at your configured email shortly.";
  if (lower.includes("ssl") || lower.includes("certificate"))
    return "The SSL Certificate Check workflow last ran 21 hours ago. 2 domains flagged — api.example.com and staging.example.com have certificates expiring in 14 days.";
  if (lower.includes("backup"))
    return "The Database Backup workflow completed successfully last night at 11:00 PM. 2.4 GB archived to S3 cold storage.";
  if (lower.includes("deploy"))
    return "The Deploy Staging workflow is currently inactive. Would you like me to activate it and trigger a deployment?";
  return "I understand your request. Let me check the available workflows and get back to you with the relevant information.";
}

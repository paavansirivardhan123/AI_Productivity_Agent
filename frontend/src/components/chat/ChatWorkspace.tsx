"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Mic, MicOff, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/store/chat-store";
import ReactMarkdown from "react-markdown";
import { ChatMessage } from "./ChatMessage";
import { FileUploadButton } from "./FileUploadButton";
import { sendChatMessage } from "@/lib/api-services";

export function ChatWorkspace() {
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const {
    sessions,
    activeSessionId,
    setActiveSession,
    addSession,
    addMessage,
    updateMessage,
    deleteMessage,
    addTokenUsage,
    resetTokenUsage,
    getActiveSession,
  } = useChatStore();

  const activeSession = getActiveSession();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages, streamingContent]);

  const handleNewChat = () => {
    const id = crypto.randomUUID();
    addSession({
      id,
      title: "New chat",
      messages: [],
      updatedAt: new Date(),
    });
    setActiveSession(id);
    resetTokenUsage();
    setAttachedFiles([]);
  };

  const handleMessageEdit = useCallback(
    (messageId: string, content: string) => {
      if (!activeSessionId) return;
      updateMessage(activeSessionId, messageId, content);
    },
    [activeSessionId, updateMessage]
  );

  const handleMessageDelete = useCallback(
    (messageId: string) => {
      if (!activeSessionId) return;
      deleteMessage(activeSessionId, messageId);
    },
    [activeSessionId, deleteMessage]
  );

  const handleFilesSelected = useCallback((files: File[]) => {
    setAttachedFiles((prev) => [...prev, ...files]);
  }, []);

  const toggleVoiceInput = useCallback(() => {
    if (typeof window === "undefined" || !("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      setRecognitionError("Voice input not supported in this browser");
      return;
    }
    setRecognitionError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setRecognitionError("Voice not supported");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
      return;
    }

    setIsRecording(true);
    let finalTranscript = "";
    recognition.onresult = (e: any) => {
      for (let i = e.results.length - 1; i >= 0; i--) {
        if (e.results[i].isFinal) {
          finalTranscript = e.results[i][0]?.transcript ?? "" + finalTranscript;
          break;
        }
      }
      if (finalTranscript) setInput((prev) => prev + finalTranscript);
    };
    recognition.onend = () => setIsRecording(false);
    try {
      recognition.start();
    } catch (err) {
      setRecognitionError("Could not start voice input");
      setIsRecording(false);
    }
  }, [isRecording]);

  const handleSend = async () => {
    let text = input.trim();
    if (attachedFiles.length > 0) {
      text = `[Attached: ${attachedFiles.map((f) => f.name).join(", ")}]\n\n` + text;
    }
    if (!text || streaming) return;

    let sid = activeSessionId;
    if (!sid) {
      sid = crypto.randomUUID();
      addSession({
        id: sid,
        title: text.slice(0, 40) + (text.length > 40 ? "…" : ""),
        messages: [],
        updatedAt: new Date(),
      });
      setActiveSession(sid);
      resetTokenUsage();
    }

    const userMsg = {
      id: crypto.randomUUID(),
      role: "user" as const,
      content: text,
      timestamp: new Date(),
    };
    addMessage(sid!, userMsg);
    setInput("");
    setAttachedFiles([]);
    setStreaming(true);
    setStreamingContent("");

    try {
      const response = await sendChatMessage(sid!, text, attachedFiles[0]);

      addMessage(sid!, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.content,
        timestamp: new Date(),
      });

      if (response.tokensUsed) {
        addTokenUsage(Math.ceil(text.length / 4), response.tokensUsed);
      }
    } catch (err) {
      addMessage(sid!, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, I encountered an error connecting to the AI service. Please make sure the backend is running.",
        timestamp: new Date(),
      });
    } finally {
      setStreaming(false);
    }
  };

  const prompts = [
    "Plan my study schedule",
    "Summarize a document",
    "Prioritize my tasks",
  ];

  const { tokenUsage } = useChatStore();

  return (
    <div className="flex h-full flex-col">
      {/* Token usage bar */}
      {activeSession && activeSession.messages.length > 0 && (
        <div className="flex items-center justify-between px-6 py-3 border-b bg-card/60 backdrop-blur-sm shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground">Tokens: {tokenUsage.total.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground/60">({tokenUsage.prompt.toLocaleString()} + {tokenUsage.completion.toLocaleString()})</span>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        <div className="hidden lg:flex w-64 flex-col border-r bg-card/40 overflow-y-auto shrink-0 shadow-sm">
          <div className="p-4 border-b bg-background/50">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-lg text-sm font-semibold border-2 border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 text-primary hover:from-primary/15 hover:to-primary/10 hover:border-primary/30 hover:scale-[1.02] transition-all duration-200 shadow-sm hover:shadow"
            >
              <Send className="h-4 w-4 shrink-0" strokeWidth={2.5} />
              <span>New Conversation</span>
            </button>
          </div>
          <div className="px-1 pt-3">
            <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Recent Chats
            </p>
          </div>
          <div className="flex-1 space-y-0.5 px-3 pb-6 overflow-y-auto scrollbar-thin scrollbar-thumb-muted/20 hover:scrollbar-thumb-muted/40">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSession(s.id)}
                className={cn(
                  "w-full px-3.5 py-2.5 text-left text-sm truncate transition-all duration-200 font-medium rounded-lg hover:scale-[1.02]",
                  activeSessionId === s.id
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60 hover:shadow-sm"
                )}
              >
                {s.title || "New chat"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col min-h-0 bg-gradient-to-b from-background/30 to-background/60">
          {activeSession && activeSession.messages.length > 0 ? (
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
              <div className="max-w-4xl mx-auto space-y-6">
                {activeSession.messages.map((m) => (
                  <ChatMessage
                    key={m.id}
                    message={m}
                    sessionId={activeSession.id}
                    onEdit={handleMessageEdit}
                    onDelete={handleMessageDelete}
                    canEdit
                  />
                ))}
                {streaming && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-muted/80 border px-5 py-4 shadow-sm">
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1">
                        <ReactMarkdown>{streamingContent}</ReactMarkdown>
                        <span className="inline-block w-2 h-4 ml-0.5 bg-primary animate-pulse rounded-sm" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center px-4 sm:px-8 py-12 max-w-3xl mx-auto">
              <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 p-10 sm:p-12 border-2 border-primary/20 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="rounded-xl bg-background/80 backdrop-blur p-6 w-fit mx-auto shadow-inner">
                  <Send className="h-10 sm:h-12 w-10 sm:w-12 text-primary animate-pulse" strokeWidth={1.8} style={{ animationDuration: '3s' }} />
                </div>
              </div>
              <div className="space-y-3">
                <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
                  How can I help?
                </h2>
                <p className="text-muted-foreground max-w-lg text-base leading-relaxed font-medium">
                  Ask anything—plan your week, summarize documents, or get
                  productivity tips.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5 justify-center max-w-2xl">
                {prompts.map((s, idx) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="px-5 py-2.5 rounded-lg text-sm font-semibold border-2 bg-card/60 backdrop-blur hover:bg-card hover:border-primary/40 hover:shadow-md hover:scale-105 transition-all duration-200"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t bg-card/60 backdrop-blur-sm shadow-[0_-4px_12px_rgba(0,0,0,0.05)] p-5 sm:p-6 shrink-0">
            <div className="mx-auto max-w-4xl">
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {attachedFiles.map((f, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="rounded-md cursor-pointer px-3 py-1 font-medium"
                      onClick={() => setAttachedFiles((p) => p.filter((_, j) => j !== i))}
                    >
                      {f.name} <span className="ml-1 opacity-70">×</span>
                    </Badge>
                  ))}
                </div>
              )}
              {recognitionError && (
                <p className="text-xs text-destructive mb-3 font-medium">{recognitionError}</p>
              )}
              <div className="flex gap-2.5 rounded-xl border-2 bg-background p-3 shadow-md focus-within:border-primary/50 focus-within:shadow-lg focus-within:ring-4 focus-within:ring-primary/10 transition-all">
                <FileUploadButton
                  onFilesSelected={handleFilesSelected}
                  disabled={streaming}
                />
                <Input
                  placeholder="Type your message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  className="border-0 focus-visible:ring-0 shadow-none flex-1 min-w-0 px-2 text-[15px]"
                  disabled={streaming}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("rounded-lg h-10 w-10 shrink-0 hover:scale-110 transition-all duration-200", isRecording && "text-destructive bg-destructive/10 animate-pulse")}
                  onClick={toggleVoiceInput}
                  disabled={streaming}
                  aria-label={isRecording ? "Stop recording" : "Voice input"}
                >
                  {isRecording ? (
                    <MicOff className="h-[18px] w-[18px]" />
                  ) : (
                    <Mic className="h-[18px] w-[18px]" />
                  )}
                </Button>
                <Button
                  size="icon"
                  className="rounded-lg h-10 w-10 shrink-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200"
                  onClick={handleSend}
                  disabled={(!input.trim() && attachedFiles.length === 0) || streaming}
                >
                  <Send className="h-[18px] w-[18px]" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3 font-medium">
                AI can make mistakes. Verify important information.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

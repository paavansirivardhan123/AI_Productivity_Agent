"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Mic, MicOff, MessageSquare, ChevronDown, Code, FileText, PenTool, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/store/chat-store";
import ReactMarkdown from "react-markdown";
import { ChatMessage } from "./ChatMessage";
import { sendChatMessage, createChat, addChatMessage } from "@/lib/api-services";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const AGENTS = [
  { id: "chat", name: "Chat Model", icon: MessageSquare, color: "text-blue-500" },
  { id: "code", name: "Code Model", icon: Code, color: "text-purple-500" },
  { id: "document", name: "Document Model", icon: FileText, color: "text-emerald-500" },
  { id: "writer", name: "Writer Model", icon: PenTool, color: "text-orange-500" },
  { id: "scheduler", name: "Scheduler Model", icon: Calendar, color: "text-red-500" },
] as const;

export function ChatWorkspace() {
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<typeof AGENTS[number]>(AGENTS[0]);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
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

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages, streamingContent]);

  const handleNewChat = async () => {
    const id = crypto.randomUUID();
    addSession({
      id,
      title: "New chat",
      messages: [],
      updatedAt: new Date(),
    });
    setActiveSession(id);
    resetTokenUsage();
    setSelectedAgent(AGENTS[0]);
    try {
      await createChat("New chat", id);
    } catch {
      // non-fatal — chat will be created on first message if this fails
    }
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
    if (!text || streaming) return;

    // Capture whether this is a brand-new session BEFORE we set state
    const isNewSession = !activeSessionId;
    let sid = activeSessionId;

    if (isNewSession) {
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
    setStreaming(true);
    setStreamingContent("");

    try {
      // Create chat in backend first if it's a new session
      if (isNewSession) {
        await createChat(text.slice(0, 40) + (text.length > 40 ? "…" : ""), sid!);
      }

      // Add user message to backend
      await addChatMessage(sid!, "user", text);

      // Pass the selected agent to the API
      const response = await sendChatMessage(sid!, text, undefined, selectedAgent.id);

      // Add assistant message to backend
      await addChatMessage(sid!, "assistant", response.content, response.tokensUsed);

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

  // Prevent hydration mismatch - return empty div until mounted
  if (!mounted) {
    return <div className="flex h-full flex-col" />;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Token usage bar - simplified */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-card/60 backdrop-blur-sm shadow-sm transition-all">
        <div className="flex items-center gap-4">
          {activeSession && activeSession.messages.length > 0 && (
            <div className="flex items-center gap-3 pr-4">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-muted-foreground">Tokens: {tokenUsage.total.toLocaleString()}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 border-muted-foreground/20">
            Active Session: {activeSession?.title || "New chat"}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <div className="hidden lg:flex w-64 flex-col border-r bg-card/40 overflow-y-auto shrink-0 shadow-sm transition-all duration-300">
          <div className="p-4 border-b bg-background/50">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold border-2 border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 text-primary hover:from-primary/15 hover:to-primary/10 hover:border-primary/30 hover:scale-[1.02] active:scale-95 transition-all duration-200 shadow-sm hover:shadow"
            >
              <Send className="h-4 w-4 shrink-0" strokeWidth={2.5} />
              <span>New Conversation</span>
            </button>
          </div>
          <div className="px-1 pt-3">
            <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Recent Chats
            </p>
          </div>
          <div className="flex-1 space-y-0.5 px-3 pb-6 overflow-y-auto scrollbar-thin scrollbar-thumb-muted/10 hover:scrollbar-thumb-muted/20">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSession(s.id)}
                className={cn(
                  "w-full px-4 py-3 text-left text-sm truncate transition-all duration-200 font-medium rounded-xl mb-0.5",
                  activeSessionId === s.id
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40 active:bg-accent/60"
                )}
              >
                {s.title || "New chat"}
              </button>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex flex-1 flex-col min-h-0 bg-gradient-to-b from-background via-background/80 to-muted/20">
          {activeSession && activeSession.messages.length > 0 ? (
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 space-y-8 scroll-smooth">
              <div className="max-w-4xl mx-auto space-y-8">
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
                    <div className="max-w-[85%] sm:max-w-[80%] rounded-2xl rounded-bl-none bg-muted/50 border-2 border-muted px-6 py-5 shadow-sm transition-all">
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1">
                        <ReactMarkdown>{streamingContent}</ReactMarkdown>
                        <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse rounded-sm" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} className="h-4" />
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-10 text-center px-4 sm:px-8 py-12 max-w-3xl mx-auto">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-purple-500 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative rounded-3xl bg-background border-2 border-primary/10 p-10 sm:p-12 shadow-2xl transition-all duration-300">
                  <div className="rounded-2xl bg-primary/5 p-6 w-fit mx-auto shadow-inner ring-1 ring-primary/10">
                    <selectedAgent.icon className={cn("h-10 sm:h-12 w-10 sm:w-12 animate-pulse", selectedAgent.color)} strokeWidth={1.8} style={{ animationDuration: '4s' }} />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
                  How can I help?
                </h2>
                <p className="text-muted-foreground max-w-md text-lg leading-relaxed font-medium mx-auto">
                  Ask anything to optimize your productivity using our suite of AI models.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 justify-center max-w-2xl">
                {prompts.map((s, idx) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="px-6 py-3 rounded-xl text-sm font-semibold border-2 bg-background/50 backdrop-blur hover:bg-background hover:border-primary/40 hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 ease-out"
                    style={{ animationDelay: `${idx * 150}ms` }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t bg-background/80 backdrop-blur-md shadow-lg p-6 sm:p-8 shrink-0 relative transition-all">
            <div className="mx-auto max-w-4xl">
              {recognitionError && (
                <div className="flex items-center gap-2 text-xs text-destructive mb-3 font-bold px-3 py-2 bg-destructive/5 rounded-lg border border-destructive/10 animate-in zoom-in-95">
                  <span className="h-1 w-1 rounded-full bg-destructive" />
                  {recognitionError}
                </div>
              )}
              <div className="flex gap-3 items-center rounded-2xl border-2 bg-background p-3.5 shadow-xl ring-1 ring-primary/5 focus-within:border-primary/40 focus-within:shadow-2xl focus-within:ring-8 focus-within:ring-primary/5 transition-all duration-300">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl hover:bg-muted font-medium transition-all group shrink-0">
                      <selectedAgent.icon className={cn("h-5 w-5", selectedAgent.color)} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" side="top" className="w-56 rounded-xl border-2 p-1.5 shadow-xl mb-2">
                    {AGENTS.map((agent) => (
                      <DropdownMenuItem
                        key={agent.id}
                        onClick={() => setSelectedAgent(agent)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                          selectedAgent.id === agent.id ? "bg-muted" : "hover:bg-muted/50"
                        )}
                      >
                        <agent.icon className={cn("h-4 w-4", agent.color)} />
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">{agent.name}</span>
                        </div>
                        {selectedAgent.id === agent.id && (
                          <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Input
                  placeholder={`Message ${selectedAgent.name}...`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  className="border-0 focus-visible:ring-0 shadow-none flex-1 min-w-0 px-3 text-base font-medium placeholder:text-muted-foreground/50 transition-all"
                  disabled={streaming}
                />
                <div className="flex items-center gap-1.5 pr-1 border-l pl-3 ml-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "rounded-xl h-11 w-11 shrink-0 hover:scale-110 active:scale-90 transition-all duration-200",
                      isRecording && "text-destructive bg-destructive/10 animate-pulse ring-2 ring-destructive/20"
                    )}
                    onClick={toggleVoiceInput}
                    disabled={streaming}
                    aria-label={isRecording ? "Stop recording" : "Voice input"}
                  >
                    {isRecording ? (
                      <MicOff className="h-[20px] w-[20px]" />
                    ) : (
                      <Mic className="h-[20px] w-[20px]" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    className="rounded-xl h-11 w-11 shrink-0 shadow-md hover:shadow-xl hover:scale-110 active:scale-90 transition-all duration-300 bg-primary hover:bg-primary/90"
                    onClick={handleSend}
                    disabled={(!input.trim()) || streaming}
                  >
                    <Send className="h-[20px] w-[20px]" />
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/60 text-center mt-4 font-bold tracking-tight uppercase">
                AI powered by Groq & LangChain • Privacy Protected • Secure Content
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

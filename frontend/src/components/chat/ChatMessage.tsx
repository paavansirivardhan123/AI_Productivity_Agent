"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import type { Message } from "@/store/chat-store";

interface ChatMessageProps {
  message: Message;
  sessionId: string;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  canEdit: boolean;
}

export function ChatMessage({
  message,
  sessionId,
  onEdit,
  onDelete,
  canEdit,
}: ChatMessageProps) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent.trim());
    }
    setEditing(false);
  };

  const ts = typeof message.timestamp === "string" ? new Date(message.timestamp) : message.timestamp;

  return (
    <div
      className={cn(
        "flex group",
        message.role === "user" ? "justify-end" : "justify-start"
      )}
    >
      <div className="relative max-w-[80%]">
        {editing && canEdit ? (
          <div className="rounded-2xl border-2 bg-background p-3">
            <Input
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[80px]"
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={handleSaveEdit}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "rounded-2xl px-5 py-4 shadow-sm relative",
              message.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-muted/80 rounded-bl-md border"
            )}
          >
            {message.role === "assistant" ? (
              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
            )}
            {canEdit && (
              <div
                className={cn(
                  "absolute top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                  message.role === "user" ? "right-2" : "left-2"
                )}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-7 w-7 rounded-lg",
                        message.role === "user"
                          ? "text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/20"
                          : ""
                      )}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={message.role === "user" ? "end" : "start"}>
                    <DropdownMenuItem onClick={() => setEditing(true)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onDelete(message.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

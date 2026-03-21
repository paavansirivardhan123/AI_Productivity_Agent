"use client";

import { useState, useCallback, useEffect } from "react";
import {
  FileText,
  Upload,
  MessageSquare,
  BookOpen,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  uploadDocument,
  summarizeDocument,
  generateDocumentNotes,
  askDocument,
  fetchDocuments,
} from "@/lib/api-services";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface DocState {
  id: string;
  name: string;
  content: string;
  size: number;
}

export default function DocumentsPage() {
  const [question, setQuestion] = useState("");
  const [doc, setDoc] = useState<DocState | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState<
    "summarize" | "notes" | "ask" | null
  >(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    const loadLatest = async () => {
      try {
        const docs = await fetchDocuments();
        if (docs.length > 0) {
          const latest = docs[0];
          setDoc({
            id: latest.id,
            name: latest.name,
            content: "[Existing file loaded]",
            size: 0 // We don't have size info in the list but it's fine for UI
          });
        }
      } catch (err) {
        console.error("Failed to fetch documents:", err);
      }
    };
    loadLatest();
  }, []);

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) ?? "");
      reader.onerror = () => reject(new Error("Failed to read file"));
      if (file.type.includes("text") || file.name.endsWith(".md") || file.name.endsWith(".txt") || file.name.endsWith(".csv") || file.name.endsWith(".json")) {
        reader.readAsText(file);
      } else {
        resolve("[Binary file - preview not available for PDF/DOC]");
      }
    });
  };

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setUploading(true);
    setUploadProgress(0);
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError("File exceeds 10MB limit");
      setUploading(false);
      return;
    }

    try {
      const res = await uploadDocument(file, (p) => setUploadProgress(p));
      const content = await readFileContent(file);
      setDoc({ id: res.documentId, name: file.name, content, size: file.size });
      setSummary(null);
      setNotes(null);
      setAnswer(null);
    } catch (err: any) {
      setError(err.message || "Failed to upload file");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, []);

  const runAction = async (
    type: "summarize" | "notes" | "ask"
  ) => {
    if (!doc) return;
    setError(null);
    setActionLoading(type);
    try {
      if (type === "summarize") {
        const res = await summarizeDocument(doc.id);
        setSummary(res.summary);
      } else if (type === "notes") {
        const res = await generateDocumentNotes(doc.id);
        setNotes(res.notes);
      } else if (type === "ask" && question.trim()) {
        const res = await askDocument(doc.id, question);
        setAnswer(res.answer);
      }
    } catch (err: any) {
      setError(err.message || "Action failed. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="h-full overflow-auto p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <FileText className="h-6 w-6 text-primary" strokeWidth={1.5} />
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Document AI
            </h1>
          </div>
          <p className="text-muted-foreground">
            Upload PDFs, summarize, and ask questions
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border-2 border-destructive/50 bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
            <Button variant="ghost" size="icon" onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <Card className="rounded-2xl border-2 overflow-hidden">
          <CardHeader>
            <CardTitle className="font-display">Upload document</CardTitle>
            <CardDescription>PDF or text. Max 5MB for free.</CardDescription>
          </CardHeader>
          <CardContent>
            <label
              className={cn(
                "flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-2xl cursor-pointer transition-colors",
                uploading
                  ? "bg-muted/30 pointer-events-none"
                  : "hover:bg-muted/30 hover:border-primary/30"
              )}
            >
              <input
                type="file"
                className="hidden"
                accept=".pdf,.txt,.doc,.docx,.md,.csv"
                onChange={handleUpload}
                disabled={uploading}
              />
              {uploading ? (
                <>
                  <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
                  <span className="text-sm text-muted-foreground">
                    Uploading... {uploadProgress}%
                  </span>
                  <Progress
                    value={uploadProgress}
                    className="mt-2 w-48"
                  />
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground mb-3" strokeWidth={1.5} />
                  <span className="text-sm text-muted-foreground">
                    Drop file or click to upload
                  </span>
                </>
              )}
            </label>
            {doc && !uploading && (
              <div className="mt-4 flex items-center justify-between gap-3 p-4 rounded-xl bg-muted/30 border">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-6 w-6 text-primary shrink-0" />
                  <div className="min-w-0">
                    <span className="font-medium block truncate">{doc.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(doc.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl shrink-0"
                  onClick={() => setPreviewOpen(true)}
                >
                  Preview
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {doc && (
          <Card className="rounded-2xl border-2 overflow-hidden">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Document actions
              </CardTitle>
              <CardDescription>Summarize, notes, or Q&A</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => runAction("summarize")}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === "summarize" ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Summarize
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => runAction("notes")}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === "notes" ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Generate notes
                </Button>
              </div>

              {summary && (
                <div className="rounded-xl border bg-muted/20 p-4">
                  <h4 className="font-medium mb-2">Summary</h4>
                  <p className="text-sm text-muted-foreground">{summary}</p>
                </div>
              )}
              {notes && (
                <div className="rounded-xl border bg-muted/20 p-4">
                  <h4 className="font-medium mb-2">Notes</h4>
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">
                    {notes}
                  </pre>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Ask about this document
                </label>
                <div className="flex gap-3 flex-wrap">
                  <Input
                    placeholder="e.g. What are the key takeaways?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="flex-1 min-w-[200px] rounded-xl"
                  />
                  <Button
                    className="rounded-xl shrink-0"
                    onClick={() => runAction("ask")}
                    disabled={!question.trim() || actionLoading !== null}
                  >
                    {actionLoading === "ask" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Ask"
                    )}
                  </Button>
                </div>
                {answer && (
                  <div className="rounded-xl border bg-muted/20 p-4 mt-2">
                    <h4 className="font-medium mb-2">Answer</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {answer}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {previewOpen && doc && (
          <div
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-center justify-center p-4"
            onClick={() => setPreviewOpen(false)}
          >
            <div
              className="bg-card border-2 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold">Preview: {doc.name}</h3>
                <Button variant="ghost" size="icon" onClick={() => setPreviewOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh] text-sm">
                <pre className="whitespace-pre-wrap font-sans">{doc.content}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

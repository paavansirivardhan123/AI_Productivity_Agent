"use client";

import { useRef } from "react";
import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploadButtonProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  accept?: string;
  maxSize?: number;
}

export function FileUploadButton({
  onFilesSelected,
  disabled,
  accept = ".pdf,.txt,.doc,.docx,.md,.csv,.json",
  maxSize = 10 * 1024 * 1024,
}: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    const valid: File[] = [];
    for (const f of files) {
      if (f.size <= maxSize) valid.push(f);
    }
    if (valid.length > 0) onFilesSelected(valid);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={handleChange}
      />
      <Button
        variant="ghost"
        size="icon"
        className="rounded-xl shrink-0"
        onClick={handleClick}
        disabled={disabled}
        aria-label="Attach files"
      >
        <Paperclip className="h-4 w-4" />
      </Button>
    </>
  );
}

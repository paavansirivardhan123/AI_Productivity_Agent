import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Loading({ className, size = "md" }: LoadingProps) {
  const sizeClass = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };
  return (
    <Loader2
      className={cn("animate-spin text-primary", sizeClass[size], className)}
    />
  );
}

export function LoadingPage() {
  return (
    <div className="min-h-[200px] flex items-center justify-center">
      <Loading size="lg" />
    </div>
  );
}

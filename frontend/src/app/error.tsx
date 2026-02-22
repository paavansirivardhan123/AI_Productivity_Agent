"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      console.error(error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 grain">
      <div className="text-center max-w-md">
        <div className="rounded-2xl bg-destructive/10 p-6 w-fit mx-auto mb-6">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold">
          Something went wrong
        </h1>
        <p className="text-muted-foreground mt-2">
          An unexpected error occurred. Please try again.
        </p>
        <Button
          className="mt-8 rounded-xl gap-2"
          onClick={reset}
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    </div>
  );
}

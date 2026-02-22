"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 grain">
      <div className="text-center max-w-md">
        <p className="text-8xl font-display font-bold text-primary/20">404</p>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold mt-4">
          Page not found
        </h1>
        <p className="text-muted-foreground mt-2">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-wrap gap-3 justify-center mt-8">
          <Link href="/">
            <Button className="rounded-xl gap-2">
              <Home className="h-4 w-4" />
              Go home
            </Button>
          </Link>
          <Button
            variant="outline"
            className="rounded-xl gap-2"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}

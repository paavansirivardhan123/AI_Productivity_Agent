"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="grain min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md rounded-3xl border-2 shadow-2xl shadow-primary/5 overflow-hidden">
        <CardHeader className="text-center pb-2">
          <Link href="/" className="inline-flex items-center gap-2.5 justify-center mb-4">
            <div className="rounded-xl bg-primary p-2 shadow-lg shadow-primary/20">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-semibold tracking-tight">
              ProdAgent
            </span>
          </Link>
          <CardTitle className="font-display text-2xl">Reset password</CardTitle>
          <CardDescription className="text-base">
            Enter your email for a reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-center text-muted-foreground">
              If an account exists, you&apos;ll receive a reset link shortly.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl h-12"
                required
              />
              <Button type="submit" className="w-full rounded-xl h-12" disabled={sent}>
                Send reset link
              </Button>
            </form>
          )}
          <p className="mt-6 text-center text-sm">
            <Link href="/login" className="text-primary font-medium hover:underline">
              Back to login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";
import { validators } from "@/lib/validation";

import { API_BASE } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [form, setForm] = useState({ email: "", password: "" });

  useEffect(() => {
    if (searchParams.get("expired") === "1") {
      setError("Your session has expired. Please sign in again.");
      router.replace("/login", { scroll: false });
    }
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const emailErr = validators.email(form.email);
    const passErr = validators.password(form.password);
    if (emailErr || passErr) {
      setErrors({ email: emailErr ?? undefined, password: passErr ?? undefined });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || data.message || "Login failed");
      }

      const { user, token } = await res.json();
      setAuth(user, token);
      if (user?.role === "admin" || user?.role === "super_admin") router.push("/admin");
      else router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grain min-h-screen flex items-center justify-center p-6">
      <div className="absolute top-1/4 -right-24 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <Card className="w-full max-w-md rounded-3xl border-2 shadow-2xl shadow-primary/5 overflow-hidden">
        <CardHeader className="text-center pb-2">
          <Link href="/" className="inline-flex items-center gap-2.5 justify-center mb-4 group">
            <div className="rounded-xl bg-primary p-2 shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-semibold tracking-tight">
              ProdAgent
            </span>
          </Link>
          <CardTitle className="font-display text-2xl">Welcome back</CardTitle>
          <CardDescription className="text-base">
            Sign in to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2 p-1.5 rounded-xl bg-muted/50">
            <span className="flex-1 flex items-center justify-center rounded-lg py-2 text-sm font-medium bg-background shadow-sm">
              Log in
            </span>
            <Link
              href="/register"
              className="flex-1 flex items-center justify-center rounded-lg py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition"
            >
              Sign up
            </Link>
          </div>
          <div className="mt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-xl p-3">
                  {error}
                </p>
              )}
              <div>
                <label className="text-sm font-medium mb-2 block">Email</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value });
                    if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
                  }}
                  className={`rounded-xl h-12 ${errors.email ? "border-destructive" : ""}`}
                />
                {errors.email && (
                  <p className="text-xs text-destructive mt-1">{errors.email}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => {
                    setForm({ ...form, password: e.target.value });
                    if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
                  }}
                  className={`rounded-xl h-12 ${errors.password ? "border-destructive" : ""}`}
                />
                {errors.password && (
                  <p className="text-xs text-destructive mt-1">{errors.password}</p>
                )}
              </div>
              <Link
                href="/forgot-password"
                className="text-sm text-primary hover:underline block"
              >
                Forgot password?
              </Link>
              <Button
                type="submit"
                className="w-full rounded-xl h-12 text-base font-medium"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center pt-0" />
      </Card>
    </div>
  );
}

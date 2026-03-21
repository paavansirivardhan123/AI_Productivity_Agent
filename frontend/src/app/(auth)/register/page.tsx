"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const nameErr = validators.name(form.name);
    const emailErr = validators.email(form.email);
    const passErr = validators.password(form.password);
    const confirmErr =
      form.password !== form.confirmPassword ? "Passwords do not match" : null;
    if (nameErr || emailErr || passErr || confirmErr) {
      setErrors({
        name: nameErr ?? undefined,
        email: emailErr ?? undefined,
        password: passErr ?? undefined,
        confirmPassword: confirmErr ?? undefined,
      });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || data.message || "Registration failed");
      }

      const { user, token } = await res.json();
      setAuth(user, token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
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
          <CardTitle className="font-display text-2xl">Create account</CardTitle>
          <CardDescription className="text-base">
            Get started in seconds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl p-3">
                {error}
              </p>
            )}
            <div>
              <label className="text-sm font-medium mb-2 block">Name</label>
              <Input
                placeholder="John Doe"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
                }}
                className={`rounded-xl h-11 ${errors.name ? "border-destructive" : ""}`}
              />
              {errors.name && (
                <p className="text-xs text-destructive mt-1">{errors.name}</p>
              )}
            </div>
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
                className={`rounded-xl h-11 ${errors.email ? "border-destructive" : ""}`}
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
                className={`rounded-xl h-11 ${errors.password ? "border-destructive" : ""}`}
              />
              {errors.password && (
                <p className="text-xs text-destructive mt-1">{errors.password}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Confirm password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={(e) => {
                  setForm({ ...form, confirmPassword: e.target.value });
                  if (errors.confirmPassword)
                    setErrors((e) => ({ ...e, confirmPassword: undefined }));
                }}
                className={`rounded-xl h-11 ${errors.confirmPassword ? "border-destructive" : ""}`}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full rounded-xl h-12 text-base font-medium"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
        <CardFooter />
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  User,
  Bell,
  Shield,
  Link2,
  CreditCard,
  Crown,
  Download,
  Trash2,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth-store";

export default function SettingsPage() {
  const { user, isPremium } = useAuthStore();
  const [profile, setProfile] = useState({ name: user?.name ?? "", email: user?.email ?? "" });
  const [emailNotif, setEmailNotif] = useState(true);
  const [digests, setDigests] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
  };

  const handleExportData = async () => {
    setExporting(true);
    await new Promise((r) => setTimeout(r, 1000));
    const blob = new Blob(
      [JSON.stringify({ user: profile, exportedAt: new Date().toISOString() }, null, 2)],
      { type: "application/json" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "prodagent-export.json";
    a.click();
    URL.revokeObjectURL(a.href);
    setExporting(false);
  };

  return (
    <div className="h-full overflow-auto p-4 sm:p-6">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">Manage your account</p>
        </div>

        <Card className="rounded-2xl border-2 overflow-hidden">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Profile
            </CardTitle>
            <CardDescription>Update your information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-2 block">Name</label>
              <Input
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <Input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <Button className="rounded-xl" onClick={handleSaveProfile} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-2 overflow-hidden">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Subscription
            </CardTitle>
            <CardDescription>Manage your plan and billing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
              <div className="flex items-center gap-3">
                <Crown className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-medium">{isPremium() ? "Premium" : "Free"}</p>
                  <p className="text-sm text-muted-foreground">
                    {isPremium()
                      ? "Unlimited features, priority support"
                      : "5 chats/day, 5MB docs"}
                  </p>
                </div>
              </div>
              <Badge variant={isPremium() ? "premium" : "secondary"}>
                {user?.subscriptionType}
              </Badge>
            </div>
            {isPremium() ? (
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-xl">
                  Manage billing
                </Button>
                <Button variant="ghost" className="rounded-xl text-muted-foreground">
                  Cancel subscription
                </Button>
              </div>
            ) : (
              <Link href="/dashboard/upgrade">
                <Button className="rounded-xl gap-2">
                  <Crown className="h-4 w-4" />
                  Upgrade to Premium
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-2 overflow-hidden">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notifications
            </CardTitle>
            <CardDescription>Configure how you receive updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Email notifications</p>
                <p className="text-xs text-muted-foreground">Product updates and tips</p>
              </div>
              <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Reminder digests</p>
                <p className="text-xs text-muted-foreground">Weekly schedule summaries</p>
              </div>
              <Switch checked={digests} onCheckedChange={setDigests} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-2 overflow-hidden">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Integrations
            </CardTitle>
            <CardDescription>Connect external services</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="rounded-xl">
              Connect Google Calendar
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-2 overflow-hidden">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Privacy & Data
            </CardTitle>
            <CardDescription>Control your data and privacy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Usage analytics</p>
                <p className="text-xs text-muted-foreground">Help improve the product</p>
              </div>
              <Switch checked={analytics} onCheckedChange={setAnalytics} />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="outline"
                className="rounded-xl gap-2"
                onClick={handleExportData}
                disabled={exporting}
              >
                <Download className="h-4 w-4" />
                {exporting ? "Exporting..." : "Export my data"}
              </Button>
              <Button
                variant="outline"
                className="rounded-xl gap-2 text-destructive border-destructive/50 hover:bg-destructive/10"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete account
              </Button>
            </div>
            {showDeleteConfirm && (
              <div className="rounded-xl border-2 border-destructive/50 bg-destructive/5 p-4 space-y-3">
                <p className="text-sm">
                  Permanently delete your account and all data? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Keep account
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      useAuthStore.getState().logout();
                      window.location.href = "/";
                    }}
                  >
                    Confirm delete
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

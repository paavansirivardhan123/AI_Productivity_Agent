"use client";

import { useState, useEffect } from "react";
import { Search, Crown, Trash2, Pencil, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchAdminUsers, updateAdminUser, deleteAdminUser } from "@/lib/api-services";
import { useAuthStore } from "@/store/auth-store";

type Subscription = "free" | "premium";
type Role = "user" | "admin" | "super_admin";

interface EditState {
  userId: string;
  subscription: Subscription;
  role: Role;
}

export default function AdminUsersPage() {
  const { user: adminUser } = useAuthStore();
  const isSuperAdmin = adminUser?.role === "super_admin";

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "free" | "premium">("all");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const list = await fetchAdminUsers();
        setUsers(list);
      } catch (e) {
        console.error("Failed to fetch users", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "premium" && u.subscription === "premium") ||
      (filter === "free" && u.subscription !== "premium");
    return matchSearch && matchFilter;
  });

  const openEdit = (u: any) => {
    setEditing({ userId: u.id, subscription: u.subscription as Subscription, role: (u.role ?? "user") as Role });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const updated = await updateAdminUser(editing.userId, {
        subscription: editing.subscription,
        role: isSuperAdmin ? editing.role : undefined,
      });
      setUsers((prev) => prev.map((u) => (u.id === editing.userId ? { ...u, ...updated } : u)));
      setEditing(null);
    } catch (e: any) {
      alert(e?.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAdminUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e) {
      console.error("Delete failed", e);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const roleBadgeColor: Record<Role, string> = {
    user: "secondary",
    admin: "outline",
    super_admin: "premium",
  };

  return (
    <div className="p-4 sm:p-8 space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground mt-1">Manage roles and subscriptions</p>
      </div>

      <Card className="rounded-2xl border-2 overflow-hidden">
        <CardHeader>
          <CardTitle className="font-display">All users</CardTitle>
          <CardDescription>Click the edit icon to change a user's role or plan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 rounded-xl"
              />
            </div>
            <div className="flex gap-2">
              {(["all", "free", "premium"] as const).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? "default" : "outline"}
                  size="sm"
                  className="rounded-xl capitalize"
                  onClick={() => setFilter(f)}
                >
                  {f}
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border-2 overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b-2 bg-muted/30">
                  <th className="text-left p-4 font-medium">Name</th>
                  <th className="text-left p-4 font-medium">Email</th>
                  <th className="text-left p-4 font-medium">Role</th>
                  <th className="text-left p-4 font-medium">Plan</th>
                  <th className="text-left p-4 font-medium">Joined</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">Loading...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">No users found</td>
                  </tr>
                ) : (
                  filtered.map((u) => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20 transition">
                      <td className="p-4 font-medium">{u.name}</td>
                      <td className="p-4 text-muted-foreground">{u.email}</td>
                      <td className="p-4">
                        <Badge variant={(roleBadgeColor[u.role as Role] ?? "secondary") as any} className="rounded-lg capitalize">
                          {u.role ?? "user"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant={u.subscription === "premium" ? "premium" : "secondary"} className="rounded-lg">
                          {u.subscription === "premium" && <Crown className="h-3 w-3 mr-1 inline" />}
                          {u.subscription ?? "free"}
                        </Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">{u.createdAt?.split("T")[0] || "-"}</td>
                      <td className="p-4 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl"
                            onClick={() => openEdit(u)}
                            aria-label="Edit user"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {deleteConfirm === u.id ? (
                            <>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="rounded-xl text-xs"
                                onClick={() => handleDelete(u.id)}
                              >
                                Confirm
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-xl"
                                onClick={() => setDeleteConfirm(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteConfirm(u.id)}
                              aria-label="Delete user"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-center justify-center p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="bg-card border-2 rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold text-lg">Edit user access</h2>
              <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setEditing(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Subscription plan</label>
                <div className="flex gap-2">
                  {(["free", "premium"] as Subscription[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setEditing((e) => e ? { ...e, subscription: s } : e)}
                      className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${
                        editing.subscription === s
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-muted hover:border-primary/40"
                      }`}
                    >
                      {s === "premium" && <Crown className="h-3.5 w-3.5 inline mr-1" />}
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {isSuperAdmin && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Role</label>
                  <div className="flex gap-2 flex-wrap">
                    {(["user", "admin", "super_admin"] as Role[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => setEditing((e) => e ? { ...e, role: r } : e)}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${
                          editing.role === r
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-muted hover:border-primary/40"
                        }`}
                      >
                        {r.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Changing role takes effect on the user's next page load.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button className="flex-1 rounded-xl gap-2" onClick={handleSave} disabled={saving}>
                <Check className="h-4 w-4" />
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

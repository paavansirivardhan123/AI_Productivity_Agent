"use client";

import { useState } from "react";
import { Search, Crown, Trash2, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
const mockUsers = [
  { id: "1", name: "John Doe", email: "john@example.com", subscription: "free", created: "2025-02-15" },
  { id: "2", name: "Jane Smith", email: "jane@example.com", subscription: "premium", created: "2025-02-10" },
  { id: "3", name: "Alex Lee", email: "alex@example.com", subscription: "free", created: "2025-02-18" },
  { id: "4", name: "Sam Wilson", email: "sam@example.com", subscription: "free", created: "2025-02-12" },
];

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "free" | "premium">("all");
  const [users, setUsers] = useState(mockUsers);

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "premium" && u.subscription === "premium") ||
      (filter === "free" && u.subscription === "free");
    return matchSearch && matchFilter;
  });

  const handleUpgrade = (id: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, subscription: "premium" as const } : u
      )
    );
  };

  const handleDelete = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  return (
    <div className="p-4 sm:p-8 space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Users
        </h1>
        <p className="text-muted-foreground mt-1">Search and manage</p>
      </div>

      <Card className="rounded-2xl border-2 overflow-hidden">
        <CardHeader>
          <CardTitle className="font-display">All users</CardTitle>
          <CardDescription>Search and filter users</CardDescription>
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
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b-2 bg-muted/30">
                  <th className="text-left p-4 font-medium">Name</th>
                  <th className="text-left p-4 font-medium">Email</th>
                  <th className="text-left p-4 font-medium">Plan</th>
                  <th className="text-left p-4 font-medium">Joined</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b last:border-0 hover:bg-muted/20 transition"
                    >
                      <td className="p-4 font-medium">{u.name}</td>
                      <td className="p-4 text-muted-foreground">{u.email}</td>
                      <td className="p-4">
                        <Badge
                          variant={
                            u.subscription === "premium" ? "premium" : "secondary"
                          }
                          className="rounded-lg"
                        >
                          {u.subscription === "premium" && (
                            <Crown className="h-3 w-3 mr-1 inline" />
                          )}
                          {u.subscription}
                        </Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">{u.created}</td>
                      <td className="p-4 text-right">
                        <div className="flex gap-1 justify-end">
                          {u.subscription === "free" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-xl gap-1"
                              onClick={() => handleUpgrade(u.id)}
                            >
                              <ArrowUpCircle className="h-4 w-4" />
                              Upgrade
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(u.id)}
                            aria-label="Delete user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
    </div>
  );
}

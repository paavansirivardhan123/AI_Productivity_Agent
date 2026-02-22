"use client";

import { Crown, Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function UpgradePage() {
  const features = [
    "Unlimited AI chat",
    "Google Calendar sync",
    "Advanced scheduler",
    "Unlimited documents",
    "Priority support",
  ];

  return (
    <div className="h-full overflow-auto p-6 flex items-center justify-center">
      <Card className="max-w-md w-full rounded-3xl border-2 overflow-hidden shadow-xl shadow-primary/10">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 p-6 w-fit">
            <Crown className="h-16 w-16 text-primary" strokeWidth={1.5} />
          </div>
          <CardTitle className="font-display text-2xl mt-4">Upgrade to Premium</CardTitle>
          <CardDescription className="text-base">
            Unlock the full power of ProdAgent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <span className="font-display text-4xl font-bold">$19</span>
            <span className="text-muted-foreground ml-1">/month</span>
          </div>
          <ul className="space-y-4">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Button className="w-full rounded-xl h-12 text-base font-medium">
            Upgrade now
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Cancel anytime.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

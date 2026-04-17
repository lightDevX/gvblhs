"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { KeyRound, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function ChangePasswordPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  if (!user.mustChangePassword) {
    router.push("/admin");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in both fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      toast.error("Password must include uppercase, lowercase, and a number");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword, confirmPassword }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("Password changed successfully!");
        await refreshUser();
        router.push("/admin");
      } else {
        toast.error(data.error || "Failed to change password");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md">
        <div className="glass-gold rounded-2xl p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-yellow-500/15 mb-3">
              <KeyRound className="text-yellow-500" size={28} />
            </div>
            <h1 className="text-2xl font-display font-bold">
              Set New Password
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              You must set a new password before accessing the dashboard
            </p>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 mb-6">
            <ShieldAlert
              size={18}
              className="text-yellow-500 mt-0.5 shrink-0"
            />
            <p className="text-xs text-yellow-200/80">
              Your password was set by an administrator. For security, please
              choose a new personal password. It must be at least 8 characters
              with uppercase, lowercase, and a number.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                required
                className="bg-background/50"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                required
                className="bg-background/50"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              className="w-full glow-gold-sm"
              disabled={loading}>
              {loading ? "Saving..." : "Set Password & Continue"}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

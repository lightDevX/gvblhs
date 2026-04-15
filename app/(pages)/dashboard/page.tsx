"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Dashboard() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen pt-20 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="glass-gold rounded-2xl p-8">
          <h1 className="text-3xl font-bold mb-2">Welcome, {user.name}!</h1>
          <p className="text-muted-foreground mb-6">{user.email}</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="glass rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="text-lg font-semibold capitalize">{user.role}</p>
            </div>
            <div className="glass rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Member Since</p>
              <p className="text-lg font-semibold">
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push("/")}>
              Back to Home
            </Button>
            <Button className="flex-1 glow-gold-sm" onClick={logout}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import AdminDashboardStats from "@/components/dashboard/admin/AdminDashboardStats";
import { useAuth } from "@/contexts/AuthContext";
import { VALID_ROLES, type AdminRole } from "@/lib/permissions";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !VALID_ROLES.includes(user.role as AdminRole))) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !VALID_ROLES.includes(user.role as AdminRole)) {
    return null;
  }

  return <AdminDashboardStats />;
}

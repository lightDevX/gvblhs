"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RolesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/manage");
  }, [router]);

  return null;
}

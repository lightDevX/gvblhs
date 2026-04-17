"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { ReactNode } from "react";
import { Toaster } from "sonner";

export function ClientWrapper({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster
        position="top-right"
        theme="dark"
        richColors
        expand
        closeButton
      />
    </AuthProvider>
  );
}

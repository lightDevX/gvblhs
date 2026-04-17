import { ClientWrapperDashboard } from "@/app/client-wrapper-dashboard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ReactNode } from "react";

export default function DashboardRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ClientWrapperDashboard>
      <DashboardLayout>{children}</DashboardLayout>
    </ClientWrapperDashboard>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  ClipboardCheck,
  CreditCard,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If not authenticated, just render the children without the dashboard layout
  if (!loading && !user) {
    return <>{children}</>;
  }

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

  // TypeScript guard - user is definitely defined here
  if (!user) {
    return null;
  }

  const isAdmin = user?.role === "admin";

  const menuItems = [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "My Profile", url: "/profile", icon: User },
    { title: "My Ticket", url: "/ticket", icon: CreditCard },
    ...(isAdmin
      ? [
          { title: "Registrations", url: "/admin", icon: LayoutDashboard },
          { title: "Approvals", url: "/admin/tickets", icon: ClipboardCheck },
          { title: "Messages", url: "/admin/messages", icon: MessageSquare },
          { title: "Manage Roles", url: "/admin/roles", icon: ShieldCheck },
        ]
      : []),
  ];

  const isActive = (url: string) => {
    if (url === "/dashboard") {
      return pathname === url;
    }
    return pathname.startsWith(url);
  };

  const handleSignOut = async () => {
    await logout();
    router.push("/");
  };

  const initials =
    user?.name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Mobile Menu Toggle */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-card border-b border-border sticky top-0 z-20">
        <h1 className="text-lg font-display font-bold text-gold">
          Reunion 2026
        </h1>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 hover:bg-muted rounded-lg">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`${
          mobileMenuOpen ? "block" : "hidden"
        } lg:block w-full lg:w-56 bg-card border-b lg:border-b-0 lg:border-r border-border flex flex-col ${
          mobileMenuOpen ? "absolute top-16 left-0 right-0 z-10" : ""
        }`}>
        {/* Logo Section */}
        <div className="p-6 border-b border-border hidden lg:block">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
              <span className="text-gold font-bold text-sm">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-gold/20 text-gold capitalize">
              {user.role}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground px-3 py-2">
            MENU
          </p>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.url);
            return (
              <Link
                key={item.url}
                href={item.url}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/50"
                }`}>
                <Icon className="w-4 h-4" />
                <span className="text-sm">{item.title}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sign Out Button */}
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-destructive"
            onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto w-full">
        <div className="border-b border-border bg-card/50 sticky top-0 z-10 hidden lg:block">
          <div className="flex items-center justify-between p-4 max-w-full">
            <div>
              <h1 className="text-2xl font-display font-bold text-gold">
                Reunion 2026
              </h1>
            </div>
          </div>
        </div>
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

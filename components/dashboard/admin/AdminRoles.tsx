"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldAlert, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type AppRole = "admin" | "user";

interface User {
  id: string;
  name: string;
  email: string;
  role: AppRole;
}

const ROLE_COLORS: Record<AppRole, string> = {
  admin: "bg-destructive/10 text-destructive border-destructive/30",
  user: "bg-muted text-muted-foreground border-border",
};

const AdminRoles = () => {
  const { user: currentUser, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole | "">("");
  const [assigning, setAssigning] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      if (authLoading) return;

      if (!currentUser) {
        setLoading(false);
        return;
      }

      // Check if current user is admin
      if (currentUser.role !== "admin") {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      await fetchUsers();
    };

    checkAdminAndFetch();
  }, [currentUser, authLoading]);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        toast.error("Failed to fetch users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUser || !selectedRole) {
      toast.error("Please select both user and role");
      return;
    }

    // Prevent changing own role
    if (selectedUser === currentUser?.id) {
      toast.error("You cannot change your own role");
      return;
    }

    setAssigning(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser,
          role: selectedRole,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Role assigned successfully`);
        setSelectedUser("");
        setSelectedRole("");
        await fetchUsers();
      } else {
        toast.error(data.error || "Failed to assign role");
      }
    } catch (error) {
      console.error("Error assigning role:", error);
      toast.error("An error occurred");
    } finally {
      setAssigning(false);
    }
  };

  const handleRevoke = async (userId: string, currentRole: AppRole) => {
    // Prevent removing own admin role
    if (userId === currentUser?.id) {
      toast.error("You cannot remove your own admin role");
      return;
    }

    // Only allow revoking if user has a role (they will default to "user")
    if (currentRole === "user") {
      toast.error("User already has the default role");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to remove ${currentRole} role from this user?`,
      )
    )
      return;

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          role: "user",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Role revoked successfully");
        await fetchUsers();
      } else {
        toast.error(data.error || "Failed to revoke role");
      }
    } catch (error) {
      console.error("Error revoking role:", error);
      toast.error("An error occurred");
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser || !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <ShieldAlert className="h-12 w-12 mb-4 opacity-40" />
        <h2 className="font-heading text-xl font-semibold text-foreground mb-1">
          Access Denied
        </h2>
        <p>You need admin privileges to manage roles.</p>
      </div>
    );
  }

  const admins = users.filter((u) => u.role === "admin");
  const regularUsers = users.filter((u) => u.role === "user");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">
          Manage Roles
        </h2>
        <p className="text-muted-foreground mt-1">
          Assign or revoke admin roles
        </p>
      </div>

      {/* Assign role */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Assign Admin Role
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="sm:w-[240px]">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter((u) => u.role !== "admin")
                  .map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                {users.filter((u) => u.role !== "admin").length === 0 && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No users available
                  </div>
                )}
              </SelectContent>
            </Select>

            <Select
              value={selectedRole}
              onValueChange={(v) => setSelectedRole(v as AppRole)}>
              <SelectTrigger className="sm:w-[180px]">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={handleAssign}
              disabled={!selectedUser || !selectedRole || assigning}>
              {assigning ? "Assigning..." : "Assign Role"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Admins section */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Administrators
          </CardTitle>
        </CardHeader>
        <CardContent>
          {admins.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No administrators assigned yet.
            </p>
          ) : (
            <div className="space-y-3">
              {admins.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50">
                  <div className="flex items-center gap-3 flex-1">
                    <div>
                      <p className="font-medium text-sm">
                        {user.name || "Unnamed"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                    <Badge variant="outline" className={ROLE_COLORS.admin}>
                      Admin
                    </Badge>
                  </div>
                  {user.id !== currentUser.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRevoke(user.id, user.role)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  {user.id === currentUser.id && (
                    <span className="text-xs text-muted-foreground">(You)</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Regular users section */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" /> Regular Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {regularUsers.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No regular users found.
            </p>
          ) : (
            <div className="space-y-3">
              {regularUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-sm">
                        {user.name || "Unnamed"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                    <Badge variant="outline" className={ROLE_COLORS.user}>
                      User
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRoles;

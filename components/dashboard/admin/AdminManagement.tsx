"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import {
  ALL_PERMISSIONS,
  hasPermission,
  PERMISSION_GROUPS,
  ROLE_LABELS,
  type AdminRole,
  type Permission,
} from "@/lib/permissions";
import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  Power,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: string;
  permissions: string[];
  fullAccess: boolean;
  mustChangePassword: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type Modal =
  | { type: "create" }
  | { type: "edit_permissions"; user: AdminUser }
  | { type: "reset_password"; user: AdminUser }
  | null;

const roleColor: Record<string, string> = {
  main_admin: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  admin: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  sub_admin: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

const AdminManagement = () => {
  const { user: currentUser, loading: authLoading } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [saving, setSaving] = useState(false);

  // Create form
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    mobile: "",
    role: "sub_admin" as "admin" | "sub_admin",
    password: "",
    fullAccess: false,
    permissions: [] as string[],
  });

  // Edit permissions form
  const [editPerms, setEditPerms] = useState({
    fullAccess: false,
    permissions: [] as string[],
    role: "" as string,
  });

  // Reset password form
  const [resetPw, setResetPw] = useState("");
  const [showPw, setShowPw] = useState(false);

  const isMainAdmin = currentUser?.role === "main_admin";
  const canView = currentUser
    ? hasPermission(currentUser.role, currentUser.fullAccess, currentUser.permissions, "admins.view")
    : false;

  useEffect(() => {
    if (!authLoading && currentUser && canView) fetchAdmins();
    else if (!authLoading) setLoading(false);
  }, [currentUser, authLoading]);

  const fetchAdmins = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) setAdmins(await res.json());
      else toast.error("Failed to load admins");
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // --- Create ---
  const handleCreate = async () => {
    if (!createForm.name.trim()) { toast.error("Name is required"); return; }
    if (!createForm.email.trim()) { toast.error("Email is required"); return; }
    if (!createForm.password) { toast.error("Initial password is required"); return; }
    if (createForm.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Admin created");
        setModal(null);
        setCreateForm({ name: "", email: "", mobile: "", role: "sub_admin", password: "", fullAccess: false, permissions: [] });
        await fetchAdmins();
      } else {
        toast.error(data.error || "Failed to create admin");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  // --- Update permissions ---
  const handleUpdatePermissions = async (userId: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, action: "update_permissions", fullAccess: editPerms.fullAccess, permissions: editPerms.permissions }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Permissions updated");
        setModal(null);
        await fetchAdmins();
      } else toast.error(data.error || "Failed");
    } catch { toast.error("An error occurred"); } finally { setSaving(false); }
  };

  // --- Update role ---
  const handleUpdateRole = async (userId: string) => {
    if (!editPerms.role || editPerms.role === "main_admin") return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, action: "update_role", role: editPerms.role }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Role updated");
        await fetchAdmins();
      } else toast.error(data.error || "Failed");
    } catch { toast.error("An error occurred"); } finally { setSaving(false); }
  };

  // --- Reset password ---
  const handleResetPassword = async (userId: string) => {
    if (!resetPw || resetPw.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, action: "reset_password", password: resetPw }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Password reset");
        setModal(null);
        setResetPw("");
        await fetchAdmins();
      } else toast.error(data.error || "Failed");
    } catch { toast.error("An error occurred"); } finally { setSaving(false); }
  };

  // --- Toggle active ---
  const handleToggleActive = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, action: "toggle_active" }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        await fetchAdmins();
      } else toast.error(data.error || "Failed");
    } catch { toast.error("An error occurred"); }
  };

  // --- Permission toggle helper ---
  const togglePerm = (
    perms: string[],
    setPerms: (p: string[]) => void,
    perm: string,
  ) => {
    setPerms(perms.includes(perm) ? perms.filter((p) => p !== perm) : [...perms, perm]);
  };

  // --- Permission checkboxes ---
  const PermissionSelector = ({
    permissions,
    fullAccess,
    onToggle,
    onFullAccessChange,
    disabled,
  }: {
    permissions: string[];
    fullAccess: boolean;
    onToggle: (p: string) => void;
    onFullAccessChange: (v: boolean) => void;
    disabled?: boolean;
  }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onFullAccessChange(!fullAccess)}
          className={`w-5 h-5 rounded border flex items-center justify-center transition ${fullAccess ? "bg-primary border-primary" : "border-border bg-background/50"}`}
        >
          {fullAccess && <Check size={14} className="text-primary-foreground" />}
        </button>
        <span className="text-sm font-medium">Full Access (all permissions)</span>
      </div>
      {!fullAccess && (
        <div className="space-y-3 pl-1">
          {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
            <div key={group}>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">{group}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {perms.map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={disabled}
                    onClick={() => onToggle(p)}
                    className={`flex items-center gap-1.5 text-xs px-2 py-1.5 rounded border transition ${permissions.includes(p) ? "bg-primary/10 border-primary/30 text-primary" : "border-border/50 text-muted-foreground hover:bg-muted/30"}`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${permissions.includes(p) ? "bg-primary border-primary" : "border-border"}`}>
                      {permissions.includes(p) && <Check size={10} className="text-primary-foreground" />}
                    </div>
                    {(p as string).split(".").pop()}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser || !canView) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <ShieldAlert className="h-12 w-12 mb-4 opacity-40" />
        <h2 className="font-heading text-xl font-semibold text-foreground mb-1">Access Denied</h2>
        <p>You need permission to view admin management.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Admin Management</h2>
          <p className="text-muted-foreground mt-1">Manage admin accounts, roles, and permissions</p>
        </div>
        {isMainAdmin && (
          <Button size="sm" onClick={() => setModal({ type: "create" })}>
            <UserPlus size={16} className="mr-1" /> Create Admin
          </Button>
        )}
      </div>

      {/* Admin table */}
      <Card className="glass border-border/50">
        <CardHeader className="pb-0">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {admins.length} Admin Account{admins.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Access</TableHead>
                <TableHead className="text-center">Must Change PW</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                {isMainAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isMainAdmin ? 9 : 8} className="text-center py-8 text-muted-foreground">
                    No admin accounts found
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((a, i) => (
                  <TableRow key={a.id} className={a.isActive ? "" : "opacity-50"}>
                    <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                    <TableCell className="font-medium">
                      {a.name}
                      {a.id === currentUser.id && <span className="text-xs text-muted-foreground ml-1">(You)</span>}
                    </TableCell>
                    <TableCell className="text-sm">{a.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={roleColor[a.role] || ""}>
                        {ROLE_LABELS[a.role as AdminRole] || a.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {a.role === "main_admin" || a.fullAccess ? (
                        <Badge variant="outline" className="bg-green-500/15 text-green-400 border-green-500/30 text-xs">Full</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">{a.permissions.length} perms</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {a.mustChangePassword ? (
                        <Badge variant="outline" className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 text-xs">Yes</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={a.isActive ? "bg-green-500/15 text-green-400 border-green-500/30" : "bg-red-500/15 text-red-400 border-red-500/30"}>
                        {a.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "-"}
                    </TableCell>
                    {isMainAdmin && (
                      <TableCell className="text-right">
                        {a.role !== "main_admin" && (
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                              title="Edit Permissions"
                              onClick={() => {
                                setEditPerms({ fullAccess: a.fullAccess, permissions: [...a.permissions], role: a.role });
                                setModal({ type: "edit_permissions", user: a });
                              }}
                            >
                              <ShieldCheck size={15} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                              title="Reset Password"
                              onClick={() => {
                                setResetPw("");
                                setShowPw(false);
                                setModal({ type: "reset_password", user: a });
                              }}
                            >
                              <KeyRound size={15} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className={`h-7 w-7 ${a.isActive ? "text-red-400 hover:text-red-300 hover:bg-red-500/10" : "text-green-400 hover:text-green-300 hover:bg-green-500/10"}`}
                              title={a.isActive ? "Deactivate" : "Activate"}
                              onClick={() => handleToggleActive(a.id)}
                            >
                              <Power size={15} />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* --- Modals --- */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="glass border border-border/50 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            {/* CREATE MODAL */}
            {modal.type === "create" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-display font-bold flex items-center gap-2">
                    <Plus size={20} className="text-primary" /> Create Admin
                  </h3>
                  <button onClick={() => setModal(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <Label>Full Name *</Label>
                    <Input className="bg-background/50" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} disabled={saving} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email *</Label>
                    <Input type="email" className="bg-background/50" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} disabled={saving} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mobile</Label>
                    <Input className="bg-background/50" value={createForm.mobile} onChange={(e) => setCreateForm({ ...createForm, mobile: e.target.value })} disabled={saving} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Role *</Label>
                    <Select value={createForm.role} onValueChange={(v) => setCreateForm({ ...createForm, role: v as "admin" | "sub_admin" })} disabled={saving}>
                      <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="sub_admin">Sub Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Initial Password *</Label>
                    <div className="relative">
                      <Input
                        type={showPw ? "text" : "password"}
                        className="bg-background/50 pr-9"
                        value={createForm.password}
                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                        disabled={saving}
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/50 pt-3">
                  <p className="text-sm font-medium mb-2">Permissions</p>
                  <PermissionSelector
                    permissions={createForm.permissions}
                    fullAccess={createForm.fullAccess}
                    onToggle={(p) => togglePerm(createForm.permissions, (ps) => setCreateForm({ ...createForm, permissions: ps }), p)}
                    onFullAccessChange={(v) => setCreateForm({ ...createForm, fullAccess: v, permissions: v ? [...ALL_PERMISSIONS] : createForm.permissions })}
                    disabled={saving}
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" onClick={() => setModal(null)} disabled={saving}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={saving}>{saving ? "Creating..." : "Create Admin"}</Button>
                </div>
              </div>
            )}

            {/* EDIT PERMISSIONS MODAL */}
            {modal.type === "edit_permissions" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-display font-bold">Edit: {modal.user.name}</h3>
                  <button onClick={() => setModal(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
                </div>

                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={editPerms.role} onValueChange={(v) => setEditPerms({ ...editPerms, role: v })} disabled={saving}>
                    <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="sub_admin">Sub Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {editPerms.role !== modal.user.role && (
                    <Button size="sm" variant="outline" className="mt-1" onClick={() => handleUpdateRole(modal.user.id)} disabled={saving}>
                      Save Role Change
                    </Button>
                  )}
                </div>

                <div className="border-t border-border/50 pt-3">
                  <p className="text-sm font-medium mb-2">Permissions</p>
                  <PermissionSelector
                    permissions={editPerms.permissions}
                    fullAccess={editPerms.fullAccess}
                    onToggle={(p) => togglePerm(editPerms.permissions, (ps) => setEditPerms({ ...editPerms, permissions: ps }), p)}
                    onFullAccessChange={(v) => setEditPerms({ ...editPerms, fullAccess: v, permissions: v ? [...ALL_PERMISSIONS] : editPerms.permissions })}
                    disabled={saving}
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" onClick={() => setModal(null)} disabled={saving}>Cancel</Button>
                  <Button onClick={() => handleUpdatePermissions(modal.user.id)} disabled={saving}>
                    {saving ? "Saving..." : "Save Permissions"}
                  </Button>
                </div>
              </div>
            )}

            {/* RESET PASSWORD MODAL */}
            {modal.type === "reset_password" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-display font-bold">Reset Password: {modal.user.name}</h3>
                  <button onClick={() => setModal(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
                </div>

                <p className="text-sm text-muted-foreground">
                  Set a new temporary password. The user will be forced to change it on their next login.
                </p>

                <div className="space-y-1.5">
                  <Label>New Password</Label>
                  <div className="relative">
                    <Input
                      type={showPw ? "text" : "password"}
                      className="bg-background/50 pr-9"
                      value={resetPw}
                      onChange={(e) => setResetPw(e.target.value)}
                      disabled={saving}
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" onClick={() => setModal(null)} disabled={saving}>Cancel</Button>
                  <Button variant="destructive" onClick={() => handleResetPassword(modal.user.id)} disabled={saving}>
                    {saving ? "Resetting..." : "Reset Password"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;

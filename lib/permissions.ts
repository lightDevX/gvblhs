// Shared role, permission, and access-control constants/helpers used by both client and server.

export const VALID_ROLES = ["main_admin", "admin", "sub_admin"] as const;
export type AdminRole = (typeof VALID_ROLES)[number];

export const ALL_PERMISSIONS = [
  "dashboard.view",
  "registrations.view",
  "registrations.edit",
  "registrations.export",
  "messages.view",
  "messages.edit",
  "admins.view",
  "admins.create",
  "admins.edit",
  "admins.reset_password",
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

/** Grouped for UI display. */
export const PERMISSION_GROUPS: Record<string, readonly Permission[]> = {
  Dashboard: ["dashboard.view"],
  Registrations: [
    "registrations.view",
    "registrations.edit",
    "registrations.export",
  ],
  Messages: ["messages.view", "messages.edit"],
  "Admin Management": [
    "admins.view",
    "admins.create",
    "admins.edit",
    "admins.reset_password",
  ],
};

/** Check whether an admin has a specific permission. */
export function hasPermission(
  role: string,
  fullAccess: boolean,
  permissions: string[],
  required: Permission | string,
): boolean {
  if (role === "main_admin") return true;
  if (fullAccess) return true;
  return permissions.includes(required);
}

/** Check whether an admin has *any* of the listed permissions. */
export function hasAnyPermission(
  role: string,
  fullAccess: boolean,
  permissions: string[],
  required: (Permission | string)[],
): boolean {
  if (role === "main_admin") return true;
  if (fullAccess) return true;
  return required.some((p) => permissions.includes(p));
}

/** Human-readable role labels. */
export const ROLE_LABELS: Record<AdminRole, string> = {
  main_admin: "Main Admin",
  admin: "Admin",
  sub_admin: "Sub Admin",
};

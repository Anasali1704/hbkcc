export const userRoles = ["student", "parent", "teacher", "admin"] as const;

export type UserRole = (typeof userRoles)[number];
export type SignupRole = Extract<UserRole, "student" | "parent">;

export const roleLabels: Record<UserRole, string> = {
  student: "Elev",
  parent: "Forælder",
  teacher: "Underviser",
  admin: "Administrator",
};

export function getRoleLabel(role: string | null | undefined) {
  return role && role in roleLabels
    ? roleLabels[role as UserRole]
    : "Ukendt rolle";
}

export function canManageTeaching(role: string | null | undefined) {
  return role === "admin" || role === "teacher";
}

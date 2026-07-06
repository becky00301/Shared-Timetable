import type { ProjectRole } from "@/types/project";

export function canEdit(role?: ProjectRole | null) {
  return role === "owner" || role === "editor";
}

export function canManage(role?: ProjectRole | null) {
  return role === "owner";
}

export function roleLabel(role?: ProjectRole | null) {
  if (role === "owner") return "Owner";
  if (role === "editor") return "Editor";
  return "Viewer";
}

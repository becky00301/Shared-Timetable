export type ProjectRole = "owner" | "editor" | "viewer";

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  created_at: string;
};

export type ProjectKind = "weekly" | "daterange";

export type Project = {
  id: string;
  owner_id: string;
  title: string;
  description?: string | null;
  slug: string;
  kind: ProjectKind;
  google_calendar_id?: string | null;
  invite_token: string;
  created_at: string;
  updated_at: string;
};

export type ProjectMember = {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  created_at: string;
  user?: UserProfile;
};

export type ProjectDay = {
  id: string;
  project_id: string;
  date: string;
  sort_order: number;
  note?: string | null;
  created_at: string;
};

export type ProjectNote = {
  id: string;
  project_id: string;
  creator_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
};

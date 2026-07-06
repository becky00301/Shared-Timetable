export type ProjectRole = "owner" | "editor" | "viewer";

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  created_at: string;
};

export type Project = {
  id: string;
  owner_id: string;
  title: string;
  description?: string | null;
  slug: string;
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
  created_at: string;
};

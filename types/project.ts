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
  invite_token: string;
  embed_token: string;
  /** Planned budget for the whole timetable. Null means none has been set. */
  budget_total?: number | null;
  budget_currency?: string | null;
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
  wake_time?: string | null;
  sleep_duration_minutes?: number | null;
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

/** Money spent that never had a schedule of its own. Schedule amounts and
    these rows are summed together into the project's spent total. */
export type ProjectExpense = {
  id: string;
  project_id: string;
  creator_id: string | null;
  label: string;
  amount: number;
  spent_on?: string | null;
  created_at: string;
  updated_at: string;
};

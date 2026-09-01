export type ScheduleItem = {
  id: string;
  project_id: string;
  day_id: string;
  creator_id: string | null;
  title: string;
  description?: string | null;
  location?: string | null;
  start_time: string;
  end_time: string;
  color: string;
  all_day?: boolean;
  end_day_id?: string | null;
  /** What this item costs. Null means no amount was entered, which is
      different from a free item at 0. */
  amount?: number | null;
  created_at: string;
  updated_at: string;
};

export type AvailabilitySlot = {
  id: string;
  project_id: string;
  user_id: string;
  day_id: string;
  start_time: string;
  end_time: string;
  created_at: string;
};

export type Attachment = {
  id: string;
  project_id: string;
  schedule_item_id: string;
  type: "link" | "image" | "pdf" | "map";
  url: string;
  title?: string | null;
  created_at: string;
};

export type DraftSelection = {
  day_id: string;
  start_time: string;
  end_time: string;
};

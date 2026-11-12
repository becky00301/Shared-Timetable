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
  /** Path of the item's photo in the schedule-photos Storage bucket. */
  image_path?: string | null;
  /** Focal point of the photo, in percent from its left and top edges. Null
      means centred. */
  image_focus_x?: number | null;
  image_focus_y?: number | null;
  /** Where the place is, when it was picked from the place search. Null on
      both means the route map has to guess from `location`. */
  location_lat?: number | null;
  location_lng?: number | null;
  /** Source of that point, e.g. "osm:W123" or "wikidata:Q123". */
  location_place_id?: string | null;
  created_at: string;
  updated_at: string;
};

/** A picked place's position and where it came from. */
export type LocationPoint = { lat: number; lng: number; placeId: string | null };

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

import type { AvailabilitySlot, Attachment, ScheduleItem } from "@/types/schedule";
import type { Project, ProjectDay, ProjectMember, UserProfile } from "@/types/project";

const now = new Date().toISOString();

export const seedUsers: UserProfile[] = [
  {
    id: "u-jiho",
    email: "jiho@example.com",
    name: "Jiho Kwon",
    avatar: null,
    created_at: now
  },
  {
    id: "u-minsu",
    email: "minsu@example.com",
    name: "Minsu Park",
    avatar: null,
    created_at: now
  },
  {
    id: "u-sujin",
    email: "sujin@example.com",
    name: "Sujin Lee",
    avatar: null,
    created_at: now
  }
];

export const seedProjects: Project[] = [
  {
    id: "p-europe",
    owner_id: "u-jiho",
    title: "European Trip",
    description: "Selected-day itinerary for museums, food, and transit windows.",
    slug: "europe-trip",
    invite_token: "invite-europe-trip",
    created_at: now,
    updated_at: now
  },
  {
    id: "p-exhibition",
    owner_id: "u-jiho",
    title: "Graduation Exhibition Prep",
    description: "Install, review, and final opening schedule.",
    slug: "graduation-exhibition-prep",
    invite_token: "invite-exhibition",
    created_at: now,
    updated_at: now
  }
];

export const seedDays: ProjectDay[] = [
  { id: "d-17", project_id: "p-europe", date: "2026-06-17", sort_order: 0, created_at: now },
  { id: "d-18", project_id: "p-europe", date: "2026-06-18", sort_order: 1, created_at: now },
  { id: "d-22", project_id: "p-europe", date: "2026-06-22", sort_order: 2, created_at: now },
  { id: "d-23", project_id: "p-europe", date: "2026-06-23", sort_order: 3, created_at: now }
];

export const seedMembers: ProjectMember[] = [
  {
    id: "m-1",
    project_id: "p-europe",
    user_id: "u-jiho",
    role: "owner",
    created_at: now,
    user: seedUsers[0]
  },
  {
    id: "m-2",
    project_id: "p-europe",
    user_id: "u-minsu",
    role: "editor",
    created_at: now,
    user: seedUsers[1]
  },
  {
    id: "m-3",
    project_id: "p-europe",
    user_id: "u-sujin",
    role: "viewer",
    created_at: now,
    user: seedUsers[2]
  }
];

export const seedSchedules: ScheduleItem[] = [
  {
    id: "s-1",
    project_id: "p-europe",
    day_id: "d-17",
    creator_id: "u-jiho",
    title: "Breakfast",
    location: "Saint-Germain",
    description: "Meet near the station before the museum run.",
    start_time: "08:00",
    end_time: "09:15",
    color: "#1972F7",
    created_at: now,
    updated_at: now
  },
  {
    id: "s-2",
    project_id: "p-europe",
    day_id: "d-17",
    creator_id: "u-jiho",
    title: "Louvre",
    location: "Rue de Rivoli",
    description: "Main gallery window and ticket buffer.",
    start_time: "10:00",
    end_time: "12:30",
    color: "#8B5CF6",
    created_at: now,
    updated_at: now
  },
  {
    id: "s-3",
    project_id: "p-europe",
    day_id: "d-18",
    creator_id: "u-minsu",
    title: "Musée d'Orsay",
    location: "Left Bank",
    description: "Afternoon museum slot.",
    start_time: "14:00",
    end_time: "16:00",
    color: "#F59E0B",
    created_at: now,
    updated_at: now
  },
  {
    id: "s-4",
    project_id: "p-europe",
    day_id: "d-22",
    creator_id: "u-jiho",
    title: "Dinner",
    location: "Le Marais",
    description: "Reservation confirmation pending.",
    start_time: "18:00",
    end_time: "20:00",
    color: "#22C55E",
    created_at: now,
    updated_at: now
  }
];

export const seedAvailability: AvailabilitySlot[] = [
  {
    id: "a-1",
    project_id: "p-europe",
    user_id: "u-jiho",
    day_id: "d-17",
    start_time: "09:00",
    end_time: "18:00",
    created_at: now
  },
  {
    id: "a-2",
    project_id: "p-europe",
    user_id: "u-minsu",
    day_id: "d-17",
    start_time: "13:00",
    end_time: "18:00",
    created_at: now
  },
  {
    id: "a-3",
    project_id: "p-europe",
    user_id: "u-sujin",
    day_id: "d-17",
    start_time: "15:00",
    end_time: "20:00",
    created_at: now
  }
];

export const seedAttachments: Attachment[] = [
  {
    id: "att-1",
    project_id: "p-europe",
    schedule_item_id: "s-2",
    type: "link",
    url: "https://www.louvre.fr",
    title: "Museum tickets",
    created_at: now
  },
  {
    id: "att-2",
    project_id: "p-europe",
    schedule_item_id: "s-4",
    type: "map",
    url: "https://maps.google.com",
    title: "Restaurant map",
    created_at: now
  }
];

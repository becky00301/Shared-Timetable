-- Where a schedule item's place is, as picked from the place search in the
-- event panel. location stays the label people read; these pin it on the
-- route map. All null means no place was picked — the map then guesses from
-- the label as it did before. location_place_id records where the point came
-- from ("osm:W123", "wikidata:Q123") so a pick can be told from a guess.

alter table public.schedule_items
  add column if not exists location_lat double precision,
  add column if not exists location_lng double precision,
  add column if not exists location_place_id text;

alter table public.schedule_items
  drop constraint if exists schedule_items_location_point_check;

alter table public.schedule_items
  add constraint schedule_items_location_point_check
  check (
    (
      (location_lat is null and location_lng is null)
      or (
        location_lat between -90 and 90
        and location_lng between -180 and 180
      )
    )
    and (location_place_id is null or length(location_place_id) <= 100)
  );

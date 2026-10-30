-- The project row itself stays owner-only. Editors get a narrowly scoped
-- budget operation; its privileged implementation is outside exposed schemas.
create schema if not exists budget_private;
revoke all on schema budget_private from public, anon, authenticated;
grant usage on schema budget_private to authenticated;

create or replace function budget_private.update_project_budget(project_uuid uuid, budget_patch jsonb)
returns setof public.projects
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not coalesce(public.can_edit_project(project_uuid), false) then
    raise exception 'Editing permission required' using errcode = '42501';
  end if;

  if budget_patch is null or jsonb_typeof(budget_patch) <> 'object' then
    raise exception 'Budget patch must be an object' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_object_keys(budget_patch) as fields(name)
    where name not in ('budget_total', 'budget_currency')
  ) then
    raise exception 'Only budget fields may be changed' using errcode = '22023';
  end if;
  if budget_patch ? 'budget_total'
    and jsonb_typeof(budget_patch->'budget_total') not in ('number', 'null') then
    raise exception 'Budget total must be a number or null' using errcode = '22023';
  end if;
  if budget_patch ? 'budget_currency'
    and jsonb_typeof(budget_patch->'budget_currency') <> 'string' then
    raise exception 'Budget currency must be a string' using errcode = '22023';
  end if;

  return query
  update public.projects p
  set budget_total = case when budget_patch ? 'budget_total'
        then (budget_patch->>'budget_total')::numeric else p.budget_total end,
      budget_currency = case when budget_patch ? 'budget_currency'
        then budget_patch->>'budget_currency' else p.budget_currency end
  where p.id = project_uuid
  returning p.*;
end;
$$;

revoke all on function budget_private.update_project_budget(uuid, jsonb) from public, anon, authenticated;
grant execute on function budget_private.update_project_budget(uuid, jsonb) to authenticated;

-- PostgREST exposes this invoker wrapper, not the privileged implementation.
create or replace function public.update_project_budget(project_uuid uuid, budget_patch jsonb)
returns setof public.projects
language sql
security invoker
set search_path = ''
as $$
  select * from budget_private.update_project_budget(project_uuid, budget_patch);
$$;

revoke all on function public.update_project_budget(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.update_project_budget(uuid, jsonb) to authenticated;

-- Run against a database with an editor membership. All test changes roll back.
begin;
do $$
declare
  target uuid;
  editor uuid;
  project_owner uuid;
  changed integer;
  saved public.projects;
  original public.projects;
begin
  select p.id, pm.user_id, p.owner_id into target, editor, project_owner
  from public.projects p join public.project_members pm on pm.project_id = p.id
  where pm.role = 'editor' and pm.user_id <> p.owner_id
  order by p.created_at desc limit 1;
  if target is null then raise exception 'An editor membership is required for this test'; end if;
  select * into original from public.projects where id = target;

  perform set_config('request.jwt.claim.sub', editor::text, true);
  execute 'set local role authenticated';
  update public.projects set budget_total = 2000000 where id = target;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Editor unexpectedly has direct project management access'; end if;

  select * into saved from public.update_project_budget(target, '{"budget_total":2000000}');
  if saved.budget_total is distinct from 2000000::numeric
    or saved.budget_currency is distinct from original.budget_currency
    or saved.owner_id is distinct from original.owner_id
    or saved.invite_token is distinct from original.invite_token then
    raise exception 'Editor budget update changed unexpected fields';
  end if;
  select * into saved from public.update_project_budget(target, '{"budget_currency":"USD"}');
  if saved.budget_total is distinct from 2000000::numeric or saved.budget_currency <> 'USD' then
    raise exception 'Currency update lost budget amount';
  end if;
  select * into saved from public.update_project_budget(target, '{"budget_total":null}');
  if saved.budget_total is not null then raise exception 'Clearing the budget failed'; end if;

  begin
    perform public.update_project_budget(target, '{"owner_id":"00000000-0000-0000-0000-000000000000"}');
    raise exception 'Unexpected project management access';
  exception when sqlstate '22023' then null; end;
  begin
    perform public.update_project_budget(target, '{"budget_total":-1}');
    raise exception 'Negative budget accepted';
  exception when check_violation then null; end;

  perform set_config('request.jwt.claim.sub', project_owner::text, true);
  select * into saved from public.update_project_budget(target, '{"budget_total":0}');
  if saved.budget_total is distinct from 0::numeric then raise exception 'Owner budget update failed'; end if;

  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  begin
    perform public.update_project_budget(target, '{"budget_total":1}');
    raise exception 'Nonmember saved a budget';
  exception when insufficient_privilege then null; end;

  execute 'reset role';
  update public.project_members set role = 'viewer' where project_id = target and user_id = editor;
  perform set_config('request.jwt.claim.sub', editor::text, true);
  execute 'set local role authenticated';
  begin
    perform public.update_project_budget(target, '{"budget_total":1}');
    raise exception 'Viewer saved a budget';
  exception when insufficient_privilege then null; end;

  perform set_config('request.jwt.claim.sub', '', true);
  begin
    perform public.update_project_budget(target, '{"budget_total":1}');
    raise exception 'Unauthenticated caller saved a budget';
  exception when insufficient_privilege then null; end;
end;
$$;
rollback;
select 'PASS: editor/owner save, null/zero/partial updates, viewer/nonmember/auth checks, field restrictions' as result;

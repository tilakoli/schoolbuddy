begin;
-- The parent relation is enforced even for privileged server inserts.
alter table public.ai_chat_sessions add constraint ai_chat_sessions_id_owner_key unique (id, user_id);
alter table public.ai_chat_messages add constraint ai_chat_messages_session_owner_fkey
  foreign key (session_id, user_id) references public.ai_chat_sessions (id, user_id)
  on delete cascade not valid;
-- NOT VALID preserves any historical inconsistent rows for investigation while
-- enforcing every new write. Validate after inspecting existing data.
drop policy if exists "Users manage own chat messages" on public.ai_chat_messages;
create policy "Users read messages in own sessions" on public.ai_chat_messages for select
  using (user_id = auth.uid() and exists (
    select 1 from public.ai_chat_sessions s where s.id = session_id and s.user_id = auth.uid()
  ));
revoke insert, update, delete on public.ai_chat_messages from anon, authenticated;

-- File rows cannot point outside their owning material's storage directory.
alter table public.material_files add constraint material_files_path_matches_material
  check (split_part(file_path, '/', 2) = material_id::text) not valid;

-- Role/school are trusted only from Admin API app_metadata. Existing profiles
-- are untouched. Public user_metadata can still supply a display name.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, school_id)
  values (
    new.id, new.email, new.raw_user_meta_data ->> 'full_name',
    case when new.raw_app_meta_data ->> 'role' in ('admin', 'vice_principal', 'teacher', 'student')
      then new.raw_app_meta_data ->> 'role' else 'student' end,
    coalesce((new.raw_app_meta_data ->> 'school_id')::uuid,
      (select id from public.schools order by created_at limit 1))
  ) on conflict (id) do nothing;
  return new;
end;
$$;
commit;

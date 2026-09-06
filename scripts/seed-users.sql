-- School Buddy: seed admin / teacher / student accounts.
--
-- Supabase Dashboard -> SQL Editor -> edit the emails/passwords/names in the
-- v_users array below -> Run.
--
-- Note: this writes directly to Supabase's internal `auth` schema, which
-- isn't an officially documented API and could change between Supabase
-- versions. It's a common pattern for seeding dev/test accounts and works on
-- current GoTrue schemas; for production account creation prefer Dashboard ->
-- Authentication -> Add user, or the admin API.
--
-- Run supabase/migrations/0001_roles.sql first if you haven't — these inserts
-- rely on the handle_new_user trigger it creates to populate public.profiles.

do $$
declare
  v_id uuid;
  v_email text;
  v_password text;
  v_role text;
  v_full_name text;
  v_users jsonb := '[
    {"email": "admin.test@schoolbuddy.dev",   "password": "TestPass123!", "role": "admin",   "full_name": "Test Admin"},
    {"email": "teacher.test@schoolbuddy.dev", "password": "TestPass123!", "role": "teacher", "full_name": "Test Teacher"},
    {"email": "student.test@schoolbuddy.dev", "password": "TestPass123!", "role": "student", "full_name": "Test Student"}
  ]'::jsonb;
  v_user jsonb;
begin
  for v_user in select * from jsonb_array_elements(v_users)
  loop
    v_id := gen_random_uuid(); 
    v_email := v_user ->> 'email';
    v_password := v_user ->> 'password';
    v_role := v_user ->> 'role';
    v_full_name := v_user ->> 'full_name';

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_id,
      'authenticated',
      'authenticated',
      v_email,
      extensions.crypt(v_password, extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('role', v_role, 'full_name', v_full_name),
      now(),
      now(),
      '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(),
      v_id,
      v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', v_email),
      'email',
      now(),
      now(),
      now()
    );
  end loop;
end $$;

-- Verify:
-- select email, role from public.profiles order by role;

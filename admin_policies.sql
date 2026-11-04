-- Chạy trong Supabase SQL Editor (chạy lại nhiều lần không sao).
-- Gồm: cột email/is_active, đồng bộ hồ sơ khi đăng ký, hàm is_admin(), policy cho admin, hàm xóa tài khoản.

-- 1) Cột bổ sung ---------------------------------------------------------
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists is_active boolean not null default true;
update public.profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;

-- 2) Đăng ký: tạo/đồng bộ hồ sơ. Quyền luôn là 'student' (KHÔNG tin metadata để cấp admin).
create or replace function public.sync_profile_from_auth() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email, 'student')
  on conflict (id) do update set email = excluded.email, role = coalesce(nullif(public.profiles.role, ''), 'student');
  return new;
end $$;
drop trigger if exists zz_sync_profile_from_auth on auth.users;
create trigger zz_sync_profile_from_auth after insert on auth.users for each row execute function public.sync_profile_from_auth();
update public.profiles set role = 'student' where role is null or role = '';

-- 3) is_admin(): SECURITY DEFINER để policy không đệ quy khi đọc bảng profiles
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and is_active) $$;

-- 4) profiles: user chỉ sửa hồ sơ của mình, KHÔNG tự đổi quyền / mở khóa
--    (riêng quyền rỗng → 'student' thì được, để app tự vá hồ sơ thiếu quyền)
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (
  id = (select auth.uid())
  and is_active is not false
  and (role is not distinct from (select p.role from public.profiles p where p.id = (select auth.uid()))
       or (coalesce((select p.role from public.profiles p where p.id = (select auth.uid())), '') = '' and role = 'student'))
);
drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile" on public.profiles for insert to authenticated
with check (id = (select auth.uid()) and role = 'student');

drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles" on public.profiles for select to authenticated using (public.is_admin());
drop policy if exists "Admins update any profile" on public.profiles;
create policy "Admins update any profile" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- 5) Admin thêm/sửa/xóa dữ liệu học tập và nội dung
do $$
declare t text;
begin
  foreach t in array array['conversation_sessions','conversation_messages','conversation_evaluations','bookmarks','user_vocabulary'] loop
    execute format('drop policy if exists "Admins read %1$s" on public.%1$I', t);
    execute format('create policy "Admins read %1$s" on public.%1$I for select to authenticated using (public.is_admin())', t);
    execute format('drop policy if exists "Admins delete %1$s" on public.%1$I', t);
    execute format('drop policy if exists "Admins write %1$s" on public.%1$I', t);
    execute format('create policy "Admins write %1$s" on public.%1$I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
  foreach t in array array['categories','scenarios','vocabulary'] loop
    execute format('drop policy if exists "Admins write %1$s" on public.%1$I', t);
    execute format('create policy "Admins write %1$s" on public.%1$I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- 6) Xóa tài khoản (auth.users → cascade dữ liệu). Chỉ admin gọi được, không xóa chính mình.
create or replace function public.admin_delete_user(target uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'Chỉ quản trị viên được xóa tài khoản'; end if;
  if target = auth.uid() then raise exception 'Không thể tự xóa chính mình'; end if;
  delete from public.profiles where id = target;
  delete from auth.users where id = target;
end $$;
revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;

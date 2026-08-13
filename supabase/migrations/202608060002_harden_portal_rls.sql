-- Authoritative RLS rules for the HBKCC portal tables. This migration removes
-- policies only from the tables owned by this application and recreates them.

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

create or replace function public.is_parent_of(child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.parent_students
    where parent_id = auth.uid() and student_id = child_id
  );
$$;

create or replace function public.is_teacher_of_class(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.enrollments
    where class_id = target_class_id
      and user_id = auth.uid()
      and role = 'teacher'
  );
$$;

create or replace function public.can_view_class(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1 from public.enrollments
      where class_id = target_class_id and user_id = auth.uid()
    )
    or exists (
      select 1
      from public.enrollments e
      join public.parent_students ps on ps.student_id = e.user_id
      where e.class_id = target_class_id and ps.parent_id = auth.uid()
    );
$$;

create or replace function public.can_manage_class(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or public.is_teacher_of_class(target_class_id);
$$;

create or replace function public.can_view_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_profile_id = auth.uid()
    or public.is_admin()
    or public.is_parent_of(target_profile_id)
    or exists (
      select 1
      from public.enrollments teacher_enrollment
      join public.enrollments target_enrollment
        on target_enrollment.class_id = teacher_enrollment.class_id
      where teacher_enrollment.user_id = auth.uid()
        and teacher_enrollment.role = 'teacher'
        and target_enrollment.user_id = target_profile_id
    );
$$;

create or replace function public.can_manage_lesson(target_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.lessons
    where id = target_lesson_id and public.can_manage_class(class_id)
  );
$$;

create or replace function public.can_manage_semester(target_semester_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.semesters
    where id = target_semester_id and public.can_manage_class(class_id)
  );
$$;

create or replace function public.can_view_storage_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  select exists (
    select 1 from public.class_files f
    where f.file_path = object_name and public.can_view_class(f.class_id)
  ) or exists (
    select 1
    from public.lesson_resources r
    join public.lessons l on l.id = r.lesson_id
    where r.file_path = object_name and public.can_view_class(l.class_id)
  ) or exists (
    select 1
    from public.semester_resources r
    join public.semesters s on s.id = r.semester_id
    where r.file_path = object_name and public.can_view_class(s.class_id)
  );
$$;

create or replace function public.can_manage_storage_path(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  select exists (
    select 1 from public.classes c
    where c.id::text = (storage.foldername(object_name))[1]
      and public.can_manage_class(c.id)
  ) or exists (
    select 1 from public.lessons l
    where (storage.foldername(object_name))[1] = 'lessons'
      and l.id::text = (storage.foldername(object_name))[2]
      and public.can_manage_class(l.class_id)
  ) or exists (
    select 1 from public.semesters s
    where (storage.foldername(object_name))[1] = 'semesters'
      and s.id::text = (storage.foldername(object_name))[2]
      and public.can_manage_class(s.class_id)
  );
$$;

revoke all on function public.current_user_role() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_parent_of(uuid) from public;
revoke all on function public.is_teacher_of_class(uuid) from public;
revoke all on function public.can_view_class(uuid) from public;
revoke all on function public.can_manage_class(uuid) from public;
revoke all on function public.can_view_profile(uuid) from public;
revoke all on function public.can_manage_lesson(uuid) from public;
revoke all on function public.can_manage_semester(uuid) from public;
revoke all on function public.can_view_storage_object(text) from public;
revoke all on function public.can_manage_storage_path(text) from public;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_parent_of(uuid) to authenticated;
grant execute on function public.is_teacher_of_class(uuid) to authenticated;
grant execute on function public.can_view_class(uuid) to authenticated;
grant execute on function public.can_manage_class(uuid) to authenticated;
grant execute on function public.can_view_profile(uuid) to authenticated;
grant execute on function public.can_manage_lesson(uuid) to authenticated;
grant execute on function public.can_manage_semester(uuid) to authenticated;
grant execute on function public.can_view_storage_object(text) to authenticated;
grant execute on function public.can_manage_storage_path(text) to authenticated;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (array[
        'profiles', 'classes', 'semesters', 'enrollments', 'lessons',
        'attendance', 'class_files', 'lesson_resources',
        'semester_resources', 'parent_students'
      ])
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.semesters enable row level security;
alter table public.enrollments enable row level security;
alter table public.lessons enable row level security;
alter table public.attendance enable row level security;
alter table public.class_files enable row level security;
alter table public.lesson_resources enable row level security;
alter table public.semester_resources enable row level security;
alter table public.parent_students enable row level security;

create policy "profiles_select_authorized"
on public.profiles for select to authenticated
using (public.can_view_profile(id));

create policy "profiles_insert_self_or_admin"
on public.profiles for insert to authenticated
with check (
  public.is_admin()
  or (id = auth.uid() and role::text in ('student', 'parent'))
);

create policy "profiles_update_admin"
on public.profiles for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "profiles_delete_admin"
on public.profiles for delete to authenticated
using (public.is_admin());

create policy "classes_select_authorized"
on public.classes for select to authenticated
using (public.can_view_class(id));

create policy "classes_insert_admin"
on public.classes for insert to authenticated
with check (public.is_admin());

create policy "classes_update_admin"
on public.classes for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "classes_delete_admin"
on public.classes for delete to authenticated
using (public.is_admin());

create policy "semesters_select_authorized"
on public.semesters for select to authenticated
using (public.can_view_class(class_id));

create policy "semesters_insert_managers"
on public.semesters for insert to authenticated
with check (public.can_manage_class(class_id));

create policy "semesters_update_managers"
on public.semesters for update to authenticated
using (public.can_manage_class(class_id))
with check (public.can_manage_class(class_id));

create policy "semesters_delete_managers"
on public.semesters for delete to authenticated
using (public.can_manage_class(class_id));

create policy "enrollments_select_authorized"
on public.enrollments for select to authenticated
using (
  public.is_admin()
  or user_id = auth.uid()
  or public.is_teacher_of_class(class_id)
  or public.is_parent_of(user_id)
);

create policy "enrollments_insert_admin"
on public.enrollments for insert to authenticated
with check (public.is_admin());

create policy "enrollments_update_admin"
on public.enrollments for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "enrollments_delete_admin"
on public.enrollments for delete to authenticated
using (public.is_admin());

create policy "lessons_select_authorized"
on public.lessons for select to authenticated
using (public.can_view_class(class_id));

create policy "lessons_insert_managers"
on public.lessons for insert to authenticated
with check (public.can_manage_class(class_id));

create policy "lessons_update_managers"
on public.lessons for update to authenticated
using (public.can_manage_class(class_id))
with check (public.can_manage_class(class_id));

create policy "lessons_delete_managers"
on public.lessons for delete to authenticated
using (public.can_manage_class(class_id));

create policy "attendance_select_authorized"
on public.attendance for select to authenticated
using (
  user_id = auth.uid()
  or public.is_parent_of(user_id)
  or public.is_admin()
  or public.can_manage_lesson(lesson_id)
);

create policy "attendance_insert_managers"
on public.attendance for insert to authenticated
with check (public.can_manage_lesson(lesson_id));

create policy "attendance_update_managers"
on public.attendance for update to authenticated
using (public.can_manage_lesson(lesson_id))
with check (public.can_manage_lesson(lesson_id));

create policy "attendance_delete_managers"
on public.attendance for delete to authenticated
using (public.can_manage_lesson(lesson_id));

create policy "class_files_select_authorized"
on public.class_files for select to authenticated
using (public.can_view_class(class_id));

create policy "class_files_insert_managers"
on public.class_files for insert to authenticated
with check (public.can_manage_class(class_id));

create policy "class_files_update_managers"
on public.class_files for update to authenticated
using (public.can_manage_class(class_id))
with check (public.can_manage_class(class_id));

create policy "class_files_delete_managers"
on public.class_files for delete to authenticated
using (public.can_manage_class(class_id));

create policy "lesson_resources_select_authorized"
on public.lesson_resources for select to authenticated
using (
  exists (
    select 1 from public.lessons l
    where l.id = lesson_id and public.can_view_class(l.class_id)
  )
);

create policy "lesson_resources_insert_managers"
on public.lesson_resources for insert to authenticated
with check (public.can_manage_lesson(lesson_id));

create policy "lesson_resources_update_managers"
on public.lesson_resources for update to authenticated
using (public.can_manage_lesson(lesson_id))
with check (public.can_manage_lesson(lesson_id));

create policy "lesson_resources_delete_managers"
on public.lesson_resources for delete to authenticated
using (public.can_manage_lesson(lesson_id));

create policy "semester_resources_select_authorized"
on public.semester_resources for select to authenticated
using (
  exists (
    select 1 from public.semesters s
    where s.id = semester_id and public.can_view_class(s.class_id)
  )
);

create policy "semester_resources_insert_managers"
on public.semester_resources for insert to authenticated
with check (public.can_manage_semester(semester_id));

create policy "semester_resources_update_managers"
on public.semester_resources for update to authenticated
using (public.can_manage_semester(semester_id))
with check (public.can_manage_semester(semester_id));

create policy "semester_resources_delete_managers"
on public.semester_resources for delete to authenticated
using (public.can_manage_semester(semester_id));

create policy "parent_students_select_authorized"
on public.parent_students for select to authenticated
using (parent_id = auth.uid() or student_id = auth.uid() or public.is_admin());

create policy "parent_students_insert_admin"
on public.parent_students for insert to authenticated
with check (public.is_admin());

create policy "parent_students_update_admin"
on public.parent_students for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "parent_students_delete_admin"
on public.parent_students for delete to authenticated
using (public.is_admin());

-- These policies apply only to the class-files bucket and leave other buckets
-- and their policies untouched.
drop policy if exists "Parents can download child teaching files" on storage.objects;
drop policy if exists "hbkcc_class_files_select" on storage.objects;
drop policy if exists "hbkcc_class_files_insert" on storage.objects;
drop policy if exists "hbkcc_class_files_update" on storage.objects;
drop policy if exists "hbkcc_class_files_delete" on storage.objects;

create policy "hbkcc_class_files_select"
on storage.objects for select to authenticated
using (bucket_id = 'class-files' and public.can_view_storage_object(name));

create policy "hbkcc_class_files_insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'class-files' and public.can_manage_storage_path(name));

create policy "hbkcc_class_files_update"
on storage.objects for update to authenticated
using (bucket_id = 'class-files' and public.can_manage_storage_path(name))
with check (bucket_id = 'class-files' and public.can_manage_storage_path(name));

create policy "hbkcc_class_files_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'class-files' and public.can_manage_storage_path(name));

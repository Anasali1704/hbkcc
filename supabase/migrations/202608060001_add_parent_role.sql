-- Parent accounts use profiles.role = 'parent'. Support both the common enum
-- setup and the common text + profiles_role_check setup.
do $$
declare
  role_type_name text;
begin
  select format('%I.%I', n.nspname, t.typname)
    into role_type_name
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace cn on cn.oid = c.relnamespace
  join pg_type t on t.oid = a.atttypid
  join pg_namespace n on n.oid = t.typnamespace
  where cn.nspname = 'public'
    and c.relname = 'profiles'
    and a.attname = 'role'
    and t.typtype = 'e';

  if role_type_name is not null then
    execute format('alter type %s add value if not exists %L', role_type_name, 'parent');
  end if;
end $$;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'parent', 'teacher', 'admin'));

create table if not exists public.parent_students (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (parent_id, student_id),
  check (parent_id <> student_id)
);

create index if not exists parent_students_parent_id_idx
  on public.parent_students(parent_id);

create index if not exists parent_students_student_id_idx
  on public.parent_students(student_id);

alter table public.parent_students enable row level security;

drop policy if exists "Parents and students can read their relations"
  on public.parent_students;
drop policy if exists "Admins can create parent relations"
  on public.parent_students;
drop policy if exists "Admins can update parent relations"
  on public.parent_students;
drop policy if exists "Admins can delete parent relations"
  on public.parent_students;
drop policy if exists "Parents can read child enrollments"
  on public.enrollments;
drop policy if exists "Parents can read child attendance"
  on public.attendance;
drop policy if exists "Parents can read child profiles"
  on public.profiles;
drop policy if exists "Parents can read child classes"
  on public.classes;
drop policy if exists "Parents can read child semesters"
  on public.semesters;
drop policy if exists "Parents can read child lessons"
  on public.lessons;
drop policy if exists "Parents can read child class files"
  on public.class_files;
drop policy if exists "Parents can read child lesson resources"
  on public.lesson_resources;
drop policy if exists "Parents can read child semester resources"
  on public.semester_resources;
drop policy if exists "Parents can download child teaching files"
  on storage.objects;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
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

create policy "Parents and students can read their relations"
on public.parent_students for select
using (parent_id = auth.uid() or student_id = auth.uid() or public.is_admin());

create policy "Admins can create parent relations"
on public.parent_students for insert
with check (public.is_admin());

create policy "Admins can update parent relations"
on public.parent_students for update
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete parent relations"
on public.parent_students for delete
using (public.is_admin());

-- Additive read policies for parents. Existing admin/teacher/student policies
-- remain unchanged.
create policy "Parents can read child enrollments"
on public.enrollments for select
using (public.is_parent_of(user_id));

create policy "Parents can read child attendance"
on public.attendance for select
using (public.is_parent_of(user_id));

create policy "Parents can read child profiles"
on public.profiles for select
using (public.is_parent_of(id));

create policy "Parents can read child classes"
on public.classes for select
using (
  exists (
    select 1 from public.enrollments e
    where e.class_id = classes.id and public.is_parent_of(e.user_id)
  )
);

create policy "Parents can read child semesters"
on public.semesters for select
using (
  exists (
    select 1 from public.enrollments e
    where e.class_id = semesters.class_id and public.is_parent_of(e.user_id)
  )
);

create policy "Parents can read child lessons"
on public.lessons for select
using (
  exists (
    select 1 from public.enrollments e
    where e.class_id = lessons.class_id and public.is_parent_of(e.user_id)
  )
);

create policy "Parents can read child class files"
on public.class_files for select
using (
  exists (
    select 1 from public.enrollments e
    where e.class_id = class_files.class_id and public.is_parent_of(e.user_id)
  )
);

create policy "Parents can read child lesson resources"
on public.lesson_resources for select
using (
  exists (
    select 1
    from public.lessons l
    join public.enrollments e on e.class_id = l.class_id
    where l.id = lesson_resources.lesson_id and public.is_parent_of(e.user_id)
  )
);

create policy "Parents can read child semester resources"
on public.semester_resources for select
using (
  exists (
    select 1
    from public.semesters s
    join public.enrollments e on e.class_id = s.class_id
    where s.id = semester_resources.semester_id and public.is_parent_of(e.user_id)
  )
);

create policy "Parents can download child teaching files"
on storage.objects for select
using (
  bucket_id = 'class-files'
  and (
    exists (
      select 1 from public.enrollments e
      where e.class_id::text = (storage.foldername(name))[1]
        and public.is_parent_of(e.user_id)
    )
    or exists (
      select 1
      from public.lessons l
      join public.enrollments e on e.class_id = l.class_id
      where (storage.foldername(name))[1] = 'lessons'
        and l.id::text = (storage.foldername(name))[2]
        and public.is_parent_of(e.user_id)
    )
    or exists (
      select 1
      from public.semesters s
      join public.enrollments e on e.class_id = s.class_id
      where (storage.foldername(name))[1] = 'semesters'
        and s.id::text = (storage.foldername(name))[2]
        and public.is_parent_of(e.user_id)
    )
  )
);

-- Reproducible baseline for a new HBKCC environment. The statements are
-- idempotent so the migration can coexist with an older manually-created
-- production schema.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  role text not null default 'student',
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.semesters (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('student', 'teacher')),
  created_at timestamptz not null default now(),
  unique (class_id, user_id, role)
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  semester_id uuid references public.semesters(id) on delete set null,
  title text not null,
  description text,
  lesson_date date not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('present', 'absent')),
  created_at timestamptz not null default now(),
  unique (lesson_id, user_id)
);

create table if not exists public.class_files (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  file_path text not null unique,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  type text not null check (type in ('file', 'link')),
  title text not null,
  description text,
  file_path text unique,
  url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    (type = 'file' and file_path is not null and url is null)
    or (type = 'link' and url is not null and file_path is null)
  )
);

create table if not exists public.semester_resources (
  id uuid primary key default gen_random_uuid(),
  semester_id uuid not null references public.semesters(id) on delete cascade,
  type text not null check (type in ('file', 'link')),
  title text not null,
  description text,
  file_path text unique,
  url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    (type = 'file' and file_path is not null and url is null)
    or (type = 'link' and url is not null and file_path is null)
  )
);

create index if not exists semesters_class_id_idx on public.semesters(class_id);
create index if not exists enrollments_class_id_idx on public.enrollments(class_id);
create index if not exists enrollments_user_id_idx on public.enrollments(user_id);
create index if not exists lessons_class_id_idx on public.lessons(class_id);
create index if not exists lessons_semester_id_idx on public.lessons(semester_id);
create index if not exists attendance_lesson_id_idx on public.attendance(lesson_id);
create index if not exists attendance_user_id_idx on public.attendance(user_id);
create index if not exists class_files_class_id_idx on public.class_files(class_id);
create index if not exists lesson_resources_lesson_id_idx
  on public.lesson_resources(lesson_id);
create index if not exists semester_resources_semester_id_idx
  on public.semester_resources(semester_id);

insert into storage.buckets (id, name, public)
values ('class-files', 'class-files', false)
on conflict (id) do update set public = excluded.public;

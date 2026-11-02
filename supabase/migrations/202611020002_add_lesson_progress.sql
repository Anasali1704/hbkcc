create table if not exists public.lesson_progress (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('completed', 'not_completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (lesson_id, user_id)
);

create index if not exists lesson_progress_user_id_idx
  on public.lesson_progress(user_id);

alter table public.lesson_progress enable row level security;

drop policy if exists "lesson_progress_select_authorized"
  on public.lesson_progress;
drop policy if exists "lesson_progress_insert_self"
  on public.lesson_progress;
drop policy if exists "lesson_progress_update_self"
  on public.lesson_progress;

create policy "lesson_progress_select_authorized"
on public.lesson_progress for select to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
  or public.is_parent_of(user_id)
  or exists (
    select 1
    from public.lessons l
    where l.id = lesson_id
      and public.is_teacher_of_class(l.class_id)
  )
);

create policy "lesson_progress_insert_self"
on public.lesson_progress for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.lessons l
    join public.enrollments e on e.class_id = l.class_id
    where l.id = lesson_id
      and e.user_id = auth.uid()
      and e.role = 'student'
  )
);

create policy "lesson_progress_update_self"
on public.lesson_progress for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.lessons l
    join public.enrollments e on e.class_id = l.class_id
    where l.id = lesson_id
      and e.user_id = auth.uid()
      and e.role = 'student'
  )
);

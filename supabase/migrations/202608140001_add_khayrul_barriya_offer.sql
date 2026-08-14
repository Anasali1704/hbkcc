insert into public.offers (slug, name, description, active)
values (
  'khayrul-barriya-koranskole',
  'Khayrul Barriya Koranskole',
  'Undervisning, lektionsplaner, materialer og fravær for Khayrul Barriya Koranskole.',
  true
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  active = excluded.active;

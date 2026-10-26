create type public.app_role as enum ('admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin')
$$;

-- Grant admin automatically to the designated owner account when it is created
create or replace function public.handle_admin_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(new.email) = 'damb378@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end $$;
create trigger on_auth_user_created_admin after insert on auth.users
  for each row execute function public.handle_admin_user();
insert into public.user_roles (user_id, role)
  select id, 'admin' from auth.users where lower(email) = 'damb378@gmail.com' on conflict do nothing;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  subtitle text,
  summary text,
  cover_image jsonb,
  category text,
  role text,
  team text,
  timeline text,
  project_status text,
  live_url text,
  prototype_url text,
  published boolean not null default false,
  featured boolean not null default false,
  sort_order integer not null default 0,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint featured_requires_published check (not featured or published)
);
create index projects_published_order_idx on public.projects (published, sort_order);
grant select on public.projects to anon;
grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;
alter table public.projects enable row level security;
create policy "public reads published" on public.projects for select to anon, authenticated using (published or public.is_admin());
create policy "admin insert" on public.projects for insert to authenticated with check (public.is_admin());
create policy "admin update" on public.projects for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.projects for delete to authenticated using (public.is_admin());

create or replace function public.projects_before_write()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  if new.published and (tg_op = 'INSERT' or not old.published) then
    new.published_at = coalesce(new.published_at, now());
  end if;
  if not new.published then new.featured = false; end if;
  return new;
end $$;
create trigger projects_before_write before insert or update on public.projects
  for each row execute function public.projects_before_write();

create table public.project_sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  section_type text not null check (section_type in ('heading','text','list','image','full_image','comparison','gallery','quote','highlight','diagram','embed','metrics')),
  title text,
  content jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index project_sections_project_order_idx on public.project_sections (project_id, sort_order);
grant select on public.project_sections to anon;
grant select, insert, update, delete on public.project_sections to authenticated;
grant all on public.project_sections to service_role;
alter table public.project_sections enable row level security;
create policy "read sections of visible projects" on public.project_sections for select to anon, authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and (p.published or public.is_admin())));
create policy "admin insert sections" on public.project_sections for insert to authenticated with check (public.is_admin());
create policy "admin update sections" on public.project_sections for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin delete sections" on public.project_sections for delete to authenticated using (public.is_admin());
create trigger project_sections_touch before update on public.project_sections
  for each row execute function public.touch_updated_at();

create table public.site_settings (
  id integer primary key default 1 check (id = 1),
  display_name text not null default '',
  hero_headline text,
  hero_intro text,
  approach_text text,
  dev_background_text text,
  about_intro text,
  about_philosophy text,
  about_background text,
  about_dev_experience text,
  skills text[] not null default '{}',
  tools text[] not null default '{}',
  contact_email text,
  linkedin_url text,
  github_url text,
  dribbble_url text,
  other_url text,
  resume_url text,
  footer_text text,
  seo_title text,
  seo_description text,
  updated_at timestamptz not null default now()
);
grant select on public.site_settings to anon;
grant select, insert, update on public.site_settings to authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;
create policy "settings public read" on public.site_settings for select to anon, authenticated using (true);
create policy "admin insert settings" on public.site_settings for insert to authenticated with check (public.is_admin());
create policy "admin update settings" on public.site_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
create trigger site_settings_touch before update on public.site_settings
  for each row execute function public.touch_updated_at();

insert into public.site_settings (id, display_name, hero_headline, contact_email, footer_text, seo_title, seo_description)
values (1, 'Damani Beckford', 'Product Designer with a software development background.', 'damb378@gmail.com',
  'Designed and built by Damani Beckford.', 'Damani Beckford — Product Designer',
  'Portfolio of Damani Beckford, a Product Designer with a background in UX design and software development.');

insert into public.projects (title, slug, subtitle, category, sort_order) values
  ('Airspace', 'airspace', 'DRAFT — add real content in the CMS', 'Logistics & operational workflows', 0),
  ('Flip & Floss', 'flip-and-floss', 'DRAFT — add real content in the CMS', 'Education & learning experience', 1),
  ('Munchly', 'munchly', 'DRAFT — add real content in the CMS', 'Food delivery — customer & driver workflows', 2);

-- Storage policies for portfolio-media bucket
create policy "media public read" on storage.objects for select using (bucket_id = 'portfolio-media');
create policy "media admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'portfolio-media' and public.is_admin());
create policy "media admin update" on storage.objects for update to authenticated using (bucket_id = 'portfolio-media' and public.is_admin());
create policy "media admin delete" on storage.objects for delete to authenticated using (bucket_id = 'portfolio-media' and public.is_admin());
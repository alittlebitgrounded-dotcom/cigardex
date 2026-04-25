create table if not exists public.reviewer_publications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website_url text null,
  social_urls jsonb null,
  created_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.reviewer_publication_members (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.reviewer_publications(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'approved',
  created_at timestamptz not null default now(),
  constraint reviewer_publication_members_status_chk check (status in ('pending', 'approved', 'rejected')),
  constraint reviewer_publication_members_user_publication_key unique (user_id, publication_id)
);

create index if not exists idx_reviewer_publication_members_user_id
  on public.reviewer_publication_members(user_id);

create index if not exists idx_reviewer_publication_members_publication_id
  on public.reviewer_publication_members(publication_id);

alter table public.reviewer_publications enable row level security;
alter table public.reviewer_publication_members enable row level security;

drop policy if exists reviewer_publications_public_read on public.reviewer_publications;
create policy reviewer_publications_public_read
on public.reviewer_publications
for select
to public
using (true);

drop policy if exists reviewer_publications_insert_own on public.reviewer_publications;
create policy reviewer_publications_insert_own
on public.reviewer_publications
for insert
to authenticated
with check ((select auth.uid()) = created_by);

drop policy if exists reviewer_publications_update_own on public.reviewer_publications;
create policy reviewer_publications_update_own
on public.reviewer_publications
for update
to authenticated
using (
  created_by = (select auth.uid())
  or exists (
    select 1
    from public.reviewer_publication_members rpm
    where rpm.publication_id = reviewer_publications.id
      and rpm.user_id = (select auth.uid())
      and rpm.status = 'approved'
  )
)
with check (
  created_by = (select auth.uid())
  or exists (
    select 1
    from public.reviewer_publication_members rpm
    where rpm.publication_id = reviewer_publications.id
      and rpm.user_id = (select auth.uid())
      and rpm.status = 'approved'
  )
);

drop policy if exists reviewer_publications_admin_all on public.reviewer_publications;
create policy reviewer_publications_admin_all
on public.reviewer_publications
for all
to authenticated
using (
  (select role from public.users where id = (select auth.uid())) in ('super_admin', 'moderator')
)
with check (
  (select role from public.users where id = (select auth.uid())) in ('super_admin', 'moderator')
);

drop policy if exists reviewer_publication_members_public_read_approved on public.reviewer_publication_members;
create policy reviewer_publication_members_public_read_approved
on public.reviewer_publication_members
for select
to public
using (status = 'approved');

drop policy if exists reviewer_publication_members_insert_own on public.reviewer_publication_members;
create policy reviewer_publication_members_insert_own
on public.reviewer_publication_members
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.reviewer_publications rp
    where rp.id = publication_id
      and rp.created_by = (select auth.uid())
  )
);

drop policy if exists reviewer_publication_members_update_own on public.reviewer_publication_members;
create policy reviewer_publication_members_update_own
on public.reviewer_publication_members
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists reviewer_publication_members_admin_all on public.reviewer_publication_members;
create policy reviewer_publication_members_admin_all
on public.reviewer_publication_members
for all
to authenticated
using (
  (select role from public.users where id = (select auth.uid())) in ('super_admin', 'moderator')
)
with check (
  (select role from public.users where id = (select auth.uid())) in ('super_admin', 'moderator')
);

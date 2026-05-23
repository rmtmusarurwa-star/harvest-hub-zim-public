
-- Admin role system using separate user_roles table
create type public.app_role as enum ('admin', 'moderator');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = 'admin')
$$;

create policy "Users view own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "Admins manage roles" on public.user_roles for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Verification requests
create type public.verification_status as enum ('pending', 'approved', 'rejected');

create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  entity_type text not null default 'farmer',
  notes text not null default '',
  documents_url text,
  status verification_status not null default 'pending',
  reviewer_id uuid,
  review_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.verification_requests enable row level security;

create policy "Users view own verification requests" on public.verification_requests for select to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "Users create own verification requests" on public.verification_requests for insert to authenticated with check (user_id = auth.uid());
create policy "Admins update verification requests" on public.verification_requests for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Fraud reports
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create table public.fraud_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null,
  target_user_id uuid,
  target_listing_id uuid,
  category text not null default 'other',
  description text not null default '',
  status report_status not null default 'open',
  resolution_notes text not null default '',
  resolved_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fraud_reports enable row level security;

create policy "Users create fraud reports" on public.fraud_reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "Users view own reports or admins all" on public.fraud_reports for select to authenticated using (reporter_id = auth.uid() or public.is_admin(auth.uid()));
create policy "Admins update fraud reports" on public.fraud_reports for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Platform announcements
create table public.platform_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  level text not null default 'info',
  active boolean not null default true,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_announcements enable row level security;

create policy "Announcements viewable by authenticated" on public.platform_announcements for select to authenticated using (true);
create policy "Admins manage announcements" on public.platform_announcements for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Admin activity log
create table public.admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  action text not null,
  target_type text not null default '',
  target_id text not null default '',
  details text not null default '',
  created_at timestamptz not null default now()
);

alter table public.admin_activity_log enable row level security;

create policy "Admins view activity log" on public.admin_activity_log for select to authenticated using (public.is_admin(auth.uid()));
create policy "Admins insert activity log" on public.admin_activity_log for insert to authenticated with check (admin_id = auth.uid() and public.is_admin(auth.uid()));

-- Listing moderation: allow admins to update/delete any listing
create policy "Admins update any listing" on public.listings for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "Admins delete any listing" on public.listings for delete to authenticated using (public.is_admin(auth.uid()));

-- Order management: allow admins to view/update any order
create policy "Admins view all orders" on public.orders for select to authenticated using (public.is_admin(auth.uid()));
create policy "Admins update any order" on public.orders for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Admins can update any profile (suspend/change role)
create policy "Admins update any profile" on public.profiles for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Add suspended flag to profiles
alter table public.profiles add column if not exists suspended boolean not null default false;

create trigger update_verification_requests_updated_at before update on public.verification_requests for each row execute function public.set_updated_at();
create trigger update_fraud_reports_updated_at before update on public.fraud_reports for each row execute function public.set_updated_at();
create trigger update_platform_announcements_updated_at before update on public.platform_announcements for each row execute function public.set_updated_at();

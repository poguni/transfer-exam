-- 편입 캘린더(TExam Calendar) 초기 스키마
-- 이 파일은 tcal_ 객체만 만든다. Link Plan의 기존 객체(plans, tasks, task_plan_links,
-- profiles, user_settings, private.handle_new_user 등)와 auth 스키마는 건드리지 않는다.
--
-- PRD 7.3 초안에서 바꾼 점
--  1) tcal_universities.color 기본값을 대학 12색 1번(#1D4ED8)으로
--  2) 함수는 search_path = '' + 스키마 이름 명시, anon 실행 권한 제거
--  3) 가족 만들기를 함수 하나(tcal_create_family)로 묶어 가족·구성원을 한 번에 생성
--  4) updated_at·updated_by 자동 갱신 트리거, 하위 테이블 family_id 일치 검사 트리거
--  5) tcal_checklist_items에 updated_at 추가, 하위 테이블 university_id 인덱스 추가
--  6) 구성원 본인 이름 수정·가족 나가기 정책 추가

-- ============================================================
-- 테이블
-- ============================================================
create table public.tcal_families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default '우리 가족',
  invite_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  settings    jsonb not null default
              '{"overlap_gap_min":120,"default_exam_min":120,"default_buffer_min":30}'::jsonb,
  created_by  uuid not null default auth.uid() references auth.users(id),
  created_at  timestamptz not null default now()
);

create table public.tcal_family_members (
  family_id    uuid not null references public.tcal_families(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null check (role in ('student','parent')),
  display_name text,
  joined_at    timestamptz not null default now(),
  primary key (family_id, user_id)
);
create index tcal_family_members_user_idx on public.tcal_family_members (user_id);

create table public.tcal_universities (
  id               uuid primary key default gen_random_uuid(),
  family_id        uuid not null references public.tcal_families(id) on delete cascade,
  -- A. 기본 정보
  name             text not null,
  short_name       text not null check (char_length(short_name) between 1 and 4),
  department       text not null,
  quota            int,
  competition_rate numeric(6,2),
  priority         text check (priority in ('first','reach','target','safe')),
  color            text not null default '#1D4ED8',
  -- B. 전형 방법
  exam_types       text[] not null default array['english']
                   check (exam_types <@ array['english','interview','document']),
  score_ratio      text,
  stage_type       text check (stage_type in ('one','two')),
  exam_format      text,
  -- D. 수험 정보
  apply_agency     text check (apply_agency in ('jinhak','uway','school')),
  exam_number      text,
  receipt_number   text,
  application_fee  int,
  fee_paid         boolean not null default false,
  ticket_printed   boolean not null default false,
  admission_phone  text,
  homepage_url     text,
  guide_url        text,
  -- F. 장소와 교통
  venue            text,
  map_url          text,
  transit          text,
  travel_min       int,
  buffer_min       int not null default 30,
  -- G. 준비물 메모, H. 결과
  prohibited_items text,
  result_status    text not null default 'pending'
                   check (result_status in ('pending','first_pass','final_pass','waitlist','fail')),
  waitlist_no      int,
  review_memo      text,
  memo             text,
  created_by       uuid default auth.uid() references auth.users(id),
  updated_by       uuid references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index tcal_universities_family_idx on public.tcal_universities (family_id);

create table public.tcal_events (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references public.tcal_families(id) on delete cascade,
  university_id uuid not null references public.tcal_universities(id) on delete cascade,
  event_type    text not null check (event_type in
                ('apply','exam','venue_notice','first_result','doc_deadline',
                 'interview','final_result','payment','extra_result','other')),
  title         text,
  start_date    date not null check (start_date between '2026-11-01' and '2027-02-28'),
  end_date      date check (end_date is null or (end_date >= start_date and end_date <= '2027-02-28')),
  check_in_time time,
  start_time    time,
  end_time      time,
  venue         text,
  map_url       text,
  round_no      int,
  memo          text,
  created_by    uuid default auth.uid() references auth.users(id),
  updated_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index tcal_events_family_date_idx on public.tcal_events (family_id, start_date);
create index tcal_events_university_idx on public.tcal_events (university_id);

create table public.tcal_documents (
  id                uuid primary key default gen_random_uuid(),
  family_id         uuid not null references public.tcal_families(id) on delete cascade,
  university_id     uuid not null references public.tcal_universities(id) on delete cascade,
  doc_type          text not null check (doc_type in
                    ('study_plan','self_intro','transcript','completion_cert','other')),
  custom_name       text,
  status            text not null default 'todo' check (status in ('todo','ready','submitted')),
  submit_method     text check (submit_method in ('upload','mail','visit')),
  mail_basis        text check (mail_basis in ('postmark','arrival')),
  original_required boolean not null default false,
  memo              text,
  updated_at        timestamptz not null default now()
);
create index tcal_documents_university_idx on public.tcal_documents (university_id);

create table public.tcal_checklist_items (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references public.tcal_families(id) on delete cascade,
  university_id uuid not null references public.tcal_universities(id) on delete cascade,
  label         text not null,
  checked       boolean not null default false,
  sort_order    int not null default 0,
  updated_at    timestamptz not null default now()
);
create index tcal_checklist_items_university_idx on public.tcal_checklist_items (university_id);

-- ============================================================
-- 함수
-- ============================================================

-- 가족 구성원 여부 (정책에서 사용)
create or replace function public.tcal_is_member(fid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.tcal_family_members
                 where family_id = fid and user_id = (select auth.uid()));
$$;

-- 가족 만들기: 가족과 만든 사람의 구성원 행을 한 번에 생성
create or replace function public.tcal_create_family(family_name text, member_role text, member_name text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare fid uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if member_role not in ('student','parent') then raise exception 'invalid role'; end if;
  insert into public.tcal_families (name, created_by)
  values (coalesce(nullif(trim(family_name), ''), '우리 가족'), auth.uid())
  returning id into fid;
  insert into public.tcal_family_members (family_id, user_id, role, display_name)
  values (fid, auth.uid(), member_role, member_name);
  return fid;
end $$;

-- 초대 코드로 가족 참여
create or replace function public.tcal_join_family(code text, member_role text, member_name text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare fid uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if member_role not in ('student','parent') then raise exception 'invalid role'; end if;
  select id into fid from public.tcal_families where invite_code = upper(trim(code));
  if fid is null then raise exception 'invalid invite code'; end if;
  insert into public.tcal_family_members (family_id, user_id, role, display_name)
  values (fid, auth.uid(), member_role, member_name)
  on conflict (family_id, user_id) do nothing;
  return fid;
end $$;

-- updated_at(과 있으면 updated_by) 자동 갱신
create or replace function public.tcal_set_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  if tg_table_name in ('tcal_universities','tcal_events') then
    new.updated_by := auth.uid();
  end if;
  return new;
end $$;

-- 하위 테이블의 family_id가 연결된 대학의 family_id와 같은지 검사
create or replace function public.tcal_check_family()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if not exists (select 1 from public.tcal_universities u
                 where u.id = new.university_id and u.family_id = new.family_id) then
    raise exception 'family_id does not match university';
  end if;
  return new;
end $$;

-- 함수 실행 권한: 로그인한 사용자만
revoke execute on function public.tcal_is_member(uuid) from public, anon;
revoke execute on function public.tcal_create_family(text, text, text) from public, anon;
revoke execute on function public.tcal_join_family(text, text, text) from public, anon;
revoke execute on function public.tcal_set_updated_at() from public, anon;
revoke execute on function public.tcal_check_family() from public, anon;
grant execute on function public.tcal_is_member(uuid) to authenticated;
grant execute on function public.tcal_create_family(text, text, text) to authenticated;
grant execute on function public.tcal_join_family(text, text, text) to authenticated;

-- ============================================================
-- 트리거 (tcal_ 테이블에만)
-- ============================================================
create trigger tcal_universities_updated before update on public.tcal_universities
  for each row execute function public.tcal_set_updated_at();
create trigger tcal_events_updated before update on public.tcal_events
  for each row execute function public.tcal_set_updated_at();
create trigger tcal_documents_updated before update on public.tcal_documents
  for each row execute function public.tcal_set_updated_at();
create trigger tcal_checklist_items_updated before update on public.tcal_checklist_items
  for each row execute function public.tcal_set_updated_at();

create trigger tcal_events_family_check before insert or update on public.tcal_events
  for each row execute function public.tcal_check_family();
create trigger tcal_documents_family_check before insert or update on public.tcal_documents
  for each row execute function public.tcal_check_family();
create trigger tcal_checklist_items_family_check before insert or update on public.tcal_checklist_items
  for each row execute function public.tcal_check_family();

-- ============================================================
-- RLS
-- ============================================================
alter table public.tcal_families        enable row level security;
alter table public.tcal_family_members  enable row level security;
alter table public.tcal_universities    enable row level security;
alter table public.tcal_events          enable row level security;
alter table public.tcal_documents       enable row level security;
alter table public.tcal_checklist_items enable row level security;

-- 가족: 구성원만 조회·수정. 생성은 tcal_create_family 함수로만
create policy tcal_families_select on public.tcal_families
  for select to authenticated using (public.tcal_is_member(id));
create policy tcal_families_update on public.tcal_families
  for update to authenticated using (public.tcal_is_member(id)) with check (public.tcal_is_member(id));

-- 구성원: 같은 가족끼리 조회, 본인 행만 수정·삭제(가족 나가기). 추가는 함수로만
create policy tcal_members_select on public.tcal_family_members
  for select to authenticated using (public.tcal_is_member(family_id));
create policy tcal_members_update_self on public.tcal_family_members
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy tcal_members_delete_self on public.tcal_family_members
  for delete to authenticated using (user_id = (select auth.uid()));

-- 데이터 테이블 4개: 같은 가족만 모든 작업
create policy tcal_universities_all on public.tcal_universities
  for all to authenticated using (public.tcal_is_member(family_id)) with check (public.tcal_is_member(family_id));
create policy tcal_events_all on public.tcal_events
  for all to authenticated using (public.tcal_is_member(family_id)) with check (public.tcal_is_member(family_id));
create policy tcal_documents_all on public.tcal_documents
  for all to authenticated using (public.tcal_is_member(family_id)) with check (public.tcal_is_member(family_id));
create policy tcal_checklist_all on public.tcal_checklist_items
  for all to authenticated using (public.tcal_is_member(family_id)) with check (public.tcal_is_member(family_id));

-- 테스트(더미) 데이터 표시: 설정 화면에서 넣고 한꺼번에 지울 수 있게 함.
-- 대학만 표시하면 일정·서류·준비물은 on delete cascade로 함께 지워진다.
alter table public.tcal_universities
  add column is_sample boolean not null default false;

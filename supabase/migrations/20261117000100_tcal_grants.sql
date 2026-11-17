-- tcal_ 테이블 권한 (Link Plan과 같은 방식)
-- 이 프로젝트는 새 테이블에 anon/authenticated 데이터 권한을 자동으로 주지 않는다.
-- authenticated에는 필요한 권한만 주고(행 범위는 RLS가 제한), anon에는 아무 권한도 주지 않는다.
-- TRUNCATE는 RLS를 우회하므로 두 역할 모두에서 회수한다.

revoke all on public.tcal_families, public.tcal_family_members, public.tcal_universities,
              public.tcal_events, public.tcal_documents, public.tcal_checklist_items
  from anon, authenticated;

-- 가족: 생성은 tcal_create_family 함수로만. 조회·수정(이름, 설정)만
grant select, update on public.tcal_families to authenticated;
-- 구성원: 추가는 함수로만. 조회, 본인 이름 수정, 가족 나가기
grant select, update, delete on public.tcal_family_members to authenticated;
-- 데이터 테이블 4개
grant select, insert, update, delete on public.tcal_universities, public.tcal_events,
  public.tcal_documents, public.tcal_checklist_items to authenticated;

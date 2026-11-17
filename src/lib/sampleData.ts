import { UNIV_COLORS } from './constants';
import type { DocInput, EventInput, UniversityInput } from './db';
import type { EventType } from './types';

// 모집요강 발표 전 연습용 테스트 데이터: 서울·수도권 8개 대학.
// 일정·수험 번호·장소는 모두 가상입니다(실제 모집요강과 다름). 수험 번호는 "T-"로 시작합니다.
// 겹침 경고를 확인할 수 있게 1/10(간격 주의)과 1/16(시간 충돌)을 일부러 넣었습니다.

export interface SampleUniversity {
  univ: UniversityInput;
  docs: DocInput[];
  events: Omit<EventInput, 'university_id'>[];
}

type U = Pick<UniversityInput, 'name' | 'short_name' | 'department' | 'priority' | 'apply_agency' | 'venue' | 'transit' | 'travel_min'> &
  Partial<UniversityInput>;

function univ(u: U, color: string): UniversityInput {
  return {
    quota: null, competition_rate: null, exam_types: ['english'], score_ratio: '1단계 영어 100%', stage_type: 'one', exam_format: '영어 40문항 60분',
    exam_number: null, receipt_number: null, application_fee: 60000, fee_paid: false, ticket_printed: false, admission_phone: null,
    homepage_url: null, guide_url: null, map_url: null, buffer_min: 30, prohibited_items: '전자기기, 탁상시계', result_status: 'pending',
    waitlist_no: null, review_memo: null, memo: '테스트 데이터(가상 일정)', color, ...u,
  };
}

const base = { title: null, end_date: null, check_in_time: null, start_time: null, end_time: null, venue: null, map_url: null, round_no: null, memo: null };
const ev = (event_type: EventType, start_date: string, p: Partial<Omit<EventInput, 'university_id'>> = {}) => ({ ...base, event_type, start_date, ...p });
const apply = (s: string, e: string, t = '18:00') => ev('apply', s, { end_date: e, end_time: t });
const exam = (d: string, ci: string, st: string, et: string, type: EventType = 'exam') => ev(type, d, { check_in_time: ci, start_time: st, end_time: et });
const at = (type: EventType, d: string, t: string, round?: number) => ev(type, d, { start_time: t, round_no: round ?? null });
const pay = (s: string, e: string) => ev('payment', s, { end_date: e, end_time: '16:00' });
const doc = (doc_type: DocInput['doc_type'], status: DocInput['status'] = 'todo', submit_method: DocInput['submit_method'] = 'upload'): DocInput => ({
  doc_type, custom_name: null, status, submit_method, mail_basis: submit_method === 'mail' ? 'arrival' : null, original_required: false, memo: null,
});

/** 테스트 대학 8곳. 색은 이미 등록된 대학 수 다음부터 배정 */
export function sampleUniversities(existingCount = 0): SampleUniversity[] {
  const c = (i: number) => UNIV_COLORS[(existingCount + i) % UNIV_COLORS.length];
  return [
    {
      univ: univ({ name: '건국대학교', short_name: '건국', department: '경영학과', priority: 'first', apply_agency: 'jinhak', exam_number: 'T-10217', fee_paid: true, ticket_printed: true, application_fee: 65000, venue: '새천년관 3층 301호', transit: '2·7호선 건대입구역 6번 출구 → 도보 8분', travel_min: 55 }, c(0)),
      docs: [doc('transcript', 'ready'), doc('completion_cert')],
      events: [apply('2026-12-01', '2026-12-03'), at('venue_notice', '2026-12-21', '14:00'), exam('2026-12-26', '09:30', '10:00', '11:00'), at('first_result', '2027-01-08', '14:00'), ev('doc_deadline', '2027-01-13', { end_time: '17:00' }), at('final_result', '2027-02-03', '14:00'), pay('2027-02-09', '2027-02-11'), at('extra_result', '2027-02-16', '10:00', 1)],
    },
    {
      univ: univ({ name: '동국대학교', short_name: '동국', department: '경영학과', priority: 'reach', apply_agency: 'uway', exam_types: ['english', 'interview'], stage_type: 'two', score_ratio: '1단계 영어 100% → 2단계 1단계 70% + 면접 30%', exam_number: 'T-20544', fee_paid: true, application_fee: 70000, venue: '명진관 2층', transit: '3호선 동대입구역 6번 출구 → 도보 5분', travel_min: 50 }, c(1)),
      docs: [doc('study_plan'), doc('self_intro'), doc('transcript', 'ready')],
      events: [apply('2026-12-02', '2026-12-04', '17:00'), exam('2027-01-09', '10:00', '10:30', '12:00'), at('first_result', '2027-01-20', '10:00'), ev('doc_deadline', '2027-01-22', { end_time: '17:00' }), exam('2027-01-27', '13:00', '13:30', '16:00', 'interview'), at('final_result', '2027-02-05', '10:00')],
    },
    {
      univ: univ({ name: '홍익대학교', short_name: '홍익', department: '경영학부', priority: 'target', apply_agency: 'jinhak', venue: '제4공학관 1층', transit: '6호선 상수역 1번 출구 → 도보 10분', travel_min: 45 }, c(2)),
      docs: [doc('transcript')],
      events: [apply('2026-12-07', '2026-12-09'), exam('2027-01-10', '09:00', '09:30', '11:00'), at('first_result', '2027-01-21', '14:00'), at('final_result', '2027-02-04', '14:00')],
    },
    {
      univ: univ({ name: '숭실대학교', short_name: '숭실', department: '경영학부', priority: 'target', apply_agency: 'jinhak', application_fee: 55000, venue: '형남공학관 2층', transit: '7호선 숭실대입구역 3번 출구 → 도보 3분', travel_min: 60 }, c(3)),
      docs: [],
      // 1/10 홍익 11:00 종료 → 숭실 12:30 입실: 간격 90분 → "간격 주의" 예시
      events: [apply('2026-12-08', '2026-12-10', '17:00'), exam('2027-01-10', '12:30', '13:00', '14:00'), at('final_result', '2027-02-02', '10:00')],
    },
    {
      univ: univ({ name: '세종대학교', short_name: '세종', department: '경영학부', priority: 'safe', apply_agency: 'uway', application_fee: 55000, venue: '광개토관 B1층', transit: '7호선 어린이대공원역 6번 출구 → 도보 5분', travel_min: 55 }, c(4)),
      docs: [],
      events: [apply('2026-12-09', '2026-12-11'), exam('2027-01-16', '09:30', '10:00', '11:30'), at('final_result', '2027-02-05', '14:00')],
    },
    {
      univ: univ({ name: '광운대학교', short_name: '광운', department: '경영학부', priority: 'safe', apply_agency: 'jinhak', application_fee: 55000, venue: '참빛관 3층', transit: '1호선 광운대역 → 도보 12분', travel_min: 70 }, c(5)),
      docs: [],
      // 1/16 세종 11:30 종료인데 광운 11:00 입실 → "시간 충돌" 예시
      events: [apply('2026-12-14', '2026-12-16', '17:00'), exam('2027-01-16', '11:00', '11:30', '12:30'), at('final_result', '2027-02-04', '10:00')],
    },
    {
      univ: univ({ name: '인하대학교', short_name: '인하', department: '경영학과', priority: 'safe', apply_agency: 'jinhak', application_fee: 55000, venue: '하이테크관 2층', transit: '수인분당선 인하대역 → 도보 15분', travel_min: 90 }, c(6)),
      docs: [doc('self_intro', 'todo', 'mail')],
      events: [apply('2026-12-10', '2026-12-12'), exam('2027-01-23', '12:30', '13:00', '14:00'), ev('doc_deadline', '2027-01-29', { end_time: '17:00' }), at('final_result', '2027-02-08', '14:00')],
    },
    {
      univ: univ({ name: '아주대학교', short_name: '아주', department: '경영학과', priority: 'target', apply_agency: 'uway', exam_types: ['english', 'interview'], stage_type: 'two', score_ratio: '1단계 영어 100% → 2단계 1단계 60% + 면접 40%', venue: '율곡관 1층', transit: '수원역 → 버스 13-4번 → 아주대 정문', travel_min: 80 }, c(7)),
      docs: [doc('study_plan'), doc('transcript')],
      events: [apply('2026-12-15', '2026-12-17'), exam('2027-01-24', '10:00', '10:30', '12:00'), at('first_result', '2027-01-28', '14:00'), exam('2027-02-01', '13:30', '14:00', '17:00', 'interview'), at('final_result', '2027-02-10', '14:00'), pay('2027-02-12', '2027-02-15')],
    },
  ];
}

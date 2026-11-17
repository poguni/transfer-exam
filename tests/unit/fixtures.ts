import type { CalEvent, University } from '../../src/lib/types';

let seq = 0;

export function ev(p: Partial<CalEvent> & Pick<CalEvent, 'event_type' | 'start_date'>): CalEvent {
  return {
    id: p.id ?? `e${++seq}`,
    university_id: 'u1',
    title: null,
    end_date: null,
    check_in_time: null,
    start_time: null,
    end_time: null,
    venue: null,
    round_no: null,
    memo: null,
    ...p,
  };
}

export const univ: University = {
  id: 'u1',
  name: '건국대학교',
  short_name: '건국',
  department: '경영학과',
  color: '#1D4ED8',
  priority: 'first',
  exam_number: 'K-30217',
  venue: '새천년관 3층 301호',
  transit: '2·7호선 건대입구역 6번 출구 → 도보 8분',
  travel_min: 55,
  buffer_min: 30,
  guide_url: 'https://example.com/guide',
};

import { EVENT_TYPES } from './constants';
import { hhmm } from './date';
import type { CalEvent, DateStr } from './types';

/** 일정 이름: 직접 입력한 제목이 있으면 그것, 없으면 종류 (충원은 차수 포함) */
export function eventName(e: Pick<CalEvent, 'event_type' | 'title' | 'round_no'>): string {
  if (e.title) return e.title;
  if (e.event_type === 'extra_result' && e.round_no) return `${e.round_no}차 충원 발표`;
  return EVENT_TYPES[e.event_type].label;
}

/** 달력 칩의 보조 글자 (넓은 칸에서만 보임): "필기 09:30", "접수 마감 18:00" */
export function chipText(e: CalEvent, date: DateStr): string {
  const isEnd = e.end_date != null && e.end_date === date;
  const isStart = e.end_date != null && e.start_date === date && !isEnd;
  const t = (x: string | null) => (x ? ' ' + hhmm(x) : '');
  switch (e.event_type) {
    case 'exam':
      return '필기' + t(e.check_in_time ?? e.start_time);
    case 'interview':
      return '면접' + t(e.check_in_time ?? e.start_time);
    case 'apply':
      return isStart ? '접수 시작' : '접수 마감' + t(e.end_time);
    case 'payment':
      return isStart ? '등록 시작' : '등록 마감' + t(e.end_time);
    case 'doc_deadline':
      return isStart ? '서류 시작' : '서류 마감' + t(e.end_time);
    case 'venue_notice':
      return '고사장' + t(e.start_time);
    case 'first_result':
      return '1단계' + t(e.start_time);
    case 'final_result':
      return '최종' + t(e.start_time);
    case 'extra_result':
      return (e.round_no ? `충원 ${e.round_no}차` : '충원') + t(e.start_time);
    default:
      return e.title || e.memo || '기타';
  }
}

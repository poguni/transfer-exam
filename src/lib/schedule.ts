import { EVENT_TYPES } from './constants';
import { daysBetween, fromMinutes, toMinutes } from './date';
import type { CalEvent, DateStr, TimeStr, University } from './types';

/** 시험·면접처럼 시각을 검사하는 일정인가 */
export function isTimed(e: Pick<CalEvent, 'event_type'>): boolean {
  return EVENT_TYPES[e.event_type].timed;
}

/** 마감(▲) 일정인가 */
export function isDeadline(e: Pick<CalEvent, 'event_type'>): boolean {
  return EVENT_TYPES[e.event_type].deadline;
}

export interface DDay {
  /** 남은 날. 음수면 지난 일정 */
  days: number;
  /** 'D-3' | 'D-DAY' | '완료' */
  label: string;
}

/** PRD F6-4: 서울 날짜 차이로 계산. 당일 D-DAY, 지나면 완료 */
export function dday(target: DateStr, today: DateStr): DDay {
  const days = daysBetween(today, target);
  return { days, label: days === 0 ? 'D-DAY' : days > 0 ? `D-${days}` : '완료' };
}

/** 기간 일정의 기준일: 마감일(있으면). D-day·"마감 D-2" 표시에 씀 */
export function dueDate(e: Pick<CalEvent, 'start_date' | 'end_date'>): DateStr {
  return e.end_date ?? e.start_date;
}

/** 실제 시작 시각(겹침용): 입실 시각, 없으면 시작 시각 (PRD 7.4) */
export function effectiveStart(e: Pick<CalEvent, 'check_in_time' | 'start_time'>): number | null {
  return toMinutes(e.check_in_time) ?? toMinutes(e.start_time);
}

/** 실제 종료 시각: 종료 시각, 없으면 시작(없으면 입실) + 기본 시험 시간 (PRD 7.4) */
export function effectiveEnd(
  e: Pick<CalEvent, 'check_in_time' | 'start_time' | 'end_time'>,
  defaultExamMin: number,
): number | null {
  const end = toMinutes(e.end_time);
  if (end != null) return end;
  const base = toMinutes(e.start_time) ?? toMinutes(e.check_in_time);
  return base == null ? null : base + defaultExamMin;
}

/**
 * 권장 출발 시각 = (입실 또는 시작) − 예상 소요 − 여유 (PRD 4.6)
 * 시각이나 소요 시간을 모르면 null. 자정 이전으로 넘어가면 계산하지 않음(null).
 */
export function recommendedDeparture(
  e: Pick<CalEvent, 'check_in_time' | 'start_time'>,
  u: Pick<University, 'travel_min' | 'buffer_min'>,
): TimeStr | null {
  const t = effectiveStart(e);
  if (t == null || u.travel_min == null) return null;
  const go = t - u.travel_min - u.buffer_min;
  return go < 0 ? null : fromMinutes(go);
}

/** 그 날짜 칸에 보일 일정: 하루 일정은 그날, 기간 일정은 시작일과 마감일에만 (DESIGN 4.2) */
export function eventsOnDate<T extends Pick<CalEvent, 'start_date' | 'end_date' | 'check_in_time' | 'start_time' | 'end_time'>>(
  events: readonly T[],
  date: DateStr,
): T[] {
  return events
    .filter((e) => e.start_date === date || e.end_date === date)
    .sort((a, b) => sortKey(a) - sortKey(b));
}

function sortKey(e: Pick<CalEvent, 'check_in_time' | 'start_time' | 'end_time'>): number {
  return toMinutes(e.check_in_time) ?? toMinutes(e.start_time) ?? toMinutes(e.end_time) ?? 24 * 60;
}

/**
 * 다가오는 시험·면접 (PRD F6). 오늘 포함, 지난 일정 제외.
 * 날짜순, 같은 날이면 이른 시각 먼저.
 */
export function upcomingExams<T extends CalEvent>(events: readonly T[], today: DateStr): T[] {
  return events
    .filter((e) => isTimed(e) && e.start_date >= today)
    .sort((a, b) =>
      a.start_date === b.start_date ? sortKey(a) - sortKey(b) : a.start_date < b.start_date ? -1 : 1,
    );
}

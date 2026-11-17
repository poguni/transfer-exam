import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';
import { DOW, PERIOD_END, PERIOD_START, TZ } from './constants';
import type { DateStr, TimeStr } from './types';

// 날짜는 'YYYY-MM-DD' 문자열로만 다룹니다. 기기 시간대와 상관없이 같은 결과가 나오도록
// 계산은 UTC 자정 기준 정수 날짜로 바꿔서 합니다.

function toDayNumber(d: DateStr): number {
  const [y, m, day] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, day) / 86_400_000;
}

function fromDayNumber(n: number): DateStr {
  return new Date(n * 86_400_000).toISOString().slice(0, 10);
}

/** 지금 이 순간의 서울 날짜 */
export function todaySeoul(now: Date = new Date()): DateStr {
  return format(new TZDate(now, TZ), 'yyyy-MM-dd');
}

/** to − from (일) */
export function daysBetween(from: DateStr, to: DateStr): number {
  return toDayNumber(to) - toDayNumber(from);
}

export function addDays(d: DateStr, n: number): DateStr {
  return fromDayNumber(toDayNumber(d) + n);
}

/** 0=일 ~ 6=토 */
export function dayOfWeek(d: DateStr): number {
  return (((toDayNumber(d) + 4) % 7) + 7) % 7; // 1970-01-01은 목요일
}

/** '12/24(목)' */
export function formatMD(d: DateStr): string {
  const [, m, day] = d.split('-').map(Number);
  return `${m}/${day}(${DOW[dayOfWeek(d)]})`;
}

export function isInPeriod(d: DateStr): boolean {
  return d >= PERIOD_START && d <= PERIOD_END;
}

/** 'HH:MM[:SS]' → 분 */
export function toMinutes(t: TimeStr | null | undefined): number | null {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** 분 → 'HH:MM' */
export function fromMinutes(min: number): TimeStr {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Postgres 'HH:MM:SS' → 'HH:MM' */
export function hhmm(t: TimeStr | null | undefined): TimeStr | null {
  return t ? t.slice(0, 5) : null;
}

/**
 * 달력 한 달의 칸 배열 (일요일 시작). 달에 속하지 않는 칸은 null.
 * 길이는 주 수 × 7 (5주 또는 6주).
 */
export function monthMatrix(year: number, month: number): (DateStr | null)[] {
  const first = `${year}-${String(month).padStart(2, '0')}-01`;
  const lead = dayOfWeek(first);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const weeks = Math.ceil((lead + days) / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const d = i - lead + 1;
    return d >= 1 && d <= days ? addDays(first, d - 1) : null;
  });
}

import { effectiveEnd, effectiveStart, isTimed } from './schedule';
import type { CalEvent, DateStr, FamilySettings } from './types';

/** PRD F7: 충돌(빨강) > 주의(주황) > 참고(회색) */
export type OverlapLevel = 'conflict' | 'warn' | 'info';

export interface Overlap<T extends CalEvent = CalEvent> {
  date: DateStr;
  /** 먼저 시작하는 일정 */
  a: T;
  b: T;
  /** b 입실 − a 종료 (분). 음수면 겹친 시간. 시각을 모르면 null */
  gapMin: number | null;
  level: OverlapLevel;
}

const RANK: Record<OverlapLevel, number> = { info: 0, warn: 1, conflict: 2 };

/**
 * 같은 날 시험·면접 두 개의 등급.
 * - 시간(입실~종료)이 겹치면 충돌. 종료 = 입실은 겹침이 아님(간격 0분 → 주의).
 * - 간격 < 기준이면 주의, 간격 = 기준이면 충분(참고).
 * - 어느 한쪽이라도 시각이 없으면 판단할 수 없으므로 주의 (PRD F7-2).
 */
export function classifyPair<T extends CalEvent>(x: T, y: T, settings: FamilySettings): Overlap<T> {
  const sx = effectiveStart(x);
  const sy = effectiveStart(y);
  const [a, b] = sx != null && sy != null && sy < sx ? [y, x] : [x, y];
  const aStart = effectiveStart(a);
  const bStart = effectiveStart(b);
  const aEnd = effectiveEnd(a, settings.default_exam_min);
  const bEnd = effectiveEnd(b, settings.default_exam_min);

  if (aStart == null || bStart == null || aEnd == null || bEnd == null) {
    return { date: a.start_date, a, b, gapMin: null, level: 'warn' };
  }
  const intersects = aStart < bEnd && bStart < aEnd;
  const gapMin = bStart - aEnd;
  const level: OverlapLevel = intersects ? 'conflict' : gapMin < settings.overlap_gap_min ? 'warn' : 'info';
  return { date: a.start_date, a, b, gapMin, level };
}

/** 모든 날짜의 같은 날 시험·면접 쌍. 날짜순 */
export function findOverlaps<T extends CalEvent>(events: readonly T[], settings: FamilySettings): Overlap<T>[] {
  const byDate = new Map<DateStr, T[]>();
  for (const e of events) {
    if (!isTimed(e)) continue;
    const list = byDate.get(e.start_date) ?? [];
    list.push(e);
    byDate.set(e.start_date, list);
  }
  const out: Overlap<T>[] = [];
  for (const date of [...byDate.keys()].sort()) {
    const list = byDate.get(date)!;
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) out.push(classifyPair(list[i], list[j], settings));
  }
  return out;
}

/** 날짜별 가장 높은 등급 (달력 칸 ⚠ 표시용) */
export function overlapLevelsByDate(overlaps: readonly Overlap[]): Map<DateStr, OverlapLevel> {
  const m = new Map<DateStr, OverlapLevel>();
  for (const o of overlaps) {
    const cur = m.get(o.date);
    if (!cur || RANK[o.level] > RANK[cur]) m.set(o.date, o.level);
  }
  return m;
}

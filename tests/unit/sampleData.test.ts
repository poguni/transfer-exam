import { describe, expect, it } from 'vitest';
import { sampleUniversities } from '../../src/lib/sampleData';
import { isInPeriod } from '../../src/lib/date';
import { findOverlaps } from '../../src/lib/overlap';
import { DEFAULT_SETTINGS, type EventRow } from '../../src/lib/types';
import { EVENT_TYPES } from '../../src/lib/constants';

const samples = sampleUniversities();

describe('테스트 데이터', () => {
  it('서울·수도권 8개 대학, 약칭 2~4자, 겹치지 않는 약칭', () => {
    expect(samples).toHaveLength(8);
    const shorts = samples.map((s) => s.univ.short_name);
    shorts.forEach((n) => expect(n.length >= 2 && n.length <= 4).toBe(true));
    expect(new Set(shorts).size).toBe(8);
  });

  it('모든 일정이 DB 규칙을 지킴: 기간 안, 종료일 ≥ 시작일, 시험·면접은 시각 있음', () => {
    for (const s of samples)
      for (const e of s.events) {
        expect(isInPeriod(e.start_date)).toBe(true);
        if (e.end_date) expect(e.end_date >= e.start_date && isInPeriod(e.end_date)).toBe(true);
        if (EVENT_TYPES[e.event_type].timed) expect(e.check_in_time && e.start_time && e.end_time).toBeTruthy();
      }
  });

  it('겹침 예시 포함: 1/10 간격 주의, 1/16 시간 충돌', () => {
    const events = samples.flatMap((s, i) => s.events.map((e, j) => ({ ...e, id: `${i}-${j}`, university_id: String(i), family_id: 'f' }) as EventRow));
    const levels = Object.fromEntries(findOverlaps(events, DEFAULT_SETTINGS).map((o) => [o.date, o.level]));
    expect(levels['2027-01-10']).toBe('warn');
    expect(levels['2027-01-16']).toBe('conflict');
  });

  it('색은 이미 등록된 대학 수 다음부터 배정', () => {
    const a = sampleUniversities(0).map((s) => s.univ.color);
    const b = sampleUniversities(1).map((s) => s.univ.color);
    expect(b[0]).toBe(a[1]);
  });
});

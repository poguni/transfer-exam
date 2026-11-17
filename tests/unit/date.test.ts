import { describe, expect, it } from 'vitest';
import { MONTHS } from '../../src/lib/constants';
import { addDays, dayOfWeek, daysBetween, formatMD, isInPeriod, monthMatrix, todaySeoul } from '../../src/lib/date';

describe('todaySeoul: 기기 시간대와 상관없이 서울 날짜', () => {
  it('UTC 14:59는 서울 23:59 → 같은 날', () => {
    expect(todaySeoul(new Date('2026-12-23T14:59:59Z'))).toBe('2026-12-23');
  });
  it('UTC 15:00은 서울 다음 날 00:00', () => {
    expect(todaySeoul(new Date('2026-12-23T15:00:00Z'))).toBe('2026-12-24');
  });
});

describe('날짜 계산', () => {
  it('해를 넘기는 차이', () => {
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
  });
  it('요일과 표시 형식', () => {
    expect(dayOfWeek('2026-11-01')).toBe(0); // 일
    expect(formatMD('2026-12-24')).toBe('12/24(목)');
  });
  it('입력 범위 2026-11-01 ~ 2027-02-28', () => {
    expect(isInPeriod('2026-11-01')).toBe(true);
    expect(isInPeriod('2027-02-28')).toBe(true);
    expect(isInPeriod('2026-10-31')).toBe(false);
    expect(isInPeriod('2027-03-01')).toBe(false);
  });
});

describe('monthMatrix: PRD F4-2 표와 일치', () => {
  const expected: Record<string, { lead: number; weeks: number; last: string }> = {
    '2026-11': { lead: 0, weeks: 5, last: '2026-11-30' },
    '2026-12': { lead: 2, weeks: 5, last: '2026-12-31' },
    '2027-1': { lead: 5, weeks: 6, last: '2027-01-31' },
    '2027-2': { lead: 1, weeks: 5, last: '2027-02-28' },
  };
  for (const [y, m] of MONTHS) {
    it(`${y}년 ${m}월`, () => {
      const cells = monthMatrix(y, m);
      const exp = expected[`${y}-${m}`];
      expect(cells.length).toBe(exp.weeks * 7);
      expect(cells.findIndex((c) => c !== null)).toBe(exp.lead);
      expect(cells.filter(Boolean).at(-1)).toBe(exp.last);
    });
  }
});

import { describe, expect, it } from 'vitest';
import { classifyPair, findOverlaps, overlapLevelsByDate } from '../../src/lib/overlap';
import { DEFAULT_SETTINGS } from '../../src/lib/types';
import { ev } from './fixtures';

const D = '2027-01-10';
const exam = (ci: string | null, st: string | null, et: string | null, id?: string) =>
  ev({ id, event_type: 'exam', start_date: D, check_in_time: ci, start_time: st, end_time: et });

describe('겹침 판정 경계값 (PRD F7 완료 기준)', () => {
  it('시간이 겹치면 충돌', () => {
    const o = classifyPair(exam('09:30', '10:00', '11:30'), exam('11:00', '11:30', '12:30'), DEFAULT_SETTINGS);
    expect(o.level).toBe('conflict');
    expect(o.gapMin).toBe(-30);
  });
  it('종료 = 입실이면 충돌이 아니라 주의 (간격 0분)', () => {
    const o = classifyPair(exam('09:00', '09:30', '11:00'), exam('11:00', '11:30', '12:30'), DEFAULT_SETTINGS);
    expect(o.level).toBe('warn');
    expect(o.gapMin).toBe(0);
  });
  it('간격 119분은 주의', () => {
    expect(classifyPair(exam('09:00', '09:30', '11:00'), exam('12:59', '13:30', '15:00'), DEFAULT_SETTINGS).level).toBe('warn');
  });
  it('간격 정확히 120분은 참고(충분)', () => {
    const o = classifyPair(exam('09:00', '09:30', '11:00'), exam('13:00', '13:30', '15:00'), DEFAULT_SETTINGS);
    expect(o.level).toBe('info');
    expect(o.gapMin).toBe(120);
  });
  it('시각 없는 같은 날 시험 두 개는 주의', () => {
    const o = classifyPair(exam(null, null, null), exam(null, null, null), DEFAULT_SETTINGS);
    expect(o.level).toBe('warn');
    expect(o.gapMin).toBeNull();
  });
  it('한쪽만 시각이 없어도 주의', () => {
    expect(classifyPair(exam('09:00', '09:30', '11:00'), exam(null, null, null), DEFAULT_SETTINGS).level).toBe('warn');
  });
  it('종료 시각이 없으면 시작 + 120분으로 계산', () => {
    // 경희 09:30 입실·10:00 시작·종료 없음 → 12:00 종료, 성대 13:00 입실 → 간격 60분
    const o = classifyPair(exam('09:30', '10:00', null), exam('13:00', '13:30', '15:00'), DEFAULT_SETTINGS);
    expect(o.gapMin).toBe(60);
    expect(o.level).toBe('warn');
  });
  it('입력 순서와 상관없이 먼저 시작하는 쪽이 a', () => {
    const am = exam('09:30', '10:00', '11:30', 'am');
    const pm = exam('13:00', '13:30', '15:00', 'pm');
    const o = classifyPair(pm, am, DEFAULT_SETTINGS);
    expect(o.a.id).toBe('am');
    expect(o.gapMin).toBe(90);
  });
  it('기준 간격 설정을 따른다', () => {
    const s = { ...DEFAULT_SETTINGS, overlap_gap_min: 60 };
    expect(classifyPair(exam('09:30', '10:00', '11:30'), exam('13:00', '13:30', '15:00'), s).level).toBe('info');
  });
});

describe('전체 목록', () => {
  it('시험·면접만 같은 날끼리 묶고, 날짜별 최고 등급을 낸다', () => {
    const list = [
      exam('09:30', '10:00', '11:30'),
      exam('13:00', '13:30', '15:00'),
      ev({ event_type: 'first_result', start_date: D, start_time: '10:00' }),
      ev({ event_type: 'exam', start_date: '2027-01-17', check_in_time: '09:30', start_time: '10:00', end_time: '11:30' }),
      ev({ event_type: 'exam', start_date: '2027-01-17', check_in_time: '11:00', start_time: '11:30', end_time: '12:30' }),
      ev({ event_type: 'exam', start_date: '2027-01-24', check_in_time: '12:30' }),
    ];
    const all = findOverlaps(list, DEFAULT_SETTINGS);
    expect(all.map((o) => [o.date, o.level])).toEqual([
      ['2027-01-10', 'warn'],
      ['2027-01-17', 'conflict'],
    ]);
    const m = overlapLevelsByDate(all);
    expect(m.get('2027-01-17')).toBe('conflict');
    expect(m.has('2027-01-24')).toBe(false);
  });
});

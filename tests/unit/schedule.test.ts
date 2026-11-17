import { describe, expect, it } from 'vitest';
import { dday, docDeadlineOf, effectiveEnd, effectiveStart, eventsOnDate, recommendedDeparture, selectForExport, upcomingExams } from '../../src/lib/schedule';
import { todaySeoul } from '../../src/lib/date';
import { ev, univ } from './fixtures';

describe('D-day (PRD F6-4)', () => {
  it('하루 전, 당일, 지난 일정', () => {
    expect(dday('2026-12-24', '2026-12-23').label).toBe('D-1');
    expect(dday('2026-12-24', '2026-12-24').label).toBe('D-DAY');
    expect(dday('2026-12-24', '2026-12-25').label).toBe('완료');
  });
  it('자정 직전·직후 (서울 기준)', () => {
    const before = todaySeoul(new Date('2026-12-23T14:59:59Z')); // 서울 12/23 23:59:59
    const after = todaySeoul(new Date('2026-12-23T15:00:00Z')); // 서울 12/24 00:00
    expect(dday('2026-12-24', before).label).toBe('D-1');
    expect(dday('2026-12-24', after).label).toBe('D-DAY');
  });
});

describe('실제 시작·종료 시각 (PRD 7.4)', () => {
  it('입실이 있으면 입실, 없으면 시작', () => {
    expect(effectiveStart({ check_in_time: '09:30', start_time: '10:00' })).toBe(570);
    expect(effectiveStart({ check_in_time: null, start_time: '10:00:00' })).toBe(600);
  });
  it('종료가 없으면 시작 + 기본 시험 시간', () => {
    expect(effectiveEnd({ check_in_time: '09:30', start_time: '10:00', end_time: null }, 120)).toBe(720);
    expect(effectiveEnd({ check_in_time: '09:30', start_time: '10:00', end_time: '11:00' }, 120)).toBe(660);
    expect(effectiveEnd({ check_in_time: null, start_time: null, end_time: null }, 120)).toBeNull();
  });
});

describe('권장 출발 시각', () => {
  it('입실 09:30 − 소요 55 − 여유 30 = 08:05', () => {
    expect(recommendedDeparture({ check_in_time: '09:30', start_time: '10:00' }, univ)).toBe('08:05');
  });
  it('입실이 없으면 시작 시각 기준', () => {
    expect(recommendedDeparture({ check_in_time: null, start_time: '10:00' }, univ)).toBe('08:35');
  });
  it('소요 시간이나 시각을 모르면 null', () => {
    expect(recommendedDeparture({ check_in_time: '09:30', start_time: null }, { ...univ, travel_min: null })).toBeNull();
    expect(recommendedDeparture({ check_in_time: null, start_time: null }, univ)).toBeNull();
  });
});

describe('달력 칸 일정', () => {
  const apply = ev({ event_type: 'apply', start_date: '2026-12-01', end_date: '2026-12-03', end_time: '18:00' });
  const exam = ev({ event_type: 'exam', start_date: '2026-12-03', check_in_time: '09:30' });
  it('기간 일정은 시작일과 마감일에만', () => {
    expect(eventsOnDate([apply], '2026-12-01')).toHaveLength(1);
    expect(eventsOnDate([apply], '2026-12-02')).toHaveLength(0);
    expect(eventsOnDate([apply], '2026-12-03')).toHaveLength(1);
  });
  it('시각순 정렬', () => {
    expect(eventsOnDate([apply, exam], '2026-12-03').map((e) => e.event_type)).toEqual(['exam', 'apply']);
  });
});

describe('다가오는 시험 (PRD F6)', () => {
  it('지난 시험 제외, 같은 날은 이른 시각 먼저, 시험·면접만', () => {
    const list = [
      ev({ id: 'past', event_type: 'exam', start_date: '2026-12-20', check_in_time: '09:00' }),
      ev({ id: 'pm', event_type: 'exam', start_date: '2026-12-27', check_in_time: '13:30' }),
      ev({ id: 'am', event_type: 'exam', start_date: '2026-12-27', check_in_time: '09:00' }),
      ev({ id: 'today', event_type: 'interview', start_date: '2026-12-21', check_in_time: '10:00' }),
      ev({ id: 'notice', event_type: 'first_result', start_date: '2026-12-22' }),
    ];
    expect(upcomingExams(list, '2026-12-21').map((e) => e.id)).toEqual(['today', 'am', 'pm']);
  });
});

describe('서류 마감일 연결', () => {
  const list = [
    ev({ id: 'd1', event_type: 'doc_deadline', start_date: '2026-12-10' }),
    ev({ id: 'd2', event_type: 'doc_deadline', start_date: '2027-01-12' }),
    ev({ id: 'x', event_type: 'exam', start_date: '2027-01-05' }),
  ];
  it('오늘 이후 가장 가까운 마감', () => {
    expect(docDeadlineOf(list, 'u1', '2026-12-20')?.id).toBe('d2');
  });
  it('모두 지났으면 가장 늦은 마감, 없으면 null', () => {
    expect(docDeadlineOf(list, 'u1', '2027-02-01')?.id).toBe('d2');
    expect(docDeadlineOf(list, 'other', '2026-12-20')).toBeNull();
  });
});

describe('내보내기 범위 (PRD F8)', () => {
  const list = [
    { ...ev({ id: 'a', event_type: 'exam', start_date: '2026-12-24' }), updated_at: '2026-12-01T00:00:00Z' },
    { ...ev({ id: 'b', event_type: 'apply', start_date: '2026-12-01', university_id: 'u2' }), updated_at: '2026-12-15T00:00:00Z' },
  ];
  it('전체 / 시험·면접만 / 대학 하나', () => {
    expect(selectForExport(list, { kind: 'all' })).toHaveLength(2);
    expect(selectForExport(list, { kind: 'timed' }).map((e) => e.id)).toEqual(['a']);
    expect(selectForExport(list, { kind: 'univ', universityId: 'u2' }).map((e) => e.id)).toEqual(['b']);
  });
  it('변경된 일정만: 마지막 내보내기 이후 수정분, 처음이면 전체', () => {
    expect(selectForExport(list, { kind: 'changed', since: '2026-12-10T00:00:00Z' }).map((e) => e.id)).toEqual(['b']);
    expect(selectForExport(list, { kind: 'changed', since: null })).toHaveLength(2);
  });
});

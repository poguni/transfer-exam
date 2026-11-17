import { describe, expect, it } from 'vitest';
import { chipText, eventName } from '../../src/lib/labels';
import { ev } from './fixtures';

describe('달력 칩 문구', () => {
  it('시험·면접은 입실 시각 (DB의 HH:MM:SS도 HH:MM으로)', () => {
    expect(chipText(ev({ event_type: 'exam', start_date: '2026-12-24', check_in_time: '09:30:00' }), '2026-12-24')).toBe('필기 09:30');
    expect(chipText(ev({ event_type: 'interview', start_date: '2027-01-21', start_time: '14:00' }), '2027-01-21')).toBe('면접 14:00');
  });
  it('기간 일정: 시작일은 "시작", 마감일은 "마감 + 시각"', () => {
    const apply = ev({ event_type: 'apply', start_date: '2026-12-01', end_date: '2026-12-03', end_time: '18:00:00' });
    expect(chipText(apply, '2026-12-01')).toBe('접수 시작');
    expect(chipText(apply, '2026-12-03')).toBe('접수 마감 18:00');
  });
  it('하루짜리 마감 일정은 마감으로 표시', () => {
    expect(chipText(ev({ event_type: 'doc_deadline', start_date: '2027-01-12', end_time: '17:00' }), '2027-01-12')).toBe('서류 마감 17:00');
  });
  it('충원 발표 차수와 기타 일정 이름', () => {
    expect(chipText(ev({ event_type: 'extra_result', start_date: '2027-02-15', round_no: 2, start_time: '10:00' }), '2027-02-15')).toBe('충원 2차 10:00');
    expect(eventName(ev({ event_type: 'extra_result', start_date: '2027-02-15', round_no: 2 }))).toBe('2차 충원 발표');
    expect(eventName(ev({ event_type: 'other', start_date: '2026-11-30', title: '모집요강 발표' }))).toBe('모집요강 발표');
  });
});

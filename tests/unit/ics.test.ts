import { describe, expect, it } from 'vitest';
import { buildIcs, escapeText, foldLine, icsFileName, seoulToUtcStamp } from '../../src/lib/ics';
import { DEFAULT_SETTINGS } from '../../src/lib/types';
import { ev, univ } from './fixtures';

const now = new Date('2026-12-21T03:00:00Z');
const unfold = (s: string) => s.replace(/\r\n /g, '');

describe('형식 도우미', () => {
  it('쉼표·세미콜론·백슬래시·줄바꿈 이스케이프', () => {
    expect(escapeText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
  });
  it('75바이트 줄 접기: 한글(3바이트)을 쪼개지 않음', () => {
    const line = 'DESCRIPTION:' + '가'.repeat(60);
    const folded = foldLine(line);
    const enc = new TextEncoder();
    for (const part of folded.split('\r\n')) expect(enc.encode(part).length).toBeLessThanOrEqual(75);
    expect(unfold(folded)).toBe(line);
  });
  it('짧은 줄은 그대로', () => {
    expect(foldLine('VERSION:2.0')).toBe('VERSION:2.0');
  });
  it('서울 시각 → UTC (자정을 넘으면 전날)', () => {
    expect(seoulToUtcStamp('2026-12-23', '20:00')).toBe('20261223T110000Z');
    expect(seoulToUtcStamp('2026-12-24', '08:00')).toBe('20261223T230000Z');
  });
  it('파일 이름', () => {
    expect(icsFileName('전체')).toBe('편입시험_2027_전체.ics');
  });
});

describe('buildIcs', () => {
  const exam = ev({ id: 'ex1', event_type: 'exam', start_date: '2026-12-24', check_in_time: '09:30:00', start_time: '10:00:00', end_time: '11:00:00' });
  const apply = ev({ id: 'ap1', event_type: 'apply', start_date: '2026-12-01', end_date: '2026-12-03', end_time: '18:00' });
  const notice = ev({ id: 'n1', event_type: 'first_result', start_date: '2027-01-06', start_time: '14:00' });
  const ics = buildIcs(
    [
      { event: exam, university: univ, checklist: ['수험표', '신분증'] },
      { event: apply, university: univ },
      { event: notice, university: univ },
    ],
    { settings: DEFAULT_SETTINGS, now },
  );
  const text = unfold(ics);

  it('모든 줄이 CRLF로 끝나고 75바이트 이하', () => {
    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/\n/);
    const enc = new TextEncoder();
    for (const l of ics.split('\r\n')) expect(enc.encode(l).length).toBeLessThanOrEqual(75);
  });
  it('달력 머리와 시간대', () => {
    expect(text).toContain('PRODID:-//TExam Calendar//KO');
    expect(text).toContain('METHOD:PUBLISH');
    expect(text).toContain('X-WR-CALNAME:편입 시험 2027');
    expect(text).toContain('TZID:Asia/Seoul');
    expect(text).toContain('TZOFFSETTO:+0900');
  });
  it('시험: 서울 시각, 고정 UID, 알림 2개(전날 20:00, 2시간 전)', () => {
    expect(text).toContain('UID:ex1@tcal');
    expect(text).toContain('DTSTART;TZID=Asia/Seoul:20261224T093000');
    expect(text).toContain('DTEND;TZID=Asia/Seoul:20261224T110000');
    expect(text).toContain('TRIGGER;VALUE=DATE-TIME:20261223T110000Z');
    expect(text).toContain('TRIGGER:-PT120M');
    expect(text).toContain('SUMMARY:[건국] 영어 필기');
    expect(text).toContain('LOCATION:새천년관 3층 301호');
    expect(text).toContain('수험 번호: K-30217');
    expect(text).toContain('권장 출발: 08:05');
    expect(text).toContain('준비물: 수험표\\, 신분증');
    expect(text).toContain('URL:https://example.com/guide');
  });
  it('기간 마감 일정: 종일, 종료일은 다음 날, 마감 전날 09:00 알림', () => {
    expect(text).toContain('DTSTART;VALUE=DATE:20261201');
    expect(text).toContain('DTEND;VALUE=DATE:20261204');
    expect(text).toContain('TRIGGER;VALUE=DATE-TIME:20261202T000000Z');
  });
  it('발표 일정: 종일, 알림 없음', () => {
    const block = text.slice(text.indexOf('UID:n1@tcal'));
    const ev1 = block.slice(0, block.indexOf('END:VEVENT'));
    expect(ev1).toContain('DTSTART;VALUE=DATE:20270106');
    expect(ev1).toContain('DTEND;VALUE=DATE:20270107');
    expect(ev1).not.toContain('VALARM');
  });
  it('같은 입력이면 같은 결과(다시 내보내도 UID 동일)', () => {
    const again = buildIcs([{ event: exam, university: univ, checklist: ['수험표', '신분증'] }, { event: apply, university: univ }, { event: notice, university: univ }], { settings: DEFAULT_SETTINGS, now });
    expect(again).toBe(ics);
  });
});

describe('알림 시각 설정 반영 (PRD F11)', () => {
  it('설정에서 바꾼 알림 시각을 쓴다', () => {
    const exam = ev({ id: 'ex9', event_type: 'exam', start_date: '2026-12-24', check_in_time: '09:30' });
    const text = unfold(buildIcs([{ event: exam, university: univ }], { settings: { ...DEFAULT_SETTINGS, ics_exam_eve: '21:30', ics_exam_before_min: 90 }, now }));
    expect(text).toContain('TRIGGER;VALUE=DATE-TIME:20261223T123000Z');
    expect(text).toContain('TRIGGER:-PT90M');
  });
});

describe('RFC 5545 순서', () => {
  it('VALARM은 일정 속성(SUMMARY 등) 뒤에 온다', () => {
    const exam = ev({ id: 'o1', event_type: 'exam', start_date: '2026-12-24', check_in_time: '09:30' });
    const text = unfold(buildIcs([{ event: exam, university: univ }], { settings: DEFAULT_SETTINGS, now }));
    const block = text.slice(text.indexOf('BEGIN:VEVENT'), text.indexOf('END:VEVENT'));
    expect(block.indexOf('BEGIN:VALARM')).toBeGreaterThan(block.indexOf('DESCRIPTION:건국대학교'));
    expect(block.indexOf('BEGIN:VALARM')).toBeGreaterThan(block.indexOf('SUMMARY:'));
  });
});

import { EVENT_TYPES } from './constants';
import { addDays, fromMinutes, hhmm, toMinutes } from './date';
import { effectiveEnd, effectiveStart, isDeadline, isTimed, recommendedDeparture } from './schedule';
import type { CalEvent, DateStr, FamilySettings, TimeStr, University } from './types';

// RFC 5545 .ics 생성 (PRD F8). 외부 라이브러리 없이 직접 만듭니다.

export interface IcsAlarmSettings {
  /** 시험·면접 전날 알림 시각 */
  examEve: TimeStr;
  /** 시험·면접 시작 몇 분 전 알림 */
  examBeforeMin: number;
  /** 마감 일정 전날 알림 시각 */
  dueEve: TimeStr;
}


export interface IcsItem {
  event: CalEvent;
  university: University;
  /** 준비물 이름들 (설명에 넣음) */
  checklist?: string[];
}

export interface IcsOptions {
  settings: FamilySettings;
  alarms?: IcsAlarmSettings;
  /** DTSTAMP. 테스트에서 고정하려고 받습니다 */
  now?: Date;
}

const CRLF = '\r\n';

/** TEXT 값 이스케이프: \ ; , 줄바꿈 */
export function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** 한 줄을 75바이트(UTF-8) 이하로 접습니다. 이어지는 줄은 공백 하나로 시작 */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let cur = '';
  let curBytes = 0;
  let limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (curBytes + b > limit) {
      parts.push(cur);
      cur = '';
      curBytes = 0;
      limit = 74; // 앞의 공백 1바이트
    }
    cur += ch;
    curBytes += b;
  }
  parts.push(cur);
  return parts.join(CRLF + ' ');
}

const compactDate = (d: DateStr) => d.replace(/-/g, '');
const compactTime = (min: number) => fromMinutes(min).replace(':', '') + '00';

/** 서울 날짜·시각 → UTC 'YYYYMMDDTHHMMSSZ' (서울은 일광 절약 시간 없음, UTC+9) */
export function seoulToUtcStamp(d: DateStr, t: TimeStr): string {
  let min = toMinutes(t)! - 9 * 60;
  let day = d;
  if (min < 0) {
    min += 24 * 60;
    day = addDays(d, -1);
  }
  return `${compactDate(day)}T${compactTime(min)}Z`;
}

function utcStamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function summaryOf(e: CalEvent, u: University): string {
  const t = EVENT_TYPES[e.event_type];
  const base =
    e.event_type === 'exam'
      ? '영어 필기'
      : e.event_type === 'extra_result' && e.round_no
        ? `${e.round_no}차 충원 발표`
        : t.label;
  return `[${u.short_name}] ${e.title || base}`;
}

function descriptionOf(item: IcsItem): string {
  const { event: e, university: u, checklist } = item;
  const lines = [`${u.name} ${u.department}`];
  if (u.exam_number) lines.push(`수험 번호: ${u.exam_number}`);
  if (isTimed(e)) {
    const ci = hhmm(e.check_in_time);
    if (ci) lines.push(`입실: ${ci}`);
    const st = hhmm(e.start_time);
    if (st) lines.push(`시작: ${st}${e.end_time ? ` ~ ${hhmm(e.end_time)}` : ''}`);
    const go = recommendedDeparture(e, u);
    if (go) lines.push(`권장 출발: ${go}`);
    if (u.transit) lines.push(`교통: ${u.transit}`);
    if (checklist?.length) lines.push(`준비물: ${checklist.join(', ')}`);
  } else {
    const t = hhmm(e.end_time) ?? hhmm(e.start_time);
    if (t) lines.push(`${isDeadline(e) ? '마감' : '시각'}: ${t}`);
  }
  if (e.memo) lines.push(`메모: ${e.memo}`);
  return lines.join('\n');
}

function alarm(trigger: string, text: string): string[] {
  return ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(text)}`, trigger, 'END:VALARM'];
}

function vevent(item: IcsItem, opts: Required<IcsOptions>): string[] {
  const { event: e, university: u } = item;
  const summary = summaryOf(e, u);
  const out = ['BEGIN:VEVENT', `UID:${e.id}@tcal`, `DTSTAMP:${utcStamp(opts.now)}`];
  // RFC 5545: 일정 속성을 모두 쓴 뒤에 VALARM을 둠
  const alarms: string[] = [];

  const start = effectiveStart(e);
  const end = effectiveEnd(e, opts.settings.default_exam_min);
  if (isTimed(e) && start != null && end != null) {
    out.push(`DTSTART;TZID=Asia/Seoul:${compactDate(e.start_date)}T${compactTime(start)}`);
    out.push(`DTEND;TZID=Asia/Seoul:${compactDate(e.start_date)}T${compactTime(Math.min(end, 24 * 60 - 1))}`);
    alarms.push(...alarm(`TRIGGER;VALUE=DATE-TIME:${seoulToUtcStamp(addDays(e.start_date, -1), opts.alarms.examEve)}`, `내일 ${summary}`));
    alarms.push(...alarm(`TRIGGER:-PT${opts.alarms.examBeforeMin}M`, summary));
  } else {
    // 시각이 없거나 시험·면접이 아닌 일정은 종일 일정. 기간이면 시작~마감, 종료일은 다음 날(배타적)
    const last = e.end_date ?? e.start_date;
    out.push(`DTSTART;VALUE=DATE:${compactDate(e.start_date)}`);
    out.push(`DTEND;VALUE=DATE:${compactDate(addDays(last, 1))}`);
    if (isDeadline(e)) {
      alarms.push(...alarm(`TRIGGER;VALUE=DATE-TIME:${seoulToUtcStamp(addDays(last, -1), opts.alarms.dueEve)}`, `내일 마감 ${summary}`));
    }
  }
  out.push(`SUMMARY:${escapeText(summary)}`);
  const venue = e.venue || u.venue;
  if (venue) out.push(`LOCATION:${escapeText(venue)}`);
  out.push(`DESCRIPTION:${escapeText(descriptionOf(item))}`);
  if (u.guide_url) out.push(`URL:${u.guide_url}`);
  out.push(...alarms, 'END:VEVENT');
  return out;
}

/** 가족 설정의 알림 값 → .ics 알림 설정 */
export function alarmsFrom(s: Pick<FamilySettings, 'ics_exam_eve' | 'ics_exam_before_min' | 'ics_due_eve'>): IcsAlarmSettings {
  return { examEve: s.ics_exam_eve, examBeforeMin: s.ics_exam_before_min, dueEve: s.ics_due_eve };
}

export function buildIcs(items: readonly IcsItem[], options: IcsOptions): string {
  const opts: Required<IcsOptions> = { alarms: alarmsFrom(options.settings), now: new Date(), ...options };
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TExam Calendar//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText('편입 시험 2027')}`,
    'X-WR-TIMEZONE:Asia/Seoul',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Seoul',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0900',
    'TZOFFSETTO:+0900',
    'TZNAME:KST',
    'END:STANDARD',
    'END:VTIMEZONE',
    ...items.flatMap((it) => vevent(it, opts)),
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join(CRLF) + CRLF;
}

/** 파일 이름 예: 편입시험_2027_전체.ics */
export function icsFileName(scope: string): string {
  return `편입시험_2027_${scope.replace(/[\\/:*?"<>|\s]+/g, '_')}.ics`;
}

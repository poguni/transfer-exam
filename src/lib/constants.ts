import type { DateStr, EventType } from './types';

export const TZ = 'Asia/Seoul';

/** 달력·입력 범위 (PRD F4-8) */
export const PERIOD_START: DateStr = '2026-11-01';
export const PERIOD_END: DateStr = '2027-02-28';

/** 표시할 네 달 [연도, 월(1~12)] */
export const MONTHS: ReadonlyArray<readonly [number, number]> = [
  [2026, 11],
  [2026, 12],
  [2027, 1],
  [2027, 2],
];

/** 공휴일 (PRD F4-3). 바뀌면 여기만 고칩니다. 2/9 대체공휴일은 정부 공고로 최종 확인. */
export const HOLIDAYS: Readonly<Record<DateStr, string>> = {
  '2026-12-25': '성탄절',
  '2027-01-01': '신정',
  '2027-02-06': '설 연휴',
  '2027-02-07': '설날',
  '2027-02-08': '설 연휴',
  '2027-02-09': '대체공휴일',
};

export const DOW = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** 일정 종류: 이름, 기호, 시험·면접 여부(시각 검사 대상), 마감 여부(▲), 기간 입력 가능 여부 */
export const EVENT_TYPES: Readonly<
  Record<EventType, { label: string; symbol: string; timed: boolean; deadline: boolean; period: boolean }>
> = {
  apply: { label: '원서 접수', symbol: '▲', timed: false, deadline: true, period: true },
  exam: { label: '필기시험', symbol: '●', timed: true, deadline: false, period: false },
  venue_notice: { label: '고사장 발표', symbol: '○', timed: false, deadline: false, period: false },
  first_result: { label: '1단계 발표', symbol: '○', timed: false, deadline: false, period: false },
  doc_deadline: { label: '서류 마감', symbol: '▲', timed: false, deadline: true, period: true },
  interview: { label: '면접', symbol: '◆', timed: true, deadline: false, period: false },
  final_result: { label: '최종 발표', symbol: '○', timed: false, deadline: false, period: false },
  payment: { label: '등록금 납부', symbol: '▲', timed: false, deadline: true, period: true },
  extra_result: { label: '충원 발표', symbol: '○', timed: false, deadline: false, period: false },
  other: { label: '기타', symbol: '·', timed: false, deadline: false, period: true },
};

/** 대학 12색 (DESIGN 4.1). 흰 글자와 대비 4.5:1 이상 */
export const UNIV_COLORS = [
  '#1D4ED8', '#C2410C', '#047857', '#6D28D9', '#BE185D', '#0E7490',
  '#B45309', '#475569', '#A21CAF', '#4D7C0F', '#7C2D12', '#4338CA',
] as const;

export const PRIORITY_LABEL = { first: '1지망', reach: '상향', target: '적정', safe: '안정' } as const;
export const PRIORITY_ORDER = { first: 0, reach: 1, target: 2, safe: 3 } as const;
export const AGENCY_LABEL = { jinhak: '진학어플라이', uway: '유웨이', school: '대학 자체' } as const;
export const EXAM_TYPE_LABEL = { english: '영어', interview: '면접', document: '서류 평가' } as const;
export const RESULT_LABEL = {
  pending: '대기',
  first_pass: '1단계 합격',
  final_pass: '최종 합격',
  waitlist: '예비',
  fail: '불합격',
} as const;
export const DOC_TYPE_LABEL = {
  study_plan: '학업 계획서',
  self_intro: '자기소개서',
  transcript: '대학 성적 증명서',
  completion_cert: '수료·졸업 예정 증명서',
  other: '기타',
} as const;
export const DOC_STATUS_LABEL = { todo: '준비 중', ready: '발급·작성 완료', submitted: '제출 완료' } as const;
export const SUBMIT_METHOD_LABEL = { upload: '온라인 업로드', mail: '우편', visit: '방문' } as const;

/** 대학 등록 시 자동으로 넣는 준비물 (PRD 4.8 G) */
export const DEFAULT_CHECKLIST = [
  '수험표(2~3장 출력)',
  '실물 신분증',
  '컴퓨터용 사인펜',
  '수정테이프',
  '아날로그 손목시계',
  '교통카드',
  '소액 현금',
] as const;

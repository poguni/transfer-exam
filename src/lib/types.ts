// DB(tcal_*) 행과 같은 모양(snake_case)을 그대로 씁니다. 변환 단계를 두지 않기 위해서입니다.

/** 'YYYY-MM-DD' (서울 날짜) */
export type DateStr = string;
/** 'HH:MM' 또는 Postgres time 형식 'HH:MM:SS' */
export type TimeStr = string;

export type EventType =
  | 'apply'
  | 'exam'
  | 'venue_notice'
  | 'first_result'
  | 'doc_deadline'
  | 'interview'
  | 'final_result'
  | 'payment'
  | 'extra_result'
  | 'other';

export type Priority = 'first' | 'reach' | 'target' | 'safe';

export interface University {
  id: string;
  name: string;
  short_name: string;
  department: string;
  color: string;
  priority: Priority | null;
  exam_number: string | null;
  venue: string | null;
  transit: string | null;
  travel_min: number | null;
  buffer_min: number;
  guide_url: string | null;
}

export interface CalEvent {
  id: string;
  university_id: string;
  event_type: EventType;
  title: string | null;
  start_date: DateStr;
  end_date: DateStr | null;
  check_in_time: TimeStr | null;
  start_time: TimeStr | null;
  end_time: TimeStr | null;
  venue: string | null;
  round_no: number | null;
  memo: string | null;
}

/** tcal_families.settings */
export interface FamilySettings {
  overlap_gap_min: number;
  default_exam_min: number;
  default_buffer_min: number;
}

export const DEFAULT_SETTINGS: FamilySettings = {
  overlap_gap_min: 120,
  default_exam_min: 120,
  default_buffer_min: 30,
};

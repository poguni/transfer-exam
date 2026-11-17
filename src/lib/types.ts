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

export type ExamType = 'english' | 'interview' | 'document';
export type ApplyAgency = 'jinhak' | 'uway' | 'school';
export type ResultStatus = 'pending' | 'first_pass' | 'final_pass' | 'waitlist' | 'fail';

/** tcal_universities 전체 행 */
export interface UniversityRow extends University {
  family_id: string;
  quota: number | null;
  competition_rate: number | null;
  exam_types: ExamType[];
  score_ratio: string | null;
  stage_type: 'one' | 'two' | null;
  exam_format: string | null;
  apply_agency: ApplyAgency | null;
  receipt_number: string | null;
  application_fee: number | null;
  fee_paid: boolean;
  ticket_printed: boolean;
  admission_phone: string | null;
  homepage_url: string | null;
  map_url: string | null;
  prohibited_items: string | null;
  result_status: ResultStatus;
  waitlist_no: number | null;
  review_memo: string | null;
  memo: string | null;
  created_at: string;
}

export type DocType = 'study_plan' | 'self_intro' | 'transcript' | 'completion_cert' | 'other';
export type DocStatus = 'todo' | 'ready' | 'submitted';

export interface DocumentRow {
  id: string;
  family_id: string;
  university_id: string;
  doc_type: DocType;
  custom_name: string | null;
  status: DocStatus;
  submit_method: 'upload' | 'mail' | 'visit' | null;
  mail_basis: 'postmark' | 'arrival' | null;
  original_required: boolean;
  memo: string | null;
}

export interface ChecklistRow {
  id: string;
  family_id: string;
  university_id: string;
  label: string;
  checked: boolean;
  sort_order: number;
}

export interface Family {
  id: string;
  name: string;
  invite_code: string;
  settings: FamilySettings;
}

export interface Member {
  family_id: string;
  user_id: string;
  role: 'student' | 'parent';
  display_name: string | null;
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

export interface EventRow extends CalEvent {
  family_id: string;
  map_url: string | null;
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

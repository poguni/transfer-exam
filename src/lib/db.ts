import { supabase } from './supabase';
import { DEFAULT_CHECKLIST } from './constants';
import type { ChecklistRow, DocumentRow, EventRow, Family, Member, UniversityRow } from './types';
import { DEFAULT_SETTINGS } from './types';

// Supabase 호출을 한곳에 모읍니다. 화면은 이 함수들만 씁니다.

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export interface Membership {
  family: Family;
  member: Member;
  members: Member[];
}

/** 로그인한 사람의 가족. 아직 가족이 없으면 null */
export async function fetchMembership(userId: string): Promise<Membership | null> {
  const mine = must(
    await supabase.from('tcal_family_members').select('*').eq('user_id', userId).order('joined_at').limit(1),
  ) as Member[];
  if (!mine.length) return null;
  const member = mine[0];
  const family = must(
    await supabase.from('tcal_families').select('id,name,invite_code,settings').eq('id', member.family_id).single(),
  ) as Family;
  family.settings = { ...DEFAULT_SETTINGS, ...family.settings };
  const members = must(
    await supabase.from('tcal_family_members').select('*').eq('family_id', family.id).order('joined_at'),
  ) as Member[];
  return { family, member, members };
}

export async function createFamily(name: string, role: Member['role'], displayName: string): Promise<string> {
  return must(await supabase.rpc('tcal_create_family', { family_name: name, member_role: role, member_name: displayName }));
}

export async function joinFamily(code: string, role: Member['role'], displayName: string): Promise<string> {
  return must(await supabase.rpc('tcal_join_family', { code, member_role: role, member_name: displayName }));
}

export async function updateFamily(id: string, patch: Partial<Pick<Family, 'name' | 'settings'>>): Promise<void> {
  must(await supabase.from('tcal_families').update(patch).eq('id', id));
}

export interface FamilyData {
  universities: UniversityRow[];
  events: EventRow[];
  documents: DocumentRow[];
  checklist: ChecklistRow[];
}

/** 가족 데이터 전체를 한 번에 (PRD 10: 대학 20곳·일정 100개 이하 가정) */
export async function fetchFamilyData(familyId: string): Promise<FamilyData> {
  const [u, e, d, c] = await Promise.all([
    supabase.from('tcal_universities').select('*').eq('family_id', familyId).order('created_at'),
    supabase.from('tcal_events').select('*').eq('family_id', familyId).order('start_date'),
    supabase.from('tcal_documents').select('*').eq('family_id', familyId),
    supabase.from('tcal_checklist_items').select('*').eq('family_id', familyId).order('sort_order'),
  ]);
  return {
    universities: must(u) as UniversityRow[],
    events: must(e) as EventRow[],
    documents: must(d) as DocumentRow[],
    checklist: must(c) as ChecklistRow[],
  };
}

// ---------- 대학 ----------
export type UniversityInput = Omit<UniversityRow, 'id' | 'family_id' | 'created_at'>;
export type DocInput = Pick<DocumentRow, 'doc_type' | 'custom_name' | 'status' | 'submit_method' | 'mail_basis' | 'original_required' | 'memo'> & { id?: string };
export type ChecklistInput = { id?: string; label: string; checked?: boolean };

/** 대학 저장(새로 만들기 또는 수정) + 서류·준비물 목록을 입력한 대로 맞춤 */
export async function saveUniversity(
  familyId: string,
  id: string | null,
  input: UniversityInput,
  docs: DocInput[],
  checklist: ChecklistInput[] | null,
): Promise<string> {
  let uid = id;
  if (uid) {
    must(await supabase.from('tcal_universities').update(input).eq('id', uid));
  } else {
    const row = must(
      await supabase.from('tcal_universities').insert({ ...input, family_id: familyId }).select('id').single(),
    ) as { id: string };
    uid = row.id;
  }

  // 서류: 남은 것은 수정, 빠진 것은 삭제, 새 것은 추가
  const existingDocs = must(await supabase.from('tcal_documents').select('id').eq('university_id', uid)) as { id: string }[];
  const keepDocIds = new Set(docs.filter((d) => d.id).map((d) => d.id));
  const removeDocs = existingDocs.filter((d) => !keepDocIds.has(d.id)).map((d) => d.id);
  if (removeDocs.length) must(await supabase.from('tcal_documents').delete().in('id', removeDocs));
  for (const d of docs) {
    const { id: docId, ...rest } = d;
    if (docId) must(await supabase.from('tcal_documents').update(rest).eq('id', docId));
    else must(await supabase.from('tcal_documents').insert({ ...rest, family_id: familyId, university_id: uid }));
  }

  // 준비물: 새 대학이면 기본 7개(PRD 7.3), 수정이면 입력한 목록으로 맞춤
  const items: ChecklistInput[] = checklist ?? DEFAULT_CHECKLIST.map((label) => ({ label }));
  const existingItems = id
    ? (must(await supabase.from('tcal_checklist_items').select('id').eq('university_id', uid)) as { id: string }[])
    : [];
  const keepItemIds = new Set(items.filter((i) => i.id).map((i) => i.id));
  const removeItems = existingItems.filter((i) => !keepItemIds.has(i.id)).map((i) => i.id);
  if (removeItems.length) must(await supabase.from('tcal_checklist_items').delete().in('id', removeItems));
  for (const [i, it] of items.entries()) {
    if (it.id) must(await supabase.from('tcal_checklist_items').update({ label: it.label, sort_order: i }).eq('id', it.id));
    else
      must(
        await supabase
          .from('tcal_checklist_items')
          .insert({ family_id: familyId, university_id: uid, label: it.label, sort_order: i, checked: false }),
      );
  }
  return uid!;
}

/** 대학 삭제: 일정·서류·준비물은 DB의 on delete cascade로 함께 지워짐 */
export async function deleteUniversity(id: string): Promise<void> {
  must(await supabase.from('tcal_universities').delete().eq('id', id));
}

export async function patchUniversity(id: string, patch: Partial<UniversityInput>): Promise<void> {
  must(await supabase.from('tcal_universities').update(patch).eq('id', id));
}

// ---------- 일정 ----------
export type EventInput = Omit<EventRow, 'id' | 'family_id'>;

export async function saveEvent(familyId: string, id: string | null, input: EventInput): Promise<string> {
  if (id) {
    must(await supabase.from('tcal_events').update(input).eq('id', id));
    return id;
  }
  const row = must(
    await supabase.from('tcal_events').insert({ ...input, family_id: familyId }).select('id').single(),
  ) as { id: string };
  return row.id;
}

export async function deleteEvent(id: string): Promise<void> {
  must(await supabase.from('tcal_events').delete().eq('id', id));
}

// ---------- 서류·준비물 ----------
export async function setDocStatus(id: string, status: DocumentRow['status']): Promise<void> {
  must(await supabase.from('tcal_documents').update({ status }).eq('id', id));
}

export async function setChecked(ids: string[], checked: boolean): Promise<void> {
  if (!ids.length) return;
  must(await supabase.from('tcal_checklist_items').update({ checked }).in('id', ids));
}

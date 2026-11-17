import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { fetchFamilyData, fetchMembership, type FamilyData, type Membership } from '../lib/db';
import { todaySeoul } from '../lib/date';
import { findOverlaps, overlapLevelsByDate, type Overlap, type OverlapLevel } from '../lib/overlap';
import type { DateStr, EventRow, UniversityRow } from '../lib/types';

// ---------- 로그인 상태 ----------
export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, loading };
}

export function useMembership(userId: string) {
  return useQuery({ queryKey: ['membership', userId], queryFn: () => fetchMembership(userId) });
}

// ---------- 가족 데이터 ----------
export interface FamilyState extends Membership, FamilyData {
  userId: string;
  today: DateStr;
  univ: Map<string, UniversityRow>;
  overlaps: Overlap<EventRow>[];
  overlapLevel: Map<DateStr, OverlapLevel>;
  /** 저장 후 다시 불러오기 */
  refresh: () => Promise<void>;
}

const Ctx = createContext<FamilyState | null>(null);

export function useFamily(): FamilyState {
  const v = useContext(Ctx);
  if (!v) throw new Error('FamilyProvider 밖에서 useFamily를 썼습니다');
  return v;
}

/** 서울 날짜가 바뀌면(자정) 다시 그리도록 1분마다 확인 */
function useToday(): DateStr {
  const [today, setToday] = useState(todaySeoul());
  useEffect(() => {
    const t = setInterval(() => setToday(todaySeoul()), 60_000);
    return () => clearInterval(t);
  }, []);
  return today;
}

export function FamilyProvider({ userId, membership, children }: { userId: string; membership: Membership; children: ReactNode }) {
  const qc = useQueryClient();
  const today = useToday();
  const familyId = membership.family.id;
  const q = useQuery({ queryKey: ['family', familyId], queryFn: () => fetchFamilyData(familyId) });

  const value = useMemo<FamilyState | null>(() => {
    if (!q.data) return null;
    const overlaps = findOverlaps(q.data.events, membership.family.settings);
    return {
      ...membership,
      ...q.data,
      userId,
      today,
      univ: new Map(q.data.universities.map((u) => [u.id, u])),
      overlaps,
      overlapLevel: overlapLevelsByDate(overlaps),
      refresh: async () => {
        await Promise.all([
          qc.invalidateQueries({ queryKey: ['family', familyId] }),
          qc.invalidateQueries({ queryKey: ['membership', userId] }),
        ]);
      },
    };
  }, [q.data, membership, userId, today, qc, familyId]);

  if (q.error) return <FullMessage title="데이터를 불러오지 못했습니다" body={String(q.error.message)} />;
  if (!value) return <FullMessage title="불러오는 중…" />;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function FullMessage({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <div className="full-msg">
      <div>
        <h2>{title}</h2>
        {body && <p className="muted">{body}</p>}
        {children}
      </div>
    </div>
  );
}

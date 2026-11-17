import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { RealtimeChannel, Session } from '@supabase/supabase-js';
import { readCache, writeCache } from '../lib/offline';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { fetchFamilyData, fetchMembership, type FamilyData, type Membership } from '../lib/db';
import { formatMD, todaySeoul } from '../lib/date';
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
  const cached = readCache<Membership>('m.' + userId);
  return useQuery({
    queryKey: ['membership', userId],
    queryFn: async () => {
      const m = await fetchMembership(userId);
      if (m) writeCache('m.' + userId, m);
      return m;
    },
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.savedAt,
  });
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
  const cached = readCache<FamilyData>('f.' + familyId);
  const q = useQuery({
    queryKey: ['family', familyId],
    queryFn: async () => {
      const d = await fetchFamilyData(familyId);
      writeCache('f.' + familyId, d);
      return d;
    },
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.savedAt,
  });

  // 실시간 반영 (PRD F1-5): 저장한 쪽이 "바뀜" 신호를 보내면 다른 가족 기기가 다시 불러옴.
  // Supabase Realtime Broadcast만 쓰므로 DB 설정을 바꾸지 않고, 신호에는 데이터가 들어 있지 않음.
  const channel = useRef<RealtimeChannel | null>(null);
  useEffect(() => {
    const ch = supabase.channel(`tcal-family-${familyId}`, { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event: 'changed' }, () => {
      qc.invalidateQueries({ queryKey: ['family', familyId] });
      qc.invalidateQueries({ queryKey: ['membership', userId] });
    }).subscribe();
    channel.current = ch;
    return () => {
      channel.current = null;
      supabase.removeChannel(ch);
    };
  }, [familyId, userId, qc]);

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
        void channel.current?.send({ type: 'broadcast', event: 'changed', payload: {} });
      },
    };
  }, [q.data, membership, userId, today, qc, familyId]);

  if (!value && q.error) return <FullMessage title="데이터를 불러오지 못했습니다" body={String(q.error.message)} />;
  if (!value) return <FullMessage title="불러오는 중…" />;
  return (
    <Ctx.Provider value={value}>
      {children}
      {/* 보관본을 보는 중이면 알림 (저장은 연결된 뒤에 가능) */}
      {q.isError && (
        <div className="offline-bar" role="status">
          연결이 안 되어 {savedLabel(q.dataUpdatedAt)} 기준 보관 데이터를 보여 줍니다
        </div>
      )}
    </Ctx.Provider>
  );
}

/** 보관 시각 표시: "11/17(화) 21:17" (서울 시간, 24시간제) */
function savedLabel(ms: number): string {
  const d = new Date(ms);
  const date = todaySeoul(d);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return `${formatMD(date)} ${time}`;
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

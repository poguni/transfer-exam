import { supabase } from './supabase';

// 마지막으로 불러온 데이터를 이 기기에 보관해, 전파가 약한 곳에서도 시험 정보를 봅니다 (PRD 10 오프라인 P1).
// 수험 번호 등이 들어 있으므로 로그아웃하면 지웁니다.

const PREFIX = 'tcal.cache.v1.';

export interface Cached<T> {
  savedAt: number;
  data: T;
}

export function readCache<T>(key: string): Cached<T> | undefined {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as Cached<T>) : undefined;
  } catch {
    return undefined;
  }
}

export function writeCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    /* 저장 공간이 없거나 막혀 있어도 앱은 동작 */
  }
}

export function clearCaches(): void {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* 무시 */
  }
}

/** 로그아웃: 기기에 보관한 가족 데이터도 지움 */
export async function signOut(): Promise<void> {
  clearCaches();
  await supabase.auth.signOut();
}

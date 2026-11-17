import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** 빌드할 때 Supabase 값이 빠졌는지 (main.tsx가 빈 화면 대신 안내를 보여 줌) */
export const missingEnv = !url || !key;

// 로그인 상태 유지(PRD F1-4): 기본값인 localStorage 세션 + 자동 갱신
export const supabase = createClient(url || 'https://missing.invalid', key || 'missing', {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'tcal.auth' },
});

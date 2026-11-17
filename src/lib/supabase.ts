import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !key) {
  throw new Error('VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY가 필요합니다. .env.example을 .env.local로 복사해 채우세요.');
}

// 로그인 상태 유지(PRD F1-4): 기본값인 localStorage 세션 + 자동 갱신
export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'tcal.auth' },
});

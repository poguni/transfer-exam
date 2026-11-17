import { useEffect, useState } from 'react';

/** 1024px 미만이면 모바일 배치 (DESIGN 5장: 데스크톱은 1024px 이상) */
const QUERY = '(max-width: 1023px)';

export function useMobile(): boolean {
  const [m, setM] = useState(() => window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}

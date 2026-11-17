import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { applyTheme, getSavedTheme } from './lib/themes';
import { App } from './App';
import { FullMessage } from './app/state';
import { missingEnv } from './lib/supabase';
import './styles/index.css';

applyTheme(getSavedTheme());

// 서비스 워커: 배포본에서만 (개발 중에는 캐시가 방해됨)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* 등록 실패해도 앱은 동작 */
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {missingEnv ? (
      <FullMessage
        title="앱 설정이 빠져 있습니다"
        body="배포할 때 Supabase 주소·키(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)가 들어가지 않았습니다. GitHub 저장소 Settings › Secrets and variables › Actions › Variables의 Repository variables에 두 값을 넣고 다시 배포해 주세요."
      />
    ) : (
      <App />
    )}
  </StrictMode>,
);

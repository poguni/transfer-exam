import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { applyTheme, getSavedTheme } from './lib/themes';
import { App } from './App';
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
    <App />
  </StrictMode>,
);

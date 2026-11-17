// 테마 목록 (DESIGN 11장). 여기에 더하면 설정 화면의 선택지가 함께 늘어납니다.
export const THEMES = [
  {
    id: 'wongoji',
    name: '원고지',
    desc: '크림색 종이, 먹색 글씨, 파란 펜',
    fonts: 'IBM Plex Sans KR',
    bg: '#F7F5F0',
    fontCss: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap',
  },
  {
    id: 'planner',
    name: '플래너',
    desc: '연보라 다이어리와 둥근 스티커',
    fonts: '고운돋움 + 프리텐다드',
    bg: '#F3F0FA',
    fontCss: 'https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap',
  },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

const KEY = 'tcal.theme';
export const DEFAULT_THEME: ThemeId = 'wongoji';

function isTheme(v: unknown): v is ThemeId {
  return THEMES.some((t) => t.id === v);
}

export function getSavedTheme(): ThemeId {
  try {
    const v = localStorage.getItem(KEY);
    return isTheme(v) ? v : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/** 테마 적용: data-theme, 상태 표시줄 색, 그 테마의 글꼴만 불러오기 (DESIGN 1.2, 3.2) */
export function applyTheme(id: ThemeId): void {
  const theme = THEMES.find((t) => t.id === id)!;
  document.documentElement.setAttribute('data-theme', id);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.bg);
  loadThemeFonts(id);
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* 사생활 보호 모드 등: 저장 없이 적용만 */
  }
}

function loadThemeFonts(id: ThemeId): void {
  const theme = THEMES.find((t) => t.id === id)!;
  if (!document.querySelector(`link[data-font="${id}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = theme.fontCss;
    link.dataset.font = id;
    document.head.appendChild(link);
  }
  // 프리텐다드는 npm 패키지로 자체 호스팅합니다(플래너일 때만 불러옴)
  if (id === 'planner') void import('pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css');
}

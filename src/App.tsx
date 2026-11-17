import { formatMD, todaySeoul } from './lib/date';

// 기반 확인용 임시 화면입니다. 다음 단계에서 데스크톱 틀(왼쪽 메뉴·달력·오른쪽 패널)로 바꿉니다.
export function App() {
  return (
    <main className="grid h-dvh place-items-center bg-bg text-text">
      <div className="rounded-lg bg-surface p-6 shadow-card">
        <h1 className="font-display text-[22px]" style={{ fontWeight: 'var(--display-w)' }}>
          편입 캘린더
        </h1>
        <p className="text-muted">오늘(서울) {formatMD(todaySeoul())}</p>
      </div>
    </main>
  );
}

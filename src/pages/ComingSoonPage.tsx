// 다음 단계에서 구현할 화면의 자리
export function ComingSoonPage({ title }: { title: string }) {
  return (
    <>
      <header className="topbar">
        <h1>{title}</h1>
      </header>
      <div className="page">
        <p className="empty">다음 개발 단계에서 만들 화면입니다.</p>
      </div>
    </>
  );
}

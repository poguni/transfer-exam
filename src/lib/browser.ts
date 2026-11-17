// 브라우저 기능 도우미 (복사, 지도, 파일 내려받기)

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** 지도 링크가 없으면 장소 이름으로 네이버 지도 검색 (PRD 4.6) */
export function mapLink(mapUrl: string | null | undefined, venue: string | null | undefined): string | null {
  if (mapUrl) return mapUrl;
  if (venue) return `https://map.naver.com/p/search/${encodeURIComponent(venue)}`;
  return null;
}

/**
 * 파일 내려받기. iOS 홈 화면 앱(PWA)에서 막히면 공유 시트로 대신합니다 (PRD F8-4).
 */
export async function saveFile(name: string, content: string, type: string): Promise<void> {
  const blob = new Blob([content], { type });
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches;
  if (standalone && 'canShare' in navigator) {
    const file = new File([blob], name, { type });
    if (navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: name });
      return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

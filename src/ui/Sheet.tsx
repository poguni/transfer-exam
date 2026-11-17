import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * 모바일 바텀 시트 (DESIGN 5장, 9장, 10장)
 * - 아래에서 올라옴(220ms), 배경 35% 어둡게
 * - 바깥 누르기 · 닫기 버튼 · 아래로 끌기 · Esc로 닫힘
 * - 열리면 제목으로 초점 이동, 닫히면 누른 칸으로 초점 복귀
 */
export function Sheet({ open, full, label, onClose, children }: { open: boolean; full?: boolean; label: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => ref.current?.querySelector<HTMLElement>('h2')?.focus(), 230);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
      returnTo.current?.focus?.();
    };
  }, [open]);

  return (
    <>
      <div className={'m-scrim' + (open ? ' on' : '')} onClick={onClose} aria-hidden="true" />
      <section
        ref={ref}
        className={'m-sheet' + (open ? ' on' : '') + (full ? ' full' : '')}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-hidden={!open}
        style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
      >
        {!full && (
          <div
            className="grab-area"
            onPointerDown={(e) => {
              start.current = e.clientY;
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => start.current != null && setDrag(Math.max(0, e.clientY - start.current))}
            onPointerUp={() => {
              if (drag > 80) onClose();
              start.current = null;
              setDrag(0);
            }}
            onPointerCancel={() => {
              start.current = null;
              setDrag(0);
            }}
          >
            <div className="grab" />
          </div>
        )}
        {open && children}
      </section>
    </>
  );
}

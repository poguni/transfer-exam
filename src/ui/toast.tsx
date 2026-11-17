import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

const Ctx = createContext<(msg: string) => void>(() => {});

/** 아래쪽에 1.5초 안내 (DESIGN 9장) */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('');
  const [on, setOn] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((m: string) => {
    setMsg(m);
    setOn(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOn(false), 1500);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <div className={'toast' + (on ? ' on' : '')} role="status" aria-live="polite">
        {msg}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);

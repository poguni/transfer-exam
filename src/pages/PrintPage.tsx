import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useFamily } from '../app/state';
import { DOW, EVENT_TYPES, HOLIDAYS, MONTHS } from '../lib/constants';
import { formatMD, hhmm, monthMatrix } from '../lib/date';
import { chipText } from '../lib/labels';
import { eventsOnDate, isTimed } from '../lib/schedule';
import type { EventRow } from '../lib/types';
import { Icon } from '../ui/Icon';

type Orient = 'p' | 'l';
interface Opts {
  orient: Orient;
  months: number[];
  all: boolean;
  showNo: boolean;
  bw: boolean;
}

const KEY = 'tcal.printOpts';
const PAGE_MM = { p: [210, 297], l: [297, 210] } as const;
const MM = 96 / 25.4; // 1mm의 CSS px
const ACCENT = { wongoji: '#2B59C3', planner: '#C93F4A' } as const;

function loadOpts(): Opts {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '');
    if (v && Array.isArray(v.months)) return v;
  } catch {
    /* 기본값 */
  }
  return { orient: 'p', months: [0, 1, 2, 3], all: true, showNo: true, bw: false };
}

/** 인쇄할 장: 세로형은 한 달 한 장, 가로형은 11·12월 / 1·2월 (PRD F9) */
function groupsOf(o: Opts): number[][] {
  const ms = [...o.months].sort();
  if (o.orient === 'p') return ms.map((m) => [m]);
  return [ms.filter((m) => m < 2), ms.filter((m) => m >= 2)].filter((g) => g.length);
}

/** A4 인쇄 (PRD F9, DESIGN 8장) — 옵션 + 실제 크기(mm) 미리보기 + 인쇄 */
export function PrintPage() {
  const [o, setO] = useState<Opts>(loadOpts);
  const set = (p: Partial<Opts>) => setO((cur) => ({ ...cur, ...p }));
  const groups = groupsOf(o);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(o));
    } catch {
      /* 저장 못 해도 동작 */
    }
  }, [o]);

  // 용지 방향은 인쇄 화면에서만 적용 (@page)
  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = `@page { size: A4 ${o.orient === 'p' ? 'portrait' : 'landscape'}; margin: 0; }`;
    document.head.appendChild(el);
    return () => el.remove();
  }, [o.orient]);

  // 미리보기 축소 비율: 화면 폭에 맞춤
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const calc = () => {
      const w = el.clientWidth;
      const pw = PAGE_MM[o.orient][0] * MM;
      const perRow = w > 1500 ? (o.orient === 'p' ? 4 : 2) : w > 900 ? 2 : 1;
      setScale(Math.min(1, (w - 24 * (perRow - 1)) / perRow / pw));
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [o.orient]);

  const sheets = groups.length;
  return (
    <>
      <header className="topbar">
        <h1>A4 인쇄</h1>
        <span className="sub">데스크톱 크롬 기준 · 인쇄 창에서 "PDF로 저장"하면 편의점 출력도 됩니다</span>
        <span className="sp" />
        <button className="btn pri" onClick={() => window.print()} disabled={!sheets}>
          <Icon name="print" size={18} />
          <span className="bl">인쇄 ({sheets}장)</span>
        </button>
      </header>
      <div className="page">
        <div className="card print-opts">
          <div className="po-row">
            <div className="field">
              <span className="lb">형식</span>
              <div className="seg" role="group" aria-label="형식">
                <button aria-pressed={o.orient === 'p'} onClick={() => set({ orient: 'p' })}>세로형 · 한 달 한 장</button>
                <button aria-pressed={o.orient === 'l'} onClick={() => set({ orient: 'l' })}>가로형 · 두 달 한 장</button>
              </div>
            </div>
            <div className="field">
              <span className="lb">인쇄할 달</span>
              <div className="opts">
                {MONTHS.map(([, mm], i) => (
                  <label key={mm}>
                    <input type="checkbox" checked={o.months.includes(i)} onChange={(e) => set({ months: e.target.checked ? [...o.months, i] : o.months.filter((x) => x !== i) })} /> {mm}월
                  </label>
                ))}
              </div>
            </div>
            <div className="field">
              <span className="lb">옵션</span>
              <div className="opts">
                <label><input type="checkbox" checked={!o.all} onChange={(e) => set({ all: !e.target.checked })} /> 시험·면접만</label>
                <label><input type="checkbox" checked={o.showNo} onChange={(e) => set({ showNo: e.target.checked })} /> 수험 번호 표시</label>
                <label><input type="checkbox" checked={o.bw} onChange={(e) => set({ bw: e.target.checked })} /> 흑백</label>
              </div>
            </div>
          </div>
          <p className="sub print-note" style={{ margin: '10px 0 0' }}>
            Safari는 용지 방향 설정을 무시할 수 있습니다. 인쇄 창에서 방향을 <b>{o.orient === 'p' ? '세로' : '가로'}</b>로 고르고, 여백은 "없음", 배경 그래픽은 켜 주세요.
          </p>
        </div>
        <div ref={box} className="print-pages">
          {groups.length === 0 && <p className="empty">인쇄할 달을 하나 이상 고르세요.</p>}
          {groups.map((g) => {
            const [w, h] = PAGE_MM[o.orient];
            return (
              <div key={g.join('-')} className="pv-cell" style={{ width: w * MM * scale, height: h * MM * scale }}>
                <div className="pv-scale" style={{ transform: `scale(${scale})` }}>
                  <A4Page months={g} o={o} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function A4Page({ months, o }: { months: number[]; o: Opts }) {
  const f = useFamily();
  const theme = (document.documentElement.getAttribute('data-theme') ?? 'wongoji') as keyof typeof ACCENT;
  const [y] = MONTHS[months[0]];
  const title =
    months.length === 1 ? `${y}년 ${MONTHS[months[0]][1]}월` : `${y}년 ${MONTHS[months[0]][1]}~${MONTHS[months[months.length - 1]][1]}월`;
  const events = f.events.filter((e) => o.all || isTimed(e));
  const prefixes = months.map((m) => `${MONTHS[m][0]}-${String(MONTHS[m][1]).padStart(2, '0')}`);
  const inPage = (e: EventRow) => prefixes.some((p) => e.start_date.startsWith(p));

  // 범례 표: 이 장에 시험·면접이 있는 대학 (DESIGN 8장)
  const exams = f.events.filter((e) => isTimed(e) && inPage(e)).sort((a, b) => (a.start_date < b.start_date ? -1 : 1));
  const univIds = [...new Set(exams.map((e) => e.university_id))];
  const portrait = o.orient === 'p';

  return (
    <div className={'a4 ' + o.orient + (o.bw ? ' bw' : '')} style={{ ['--print-accent' as string]: o.bw ? '#111' : ACCENT[theme] }}>
      <div className="a4-h">
        <h2>2027 편입 시험 일정 · {title}</h2>
        <span className="s">인쇄 {f.today}</span>
      </div>
      <div className="a4-months">
        {months.map((m) => (
          <PrintMonth key={m} index={m} events={events} o={o} />
        ))}
      </div>
      {univIds.length > 0 && (
        <table className="a4-legend">
          <thead>
            <tr>
              <th>대학</th>
              {portrait && <th>학과</th>}
              {o.showNo && <th>수험 번호</th>}
              <th>시험·면접(입실)</th>
              {portrait && <th>장소</th>}
            </tr>
          </thead>
          <tbody>
            {univIds.map((id) => {
              const u = f.univ.get(id)!;
              const mine = exams.filter((e) => e.university_id === id);
              return (
                <tr key={id} style={{ ['--u' as string]: u.color }}>
                  <td><span className="sw" />{u.short_name} {u.name}</td>
                  {portrait && <td>{u.department}</td>}
                  {o.showNo && <td>{u.exam_number ?? ''}</td>}
                  <td>{mine.map((e) => `${EVENT_TYPES[e.event_type].symbol}${formatMD(e.start_date)} ${hhmm(e.check_in_time) ?? hhmm(e.start_time) ?? ''}`).join(', ')}</td>
                  {portrait && <td>{[...new Set(mine.map((e) => e.venue || u.venue).filter(Boolean))].join(', ')}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <div className="a4-f">
        <span>● 필기 ◆ 면접 ▲ 마감 ○ 발표 · 시각은 입실 시각</span>
        <span>편입 캘린더(TExam Calendar)</span>
      </div>
    </div>
  );
}

function PrintMonth({ index, events, o }: { index: number; events: EventRow[]; o: Opts }) {
  const f = useFamily();
  const [y, m] = MONTHS[index];
  const cells = monthMatrix(y, m);
  // 가로형은 두 달 모두 6행으로 맞춤 (DESIGN 8장)
  const rows = o.orient === 'l' ? 6 : cells.length / 7;
  const padded = [...cells, ...Array(rows * 7 - cells.length).fill(null)] as (string | null)[];
  const limit = o.orient === 'p' ? 4 : 3;
  return (
    <div className="a4-mon">
      {o.orient === 'l' && <h3>{m}월</h3>}
      <div className="a4-dow">
        {DOW.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="a4-grid" style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}>
        {padded.map((date, i) => {
          if (!date) return <div key={i} className="pc out" />;
          const dw = i % 7;
          const hol = HOLIDAYS[date];
          const evs = eventsOnDate(events, date);
          return (
            <div key={date} className={'pc' + (dw === 0 ? ' sun' : '') + (dw === 6 ? ' sat' : '') + (hol ? ' hol' : '')}>
              <span className="d">
                {Number(date.slice(8))}
                {hol && <span className="hn"> {hol}</span>}
              </span>
              {evs.slice(0, limit).map((e) => {
                const u = f.univ.get(e.university_id)!;
                const t = EVENT_TYPES[e.event_type];
                return (
                  <div key={e.id} className="pe">
                    <span className={'tag ' + (t.timed ? 'f' : 'o')} style={{ ['--u' as string]: u.color }}>
                      {t.symbol}
                      {u.short_name}
                    </span>
                    <span>{chipText(e, date)}</span>
                    {o.orient === 'p' && o.showNo && t.timed && u.exam_number && <span className="no">{u.exam_number}</span>}
                  </div>
                );
              })}
              {evs.length > limit && <div className="pe more">+{evs.length - limit}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

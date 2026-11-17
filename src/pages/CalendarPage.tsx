import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useFamily } from '../app/state';
import { HOLIDAYS, MONTHS, PRIORITY_LABEL } from '../lib/constants';
import { daysBetween, formatMD, hhmm } from '../lib/date';
import { eventName } from '../lib/labels';
import { eventsOnDate, recommendedDeparture, upcomingExams } from '../lib/schedule';
import type { DateStr } from '../lib/types';
import { Icon } from '../ui/Icon';
import { EventCard } from './calendar/EventCard';
import { EventForm } from './calendar/EventForm';
import { MonthGrid, type Filter, type ViewMode } from './calendar/MonthGrid';

const KEY_MODE = 'tcal.calMode';

function monthIndexOf(d: DateStr): number {
  const [y, m] = d.split('-').map(Number);
  const i = MONTHS.findIndex(([yy, mm]) => yy === y && mm === m);
  if (i >= 0) return i;
  return d < '2026-11-01' ? 0 : 3; // 기간 전이면 11월, 끝난 뒤면 2월 (PRD F4-6)
}

function clampDate(d: DateStr): DateStr {
  return d < '2026-11-01' ? '2026-11-01' : d > '2027-02-28' ? '2027-02-28' : d;
}

/**
 * 달력(첫 화면). 주소의 검색 값으로 상태를 둡니다.
 *  ?d=날짜(선택한 날)  &add=1(일정 추가, &u=대학)  &edit=일정ID
 */
export function CalendarPage() {
  const f = useFamily();
  const [params, setParams] = useSearchParams();
  const sel = params.get('d') ?? clampDate(f.today);
  const adding = params.get('add') === '1';
  const editId = params.get('edit');
  const editing = editId ? (f.events.find((e) => e.id === editId) ?? null) : null;
  const formOpen = adding || !!editing;

  const [mode, setModeState] = useState<ViewMode>(() => {
    try {
      const v = localStorage.getItem(KEY_MODE);
      return v === '2' || v === '4' ? v : '1';
    } catch {
      return '1';
    }
  });
  const [m, setM] = useState(() => monthIndexOf(sel));
  const [filter, setFilter] = useState<Filter>('all');
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [showUnivFilter, setShowUnivFilter] = useState(false);
  const [open, setOpen] = useState(formOpen || params.has('d'));

  // 겹쳐 열리는 패널: Esc로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function setMode(v: ViewMode) {
    setModeState(v);
    if (!formOpen) setOpen(false);
    try {
      localStorage.setItem(KEY_MODE, v);
    } catch {
      /* 저장 못 해도 동작 */
    }
  }

  // 다른 화면에서 날짜를 지정해 들어오면 그 달로 이동
  useEffect(() => {
    const i = monthIndexOf(sel);
    setM((cur) => (mode === '2' && (cur === i || cur + 1 === i) ? cur : Math.min(i, mode === '2' ? 2 : 3)));
  }, [sel, mode]);

  function setQuery(next: Record<string, string | null>) {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) v == null ? p.delete(k) : p.set(k, v);
    setParams(p, { replace: true });
  }

  function select(d: DateStr) {
    // 일정 입력 중이면 입력 날짜만 바꿈
    setQuery({ d });
    setOpen(true);
  }

  const overlay = mode !== '1';
  const shown = mode === '1' ? [m] : mode === '2' ? [Math.min(m, 2), Math.min(m, 2) + 1] : [0, 1, 2, 3];
  const title =
    mode === '4'
      ? '2026년 11월 ~ 2027년 2월'
      : shown.map((i, k) => (k === 0 || MONTHS[i][0] !== MONTHS[shown[0]][0] ? `${MONTHS[i][0]}년 ` : '') + `${MONTHS[i][1]}월`).join(' · ');

  const up = upcomingExams(f.events, f.today);
  const bad = [...f.overlapLevel.entries()].filter(([d, lv]) => d >= f.today && lv !== 'info').map(([d]) => d).sort();
  const nConflict = bad.filter((d) => f.overlapLevel.get(d) === 'conflict').length;

  return (
    <>
      <header className="topbar">
        {mode !== '4' && (
          <>
            <button className="icon-btn" aria-label="이전 달" disabled={shown[0] === 0} onClick={() => setM(Math.max(0, shown[0] - 1))}>
              <Icon name="back" />
            </button>
            <button className="icon-btn" aria-label="다음 달" disabled={shown[shown.length - 1] === 3} onClick={() => setM(shown[0] + 1)}>
              <Icon name="fwd" />
            </button>
          </>
        )}
        <h1>{title}</h1>
        <div className="seg" role="group" aria-label="달 선택">
          {MONTHS.map(([, mm], i) => (
            <button
              key={mm}
              aria-pressed={mode !== '4' && shown.includes(i)}
              onClick={() => {
                if (mode === '4') setMode('1');
                setM(i);
              }}
            >
              {mm}월
            </button>
          ))}
        </div>
        <span className="sp" />
        <div className="seg" role="group" aria-label="보기">
          {(['1', '2', '4'] as ViewMode[]).map((v) => (
            <button key={v} aria-pressed={mode === v} onClick={() => setMode(v)}>
              {v}개월
            </button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="필터">
          {([['all', '전체'], ['timed', '시험·면접'], ['due', '마감']] as [Filter, string][]).map(([v, l]) => (
            <button key={v} aria-pressed={filter === v} onClick={() => setFilter(v)}>
              {l}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative' }}>
          <button className="btn ghost sm" onClick={() => setShowUnivFilter((s) => !s)} aria-expanded={showUnivFilter}>
            <Icon name="filter" size={18} />
            대학 {f.universities.length - hidden.size}
          </button>
          {showUnivFilter && (
            <div className="card" style={{ position: 'absolute', right: 0, top: 44, zIndex: 20, width: 260, padding: 10 }}>
              <div className="checks" style={{ gridTemplateColumns: '1fr' }}>
                {f.universities.map((u) => (
                  <label key={u.id}>
                    <input
                      type="checkbox"
                      checked={!hidden.has(u.id)}
                      onChange={(e) => {
                        const n = new Set(hidden);
                        e.target.checked ? n.delete(u.id) : n.add(u.id);
                        setHidden(n);
                      }}
                    />
                    <span className="ab" style={{ ['--u' as string]: u.color, width: 22, height: 22, fontSize: 10 }}>{u.short_name.slice(0, 2)}</span>
                    {u.name}
                  </label>
                ))}
              </div>
              {hidden.size > 0 && <button className="btn sec sm block" style={{ marginTop: 8, minHeight: 36 }} onClick={() => setHidden(new Set())}>모두 보기</button>}
            </div>
          )}
        </div>
        <Link className="icon-btn" to="/print" aria-label="A4 인쇄"><Icon name="print" /></Link>
        <button className="btn pri" onClick={() => { setQuery({ add: '1', edit: null, d: sel }); setOpen(true); }}>
          <Icon name="plus" size={18} />
          일정 추가
        </button>
      </header>

      <div className={'calwrap' + (overlay ? ` ov m${mode}` : '') + (open ? ' open' : '')}>
        <div className="calmain">
          <div className="ddays">
            {up.length === 0 && <div className="dd empty">다가오는 시험·면접이 없습니다. 일정을 추가하면 D-day가 여기에 보입니다.</div>}
            {up.slice(0, 6).map((e) => {
              const u = f.univ.get(e.university_id)!;
              const n = daysBetween(f.today, e.start_date);
              const go = recommendedDeparture(e, u);
              return (
                <button key={e.id} className="dd" onClick={() => select(e.start_date)}>
                  <span className="n">{n === 0 ? 'D-DAY' : `D-${n}`}</span>
                  <span style={{ minWidth: 0 }}>
                    <span className="t1">{u.short_name} {eventName(e)}</span>
                    <span className="t2">
                      {formatMD(e.start_date)}
                      {e.check_in_time && ` 입실 ${hhmm(e.check_in_time)}`}
                      {go && ` · 출발 ${go}`}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {bad.length > 0 && (
            <Link className="alert" to="/overlap">
              <Icon name="warn" size={18} />
              겹치는 시험 {bad.length}건 (충돌 {nConflict} · 주의 {bad.length - nConflict}) · {bad.map(formatMD).join(', ')}
              <span className="sp" />
              목록 보기 ›
            </Link>
          )}
          <div className={`months m${mode}`}>
            {shown.map((i) => (
              <MonthGrid key={i} year={MONTHS[i][0]} month={MONTHS[i][1]} mode={mode} filter={filter} hidden={hidden} selected={sel} onSelect={select} />
            ))}
          </div>
          <div className="legend">
            <span>● 필기</span>
            <span>◆ 면접</span>
            <span>▲ 마감(원서·서류·등록)</span>
            <span>○ 발표</span>
            <span>채움 = 시험·면접 · 테두리 = 그 밖의 일정</span>
            <span>⚠ 빨강 충돌 · 주황 간격 주의</span>
          </div>
        </div>
        <div className="scrim" onClick={() => setOpen(false)} />
        <aside className="panel" aria-label="상세 패널">
          {formOpen ? (
            <EventForm
              key={editId ?? 'new'}
              editing={editing}
              date={sel}
              onDateChange={(d) => setQuery({ d })}
              initialUniv={params.get('u')}
              onClose={() => setQuery({ add: null, edit: null, u: null })}
            />
          ) : (
            <DayPanel
              date={sel}
              closable={overlay}
              onClose={() => setOpen(false)}
              onAdd={() => setQuery({ add: '1', edit: null })}
              onEdit={(id) => setQuery({ edit: id, add: null })}
            />
          )}
        </aside>
      </div>
    </>
  );
}

function DayPanel({ date, closable, onClose, onAdd, onEdit }: { date: DateStr; closable: boolean; onClose: () => void; onAdd: () => void; onEdit: (id: string) => void }) {
  const f = useFamily();
  const evs = eventsOnDate(f.events, date);
  const ovs = f.overlaps.filter((o) => o.date === date);
  const n = daysBetween(f.today, date);
  return (
    <>
      <div className="ph">
        <div>
          <h2>
            {formatMD(date)}
            {HOLIDAYS[date] && ` · ${HOLIDAYS[date]}`}
          </h2>
          <div className="sub">
            {n === 0 ? '오늘' : n > 0 ? `${n}일 뒤` : `${-n}일 전`} · 일정 {evs.length}개
          </div>
        </div>
        <span className="sp" />
        {closable && (
          <button className="icon-btn" onClick={onClose} aria-label="닫기"><Icon name="x" /></button>
        )}
      </div>
      <div className="pb">
        {ovs.map((o) => {
          const a = f.univ.get(o.a.university_id)!;
          const b = f.univ.get(o.b.university_id)!;
          const aEnd = hhmm(o.a.end_time);
          const bIn = hhmm(o.b.check_in_time) ?? hhmm(o.b.start_time);
          if (o.level === 'info')
            return (
              <div key={o.a.id + o.b.id} className="warnbox ok">
                같은 날 일정 2개 · {a.short_name} 종료 {aEnd ?? '-'} → {b.short_name} 입실 {bIn ?? '-'} · 간격 {o.gapMin}분
              </div>
            );
          return (
            <div key={o.a.id + o.b.id} className={'warnbox' + (o.level === 'conflict' ? ' d' : '')}>
              <Icon name="warn" size={18} />
              <span>
                {o.level === 'conflict' ? '시간 충돌: ' : '간격 주의: '}
                {o.gapMin == null
                  ? `${a.short_name}·${b.short_name} 시각이 없어 판단할 수 없음`
                  : `${a.short_name} ${eventName(o.a)} 종료 ${aEnd ?? '(시작+기본)'} → ${b.short_name} 입실 ${bIn}${o.level === 'warn' ? ` · 간격 ${o.gapMin}분(기준 ${f.family.settings.overlap_gap_min}분)` : ''}`}
                <br />
                우선순위: {a.short_name} {a.priority ? PRIORITY_LABEL[a.priority] : '-'} / {b.short_name} {b.priority ? PRIORITY_LABEL[b.priority] : '-'}
              </span>
            </div>
          );
        })}
        {evs.length === 0 && (
          <p className="empty">
            이 날짜에는 일정이 없습니다.
            <br />
            아래 버튼으로 바로 추가할 수 있습니다.
          </p>
        )}
        {evs.map((e) => (
          <EventCard key={e.id} e={e} date={date} onEdit={() => onEdit(e.id)} />
        ))}
      </div>
      <div className="pf">
        <button className="btn pri block" onClick={onAdd}>
          <Icon name="plus" size={18} />
          이 날짜에 일정 추가
        </button>
      </div>
    </>
  );
}

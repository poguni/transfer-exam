import { useFamily } from '../../app/state';
import { DOW, EVENT_TYPES, HOLIDAYS } from '../../lib/constants';
import { monthMatrix } from '../../lib/date';
import { chipText } from '../../lib/labels';
import { eventsOnDate, isDeadline, isTimed } from '../../lib/schedule';
import type { DateStr, EventRow } from '../../lib/types';
import { Icon } from '../../ui/Icon';
import { useMobile } from '../../ui/useMobile';

export type ViewMode = '1' | '2' | '4';
export type Filter = 'all' | 'timed' | 'due';

export function passFilter(e: EventRow, f: Filter): boolean {
  return f === 'all' || (f === 'timed' && isTimed(e)) || (f === 'due' && isDeadline(e));
}

interface Props {
  year: number;
  month: number;
  mode: ViewMode;
  filter: Filter;
  hidden: Set<string>;
  selected: DateStr | null;
  onSelect: (d: DateStr) => void;
}

/** 한 달 달력. 칸 크기는 화면에 맞춰 늘어나고, 행 수(5·6주)가 달라도 한 화면에 들어갑니다. */
export function MonthGrid({ year, month, mode, filter, hidden, selected, onSelect }: Props) {
  const f = useFamily();
  const cells = monthMatrix(year, month);
  const weeks = cells.length / 7;
  const visible = f.events.filter((e) => !hidden.has(e.university_id));
  const inMonth = visible.filter((e) => e.start_date.startsWith(`${year}-${String(month).padStart(2, '0')}`));
  const sum = `시험·면접 ${inMonth.filter(isTimed).length} · 마감 ${inMonth.filter(isDeadline).length} · 발표 ${inMonth.filter((e) => EVENT_TYPES[e.event_type].symbol === '○').length}`;
  const mobile = useMobile();
  // 칸 하나에 칩 최대 개수 (모바일은 DESIGN 4.2대로 3개, 공휴일 칸은 아래에서 1개 줄임)
  const limit = mobile ? 3 : mode === '1' ? 4 : mode === '2' ? 3 : 2;

  return (
    <section className="month" aria-label={`${year}년 ${month}월`}>
      <div className="mhead">
        {mode !== '1' && <h3>{month}월</h3>}
        <span className="s">
          {year}년 {month}월 · {sum}
        </span>
      </div>
      <div className="dow">
        {DOW.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid" style={{ ['--weeks' as string]: weeks, ['--cell-h' as string]: weeks === 6 ? '66px' : '78px' }}>
        {cells.map((date, i) => {
          if (!date) return <div key={i} className="cell out" aria-hidden="true" />;
          const all = eventsOnDate(visible, date);
          const shown = all.filter((e) => passFilter(e, filter));
          const hol = HOLIDAYS[date];
          const lim = hol ? limit - 1 : limit;
          const lv = f.overlapLevel.get(date);
          const warn = lv === 'conflict' || lv === 'warn' ? lv : null;
          const dw = i % 7;
          const cls =
            'cell' +
            (dw === 0 ? ' sun' : '') +
            (dw === 6 ? ' sat' : '') +
            (hol ? ' hol' : '') +
            (date === f.today ? ' today' : '') +
            (date === selected ? ' sel' : '');
          const day = Number(date.slice(8));
          return (
            <button
              key={date}
              type="button"
              className={cls}
              onClick={() => onSelect(date)}
              aria-pressed={date === selected}
              aria-label={`${month}월 ${day}일, 일정 ${all.length}개${warn === 'conflict' ? ', 시간 충돌' : warn === 'warn' ? ', 간격 주의' : ''}`}
            >
              <span className="dl">
                <span className="d">{day}</span>
                {hol && <span className="hn">{hol}</span>}
              </span>
              {warn && (
                <span className={'wi' + (warn === 'warn' ? ' w2' : '')}>
                  <Icon name="warn" size={mode === '4' ? 13 : 16} />
                </span>
              )}
              {shown.slice(0, lim).map((e) => (
                <Chip key={e.id} e={e} date={date} />
              ))}
              {shown.length > lim && <span className="more">+{shown.length - lim}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Chip({ e, date }: { e: EventRow; date: DateStr }) {
  const f = useFamily();
  const u = f.univ.get(e.university_id);
  const t = EVENT_TYPES[e.event_type];
  return (
    <span className={'chip ' + (t.timed ? 'fill' : 'line')} style={{ ['--u' as string]: u?.color }}>
      <span className="s">{t.symbol}</span>
      {u?.short_name}
      <span className="x">{chipText(e, date)}</span>
    </span>
  );
}

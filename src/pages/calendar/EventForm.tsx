import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useFamily } from '../../app/state';
import { EVENT_TYPES, PERIOD_END, PERIOD_START, PRIORITY_LABEL } from '../../lib/constants';
import { formatMD, fromMinutes, hhmm, isInPeriod, toMinutes } from '../../lib/date';
import { deleteEvent, saveEvent, type EventInput } from '../../lib/db';
import { eventName } from '../../lib/labels';
import { classifyPair } from '../../lib/overlap';
import type { DateStr, EventRow, EventType } from '../../lib/types';
import { Icon } from '../../ui/Icon';
import { useToast } from '../../ui/toast';

interface Props {
  editing: EventRow | null;
  /** 시작 날짜는 달력 선택과 같은 값(달력을 누르면 바뀜) */
  date: DateStr;
  onDateChange: (d: DateStr) => void;
  initialUniv: string | null;
  onClose: () => void;
}

const TYPE_ORDER: EventType[] = ['exam', 'interview', 'apply', 'doc_deadline', 'payment', 'venue_notice', 'first_result', 'final_result', 'extra_result', 'other'];

/** 일정 입력 (PRD F3) — 오른쪽 패널에서 달력을 보면서 입력 */
export function EventForm({ editing, date, onDateChange, initialUniv, onClose }: Props) {
  const f = useFamily();
  const toast = useToast();
  const nav = useNavigate();
  const [u, setU] = useState(editing?.university_id ?? initialUniv ?? f.universities[0]?.id ?? '');
  const [type, setType] = useState<EventType>(editing?.event_type ?? 'exam');
  const [end, setEnd] = useState(editing?.end_date ?? '');
  const [ci, setCi] = useState(hhmm(editing?.check_in_time) ?? '');
  const [st, setSt] = useState(hhmm(editing?.start_time) ?? '');
  const [et, setEt] = useState(hhmm(editing?.end_time) ?? '');
  const [venue, setVenue] = useState(editing?.venue ?? '');
  const [round, setRound] = useState(editing?.round_no ? String(editing.round_no) : '');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [memo, setMemo] = useState(editing?.memo ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const spec = EVENT_TYPES[type];
  const univ = f.univ.get(u);

  // 저장할 값 (빈 칸은 null)
  const input: EventInput = useMemo(() => {
    const n = (s: string) => (s.trim() ? s.trim() : null);
    return {
      university_id: u,
      event_type: type,
      title: type === 'other' ? n(title) : null,
      start_date: date,
      end_date: spec.period ? n(end) : null,
      check_in_time: spec.timed ? n(ci) : null,
      start_time: n(st),
      end_time: spec.timed || spec.period ? n(et) : null,
      venue: spec.timed ? n(venue) : null,
      map_url: editing?.map_url ?? null,
      round_no: type === 'extra_result' && round ? Number(round) : null,
      memo: n(memo),
    };
  }, [u, type, title, date, end, ci, st, et, venue, round, memo, spec, editing]);

  // 같은 날 다른 시험·면접과 겹침 미리 보기 (PRD F3-5: 경고하지만 저장은 가능)
  const preview = useMemo(() => {
    if (!spec.timed) return [];
    const me = { ...input, id: editing?.id ?? '__new__', family_id: f.family.id } as EventRow;
    return f.events
      .filter((e) => e.start_date === date && e.id !== me.id && EVENT_TYPES[e.event_type].timed)
      .map((o) => classifyPair(me, o, f.family.settings));
  }, [input, spec.timed, f.events, date, editing, f.family]);

  const go = (() => {
    const t = toMinutes(input.check_in_time) ?? toMinutes(input.start_time);
    if (t == null || !univ || univ.travel_min == null) return null;
    return { at: fromMinutes(Math.max(0, t - univ.travel_min - univ.buffer_min)), from: hhmm(input.check_in_time) ?? hhmm(input.start_time) };
  })();

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    setError('');
    if (!u) return setError('대학을 먼저 고르세요.');
    if (!isInPeriod(date)) return setError(`${PERIOD_START} ~ ${PERIOD_END} 사이 날짜만 저장할 수 있습니다.`);
    if (input.end_date && (input.end_date < date || !isInPeriod(input.end_date))) return setError('종료 날짜는 시작 날짜 이후, 2월 28일 이전이어야 합니다.');
    const s = toMinutes(input.start_time);
    const e2 = toMinutes(input.end_time);
    if (spec.timed && s != null && e2 != null && e2 <= s) return setError('종료 시각은 시작 시각보다 늦어야 합니다.');
    const c = toMinutes(input.check_in_time);
    if (spec.timed && c != null && s != null && c > s) return setError('입실 시각은 시작 시각보다 이르거나 같아야 합니다.');
    setBusy(true);
    try {
      await saveEvent(f.family.id, editing?.id ?? null, input);
      await f.refresh();
      // 입력 실수 확인용 문구 (PRD 12장: 24시간 표기)
      const when = input.check_in_time ? ` ${hhmm(input.check_in_time)} 입실` : input.end_time ? ` ${hhmm(input.end_time)} 마감` : '';
      toast(`${formatMD(date)}${when} · ${univ?.short_name} ${eventName(input)} 저장`);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!editing) return;
    if (!window.confirm(`${univ?.short_name} ${eventName(editing)} (${formatMD(editing.start_date)}) 일정을 삭제할까요?`)) return;
    setBusy(true);
    try {
      await deleteEvent(editing.id);
      await f.refresh();
      toast('일정을 삭제했습니다');
      onClose();
    } finally {
      setBusy(false);
    }
  }

  if (!f.universities.length) {
    return (
      <>
        <div className="ph">
          <button className="icon-btn" onClick={onClose} aria-label="닫기"><Icon name="back" /></button>
          <h2>일정 추가</h2>
        </div>
        <div className="pb">
          <p className="empty">먼저 지원할 대학을 등록해 주세요.<br />일정은 대학마다 여러 개를 추가합니다.</p>
          <Link className="btn pri" to="/univs/new">대학 등록</Link>
        </div>
      </>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: 'contents' }}>
      <div className="ph">
        <button type="button" className="icon-btn" onClick={onClose} aria-label="취소"><Icon name="back" /></button>
        <div>
          <h2>{editing ? '일정 수정' : '일정 추가'}</h2>
          <div className="sub">달력에서 날짜를 누르면 날짜가 바뀝니다</div>
        </div>
        <span className="sp" />
        {editing && (
          <button type="button" className="icon-btn" onClick={remove} aria-label="일정 삭제" title="삭제" disabled={busy} style={{ color: 'var(--danger)' }}>
            <Icon name="trash" />
          </button>
        )}
      </div>
      <div className="pb">
        <div className="field">
          <label htmlFor="ef-u">대학</label>
          <select id="ef-u" value={u} onChange={(e) => (e.target.value === '__new' ? nav('/univs/new') : setU(e.target.value))}>
            {f.universities.map((x) => (
              <option key={x.id} value={x.id}>
                {x.short_name} · {x.name} {x.department}
              </option>
            ))}
            <option value="__new">+ 새 대학 등록</option>
          </select>
        </div>
        <div className="field">
          <span className="lb" id="ef-type">일정 종류</span>
          <div className="opts" role="radiogroup" aria-labelledby="ef-type">
            {TYPE_ORDER.map((tp) => (
              <label key={tp}>
                <input type="radio" name="ef-type" checked={type === tp} onChange={() => setType(tp)} /> {EVENT_TYPES[tp].symbol} {EVENT_TYPES[tp].label}
              </label>
            ))}
          </div>
        </div>
        {type === 'other' && (
          <div className="field">
            <label htmlFor="ef-title">일정 이름</label>
            <input id="ef-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 모집요강 발표" />
          </div>
        )}

        {spec.period ? (
          <>
            <div className="two">
              <div className="field">
                <label htmlFor="ef-d">시작 날짜</label>
                <input id="ef-d" type="date" required value={date} min={PERIOD_START} max={PERIOD_END} onChange={(e) => e.target.value && onDateChange(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="ef-e">종료(마감) 날짜</label>
                <input id="ef-e" type="date" value={end} min={date} max={PERIOD_END} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>
            <div className="two">
              <div className="field">
                <label htmlFor="ef-et">마감 시각</label>
                <input id="ef-et" type="time" value={et} onChange={(e) => setEt(e.target.value)} />
              </div>
              <div />
            </div>
          </>
        ) : (
          <div className="two">
            <div className="field">
              <label htmlFor="ef-d">날짜</label>
              <input id="ef-d" type="date" required value={date} min={PERIOD_START} max={PERIOD_END} onChange={(e) => e.target.value && onDateChange(e.target.value)} />
            </div>
            {spec.timed ? (
              <div className="field">
                <label htmlFor="ef-ci">입실 시각</label>
                <input id="ef-ci" type="time" value={ci} onChange={(e) => setCi(e.target.value)} />
              </div>
            ) : (
              <div className="field">
                <label htmlFor="ef-st">발표 시각</label>
                <input id="ef-st" type="time" value={st} onChange={(e) => setSt(e.target.value)} />
              </div>
            )}
          </div>
        )}

        {spec.timed && (
          <>
            <div className="two">
              <div className="field">
                <label htmlFor="ef-st">시작 시각</label>
                <input id="ef-st" type="time" value={st} onChange={(e) => setSt(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="ef-et2">종료 시각</label>
                <input id="ef-et2" type="time" value={et} onChange={(e) => setEt(e.target.value)} />
                {!et && st && <span className="hint">비우면 시작 + {f.family.settings.default_exam_min}분으로 계산</span>}
              </div>
            </div>
            <div className="field">
              <label htmlFor="ef-v">장소(대학 기본 장소와 다를 때)</label>
              <input id="ef-v" type="text" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder={univ?.venue || '대학 기본 장소'} />
            </div>
          </>
        )}
        {type === 'extra_result' && (
          <div className="two">
            <div className="field">
              <label htmlFor="ef-r">차수</label>
              <input id="ef-r" type="number" inputMode="numeric" min={1} value={round} onChange={(e) => setRound(e.target.value)} />
            </div>
            <div />
          </div>
        )}
        <div className="field">
          <label htmlFor="ef-m">메모</label>
          <input id="ef-m" type="text" value={memo} onChange={(e) => setMemo(e.target.value)} />
        </div>

        {spec.timed && go && (
          <div className="calc">
            권장 출발 {go.at} · 입실 {go.from} − 소요 {univ!.travel_min}분 − 여유 {univ!.buffer_min}분
          </div>
        )}
        {spec.timed && univ && univ.travel_min == null && (input.check_in_time || input.start_time) && (
          <div className="warnbox ok">
            권장 출발 시각을 계산하려면 대학 정보 F(장소와 교통)에 예상 소요 시간을 넣어 주세요.
          </div>
        )}
        {spec.timed &&
          preview.map((o) => {
            const other = o.a.id === (editing?.id ?? '__new__') ? o.b : o.a;
            const ou = f.univ.get(other.university_id);
            const cls = o.level === 'conflict' ? ' d' : o.level === 'info' ? ' ok' : '';
            const lead = o.level === 'conflict' ? '시간 충돌' : o.level === 'warn' ? '간격 주의' : '겹치지 않음';
            return (
              <div key={other.id} className={'warnbox' + cls}>
                {o.level !== 'info' && <Icon name="warn" size={18} />}
                <span>
                  {lead} · 같은 날 {ou?.short_name} {eventName(other)} 입실 {hhmm(other.check_in_time) ?? hhmm(other.start_time) ?? '미정'}
                  {o.gapMin != null ? ` · 간격 ${o.gapMin}분(기준 ${f.family.settings.overlap_gap_min}분)` : ' · 시각이 없어 판단할 수 없음'}
                  {o.level !== 'info' && ou && univ && (
                    <>
                      <br />
                      우선순위: {univ.short_name} {univ.priority ? PRIORITY_LABEL[univ.priority] : '-'} / {ou.short_name}{' '}
                      {ou.priority ? PRIORITY_LABEL[ou.priority] : '-'} · 경고가 있어도 저장할 수 있습니다.
                    </>
                  )}
                </span>
              </div>
            );
          })}
        {error && <div className="warnbox d" role="alert">{error}</div>}
      </div>
      <div className="pf">
        <button type="button" className="btn sec" onClick={onClose}>취소</button>
        <button className="btn pri" disabled={busy}>{busy ? '저장 중…' : '저장'}</button>
      </div>
    </form>
  );
}

import { Link } from 'react-router';
import { useFamily } from '../../app/state';
import { AGENCY_LABEL, DOC_STATUS_LABEL, DOC_TYPE_LABEL, EVENT_TYPES } from '../../lib/constants';
import { formatMD, hhmm } from '../../lib/date';
import { copyText, mapLink, saveFile } from '../../lib/browser';
import { setChecked } from '../../lib/db';
import { buildIcs, icsFileName } from '../../lib/ics';
import { eventName } from '../../lib/labels';
import { dday, isDeadline, isTimed, recommendedDeparture } from '../../lib/schedule';
import type { DateStr, EventRow } from '../../lib/types';
import { Icon } from '../../ui/Icon';
import { useToast } from '../../ui/toast';

/** 날짜 상세의 일정 카드 (DESIGN 6장 "일정 카드") */
export function EventCard({ e, date, onEdit }: { e: EventRow; date: DateStr; onEdit: () => void }) {
  const f = useFamily();
  const toast = useToast();
  const u = f.univ.get(e.university_id)!;
  const t = EVENT_TYPES[e.event_type];
  const isEnd = e.end_date === date;
  const target = isEnd ? e.end_date! : e.start_date;
  const dd = dday(target, f.today);
  const venue = e.venue || u.venue;
  const map = mapLink(e.map_url || u.map_url, venue);
  const items = f.checklist.filter((c) => c.university_id === u.id);
  const docs = f.documents.filter((d) => d.university_id === u.id);

  async function copyNo() {
    if (u.exam_number && (await copyText(u.exam_number))) toast('수험 번호를 복사했습니다');
  }
  async function toggle(id: string, checked: boolean) {
    await setChecked([id], checked);
    await f.refresh();
  }
  async function exportOne() {
    const ics = buildIcs([{ event: e, university: u, checklist: items.map((i) => i.label) }], { settings: f.family.settings });
    await saveFile(icsFileName(`${u.short_name}_${eventName(e)}`), ics, 'text/calendar;charset=utf-8');
  }

  return (
    <article className="card" style={{ ['--u' as string]: u.color }}>
      <div className="bar" />
      <div className="card-top">
        <span className="badge">
          {t.symbol} {u.short_name} · {eventName(e)}
        </span>
        <span className="badge dd">
          {isDeadline(e) && dd.days >= 0 ? '마감 ' : ''}
          {dd.label}
        </span>
      </div>
      <h3>
        {u.name} {u.department}
      </h3>

      {isTimed(e) ? (
        <>
          <div className="bigtime">
            <div>
              <div className="k">입실</div>
              <div className="v">{hhmm(e.check_in_time) ?? '—'}</div>
            </div>
            <div>
              <div className="k">시작~종료</div>
              <div className="v s">
                {hhmm(e.start_time) ?? '—'}–{hhmm(e.end_time) ?? '—'}
              </div>
            </div>
            <div className="go">
              <div className="k">권장 출발</div>
              <div className="v">{recommendedDeparture(e, u) ?? '—'}</div>
            </div>
          </div>
          <div className="rows">
            <div className="row">
              <span className="k">수험 번호</span>
              <span className="v num">{u.exam_number || '미입력'}</span>
              {u.exam_number ? (
                <button className="mini" onClick={copyNo}>복사</button>
              ) : (
                <Link className="mini" to={`/univs/${u.id}/edit#sec-D`}>입력</Link>
              )}
            </div>
            <div className="row">
              <span className="k">장소</span>
              <span className="v">{venue || '미입력'}</span>
              {map ? <a className="mini" href={map} target="_blank" rel="noreferrer">지도</a> : <span />}
            </div>
            <div className="row">
              <span className="k">교통</span>
              <span className="v">
                {u.transit || '미입력'}
                {u.travel_min != null && (
                  <>
                    <br />
                    <span className="sub">
                      소요 {u.travel_min}분 + 여유 {u.buffer_min}분
                    </span>
                  </>
                )}
              </span>
              <span />
            </div>
            <div className="row">
              <span className="k">접수처</span>
              <span className="v">{u.apply_agency ? AGENCY_LABEL[u.apply_agency] : '미입력'}</span>
              {u.admission_phone ? <a className="mini" href={`tel:${u.admission_phone}`}>전화</a> : <span />}
            </div>
          </div>
          {items.length > 0 && (
            <>
              <div className="sec-t">준비물</div>
              <div className="checks">
                {items.map((c) => (
                  <label key={c.id}>
                    <input type="checkbox" checked={c.checked} onChange={(ev) => toggle(c.id, ev.target.checked)} /> {c.label}
                  </label>
                ))}
              </div>
            </>
          )}
          {u.prohibited_items && <p className="sub" style={{ margin: '8px 0 0' }}>반입 금지: {u.prohibited_items}</p>}
        </>
      ) : (
        <>
          <p className="sub" style={{ margin: '6px 0 0' }}>
            {e.end_date ? `${formatMD(e.start_date)} ~ ${formatMD(e.end_date)}` : formatMD(e.start_date)}
            {e.end_time && ` · 마감 ${hhmm(e.end_time)}`}
            {e.start_time && ` · ${hhmm(e.start_time)}`}
          </p>
          {e.event_type === 'doc_deadline' && docs.length > 0 && (
            <div className="rows" style={{ marginTop: 8 }}>
              {docs.map((d) => (
                <div className="row" key={d.id}>
                  <span className="k">{d.custom_name || DOC_TYPE_LABEL[d.doc_type]}</span>
                  <span className="v">
                    <span className={'pill' + (d.status === 'submitted' ? ' ok' : '')}>{DOC_STATUS_LABEL[d.status]}</span>
                  </span>
                  <span />
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {e.memo && <p className="sub" style={{ margin: '8px 0 0' }}>메모: {e.memo}</p>}

      <div className="actions">
        <button className="btn sec" onClick={onEdit}>
          <Icon name="edit" size={16} />
          수정
        </button>
        <Link className="btn sec" to={`/univs/${u.id}`}>대학 상세</Link>
        <button className="btn sec" onClick={exportOne}>캘린더에 추가</button>
      </div>
    </article>
  );
}

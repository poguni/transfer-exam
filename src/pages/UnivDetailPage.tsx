import type { ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useFamily } from '../app/state';
import { AGENCY_LABEL, DOC_STATUS_LABEL, DOC_TYPE_LABEL, EVENT_TYPES, EXAM_TYPE_LABEL, PRIORITY_LABEL, RESULT_LABEL, SUBMIT_METHOD_LABEL } from '../lib/constants';
import { formatMD, hhmm } from '../lib/date';
import { copyText, mapLink } from '../lib/browser';
import { setChecked, setDocStatus } from '../lib/db';
import { eventName } from '../lib/labels';
import { dday, dueDate, isTimed, recommendedDeparture } from '../lib/schedule';
import type { DocStatus } from '../lib/types';
import { Icon } from '../ui/Icon';
import { useToast } from '../ui/toast';

/** 대학 상세 (PRD F5-5) — 정보 | 일정 | 서류·준비물·결과 3열 */
export function UnivDetailPage() {
  const f = useFamily();
  const toast = useToast();
  const nav = useNavigate();
  const { id } = useParams();
  const u = id ? f.univ.get(id) : undefined;
  if (!u) return <p className="empty">대학을 찾을 수 없습니다.</p>;

  const evs = f.events.filter((e) => e.university_id === u.id).sort((a, b) => (a.start_date < b.start_date ? -1 : 1));
  const docs = f.documents.filter((d) => d.university_id === u.id);
  const items = f.checklist.filter((c) => c.university_id === u.id);
  const map = mapLink(u.map_url, u.venue);

  async function docStatus(docId: string, st: DocStatus) {
    await setDocStatus(docId, st);
    await f.refresh();
  }
  async function check(ids: string[], v: boolean) {
    await setChecked(ids, v);
    await f.refresh();
  }

  const rows: [string, ReactNode, ReactNode?][] = [
    ['수험 번호', <span className="num">{u.exam_number || '미입력'}</span>, u.exam_number ? <button className="mini" onClick={async () => (await copyText(u.exam_number!)) && toast('수험 번호를 복사했습니다')}>복사</button> : null],
    ['접수 번호', u.receipt_number || '-'],
    ['접수처', u.apply_agency ? AGENCY_LABEL[u.apply_agency] : '미입력'],
    ['전형료', u.application_fee != null ? `${u.application_fee.toLocaleString('ko-KR')}원` : '미입력', <span className={'pill' + (u.fee_paid ? ' ok' : ' bad')}>{u.fee_paid ? '결제 완료' : '미결제'}</span>],
    ['수험표', u.ticket_printed ? '출력 완료' : '미출력'],
    ['장소', u.venue || '미입력', map ? <a className="mini" href={map} target="_blank" rel="noreferrer">지도</a> : null],
    ['교통', <>{u.transit || '미입력'}{u.travel_min != null && <><br /><span className="sub">소요 {u.travel_min}분 + 여유 {u.buffer_min}분</span></>}</>],
    ['입학처', u.admission_phone || '미입력', u.admission_phone ? <a className="mini" href={`tel:${u.admission_phone}`}>전화</a> : null],
    ['링크', <>{u.guide_url ? <a href={u.guide_url} target="_blank" rel="noreferrer">모집요강</a> : '모집요강 미입력'}{u.homepage_url && <> · <a href={u.homepage_url} target="_blank" rel="noreferrer">입학처 홈페이지</a></>}</>],
    ['전형', <>{u.exam_types.map((t) => EXAM_TYPE_LABEL[t]).join(' + ')}{u.stage_type && ` · ${u.stage_type === 'one' ? '1단계만' : '1·2단계'}`}{u.exam_format && <><br /><span className="sub">{u.exam_format}</span></>}</>],
    ['반영 비율', u.score_ratio || '-'],
    ['모집·경쟁률', `${u.quota != null ? `${u.quota}명` : '-'} · ${u.competition_rate != null ? `${u.competition_rate} : 1` : '-'}`],
  ];

  return (
    <>
      <header className="topbar" style={{ ['--u' as string]: u.color }}>
        <button className="icon-btn" onClick={() => nav('/univs')} aria-label="지원 현황으로"><Icon name="back" /></button>
        <span className="ab lg">{u.short_name}</span>
        <div>
          <h1>{u.name} <span className="hide-m">{u.department}</span>{u.is_sample && <span className="pill warn" style={{ marginLeft: 8, verticalAlign: 'middle' }}>테스트</span>}</h1>
          <span className="sub">
            {u.priority ? PRIORITY_LABEL[u.priority] : '우선순위 미정'} · 결과 {RESULT_LABEL[u.result_status]}
            {u.result_status === 'waitlist' && u.waitlist_no ? ` ${u.waitlist_no}번` : ''}
          </span>
        </div>
        <span className="sp" />
        <Link className="btn ghost" to={`/univs/${u.id}/edit`} aria-label="정보 수정"><Icon name="edit" size={18} /><span className="bl">정보 수정</span></Link>
        <Link className="btn pri" to={`/?add=1&u=${u.id}&d=${evs.find((e) => e.start_date >= f.today)?.start_date ?? (f.today < '2026-11-01' ? '2026-11-01' : f.today > '2027-02-28' ? '2027-02-28' : f.today)}`}>
          <Icon name="plus" size={18} /><span className="bl">일정 추가</span>
        </Link>
      </header>
      <div className="page" style={{ ['--u' as string]: u.color }}>
        <div className="cols c3">
          <div className="card">
            <div className="bar" />
            <h4>수험 정보 · 장소와 교통 · 전형</h4>
            <div className="rows">
              {rows.map(([k, val, act]) => (
                <div className="row" key={k}>
                  <span className="k">{k}</span>
                  <span className="v">{val}</span>
                  {act ?? <span />}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h4>일정 · 시간순 <span className="sp" /><span className="pill">{evs.length}개</span></h4>
            {evs.length === 0 && <p className="empty">등록된 일정이 없습니다. [일정 추가]로 넣어 주세요.</p>}
            {evs.map((e) => {
              const t = EVENT_TYPES[e.event_type];
              const due = dueDate(e);
              const dd = dday(due, f.today);
              const go = recommendedDeparture(e, u);
              return (
                <Link className="li" key={e.id} to={`/?d=${e.start_date}`}>
                  <span className={'ab' + (isTimed(e) ? '' : ' soft')}>{t.symbol}</span>
                  <span>
                    <span className="n">{eventName(e)}</span>
                    <br />
                    <span className="m">
                      {formatMD(e.start_date)}
                      {e.end_date && ` ~ ${formatMD(e.end_date)}`}
                      {e.check_in_time && ` · 입실 ${hhmm(e.check_in_time)}`}
                      {go && ` · 출발 ${go}`}
                      {!isTimed(e) && e.end_time && ` · 마감 ${hhmm(e.end_time)}`}
                      {!isTimed(e) && e.start_time && ` · ${hhmm(e.start_time)}`}
                    </span>
                  </span>
                  <span className={'pill' + (dd.days >= 0 && dd.days <= 7 ? ' warn' : '')}>{dd.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="stack">
            <div className="card">
              <h4>준비 서류</h4>
              {docs.length === 0 && <p className="sub" style={{ margin: 0 }}>등록된 서류가 없습니다. 정보 수정 › E에서 고릅니다.</p>}
              {docs.map((d) => (
                <div className="row" key={d.id} style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
                  <span>
                    {d.custom_name || DOC_TYPE_LABEL[d.doc_type]}
                    <br />
                    <span className="sub">
                      {d.submit_method ? SUBMIT_METHOD_LABEL[d.submit_method] : '제출 방법 미정'}
                      {d.original_required && ' · 원본 대조'}
                    </span>
                  </span>
                  <span className="st3" role="group" aria-label={`${DOC_TYPE_LABEL[d.doc_type]} 진행 상태`}>
                    {(['todo', 'ready', 'submitted'] as DocStatus[]).map((st, i) => (
                      <button key={st} className={'s' + i} aria-pressed={d.status === st} title={DOC_STATUS_LABEL[st]} onClick={() => docStatus(d.id, st)}>
                        {['준비 중', '완료', '제출'][i]}
                      </button>
                    ))}
                  </span>
                </div>
              ))}
            </div>
            <div className="card">
              <h4>
                시험 당일 준비물 <span className="sp" />
                {items.some((i) => i.checked) && <button className="mini" onClick={() => check(items.map((i) => i.id), false)}>체크 초기화</button>}
              </h4>
              <div className="checks">
                {items.map((c) => (
                  <label key={c.id}>
                    <input type="checkbox" checked={c.checked} onChange={(e) => check([c.id], e.target.checked)} /> {c.label}
                  </label>
                ))}
              </div>
              {u.prohibited_items && <p className="sub" style={{ margin: '8px 0 0' }}>반입 금지: {u.prohibited_items}</p>}
            </div>
            <div className="card">
              <h4>결과와 메모</h4>
              <div className="rows">
                <div className="row"><span className="k">결과</span><span className="v"><span className={'pill' + (u.result_status === 'first_pass' || u.result_status === 'final_pass' ? ' ok' : '')}>{RESULT_LABEL[u.result_status]}</span></span><span /></div>
                <div className="row"><span className="k">후기</span><span className="v sub">{u.review_memo || '-'}</span><span /></div>
                <div className="row"><span className="k">메모</span><span className="v sub">{u.memo || '-'}</span><span /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

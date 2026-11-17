import { useState } from 'react';
import { Link } from 'react-router';
import { useFamily } from '../app/state';
import { DOC_STATUS_LABEL, DOC_TYPE_LABEL, SUBMIT_METHOD_LABEL } from '../lib/constants';
import { formatMD, hhmm } from '../lib/date';
import { setChecked, setDocStatus } from '../lib/db';
import { eventName } from '../lib/labels';
import { dday, docDeadlineOf, dueDate, upcomingExams } from '../lib/schedule';
import type { DocStatus, DocumentRow } from '../lib/types';
import { useToast } from '../ui/toast';

const STATUSES: DocStatus[] = ['todo', 'ready', 'submitted'];

/** 서류·준비물 (PRD F10) — 미제출 서류를 마감 순으로, 다음 시험 준비물 체크 */
export function DocsPage() {
  const f = useFamily();
  const toast = useToast();
  const [showDone, setShowDone] = useState(false);

  const rows = f.documents
    .map((d) => {
      const dl = docDeadlineOf(f.events, d.university_id, f.today);
      return { d, u: f.univ.get(d.university_id)!, due: dl ? dueDate(dl) : null, dueTime: dl ? hhmm(dl.end_time) : null };
    })
    .filter((r) => r.u && (showDone || r.d.status !== 'submitted'))
    .sort((a, b) => (a.due ?? '9999') .localeCompare(b.due ?? '9999') || a.u.short_name.localeCompare(b.u.short_name));
  const notDone = f.documents.filter((d) => d.status !== 'submitted').length;

  const up = upcomingExams(f.events, f.today);
  const next = up[0];
  const nu = next ? f.univ.get(next.university_id) : undefined;
  const nextItems = nu ? f.checklist.filter((c) => c.university_id === nu.id) : [];

  async function status(d: DocumentRow, st: DocStatus) {
    await setDocStatus(d.id, st);
    await f.refresh();
  }
  async function check(ids: string[], v: boolean) {
    await setChecked(ids, v);
    await f.refresh();
  }

  const st3 = (d: DocumentRow) => (
    <span className="st3" role="group" aria-label={`${DOC_TYPE_LABEL[d.doc_type]} 진행 상태`}>
      {STATUSES.map((s, i) => (
        <button key={s} className={'s' + i} aria-pressed={d.status === s} title={DOC_STATUS_LABEL[s]} onClick={() => status(d, s)}>
          {['준비 중', '완료', '제출'][i]}
        </button>
      ))}
    </span>
  );
  const dueLabel = (due: string | null, d: DocumentRow) => {
    if (d.status === 'submitted') return <span className="pill ok">제출 완료</span>;
    if (!due) return <span className="pill">마감 미등록</span>;
    const dd = dday(due, f.today);
    return <span className={'pill' + (dd.days < 0 ? '' : dd.days <= 7 ? ' bad' : '')}>{dd.days < 0 ? '마감 지남' : `마감 ${dd.label}`}</span>;
  };

  return (
    <>
      <header className="topbar">
        <h1>서류·준비물</h1>
        <span className="sub">미제출 {notDone}건</span>
        <span className="sp" />
        <label className="btn ghost sm" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> 제출 완료도 보기
        </label>
      </header>
      <div className="page">
        <div className="cols c2">
          <div className="stack">
            {rows.length === 0 && (
              <div className="card empty">
                {f.documents.length === 0 ? '등록된 서류가 없습니다. 대학 정보 수정 › E. 준비 서류에서 고릅니다.' : '모든 서류를 제출했습니다.'}
              </div>
            )}
            {rows.length > 0 && (
              <>
                <div className="tblwrap d-only">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>대학</th>
                        <th>서류</th>
                        <th>진행 상태</th>
                        <th>제출 방법</th>
                        <th>마감</th>
                        <th>D-day</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(({ d, u, due, dueTime }) => (
                        <tr key={d.id} style={{ ['--u' as string]: u.color }}>
                          <td>
                            <Link className="uc" to={`/univs/${u.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                              <span className="ab">{u.short_name}</span>
                              <span className="n">{u.name}</span>
                            </Link>
                          </td>
                          <td>
                            {d.custom_name || DOC_TYPE_LABEL[d.doc_type]}
                            {d.original_required && <span className="muted"> · 원본 대조</span>}
                          </td>
                          <td>{st3(d)}</td>
                          <td>
                            {d.submit_method ? SUBMIT_METHOD_LABEL[d.submit_method] : <span className="muted">-</span>}
                            {d.submit_method === 'mail' && d.mail_basis && <span className="muted"> ({d.mail_basis === 'postmark' ? '소인' : '도착'} 기준)</span>}
                          </td>
                          <td>{due ? `${formatMD(due)}${dueTime ? ` ${dueTime}` : ''}` : <span className="muted">-</span>}</td>
                          <td>{dueLabel(due, d)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="card m-only" style={{ padding: '4px 12px' }}>
                  {rows.map(({ d, u, due }) => (
                    <div key={d.id} className="li" style={{ ['--u' as string]: u.color, cursor: 'default', gridTemplateColumns: '44px minmax(0,1fr)' }}>
                      <span className="ab" style={{ width: 44, height: 44, fontSize: 14 }}>{u.short_name}</span>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                        <span>
                          <span className="n">{d.custom_name || DOC_TYPE_LABEL[d.doc_type]}</span>
                          <br />
                          <span className="m">{due ? `마감 ${formatMD(due)} · ` : ''}{d.submit_method ? SUBMIT_METHOD_LABEL[d.submit_method] : '제출 방법 미정'}</span>
                        </span>
                        <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          {st3(d)}
                          {dueLabel(due, d)}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <p className="sub muted" style={{ margin: 0, fontSize: 13 }}>마감일은 그 대학의 "서류 마감" 일정에서 가져옵니다. 서류 종류는 대학 정보 수정 › E에서 고릅니다.</p>
          </div>

          <div className="stack">
            {next && nu ? (
              <div className="card" style={{ ['--u' as string]: nu.color }}>
                <div className="bar" />
                <h4>
                  다음 시험 준비물 · {nu.short_name} {formatMD(next.start_date)} <span className="sp" />
                  <span className="badge dd">{dday(next.start_date, f.today).label}</span>
                </h4>
                <div className="checks">
                  {nextItems.map((c) => (
                    <label key={c.id}>
                      <input type="checkbox" checked={c.checked} onChange={(e) => check([c.id], e.target.checked)} /> {c.label}
                    </label>
                  ))}
                </div>
                {nu.prohibited_items && <p className="sub" style={{ margin: '8px 0 0' }}>반입 금지: {nu.prohibited_items}</p>}
                <button
                  className="btn sec block"
                  style={{ marginTop: 12 }}
                  disabled={!nextItems.some((c) => c.checked)}
                  onClick={async () => {
                    await check(nextItems.map((c) => c.id), false);
                    toast('준비물 체크를 초기화했습니다');
                  }}
                >
                  체크 초기화 (다음 시험 준비)
                </button>
              </div>
            ) : (
              <div className="card empty">다가오는 시험·면접이 없습니다.</div>
            )}
            {up.length > 1 && (
              <div className="card">
                <h4>다가오는 시험별 준비</h4>
                {up.slice(1, 8).map((e) => {
                  const u = f.univ.get(e.university_id)!;
                  const items = f.checklist.filter((c) => c.university_id === u.id);
                  return (
                    <Link key={e.id} className="li" to={`/univs/${u.id}`} style={{ ['--u' as string]: u.color }}>
                      <span className="ab">{u.short_name}</span>
                      <span>
                        <span className="n">{eventName(e)} · {formatMD(e.start_date)}</span>
                        <br />
                        <span className="m">
                          수험표 {u.ticket_printed ? '출력 완료' : '미출력'} · 준비물 {items.filter((c) => c.checked).length}/{items.length}
                        </span>
                      </span>
                      <span className="pill">{dday(e.start_date, f.today).label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

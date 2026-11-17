import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useFamily } from '../app/state';
import { AGENCY_LABEL, EVENT_TYPES, EXAM_TYPE_LABEL, PRIORITY_LABEL, PRIORITY_ORDER, RESULT_LABEL } from '../lib/constants';
import { formatMD } from '../lib/date';
import { eventName } from '../lib/labels';
import { dday, dueDate, upcomingExams } from '../lib/schedule';
import type { EventRow, UniversityRow } from '../lib/types';
import { Icon } from '../ui/Icon';

type SortKey = 'short_name' | 'department' | 'priority' | 'apply_agency' | 'exam_number' | 'application_fee' | 'fee_paid' | 'ticket_printed' | 'next' | 'result_status';

/** 지원 현황 (PRD F2-4) — 화면 폭 전체를 쓰는 표 */
export function UnivListPage() {
  const f = useFamily();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('next');
  const [dir, setDir] = useState(1);

  const nextOf = useMemo(() => {
    const m = new Map<string, EventRow>();
    for (const e of [...f.events].sort((a, b) => (dueDate(a) < dueDate(b) ? -1 : 1))) {
      if (dueDate(e) >= f.today && !m.has(e.university_id)) m.set(e.university_id, e);
    }
    return m;
  }, [f.events, f.today]);

  const fee = f.universities.reduce((s, u) => s + (u.application_fee ?? 0), 0);
  const paid = f.universities.filter((u) => u.fee_paid);
  const unpaidFee = fee - paid.reduce((s, u) => s + (u.application_fee ?? 0), 0);
  const printed = f.universities.filter((u) => u.ticket_printed).length;
  const left = upcomingExams(f.events, f.today).length;

  const key = (u: UniversityRow): string | number => {
    switch (sort) {
      case 'next': {
        const e = nextOf.get(u.id);
        return e ? (e.start_date >= f.today ? e.start_date : dueDate(e)) : '9999';
      }
      case 'priority':
        return u.priority ? PRIORITY_ORDER[u.priority] : 9;
      case 'application_fee':
        return u.application_fee ?? 0;
      case 'fee_paid':
      case 'ticket_printed':
        return u[sort] ? 1 : 0;
      default:
        return (u[sort] ?? '') as string;
    }
  };
  const list = f.universities
    .filter((u) => !q || `${u.name} ${u.short_name} ${u.department}`.includes(q.trim()))
    .sort((a, b) => {
      const x = key(a);
      const y = key(b);
      return (x > y ? 1 : x < y ? -1 : 0) * dir;
    });

  const cols: [SortKey, string][] = [
    ['short_name', '대학'],
    ['department', '학과'],
    ['priority', '우선순위'],
    ['apply_agency', '접수처'],
    ['exam_number', '수험 번호'],
    ['application_fee', '전형료'],
    ['fee_paid', '결제'],
    ['ticket_printed', '수험표'],
    ['next', '다음 일정'],
    ['result_status', '결과'],
  ];

  return (
    <>
      <header className="topbar">
        <h1>지원 현황</h1>
        <span className="sub">2027학년도 일반편입 · {f.universities.length}곳</span>
        <span className="sp" />
        <label className="search">
          <Icon name="search" size={18} />
          <input type="text" placeholder="대학·학과 검색" aria-label="대학 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <Link className="btn pri" to="/univs/new">
          <Icon name="plus" size={18} />
          대학 등록
        </Link>
      </header>
      <div className="page">
        <div className="tiles">
          <Tile k="지원 대학" v={f.universities.length} unit="곳" />
          <Tile k="전형료 합계" v={fee.toLocaleString('ko-KR')} unit="원" mv={`${(fee / 10000).toFixed(1)}만`} />
          <Tile k="전형료 결제" v={`${paid.length}/${f.universities.length}`} unit={unpaidFee ? `미결제 ${unpaidFee.toLocaleString('ko-KR')}원` : ''} d />
          <Tile k="수험표 출력" v={`${printed}/${f.universities.length}`} />
          <Tile k="남은 시험·면접" v={left} unit="건" d />
        </div>
        {f.universities.length === 0 ? (
          <div className="card empty">
            아직 등록한 대학이 없습니다. 모집요강을 보고 대학을 등록해 주세요.
            <div style={{ marginTop: 12 }}>
              <Link className="btn pri" to="/univs/new">대학 등록</Link>
            </div>
          </div>
        ) : (
          <>
          {/* 모바일: 카드 목록 (DESIGN 6장 "목록 항목") */}
          <div className="card m-only" style={{ padding: '4px 12px' }}>
            {list.map((u) => {
              const nx = nextOf.get(u.id);
              const nd = nx ? (nx.start_date >= f.today ? nx.start_date : dueDate(nx)) : null;
              return (
                <Link key={u.id} className="li" to={`/univs/${u.id}`} style={{ ['--u' as string]: u.color, gridTemplateColumns: '44px minmax(0,1fr) auto' }}>
                  <span className="ab" style={{ width: 44, height: 44, fontSize: 14 }}>{u.short_name}</span>
                  <span style={{ minWidth: 0 }}>
                    <span className="n">{u.name}</span>
                    {u.is_sample && <span className="pill warn" style={{ marginLeft: 6 }}>테스트</span>}
                    <br />
                    <span className="m">
                      {u.department}
                      {u.priority && ` · ${PRIORITY_LABEL[u.priority]}`}
                      {nx && nd && ` · ${eventName(nx)} ${formatMD(nd)}`}
                    </span>
                  </span>
                  <span className={'pill' + (u.fee_paid ? ' ok' : ' bad')}>{u.fee_paid ? '결제 완료' : '미결제'}</span>
                </Link>
              );
            })}
          </div>
          <div className="tblwrap d-only">
            <table className="tbl">
              <thead>
                <tr>
                  {cols.map(([k, l]) => (
                    <th key={k} className={k === 'application_fee' ? 'r' : undefined} aria-sort={sort === k ? (dir > 0 ? 'ascending' : 'descending') : undefined}>
                      <button
                        onClick={() => {
                          if (sort === k) setDir(-dir);
                          else {
                            setSort(k);
                            setDir(1);
                          }
                        }}
                      >
                        {l}
                        {sort === k && <Icon name={dir > 0 ? 'sortd' : 'sortu'} size={14} />}
                      </button>
                    </th>
                  ))}
                  <th>전형</th>
                </tr>
              </thead>
              <tbody>
                {list.map((u) => {
                  const nx = nextOf.get(u.id);
                  const nd = nx ? (nx.start_date >= f.today ? nx.start_date : dueDate(nx)) : null;
                  return (
                    <tr key={u.id} className="link" tabIndex={0} onClick={() => nav(`/univs/${u.id}`)} onKeyDown={(e) => e.key === 'Enter' && nav(`/univs/${u.id}`)} style={{ ['--u' as string]: u.color }}>
                      <td>
                        <span className="uc">
                          <span className="ab">{u.short_name}</span>
                          <span className="n">{u.name}</span>
                    {u.is_sample && <span className="pill warn" style={{ marginLeft: 6 }}>테스트</span>}
                        </span>
                      </td>
                      <td>{u.department}</td>
                      <td>{u.priority ? <span className={'pill' + (u.priority === 'first' ? ' ok' : '')}>{PRIORITY_LABEL[u.priority]}</span> : <span className="muted">-</span>}</td>
                      <td>{u.apply_agency ? AGENCY_LABEL[u.apply_agency] : <span className="muted">-</span>}</td>
                      <td className="num-sm">{u.exam_number || <span className="muted">미입력</span>}</td>
                      <td className="r num-sm">{u.application_fee != null ? u.application_fee.toLocaleString('ko-KR') : '-'}</td>
                      <td><span className={'pill' + (u.fee_paid ? ' ok' : ' bad')}>{u.fee_paid ? '결제 완료' : '미결제'}</span></td>
                      <td><span className={'pill' + (u.ticket_printed ? ' ok' : '')}>{u.ticket_printed ? '출력 완료' : '미출력'}</span></td>
                      <td>
                        {nx && nd ? (
                          <>
                            {EVENT_TYPES[nx.event_type].symbol} {eventName(nx)} · {formatMD(nd)} <span className="muted">{dday(nd, f.today).label}</span>
                          </>
                        ) : (
                          <span className="muted">-</span>
                        )}
                      </td>
                      <td><span className={'pill' + (u.result_status === 'first_pass' || u.result_status === 'final_pass' ? ' ok' : '')}>{RESULT_LABEL[u.result_status]}{u.result_status === 'waitlist' && u.waitlist_no ? ` ${u.waitlist_no}번` : ''}</span></td>
                      <td>{u.exam_types.map((t) => EXAM_TYPE_LABEL[t]).join(' + ')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </>
  );
}

/** 요약 타일. d = 데스크톱에서만, mv = 모바일에서 짧게 보일 값 (모바일은 3칸, DESIGN 6장) */
function Tile({ k, v, unit, d, mv }: { k: string; v: string | number; unit?: string; d?: boolean; mv?: string }) {
  return (
    <div className={'tile' + (d ? ' d-only' : '')}>
      <div className="k">{k}</div>
      <div className="v">
        <span className={mv ? 'd-only' : undefined}>{v}</span>
        {mv && <span className="m-only">{mv}</span>}
        {unit && <small className={mv ? 'd-only' : undefined}>{unit}</small>}
      </div>
    </div>
  );
}

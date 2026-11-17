import { Link } from 'react-router';
import { useFamily } from '../app/state';
import { PRIORITY_LABEL } from '../lib/constants';
import { dday } from '../lib/schedule';
import { formatMD, hhmm } from '../lib/date';
import { eventName } from '../lib/labels';

/** 겹치는 일정 목록 (PRD F7-4) — 충돌·주의를 모아 두 대학 우선순위와 함께 */
export function OverlapPage() {
  const f = useFamily();
  const s = f.family.settings;
  const list = f.overlaps;
  return (
    <>
      <header className="topbar">
        <h1>겹치는 일정</h1>
        <span className="sub">
          기준 간격 {s.overlap_gap_min}분 · 기본 시험 시간 {s.default_exam_min}분 (설정에서 변경)
        </span>
      </header>
      <div className="page">
        {list.length === 0 && <p className="empty">같은 날 시험·면접이 두 개 이상인 날이 없습니다.</p>}
        <div className="ovgrid">
          {list.map((o) => {
            const label =
              o.level === 'conflict' ? <span className="pill bad">⚠ 시간 충돌</span> : o.level === 'warn' ? <span className="pill warn">⚠ 간격 주의</span> : <span className="pill">참고 · 간격 충분</span>;
            return (
              <article className="card" key={o.a.id + o.b.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h3 style={{ margin: 0 }}>{formatMD(o.date)}</h3>
                  {label}
                  <span className="sp" />
                  <span className="sub">{dday(o.date, f.today).label}</span>
                  <Link className="btn sec sm" to={`/?d=${o.date}`}>그날 보기</Link>
                </div>
                <div className="ovpair">
                  {[o.a, o.b].map((e, i) => {
                    const u = f.univ.get(e.university_id)!;
                    return (
                      <div key={e.id} style={{ display: 'contents' }}>
                        {i === 1 && (
                          <div className="ovgap">
                            {o.gapMin == null ? (
                              <>시각<br />미정</>
                            ) : (
                              <>
                                <span className="num">{Math.abs(o.gapMin)}분</span>
                                {o.gapMin < 0 ? '겹침' : '간격'}
                              </>
                            )}
                          </div>
                        )}
                        <div className="ovside" style={{ ['--u' as string]: u.color }}>
                          <b>
                            {u.short_name} {eventName(e)}
                          </b>
                          <span className="sub">
                            입실 {hhmm(e.check_in_time) ?? '-'} · {hhmm(e.start_time) ?? '-'}–{hhmm(e.end_time) ?? '-'}
                          </span>
                          <span className={'pill' + (u.priority === 'first' ? ' ok' : '')}>우선순위 {u.priority ? PRIORITY_LABEL[u.priority] : '미정'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </>
  );
}

import { useState } from 'react';
import { Link } from 'react-router';
import { useFamily } from '../app/state';
import { saveFile } from '../lib/browser';
import { buildIcs, icsFileName } from '../lib/ics';
import { selectForExport, type ExportScope } from '../lib/schedule';
import { Icon } from '../ui/Icon';
import { useToast } from '../ui/toast';

const KEY_LAST = 'tcal.lastExport';

function getLast(): string | null {
  try {
    return localStorage.getItem(KEY_LAST);
  } catch {
    return null;
  }
}

/** 아이폰 캘린더로 내보내기 (PRD F8) */
export function ExportPage() {
  const f = useFamily();
  const toast = useToast();
  const [kind, setKind] = useState<ExportScope['kind']>('all');
  const [univ, setUniv] = useState(f.universities[0]?.id ?? '');
  const [last, setLast] = useState(getLast);
  const s = f.family.settings;

  const scope: ExportScope =
    kind === 'univ' ? { kind, universityId: univ } : kind === 'changed' ? { kind, since: last } : { kind };
  const picked = selectForExport(f.events, scope);
  const scopeName =
    kind === 'all' ? '전체' : kind === 'timed' ? '시험면접' : kind === 'univ' ? (f.univ.get(univ)?.short_name ?? '대학') : '변경분';

  async function download() {
    const items = picked.map((e) => ({
      event: e,
      university: f.univ.get(e.university_id)!,
      checklist: f.checklist.filter((c) => c.university_id === e.university_id).map((c) => c.label),
    }));
    const ics = buildIcs(items, { settings: s });
    await saveFile(icsFileName(scopeName), ics, 'text/calendar;charset=utf-8');
    const now = new Date().toISOString();
    try {
      localStorage.setItem(KEY_LAST, now);
    } catch {
      /* 이 기기에 기록 못 해도 내보내기는 됨 */
    }
    setLast(now);
    toast(`${picked.length}개 일정을 내보냈습니다`);
  }

  const lastLabel = last ? new Date(last).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : null;

  return (
    <>
      <header className="topbar">
        <h1>캘린더 내보내기(.ics)</h1>
        <span className="sub">아이폰 캘린더에 넣어 알림을 받습니다</span>
      </header>
      <div className="page">
        <div className="cols c2e">
          <div className="card">
            <h4>내보낼 범위</h4>
            <div className="opts col" role="radiogroup" aria-label="내보낼 범위">
              <label><input type="radio" name="scope" checked={kind === 'all'} onChange={() => setKind('all')} /> 전체 일정 ({f.events.length}개)</label>
              <label><input type="radio" name="scope" checked={kind === 'timed'} onChange={() => setKind('timed')} /> 시험·면접만 ({selectForExport(f.events, { kind: 'timed' }).length}개)</label>
              <label>
                <input type="radio" name="scope" checked={kind === 'univ'} onChange={() => setKind('univ')} /> 대학 하나
                {kind === 'univ' && (
                  <select aria-label="대학" value={univ} onChange={(e) => setUniv(e.target.value)} style={{ marginLeft: 'auto', fontSize: 16, padding: '4px 8px', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)', background: 'var(--bg)' }}>
                    {f.universities.map((u) => (
                      <option key={u.id} value={u.id}>{u.short_name} · {u.name}</option>
                    ))}
                  </select>
                )}
              </label>
              <label>
                <input type="radio" name="scope" checked={kind === 'changed'} onChange={() => setKind('changed')} /> 변경된 일정만
                <span className="muted" style={{ fontWeight: 400 }}>
                  {lastLabel ? `(마지막 내보내기 ${lastLabel} 이후 ${selectForExport(f.events, { kind: 'changed', since: last }).length}개)` : '(이 기기에서 처음이면 전체)'}
                </span>
              </label>
            </div>
            <button className="btn pri block" style={{ marginTop: 16 }} onClick={download} disabled={picked.length === 0}>
              <Icon name="share" size={18} />
              {picked.length ? `.ics 파일 내려받기 (${picked.length}개)` : '내보낼 일정이 없습니다'}
            </button>
            <p className="sub muted" style={{ margin: '8px 0 0', fontSize: 13 }}>일정 하나만 넣으려면 달력의 일정 카드에서 [캘린더에 추가]를 누릅니다.</p>
          </div>

          <div className="stack">
            <div className="card">
              <h4>알림 <span className="sp" /><Link className="mini" to="/settings">설정에서 변경</Link></h4>
              <div className="rows">
                <div className="row"><span className="k">시험·면접</span><span className="v">전날 {s.ics_exam_eve}, 입실 {s.ics_exam_before_min}분 전</span><span /></div>
                <div className="row"><span className="k">마감 일정</span><span className="v">마감 전날 {s.ics_due_eve}</span><span /></div>
                <div className="row"><span className="k">캘린더 이름</span><span className="v">편입 시험 2027 (서울 시간)</span><span /></div>
              </div>
            </div>
            <div className="warnbox">
              <Icon name="warn" size={18} />
              <span>
                같은 파일을 다시 가져오면 아이폰 캘린더에 일정이 두 번 들어갈 수 있습니다. 두 번째부터는 "변경된 일정만"을 고르세요. 바뀐 일정은 이전 것을 지운 뒤 넣는 것이 안전합니다.
              </span>
            </div>
            <div className="card">
              <h4>아이폰에서 넣는 방법</h4>
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.7 }}>
                <li>아이폰 Safari에서 이 화면을 열고 [.ics 파일 내려받기]를 누릅니다.</li>
                <li>"캘린더에 추가" 화면이 나오면 [모두 추가]를 누릅니다.</li>
                <li>홈 화면 앱에서 내려받기가 안 되면 공유 시트가 열립니다. 그래도 안 되면 Safari에서 다시 엽니다.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

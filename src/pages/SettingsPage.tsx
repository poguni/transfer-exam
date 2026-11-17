import { useState, type ChangeEvent } from 'react';
import { useFamily } from '../app/state';
import { copyText, saveFile } from '../lib/browser';
import { deleteSampleData, insertSampleData, updateFamily } from '../lib/db';
import { sampleUniversities } from '../lib/sampleData';
import { signOut } from '../lib/offline';
import { applyTheme, getSavedTheme, THEMES, type ThemeId } from '../lib/themes';
import { Icon } from '../ui/Icon';
import { useToast } from '../ui/toast';

/** 설정 (PRD F11, F13). 테마는 이 기기에만, 나머지는 가족 공유 */
export function SettingsPage() {
  const f = useFamily();
  const toast = useToast();
  const [theme, setTheme] = useState<ThemeId>(getSavedTheme());
  const [name, setName] = useState(f.family.name);
  const [st, setSt] = useState({ ...f.family.settings });
  const [busy, setBusy] = useState(false);

  /** 가족 데이터 전체를 JSON 파일로 (PRD F12) */
  async function backup() {
    const data = {
      app: 'TExam Calendar',
      exportedAt: new Date().toISOString(),
      family: f.family,
      members: f.members,
      universities: f.universities,
      events: f.events,
      documents: f.documents,
      checklist: f.checklist,
    };
    await saveFile(`편입캘린더_백업_${f.today}.json`, JSON.stringify(data, null, 2), 'application/json');
    toast('백업 파일을 만들었습니다');
  }

  function pick(id: ThemeId) {
    applyTheme(id);
    setTheme(id);
  }

  async function save() {
    setBusy(true);
    try {
      await updateFamily(f.family.id, { name: name.trim() || '우리 가족', settings: st });
      await f.refresh();
      toast('설정을 저장했습니다');
    } finally {
      setBusy(false);
    }
  }

  const num = (k: 'overlap_gap_min' | 'default_exam_min' | 'default_buffer_min' | 'ics_exam_before_min') => ({
    value: st[k],
    min: 0,
    type: 'number',
    inputMode: 'numeric' as const,
    onChange: (e: ChangeEvent<HTMLInputElement>) => setSt({ ...st, [k]: Number(e.target.value) }),
  });

  return (
    <>
      <header className="topbar">
        <h1>설정</h1>
        <span className="sp" />
        <button className="btn pri" onClick={save} disabled={busy}>
          가족 설정 저장
        </button>
      </header>
      <div className="page">
        <div className="cols c2e">
          <div className="card">
            <h4>
              테마 <span className="sub" style={{ fontWeight: 500 }}>이 기기에만 저장됩니다. 기능은 두 테마가 같습니다.</span>
            </h4>
            <div className="themes" role="radiogroup" aria-label="테마">
              {THEMES.map((t) => (
                <button key={t.id} className="tcard" role="radio" aria-checked={theme === t.id} onClick={() => pick(t.id)}>
                  <div className="tprev" data-theme={t.id}>
                    <span className="tt">편입 캘린더</span>
                    <span className="dn">D-3</span>
                    <span style={{ display: 'flex', gap: 4 }}>
                      <span className="chip fill" style={{ ['--u' as string]: '#1D4ED8' }}><span className="s">●</span>건국</span>
                      <span className="chip line" style={{ ['--u' as string]: '#047857' }}><span className="s">▲</span>한양</span>
                    </span>
                  </div>
                  <div className="tmeta">
                    <b>
                      {t.name}
                      {theme === t.id && ' · 사용 중'}
                    </b>
                    <div>
                      {t.desc} · {t.fonts}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h4>가족 공유</h4>
            <div className="field" style={{ marginBottom: 8 }}>
              <label htmlFor="fam-name">가족 이름</label>
              <input id="fam-name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="rows">
              <div className="row">
                <span className="k">초대 코드</span>
                <span className="v num">{f.family.invite_code}</span>
                <button className="mini" onClick={async () => (await copyText(f.family.invite_code)) && toast('초대 코드를 복사했습니다')}>복사</button>
              </div>
              <div className="row">
                <span className="k">구성원</span>
                <span className="v">{f.members.map((m) => `${m.display_name ?? '이름 없음'}(${m.role === 'student' ? '자녀' : '부모'})`).join(' · ')}</span>
                <span />
              </div>
            </div>
            <p className="sub" style={{ margin: '8px 0 0' }}>다른 가족 구성원은 Link Plan 계정으로 로그인한 뒤 이 초대 코드를 입력하면 같은 달력을 봅니다.</p>
          </div>

          <div className="card">
            <h4>일정 기준 (가족 공유)</h4>
            <div className="three">
              <div className="field"><label htmlFor="s1">겹침 기준 간격(분)</label><input id="s1" {...num('overlap_gap_min')} /></div>
              <div className="field"><label htmlFor="s2">기본 시험 시간(분)</label><input id="s2" {...num('default_exam_min')} /></div>
              <div className="field"><label htmlFor="s3">기본 여유 시간(분)</label><input id="s3" {...num('default_buffer_min')} /></div>
            </div>
            <p className="sub" style={{ margin: '8px 0 0' }}>기본 여유 시간은 새로 등록하는 대학에 적용됩니다.</p>
          </div>

          <div className="card">
            <h4>.ics 알림 (가족 공유)</h4>
            <div className="three">
              <div className="field"><label htmlFor="s4">시험·면접 전날 알림</label><input id="s4" type="time" value={st.ics_exam_eve} onChange={(e) => e.target.value && setSt({ ...st, ics_exam_eve: e.target.value })} /></div>
              <div className="field"><label htmlFor="s5">입실 몇 분 전 알림</label><input id="s5" {...num('ics_exam_before_min')} /></div>
              <div className="field"><label htmlFor="s6">마감 전날 알림</label><input id="s6" type="time" value={st.ics_due_eve} onChange={(e) => e.target.value && setSt({ ...st, ics_due_eve: e.target.value })} /></div>
            </div>
            <p className="sub" style={{ margin: '8px 0 0' }}>바꾼 알림은 다음에 내보내는 .ics 파일부터 적용됩니다.</p>
          </div>

          <SampleDataCard />

          <div className="card">
            <h4>계정·앱 정보</h4>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="sub">편입 캘린더(TExam Calendar) v0.1</span>
              <span className="sp" />
              <button className="btn sec sm" onClick={backup}>JSON 백업</button>
              <button className="btn danger sm" onClick={() => signOut()}>
                <Icon name="logout" size={16} />
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** 테스트(더미) 데이터 넣기·일괄 삭제 — 모집요강 발표 전 연습용 */
function SampleDataCard() {
  const f = useFamily();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const samples = f.universities.filter((u) => u.is_sample);
  const sampleIds = new Set(samples.map((u) => u.id));
  const sampleEvents = f.events.filter((e) => sampleIds.has(e.university_id)).length;

  async function add() {
    setBusy(true);
    try {
      const r = await insertSampleData(f.family.id, sampleUniversities(f.universities.length));
      await f.refresh();
      toast(`테스트 대학 ${r.universities}곳, 일정 ${r.events}개를 넣었습니다`);
    } catch (e) {
      toast(`넣지 못했습니다: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`테스트 데이터를 모두 삭제할까요?\n테스트 대학 ${samples.length}곳과 그 일정 ${sampleEvents}개, 서류·준비물이 함께 지워집니다.\n직접 등록한 대학은 지워지지 않습니다.`)) return;
    setBusy(true);
    try {
      await deleteSampleData(f.family.id);
      await f.refresh();
      toast('테스트 데이터를 모두 삭제했습니다');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h4>
        테스트 데이터 <span className="sp" />
        {samples.length > 0 && <span className="pill warn">사용 중 · 대학 {samples.length}곳 · 일정 {sampleEvents}개</span>}
      </h4>
      <p className="sub" style={{ margin: '0 0 12px' }}>
        모집요강 발표 전에 기능을 연습할 수 있도록 서울·수도권 8개 대학의 <b>가상 일정</b>을 넣습니다(건국·동국·홍익·숭실·세종·광운·인하·아주). 실제 모집요강과 다르며, 겹침 경고 예시(1/10 간격 주의, 1/16 시간 충돌)가 들어 있습니다. 가족 모두에게 보입니다.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn sec sm" onClick={add} disabled={busy || samples.length > 0}>
          테스트 데이터 넣기
        </button>
        <button className="btn danger sm" onClick={remove} disabled={busy || samples.length === 0}>
          <Icon name="trash" size={16} />
          테스트 데이터 모두 삭제
        </button>
      </div>
      {samples.length > 0 && <p className="sub" style={{ margin: '8px 0 0' }}>실제 대학을 등록하기 전에 [모두 삭제]로 지워 주세요. 직접 등록한 대학은 지워지지 않습니다.</p>}
    </div>
  );
}

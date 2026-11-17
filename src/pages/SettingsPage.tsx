import { useState, type ChangeEvent } from 'react';
import { useFamily } from '../app/state';
import { copyText } from '../lib/browser';
import { updateFamily } from '../lib/db';
import { supabase } from '../lib/supabase';
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
            <p className="sub" style={{ margin: '8px 0 0' }}>다른 가족은 Link Plan 계정으로 로그인한 뒤 이 초대 코드를 입력하면 같은 달력을 봅니다.</p>
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

          <div className="card">
            <h4>계정 · 앱 정보</h4>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="sub">편입 캘린더(TExam Calendar) v0.1</span>
              <span className="sp" />
              <button className="btn danger sm" onClick={() => supabase.auth.signOut()}>
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

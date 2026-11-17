import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useFamily } from '../app/state';
import { DEFAULT_CHECKLIST, DOC_TYPE_LABEL, UNIV_COLORS } from '../lib/constants';
import { deleteUniversity, saveUniversity, type ChecklistInput, type DocInput, type UniversityInput } from '../lib/db';
import type { DocStatus, DocType, ExamType, UniversityRow } from '../lib/types';
import { Icon } from '../ui/Icon';
import { useToast } from '../ui/toast';

// 입력값은 모두 문자열·불린으로 들고 있다가 저장할 때 DB 형식으로 바꿉니다.
interface Form {
  name: string; short_name: string; department: string; priority: string; quota: string; competition_rate: string; color: string;
  exam_types: ExamType[]; stage_type: string; exam_format: string; score_ratio: string;
  apply_agency: string; exam_number: string; receipt_number: string; application_fee: string; fee_paid: boolean; ticket_printed: boolean;
  admission_phone: string; homepage_url: string; guide_url: string;
  venue: string; map_url: string; transit: string; travel_min: string; buffer_min: string;
  prohibited_items: string; result_status: string; waitlist_no: string; review_memo: string; memo: string;
}

interface DocState { doc_type: DocType; on: boolean; id?: string; status: DocStatus; custom_name: string }

const s = (v: unknown) => (v == null ? '' : String(v));

function toForm(u: UniversityRow | undefined, color: string, defaultBuffer: number): Form {
  return {
    name: s(u?.name), short_name: s(u?.short_name), department: s(u?.department), priority: s(u?.priority), quota: s(u?.quota),
    competition_rate: s(u?.competition_rate), color: u?.color ?? color,
    exam_types: u?.exam_types ?? ['english'], stage_type: s(u?.stage_type), exam_format: s(u?.exam_format), score_ratio: s(u?.score_ratio),
    apply_agency: s(u?.apply_agency), exam_number: s(u?.exam_number), receipt_number: s(u?.receipt_number), application_fee: s(u?.application_fee),
    fee_paid: u?.fee_paid ?? false, ticket_printed: u?.ticket_printed ?? false,
    admission_phone: s(u?.admission_phone), homepage_url: s(u?.homepage_url), guide_url: s(u?.guide_url),
    venue: s(u?.venue), map_url: s(u?.map_url), transit: s(u?.transit), travel_min: s(u?.travel_min), buffer_min: s(u?.buffer_min ?? defaultBuffer),
    prohibited_items: s(u?.prohibited_items), result_status: u?.result_status ?? 'pending', waitlist_no: s(u?.waitlist_no),
    review_memo: s(u?.review_memo), memo: s(u?.memo),
  };
}

function toInput(v: Form): UniversityInput {
  const t = (x: string) => (x.trim() ? x.trim() : null);
  const n = (x: string) => (x.trim() === '' ? null : Number(x));
  return {
    name: v.name.trim(), short_name: v.short_name.trim(), department: v.department.trim(),
    priority: (t(v.priority) as UniversityInput['priority']), quota: n(v.quota), competition_rate: n(v.competition_rate), color: v.color,
    exam_types: v.exam_types, stage_type: t(v.stage_type) as UniversityInput['stage_type'], exam_format: t(v.exam_format), score_ratio: t(v.score_ratio),
    apply_agency: t(v.apply_agency) as UniversityInput['apply_agency'], exam_number: t(v.exam_number), receipt_number: t(v.receipt_number),
    application_fee: n(v.application_fee), fee_paid: v.fee_paid, ticket_printed: v.ticket_printed,
    admission_phone: t(v.admission_phone), homepage_url: t(v.homepage_url), guide_url: t(v.guide_url),
    venue: t(v.venue), map_url: t(v.map_url), transit: t(v.transit), travel_min: n(v.travel_min), buffer_min: n(v.buffer_min) ?? 30,
    prohibited_items: t(v.prohibited_items), result_status: v.result_status as UniversityInput['result_status'],
    waitlist_no: v.result_status === 'waitlist' ? n(v.waitlist_no) : null, review_memo: t(v.review_memo), memo: t(v.memo),
  };
}

const DOC_TYPES: DocType[] = ['study_plan', 'self_intro', 'transcript', 'completion_cert', 'other'];

/** 대학 등록·수정 (PRD F2) — 화면 폭 전체 페이지, A~H 섹션 */
export function UnivFormPage() {
  const f = useFamily();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const { id } = useParams();
  const editing = id ? f.univ.get(id) : undefined;
  const nextColor = UNIV_COLORS[f.universities.length % UNIV_COLORS.length];

  const [v, setV] = useState<Form>(() => toForm(editing, nextColor, f.family.settings.default_buffer_min));
  const myDocs = f.documents.filter((d) => d.university_id === id);
  const [docs, setDocs] = useState<DocState[]>(() =>
    DOC_TYPES.map((t) => {
      const d = myDocs.find((x) => x.doc_type === t);
      return { doc_type: t, on: !!d, id: d?.id, status: d?.status ?? 'todo', custom_name: d?.custom_name ?? '' };
    }),
  );
  const [docShared, setDocShared] = useState(() => ({
    submit_method: myDocs[0]?.submit_method ?? '',
    mail_basis: myDocs[0]?.mail_basis ?? '',
    original_required: myDocs[0]?.original_required ?? false,
    memo: myDocs[0]?.memo ?? '',
  }));
  const [items, setItems] = useState<ChecklistInput[]>(() =>
    editing ? f.checklist.filter((c) => c.university_id === id).map((c) => ({ id: c.id, label: c.label })) : DEFAULT_CHECKLIST.map((label) => ({ label })),
  );
  const [newItem, setNewItem] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // 다른 화면에서 #sec-D 처럼 섹션을 지정해 들어오면 그 섹션을 펼치고 이동
  useEffect(() => {
    const sec = loc.hash.replace('#', '');
    if (!sec) return;
    const el = document.getElementById(sec) as HTMLDetailsElement | null;
    if (el) {
      el.open = true;
      el.scrollIntoView({ block: 'start' });
    }
  }, [loc.hash]);

  const set = <K extends keyof Form>(k: K, val: Form[K]) => setV((p) => ({ ...p, [k]: val }));
  const bind = (k: keyof Form) => ({ value: v[k] as string, onChange: (e: { target: { value: string } }) => set(k, e.target.value as never) });

  const errs = {
    name: !v.name.trim() ? '대학 이름을 입력하세요' : '',
    short_name: !v.short_name.trim() ? '약칭을 입력하세요' : v.short_name.trim().length < 2 || v.short_name.trim().length > 4 ? '약칭은 2~4자로 입력하세요' : '',
    department: !v.department.trim() ? '학과를 입력하세요' : '',
  };
  const dupShort = useMemo(
    () => f.universities.find((u) => u.id !== id && u.short_name === v.short_name.trim()),
    [f.universities, id, v.short_name],
  );
  const departure = (() => {
    const tr = Number(v.travel_min);
    const bf = Number(v.buffer_min || 0);
    return v.travel_min ? `권장 출발 = 입실 시각 − 소요 ${tr}분 − 여유 ${bf}분 (일정마다 자동 계산)` : '예상 소요 시간을 넣으면 일정마다 권장 출발 시각을 계산합니다.';
  })();

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    setTried(true);
    setError('');
    if (errs.name || errs.short_name || errs.department) {
      document.getElementById('sec-A')?.scrollIntoView({ block: 'start' });
      return;
    }
    setBusy(true);
    try {
      const docInputs: DocInput[] = docs
        .filter((d) => d.on)
        .map((d) => ({
          id: d.id,
          doc_type: d.doc_type,
          custom_name: d.doc_type === 'other' ? d.custom_name.trim() || null : null,
          status: d.status,
          submit_method: (docShared.submit_method || null) as DocInput['submit_method'],
          mail_basis: docShared.submit_method === 'mail' ? ((docShared.mail_basis || null) as DocInput['mail_basis']) : null,
          original_required: docShared.original_required,
          memo: docShared.memo.trim() || null,
        }));
      const uid = await saveUniversity(f.family.id, id ?? null, toInput(v), docInputs, items);
      await f.refresh();
      toast(editing ? '대학 정보를 저장했습니다' : `${v.short_name} 등록 완료 · 기본 준비물 ${items.length}개를 넣었습니다`);
      nav(`/univs/${uid}`, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!editing) return;
    const n = f.events.filter((e) => e.university_id === editing.id).length;
    if (!window.confirm(`${editing.name}을(를) 삭제할까요?\n일정 ${n}개와 서류·준비물도 함께 지워집니다.`)) return;
    setBusy(true);
    try {
      await deleteUniversity(editing.id);
      await f.refresh();
      toast(`${editing.short_name}을(를) 삭제했습니다`);
      nav('/univs', { replace: true });
    } finally {
      setBusy(false);
    }
  }

  if (id && !editing) return <p className="empty">대학을 찾을 수 없습니다.</p>;

  const secs: [string, string, string, boolean, ReactNode][] = [
    ['A', '기본 정보', '필수 3', true, (
      <>
        <Field label="지원 대학 *" err={tried ? errs.name : ''}><input type="text" {...bind('name')} placeholder="예: 건국대학교" /></Field>
        <Field label="약칭 * (2~4자, 달력 칸 표시)" err={tried ? errs.short_name : ''} hint={dupShort ? `"${dupShort.name}"과(와) 약칭이 같습니다. 달력에서 구분이 어려울 수 있습니다.` : ''}>
          <input type="text" maxLength={4} {...bind('short_name')} placeholder="예: 건국" />
        </Field>
        <Field label="지원 학과(모집 단위) *" err={tried ? errs.department : ''}><input type="text" {...bind('department')} placeholder="예: 경영학과" /></Field>
        <Field label="지원 우선순위">
          <select {...bind('priority')}>
            <option value="">선택 안 함</option><option value="first">1지망</option><option value="reach">상향</option><option value="target">적정</option><option value="safe">안정</option>
          </select>
        </Field>
        <Field label="모집 인원"><input type="number" inputMode="numeric" min={0} {...bind('quota')} /></Field>
        <Field label="경쟁률 (예: 25.28 → 25.28 : 1)"><input type="number" inputMode="decimal" step="0.01" min={0} {...bind('competition_rate')} /></Field>
        <div className="field full">
          <span className="lb">표시 색상 (등록 순서대로 자동 배정)</span>
          <div className="swatches">
            {UNIV_COLORS.map((c, i) => (
              <button key={c} type="button" style={{ ['--u' as string]: c }} aria-label={`색상 ${i + 1}`} aria-pressed={v.color === c} onClick={() => set('color', c)} />
            ))}
          </div>
        </div>
      </>
    )],
    ['B', '전형 방법', '', true, (
      <>
        <div className="field full">
          <span className="lb">시험 종류</span>
          <div className="opts">
            {(['english', 'interview', 'document'] as ExamType[]).map((t) => (
              <label key={t}>
                <input type="checkbox" checked={v.exam_types.includes(t)} onChange={(e) => set('exam_types', e.target.checked ? [...v.exam_types, t] : v.exam_types.filter((x) => x !== t))} />{' '}
                {{ english: '영어', interview: '면접', document: '서류 평가' }[t]}
              </label>
            ))}
          </div>
        </div>
        <Field label="단계 구분">
          <select {...bind('stage_type')}><option value="">선택 안 함</option><option value="one">1단계만</option><option value="two">1·2단계</option></select>
        </Field>
        <Field label="문항 수·시험 시간"><input type="text" {...bind('exam_format')} placeholder="예: 영어 40문항 60분" /></Field>
        <Field label="반영 비율" full><input type="text" {...bind('score_ratio')} placeholder="예: 1단계 영어 100% → 2단계 1단계 60% + 면접 40%" /></Field>
      </>
    )],
    ['C', '일정', '저장 후 추가', false, (
      <p className="sub full" style={{ margin: 0 }}>대학을 저장한 뒤 달력(날짜 클릭)이나 대학 상세의 [일정 추가]에서 원서 접수·시험·발표 일정을 여러 개 등록합니다.</p>
    )],
    ['D', '수험 정보', '접수처 · 수험 번호 · 전형료', false, (
      <>
        <div className="field full">
          <span className="lb">원서 접수처</span>
          <div className="opts">
            {[['jinhak', '진학어플라이'], ['uway', '유웨이'], ['school', '대학 자체']].map(([k, l]) => (
              <label key={k}><input type="radio" name="agency" checked={v.apply_agency === k} onChange={() => set('apply_agency', k)} /> {l}</label>
            ))}
          </div>
        </div>
        <Field label="수험 번호"><input type="text" {...bind('exam_number')} /></Field>
        <Field label="접수 번호(수험 번호와 다를 때)"><input type="text" {...bind('receipt_number')} /></Field>
        <Field label="전형료(원)"><input type="number" inputMode="numeric" min={0} step={1000} {...bind('application_fee')} /></Field>
        <div className="field">
          <span className="lb">진행</span>
          <div className="opts">
            <label><input type="checkbox" checked={v.fee_paid} onChange={(e) => set('fee_paid', e.target.checked)} /> 결제 완료</label>
            <label><input type="checkbox" checked={v.ticket_printed} onChange={(e) => set('ticket_printed', e.target.checked)} /> 수험표 출력</label>
          </div>
        </div>
        <Field label="입학처 전화"><input type="tel" inputMode="tel" {...bind('admission_phone')} placeholder="02-000-0000" /></Field>
        <Field label="입학처 홈페이지"><input type="url" {...bind('homepage_url')} placeholder="https://" /></Field>
        <Field label="모집요강 링크" full><input type="url" {...bind('guide_url')} placeholder="https://" /></Field>
      </>
    )],
    ['E', '준비 서류', '', false, (
      <>
        <div className="full">
          {docs.map((d, i) => (
            <div className="doc-row" key={d.doc_type}>
              <label>
                <input type="checkbox" checked={d.on} onChange={(e) => setDocs(docs.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)))} /> {DOC_TYPE_LABEL[d.doc_type]}
                {d.doc_type === 'other' && d.on && (
                  <input type="text" aria-label="기타 서류 이름" placeholder="서류 이름" value={d.custom_name} onChange={(e) => setDocs(docs.map((x, j) => (j === i ? { ...x, custom_name: e.target.value } : x)))} />
                )}
              </label>
              <select aria-label={`${DOC_TYPE_LABEL[d.doc_type]} 상태`} disabled={!d.on} value={d.status} onChange={(e) => setDocs(docs.map((x, j) => (j === i ? { ...x, status: e.target.value as DocStatus } : x)))}>
                <option value="todo">준비 중</option><option value="ready">발급·작성 완료</option><option value="submitted">제출 완료</option>
              </select>
            </div>
          ))}
        </div>
        <Field label="제출 방법">
          <select value={docShared.submit_method} onChange={(e) => setDocShared({ ...docShared, submit_method: e.target.value as typeof docShared.submit_method })}>
            <option value="">선택 안 함</option><option value="upload">온라인 업로드</option><option value="mail">우편</option><option value="visit">방문</option>
          </select>
        </Field>
        {docShared.submit_method === 'mail' && (
          <Field label="우편 마감 기준">
            <select value={docShared.mail_basis} onChange={(e) => setDocShared({ ...docShared, mail_basis: e.target.value as typeof docShared.mail_basis })}>
              <option value="">선택 안 함</option><option value="postmark">소인 기준</option><option value="arrival">도착 기준</option>
            </select>
          </Field>
        )}
        <div className="field">
          <span className="lb">원본</span>
          <div className="opts"><label><input type="checkbox" checked={docShared.original_required} onChange={(e) => setDocShared({ ...docShared, original_required: e.target.checked })} /> 원본 대조 필요</label></div>
        </div>
        <Field label="서류 메모" full><input type="text" value={docShared.memo} onChange={(e) => setDocShared({ ...docShared, memo: e.target.value })} placeholder="예: 성적 증명서 영문 1부" /></Field>
        <p className="sub full" style={{ margin: 0 }}>서류 제출 마감일은 C의 "서류 마감" 일정으로 등록합니다.</p>
      </>
    )],
    ['F', '장소와 교통', '권장 출발 자동 계산', false, (
      <>
        <Field label="시험 장소"><input type="text" {...bind('venue')} placeholder="건물, 호실까지" /></Field>
        <Field label="지도 링크(비우면 장소 이름으로 검색)"><input type="url" {...bind('map_url')} placeholder="네이버 지도·카카오맵 공유 링크" /></Field>
        <Field label="예상 소요 시간(분)"><input type="number" inputMode="numeric" min={0} {...bind('travel_min')} /></Field>
        <Field label="여유 시간(분)"><input type="number" inputMode="numeric" min={0} {...bind('buffer_min')} /></Field>
        <Field label="대중교통" full><textarea {...bind('transit')} placeholder="노선, 환승, 출구 번호" /></Field>
        <div className="calc full">{departure}</div>
      </>
    )],
    ['G', '준비물', `${items.length}개`, false, (
      <>
        <div className="full chk-edit">
          {items.map((it, i) => (
            <span key={it.id ?? `n${i}`}>
              {it.label}
              <button type="button" aria-label={`${it.label} 빼기`} onClick={() => setItems(items.filter((_, j) => j !== i))}><Icon name="x" size={14} /></button>
            </span>
          ))}
        </div>
        <div className="field">
          <label htmlFor="new-item">준비물 추가</label>
          <input
            id="new-item" type="text" value={newItem} placeholder="예: 여분 안경 (Enter로 추가)"
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (newItem.trim()) setItems([...items, { label: newItem.trim() }]);
                setNewItem('');
              }
            }}
          />
        </div>
        <Field label="반입 금지 물품 메모"><input type="text" {...bind('prohibited_items')} placeholder="예: 전자기기, 탁상시계" /></Field>
      </>
    )],
    ['H', '결과와 메모', '', false, (
      <>
        <Field label="결과">
          <select {...bind('result_status')}>
            <option value="pending">대기</option><option value="first_pass">1단계 합격</option><option value="final_pass">최종 합격</option><option value="waitlist">예비</option><option value="fail">불합격</option>
          </select>
        </Field>
        {v.result_status === 'waitlist' && <Field label="예비 번호"><input type="number" inputMode="numeric" {...bind('waitlist_no')} /></Field>}
        <Field label="시험 후기·가채점" full><textarea {...bind('review_memo')} /></Field>
        <Field label="자유 메모" full><textarea {...bind('memo')} /></Field>
      </>
    )],
  ];

  return (
    <>
      <header className="topbar">
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="취소"><Icon name="x" /></button>
        <h1>{editing ? `${editing.short_name} 정보 수정` : '대학 등록'}</h1>
        <span className="sub">필수: 대학 이름 · 약칭 · 학과. 나머지는 정보가 나오는 대로 채웁니다.</span>
        <span className="sp" />
        {editing && <button className="btn danger" onClick={remove} disabled={busy}><Icon name="trash" size={18} />대학 삭제</button>}
        <button className="btn sec" onClick={() => nav(-1)}>취소</button>
        <button className="btn pri" onClick={() => submit()} disabled={busy}>{busy ? '저장 중…' : '저장'}</button>
      </header>
      <div className="page">
        {error && <div className="warnbox d" role="alert">{error}</div>}
        <form className="uform" onSubmit={submit}>
          <nav className="toc" aria-label="섹션">
            {secs.map(([k, l]) => (
              <button
                type="button" key={k}
                onClick={() => {
                  const d = document.getElementById(`sec-${k}`) as HTMLDetailsElement;
                  d.open = true;
                  d.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                {k}. {l}
              </button>
            ))}
          </nav>
          <div className="fgrid">
            {secs.map(([k, l, c, open, body]) => (
              <details key={k} className="fsec" id={`sec-${k}`} open={open}>
                <summary>
                  {k}. {l} <span className="c">{c}</span>
                </summary>
                <div className="fbody">{body}</div>
              </details>
            ))}
          </div>
          {/* Enter로 저장 (PRD 6.3) */}
          <button type="submit" hidden />
        </form>
      </div>
    </>
  );
}

function Field({ label, err, hint, full, children }: { label: string; err?: string; hint?: string; full?: boolean; children: ReactNode }) {
  return (
    <label className={'field' + (full ? ' full' : '')}>
      <span className="lb">{label}</span>
      {children}
      {err && <span className="err">{err}</span>}
      {!err && hint && <span className="hint" style={{ color: 'var(--warn)' }}>{hint}</span>}
    </label>
  );
}

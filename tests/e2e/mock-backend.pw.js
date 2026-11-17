// 화면 확인용 가짜 Supabase (PostgREST·Auth 일부만 흉내). 운영 DB를 건드리지 않고 로그인~입력 흐름을 확인합니다.
// Playwright MCP browser_run_code의 filename으로 실행하는 함수 하나입니다. 실행 후 globalThis.__mock = { db, log }.
async (page) => {
const SUPA = 'https://sobpuuaxqnkyfbkgfyxq.supabase.co';
const DIST = 'C:/WORK-Claude/TExam Calendar/dist';

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => ((Math.random() * 16) | 0).toString(16));
}

function seedData() {
  const fam = { id: 'fam-1', name: '우리 가족', invite_code: '7KQ2M9XA', settings: { overlap_gap_min: 120, default_exam_min: 120, default_buffer_min: 30 } };
  const mk = (id, name, short, dept, color, extra = {}) => ({
    id, family_id: 'fam-1', name, short_name: short, department: dept, color, priority: 'target', quota: null, competition_rate: null,
    exam_types: ['english'], score_ratio: null, stage_type: null, exam_format: null, apply_agency: 'jinhak', exam_number: null,
    receipt_number: null, application_fee: 60000, fee_paid: false, ticket_printed: false, admission_phone: null, homepage_url: null,
    guide_url: null, venue: null, map_url: null, transit: null, travel_min: null, buffer_min: 30, prohibited_items: null,
    result_status: 'pending', waitlist_no: null, review_memo: null, memo: null, created_at: '2026-11-17T00:00:00Z', ...extra,
  });
  // design-mockup.html과 같은 가상 데이터: 대학 12곳, 일정 약 40개 (PRD F9 완료 기준 규모)
  const U = [
    mk('u-kk', '건국대학교', '건국', '경영학과', '#1D4ED8', { priority: 'first', exam_number: 'K-30217', fee_paid: true, ticket_printed: true, venue: '새천년관 3층 301호', transit: '2·7호선 건대입구역 6번 출구 → 도보 8분', travel_min: 55, admission_phone: '02-450-0007', application_fee: 65000 }),
    mk('u-sk', '성균관대학교', '성대', '경영학과', '#C2410C', { priority: 'reach', exam_types: ['english', 'interview'], application_fee: 70000, apply_agency: 'uway', exam_number: 'S-11408', fee_paid: true, venue: '경영관 2층 33201호', travel_min: 65 }),
    mk('u-kh', '경희대학교', '경희', '경영학과', '#BE185D'),
    mk('u-hy', '한양대학교', '한양', '경영학부', '#047857', { exam_number: 'H-52031', fee_paid: true, venue: '제1공학관 1층', travel_min: 50, application_fee: 65000 }),
    mk('u-ca', '중앙대학교', '중앙', '경영학부', '#6D28D9', { exam_number: 'C-20944', fee_paid: true, ticket_printed: true, venue: '310관 B4층', travel_min: 60, apply_agency: 'uway' }),
    mk('u-dg', '동국대학교', '동국', '경영학과', '#0E7490', { priority: 'safe', exam_types: ['english', 'document'], apply_agency: 'uway' }),
    mk('u-hi', '홍익대학교', '홍익', '경영학부', '#B45309'),
    mk('u-ss', '숭실대학교', '숭실', '경영학부', '#475569', { priority: 'safe', application_fee: 55000 }),
    mk('u-sj', '세종대학교', '세종', '경영학부', '#A21CAF', { priority: 'safe', application_fee: 55000, apply_agency: 'uway' }),
    mk('u-kw', '광운대학교', '광운', '경영학부', '#4D7C0F', { priority: 'safe', application_fee: 55000 }),
    mk('u-km', '국민대학교', '국민', '경영학부', '#7C2D12', { priority: 'safe', exam_types: ['english', 'interview'], application_fee: 55000, apply_agency: 'uway' }),
    mk('u-ih', '인하대학교', '인하', '경영학과', '#4338CA', { priority: 'safe', application_fee: 55000 }),
  ];
  let n = 0;
  const ev = (u, type, date, extra = {}) => ({
    id: 'e' + ++n, family_id: 'fam-1', university_id: u, event_type: type, title: null, start_date: date, end_date: null,
    check_in_time: null, start_time: null, end_time: null, venue: null, map_url: null, round_no: null, memo: null, updated_at: '2026-11-17T00:00:00Z', ...extra,
  });
  const ex = (u, date, ci, st, et, type = 'exam') => ev(u, type, date, { check_in_time: ci + ':00', start_time: st + ':00', end_time: et + ':00' });
  const ap = (u, s, e, t) => ev(u, 'apply', s, { end_date: e, end_time: t + ':00' });
  const E = [
    ev('u-sk', 'other', '2026-11-27', { title: '모집요강 발표' }), ev('u-kk', 'other', '2026-11-30', { title: '모집요강 발표' }),
    ap('u-kk', '2026-12-01', '2026-12-03', '18:00'), ap('u-sk', '2026-12-02', '2026-12-04', '17:00'), ap('u-hy', '2026-12-07', '2026-12-09', '18:00'),
    ap('u-ca', '2026-12-08', '2026-12-10', '17:00'), ap('u-kh', '2026-12-09', '2026-12-11', '18:00'), ap('u-dg', '2026-12-14', '2026-12-16', '17:00'),
    ap('u-hi', '2026-12-14', '2026-12-16', '18:00'), ap('u-ss', '2026-12-15', '2026-12-17', '17:00'),
    ev('u-kk', 'venue_notice', '2026-12-18', { start_time: '14:00:00' }),
    ex('u-kk', '2026-12-24', '09:30', '10:00', '11:00'),
    ex('u-ca', '2026-12-27', '09:00', '09:30', '11:00'), ex('u-hy', '2026-12-27', '13:30', '14:00', '15:00'),
    ex('u-ss', '2027-01-03', '09:30', '10:00', '11:00'), ev('u-kk', 'first_result', '2027-01-06', { start_time: '14:00:00' }),
    ex('u-sj', '2027-01-09', '13:30', '14:00', '15:00'),
    ex('u-kh', '2027-01-10', '09:30', '10:00', '11:30'), ex('u-sk', '2027-01-10', '13:00', '13:30', '15:00'),
    ev('u-kk', 'doc_deadline', '2027-01-12', { end_time: '17:00:00' }), ev('u-sk', 'first_result', '2027-01-14', { start_time: '10:00:00' }),
    ex('u-kw', '2027-01-16', '09:30', '10:00', '11:00'),
    ex('u-dg', '2027-01-17', '09:30', '10:00', '11:30'), ex('u-hi', '2027-01-17', '11:00', '11:30', '12:30'),
    ev('u-hy', 'first_result', '2027-01-20', { start_time: '14:00:00' }), ex('u-sk', '2027-01-21', '13:30', '14:00', '17:00', 'interview'),
    ex('u-km', '2027-01-23', '09:30', '10:00', '11:00'), ex('u-ih', '2027-01-24', '12:30', '13:00', '14:00'),
    ex('u-km', '2027-01-30', '09:30', '10:00', '12:00', 'interview'),
    ev('u-kk', 'final_result', '2027-02-02', { start_time: '14:00:00' }), ev('u-sk', 'final_result', '2027-02-04', { start_time: '10:00:00' }),
    ev('u-hy', 'final_result', '2027-02-05', { start_time: '14:00:00' }), ev('u-ca', 'final_result', '2027-02-05', { start_time: '10:00:00' }),
    ev('u-kk', 'payment', '2027-02-10', { end_date: '2027-02-12', end_time: '16:00:00' }),
    ev('u-kk', 'extra_result', '2027-02-15', { start_time: '10:00:00', round_no: 1 }), ev('u-kk', 'extra_result', '2027-02-18', { start_time: '10:00:00', round_no: 2 }),
    ev('u-sk', 'payment', '2027-02-10', { end_date: '2027-02-12', end_time: '16:00:00' }), ev('u-hy', 'payment', '2027-02-11', { end_date: '2027-02-13', end_time: '16:00:00' }),
    ev('u-sk', 'doc_deadline', '2027-01-18', { end_time: '17:00:00' }), ev('u-km', 'doc_deadline', '2027-01-27', { end_time: '17:00:00' }),
  ];
  const C = ['수험표(2~3장 출력)', '실물 신분증', '컴퓨터용 사인펜', '수정테이프', '아날로그 손목시계', '교통카드', '소액 현금'].flatMap((label, i) =>
    U.map((u) => ({ id: `c-${u.id}-${i}`, family_id: 'fam-1', university_id: u.id, label, checked: false, sort_order: i })),
  );
  const doc = (id, u, t, status, how) => ({ id, family_id: 'fam-1', university_id: u, doc_type: t, custom_name: null, status, submit_method: how, mail_basis: how === 'mail' ? 'arrival' : null, original_required: false, memo: null });
  const D = [
    doc('d1', 'u-kk', 'transcript', 'ready', 'upload'), doc('d2', 'u-kk', 'completion_cert', 'todo', 'upload'), doc('d3', 'u-kk', 'study_plan', 'submitted', 'upload'),
    doc('d4', 'u-sk', 'study_plan', 'todo', 'mail'), doc('d5', 'u-km', 'self_intro', 'todo', 'upload'), doc('d6', 'u-km', 'transcript', 'ready', 'visit'),
  ];
  return {
    tcal_families: [fam],
    tcal_family_members: [{ family_id: 'fam-1', user_id: 'user-1', role: 'student', display_name: '지우', joined_at: '2026-11-17T00:00:00Z' }],
    tcal_universities: U,
    tcal_events: E,
    tcal_documents: D,
    tcal_checklist_items: C,
  };
}

function applyFilters(rows, params) {
  let out = rows;
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'columns'].includes(k)) continue;
    if (v.startsWith('eq.')) out = out.filter((r) => String(r[k]) === v.slice(3));
    else if (v.startsWith('in.(')) {
      const set = v.slice(4, -1).split(',').map((s) => s.replace(/^"|"$/g, ''));
      out = out.filter((r) => set.includes(String(r[k])));
    }
  }
  return out;
}

  const install = async (page, opts = {}) => {
  const db = opts.empty ? { tcal_families: [], tcal_family_members: [], tcal_universities: [], tcal_events: [], tcal_documents: [], tcal_checklist_items: [] } : seedData();
  const log = [];
  const user = { id: 'user-1', email: 'test@example.com', aud: 'authenticated', role: 'authenticated' };

  await page.route('http://app.local/**', (r) => {
    let p = new URL(r.request().url()).pathname;
    if (p === '/') p = '/index.html';
    return r.fulfill({ path: DIST + decodeURIComponent(p) });
  });

  await page.route(SUPA + '/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.pathname.startsWith('/auth/v1/token')) {
      const body = req.postDataJSON() || {};
      if (body.password === 'wrong') return json({ error: 'invalid_grant', error_description: 'Invalid login credentials', msg: 'Invalid login credentials', code: 'invalid_credentials' }, 400);
      return json({ access_token: 'fake.jwt.token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r', user });
    }
    if (url.pathname.startsWith('/auth/v1/user')) return json(user);
    if (url.pathname.startsWith('/auth/v1/logout')) return route.fulfill({ status: 204 });

    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      const fn = url.pathname.split('/').pop();
      const b = req.postDataJSON();
      log.push([method, fn, b]);
      if (fn === 'tcal_create_family') {
        const id = uuid();
        db.tcal_families.push({ id, name: b.family_name, invite_code: 'ABCD1234', settings: { overlap_gap_min: 120, default_exam_min: 120, default_buffer_min: 30 } });
        db.tcal_family_members.push({ family_id: id, user_id: user.id, role: b.member_role, display_name: b.member_name, joined_at: new Date().toISOString() });
        return json(id);
      }
      if (fn === 'tcal_join_family') {
        const fam = db.tcal_families.find((f) => f.invite_code === String(b.code).toUpperCase());
        if (!fam) return json({ code: 'P0001', message: 'invalid invite code' }, 400);
        db.tcal_family_members.push({ family_id: fam.id, user_id: user.id, role: b.member_role, display_name: b.member_name, joined_at: new Date().toISOString() });
        return json(fam.id);
      }
    }

    const table = url.pathname.replace('/rest/v1/', '');
    const rows = db[table];
    if (!rows) return json({ message: 'unknown table ' + table }, 404);
    const params = [...url.searchParams.entries()];
    const single = (req.headers()['accept'] || '').includes('vnd.pgrst.object');

    if (method === 'GET') {
      let out = applyFilters(rows, params);
      const limit = url.searchParams.get('limit');
      if (limit) out = out.slice(0, Number(limit));
      return json(single ? out[0] : out);
    }
    if (method === 'POST') {
      const body = req.postDataJSON();
      const list = (Array.isArray(body) ? body : [body]).map((r) => ({ id: uuid(), created_at: new Date().toISOString(), ...r }));
      rows.push(...list);
      log.push([method, table, body]);
      return json(single ? list[0] : list, 201);
    }
    if (method === 'PATCH') {
      const body = req.postDataJSON();
      const hit = applyFilters(rows, params);
      hit.forEach((r) => Object.assign(r, body));
      log.push([method, table, body, hit.length]);
      return route.fulfill({ status: 204 });
    }
    if (method === 'DELETE') {
      const hit = new Set(applyFilters(rows, params));
      db[table] = rows.filter((r) => !hit.has(r));
      if (table === 'tcal_universities') {
        const ids = new Set([...hit].map((r) => r.id));
        for (const t of ['tcal_events', 'tcal_documents', 'tcal_checklist_items']) db[t] = db[t].filter((r) => !ids.has(r.university_id));
      }
      log.push([method, table, hit.size]);
      return route.fulfill({ status: 204 });
    }
    return json({ message: 'unsupported' }, 400);
  });

  return { db, log };
  };
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  globalThis.__mock = await install(page);
  return 'mock installed';
}

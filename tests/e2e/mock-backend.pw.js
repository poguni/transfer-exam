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
  const U = [
    mk('u-kk', '건국대학교', '건국', '경영학과', '#1D4ED8', { priority: 'first', exam_number: 'K-30217', fee_paid: true, ticket_printed: true, venue: '새천년관 3층 301호', transit: '2·7호선 건대입구역 6번 출구 → 도보 8분', travel_min: 55, admission_phone: '02-450-0007', application_fee: 65000 }),
    mk('u-sk', '성균관대학교', '성대', '경영학과', '#C2410C', { priority: 'reach', exam_types: ['english', 'interview'], application_fee: 70000, apply_agency: 'uway' }),
    mk('u-kh', '경희대학교', '경희', '경영학과', '#BE185D'),
  ];
  const ev = (id, u, type, date, extra = {}) => ({
    id, family_id: 'fam-1', university_id: u, event_type: type, title: null, start_date: date, end_date: null,
    check_in_time: null, start_time: null, end_time: null, venue: null, map_url: null, round_no: null, memo: null, ...extra,
  });
  const E = [
    ev('e1', 'u-kk', 'apply', '2026-12-01', { end_date: '2026-12-03', end_time: '18:00:00' }),
    ev('e2', 'u-kk', 'exam', '2026-12-24', { check_in_time: '09:30:00', start_time: '10:00:00', end_time: '11:00:00' }),
    ev('e3', 'u-kh', 'exam', '2027-01-10', { check_in_time: '09:30:00', start_time: '10:00:00', end_time: '11:30:00' }),
    ev('e4', 'u-sk', 'exam', '2027-01-10', { check_in_time: '13:00:00', start_time: '13:30:00', end_time: '15:00:00' }),
    ev('e5', 'u-kk', 'doc_deadline', '2027-01-12', { end_time: '17:00:00' }),
  ];
  const C = ['수험표(2~3장 출력)', '실물 신분증', '컴퓨터용 사인펜', '수정테이프', '아날로그 손목시계', '교통카드', '소액 현금'].flatMap((label, i) =>
    U.map((u) => ({ id: `c-${u.id}-${i}`, family_id: 'fam-1', university_id: u.id, label, checked: false, sort_order: i })),
  );
  const D = [{ id: 'd1', family_id: 'fam-1', university_id: 'u-kk', doc_type: 'transcript', custom_name: null, status: 'ready', submit_method: 'upload', mail_basis: null, original_required: false, memo: null }];
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

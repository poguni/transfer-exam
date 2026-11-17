import { HashRouter, Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router';
import { MorePage } from './pages/MorePage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FamilyProvider, FullMessage, useFamily, useMembership, useSession } from './app/state';
import { ToastProvider } from './ui/toast';
import { Icon, type IconName } from './ui/Icon';
import { LoginPage } from './pages/LoginPage';
import { FamilySetupPage } from './pages/FamilySetupPage';
import { CalendarPage } from './pages/CalendarPage';
import { UnivListPage } from './pages/UnivListPage';
import { UnivDetailPage } from './pages/UnivDetailPage';
import { UnivFormPage } from './pages/UnivFormPage';
import { OverlapPage } from './pages/OverlapPage';
import { SettingsPage } from './pages/SettingsPage';
import { DocsPage } from './pages/DocsPage';
import { ExportPage } from './pages/ExportPage';
import { PrintPage } from './pages/PrintPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true } },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <HashRouter>
          <AuthGate />
        </HashRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

function AuthGate() {
  const { session, loading } = useSession();
  if (loading) return <FullMessage title="불러오는 중…" />;
  if (!session) return <LoginPage />;
  return <MembershipGate userId={session.user.id} />;
}

function MembershipGate({ userId }: { userId: string }) {
  const m = useMembership(userId);
  if (m.isPending) return <FullMessage title="불러오는 중…" />;
  // 보관본이 있으면 연결이 안 되어도 계속 보여 줌
  if (m.error && !m.data) return <FullMessage title="가족 정보를 불러오지 못했습니다" body={m.error.message} />;
  if (!m.data) return <FamilySetupPage userId={userId} />;
  return (
    <FamilyProvider userId={userId} membership={m.data}>
      <Shell />
    </FamilyProvider>
  );
}

const NAV: (null | { to: string; label: string; icon: IconName; end?: boolean; badge?: 'overlap' })[] = [
  { to: '/', label: '달력', icon: 'cal', end: true },
  { to: '/univs', label: '지원 현황', icon: 'uni' },
  { to: '/docs', label: '서류·준비물', icon: 'doc' },
  { to: '/overlap', label: '겹치는 일정', icon: 'warn', badge: 'overlap' },
  null,
  { to: '/export', label: '캘린더 내보내기', icon: 'share' },
  { to: '/print', label: 'A4 인쇄', icon: 'print' },
  { to: '/settings', label: '설정', icon: 'gear' },
];

function Shell() {
  const f = useFamily();
  const badDays = [...f.overlapLevel.entries()].filter(([d, lv]) => d >= f.today && lv !== 'info').length;
  return (
    <div className="app">
      <nav className="nav" aria-label="주 메뉴">
        <Link className="brand" to="/" aria-label="편입 캘린더 달력으로" title="달력으로">
          <span className="logo" aria-hidden="true">편</span>
          <div className="t">
            <b>편입 캘린더</b>
            <small>TExam Calendar · 2027</small>
          </div>
        </Link>
        {NAV.map((n, i) =>
          n ? (
            <NavLink key={n.to} to={n.to} end={n.end} title={n.label} className={({ isActive }) => 'ni' + (isActive ? ' active' : '')}>
              <Icon name={n.icon} size={22} />
              <span className="l">{n.label}</span>
              {n.badge && badDays > 0 && <span className="cnt">{badDays}</span>}
            </NavLink>
          ) : (
            <div key={i} className="nav-sep" />
          ),
        )}
        <div className="nav-foot">
          <span className="avatar">{(f.member.display_name || '나').slice(0, 1)}</span>
          <span className="t">
            {f.family.name} · {f.members.length}명
            <br />
            {f.member.display_name} ({f.member.role === 'student' ? '자녀' : '부모'})
          </span>
        </div>
      </nav>
      <main className="main">
        <Routes>
          <Route path="/more" element={<MorePage />} />
          <Route path="/" element={<CalendarPage />} />
          <Route path="/univs" element={<UnivListPage />} />
          <Route path="/univs/new" element={<UnivFormPage />} />
          <Route path="/univs/:id" element={<UnivDetailPage />} />
          <Route path="/univs/:id/edit" element={<UnivFormPage />} />
          <Route path="/overlap" element={<OverlapPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/export" element={<ExportPage />} />
          <Route path="/print" element={<PrintPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <TabBar />
    </div>
  );
}

/** 모바일 하단 탭 막대 (DESIGN 5장, 6장): 달력 · 대학 · 서류 · 더보기 */
function TabBar() {
  const { pathname } = useLocation();
  const tabs: { to: string; label: string; icon: IconName; on: boolean }[] = [
    { to: '/', label: '달력', icon: 'cal', on: pathname === '/' },
    { to: '/univs', label: '대학', icon: 'uni', on: pathname.startsWith('/univs') },
    { to: '/docs', label: '서류', icon: 'doc', on: pathname.startsWith('/docs') },
    { to: '/more', label: '더보기', icon: 'more', on: ['/more', '/settings', '/overlap', '/export', '/print'].some((p) => pathname.startsWith(p)) },
  ];
  return (
    <nav className="tabbar" aria-label="주 메뉴">
      {tabs.map((t) => (
        <Link key={t.to} to={t.to} aria-current={t.on ? 'page' : undefined}>
          <Icon name={t.icon} size={24} />
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

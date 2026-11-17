import { Link } from 'react-router';
import { useFamily } from '../app/state';
import { THEMES, getSavedTheme } from '../lib/themes';
import { signOut } from '../lib/offline';
import { Icon, type IconName } from '../ui/Icon';

/** 모바일 더보기: 인쇄·내보내기·겹침·설정으로 가는 목록 (DESIGN 7장) */
export function MorePage() {
  const f = useFamily();
  const bad = [...f.overlapLevel.entries()].filter(([d, lv]) => d >= f.today && lv !== 'info');
  const nConflict = bad.filter(([, lv]) => lv === 'conflict').length;
  const theme = THEMES.find((t) => t.id === getSavedTheme())!;
  const items: [string, IconName, string, string][] = [
    ['/settings', 'gear', '테마 · 설정', `테마: ${theme.name} · 겹침 기준 ${f.family.settings.overlap_gap_min}분`],
    ['/overlap', 'warn', '겹치는 일정', bad.length ? `충돌 ${nConflict} · 주의 ${bad.length - nConflict}` : '겹치는 시험 없음'],
    ['/export', 'share', '아이폰 캘린더로 내보내기(.ics)', '전체 · 대학별 · 시험·면접만'],
    ['/print', 'print', 'A4 인쇄', '세로형 한 달 한 장 · 가로형 두 달 한 장'],
  ];
  return (
    <>
      <header className="topbar m-appbar">
        <h1>더보기</h1>
      </header>
      <div className="page">
        <div className="card" style={{ padding: '4px 14px' }}>
          {items.map(([to, icon, title, sub]) => (
            <Link key={to} className="li" to={to}>
              <span className="ab soft"><Icon name={icon} /></span>
              <span>
                <span className="n">{title}</span>
                <br />
                <span className="m">{sub}</span>
              </span>
              <Icon name="chev" size={18} />
            </Link>
          ))}
        </div>
        <div className="card" style={{ padding: '4px 14px' }}>
          <div className="li" style={{ cursor: 'default' }}>
            <span className="ab soft"><Icon name="uni" /></span>
            <span>
              <span className="n">{f.family.name}</span>
              <br />
              <span className="m">초대 코드 {f.family.invite_code} · {f.members.length}명</span>
            </span>
            <span />
          </div>
          <button className="li" onClick={() => signOut()}>
            <span className="ab soft"><Icon name="logout" /></span>
            <span className="n">로그아웃</span>
            <span />
          </button>
        </div>
        <p className="sub muted" style={{ textAlign: 'center', fontSize: 12 }}>편입 캘린더(TExam Calendar) v0.1</p>
      </div>
    </>
  );
}

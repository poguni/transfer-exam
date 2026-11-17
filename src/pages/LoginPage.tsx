import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

/** 로그인 (PRD F1). Link Plan과 같은 이메일·비밀번호 계정. 회원가입 화면은 두지 않습니다. */
export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(error.message === 'Invalid login credentials' ? '이메일 또는 비밀번호가 맞지 않습니다.' : error.message);
  }

  return (
    <div className="auth">
      <div className="auth-hero">
        <span className="logo" style={{ background: 'var(--accent-ink)', color: 'var(--accent)' }}>편</span>
        <h1>편입 캘린더</h1>
        <p>2027학년도 편입 시험 일정을 11월부터 2월까지 한 달력에서.</p>
        <p style={{ fontSize: 13 }}>TExam Calendar</p>
      </div>
      <div className="auth-form">
        <form onSubmit={submit}>
          <h2>로그인</h2>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>Link Plan과 같은 계정으로 로그인합니다.</p>
          <div className="field">
            <label htmlFor="email">이메일</label>
            <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pw">비밀번호</label>
            <input id="pw" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div className="warnbox d" role="alert">{error}</div>}
          <button className="btn pri block" disabled={busy}>{busy ? '로그인 중…' : '로그인'}</button>
        </form>
      </div>
    </div>
  );
}

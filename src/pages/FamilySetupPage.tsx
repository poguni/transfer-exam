import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createFamily, joinFamily } from '../lib/db';
import { signOut } from '../lib/offline';
import type { Member } from '../lib/types';

/** 처음 로그인: 가족 만들기 또는 초대 코드로 참여 (PRD F1-2) */
export function FamilySetupPage({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [familyName, setFamilyName] = useState('우리 가족');
  const [code, setCode] = useState('');
  const [role, setRole] = useState<Member['role']>('student');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'create') await createFamily(familyName, role, name.trim());
      else await joinFamily(code, role, name.trim());
      await qc.invalidateQueries({ queryKey: ['membership', userId] });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg.includes('invalid invite code') ? '초대 코드를 찾을 수 없습니다. 8자리를 다시 확인해 주세요.' : msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-hero">
        <h1>가족과 함께 보기</h1>
        <p>먼저 가족을 만들면 8자리 초대 코드가 생깁니다. 다른 가족은 그 코드로 들어와 같은 달력을 봅니다.</p>
      </div>
      <div className="auth-form">
        <form onSubmit={submit}>
          <div className="seg" role="tablist" aria-label="가족 설정 방법" style={{ alignSelf: 'flex-start' }}>
            <button type="button" aria-pressed={mode === 'create'} onClick={() => setMode('create')}>가족 만들기</button>
            <button type="button" aria-pressed={mode === 'join'} onClick={() => setMode('join')}>초대 코드로 참여</button>
          </div>
          {mode === 'create' ? (
            <div className="field">
              <label htmlFor="fname">가족 이름</label>
              <input id="fname" type="text" value={familyName} onChange={(e) => setFamilyName(e.target.value)} />
            </div>
          ) : (
            <div className="field">
              <label htmlFor="code">초대 코드(8자리)</label>
              <input id="code" type="text" required maxLength={8} autoCapitalize="characters" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="num-sm" />
            </div>
          )}
          <div className="field">
            <span className="lb">나는</span>
            <div className="opts">
              <label><input type="radio" name="role" checked={role === 'student'} onChange={() => setRole('student')} /> 자녀(편입 준비생)</label>
              <label><input type="radio" name="role" checked={role === 'parent'} onChange={() => setRole('parent')} /> 부모</label>
            </div>
          </div>
          <div className="field">
            <label htmlFor="dname">표시 이름</label>
            <input id="dname" type="text" required placeholder="예: 지우, 엄마" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {error && <div className="warnbox d" role="alert">{error}</div>}
          <button className="btn pri block" disabled={busy}>{mode === 'create' ? '가족 만들기' : '참여하기'}</button>
          <button type="button" className="btn ghost" onClick={() => signOut()}>로그아웃</button>
        </form>
      </div>
    </div>
  );
}

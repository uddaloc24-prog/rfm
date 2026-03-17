'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        router.push('/admin');
      } else {
        setError('Invalid credentials');
        setPassword('');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6" style={{ background: '#FAFAF8' }}>
      <h1 className="font-display font-black text-3xl mb-1" style={{ color: '#E8611A' }}>rfm.</h1>
      <p className="font-body text-sm mb-10" style={{ color: '#9B8E84' }}>Admin access</p>

      <form onSubmit={handleLogin} className="w-full max-w-xs flex flex-col gap-3">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => { setUsername(e.target.value); setError(''); }}
          autoComplete="off"
          className="w-full px-4 py-4 rounded-2xl font-body text-base outline-none"
          style={{ background: '#FFFFFF', border: '1.5px solid #E8E2DC', color: '#1A1205' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(''); }}
          className="w-full px-4 py-4 rounded-2xl font-body text-base outline-none"
          style={{ background: '#FFFFFF', border: '1.5px solid #E8E2DC', color: '#1A1205' }}
        />
        {error && (
          <p className="font-body text-sm text-center" style={{ color: '#EF4444' }}>{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-2xl font-body font-semibold text-base active:opacity-80 disabled:opacity-60 mt-1"
          style={{ background: '#E8611A', color: '#FFFFFF' }}
        >
          {loading ? 'Signing in…' : 'Enter'}
        </button>
      </form>
    </div>
  );
}

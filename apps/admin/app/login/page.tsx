'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { api, clearAdminAuth, setAdminToken, setAdminUser } from '../../lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('sudip241281@gmail.com');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('error') === 'access-denied') {
      setError('Access denied. Only Admin and Super Admin accounts can access this portal.');
    }
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password should be at least 6 characters long.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const data = await api.post<{ token: string; user: any }>('/auth/login', { email, password });
      if (data.user.role !== 'ADMIN' && data.user.role !== 'SUPER_ADMIN') {
        clearAdminAuth();
        setError('Access denied. Only Admin and Super Admin accounts can access this portal.');
        return;
      }
      setAdminToken(data.token);
      setAdminUser(data.user);
      router.push('/dashboard');
    } catch (e: any) {
      setError(e.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const updateEmail = (event: ChangeEvent<HTMLInputElement>) => setEmail(event.currentTarget.value);
  const updatePassword = (event: ChangeEvent<HTMLInputElement>) => setPassword(event.currentTarget.value);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: "linear-gradient(180deg, rgba(18,9,11,0.62), rgba(28,12,18,0.82)), url('/images/hero-durga-puja.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        padding: '2rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'rgba(26, 14, 17, 0.8)',
          border: '1px solid rgba(247, 200, 104, 0.48)',
          borderRadius: 22,
          padding: '2rem',
          boxShadow: '0 20px 45px rgba(0,0,0,0.25)',
          backdropFilter: 'blur(4px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #f4d383, #c77921)',
              display: 'grid',
              placeItems: 'center',
              color: '#1d0d0f',
              fontWeight: 900,
            }}
          >
            C
          </div>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 1.2, color: '#f9d27a' }}>CTR-CMS</div>
            <div style={{ fontSize: 11, letterSpacing: 1.2, color: '#f4d7a0', textTransform: 'uppercase' }}>Belgharia Club Town Cultural Association</div>
          </div>
        </div>

        <p style={{ margin: '0.5rem 0 1.5rem', color: '#fbe9c9', fontSize: 15 }}>Admin sign in</p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <label style={{ display: 'grid', gap: '0.4rem', color: '#f7e4b1' }}>
            <span style={{ fontWeight: 600 }}>Email</span>
            <input
              aria-label="Admin email"
              value={email}
              onChange={updateEmail}
              style={{
                padding: '0.85rem 1rem',
                border: '1px solid rgba(245, 196, 92, 0.5)',
                borderRadius: 12,
                fontSize: 16,
                background: 'rgba(255,255,255,0.96)',
                color: '#111827',
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: '0.4rem', color: '#f7e4b1' }}>
            <span style={{ fontWeight: 600 }}>Password</span>
            <input
              aria-label="Admin password"
              type="password"
              value={password}
              onChange={updatePassword}
              style={{
                padding: '0.85rem 1rem',
                border: '1px solid rgba(245, 196, 92, 0.5)',
                borderRadius: 12,
                fontSize: 16,
                background: 'rgba(255,255,255,0.96)',
                color: '#111827',
              }}
            />
          </label>

          {error ? <div style={{ color: '#ffd7d7', fontSize: 14 }}>{error}</div> : null}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #f4d383, #c77921)',
              color: '#1b0f12',
              border: 'none',
              borderRadius: 12,
              padding: '0.9rem 1rem',
              fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: '#fdd17e', textDecoration: 'none' }}>Back to home</Link>
          <Link href="/dashboard" style={{ color: '#fdd17e', textDecoration: 'none' }}>Open dashboard</Link>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
          <Link href="/" style={{ color: '#fff7ea', textDecoration: 'none', fontWeight: 800, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(249,210,122,0.35)', borderRadius: 999, padding: '0.7rem 1rem' }}>Logout</Link>
        </div>
      </div>
    </main>
  );
}

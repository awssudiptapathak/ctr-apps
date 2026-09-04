'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface DashboardStats {
  residents: number;
  events: number;
  programs: number;
  nominations: number;
  tickets: number;
  pendingAdminRequests: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<DashboardStats>('/dashboard')
      .then(setStats)
      .catch((e: any) => setError(e.message || 'Failed to load dashboard'));
  }, []);

  const metrics = stats
    ? [
        { label: 'Residents', value: stats.residents.toLocaleString('en-IN') },
        { label: 'Events', value: stats.events },
        { label: 'Programs', value: stats.programs },
        { label: 'Nominations', value: stats.nominations },
        { label: 'Tickets', value: stats.tickets },
        { label: 'Pending admin requests', value: stats.pendingAdminRequests },
      ]
    : [];

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundImage:
          "linear-gradient(180deg, rgba(18,9,11,0.88), rgba(48,16,16,0.94)), url('/images/festival-bg.jpeg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: '#fff7ea',
        padding: '2rem 1.25rem 3rem',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <img
            src="/images/icon.png"
            alt="CTR"
            style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'cover', border: '2px solid rgba(249,210,122,0.4)' }}
          />
          <div>
            <div style={{ color: '#f9d27a', fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 700 }}>
              Operations board
            </div>
            <h1 style={{ margin: '0.25rem 0 0', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>
              Admin Dashboard
            </h1>
            <p style={{ margin: '0.25rem 0 0', color: '#f5e7c7' }}>Committee operations overview</p>
          </div>
        </div>

        {error && (
          <div style={{ marginTop: '1rem', background: '#fee2e2', color: '#7f1d1d', borderRadius: 12, padding: '0.9rem 1rem', fontWeight: 700 }}>
            {error}
          </div>
        )}

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '1rem',
            marginTop: '1.75rem',
          }}
        >
          {!stats
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ background: 'rgba(25,12,14,0.7)', border: '1px solid rgba(249,210,122,0.3)', borderRadius: 18, padding: '1.25rem', minHeight: 90 }}>
                  <div style={{ color: '#f9e7b0', fontSize: 13 }}>Loading…</div>
                </div>
              ))
            : metrics.map((metric) => (
                <div
                  key={metric.label}
                  style={{
                    background: 'rgba(25,12,14,0.7)',
                    border: '1px solid rgba(249,210,122,0.3)',
                    borderRadius: 18,
                    padding: '1.25rem',
                  }}
                >
                  <div style={{ color: '#f9e7b0', fontSize: 13 }}>{metric.label}</div>
                  <div style={{ fontSize: 30, fontWeight: 800, marginTop: 10, color: '#f4d383' }}>
                    {metric.value}
                  </div>
                </div>
              ))}
        </section>
      </div>
    </main>
  );
}

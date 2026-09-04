'use client';

import { useCallback, useEffect, useState } from 'react';
import { type ProgramRecord } from '@ctr-cms/shared';
import { api } from '@/lib/api';

interface NominationRow {
  id: string;
  programId: string;
  userId: string;
  participantName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const statusOptions = [
  { value: 'APPROVED', label: 'Approve', color: '#22c55e' },
  { value: 'WAITLISTED', label: 'Waitlist', color: '#f59e0b' },
  { value: 'REJECTED', label: 'Reject', color: '#ef4444' },
];

export default function NominationsPage() {
  const [nominations, setNominations] = useState<NominationRow[]>([]);
  const [programs, setPrograms] = useState<ProgramRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [nomRes, progRes] = await Promise.all([
        api.get<{ nominations: NominationRow[] }>('/nominations'),
        api.get<{ programs: ProgramRecord[] }>('/programs'),
      ]);
      setNominations(nomRes.nominations);
      setPrograms(progRes.programs);
    } catch (e: any) {
      if (e.status === 401) {
        window.location.href = '/login';
      } else {
        setFlash({ type: 'error', message: e.message });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDecision = async (nominationId: string, status: string) => {
    setBusyId(nominationId);
    setFlash(null);
    try {
      await api.put(`/nominations/${nominationId}/status`, { status });
      setNominations((current) =>
        current.map((n) => (n.id === nominationId ? { ...n, status } : n)),
      );
      setFlash({ type: 'success', message: `Nomination ${status.toLowerCase()}.` });
    } catch (e: any) {
      setFlash({ type: 'error', message: e.message });
    } finally {
      setBusyId(null);
    }
  };

  const programName = (programId: string) => programs.find((p) => p.id === programId)?.name ?? 'Unknown program';

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundImage: "linear-gradient(180deg, rgba(26,12,14,0.88), rgba(53,17,21,0.94)), url('/images/festival-bg.jpeg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: '#fff7ea',
        padding: '2rem 1.25rem 3rem',
      }}
    >
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <div>
          <div style={{ color: '#f9d27a', fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 700 }}>Approvals</div>
          <h1 style={{ margin: '0.5rem 0 0', fontSize: 'clamp(2rem, 4vw, 3rem)' }}>Nominations</h1>
        </div>

        {flash ? (
          <div
            style={{
              marginTop: '1rem',
              borderRadius: 14,
              padding: '0.9rem 1rem',
              background: flash.type === 'success' ? 'rgba(34, 197, 94, 0.14)' : 'rgba(239, 68, 68, 0.14)',
              border: `1px solid ${flash.type === 'success' ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)'}`,
              color: flash.type === 'success' ? '#d1fae5' : '#fee2e2',
              fontWeight: 700,
            }}
          >
            {flash.message}
          </div>
        ) : null}

        {loading ? (
          <div style={{ marginTop: '1.5rem', background: 'rgba(25,12,14,0.75)', border: '1px solid rgba(249,210,122,0.35)', borderRadius: 18, padding: '1.5rem', textAlign: 'center', color: '#f5e7c7' }}>
            Loading nominations…
          </div>
        ) : null}

        {!loading && nominations.length === 0 ? (
          <div style={{ marginTop: '1.5rem', background: 'rgba(25,12,14,0.75)', border: '1px solid rgba(249,210,122,0.35)', borderRadius: 18, padding: '1.5rem', textAlign: 'center', color: '#f5e7c7' }}>
            No nominations yet.
          </div>
        ) : null}

        {!loading && nominations.length > 0 ? (
          <section style={{ display: 'grid', gap: '1rem', marginTop: '1.5rem' }}>
            {nominations.map((nomination) => (
              <article
                key={nomination.id}
                style={{
                  background: 'rgba(25, 12, 14, 0.8)',
                  border: '1px solid rgba(249,210,122,0.3)',
                  borderRadius: 18,
                  padding: '1.1rem 1.25rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{nomination.participantName}</div>
                    <div style={{ color: '#f4d7a0', marginTop: 4 }}>{programName(nomination.programId)}</div>
                    <div style={{ color: '#f0dba2', fontSize: 13, marginTop: 4 }}>
                      Submitted {new Date(nomination.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>

                  <span
                    style={{
                      background: nomination.status === 'APPROVED' ? '#dcfce7' : nomination.status === 'REJECTED' ? '#fee2e2' : nomination.status === 'WAITLISTED' ? '#fef3c7' : '#f3f4f6',
                      color: '#111827',
                      borderRadius: 999,
                      padding: '0.35rem 0.7rem',
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    {nomination.status}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.9rem' }}>
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={busyId === nomination.id}
                      onClick={() => handleDecision(nomination.id, option.value)}
                      style={{
                        border: 'none',
                        background: option.color,
                        color: '#fff',
                        borderRadius: 999,
                        padding: '0.45rem 0.9rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        opacity: busyId === nomination.id ? 0.6 : 1,
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </section>
        ) : null}
      </div>
    </main>
  );
}

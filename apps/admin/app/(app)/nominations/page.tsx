'use client';

import { useCallback, useEffect, useState } from 'react';
import { type ProgramRecord } from '@ctr-cms/shared';
import { api } from '@/lib/api';

interface AllocatedSlot {
  id: string;
  programId: string;
  nominationId: string;
  startAt: string;
  endAt: string;
  venue: string;
  status: string;
}

interface NominationRow {
  id: string;
  programId: string;
  userId: string;
  participantName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  allocatedSlot: AllocatedSlot | null;
}

const statusOptions = [
  { value: 'APPROVED', label: 'Approve', color: '#22c55e' },
  { value: 'WAITLISTED', label: 'Waitlist', color: '#f59e0b' },
  { value: 'REJECTED', label: 'Reject', color: '#ef4444' },
];

const statusColor = (status: string) =>
  status === 'APPROVED' || status === 'SLOT_ALLOCATED'
    ? '#dcfce7'
    : status === 'REJECTED'
      ? '#fee2e2'
      : status === 'WAITLISTED'
        ? '#fef3c7'
        : '#f3f4f6';

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export default function NominationsPage() {
  const [nominations, setNominations] = useState<NominationRow[]>([]);
  const [programs, setPrograms] = useState<ProgramRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [allocateForm, setAllocateForm] = useState<{
    nominationId: string;
    startAt: string;
    endAt: string;
    venue: string;
  } | null>(null);

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
      const res = await api.put<{ nomination: NominationRow }>(`/nominations/${nominationId}/status`, { status });
      setNominations((current) =>
        current.map((n) => (n.id === nominationId ? res.nomination : n)),
      );
      setFlash({ type: 'success', message: `Nomination ${status.toLowerCase()}.` });
    } catch (e: any) {
      setFlash({ type: 'error', message: e.message });
    } finally {
      setBusyId(null);
    }
  };

  const openAllocate = (nomination: NominationRow, eventTime?: string) => {
    setAllocateForm({
      nominationId: nomination.id,
      startAt: eventTime || '',
      endAt: '',
      venue: '',
    });
    setFlash(null);
  };

  const handleAllocateSlot = async () => {
    if (!allocateForm) return;
    if (!allocateForm.startAt || !allocateForm.endAt || !allocateForm.venue.trim()) {
      setFlash({ type: 'error', message: 'Enter start time, end time and venue.' });
      return;
    }
    setBusyId(allocateForm.nominationId);
    setFlash(null);
    try {
      const res = await api.post<{ nomination: NominationRow }>(`/nominations/${allocateForm.nominationId}/slot`, {
        startAt: allocateForm.startAt,
        endAt: allocateForm.endAt,
        venue: allocateForm.venue.trim(),
      });
      setNominations((current) =>
        current.map((n) => (n.id === allocateForm.nominationId ? res.nomination : n)),
      );
      setAllocateForm(null);
      setFlash({ type: 'success', message: 'Time slot allocated. The participant has been notified.' });
    } catch (e: any) {
      setFlash({ type: 'error', message: e.message });
    } finally {
      setBusyId(null);
    }
  };

  const programName = (programId: string) => programs.find((p) => p.id === programId)?.name ?? 'Unknown program';
  const programEventTime = (programId: string) => {
    const program = programs.find((p) => p.id === programId);
    return program?.createdAt || '';
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundImage: "linear-gradient(180deg, rgba(26,12,14,0.88), rgba(53,17,21,0.94)), url('/images/dhak-drums.jpg')",
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
            {nominations.map((nomination) => {
              const canAllocate = ['APPROVED', 'SLOT_ALLOCATED', 'PENDING', 'WAITLISTED'].includes(nomination.status);
              const isAllocateOpen = allocateForm?.nominationId === nomination.id;
              return (
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
                        Submitted {formatDateTime(nomination.createdAt)}
                      </div>
                      {nomination.allocatedSlot ? (
                        <div style={{ color: '#86efac', fontSize: 13, marginTop: 6, fontWeight: 700 }}>
                          {formatDateTime(nomination.allocatedSlot.startAt)}
                          {nomination.allocatedSlot.endAt ? ` – ${new Date(nomination.allocatedSlot.endAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}` : ''}
                          {nomination.allocatedSlot.venue ? ` • ${nomination.allocatedSlot.venue}` : ''}
                        </div>
                      ) : null}
                    </div>

                    <span
                      style={{
                        background: statusColor(nomination.status),
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

                    {canAllocate ? (
                      <button
                        type="button"
                        onClick={() =>
                          isAllocateOpen
                            ? setAllocateForm(null)
                            : openAllocate(nomination, programEventTime(nomination.programId))
                        }
                        style={{
                          border: '1px solid #f9d27a',
                          background: isAllocateOpen ? 'rgba(249,210,122,0.16)' : 'rgba(249,210,122,0.08)',
                          color: '#f9d27a',
                          borderRadius: 999,
                          padding: '0.45rem 0.9rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {nomination.allocatedSlot ? 'Reallocate' : 'Allocate time + venue'}
                      </button>
                    ) : null}
                  </div>

                  {isAllocateOpen ? (
                    <div
                      style={{
                        marginTop: '1rem',
                        background: 'rgba(10, 5, 8, 0.6)',
                        border: '1px solid rgba(249,210,122,0.35)',
                        borderRadius: 14,
                        padding: '1rem',
                        display: 'grid',
                        gap: '0.6rem',
                      }}
                    >
                      <label style={{ fontSize: 12, color: '#f9d27a', fontWeight: 700 }}>Start (date + time)</label>
                      <input
                        type="datetime-local"
                        value={allocateForm?.startAt || ''}
                        onChange={(e) => setAllocateForm((f) => (f ? { ...f, startAt: e.target.value } : f))}
                        style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #f9d27a', background: '#fff', color: '#111' }}
                      />
                      <label style={{ fontSize: 12, color: '#f9d27a', fontWeight: 700 }}>End (date + time)</label>
                      <input
                        type="datetime-local"
                        value={allocateForm?.endAt || ''}
                        onChange={(e) => setAllocateForm((f) => (f ? { ...f, endAt: e.target.value } : f))}
                        style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #f9d27a', background: '#fff', color: '#111' }}
                      />
                      <label style={{ fontSize: 12, color: '#f9d27a', fontWeight: 700 }}>Venue</label>
                      <input
                        type="text"
                        placeholder="e.g. Main Hall Stage"
                        value={allocateForm?.venue || ''}
                        onChange={(e) => setAllocateForm((f) => (f ? { ...f, venue: e.target.value } : f))}
                        style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #f9d27a', background: '#fff', color: '#111' }}
                      />
                      <button
                        type="button"
                        disabled={busyId === nomination.id}
                        onClick={handleAllocateSlot}
                        style={{
                          border: 'none',
                          background: '#d7912b',
                          color: '#fffaf0',
                          borderRadius: 999,
                          padding: '0.55rem 1rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          opacity: busyId === nomination.id ? 0.6 : 1,
                        }}
                      >
                        {nomination.allocatedSlot ? 'Update time slot' : 'Confirm time slot'}
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </section>
        ) : null}
      </div>
    </main>
  );
}

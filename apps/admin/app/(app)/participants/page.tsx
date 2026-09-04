'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  exportParticipantListCsv,
  getParticipantSlotsInWindow,
  groupParticipantSlotsByTime,
  sampleParticipantSlotConfirmations,
  type ParticipantSlotConfirmation,
} from '@ctr-cms/shared';

const defaultWindowStart = '2026-10-06T18:00';
const defaultWindowEnd = '2026-10-06T20:00';

export default function ParticipantsPage() {
  const [confirmations, setConfirmations] = useState<ParticipantSlotConfirmation[]>(sampleParticipantSlotConfirmations);
  const [windowStart, setWindowStart] = useState(defaultWindowStart);
  const [windowEnd, setWindowEnd] = useState(defaultWindowEnd);

  const filteredConfirmations = useMemo(
    () => getParticipantSlotsInWindow(confirmations, `${windowStart}:00+05:30`, `${windowEnd}:00+05:30`),
    [confirmations, windowEnd, windowStart],
  );

  const groupedConfirmations = useMemo(() => groupParticipantSlotsByTime(filteredConfirmations), [filteredConfirmations]);

  const handleConfirm = (id: string) => {
    setConfirmations((current) =>
      current.map((item) => (item.id === id ? { ...item, status: 'CONFIRMED' } : item)),
    );
  };

  const handleDecline = (id: string) => {
    setConfirmations((current) =>
      current.map((item) => (item.id === id ? { ...item, status: 'DECLINED' } : item)),
    );
  };

  const exportCsv = () => {
    const csv = exportParticipantListCsv(filteredConfirmations);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'participant-list.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    window.print();
  };

  const printList = () => {
    window.print();
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundImage: "linear-gradient(180deg, rgba(18,9,11,0.88), rgba(42,14,17,0.96)), url('/images/community.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: '#fff7ea',
        padding: '2rem 1.25rem 3rem',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: '#f9d27a', fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 700 }}>Participants</div>
            <h1 style={{ margin: '0.5rem 0 0', fontSize: 'clamp(2rem, 4vw, 3rem)' }}>Allocated time slots</h1>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link href="/dashboard" style={{ color: '#f7d980', textDecoration: 'none', fontWeight: 700 }}>Back to dashboard</Link>
            <button type="button" onClick={exportCsv} style={{ border: 'none', background: '#f4d383', color: '#1b0f12', borderRadius: 999, padding: '0.7rem 1rem', fontWeight: 800, cursor: 'pointer' }}>Export CSV</button>
            <button type="button" onClick={exportPdf} style={{ border: 'none', background: '#d18c2f', color: '#fffaf0', borderRadius: 999, padding: '0.7rem 1rem', fontWeight: 800, cursor: 'pointer' }}>Export PDF</button>
            <button type="button" onClick={printList} style={{ border: '1px solid rgba(249,210,122,0.35)', background: 'rgba(255,255,255,0.05)', color: '#fff7ea', borderRadius: 999, padding: '0.7rem 1rem', fontWeight: 700, cursor: 'pointer' }}>Print / Save PDF</button>
          </div>
        </header>

        <section style={{ marginTop: '1.5rem', background: 'rgba(20, 11, 13, 0.8)', border: '1px solid rgba(249,210,122,0.35)', borderRadius: 22, padding: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <label style={{ display: 'grid', gap: '0.45rem', color: '#f6e7c0' }}>
              <span>Window start</span>
              <input type="datetime-local" value={windowStart} onChange={(event) => setWindowStart(event.target.value)} style={fieldStyle} />
            </label>

            <label style={{ display: 'grid', gap: '0.45rem', color: '#f6e7c0' }}>
              <span>Window end</span>
              <input type="datetime-local" value={windowEnd} onChange={(event) => setWindowEnd(event.target.value)} style={fieldStyle} />
            </label>
          </div>
        </section>

        <section style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem' }}>
          {Object.entries(groupedConfirmations).length === 0 ? (
            <div style={{ background: 'rgba(20,11,13,0.8)', border: '1px solid rgba(249,210,122,0.35)', borderRadius: 18, padding: '1.5rem', color: '#f6e7c0', textAlign: 'center' }}>
              No participants are in the selected time window.
            </div>
          ) : (
            Object.entries(groupedConfirmations).map(([groupKey, group]) => (
              <div key={groupKey} style={{ background: 'rgba(20, 11, 13, 0.8)', border: '1px solid rgba(249,210,122,0.35)', borderRadius: 22, padding: '1.25rem' }}>
                <h2 style={{ marginTop: 0, color: '#f7d980' }}>
                  {new Date(group[0].slotStartAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} - {' '}
                  {new Date(group[0].slotEndAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </h2>

                <div style={{ display: 'grid', gap: '0.8rem' }}>
                  {group.map((participant) => (
                    <div key={participant.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '0.9rem 1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontWeight: 800 }}>{participant.programName}</div>
                          <div style={{ color: '#f4d7a0', marginTop: 4 }}>{participant.eventTitle} • {participant.venue}</div>
                        </div>
                        <span style={{ background: participant.status === 'CONFIRMED' ? '#dcfce7' : participant.status === 'DECLINED' ? '#fee2e2' : '#f3f4f6', color: '#111827', borderRadius: 999, padding: '0.35rem 0.7rem', fontWeight: 700, fontSize: 12 }}>{participant.status}</span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem', flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => handleConfirm(participant.id)} style={{ border: 'none', background: '#22c55e', color: '#062a14', borderRadius: 999, padding: '0.4rem 0.8rem', fontWeight: 700, cursor: 'pointer' }}>Confirm</button>
                        <button type="button" onClick={() => handleDecline(participant.id)} style={{ border: 'none', background: '#ef4444', color: '#fff', borderRadius: 999, padding: '0.4rem 0.8rem', fontWeight: 700, cursor: 'pointer' }}>Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}

const fieldStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.96)',
  border: '1px solid rgba(245, 196, 92, 0.5)',
  borderRadius: 12,
  color: '#111827',
  fontSize: 16,
  padding: '0.8rem 0.9rem',
};

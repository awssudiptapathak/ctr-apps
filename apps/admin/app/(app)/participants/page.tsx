'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { type EventRecord, type ProgramRecord } from '@ctr-cms/shared';
import { api } from '@/lib/api';

type Participant = {
  id: string;
  participantName: string;
  participantAge: number;
  performanceMode: string;
  performanceType: string;
  probableTimeMinutes: number;
  performanceSummary: string;
  photoData: string | null;
  block: string | null;
  flatNo: string | null;
  phone: string;
};

export default function ParticipantsPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [programs, setPrograms] = useState<ProgramRecord[]>([]);
  const [eventId, setEventId] = useState('');
  const [programId, setProgramId] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<{ events: EventRecord[] }>('/events'),
      api.get<{ programs: ProgramRecord[] }>('/programs'),
    ]).then(([eventData, programData]) => {
      setEvents(eventData.events);
      setPrograms(programData.programs);
      setEventId(eventData.events[0]?.id || '');
    }).catch((e: any) => setError(e.message));
  }, []);

  const eventPrograms = useMemo(() => programs.filter((program) => program.eventId === eventId), [eventId, programs]);

  useEffect(() => {
    if (!eventPrograms.some((program) => program.id === programId)) setProgramId(eventPrograms[0]?.id || '');
  }, [eventPrograms, programId]);

  useEffect(() => {
    if (!eventId || !programId) {
      setParticipants([]);
      return;
    }
    api.get<{ participants: Participant[] }>(
      `/nominations/participants?eventId=${encodeURIComponent(eventId)}&programId=${encodeURIComponent(programId)}`,
    ).then((data) => setParticipants(data.participants)).catch((e: any) => setError(e.message));
  }, [eventId, programId]);

  const exportCsv = () => {
    const rows = [
      ['Index', 'Name', 'Age', 'Block', 'Contact number', 'Performance', 'Type', 'Probable time (minutes)', 'Brief summary'],
      ...participants.map((p, index) => [index + 1, p.participantName, p.participantAge, p.block, p.phone, p.performanceMode, p.performanceType, p.probableTimeMinutes, p.performanceSummary, p.photoData || '']),
    ];
    rows[0].push('Photo (data URL)');
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'participant-list.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main style={{ minHeight: '100vh', background: '#241316', color: '#fff7ea', padding: '2rem 1.25rem 3rem' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div><div style={{ color: '#f9d27a', fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 700 }}>Participants</div><h1>Program participants</h1></div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link href="/dashboard" style={{ color: '#f7d980' }}>Back to dashboard</Link>
            <button type="button" onClick={exportCsv} style={buttonStyle}>Export CSV</button>
            <button type="button" onClick={() => window.print()} style={buttonStyle}>Export PDF / Print</button>
          </div>
        </header>
        <section style={cardStyle}>
          <label style={labelStyle}>Event<select value={eventId} onChange={(e) => setEventId(e.target.value)} style={fieldStyle}>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label>
          <label style={labelStyle}>Program<select value={programId} onChange={(e) => setProgramId(e.target.value)} style={fieldStyle}>{eventPrograms.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></label>
        </section>
        {error ? <div style={{ color: '#fecaca', margin: '1rem 0' }}>{error}</div> : null}
        <section className="participant-table-card" style={{ ...cardStyle, overflowX: 'auto', padding: 0 }}>
          {participants.length === 0 ? <div style={{ padding: '1.5rem', textAlign: 'center', color: '#f6e7c0' }}>No participants have submitted this program.</div> : (
            <table className="participant-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200 }}>
              <thead><tr>{['#', 'Name', 'Age', 'Block', 'Contact number', 'Performance', 'Type', 'Time', 'Brief summary', 'Photo'].map((heading) => <th key={heading} style={thStyle}>{heading}</th>)}</tr></thead>
              <tbody>{participants.map((p, index) => <tr key={p.id}>
                <td style={tdStyle}>{index + 1}</td><td style={tdStyle}>{p.participantName}</td><td style={tdStyle}>{p.participantAge}</td>
                <td style={tdStyle}>{p.flatNo ? `${p.flatNo}/${p.block}` : p.block}</td><td style={tdStyle}>{p.phone}</td>
                <td style={tdStyle}>{p.performanceMode}</td><td style={tdStyle}>{p.performanceType}</td><td style={tdStyle}>{p.probableTimeMinutes} min</td>
                <td style={tdStyle}>{p.performanceSummary}</td><td style={tdStyle}>{p.photoData ? <img src={p.photoData} alt={p.participantName} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }} /> : '—'}</td>
              </tr>)}</tbody>
            </table>
          )}
        </section>
      </div>
      <style>{`
        @media print {
          @page { size: landscape; margin: 8mm; }
          body { background: #fff !important; }
          .participant-table-card { display: block !important; overflow: visible !important; border: 0 !important; margin: 0 !important; background: #fff !important; }
          .participant-table-card table { width: 100% !important; min-width: 0 !important; table-layout: fixed; color: #111 !important; font-size: 7px; }
          .participant-table-card th, .participant-table-card td { padding: 3px !important; color: #111 !important; border: 1px solid #999 !important; overflow-wrap: anywhere; }
          .participant-table-card th:nth-child(1) { width: 3%; }
          .participant-table-card th:nth-child(2) { width: 9%; }
          .participant-table-card th:nth-child(3) { width: 4%; }
          .participant-table-card th:nth-child(4) { width: 7%; }
          .participant-table-card th:nth-child(5) { width: 10%; }
          .participant-table-card th:nth-child(6), .participant-table-card th:nth-child(7) { width: 8%; }
          .participant-table-card th:nth-child(8) { width: 6%; }
          .participant-table-card th:nth-child(9) { width: 35%; }
          .participant-table-card th:nth-child(10) { width: 10%; }
          .participant-table-card img { width: 42px !important; height: 42px !important; }
          .participant-table thead { display: table-header-group; }
          .participant-table tr { break-inside: avoid; }
          main > div > header, main > div > section:not(.participant-table-card), main > div > div { display: none !important; }
          main { padding: 0 !important; background: #fff !important; color: #111 !important; }
        }
      `}</style>
    </main>
  );
}

const cardStyle: React.CSSProperties = { marginTop: '1.5rem', background: 'rgba(20,11,13,0.8)', border: '1px solid rgba(249,210,122,0.35)', borderRadius: 18, padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' };
const labelStyle: React.CSSProperties = { display: 'grid', gap: '0.45rem', color: '#f6e7c0', minWidth: 260 };
const fieldStyle: React.CSSProperties = { background: '#fff', borderRadius: 10, padding: '0.7rem', color: '#111' };
const buttonStyle: React.CSSProperties = { border: 'none', background: '#f4d383', color: '#1b0f12', borderRadius: 999, padding: '0.7rem 1rem', fontWeight: 800, cursor: 'pointer' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '0.8rem', color: '#f7d980', borderBottom: '1px solid rgba(249,210,122,0.35)', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.08)', verticalAlign: 'top', color: '#f6e7c0' };

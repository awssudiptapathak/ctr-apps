'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { allocateSlotsForProgram, generateTimeSlots, isSlotConflict, samplePrograms, type TimeSlotRecord } from '@ctr-cms/shared';

const storageKey = 'ctr-cms-schedule';

function readStoredSchedule(): TimeSlotRecord[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function SchedulePage() {
  const [programId, setProgramId] = useState(samplePrograms[0]?.id ?? '');
  const [venue, setVenue] = useState('Main Hall');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [startAt, setStartAt] = useState('2026-10-06T18:00');
  const [endAt, setEndAt] = useState('2026-10-06T20:00');
  const [slots, setSlots] = useState<TimeSlotRecord[]>([]);

  useEffect(() => {
    setSlots(readStoredSchedule());
  }, []);

  const programOptions = useMemo(() => samplePrograms, []);

  const slotPreview = useMemo(
    () => generateTimeSlots(`${startAt}:00+05:30`, `${endAt}:00+05:30`, durationMinutes, venue),
    [durationMinutes, endAt, startAt, venue],
  );

  const createSlots = () => {
    const generated = allocateSlotsForProgram(
      `${startAt}:00+05:30`,
      `${endAt}:00+05:30`,
      durationMinutes,
      venue,
      10,
    );

    const nextSlots: TimeSlotRecord[] = generated.map((slot, index) => ({
      id: `slot-${Date.now()}-${index}`,
      programId,
      nominationId: null,
      status: 'BOOKED',
      venue: slot.venue,
      startAt: slot.startAt,
      endAt: slot.endAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const conflicts = nextSlots.some((slot) =>
      isSlotConflict(slot, slots.map(({ startAt, endAt, venue }) => ({ startAt, endAt, venue }))),
    );

    if (conflicts) {
      alert('One or more generated slots overlap an existing schedule.');
      return;
    }

    const merged = [...nextSlots, ...slots];
    setSlots(merged);
    window.localStorage.setItem(storageKey, JSON.stringify(merged));
  };

  const removeSlot = (slotId: string) => {
    const next = slots.filter((slot) => slot.id !== slotId);
    setSlots(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundImage: "linear-gradient(180deg, rgba(18,9,11,0.88), rgba(42,14,17,0.96)), url('/images/festival-bg.jpeg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: '#fff7ea',
        padding: '2rem 1.25rem 3rem',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: '#f9d27a', fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 700 }}>Scheduling</div>
            <h1 style={{ margin: '0.5rem 0 0', fontSize: 'clamp(2rem, 4vw, 3rem)' }}>Time slot allocation</h1>
          </div>
          <Link href="/dashboard" style={{ color: '#f7d980', textDecoration: 'none', fontWeight: 700 }}>Back to dashboard</Link>
        </header>

        <section
          style={{
            marginTop: '1.5rem',
            display: 'grid',
            gridTemplateColumns: '1fr 1.1fr',
            gap: '1.25rem',
          }}
        >
          <div style={{ background: 'rgba(20, 11, 13, 0.8)', border: '1px solid rgba(249,210,122,0.35)', borderRadius: 22, padding: '1.25rem' }}>
            <h2 style={{ marginTop: 0 }}>Create slot plan</h2>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <label style={{ display: 'grid', gap: '0.45rem', color: '#f6e7c0' }}>
                <span>Program</span>
                <select value={programId} onChange={(event) => setProgramId(event.target.value)} style={fieldStyle}>
                  {programOptions.map((program) => (
                    <option key={program.id} value={program.id}>{program.name}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'grid', gap: '0.45rem', color: '#f6e7c0' }}>
                <span>Venue</span>
                <input value={venue} onChange={(event) => setVenue(event.target.value)} style={fieldStyle} />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <label style={{ display: 'grid', gap: '0.45rem', color: '#f6e7c0' }}>
                  <span>Start</span>
                  <input type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} style={fieldStyle} />
                </label>

                <label style={{ display: 'grid', gap: '0.45rem', color: '#f6e7c0' }}>
                  <span>End</span>
                  <input type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} style={fieldStyle} />
                </label>
              </div>

              <label style={{ display: 'grid', gap: '0.45rem', color: '#f6e7c0' }}>
                <span>Slot length (minutes)</span>
                <input type="number" min={15} step={15} value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} style={fieldStyle} />
              </label>

              <button type="button" onClick={createSlots} style={{ background: 'linear-gradient(135deg, #f4d383, #c77921)', color: '#1b0f12', border: 'none', borderRadius: 12, padding: '0.8rem 1.1rem', fontWeight: 800, cursor: 'pointer' }}>
                Generate slots
              </button>
            </div>
          </div>

          <div style={{ background: 'rgba(20, 11, 13, 0.8)', border: '1px solid rgba(249,210,122,0.35)', borderRadius: 22, padding: '1.25rem' }}>
            <h2 style={{ marginTop: 0 }}>Preview</h2>
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              {slotPreview.length === 0 ? (
                <div style={{ color: '#f6e7c0' }}>No valid slot preview available.</div>
              ) : (
                slotPreview.map((slot, index) => (
                  <div key={`${slot.startAt}-${index}`} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '0.75rem 0.9rem' }}>
                    <div style={{ fontWeight: 700 }}>{slot.venue}</div>
                    <div style={{ color: '#f6e7c0', marginTop: 4, fontSize: 14 }}>
                      {new Date(slot.startAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} -{' '}
                      {new Date(slot.endAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section style={{ marginTop: '2rem', background: 'rgba(20, 11, 13, 0.8)', border: '1px solid rgba(249,210,122,0.35)', borderRadius: 22, padding: '1.25rem' }}>
          <h2 style={{ marginTop: 0 }}>Scheduled slots</h2>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {slots.length === 0 ? (
              <div style={{ color: '#f6e7c0' }}>No slots scheduled yet.</div>
            ) : (
              slots.map((slot) => (
                <div key={slot.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '0.8rem 1rem' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{slot.venue}</div>
                    <div style={{ color: '#f6e7c0', fontSize: 14 }}>
                      {new Date(slot.startAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} -{' '}
                      {new Date(slot.endAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ background: '#dcfce7', color: '#064e3b', borderRadius: 999, padding: '0.3rem 0.7rem', fontWeight: 700 }}>{slot.status}</span>
                    <button type="button" onClick={() => removeSlot(slot.id)} style={{ border: 'none', background: '#ef4444', color: '#fff', borderRadius: 999, padding: '0.35rem 0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
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

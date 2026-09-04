'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { isNominationWindowOpen, type EventRecord, type ProgramRecord } from '@ctr-cms/shared';
import { api } from '@/lib/api';

const statusOptions = ['ALL', 'DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED'];

export default function EventsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [programs, setPrograms] = useState<ProgramRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [eventRes, programRes] = await Promise.all([
        api.get<{ events: EventRecord[] }>('/events'),
        api.get<{ programs: ProgramRecord[] }>('/programs'),
      ]);
      setEvents(eventRes.events);
      setPrograms(programRes.programs);
    } catch (e: any) {
      if (e.status === 401) {
        router.push('/login');
      } else {
        setFlash({ type: 'error', message: e.message });
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const message = searchParams.get('message');
    const status = searchParams.get('status');

    if (message) {
      setFlash({
        type: status === 'error' ? 'error' : 'success',
        message,
      });

      const timeout = window.setTimeout(() => setFlash(null), 4200);
      return () => window.clearTimeout(timeout);
    }

    setFlash(null);
  }, [searchParams]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesStatus = selectedStatus === 'ALL' || event.status === selectedStatus;
      const term = search.trim().toLowerCase();
      const matchesQuery =
        !term ||
        event.title.toLowerCase().includes(term) ||
        event.venue?.toLowerCase().includes(term) ||
        programs.some(
          (program) =>
            program.eventId === event.id && program.name.toLowerCase().includes(term),
        );

      return matchesStatus && matchesQuery;
    });
  }, [events, programs, search, selectedStatus]);

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await api.delete(`/events/${eventId}`);
      setEvents((current) => current.filter((event) => event.id !== eventId));
      setPrograms((current) => current.filter((program) => program.eventId !== eventId));
      setFlash({ type: 'success', message: 'Event deleted successfully.' });
    } catch (e: any) {
      setFlash({ type: 'error', message: e.message || 'Failed to delete event.' });
    }
  };

  const handleDeleteProgram = async (programId: string) => {
    try {
      await api.delete(`/programs/${programId}`);
      setPrograms((current) => current.filter((program) => program.id !== programId));
      setFlash({ type: 'success', message: 'Program deleted successfully.' });
    } catch (e: any) {
      setFlash({ type: 'error', message: e.message || 'Failed to delete program.' });
    }
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundImage: "linear-gradient(180deg, rgba(26,12,14,0.88), rgba(53,17,21,0.94)), url('/images/puja-preparation.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: '#fff7ea',
        padding: '2rem 1.25rem 3rem',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: '#f9d27a', fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 700 }}>Festival operations</div>
            <h1 style={{ margin: '0.5rem 0 0', fontSize: 'clamp(2rem, 4vw, 3rem)' }}>Event & Program Management</h1>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link href="/events/new" style={{ color: '#1b0f12', textDecoration: 'none', fontWeight: 800, background: 'linear-gradient(135deg, #f4d383, #c77921)', borderRadius: 999, padding: '0.75rem 1rem' }}>Create event</Link>
            <Link href={`/events/${events[0]?.id ?? 'new'}/programs/new`} style={{ color: '#fff7ea', textDecoration: 'none', fontWeight: 700, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(249,210,122,0.35)', borderRadius: 999, padding: '0.75rem 1rem' }}>Create program</Link>
          </div>
        </header>

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

        <section
          style={{
            marginTop: '1.5rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            background: 'rgba(20, 11, 13, 0.78)',
            border: '1px solid rgba(249,210,122,0.3)',
            borderRadius: 18,
            padding: '1rem',
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {statusOptions.map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                style={{
                  border: 'none',
                  borderRadius: 999,
                  padding: '0.5rem 0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: selectedStatus === status ? 'linear-gradient(135deg, #f4d383, #c77921)' : 'rgba(255,255,255,0.06)',
                  color: selectedStatus === status ? '#1b0f12' : '#f9efe0',
                }}
              >
                {status}
              </button>
            ))}
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Search event or program"
            style={{
              minWidth: 260,
              background: 'rgba(255,255,255,0.96)',
              border: '1px solid rgba(249,210,122,0.5)',
              borderRadius: 12,
              padding: '0.8rem 0.9rem',
              color: '#111827',
              fontSize: 15,
            }}
          />
        </section>

        <section style={{ display: 'grid', gap: '1rem', marginTop: '2rem' }}>
          {loading ? (
            <div style={{ background: 'rgba(25, 12, 14, 0.75)', border: '1px solid rgba(249,210,122,0.35)', borderRadius: 18, padding: '1.5rem', textAlign: 'center', color: '#f5e7c7' }}>
              Loading events…
            </div>
          ) : null}

          {!loading && filteredEvents.length === 0 ? (
            <div style={{ background: 'rgba(25, 12, 14, 0.75)', border: '1px solid rgba(249,210,122,0.35)', borderRadius: 18, padding: '1.5rem', textAlign: 'center', color: '#f5e7c7' }}>
              No events match the current filters.
            </div>
          ) : null}

          {filteredEvents.map((event) => (
            <article
              key={event.id}
              style={{
                background: 'rgba(25, 12, 14, 0.78)',
                border: '1px solid rgba(249,210,122,0.3)',
                borderRadius: 22,
                padding: '1.25rem',
                boxShadow: '0 18px 35px rgba(0,0,0,0.18)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 'clamp(1.5rem, 3vw, 2.1rem)' }}>{event.title}</h2>
                  <p style={{ margin: '0.55rem 0 0', color: '#f4d7a0' }}>{event.venue}</p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span
                    style={{
                      background: event.status === 'PUBLISHED' ? '#ecfdf5' : '#f3f4f6',
                      color: event.status === 'PUBLISHED' ? '#065f46' : '#374151',
                      borderRadius: 999,
                      padding: '0.35rem 0.7rem',
                      fontWeight: 700,
                    }}
                  >
                    {event.status}
                  </span>
                  <Link href={`/events/${event.id}/edit`} style={{ color: '#f7d980', textDecoration: 'none', fontWeight: 700 }}>Edit</Link>
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(event.id)}
                    style={{ border: 'none', background: '#ef4444', color: '#fff', borderRadius: 999, padding: '0.4rem 0.75rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <p style={{ marginTop: '1rem', color: '#f7e6bc', lineHeight: 1.7 }}>{event.description}</p>
              <p style={{ margin: '0.75rem 0 0', fontSize: 14, color: '#f0dba2' }}>
                {new Date(event.startAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} -{' '}
                {new Date(event.endAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>

              <div style={{ marginTop: '1.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, color: '#f7d980' }}>Programs</h3>
                  <Link href={`/events/${event.id}/programs/new`} style={{ color: '#f7d980', textDecoration: 'none', fontWeight: 700 }}>Add program</Link>
                </div>

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {programs
                    .filter((program) => program.eventId === event.id)
                    .map((program) => (
                      <div key={program.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '0.9rem 1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <div>
                            <strong style={{ fontSize: 17 }}>{program.name}</strong>
                            <div style={{ color: '#f4d7a0', fontSize: 12, marginTop: 4 }}>Linked to: {event.title}</div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ background: isNominationWindowOpen(program) ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.07)', color: isNominationWindowOpen(program) ? '#bbf7d0' : '#f6e7c0', borderRadius: 999, padding: '0.3rem 0.6rem', fontSize: 12, fontWeight: 700 }}>
                              {isNominationWindowOpen(program) ? 'Open' : 'Closed'}
                            </span>
                            <Link href={`/programs/${program.id}/edit`} style={{ color: '#f7d980', textDecoration: 'none', fontWeight: 700 }}>Edit</Link>
                            <button
                              type="button"
                              onClick={() => handleDeleteProgram(program.id)}
                              style={{ border: 'none', background: '#ef4444', color: '#fff', borderRadius: 999, padding: '0.32rem 0.7rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div style={{ color: '#f0dba2', marginTop: '0.5rem', fontSize: 14 }}>
                          {program.maxParticipants} slots • {program.status}
                        </div>
                        <div style={{ color: '#f5e7c7', marginTop: '0.5rem', lineHeight: 1.6 }}>{program.description}</div>
                      </div>
                    ))}
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

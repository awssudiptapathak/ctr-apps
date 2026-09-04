'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { type EventRecord } from '@ctr-cms/shared';
import { api } from '@/lib/api';

export default function NewEventProgramPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: 'Rangoli Design Showcase',
    description: 'Residents showcase handcrafted rangoli art with cultural motifs.',
    rules: 'Open to all residents, with a time-limited judging round.',
    maxParticipants: 20,
    nominationOpenAt: '2026-09-10T00:00:00+05:30',
    nominationCloseAt: '2026-09-18T23:59:00+05:30',
    status: 'PUBLISHED',
  });

  useEffect(() => {
    api
      .get<{ event: EventRecord }>(`/events/${eventId}`)
      .then(({ event }) => setEvent(event))
      .catch((e: any) => {
        if (e.status === 401) router.push('/login');
        else router.push('/events?status=error&message=Event not found.');
      });
  }, [eventId, router]);

  const handleSubmit = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/programs', {
        eventId,
        name: form.name,
        description: form.description,
        rules: form.rules,
        maxParticipants: Number(form.maxParticipants),
        nominationOpenAt: form.nominationOpenAt,
        nominationCloseAt: form.nominationCloseAt,
        status: form.status,
      });
      router.push('/events?status=success&message=Program created successfully.');
    } catch (e: any) {
      router.push(`/events?status=error&message=${encodeURIComponent(e.message || 'Failed to create program.')}`);
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field: keyof typeof form, value: string | number) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  if (!event) {
    return <main style={{ padding: '2rem', color: '#fff7ea' }}>Loading event…</main>;
  }

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
      <div style={{ maxWidth: 760, margin: '0 auto', background: 'rgba(20, 11, 13, 0.8)', border: '1px solid rgba(249,210,122,0.35)', borderRadius: 22, padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ color: '#f9d27a', fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 700 }}>Create</div>
            <h1 style={{ margin: '0.5rem 0 0', fontSize: 'clamp(2rem, 4vw, 3rem)' }}>New program for {event.title}</h1>
          </div>
          <Link href="/events" style={{ color: '#f7d980', textDecoration: 'none', fontWeight: 700 }}>Back to events</Link>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '0.8rem 1rem', color: '#f6e7c0' }}>
            Linked event: <strong>{event.title}</strong>
          </div>

          <label style={{ display: 'grid', gap: '0.45rem', color: '#f6e7c0' }}>
            <span>Name</span>
            <input value={form.name} onChange={(event) => updateField('name', event.target.value)} style={fieldStyle} />
          </label>

          <label style={{ display: 'grid', gap: '0.45rem', color: '#f6e7c0' }}>
            <span>Description</span>
            <textarea value={form.description} onChange={(event) => updateField('description', event.target.value)} rows={4} style={{ ...fieldStyle, resize: 'vertical' }} />
          </label>

          <label style={{ display: 'grid', gap: '0.45rem', color: '#f6e7c0' }}>
            <span>Rules</span>
            <textarea value={form.rules} onChange={(event) => updateField('rules', event.target.value)} rows={3} style={{ ...fieldStyle, resize: 'vertical' }} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <label style={{ display: 'grid', gap: '0.45rem', color: '#f6e7c0' }}>
              <span>Max participants</span>
              <input type="number" min={1} value={form.maxParticipants} onChange={(event) => updateField('maxParticipants', Number(event.target.value))} style={fieldStyle} />
            </label>

            <label style={{ display: 'grid', gap: '0.45rem', color: '#f6e7c0' }}>
              <span>Status</span>
              <select value={form.status} onChange={(event) => updateField('status', event.target.value)} style={fieldStyle}>
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="ACTIVE">ACTIVE</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <label style={{ display: 'grid', gap: '0.45rem', color: '#f6e7c0' }}>
              <span>Nomination opens</span>
              <input type="datetime-local" value={form.nominationOpenAt.slice(0, 16)} onChange={(event) => updateField('nominationOpenAt', `${event.target.value}:00+05:30`)} style={fieldStyle} />
            </label>

            <label style={{ display: 'grid', gap: '0.45rem', color: '#f6e7c0' }}>
              <span>Nomination closes</span>
              <input type="datetime-local" value={form.nominationCloseAt.slice(0, 16)} onChange={(event) => updateField('nominationCloseAt', `${event.target.value}:00+05:30`)} style={fieldStyle} />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <Link href="/events" style={{ color: '#f7d980', textDecoration: 'none', fontWeight: 700, padding: '0.8rem 1rem' }}>Cancel</Link>
            <button type="submit" disabled={submitting} style={{ background: 'linear-gradient(135deg, #f4d383, #c77921)', color: '#1b0f12', border: 'none', borderRadius: 12, padding: '0.8rem 1.2rem', fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
              {submitting ? 'Creating…' : 'Create program'}
            </button>
          </div>
        </form>
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

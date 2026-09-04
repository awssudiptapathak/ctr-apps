'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { type EventRecord } from '@ctr-cms/shared';
import { api } from '@/lib/api';

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<{ event: EventRecord }>(`/events/${id}`)
      .then(({ event }) => setEvent(event))
      .catch((e: any) => {
        if (e.status === 401) router.push('/login');
        else router.push('/events?status=error&message=Event not found.');
      });
  }, [id, router]);

  const updateField = (field: keyof EventRecord, value: string) => {
    setEvent((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleSubmit = async (submitted: FormEvent<HTMLFormElement>) => {
    submitted.preventDefault();
    if (!event) return;
    setSaving(true);

    try {
      await api.put(`/events/${event.id}`, {
        title: event.title,
        description: event.description,
        venue: event.venue,
        startAt: event.startAt,
        endAt: event.endAt,
        status: event.status,
        year: new Date(event.startAt).getFullYear(),
      });
      router.push('/events?status=success&message=Event updated successfully.');
    } catch (e: any) {
      if (e.status === 401) router.push('/login');
      else router.push(`/events?status=error&message=${encodeURIComponent(e.message || 'Failed to update event.')}`);
    } finally {
      setSaving(false);
    }
  };

  if (!event) {
    return <main style={{ padding: '2rem', color: '#fff7ea' }}>Loading event…</main>;
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundImage: "linear-gradient(180deg, rgba(18,9,11,0.88), rgba(42,14,17,0.96)), url('/images/puja-preparation.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: '#fff7ea',
        padding: '2rem 1.25rem 3rem',
      }}
    >
      <div style={{ maxWidth: 760, margin: '0 auto', background: 'rgba(20, 11, 13, 0.8)', border: '1px solid rgba(249,210,122,0.35)', borderRadius: 22, padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ color: '#f9d27a', fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 700 }}>Edit</div>
            <h1 style={{ margin: '0.5rem 0 0', fontSize: 'clamp(2rem, 4vw, 3rem)' }}>{event.title}</h1>
          </div>
          <Link href="/events" style={{ color: '#f7d980', textDecoration: 'none', fontWeight: 700 }}>Back to events</Link>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <label style={{ display: 'grid', gap: '0.45rem', color: '#f6e7c0' }}>
            <span>Title</span>
            <input value={event.title} onChange={(input) => updateField('title', input.target.value)} style={fieldStyle} />
          </label>

          <label style={{ display: 'grid', gap: '0.45rem', color: '#f6e7c0' }}>
            <span>Description</span>
            <textarea value={event.description ?? ''} onChange={(input) => updateField('description', input.target.value)} rows={4} style={{ ...fieldStyle, resize: 'vertical' }} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <label style={{ display: 'grid', gap: '0.45rem', color: '#f6e7c0' }}>
              <span>Venue</span>
              <input value={event.venue ?? ''} onChange={(input) => updateField('venue', input.target.value)} style={fieldStyle} />
            </label>

            <label style={{ display: 'grid', gap: '0.45rem', color: '#f6e7c0' }}>
              <span>Status</span>
              <select value={event.status} onChange={(input) => updateField('status', input.target.value)} style={fieldStyle}>
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <label style={{ display: 'grid', gap: '0.45rem', color: '#f6e7c0' }}>
              <span>Start date</span>
              <input type="datetime-local" value={event.startAt.slice(0, 16)} onChange={(input) => updateField('startAt', `${input.target.value}:00+05:30`)} style={fieldStyle} />
            </label>

            <label style={{ display: 'grid', gap: '0.45rem', color: '#f6e7c0' }}>
              <span>End date</span>
              <input type="datetime-local" value={event.endAt.slice(0, 16)} onChange={(input) => updateField('endAt', `${input.target.value}:00+05:30`)} style={fieldStyle} />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <Link href="/events" style={{ color: '#f7d980', textDecoration: 'none', fontWeight: 700, padding: '0.8rem 1rem' }}>Cancel</Link>
            <button type="submit" disabled={saving} style={{ background: 'linear-gradient(135deg, #f4d383, #c77921)', color: '#1b0f12', border: 'none', borderRadius: 12, padding: '0.8rem 1.2rem', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : 'Save changes'}
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

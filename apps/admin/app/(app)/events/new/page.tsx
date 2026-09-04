'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { api } from '@/lib/api';

export default function NewEventPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: 'Maha Aarti & Cultural Night',
    description: 'A grand community event with performances and cultural showcases.',
    venue: 'Clubtown Main Hall',
    startAt: '2026-10-05T18:00:00+05:30',
    endAt: '2026-10-05T22:00:00+05:30',
    status: 'DRAFT',
  });
  const [submitting, setSubmitting] = useState(false);

  const submitLabel = useMemo(() => (submitting ? 'Creating…' : 'Create event'), [submitting]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await api.post('/events', {
        year: new Date(form.startAt).getFullYear(),
        title: form.title,
        description: form.description,
        venue: form.venue,
        startAt: form.startAt,
        endAt: form.endAt,
        status: form.status,
      });
      router.push('/events?status=success&message=Event created successfully.');
    } catch (e: any) {
      if (e.status === 401) {
        router.push('/login');
      } else {
        router.push(`/events?status=error&message=${encodeURIComponent(e.message || 'Failed to create event.')}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
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
      <div style={{ maxWidth: 760, margin: '0 auto', background: 'rgba(20, 11, 13, 0.8)', border: '1px solid rgba(249,210,122,0.35)', borderRadius: 22, padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ color: '#f9d27a', fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 700 }}>Create</div>
            <h1 style={{ margin: '0.5rem 0 0', fontSize: 'clamp(2rem, 4vw, 3rem)' }}>New event</h1>
          </div>
          <Link href="/events" style={{ color: '#f7d980', textDecoration: 'none', fontWeight: 700 }}>Back to events</Link>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <label style={{ display: 'grid', gap: '0.45rem', color: '#f6e7c0' }}>
            <span>Title</span>
            <input value={form.title} onChange={(event) => updateField('title', event.target.value)} style={fieldStyle} />
          </label>

          <label style={{ display: 'grid', gap: '0.45rem', color: '#f6e7c0' }}>
            <span>Description</span>
            <textarea value={form.description} onChange={(event) => updateField('description', event.target.value)} rows={4} style={{ ...fieldStyle, resize: 'vertical' }} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <label style={{ display: 'grid', gap: '0.45rem', color: '#f6e7c0' }}>
              <span>Venue</span>
              <input value={form.venue} onChange={(event) => updateField('venue', event.target.value)} style={fieldStyle} />
            </label>

            <label style={{ display: 'grid', gap: '0.45rem', color: '#f6e7c0' }}>
              <span>Status</span>
              <select value={form.status} onChange={(event) => updateField('status', event.target.value)} style={fieldStyle}>
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
              <input type="datetime-local" value={form.startAt.slice(0, 16)} onChange={(event) => updateField('startAt', `${event.target.value}:00+05:30`)} style={fieldStyle} />
            </label>

            <label style={{ display: 'grid', gap: '0.45rem', color: '#f6e7c0' }}>
              <span>End date</span>
              <input type="datetime-local" value={form.endAt.slice(0, 16)} onChange={(event) => updateField('endAt', `${event.target.value}:00+05:30`)} style={fieldStyle} />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <Link href="/events" style={{ color: '#f7d980', textDecoration: 'none', fontWeight: 700, padding: '0.8rem 1rem' }}>Cancel</Link>
            <button type="submit" style={{ background: 'linear-gradient(135deg, #f4d383, #c77921)', color: '#1b0f12', border: 'none', borderRadius: 12, padding: '0.8rem 1.2rem', fontWeight: 800, cursor: 'pointer' }}>
              {submitLabel}
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

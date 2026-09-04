'use client';

import Link from 'next/link';
import { useState } from 'react';
import { buildReminderBatch, createReminderTemplate, sampleEvents, type ReminderTemplate } from '@ctr-cms/shared';

const initialTemplates: ReminderTemplate[] = [
  createReminderTemplate('EVENT_REMINDER', 'WHATSAPP', 'Puja day reminder', 'Your performance slot begins in 30 minutes. Please arrive 15 minutes early.', '2026-10-05T17:30:00+05:30', 'RESIDENT'),
  createReminderTemplate('PROGRAM_DEADLINE', 'EMAIL', 'Submission deadline', 'Nomination window closes tonight. Please review your submission.', '2026-09-18T23:59:00+05:30', 'RESIDENT'),
  createReminderTemplate('SLOT_CONFIRMATION', 'IN_APP', 'Slot allocated', 'Your confirmed slot has been assigned. Please review schedule details.', '2026-09-20T10:00:00+05:30', 'RESIDENT'),
];

export default function NotificationsPage() {
  const [templates, setTemplates] = useState<ReminderTemplate[]>(initialTemplates);
  const [eventTitle, setEventTitle] = useState(sampleEvents[0]?.title ?? 'Durga Puja 2026');
  const [message, setMessage] = useState('Residents, please keep your schedule ready for the next performance window.');

  const handleAddTemplate = () => {
    const next = [
      createReminderTemplate('EVENT_REMINDER', 'WHATSAPP', eventTitle, message, new Date(Date.now() + 60 * 60 * 1000).toISOString(), 'RESIDENT'),
      ...templates,
    ];
    setTemplates(buildReminderBatch(next));
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundImage: "linear-gradient(180deg, rgba(18,9,11,0.88), rgba(42,14,17,0.96)), url('/images/celebrations.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: '#fff7ea',
        padding: '2rem 1.25rem 3rem',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: '#f9d27a', fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 700 }}>Messaging</div>
            <h1 style={{ margin: '0.5rem 0 0', fontSize: 'clamp(2rem, 4vw, 3rem)' }}>Notifications & reminders</h1>
          </div>
          <Link href="/dashboard" style={{ color: '#f7d980', textDecoration: 'none', fontWeight: 700 }}>Back to dashboard</Link>
        </header>

        <section style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '0.95fr 1.05fr', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(20, 11, 13, 0.8)', border: '1px solid rgba(249,210,122,0.35)', borderRadius: 22, padding: '1.25rem' }}>
            <h2 style={{ marginTop: 0 }}>Compose reminder</h2>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <label style={{ display: 'grid', gap: '0.45rem', color: '#f6e7c0' }}>
                <span>Event or title</span>
                <input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} style={fieldStyle} />
              </label>

              <label style={{ display: 'grid', gap: '0.45rem', color: '#f6e7c0' }}>
                <span>Message</span>
                <textarea rows={4} value={message} onChange={(event) => setMessage(event.target.value)} style={{ ...fieldStyle, resize: 'vertical' }} />
              </label>

              <button type="button" onClick={handleAddTemplate} style={{ background: 'linear-gradient(135deg, #f4d383, #c77921)', color: '#1b0f12', border: 'none', borderRadius: 12, padding: '0.8rem 1.1rem', fontWeight: 800, cursor: 'pointer' }}>
                Schedule reminder
              </button>
            </div>
          </div>

          <div style={{ background: 'rgba(20, 11, 13, 0.8)', border: '1px solid rgba(249,210,122,0.35)', borderRadius: 22, padding: '1.25rem' }}>
            <h2 style={{ marginTop: 0 }}>Queued reminders</h2>
            <div style={{ display: 'grid', gap: '0.8rem' }}>
              {templates.map((template, index) => (
                <div key={`${template.title}-${index}`} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '0.9rem 1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong>{template.title}</strong>
                    <span style={{ background: '#dcfce7', color: '#064e3b', borderRadius: 999, padding: '0.3rem 0.6rem', fontWeight: 700, fontSize: 12 }}>{template.channel}</span>
                  </div>
                  <div style={{ color: '#f6e7c0', marginTop: 6 }}>{template.body}</div>
                  <div style={{ color: '#f4d7a0', marginTop: 8, fontSize: 13 }}>
                    {new Date(template.sendAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>
              ))}
            </div>
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

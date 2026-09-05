'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { EventRecord, ProgramRecord, ReminderFrequency, ReminderType } from '@ctr-cms/shared';
import { api } from '@/lib/api';

type Schedule = {
  id: string; eventId: string | null; programId: string | null; eventTitle?: string;
  programName?: string; title: string; body: string; frequency: ReminderFrequency;
  sendAt: string; active: boolean;
};

export default function NotificationsPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [programs, setPrograms] = useState<ProgramRecord[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [eventId, setEventId] = useState('');
  const [programId, setProgramId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [reminderType, setReminderType] = useState<ReminderType>('PROGRAM_DEADLINE');
  const [frequency, setFrequency] = useState<ReminderFrequency>('AD_HOC');
  const [sendAt, setSendAt] = useState(new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16));
  const [flash, setFlash] = useState<string | null>(null);
  const publishedEvents = useMemo(() => events.filter((event) => event.status === 'PUBLISHED'), [events]);
  const publishedPrograms = useMemo(
    () => programs.filter((program) => program.eventId === eventId && program.status === 'PUBLISHED'),
    [eventId, programs],
  );

  useEffect(() => {
    Promise.all([
      api.get<{ events: EventRecord[] }>('/events'),
      api.get<{ programs: ProgramRecord[] }>('/programs'),
      api.get<{ schedules: Schedule[] }>('/notifications/schedules'),
    ]).then(([eventRes, programRes, scheduleRes]) => {
      setEvents(eventRes.events);
      setPrograms(programRes.programs);
      setSchedules(scheduleRes.schedules);
    }).catch((error: any) => setFlash(error.message));
  }, []);

  const compose = async (scheduled: boolean) => {
    if (!eventId || !programId || !title.trim() || !body.trim()) {
      setFlash('Select a published event and program, then enter a title and message.');
      return;
    }
    try {
      if (scheduled) {
        const result = await api.post<{ schedule: Schedule }>('/notifications/schedules', {
          eventId, programId, title, body, type: reminderType, frequency, sendAt: new Date(sendAt).toISOString(),
        });
        setSchedules((current) => [...current, result.schedule]);
        setFlash('Reminder scheduled.');
      } else {
        const result = await api.post<{ count?: number }>('/notifications', {
          eventId, programId, title, body, audience: 'RESIDENT', type: reminderType,
        });
        setFlash(`Notification sent to ${result.count ?? 1} resident(s).`);
      }
    } catch (error: any) {
      setFlash(error.message);
    }
  };

  const cancelSchedule = async (id: string) => {
    await api.delete(`/notifications/schedules/${id}`);
    setSchedules((current) => current.filter((schedule) => schedule.id !== id));
  };

  return (
    <main style={{ minHeight: '100vh', backgroundImage: "linear-gradient(180deg, rgba(18,9,11,0.88), rgba(42,14,17,0.96)), url('/images/celebrations.jpg')", backgroundSize: 'cover', color: '#fff7ea', padding: '2rem 1.25rem 3rem' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div><div style={{ color: '#f9d27a', fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 700 }}>Messaging</div><h1 style={{ margin: '0.5rem 0 0' }}>Notifications & reminders</h1></div>
          <Link href="/dashboard" style={{ color: '#f7d980', textDecoration: 'none', fontWeight: 700 }}>Back to dashboard</Link>
        </header>
        {flash ? <div style={{ marginTop: '1rem', padding: '0.9rem 1rem', borderRadius: 14, background: 'rgba(34,197,94,0.14)', border: '1px solid rgba(249,210,122,0.4)' }}>{flash}</div> : null}
        <section style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '0.95fr 1.05fr', gap: '1.25rem' }}>
          <div style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>Compose notification</h2>
            <label style={labelStyle}>Published event
              <select value={eventId} onChange={(event) => { setEventId(event.target.value); setProgramId(''); }} style={fieldStyle}>
                <option value="">Select event</option>{publishedEvents.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
              </select>
            </label>
            <label style={labelStyle}>Published program
              <select value={programId} onChange={(event) => setProgramId(event.target.value)} style={fieldStyle} disabled={!eventId}>
                <option value="">Select program</option>{publishedPrograms.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
              </select>
            </label>
            <label style={labelStyle}>Title<input value={title} onChange={(event) => setTitle(event.target.value)} style={fieldStyle} /></label>
            <label style={labelStyle}>Message<textarea rows={4} value={body} onChange={(event) => setBody(event.target.value)} style={{ ...fieldStyle, resize: 'vertical' }} /></label>
            <label style={labelStyle}>Reminder type<select value={reminderType} onChange={(event) => setReminderType(event.target.value as ReminderType)} style={fieldStyle}>
              <option value="PROGRAM_DEADLINE">Program reminder</option>
              <option value="NOMINATION_CLOSING">Nomination closing</option>
              <option value="EVENT_REMINDER">Event reminder</option>
              <option value="ANNOUNCEMENT">Announcement</option>
            </select></label>
            <label style={labelStyle}>Frequency<select value={frequency} onChange={(event) => setFrequency(event.target.value as ReminderFrequency)} style={fieldStyle}>
              <option value="AD_HOC">Ad hoc (once)</option><option value="WEEKLY">Weekly</option><option value="DAILY">Daily</option>
            </select></label>
            <label style={labelStyle}>Send at<input type="datetime-local" value={sendAt} onChange={(event) => setSendAt(event.target.value)} style={fieldStyle} /></label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => compose(false)} style={buttonStyle}>Send now</button>
              <button type="button" onClick={() => compose(true)} style={{ ...buttonStyle, background: 'rgba(255,255,255,0.12)', color: '#fff7ea' }}>Schedule reminder</button>
            </div>
          </div>
          <div style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>Queued reminders</h2>
            {schedules.length === 0 ? <p>No reminders scheduled.</p> : schedules.map((schedule) => <div key={schedule.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', padding: '0.8rem 0' }}>
              <strong>{schedule.title}</strong><div style={{ color: '#f4d7a0', marginTop: 4 }}>{schedule.eventTitle} · {schedule.programName} · {schedule.frequency}</div>
              <div style={{ color: '#f4d7a0', marginTop: 4 }}>{schedule.body}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, color: '#f4d7a0', fontSize: 13 }}>
                <span>{new Date(schedule.sendAt).toLocaleString('en-IN')}</span><button type="button" onClick={() => cancelSchedule(schedule.id)} style={{ ...buttonStyle, padding: '0.35rem 0.65rem', background: '#ef4444' }}>Cancel</button>
              </div>
            </div>)}
          </div>
        </section>
      </div>
    </main>
  );
}

const panelStyle: React.CSSProperties = { background: 'rgba(20,11,13,0.8)', border: '1px solid rgba(249,210,122,0.35)', borderRadius: 22, padding: '1.25rem' };
const labelStyle: React.CSSProperties = { display: 'grid', gap: '0.45rem', color: '#f6e7c0', marginBottom: '1rem' };
const fieldStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.96)', border: '1px solid rgba(245,196,92,0.5)', borderRadius: 12, color: '#111827', fontSize: 16, padding: '0.8rem 0.9rem' };
const buttonStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #f4d383, #c77921)', color: '#1b0f12', border: 'none', borderRadius: 12, padding: '0.8rem 1.1rem', fontWeight: 800, cursor: 'pointer' };

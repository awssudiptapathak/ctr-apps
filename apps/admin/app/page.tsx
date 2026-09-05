import Link from 'next/link';
import { APP_ROLES } from '@ctr-cms/shared';

const stats = [
  { label: 'Residents', value: '1,248' },
  { label: 'Events', value: '06' },
  { label: 'Nominations', value: '342' },
  { label: 'Tickets', value: '08' },
];

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, rgba(25,9,12,0.96), rgba(88,16,25,0.92) 40%, rgba(28,16,15,0.98))',
        color: '#fff7ea',
      }}
    >
      <div
        style={{
          backgroundImage: "linear-gradient(90deg, rgba(30,10,14,0.8), rgba(30,10,14,0.45)), url('/images/festival-bg.jpeg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <header
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            padding: '1.2rem 1.5rem 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #f4d383, #c77921)',
                display: 'grid',
                placeItems: 'center',
                color: '#1d0d0f',
                fontWeight: 900,
              }}
            >
              C
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1.2 }}>CTR-CMS</div>
              <div style={{ fontSize: 11, letterSpacing: 1.2, color: '#f4d7a0', textTransform: 'uppercase' }}>Belgharia Club Town Cultural Association</div>
            </div>
          </div>

          <nav style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
            <Link href="/login" style={{ color: '#fff7ea', textDecoration: 'none', fontWeight: 700, background: 'rgba(255,255,255,0.08)', padding: '0.7rem 1rem', borderRadius: 999 }}>Sign in</Link>
            <Link href="/dashboard" style={{ color: '#fff7ea', textDecoration: 'none', fontWeight: 700, background: 'rgba(247,197,96,0.12)', border: '1px solid rgba(247,197,96,0.5)', padding: '0.7rem 1rem', borderRadius: 999 }}>Dashboard</Link>
            <Link href="/events" style={{ color: '#fff7ea', textDecoration: 'none', fontWeight: 700, background: 'rgba(255,255,255,0.08)', padding: '0.7rem 1rem', borderRadius: 999 }}>Events</Link>
          </nav>
        </header>

        <section
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            padding: '3.5rem 1.5rem 4.5rem',
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.8fr',
            gap: '2rem',
          }}
        >
          <div>
            <div style={{ color: '#f9d27a', fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 700 }}>Festival management system</div>
            <h1 style={{ margin: '0.8rem 0 1rem', fontSize: 'clamp(2.5rem, 5vw, 5rem)', lineHeight: 1.05, letterSpacing: -1.6 }}>
              Cultural committee operations, beautifully managed.
            </h1>
            <p style={{ maxWidth: 620, margin: 0, lineHeight: 1.7, color: '#f9ecd0', fontSize: 18 }}>
              Plan programs, manage nominations, coordinate slots, publish announcements and celebrate community traditions with a clear digital workflow.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '2rem' }}>
              <Link href="/login" style={{ background: 'linear-gradient(135deg, #f4d383, #c77921)', color: '#1b0f12', textDecoration: 'none', padding: '0.9rem 1.4rem', borderRadius: 999, fontWeight: 800 }}>Admin sign in</Link>
              <Link href="/dashboard" style={{ background: 'rgba(255,255,255,0.08)', color: '#fffaf0', border: '1px solid rgba(249,210,122,0.5)', textDecoration: 'none', padding: '0.9rem 1.4rem', borderRadius: 999, fontWeight: 700 }}>View dashboard</Link>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(19, 10, 12, 0.7)',
              border: '1px solid rgba(249,210,122,0.45)',
              borderRadius: 22,
              padding: '1.25rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ color: '#f5c967', fontSize: 12, textTransform: 'uppercase', letterSpacing: 2 }}>This season</div>
            <div style={{ display: 'grid', gap: '0.8rem', marginTop: '1rem' }}>
              {stats.map((stat) => (
                <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '0.9rem 1rem' }}>
                  <span style={{ color: '#f9ecd0' }}>{stat.label}</span>
                  <strong style={{ color: '#f4d383', fontSize: 22 }}>{stat.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '2rem 1.5rem 3rem' }}>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {APP_ROLES.map((role) => (
            <div key={role} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(249,210,122,0.25)', borderRadius: 16, padding: '1rem 1.1rem' }}>
              <div style={{ color: '#f9d27a', fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase' }}>Role</div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>{role}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearAdminAuth, getAdminUser } from '@/lib/api';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/events', label: 'Events' },
  { href: '/nominations', label: 'Nominations' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/participants', label: 'Participants' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/users', label: 'Users', adminOnly: true },
];

const superAdminLinks = [{ href: '/admin-requests', label: 'Admin requests' }];

export default function AdminNav() {
  const router = useRouter();
  const pathname = usePathname();
  const user = getAdminUser();
  const visibleLinks =
    user?.role === 'SUPER_ADMIN' ? [...navLinks, ...superAdminLinks] : navLinks;

  const handleLogout = () => {
    clearAdminAuth();
    router.replace('/login');
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'rgba(18, 9, 11, 0.92)',
        borderBottom: '1px solid rgba(249,210,122,0.3)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0.8rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <img src="/images/icon.png" alt="CTR" style={{ width: 34, height: 34, borderRadius: 10, objectFit: 'cover' }} />
          <div>
            <div style={{ fontWeight: 800, letterSpacing: 0.8, color: '#f9d27a', fontSize: 16, lineHeight: 1.1 }}>CTR-CMS</div>
            <div style={{ fontSize: 10, letterSpacing: 1, color: '#f4d7a0', textTransform: 'uppercase' }}>Admin console</div>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {visibleLinks.map((link) => {
            const active = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  textDecoration: 'none',
                  fontWeight: 700,
                  borderRadius: 999,
                  padding: '0.5rem 0.85rem',
                  fontSize: 14,
                  background: active ? 'linear-gradient(135deg, #f4d383, #c77921)' : 'transparent',
                  color: active ? '#1b0f12' : '#f4e0b0',
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          {user ? (
            <div style={{ textAlign: 'right', lineHeight: 1.25 }}>
              <div style={{ fontWeight: 800, color: '#fff7ea', fontSize: 14 }}>{user.fullName}</div>
              <div style={{ fontSize: 11, color: '#f4d7a0', textTransform: 'uppercase', letterSpacing: 0.5 }}>{user.role}</div>
            </div>
          ) : null}
          <button
            type="button"
            onClick={handleLogout}
            style={{
              border: '1px solid rgba(249,210,122,0.4)',
              background: 'rgba(255,255,255,0.06)',
              color: '#f4e0b0',
              borderRadius: 999,
              padding: '0.5rem 0.95rem',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, getAdminUser } from '@/lib/api';

interface User {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  flatNo: string | null;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  status: string;
  createdAt: string;
}

const roles: User['role'][] = ['USER', 'ADMIN', 'SUPER_ADMIN'];
const roleBadge: Record<string, string> = {
  USER: '#6366f1',
  ADMIN: '#f59e0b',
  SUPER_ADMIN: '#ef4444',
};

export default function UsersPage() {
  const user = getAdminUser();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', flatNo: '', role: 'USER' as User['role'], password: '' });
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      const data = await api.get<{ users: User[] }>(`/users${q}`);
      setUsers(data.users || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const createUser = async () => {
    setCreating(true);
    setError(null);
    try {
      await api.post<{ user: User }>('/users', {
        fullName: form.fullName,
        phone: form.phone.startsWith('+91') ? form.phone : `+91${form.phone}`,
        email: form.email || undefined,
        flatNo: form.flatNo || undefined,
        role: form.role,
        password: form.password || 'Welcome@123',
      });
      setShowCreate(false);
      setForm({ fullName: '', phone: '', email: '', flatNo: '', role: 'USER', password: '' });
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const changeRole = async (id: string, role: User['role']) => {
    setBusyId(id);
    setError(null);
    try {
      await api.patch<{ user: User }>(`/users/${id}/role`, { role });
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to update role');
    } finally {
      setBusyId(null);
    }
  };

  const changeStatus = async (id: string, status: string) => {
    setBusyId(id);
    setError(null);
    try {
      await api.patch<{ user: User }>(`/users/${id}/status`, { status });
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to update status');
    } finally {
      setBusyId(null);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    setBusyId(id);
    setError(null);
    try {
      await api.delete(`/users/${id}`);
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to delete user');
    } finally {
      setBusyId(null);
    }
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(249,210,122,0.3)',
    borderRadius: 12,
    padding: '0.6rem 0.9rem',
    color: '#fff7ea',
    fontSize: 14,
    outline: 'none',
    width: '100%' as const,
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundImage: "linear-gradient(180deg, rgba(18,9,11,0.88), rgba(42,14,17,0.96)), url('/images/community.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: '#fff7ea',
        padding: '2rem 1.25rem 3rem',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: '#f9d27a', fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 700 }}>
              {isSuperAdmin ? 'Super admin' : 'Admin'}
            </div>
            <h1 style={{ margin: '0.5rem 0 0' }}>Users</h1>
            <p style={{ margin: '0.5rem 0 0', color: '#f5e7c7' }}>Manage resident accounts, roles, and access.</p>
          </div>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setShowCreate(!showCreate)}
              style={{
                border: 'none',
                background: 'linear-gradient(135deg, #f4d383, #c77921)',
                color: '#1b0f12',
                fontWeight: 800,
                borderRadius: 999,
                padding: '0.6rem 1.2rem',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              {showCreate ? 'Cancel' : '+ Create user'}
            </button>
          )}
        </div>

        {showCreate && isSuperAdmin && (
          <div style={{ marginTop: '1.5rem', background: 'rgba(20,11,13,0.85)', border: '1px solid rgba(249,210,122,0.35)', borderRadius: 20, padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', color: '#f9d27a' }}>New user</h3>
            <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              <input placeholder="Full name *" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} style={inputStyle} />
              <input placeholder="Phone * (+91...)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
              <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
              <input placeholder="Flat no." value={form.flatNo} onChange={(e) => setForm({ ...form, flatNo: e.target.value })} style={inputStyle} />
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as User['role'] })} style={{ ...inputStyle, cursor: 'pointer' }}>
                {roles.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <input placeholder="Password (default: Welcome@123)" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={inputStyle} />
            </div>
            <button
              type="button"
              disabled={creating || !form.fullName || !form.phone}
              onClick={createUser}
              style={{
                marginTop: '1rem',
                border: 'none',
                background: creating || !form.fullName || !form.phone ? 'rgba(255,255,255,0.1)' : '#22c55e',
                color: creating || !form.fullName || !form.phone ? '#888' : '#062a14',
                fontWeight: 800,
                borderRadius: 999,
                padding: '0.55rem 1.2rem',
                cursor: creating || !form.fullName || !form.phone ? 'not-allowed' : 'pointer',
                fontSize: 14,
              }}
            >
              {creating ? 'Creating…' : 'Create user'}
            </button>
          </div>
        )}

        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder="Search by name, phone, email, flat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, maxWidth: 400 }}
          />
          <div style={{ color: '#f4d7a0', fontSize: 13 }}>{users.length} user{users.length !== 1 ? 's' : ''}</div>
        </div>

        {error && (
          <div style={{ marginTop: '1rem', background: '#fee2e2', color: '#7f1d1d', borderRadius: 12, padding: '0.9rem 1rem', fontWeight: 700 }}>{error}</div>
        )}

        <section style={{ marginTop: '1.25rem', display: 'grid', gap: '0.75rem' }}>
          {loading ? (
            <div style={{ background: 'rgba(20,11,13,0.8)', border: '1px solid rgba(249,210,122,0.35)', borderRadius: 18, padding: '1.5rem', textAlign: 'center', color: '#f6e7c0' }}>Loading…</div>
          ) : users.length === 0 ? (
            <div style={{ background: 'rgba(20,11,13,0.8)', border: '1px solid rgba(249,210,122,0.35)', borderRadius: 18, padding: '1.5rem', textAlign: 'center', color: '#f6e7c0' }}>No users found.</div>
          ) : (
            users.map((u) => (
              <div key={u.id} style={{ background: 'rgba(20,11,13,0.8)', border: '1px solid rgba(249,210,122,0.25)', borderRadius: 16, padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{u.fullName}</div>
                    <div style={{ color: '#f4d7a0', marginTop: 2, fontSize: 13 }}>{u.phone}{u.email ? ` • ${u.email}` : ''}{u.flatNo ? ` • Flat ${u.flatNo}` : ''}</div>
                    <div style={{ color: '#d9cfa8', fontSize: 12, marginTop: 4 }}>
                      Joined {new Date(u.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ background: u.status === 'ACTIVE' ? '#166534' : '#991b1b', color: '#fff', borderRadius: 999, padding: '0.25rem 0.7rem', fontWeight: 700, fontSize: 11 }}>{u.status}</span>
                    {isSuperAdmin && u.id !== user?.id && (
                      <>
                        <select
                          value={u.role}
                          disabled={busyId === u.id}
                          onChange={(e) => changeRole(u.id, e.target.value as User['role'])}
                          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(249,210,122,0.3)', borderRadius: 8, padding: '0.3rem 0.5rem', color: '#fff7ea', fontSize: 12, cursor: 'pointer' }}
                        >
                          {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <select
                          value={u.status}
                          disabled={busyId === u.id}
                          onChange={(e) => changeStatus(u.id, e.target.value)}
                          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(249,210,122,0.3)', borderRadius: 8, padding: '0.3rem 0.5rem', color: '#fff7ea', fontSize: 12, cursor: 'pointer' }}
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                          <option value="BLOCKED">BLOCKED</option>
                        </select>
                        <button
                          type="button"
                          disabled={busyId === u.id}
                          onClick={() => deleteUser(u.id)}
                          style={{ border: 'none', background: 'rgba(239,68,68,0.2)', color: '#fca5a5', borderRadius: 8, padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </section>

        <footer style={{ marginTop: '3rem', borderTop: '1px solid rgba(249,210,122,0.2)', paddingTop: '1.5rem', textAlign: 'center' }}>
          <div style={{ color: '#f4d7a0', fontSize: 12, lineHeight: 1.8 }}>
            <strong style={{ color: '#f9d27a' }}>Disclaimer:</strong> This platform is intended for use by authorised members of the Clubtown Residential Committee (CTR). All data, including personal details, nominations, and event information, is managed by the committee and should not be shared externally.
          </div>
          <div style={{ color: '#8a7a60', fontSize: 11, marginTop: '0.75rem' }}>
            &copy; {new Date().getFullYear()} Clubtown Residential Committee. All rights reserved.
          </div>
        </footer>
      </div>
    </main>
  );
}

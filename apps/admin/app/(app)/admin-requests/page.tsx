'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, getAdminUser } from '@/lib/api';

type Status = 'PENDING' | 'APPROVED' | 'REJECTED';

interface AdminRequest {
  id: string;
  profileId: string;
  requestedRole: string;
  reason: string | null;
  status: Status;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  requester: {
    fullName: string;
    phone: string;
    email: string | null;
    flatNo: string | null;
    role: string;
    status: string;
  };
}

const tabs: { key: Status | 'ALL'; label: string }[] = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'ALL', label: 'All' },
];

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [activeTab, setActiveTab] = useState<Status | 'ALL'>('PENDING');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const user = getAdminUser();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = activeTab === 'ALL' ? '' : `?status=${activeTab}`;
      const data = await api.get<{ requests: AdminRequest[] }>(`/admin-requests${query}`);
      setRequests(data.requests || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load admin requests');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (id: string, action: 'approve' | 'reject') => {
    setBusyId(id);
    setError(null);
    try {
      await api.post<{ request: AdminRequest }>(`/admin-requests/${id}/${action}`, {});
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const statusColor: Record<Status, string> = {
    PENDING: '#fef3c7',
    APPROVED: '#dcfce7',
    REJECTED: '#fee2e2',
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
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <div style={{ color: '#f9d27a', fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 700 }}>
          {isSuperAdmin ? 'Super admin' : 'Admin'}
        </div>
        <h1 style={{ margin: '0.5rem 0 0' }}>Admin role requests</h1>
        <p style={{ margin: '0.5rem 0 0', color: '#f5e7c7' }}>
          Requests from residents who want admin access. Only your approval promotes them to ADMIN.
        </p>

        {!isSuperAdmin ? (
          <div style={{ marginTop: '1.5rem', background: 'rgba(20,11,13,0.8)', border: '1px solid rgba(249,210,122,0.35)', borderRadius: 18, padding: '1.5rem', color: '#fee2e2' }}>
            Your role does not have permission to approve admin requests. Sign in with a SUPER_ADMIN account.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    border: 'none',
                    borderRadius: 999,
                    padding: '0.5rem 0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: activeTab === tab.key ? 'linear-gradient(135deg, #f4d383, #c77921)' : 'rgba(255,255,255,0.06)',
                    color: activeTab === tab.key ? '#1b0f12' : '#f6e4b7',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {error ? (
              <div style={{ marginTop: '1rem', background: '#fee2e2', color: '#7f1d1d', borderRadius: 12, padding: '0.9rem 1rem', fontWeight: 700 }}>{error}</div>
            ) : null}

            <section style={{ marginTop: '1.25rem', display: 'grid', gap: '1rem' }}>
              {loading ? (
                <div style={{ background: 'rgba(20,11,13,0.8)', border: '1px solid rgba(249,210,122,0.35)', borderRadius: 18, padding: '1.5rem', textAlign: 'center', color: '#f6e7c0' }}>Loading…</div>
              ) : requests.length === 0 ? (
                <div style={{ background: 'rgba(20,11,13,0.8)', border: '1px solid rgba(249,210,122,0.35)', borderRadius: 18, padding: '1.5rem', textAlign: 'center', color: '#f6e7c0' }}>
                  No {activeTab === 'ALL' ? '' : activeTab.toLowerCase() + ' '}admin requests.
                </div>
              ) : (
                requests.map((request) => (
                  <div key={request.id} style={{ background: 'rgba(20,11,13,0.8)', border: '1px solid rgba(249,210,122,0.35)', borderRadius: 20, padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>{request.requester.fullName}</div>
                        <div style={{ color: '#f4d7a0', marginTop: 4 }}>{request.requester.phone}</div>
                        <div style={{ color: '#f4d7a0' }}>
                          {request.requester.email && <span>{request.requester.email} • </span>}
                          {request.requester.flatNo ? `Flat ${request.requester.flatNo}` : 'No flat'}
                          {' • '}Current role: {request.requester.role}
                        </div>
                      </div>
                      <span style={{ background: statusColor[request.status], color: '#111827', borderRadius: 999, padding: '0.35rem 0.7rem', fontWeight: 700, fontSize: 12 }}>{request.status}</span>
                    </div>

                    {request.reason ? (
                      <div style={{ marginTop: '0.85rem', color: '#f6e4b7' }}>“{request.reason}”</div>
                    ) : null}

                    <div style={{ marginTop: '0.6rem', color: '#d9cfa8', fontSize: 13 }}>
                      Requested as {request.requestedRole} • Requested {new Date(request.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>

                    {request.status === 'PENDING' && isSuperAdmin ? (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          disabled={busyId === request.id}
                          onClick={() => decide(request.id, 'approve')}
                          style={{ border: 'none', background: '#22c55e', color: '#062a14', fontWeight: 800, borderRadius: 999, padding: '0.55rem 1rem', cursor: 'pointer' }}
                        >
                          {busyId === request.id ? 'Working…' : 'Approve as ADMIN'}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === request.id}
                          onClick={() => decide(request.id, 'reject')}
                          style={{ border: 'none', background: '#ef4444', color: '#fff', fontWeight: 800, borderRadius: 999, padding: '0.55rem 1rem', cursor: 'pointer' }}
                        >
                          Reject
                        </button>
                      </div>
                    ) : null}

                    {request.reviewedAt ? (
                      <div style={{ marginTop: '0.6rem', color: '#d9cfa8', fontSize: 13 }}>
                        Reviewed {new Date(request.reviewedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

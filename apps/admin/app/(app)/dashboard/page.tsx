'use client';

import { useMemo, useState } from 'react';
import { getNominationDecisionCounts, isNominationWindowOpen, sampleEvents, samplePrograms } from '@ctr-cms/shared';

const initialApprovals = [
  { id: 'n-101', resident: 'Aarav Sharma', program: 'Singing Competition', status: 'PENDING' },
  { id: 'n-102', resident: 'Meera Nair', program: 'Dance Competition', status: 'PENDING' },
  { id: 'n-103', resident: 'Rohan Iyer', program: 'Art & Craft', status: 'WAITLISTED' },
  { id: 'n-104', resident: 'Ishita Shah', program: 'Singing Competition', status: 'APPROVED' },
] as const;

type ApprovalStatus = 'PENDING' | 'WAITLISTED' | 'APPROVED' | 'REJECTED';
type ApprovalRecord = {
  id: string;
  resident: string;
  program: string;
  status: ApprovalStatus;
};

export default function DashboardPage() {
  const [approvals, setApprovals] = useState<ApprovalRecord[]>(
    initialApprovals.map((approval) => ({ ...approval, status: approval.status as ApprovalStatus })),
  );

  const dashboardMetrics = useMemo(() => {
    const pendingCount = approvals.filter((item) => item.status === 'PENDING').length;
    const approvedCount = approvals.filter((item) => item.status === 'APPROVED').length;
    const waitlistedCount = approvals.filter((item) => item.status === 'WAITLISTED').length;
    const openPrograms = samplePrograms.filter((program) => isNominationWindowOpen(program)).length;

    return [
      { label: 'Registered users', value: '1,248' },
      { label: 'Pending approvals', value: String(pendingCount) },
      { label: 'Approved', value: String(approvedCount) },
      { label: 'Open programs', value: String(openPrograms) },
      { label: 'Waitlisted', value: String(waitlistedCount) },
      { label: 'Published events', value: String(sampleEvents.filter((event) => event.status === 'PUBLISHED').length) },
    ];
  }, [approvals]);

  const approvalSummary = useMemo(
    () => getNominationDecisionCounts(approvals.map((item) => ({ status: item.status }))),
    [approvals],
  );

  const handleApprovalDecision = (id: string, decision: 'APPROVED' | 'REJECTED') => {
    setApprovals((current) =>
      current.map((item) => (item.id === id ? { ...item, status: decision } : item)),
    );
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundImage: "linear-gradient(180deg, rgba(18,9,11,0.88), rgba(48,16,16,0.94)), url('/images/festival-bg.jpeg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: '#fff7ea',
        padding: '2rem 1.25rem 3rem',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: '#f9d27a', fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 700 }}>Operations board</div>
            <h1 style={{ margin: '0.5rem 0 0', fontSize: 'clamp(2rem, 4vw, 3rem)' }}>Admin Dashboard</h1>
            <p style={{ margin: '0.5rem 0 0', color: '#f5e7c7' }}>Committee operations overview</p>
          </div>
        </div>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            marginTop: '1.75rem',
          }}
        >
          {dashboardMetrics.map((metric) => (
            <div key={metric.label} style={{ background: 'rgba(25, 12, 14, 0.7)', border: '1px solid rgba(249,210,122,0.3)', borderRadius: 18, padding: '1.25rem' }}>
              <div style={{ color: '#f9e7b0', fontSize: 13 }}>{metric.label}</div>
              <div style={{ fontSize: 30, fontWeight: 800, marginTop: 10, color: '#f4d383' }}>{metric.value}</div>
            </div>
          ))}
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: '1.35fr 0.95fr', gap: '1.5rem', marginTop: '2rem' }}>
          <div style={{ background: 'rgba(26, 14, 17, 0.8)', border: '1px solid rgba(249,210,122,0.3)', borderRadius: 20, padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>Upcoming events</h2>
              <span style={{ color: '#f5d078', fontWeight: 700 }}>{approvalSummary.total} total applications</span>
            </div>

            <div style={{ display: 'grid', gap: '0.9rem' }}>
              {sampleEvents.map((event) => (
                <div key={event.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{event.title}</div>
                      <div style={{ color: '#f4d7a0', marginTop: 4 }}>{event.venue}</div>
                    </div>
                    <span style={{ background: event.status === 'PUBLISHED' ? '#ecfdf5' : '#f3f4f6', color: event.status === 'PUBLISHED' ? '#065f46' : '#374151', borderRadius: 999, padding: '0.35rem 0.7rem', fontWeight: 700 }}>{event.status}</span>
                  </div>

                  <div style={{ marginTop: '0.85rem', color: '#f6e4b7', fontSize: 14 }}>
                    {new Date(event.startAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} - {' '}
                    {new Date(event.endAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>

                  <div style={{ marginTop: '0.9rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {samplePrograms
                      .filter((program) => program.eventId === event.id)
                      .map((program) => (
                        <span key={program.id} style={{ background: isNominationWindowOpen(program) ? 'rgba(52,211,153,0.14)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#f9efcf', borderRadius: 999, padding: '0.35rem 0.65rem', fontSize: 12 }}>
                          {program.name}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'rgba(26, 14, 17, 0.8)', border: '1px solid rgba(249,210,122,0.3)', borderRadius: 20, padding: '1.25rem' }}>
            <h2 style={{ marginTop: 0 }}>Nomination approvals</h2>

            <div style={{ display: 'grid', gap: '0.8rem' }}>
              {approvals.map((approval) => (
                <div key={approval.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{approval.resident}</div>
                      <div style={{ color: '#f4d7a0', fontSize: 13 }}>{approval.program}</div>
                    </div>
                    <span
                      style={{
                        background:
                          approval.status === 'APPROVED'
                            ? '#dcfce7'
                            : approval.status === 'REJECTED'
                              ? '#fee2e2'
                              : approval.status === 'WAITLISTED'
                                ? '#fef3c7'
                                : '#f3f4f6',
                        color: '#111827',
                        borderRadius: 999,
                        padding: '0.3rem 0.6rem',
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {approval.status}
                    </span>
                  </div>

                  {approval.status === 'PENDING' ? (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                      <button onClick={() => handleApprovalDecision(approval.id, 'APPROVED')} style={{ border: 'none', background: '#22c55e', color: '#062a14', fontWeight: 700, borderRadius: 999, padding: '0.45rem 0.8rem', cursor: 'pointer' }}>Approve</button>
                      <button onClick={() => handleApprovalDecision(approval.id, 'REJECTED')} style={{ border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, borderRadius: 999, padding: '0.45rem 0.8rem', cursor: 'pointer' }}>Reject</button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

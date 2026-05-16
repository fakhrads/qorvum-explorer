import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardBody, Badge, Table, Tabs, Modal, Button, Input, Select, Textarea, Progress, DetailRow, Empty } from '../components/ui';
import * as Icons from '../components/icons';
import { useUsers, useCertificates } from '../lib/hooks';
import { useWsContext } from '../lib/ws-context';
import { api, ApiError } from '../lib/api';
import { getConfig } from '../lib/config';
import type { EnrolledUser, RevokeResponse, Certificate } from '../lib/api';

export function PkiPage() {
  const [tab, setTab] = useState('overview');
  const [enrollModal, setEnrollModal] = useState(false);
  const [issueModal, setIssueModal] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<any | null>(null);
  const [certDetail, setCertDetail] = useState<Certificate | null>(null);

  const { data: users, refetch: refetchUsers } = useUsers();
  const { data: certsData, loading: certsLoading, refetch: refetchCerts } = useCertificates();
  const { nodeStatus } = useWsContext();
  const config = getConfig();

  // Derive org list from: current user's org + any orgs seen in enrolled users + peer org hints
  const availableOrgs = useMemo(() => {
    const orgs = new Set<string>();
    if (config.org) orgs.add(config.org);
    // Orgs from enrolled identities
    (users ?? []).forEach(u => { if (u.org) orgs.add(u.org); });
    // Peer IDs sometimes encode org as "peer@OrgName" — best-effort extraction
    (nodeStatus?.peers ?? []).forEach(p => {
      const match = p.peer_id?.match(/@(.+)$/);
      if (match?.[1]) orgs.add(match[1]);
    });
    return Array.from(orgs).sort();
  }, [config.org, users, nodeStatus?.peers]);

  const [enrollData, setEnrollData] = useState({
    username: '',
    password: '',
    email: '',
    org: config.org ?? '',
    roles: 'EMPLOYEE',
    days: '365'
  });
  const [enrolledResult, setEnrolledResult] = useState<EnrolledUser | null>(null);
  const [revokeResult, setRevokeResult] = useState<RevokeResponse | null>(null);
  const [revocationReason, setRevocationReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [issueData, setIssueData] = useState({
    subject: '',
    type: 'User',
    org: config.org ?? '',
    roles: '',
    days: '365',
  });
  const [issueResult, setIssueResult] = useState<EnrolledUser | null>(null);

  const handleEnroll = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.enrollUser({
        username: enrollData.username,
        password: enrollData.password || undefined,
        email: enrollData.email || undefined,
        org: enrollData.org,
        roles: enrollData.roles.split(',').map(r => r.trim()),
        days: parseInt(enrollData.days)
      });
      setEnrolledResult(result);
      setEnrollModal(false);
      refetchUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Enrollment failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.revokeUser(revokeTarget.username, revocationReason);
      setRevokeResult(result);
      setRevokeTarget(null);
      setRevocationReason('');
      refetchUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Revocation failed');
    } finally {
      setLoading(false);
    }
  };

  const userCount = users?.length || 0;

  return (
    <div className="animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">PKI & Certificates</h1>
          <p className="text-sm text-[var(--text-3)] mt-0.5">Post-quantum certificate & user management</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={<Icons.Key size={13} />} onClick={() => setIssueModal(true)}>
            Issue Certificate
          </Button>
          <Button variant="default" size="sm" icon={<Icons.Plus size={13} />} onClick={() => setEnrollModal(true)}>
            Enroll User
          </Button>
        </div>
      </div>

      {/* ── Enrollment success banner ── */}
      {enrolledResult && (
        <div className="mb-4 p-4 rounded-xl bg-emerald-500/8 border border-emerald-500/20 flex items-start gap-3">
          <Icons.ShieldCheck size={16} className="text-emerald-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-400 mb-1">User enrolled successfully</p>
            <p className="text-xs text-[var(--text-3)] mb-2">{enrolledResult.message}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-[var(--text-3)]">
              <span><span className="text-[var(--text-2)]">Username:</span> {enrolledResult.username}@{enrolledResult.org}</span>
              <span><span className="text-[var(--text-2)]">Expires:</span> {new Date(enrolledResult.expires_at * 1000).toLocaleDateString()}</span>
              <span className="break-all"><span className="text-[var(--text-2)]">Fingerprint:</span> <span className="font-mono text-emerald-500/80">{enrolledResult.cert_fingerprint.slice(0, 24)}…</span></span>
            </div>
          </div>
          <button type="button" aria-label="Dismiss" onClick={() => setEnrolledResult(null)} className="text-[var(--text-3)] hover:text-[var(--text)] shrink-0">
            <Icons.X size={14} />
          </button>
        </div>
      )}

      {/* ── Revocation success banner ── */}
      {revokeResult && (
        <div className="mb-4 p-4 rounded-xl bg-red-500/8 border border-red-500/20 flex items-start gap-3">
          <Icons.ShieldAlert size={16} className="text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-400 mb-1">User revoked — {revokeResult.username}</p>
            <p className="text-xs text-[var(--text-3)] mb-2">{revokeResult.message}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-[var(--text-3)]">
              <span><span className="text-[var(--text-2)]">Serial:</span> <span className="font-mono">{revokeResult.serial.slice(0, 16)}…</span></span>
              <span><span className="text-[var(--text-2)]">Reason:</span> {revokeResult.reason}</span>
            </div>
          </div>
          <button type="button" aria-label="Dismiss" onClick={() => setRevokeResult(null)} className="text-[var(--text-3)] hover:text-[var(--text)] shrink-0">
            <Icons.X size={14} />
          </button>
        </div>
      )}

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'certs', label: `Certificates (${certsData?.total ?? 0})` },
          { id: 'users', label: `Users (${userCount})` },
          { id: 'crl', label: `CRL (${Object.keys(certsData?.crl ?? {}).length})` },
        ]}
        active={tab}
        onChange={setTab}
        className="mb-4 w-fit"
      />

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* CA Banner */}
          <div className="relative overflow-hidden rounded-2xl border border-[var(--accent)]/20 bg-gradient-to-r from-[var(--accent-bg)] to-transparent">
            <div className="px-6 py-5 flex items-start gap-5">
              <div className="w-14 h-14 rounded-xl bg-[var(--accent-bg)] border border-[var(--accent)]/20 flex items-center justify-center shrink-0">
                <Icons.ShieldCheck size={26} className="text-[var(--accent)]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-bold text-[var(--text)]">Certificate Authority — {config.org ?? 'Unknown'}</h3>
                  <Badge variant="success" dot>active</Badge>
                </div>
                <p className="text-xs text-[var(--text-3)] mb-4">Dilithium3 (ML-DSA) · NIST FIPS 204 · Post-Quantum Safe</p>
                <div className="flex gap-8">
                  {[
                    ['Active Users', userCount, 'text-[var(--accent)]'],
                    ['Node Certs', '---', 'text-[var(--text-3)]'],
                    ['Revoked', 0, 'text-red-400'],
                  ].map(([l, v, c]) => (
                    <div key={String(l)}>
                      <p className={`text-2xl font-bold ${c} font-mono`}>{v}</p>
                      <p className="text-[11px] text-[var(--text-3)]">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><span className="text-sm font-semibold">Security Level</span></CardHeader>
              <CardBody>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--text-3)]">Signature Algorithm</span>
                    <Badge variant="accent">Dilithium3 (ML-DSA)</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--text-3)]">Key Encapsulation</span>
                    <Badge variant="info">Kyber768 (ML-KEM)</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--text-3)]">Hash Function</span>
                    <Badge variant="success">BLAKE3-256</Badge>
                  </div>
                  <div className="pt-2 border-t border-[var(--border)] flex items-center gap-2">
                    <Icons.ShieldCheck size={14} className="text-emerald-400" />
                    <span className="text-[10px] text-emerald-500 font-medium uppercase tracking-wider">Quantum-Resistant Verified</span>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader><span className="text-sm font-semibold">Management Info</span></CardHeader>
              <CardBody>
                <p className="text-xs text-[var(--text-3)] leading-relaxed">
                  Certificate management is handled via the Qorvum PKI service. Enrolling a user generates a new post-quantum identity.
                  Node certificates are issued during network bootstrapping and rotated automatically.
                </p>
                <div className="mt-4 flex gap-2">
                  <Badge variant="default">FIPS 204 Ready</Badge>
                  <Badge variant="default">CNSA 2.0</Badge>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* ── Certificates ── */}
      {tab === 'certs' && (
        <div className="space-y-4">
          {/* CA Federation banner */}
          {(certsData?.cas ?? []).length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Icons.ShieldCheck size={13} className="text-[var(--accent)]" />
                <span className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider">Trusted Certificate Authorities ({certsData!.cas.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {certsData!.cas.map((ca, i) => (
                  <div key={ca.fingerprint} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent-bg)]">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent-bg)] border border-[var(--accent)]/30 flex items-center justify-center shrink-0">
                      <Icons.ShieldCheck size={14} className="text-[var(--accent)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-[var(--text)] truncate">{ca.name}</p>
                        {i === 0 && <Badge variant="accent" className="text-[9px] px-1 py-0">local</Badge>}
                      </div>
                      <p className="text-[10px] text-[var(--text-3)] mt-0.5">{ca.org} · {ca.algorithm}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="success" dot className="text-[10px]">Active</Badge>
                      <p className="text-[9px] text-[var(--text-3)] mt-0.5">exp {new Date(ca.not_after * 1000).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Certs */}
          <Card>
            <CardHeader action={
              <div className="flex gap-2">
                <Badge variant="default">{(certsData?.certs ?? []).filter(c => c.cert_type === 'User').length} user certs</Badge>
                <Button variant="ghost" size="sm" icon={<Icons.Refresh size={13} />} onClick={() => refetchCerts()}>Refresh</Button>
              </div>
            }>
              <Icons.Users size={15} className="text-[var(--accent)]" />
              <span className="text-sm font-bold text-[var(--text)]">User Certificates</span>
            </CardHeader>
            {certsLoading ? (
              <div className="flex items-center gap-2 px-5 py-8 text-xs text-[var(--text-3)]">
                <Icons.Activity size={13} className="spin" /> Loading certificates…
              </div>
            ) : (certsData?.certs ?? []).filter(c => c.cert_type === 'User').length === 0 ? (
              <Empty icon={<Icons.Key size={20} className="text-[var(--text-3)]" />} title="No user certificates" description="Enroll users to generate certificates" />
            ) : (
              <Table
                columns={[
                  { key: 'subject', label: 'Subject', render: (v, row: any) => (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[var(--accent-bg)] flex items-center justify-center text-[9px] font-bold text-[var(--accent)]">
                        {String(v)[0].toUpperCase()}
                      </div>
                      <div>
                        <span className="font-mono text-xs text-[var(--text)]">{String(v)}</span>
                        <span className="text-[10px] text-[var(--text-3)] ml-1">@{row.org}</span>
                      </div>
                    </div>
                  )},
                  { key: 'roles', label: 'Roles', render: (v: any) => (
                    <div className="flex flex-wrap gap-1">
                      {(v as string[]).map(r => <Badge key={r} variant="accent" className="px-1.5 py-0 text-[10px]">{r}</Badge>)}
                    </div>
                  )},
                  { key: 'algorithm', label: 'Algorithm', render: (v: any) => <Badge variant="info">{String(v)}</Badge> },
                  { key: 'not_after', label: 'Expires', render: (v: any) => (
                    <span className="font-mono text-xs text-[var(--text-3)]">{new Date(Number(v) * 1000).toLocaleDateString()}</span>
                  )},
                  { key: 'status', label: 'Status', render: (v: any) => (
                    <Badge variant={v === 'VALID' ? 'success' : v === 'EXPIRED' ? 'warning' : 'danger'} dot>{String(v)}</Badge>
                  )},
                  { key: 'fingerprint', label: '', render: (_, row: any) => (
                    <button type="button" onClick={() => setCertDetail(row as Certificate)}
                      className="text-[10px] text-[var(--accent)] hover:underline font-mono">
                      Detail
                    </button>
                  )},
                ]}
                data={(certsData?.certs ?? []).filter(c => c.cert_type === 'User') as unknown as Record<string, unknown>[]}
              />
            )}
          </Card>

          {/* Node Certs */}
          <Card>
            <CardHeader action={<Badge variant="default">{(certsData?.certs ?? []).filter(c => c.cert_type === 'Node').length} node certs</Badge>}>
              <Icons.Server size={15} className="text-[var(--accent)]" />
              <span className="text-sm font-bold text-[var(--text)]">Node Certificates</span>
            </CardHeader>
            {certsLoading ? (
              <div className="flex items-center gap-2 px-5 py-8 text-xs text-[var(--text-3)]">
                <Icons.Activity size={13} className="spin" /> Loading…
              </div>
            ) : (certsData?.certs ?? []).filter(c => c.cert_type === 'Node').length === 0 ? (
              <Empty icon={<Icons.Server size={20} className="text-[var(--text-3)]" />} title="No node certificates" description="Node certificates are issued during bootstrapping" />
            ) : (
              <Table
                columns={[
                  { key: 'subject', label: 'Node', render: (v, row: any) => (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-[var(--raised)] border border-[var(--border)] flex items-center justify-center">
                        <Icons.Server size={11} className="text-[var(--text-3)]" />
                      </div>
                      <div>
                        <span className="font-mono text-xs text-[var(--text)]">{String(v)}</span>
                        <span className="text-[10px] text-[var(--text-3)] ml-1">@{row.org}</span>
                      </div>
                    </div>
                  )},
                  { key: 'org_unit', label: 'Unit', render: (v: any) => <span className="text-xs text-[var(--text-3)]">{v ?? '—'}</span> },
                  { key: 'algorithm', label: 'Algorithm', render: (v: any) => <Badge variant="info">{String(v)}</Badge> },
                  { key: 'not_after', label: 'Expires', render: (v: any) => (
                    <span className="font-mono text-xs text-[var(--text-3)]">{new Date(Number(v) * 1000).toLocaleDateString()}</span>
                  )},
                  { key: 'status', label: 'Status', render: (v: any) => (
                    <Badge variant={v === 'VALID' ? 'success' : v === 'EXPIRED' ? 'warning' : 'danger'} dot>{String(v)}</Badge>
                  )},
                  { key: 'fingerprint', label: '', render: (_, row: any) => (
                    <button type="button" onClick={() => setCertDetail(row as Certificate)}
                      className="text-[10px] text-[var(--accent)] hover:underline font-mono">
                      Detail
                    </button>
                  )},
                ]}
                data={(certsData?.certs ?? []).filter(c => c.cert_type === 'Node') as unknown as Record<string, unknown>[]}
              />
            )}
          </Card>
        </div>
      )}

      {/* ── Users ── */}
      {tab === 'users' && (
        <Card>
          <Table
            columns={[
              { key: 'username', label: 'Username', render: v => (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[var(--accent-bg)] flex items-center justify-center text-[10px] font-bold text-[var(--accent)]">
                    {String(v)[0].toUpperCase()}
                  </div>
                  <span className="font-medium text-[var(--text-2)]">{String(v)}</span>
                </div>
              )},
              { key: 'org', label: 'Organization', render: v => <Badge variant="info">{String(v)}</Badge> },
              { key: 'roles', label: 'Roles', render: v => (
                <div className="flex flex-wrap gap-1">
                  {(v as string[] || []).map(r => <Badge key={r} variant="accent">{r}</Badge>)}
                </div>
              )},
              { key: 'status', label: 'Status', render: v => (
                <Badge variant={v === 'VALID' ? 'success' : v === 'EXPIRED' ? 'warning' : 'danger'} dot>{String(v)}</Badge>
              )},
              { key: 'expires_at', label: 'Expires', render: v => <span className="text-xs text-[var(--text-3)]">{v ? new Date(Number(v) * 1000).toLocaleDateString() : 'Never'}</span> },
              { key: 'username', label: '', render: (_, row: any) => row.status === 'VALID' ? (
                <Button variant="danger" size="sm" onClick={e => { e.stopPropagation(); setRevokeTarget(row); }}>
                  Revoke
                </Button>
              ) : null },
            ]}
            data={(users || []) as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      {/* ── CRL ── */}
      {tab === 'crl' && (
        <Card>
          <CardHeader action={<Badge variant="default">{Object.keys(certsData?.crl ?? {}).length} entries</Badge>}>
            <Icons.ShieldAlert size={15} className="text-[var(--accent)]" />
            <span className="text-sm font-bold text-[var(--text)]">Certificate Revocation List (CRL)</span>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/8 border border-blue-500/20 mb-4">
              <Icons.Info size={16} className="text-blue-400 shrink-0" />
              <p className="text-xs text-[var(--text-2)]">
                Certificates listed here are rejected by all nodes immediately upon revocation. No restart required — the CRL is hot-synced in memory.
              </p>
            </div>
            {Object.keys(certsData?.crl ?? {}).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-[var(--text-3)]">
                <div className="p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 mb-3">
                  <Icons.ShieldCheck size={24} className="text-emerald-400" />
                </div>
                <p className="text-sm font-semibold text-[var(--text-2)]">No revocations</p>
                <p className="text-xs mt-1">All issued certificates are currently valid.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(certsData?.crl ?? {}).map(([serial, reason]) => {
                  const cert = certsData?.certs.find(c => c.serial === serial);
                  return (
                    <div key={serial} className="flex items-center gap-3 p-3 rounded-xl border border-red-500/20 bg-red-500/5">
                      <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                        <Icons.ShieldAlert size={13} className="text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-[var(--text)]">{cert?.subject ?? 'Unknown'}</span>
                          {cert?.org && <Badge variant="info" className="text-[10px] px-1.5 py-0">{cert.org}</Badge>}
                        </div>
                        <p className="text-[10px] font-mono text-[var(--text-3)]">serial: {serial.slice(0, 24)}… · reason: {reason}</p>
                      </div>
                      <Badge variant="danger" dot>REVOKED</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* ── Modals ── */}
      <Modal open={!!certDetail} onClose={() => setCertDetail(null)} title="Certificate Detail">
        {certDetail && (
          <div className="space-y-1">
            <DetailRow label="Subject" value={<span className="font-mono text-xs font-semibold text-[var(--text)]">{certDetail.subject}@{certDetail.org}</span>} />
            <DetailRow label="Type" value={<Badge variant={certDetail.cert_type === 'Node' ? 'default' : 'info'}>{certDetail.cert_type}</Badge>} />
            <DetailRow label="Issuer" value={<span className="text-xs">{certDetail.issuer}</span>} />
            <DetailRow label="Algorithm" value={<Badge variant="accent">{certDetail.algorithm}</Badge>} />
            <DetailRow label="Roles" value={
              <div className="flex flex-wrap gap-1 justify-end">
                {certDetail.roles.map(r => <Badge key={r} variant="warning" className="px-1.5 py-0 text-[10px]">{r}</Badge>)}
              </div>
            } />
            {certDetail.email && <DetailRow label="Email" value={certDetail.email} />}
            {certDetail.org_unit && <DetailRow label="Org Unit" value={certDetail.org_unit} />}
            <DetailRow label="Not Before" value={<span className="font-mono text-xs">{new Date(certDetail.not_before * 1000).toISOString()}</span>} />
            <DetailRow label="Not After" value={<span className="font-mono text-xs">{new Date(certDetail.not_after * 1000).toISOString()}</span>} />
            <DetailRow label="Status" value={
              <Badge variant={certDetail.status === 'VALID' ? 'success' : certDetail.status === 'EXPIRED' ? 'warning' : 'danger'} dot>
                {certDetail.status}
              </Badge>
            } />
            {certDetail.revoke_reason && <DetailRow label="Revoke Reason" value={<span className="text-red-400 text-xs">{certDetail.revoke_reason}</span>} />}
            <div className="pt-2 mt-1 border-t border-[var(--border)]">
              <p className="text-[10px] text-[var(--text-3)] mb-1">Fingerprint</p>
              <p className="font-mono text-[11px] text-[var(--accent)] break-all">{certDetail.fingerprint}</p>
            </div>
            <div className="pt-1">
              <p className="text-[10px] text-[var(--text-3)] mb-1">Serial</p>
              <p className="font-mono text-[11px] text-[var(--text-2)] break-all">{certDetail.serial}</p>
            </div>
            <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
              <Icons.ShieldCheck size={13} className="text-emerald-400 shrink-0" />
              <span className="text-[10px] text-emerald-400 font-medium">Post-Quantum Safe · Dilithium3 (ML-DSA) · NIST FIPS 204</span>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={enrollModal} onClose={() => setEnrollModal(false)} title="Enroll New User">
        <div className="space-y-4">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">{error}</div>}
          <div><label className="text-xs font-medium text-[var(--text-3)] mb-1.5 block">Username</label><Input placeholder="newuser" className="w-full" value={enrollData.username} onChange={e => setEnrollData({...enrollData, username: e.target.value})} /></div>
          <div><label className="text-xs font-medium text-[var(--text-3)] mb-1.5 block">Password</label><Input placeholder="••••••••" type="password" className="w-full" value={enrollData.password} onChange={e => setEnrollData({...enrollData, password: e.target.value})} /></div>
          <div><label className="text-xs font-medium text-[var(--text-3)] mb-1.5 block">Email <span className="text-[var(--text-3)]">(optional)</span></label><Input placeholder="user@example.com" type="email" className="w-full" value={enrollData.email} onChange={e => setEnrollData({...enrollData, email: e.target.value})} /></div>
          <div>
            <label className="text-xs font-medium text-[var(--text-3)] mb-1.5 block">Organization</label>
            {availableOrgs.length > 1
              ? <Select options={availableOrgs} className="w-full" value={enrollData.org} onChange={v => setEnrollData({...enrollData, org: v})} />
              : <Input placeholder={config.org ?? 'OrgName'} className="w-full" value={enrollData.org} onChange={e => setEnrollData({...enrollData, org: e.target.value})} />
            }
          </div>
          <div><label className="text-xs font-medium text-[var(--text-3)] mb-1.5 block">Roles (comma-separated)</label><Input placeholder="EMPLOYEE, HR_MANAGER" className="w-full" value={enrollData.roles} onChange={e => setEnrollData({...enrollData, roles: e.target.value})} /></div>
          <div><label className="text-xs font-medium text-[var(--text-3)] mb-1.5 block">Validity (days)</label><Input placeholder="365" type="number" className="w-full" value={enrollData.days} onChange={e => setEnrollData({...enrollData, days: e.target.value})} /></div>
          <Button variant="default" className="w-full" icon={<Icons.Plus size={13} />} onClick={handleEnroll} disabled={loading}>{loading ? 'Enrolling...' : 'Enroll User'}</Button>
        </div>
      </Modal>

      <Modal open={issueModal} onClose={() => { setIssueModal(false); setIssueResult(null); setError(null); }} title="Issue Certificate">
        <div className="space-y-4">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">{error}</div>}

          {issueResult ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/8 border border-emerald-500/20 flex items-start gap-3">
                <Icons.ShieldCheck size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-400 mb-1">Certificate issued successfully</p>
                  <p className="text-xs text-[var(--text-3)]">{issueResult.message}</p>
                </div>
              </div>
              <div className="bg-[var(--raised)]/50 rounded-xl border border-[var(--border)] p-4 space-y-0">
                <DetailRow label="Subject" value={<span className="font-bold">{issueResult.username}@{issueResult.org}</span>} />
                <DetailRow label="Roles" value={<div className="flex flex-wrap gap-1 justify-end">{issueResult.roles.map(r => <Badge key={r} variant="accent" className="px-1.5 py-0 text-[10px]">{r}</Badge>)}</div>} />
                <DetailRow label="Expires" value={new Date(issueResult.expires_at * 1000).toLocaleDateString()} />
                <DetailRow label="Fingerprint" value={<span className="font-mono text-[10px] text-emerald-500/80 break-all">{issueResult.cert_fingerprint}</span>} />
              </div>
              <Button variant="outline" className="w-full" onClick={() => { setIssueModal(false); setIssueResult(null); }}>Close</Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[var(--text-3)] mb-1.5 block">Subject Name</label>
                  <Input placeholder="node4 or username" className="w-full" value={issueData.subject} onChange={e => setIssueData({...issueData, subject: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-3)] mb-1.5 block">Type</label>
                  <Select options={['User', 'Node', 'Service']} className="w-full" value={issueData.type} onChange={v => setIssueData({...issueData, type: v})} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-3)] mb-1.5 block">Organization</label>
                {availableOrgs.length > 1
                  ? <Select options={availableOrgs} className="w-full" value={issueData.org} onChange={v => setIssueData({...issueData, org: v})} />
                  : <Input placeholder={config.org ?? 'OrgName'} className="w-full" value={issueData.org} onChange={e => setIssueData({...issueData, org: e.target.value})} />
                }
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-3)] mb-1.5 block">
                  Roles <span className="normal-case font-normal">(comma-separated)</span>
                </label>
                <Input
                  placeholder={issueData.type === 'Node' ? 'PEER_NODE' : 'EMPLOYEE, HR_MANAGER'}
                  className="w-full"
                  value={issueData.roles}
                  onChange={e => setIssueData({...issueData, roles: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-3)] mb-1.5 block">Validity (days)</label>
                <Input placeholder="365" type="number" className="w-full" value={issueData.days} onChange={e => setIssueData({...issueData, days: e.target.value})} />
              </div>
              <div className="p-3 rounded-xl bg-[var(--accent-bg)] border border-[var(--accent)]/20 flex items-center gap-2">
                <Icons.ShieldCheck size={13} className="text-[var(--accent)] shrink-0" />
                <p className="text-xs text-[var(--accent)]">Dilithium3 (ML-DSA · FIPS 204) — Post-Quantum Safe</p>
              </div>
              <Button variant="default" className="w-full" icon={<Icons.Key size={13} />} disabled={loading}
                onClick={async () => {
                  if (!issueData.subject) { setError('Subject name is required'); return; }
                  setLoading(true); setError(null);
                  try {
                    const result = await api.enrollUser({
                      username: issueData.subject,
                      org: issueData.org || (config.org ?? ''),
                      roles: issueData.roles ? issueData.roles.split(',').map(r => r.trim()) : [issueData.type === 'Node' ? 'PEER_NODE' : 'EMPLOYEE'],
                      days: parseInt(issueData.days) || 365,
                    });
                    setIssueResult(result);
                    refetchUsers();
                  } catch (err) {
                    setError(err instanceof ApiError ? err.message : 'Certificate issuance failed');
                  } finally {
                    setLoading(false);
                  }
                }}>
                {loading ? 'Issuing…' : 'Issue Certificate'}
              </Button>
            </>
          )}
        </div>
      </Modal>

      <Modal open={!!revokeTarget} onClose={() => setRevokeTarget(null)} title="Revoke Access">
        {revokeTarget && (
          <div className="space-y-4">
            {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">{error}</div>}
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400 font-medium mb-1">Warning: This action cannot be undone</p>
              <p className="text-xs text-[var(--text-3)]">
                You are about to revoke access for <strong className="text-[var(--text-2)]">{revokeTarget.username}</strong>. Existing tokens will be immediately rejected.
              </p>
            </div>
            <div><label className="text-xs font-medium text-[var(--text-3)] mb-1.5 block">Reason</label>
              <Textarea placeholder="Reason for revocation..." value={revocationReason} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRevocationReason(e.target.value)} /></div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setRevokeTarget(null)}>Cancel</Button>
              <Button variant="danger" className="flex-1" onClick={handleRevoke} icon={<Icons.XCircle size={13} />} disabled={loading}>
                {loading ? 'Revoking...' : 'Revoke'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

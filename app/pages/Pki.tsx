import React, { useState } from 'react';
import { Card, CardHeader, CardBody, Badge, Table, Tabs, Modal, Button, Input, Select, Textarea, Progress, DetailRow } from '../components/ui';
import * as Icons from '../components/icons';
import { useUsers } from '../lib/hooks';
import { api, ApiError } from '../lib/api';
import type { EnrolledUser, RevokeResponse } from '../lib/api';

export function PkiPage() {
  const [tab, setTab] = useState('overview');
  const [enrollModal, setEnrollModal] = useState(false);
  const [issueModal, setIssueModal] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<any | null>(null);
  const [certDetail, setCertDetail] = useState<any | null>(null);
  
  const { data: users, refetch: refetchUsers } = useUsers();
  
  const [enrollData, setEnrollData] = useState({
    username: '',
    password: '',
    email: '',
    org: 'Org1',
    roles: 'EMPLOYEE',
    days: '365'
  });
  const [enrolledResult, setEnrolledResult] = useState<EnrolledUser | null>(null);
  const [revokeResult, setRevokeResult] = useState<RevokeResponse | null>(null);
  const [revocationReason, setRevocationReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">PKI & Certificates</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Post-quantum certificate & user management</p>
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
            <p className="text-xs text-zinc-400 mb-2">{enrolledResult.message}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-zinc-500">
              <span><span className="text-zinc-400">Username:</span> {enrolledResult.username}@{enrolledResult.org}</span>
              <span><span className="text-zinc-400">Expires:</span> {new Date(enrolledResult.expires_at * 1000).toLocaleDateString()}</span>
              <span className="break-all"><span className="text-zinc-400">Fingerprint:</span> <span className="font-mono text-emerald-500/80">{enrolledResult.cert_fingerprint.slice(0, 24)}…</span></span>
            </div>
          </div>
          <button type="button" aria-label="Dismiss" onClick={() => setEnrolledResult(null)} className="text-zinc-600 hover:text-zinc-400 shrink-0">
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
            <p className="text-xs text-zinc-400 mb-2">{revokeResult.message}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-zinc-500">
              <span><span className="text-zinc-400">Serial:</span> <span className="font-mono">{revokeResult.serial.slice(0, 16)}…</span></span>
              <span><span className="text-zinc-400">Reason:</span> {revokeResult.reason}</span>
            </div>
          </div>
          <button type="button" aria-label="Dismiss" onClick={() => setRevokeResult(null)} className="text-zinc-600 hover:text-zinc-400 shrink-0">
            <Icons.X size={14} />
          </button>
        </div>
      )}

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'certs', label: 'Certificates' },
          { id: 'users', label: `Users (${userCount})` },
          { id: 'crl', label: 'CRL' },
        ]}
        active={tab}
        onChange={setTab}
        className="mb-4 w-fit"
      />

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* CA Banner */}
          <div className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-linear-to-r from-emerald-500/6 to-violet-500/4">
            <div className="px-6 py-5 flex items-start gap-5">
              <div className="w-14 h-14 rounded-xl bg-linear-to-br from-emerald-400/20 to-violet-400/20 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Icons.ShieldCheck size={26} className="text-emerald-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-bold text-zinc-100">Certificate Authority — Org1</h3>
                  <Badge variant="success" dot>active</Badge>
                </div>
                <p className="text-xs text-zinc-500 mb-4">Dilithium3 (ML-DSA) · NIST FIPS 204 · Post-Quantum Safe</p>
                <div className="flex gap-8">
                  {[
                    ['Active Users', userCount, 'text-emerald-400'],
                    ['Node Certs', '---', 'text-zinc-500'],
                    ['Revoked', 0, 'text-red-400'],
                  ].map(([l, v, c]) => (
                    <div key={String(l)}>
                      <p className={`text-2xl font-bold ${c} font-mono`}>{v}</p>
                      <p className="text-[11px] text-zinc-500">{l}</p>
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
                    <span className="text-xs text-zinc-400">Signature Algorithm</span>
                    <Badge variant="accent">Dilithium3 (ML-DSA)</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">Key Encapsulation</span>
                    <Badge variant="info">Kyber768 (ML-KEM)</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">Hash Function</span>
                    <Badge variant="success">BLAKE3-256</Badge>
                  </div>
                  <div className="pt-2 border-t border-zinc-800 flex items-center gap-2">
                    <Icons.ShieldCheck size={14} className="text-emerald-400" />
                    <span className="text-[10px] text-emerald-500 font-medium uppercase tracking-wider">Quantum-Resistant Verified</span>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader><span className="text-sm font-semibold">Management Info</span></CardHeader>
              <CardBody>
                <p className="text-xs text-zinc-500 leading-relaxed">
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
        <Card>
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <Icons.Key size={40} className="mb-4 opacity-20" />
            <p className="text-sm">No certificates found.</p>
            <p className="text-xs mt-1">Certificate listing API is not yet available.</p>
          </div>
        </Card>
      )}

      {/* ── Users ── */}
      {tab === 'users' && (
        <Card>
          <Table
            columns={[
              { key: 'username', label: 'Username', render: v => (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                    {String(v)[0].toUpperCase()}
                  </div>
                  <span className="font-medium text-zinc-200">{String(v)}</span>
                </div>
              )},
              { key: 'org', label: 'Organization', render: v => <Badge variant="info">{String(v)}</Badge> },
              { key: 'roles', label: 'Roles', render: v => (
                <div className="flex flex-wrap gap-1">
                  {(v as string[] || []).map(r => <Badge key={r} variant="accent">{r}</Badge>)}
                </div>
              )},
              { key: 'status', label: 'Status', render: v => <Badge variant={v === 'VALID' ? 'success' : 'danger'} dot>{String(v)}</Badge> },
              { key: 'expires_at', label: 'Expires', render: v => <span className="text-xs text-zinc-500">{v ? new Date(Number(v) * 1000).toLocaleDateString() : 'Never'}</span> },
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
          <CardHeader><span className="text-sm font-semibold">Certificate Revocation List (CRL)</span></CardHeader>
          <CardBody>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/8 border border-blue-500/20 mb-5">
              <Icons.Info size={16} className="text-blue-400 shrink-0" />
              <p className="text-xs text-zinc-300">
                The CRL contains certificates that have been revoked. All nodes automatically reject P2P connections from certificates listed here.
              </p>
            </div>
            <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
              <Icons.ShieldAlert size={30} className="mb-2 opacity-20" />
              <p className="text-xs italic">The revocation list is currently empty.</p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── Modals ── */}
      <Modal open={!!certDetail} onClose={() => setCertDetail(null)} title="Certificate Detail">
        {certDetail && (
          <div className="space-y-1">
            <DetailRow label="Serial" value={<span className="font-mono text-emerald-400">{certDetail.serial}</span>} />
            <DetailRow label="Subject" value={certDetail.subject} />
            <DetailRow label="Type" value={<Badge variant="info">{certDetail.type}</Badge>} />
            <DetailRow label="Algorithm" value={<Badge variant="accent">{certDetail.algo}</Badge>} />
            <DetailRow label="Roles" value={<div className="flex flex-wrap gap-1">{(certDetail.roles || []).map((r: string) => <Badge key={r} variant="warning">{r}</Badge>)}</div>} />
            <DetailRow label="Issued" value={certDetail.issued} />
            <DetailRow label="Expires" value={certDetail.expires} />
            <DetailRow label="Status" value={<Badge variant={certDetail.status === 'VALID' ? 'success' : certDetail.status === 'EXPIRING' ? 'warning' : 'danger'} dot>{certDetail.status}</Badge>} />
            <DetailRow label="Security" value="Post-Quantum Safe (NIST FIPS 204)" />
          </div>
        )}
      </Modal>

      <Modal open={enrollModal} onClose={() => setEnrollModal(false)} title="Enroll New User">
        <div className="space-y-4">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">{error}</div>}
          <div><label className="text-xs font-medium text-zinc-400 mb-1.5 block">Username</label><Input placeholder="newuser" className="w-full" value={enrollData.username} onChange={e => setEnrollData({...enrollData, username: e.target.value})} /></div>
          <div><label className="text-xs font-medium text-zinc-400 mb-1.5 block">Password</label><Input placeholder="••••••••" type="password" className="w-full" value={enrollData.password} onChange={e => setEnrollData({...enrollData, password: e.target.value})} /></div>
          <div><label className="text-xs font-medium text-zinc-400 mb-1.5 block">Email <span className="text-zinc-600">(optional)</span></label><Input placeholder="user@example.com" type="email" className="w-full" value={enrollData.email} onChange={e => setEnrollData({...enrollData, email: e.target.value})} /></div>
          <div><label className="text-xs font-medium text-zinc-400 mb-1.5 block">Organization</label><Select options={['Org1', 'Org2']} className="w-full" value={enrollData.org} onChange={v => setEnrollData({...enrollData, org: v})} /></div>
          <div><label className="text-xs font-medium text-zinc-400 mb-1.5 block">Roles (comma-separated)</label><Input placeholder="EMPLOYEE, HR_MANAGER" className="w-full" value={enrollData.roles} onChange={e => setEnrollData({...enrollData, roles: e.target.value})} /></div>
          <div><label className="text-xs font-medium text-zinc-400 mb-1.5 block">Validity (days)</label><Input placeholder="365" type="number" className="w-full" value={enrollData.days} onChange={e => setEnrollData({...enrollData, days: e.target.value})} /></div>
          <Button variant="default" className="w-full" icon={<Icons.Plus size={13} />} onClick={handleEnroll} disabled={loading}>{loading ? 'Enrolling...' : 'Enroll User'}</Button>
        </div>
      </Modal>

      <Modal open={issueModal} onClose={() => setIssueModal(false)} title="Issue Certificate">
        <div className="space-y-4">
          <div><label className="text-xs font-medium text-zinc-400 mb-1.5 block">Subject Name</label><Input placeholder="node4" className="w-full" /></div>
          <div><label className="text-xs font-medium text-zinc-400 mb-1.5 block">Type</label><Select options={['User', 'Node']} className="w-full" /></div>
          <div><label className="text-xs font-medium text-zinc-400 mb-1.5 block">Roles</label><Input placeholder="PEER_NODE" className="w-full" /></div>
          <div><label className="text-xs font-medium text-zinc-400 mb-1.5 block">Validity (days)</label><Input placeholder="3650" type="number" className="w-full" /></div>
          <div className="p-3 rounded-lg bg-emerald-500/8 border border-emerald-500/20">
            <p className="text-xs text-emerald-400">Certificate will be issued using Dilithium3 (FIPS 204) algorithm</p>
          </div>
          <Button variant="default" className="w-full" icon={<Icons.Key size={13} />} onClick={() => setIssueModal(false)}>Issue Certificate</Button>
        </div>
      </Modal>

      <Modal open={!!revokeTarget} onClose={() => setRevokeTarget(null)} title="Revoke Access">
        {revokeTarget && (
          <div className="space-y-4">
            {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">{error}</div>}
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400 font-medium mb-1">Warning: This action cannot be undone</p>
              <p className="text-xs text-zinc-500">
                You are about to revoke access for <strong className="text-zinc-300">{revokeTarget.username}</strong>. Existing tokens will be immediately rejected.
              </p>
            </div>
            <div><label className="text-xs font-medium text-zinc-400 mb-1.5 block">Reason</label>
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

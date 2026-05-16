import React, { useState } from 'react';
import { Card, CardHeader, CardBody, Badge, Button, Input, DetailRow, Table, Empty } from '../components/ui';
import * as Icons from '../components/icons';
import { useHealth, useUsers, useContracts } from '../lib/hooks';
import { useWsContext } from '../lib/ws-context';
import { api, ApiError } from '../lib/api';
import { getConfig } from '../lib/config';

// ── Role Gate ─────────────────────────────────────────────────────────────────
function RoleGate({ children }: { children: React.ReactNode }) {
  const { roles } = getConfig();
  if (!roles.includes('ADMIN')) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="p-4 rounded-2xl bg-red-500/8 border border-red-500/20">
          <Icons.ShieldAlert size={32} className="text-red-400" />
        </div>
        <p className="text-sm font-semibold text-[var(--text-2)]">Access Restricted</p>
        <p className="text-xs text-[var(--text-3)]">ADMIN role required to access this area.</p>
      </div>
    );
  }
  return <>{children}</>;
}

// ── System Overview ───────────────────────────────────────────────────────────
function SystemOverview() {
  const { data: health } = useHealth();
  const { nodeStatus, connected } = useWsContext();
  const config = getConfig();

  const rows = [
    { label: 'Gateway URL', value: <span className="font-mono text-xs">{config.baseUrl}</span> },
    { label: 'Channel', value: health?.data?.channel ?? '—' },
    { label: 'Mode', value: <Badge variant={health?.data?.mode === 'consensus' ? 'success' : 'warning'}>{health?.data?.mode ?? '—'}</Badge> },
    { label: 'Version', value: <span className="font-mono text-xs">{health?.data?.version ?? '—'}</span> },
    { label: 'Latest Block', value: health?.data?.latest_block?.toLocaleString() ?? '—' },
    { label: 'Peer Count', value: nodeStatus?.peer_count ?? 0 },
    { label: 'WebSocket', value: <Badge variant={connected ? 'success' : 'danger'} dot>{connected ? 'Connected' : 'Disconnected'}</Badge> },
    { label: 'Network Status', value: <Badge variant={health?.data?.status === 'ok' ? 'success' : 'danger'} dot>{health?.data?.status ?? '—'}</Badge> },
  ];

  return (
    <Card>
      <CardHeader>
        <Icons.Activity size={15} className="text-[var(--accent)]" />
        <span className="text-sm font-bold text-[var(--text)]">System Overview</span>
      </CardHeader>
      <CardBody className="space-y-0">
        {rows.map(r => <DetailRow key={r.label} label={r.label} value={r.value} />)}
      </CardBody>
    </Card>
  );
}

// ── Identity Overview ─────────────────────────────────────────────────────────
function IdentityOverview() {
  const { data: users, refetch } = useUsers();
  const [search, setSearch] = useState('');

  const filtered = (users ?? []).filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.org.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { key: 'username', label: 'Username', render: (v: unknown) => (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-[var(--raised)] border border-[var(--border)] flex items-center justify-center text-[9px] font-bold text-[var(--text-2)]">
          {String(v)[0].toUpperCase()}
        </div>
        <span className="font-mono text-xs">{String(v)}</span>
      </div>
    )},
    { key: 'org', label: 'Org', render: (v: unknown) => <Badge variant="info">{String(v)}</Badge> },
    { key: 'roles', label: 'Roles', render: (v: unknown) => (
      <div className="flex flex-wrap gap-1">
        {(v as string[]).map(r => <Badge key={r} variant="default" className="px-1.5 py-0 text-[10px]">{r}</Badge>)}
      </div>
    )},
    { key: 'status', label: 'Status', render: (v: unknown) => (
      <Badge variant={v === 'VALID' ? 'success' : 'danger'} dot>{String(v)}</Badge>
    )},
    { key: 'expires_at', label: 'Expires', render: (v: unknown) => (
      <span className="font-mono text-xs text-[var(--text-3)]">
        {v ? new Date((v as number) * 1000).toLocaleDateString() : '—'}
      </span>
    )},
  ];

  return (
    <Card>
      <CardHeader
        action={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={<Icons.Refresh size={13} />} onClick={() => refetch()}>Refresh</Button>
            <Badge variant="default">{users?.length ?? 0} identities</Badge>
          </div>
        }>
        <Icons.Users size={15} className="text-[var(--accent)]" />
        <span className="text-sm font-bold text-[var(--text)]">Enrolled Identities</span>
      </CardHeader>
      <div className="px-5 pt-3 pb-1">
        <Input
          icon={<Icons.Search size={13} />}
          placeholder="Filter by username or org…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-xs"
        />
      </div>
      {filtered.length === 0
        ? <Empty icon={<Icons.Users size={20} className="text-[var(--text-3)]" />} title="No identities" description="Enroll users in PKI & Certs" />
        : <Table columns={columns as any} data={filtered as any} />
      }
    </Card>
  );
}

// ── Contract Registry ─────────────────────────────────────────────────────────
function ContractRegistry() {
  const { data: contracts, refetch } = useContracts(0);

  const columns = [
    { key: 'id', label: 'Contract ID', render: (v: unknown) => (
      <span className="font-mono text-xs font-semibold text-[var(--accent)]">{String(v)}</span>
    )},
    { key: 'kind', label: 'Kind', render: (v: unknown) => (
      <Badge variant={v === 'native' ? 'success' : 'info'}>{String(v).toUpperCase()}</Badge>
    )},
    { key: 'functions', label: 'Exports', render: (v: unknown) => (
      <span className="text-xs text-[var(--text-3)]">{(v as string[]).length} fn</span>
    )},
  ];

  return (
    <Card>
      <CardHeader action={
        <Button variant="ghost" size="sm" icon={<Icons.Refresh size={13} />} onClick={() => refetch()}>Refresh</Button>
      }>
        <Icons.Code size={15} className="text-[var(--accent)]" />
        <span className="text-sm font-bold text-[var(--text)]">Contract Registry</span>
      </CardHeader>
      {!contracts || contracts.length === 0
        ? <Empty icon={<Icons.Code size={20} className="text-[var(--text-3)]" />} title="No contracts deployed" description="Deploy contracts via the Contracts page" />
        : <Table columns={columns as any} data={contracts as any} />
      }
    </Card>
  );
}

// ── Org Management ────────────────────────────────────────────────────────────
function OrgManagement() {
  const { nodeStatus } = useWsContext();
  const config = getConfig();

  const orgs = Array.from(new Set([
    config.org,
    ...(nodeStatus?.peers ?? []).map(p => p.peer_id?.split('@')[1] ?? null),
  ].filter(Boolean))) as string[];

  return (
    <Card>
      <CardHeader>
        <Icons.Building2 size={15} className="text-[var(--accent)]" />
        <span className="text-sm font-bold text-[var(--text)]">Network Organizations</span>
      </CardHeader>
      <CardBody>
        {orgs.length === 0 ? (
          <p className="text-xs text-[var(--text-3)]">No org information available from connected peers.</p>
        ) : (
          <div className="space-y-2">
            {orgs.map(org => (
              <div key={org} className="flex items-center justify-between p-3 rounded-xl bg-[var(--raised)] border border-[var(--border-subtle)]">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[var(--accent-bg)] flex items-center justify-center">
                    <Icons.Building2 size={13} className="text-[var(--accent)]" />
                  </div>
                  <span className="text-sm font-semibold text-[var(--text)]">{org}</span>
                </div>
                <Badge variant={org === config.org ? 'accent' : 'default'}>
                  {org === config.org ? 'Current' : 'Peer'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ── Audit Log ─────────────────────────────────────────────────────────────────
function AuditLog() {
  const { events } = useWsContext();

  const typeLabel: Record<string, { label: string; color: string }> = {
    block:       { label: 'BLOCK',    color: 'text-[var(--accent)]' },
    tx:          { label: 'TX',       color: 'text-blue-400' },
    node_status: { label: 'NODE',     color: 'text-zinc-400' },
    connected:   { label: 'CONNECT',  color: 'text-emerald-400' },
    heartbeat:   { label: 'PING',     color: 'text-[var(--text-3)]' },
  };

  return (
    <Card>
      <CardHeader action={<Badge variant="default">{events.length} events</Badge>}>
        <Icons.ClipboardList size={15} className="text-[var(--accent)]" />
        <span className="text-sm font-bold text-[var(--text)]">Live Audit Trail</span>
      </CardHeader>
      <div className="max-h-72 overflow-y-auto scrollbar-thin">
        {events.length === 0 ? (
          <Empty icon={<Icons.Activity size={20} className="text-[var(--text-3)]" />} title="No events yet" description="Waiting for network activity…" />
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {events.slice(0, 30).map((ev, i) => {
              const meta = typeLabel[ev.type] ?? { label: ev.type.toUpperCase(), color: 'text-[var(--text-3)]' };
              return (
                <div key={i} className="flex items-start gap-3 px-5 py-2.5">
                  <span className={`text-[10px] font-bold font-mono w-16 shrink-0 pt-0.5 ${meta.color}`}>{meta.label}</span>
                  <span className="text-[11px] text-[var(--text-3)] font-mono break-all leading-relaxed">
                    {JSON.stringify(ev.data).slice(0, 120)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Danger Zone ───────────────────────────────────────────────────────────────
function DangerZone() {
  const [clearing, setClearing] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleClearCache = async () => {
    setClearing(true);
    setMsg(null);
    try {
      await api.getHealth();
      setMsg({ type: 'ok', text: 'Health check passed — gateway is reachable.' });
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof ApiError ? e.message : 'Gateway unreachable.' });
    } finally {
      setClearing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <Icons.ShieldAlert size={15} className="text-red-400" />
        <span className="text-sm font-bold text-[var(--text)]">Maintenance</span>
      </CardHeader>
      <CardBody className="space-y-4">
        {msg && (
          <div className={`p-3 rounded-xl text-xs border ${msg.type === 'ok' ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400' : 'bg-red-500/8 border-red-500/20 text-red-400'}`}>
            {msg.text}
          </div>
        )}
        <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--raised)]/40">
          <div>
            <p className="text-xs font-semibold text-[var(--text)]">Gateway Health Check</p>
            <p className="text-[11px] text-[var(--text-3)] mt-0.5">Verify the gateway is reachable and responding.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleClearCache} disabled={clearing}>
            {clearing ? 'Checking…' : 'Run Check'}
          </Button>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl border border-red-500/20 bg-red-500/5">
          <div>
            <p className="text-xs font-semibold text-red-400">Re-authentication Required</p>
            <p className="text-[11px] text-[var(--text-3)] mt-0.5">Force all sessions to re-authenticate via PKI.</p>
          </div>
          <Button variant="danger" size="sm" icon={<Icons.Lock size={13} />} onClick={() => {}}>
            Force Re-auth
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function AdminToolsPage() {
  const [tab, setTab] = useState<'overview' | 'identity' | 'contracts' | 'audit'>('overview');

  const tabs = [
    { id: 'overview',   label: 'System',     icon: Icons.Activity },
    { id: 'identity',   label: 'Identities', icon: Icons.Users },
    { id: 'contracts',  label: 'Registry',   icon: Icons.Code },
    { id: 'audit',      label: 'Audit',      icon: Icons.ClipboardList },
  ] as const;

  return (
    <RoleGate>
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-[var(--text)]">Admin Tools</h1>
            <p className="text-xs text-[var(--text-3)] mt-0.5">System management — ADMIN access only</p>
          </div>
          <Badge variant="danger" dot>ADMIN</Badge>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-[var(--raised)] border border-[var(--border)] rounded-2xl p-1 w-fit">
          {tabs.map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all
                ${tab === t.id ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm' : 'text-[var(--text-3)] hover:text-[var(--text-2)]'}`}>
              <t.icon size={13} />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <SystemOverview />
            <OrgManagement />
            <div className="xl:col-span-2"><DangerZone /></div>
          </div>
        )}
        {tab === 'identity' && <IdentityOverview />}
        {tab === 'contracts' && <ContractRegistry />}
        {tab === 'audit' && <AuditLog />}
      </div>
    </RoleGate>
  );
}

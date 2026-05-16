import React, { useState, useRef } from 'react';
import { Card, CardHeader, CardBody, Badge, Button, Input, Select, DetailRow, Empty } from '../components/ui';
import * as Icons from '../components/icons';
import { api, ApiError } from '../lib/api';
import { useHealth, useContracts } from '../lib/hooks';
import { useWsContext } from '../lib/ws-context';
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
        <p className="text-xs text-[var(--text-3)]">ADMIN role required for Dev Console.</p>
      </div>
    );
  }
  return <>{children}</>;
}

// ── Raw Invoke Console ────────────────────────────────────────────────────────
function InvokeConsole() {
  const { data: contracts } = useContracts(0);
  const [contractId, setContractId] = useState('');
  const [fnName, setFnName] = useState('');
  const [argsText, setArgsText] = useState('{\n  \n}');
  const [mode, setMode] = useState<'invoke' | 'query'>('invoke');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contractIds = (contracts ?? []).map(c => c.id);
  const selectedContract = contracts?.find(c => c.id === contractId);

  const run = async () => {
    if (!contractId || !fnName) { setError('Contract ID and function name required.'); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      let args: object = {};
      if (argsText.trim() && argsText.trim() !== '{}') {
        args = JSON.parse(argsText);
      }
      if (mode === 'invoke') {
        const res = await api.invoke(contractId, fnName, args);
        setResult(JSON.stringify(res, null, 2));
      } else {
        const res = await api.query(contractId, fnName, args);
        setResult(JSON.stringify(res, null, 2));
      }
    } catch (e) {
      setError(e instanceof ApiError ? `[${e.status}] ${e.message}` : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <Icons.Terminal size={15} className="text-[var(--accent)]" />
        <span className="text-sm font-bold text-[var(--text)]">Raw Invoke / Query Console</span>
      </CardHeader>
      <CardBody className="space-y-4">
        {/* Mode */}
        <div className="flex gap-1 bg-[var(--raised)] border border-[var(--border)] rounded-xl p-1 w-fit">
          {(['invoke', 'query'] as const).map(m => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${mode === m ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm' : 'text-[var(--text-3)] hover:text-[var(--text-2)]'}`}>
              {m.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider mb-1.5 block">Contract</label>
            {contractIds.length > 0
              ? <Select options={contractIds} value={contractId} onChange={v => { setContractId(v); setFnName(''); }} className="w-full" />
              : <Input placeholder="contract-id" value={contractId} onChange={e => setContractId(e.target.value)} className="w-full" />
            }
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider mb-1.5 block">Function</label>
            {selectedContract?.functions.length
              ? <Select options={selectedContract.functions} value={fnName} onChange={setFnName} className="w-full" />
              : <Input placeholder="function_name" value={fnName} onChange={e => setFnName(e.target.value)} className="w-full" />
            }
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider mb-1.5 block">Arguments (JSON)</label>
          <textarea
            value={argsText}
            onChange={e => setArgsText(e.target.value)}
            rows={5}
            className="w-full bg-[var(--code-bg)] border border-[var(--border)] text-[var(--text-2)] placeholder:text-[var(--text-3)] rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-[var(--accent)]/40 transition-all resize-none code-editor-textarea"
          />
        </div>

        <Button variant="default" size="sm" onClick={run} disabled={loading} icon={<Icons.Play size={13} />}>
          {loading ? 'Running…' : `Execute ${mode.toUpperCase()}`}
        </Button>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/8 border border-red-500/20 text-red-400 text-xs font-mono">{error}</div>
        )}
        {result && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--code-bg)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
              <span className="text-[10px] font-mono text-[var(--text-3)]">response</span>
              <Badge variant="success">OK</Badge>
            </div>
            <pre className="p-4 text-xs font-mono text-emerald-400 overflow-auto max-h-60 scrollbar-thin whitespace-pre-wrap">{result}</pre>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ── WS Diagnostics ────────────────────────────────────────────────────────────
function WsDiagnostics() {
  const { connected, nodeStatus, latestBlock, latestTx } = useWsContext();

  const rows = [
    { label: 'Connection', value: <Badge variant={connected ? 'success' : 'danger'} dot>{connected ? 'OPEN' : 'CLOSED'}</Badge> },
    { label: 'Node Status', value: nodeStatus?.status ? <Badge variant="success">{nodeStatus.status}</Badge> : <span className="text-[var(--text-3)]">—</span> },
    { label: 'Peer Count', value: nodeStatus?.peer_count ?? 0 },
    { label: 'Latest Block', value: latestBlock?.block_num != null ? <span className="font-mono text-xs">#{latestBlock.block_num}</span> : '—' },
    { label: 'Last TX Contract', value: latestTx?.contract_id ? <span className="font-mono text-xs">{latestTx.contract_id}</span> : '—' },
    { label: 'Last TX Function', value: latestTx?.function_name ? <span className="font-mono text-xs">{latestTx.function_name}</span> : '—' },
  ];

  return (
    <Card>
      <CardHeader>
        <Icons.Activity size={15} className="text-[var(--accent)]" />
        <span className="text-sm font-bold text-[var(--text)]">WebSocket Diagnostics</span>
      </CardHeader>
      <CardBody className="space-y-0">
        {rows.map(r => <DetailRow key={r.label} label={r.label} value={r.value} />)}
      </CardBody>
    </Card>
  );
}

// ── Config Inspector ──────────────────────────────────────────────────────────
function ConfigInspector() {
  const config = getConfig();
  const [show, setShow] = useState(false);

  const safe = {
    baseUrl: config.baseUrl,
    username: config.username,
    org: config.org,
    roles: config.roles,
    tokenExpiry: config.tokenExpiry
      ? new Date(config.tokenExpiry * 1000).toISOString()
      : null,
    token: show ? config.token : config.token ? `${config.token.slice(0, 20)}…[redacted]` : null,
  };

  return (
    <Card>
      <CardHeader action={
        <button type="button" onClick={() => setShow(v => !v)}
          className="text-[11px] text-[var(--text-3)] hover:text-[var(--text)] transition-colors flex items-center gap-1">
          {show ? <Icons.EyeOff size={12} /> : <Icons.Eye size={12} />}
          {show ? 'Hide token' : 'Reveal token'}
        </button>
      }>
        <Icons.Hash size={15} className="text-[var(--accent)]" />
        <span className="text-sm font-bold text-[var(--text)]">Config Inspector</span>
      </CardHeader>
      <div className="rounded-b-2xl overflow-hidden">
        <pre className="px-5 py-4 text-xs font-mono text-[var(--text-2)] bg-[var(--code-bg)] overflow-auto scrollbar-thin max-h-64 whitespace-pre-wrap">
          {JSON.stringify(safe, null, 2)}
        </pre>
      </div>
    </Card>
  );
}

// ── Health Diagnostics ────────────────────────────────────────────────────────
function HealthDiagnostics() {
  const { data: health, error, loading, refetch } = useHealth(0);

  return (
    <Card>
      <CardHeader action={
        <Button variant="ghost" size="sm" icon={<Icons.Refresh size={13} />} onClick={() => refetch()}>
          {loading ? 'Checking…' : 'Re-check'}
        </Button>
      }>
        <Icons.Server size={15} className="text-[var(--accent)]" />
        <span className="text-sm font-bold text-[var(--text)]">Health Check</span>
      </CardHeader>
      <CardBody>
        {error ? (
          <div className="p-3 rounded-xl bg-red-500/8 border border-red-500/20 text-red-400 text-xs font-mono">{error.message}</div>
        ) : loading ? (
          <div className="flex items-center gap-2 text-xs text-[var(--text-3)]">
            <Icons.Activity size={13} className="spin" /> Checking gateway…
          </div>
        ) : (
          <div className="space-y-0">
            <DetailRow label="Status" value={<Badge variant={health?.data?.status === 'ok' ? 'success' : 'danger'} dot>{health?.data?.status ?? '—'}</Badge>} />
            <DetailRow label="Channel" value={health?.data?.channel ?? '—'} />
            <DetailRow label="Mode" value={<Badge variant="info">{health?.data?.mode ?? '—'}</Badge>} />
            <DetailRow label="Version" value={<span className="font-mono text-xs">{health?.data?.version ?? '—'}</span>} />
            <DetailRow label="Block Height" value={health?.data?.latest_block?.toLocaleString() ?? '—'} />
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function DevToolsPage() {
  return (
    <RoleGate>
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-[var(--text)]">Dev Console</h1>
            <p className="text-xs text-[var(--text-3)] mt-0.5">Raw API access, diagnostics, config inspector</p>
          </div>
          <Badge variant="warning" dot>DEV MODE</Badge>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="xl:col-span-2"><InvokeConsole /></div>
          <WsDiagnostics />
          <HealthDiagnostics />
          <div className="xl:col-span-2"><ConfigInspector /></div>
        </div>
      </div>
    </RoleGate>
  );
}

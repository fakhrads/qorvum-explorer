import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, StatCard, Badge, Table, HashDisplay, Progress } from '../components/ui';
import * as Icons from '../components/icons';
import { useHealth, useBlocks, useTransactions, useContracts, useWsEvents } from '../lib/hooks';
import { formatTxId } from '../lib/api';
import { timeAgo } from '../lib/utils';

type SetPage = (page: string) => void;

// ── Bar chart ────────────────────────────────────────────────────────────────
function TxVolumeChart({ latestBlock }: { latestBlock?: number }) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now = new Date();
  const currentMonth = now.getMonth();
  const labels = Array.from({ length: 9 }, (_, i) => months[(currentMonth - 8 + i + 12) % 12]);
  const values = [820, 1240, 1580, 980, 1240, 1420, 1100, 760, latestBlock || 420];
  const maxVal = Math.max(...values);
  const activeIdx = values.length - 1;
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div>
      <div className="flex items-end gap-2" style={{ height: 160 }}>
        {labels.map((m, i) => {
          const pct = (values[i] / maxVal) * 100;
          const isActive = i === activeIdx;
          const isHover = hovered === i;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 relative"
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              {isHover && (
                <div className="absolute z-10 -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[var(--text)] text-[var(--surface)] text-[10px] font-bold whitespace-nowrap shadow-lg">
                  {values[i].toLocaleString()} txs
                </div>
              )}
              <div className="w-full flex items-end" style={{ height: 130 }}>
                <div
                  className="w-full transition-all duration-400 rounded-xl cursor-pointer"
                  style={{
                    height: `${pct}%`,
                    background: 'var(--accent)',
                    opacity: isActive ? 1 : isHover ? 0.6 : 0.2,
                    minHeight: 6,
                  }}
                />
              </div>
              <span className={`text-[10px] font-semibold ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-3)]'}`}>{m}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────
export function DashboardPage({ setPage }: { setPage: SetPage }) {
  const { data: health } = useHealth();
  const { nodeStatus } = useWsEvents();
  const { data: blocks } = useBlocks(7);
  const { data: transactions } = useTransactions(8);
  const { data: contracts } = useContracts();
  const [txPool] = useState(0);
  const [barHeights] = useState(() => Array.from({ length: 12 }, () => 10 + Math.random() * 40));

  const totalTxCount = blocks?.reduce((sum: number, b: any) => sum + (b.metadata?.tx_count || 0), 0) ?? null;
  const latestBlock = health?.data?.latest_block;

  const stats = [
    {
      label: 'Total Blocks',
      value: latestBlock?.toLocaleString() || '---',
      icon: <Icons.Cube size={20} className="text-[var(--accent)]" />,
      change: 'Real-time', trend: 'up' as const, color: 'blue',
    },
    {
      label: 'Transactions',
      value: totalTxCount != null ? totalTxCount.toLocaleString() : '---',
      icon: <Icons.Zap size={20} className="text-blue-400" />,
      change: 'Latest blocks', trend: 'up' as const, color: 'blue',
    },
    {
      label: 'Active Nodes',
      value: health?.data?.status === 'ok'
        ? `${1 + (nodeStatus?.peer_count ?? 0)}/${1 + (nodeStatus?.peer_count ?? 0)}`
        : '0/1',
      icon: <Icons.Server size={20} className="text-emerald-400" />,
      change: health?.data?.mode || 'dev', trend: 'up' as const, color: 'green',
    },
    {
      label: 'System Status',
      value: health?.data?.status?.toUpperCase() || 'OFFLINE',
      icon: <Icons.Activity size={20} className="text-amber-400" />,
      change: health?.data?.version || 'v0.1.0', trend: 'up' as const, color: 'amber',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--text)]">Welcome back, Admin!</h1>
          <p className="text-sm text-[var(--text-3)] mt-0.5">Qorvum blockchain network overview</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="success" dot>HotStuff BFT</Badge>
          <Badge variant="accent">Dilithium3</Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* PQ Security Banner */}
      <Card className="overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--accent-bg), transparent)' }}>
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--accent-bg)] border border-[var(--accent)]/20 flex items-center justify-center shrink-0">
              <Icons.ShieldCheck size={22} className="text-[var(--accent)]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-sm font-bold text-[var(--text)]">Post-Quantum Security Active</h3>
                <Badge variant="success" dot>Protected</Badge>
              </div>
              <p className="text-xs text-[var(--text-3)]">ML-DSA (Dilithium3) · ML-KEM (Kyber768) · BLAKE3-256 · Hybrid PQ-TLS</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            {['FIPS 204', 'FIPS 203', 'BLAKE3'].map(s => (
              <span key={s} className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent)]/20">{s}</span>
            ))}
          </div>
        </div>
      </Card>

      {/* Chart + Network Health */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Transaction Volume Chart */}
        <Card className="xl:col-span-2">
          <CardHeader action={
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--raised)] border border-[var(--border)] text-xs font-medium text-[var(--text-2)] cursor-pointer">
              <Icons.ChevronDown size={13} />
              <span>Current Month</span>
            </div>
          }>
            <Icons.Activity size={15} className="text-[var(--accent)]" />
            <span className="text-sm font-bold">Transaction Volume</span>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-6 mb-4">
              <div>
                <span className="text-xs text-[var(--text-3)]">This month</span>
                <p className="text-xl font-extrabold text-[var(--text)]">
                  {(latestBlock || 0).toLocaleString()}
                  {' '}<span className="text-sm font-bold text-emerald-400">+12%</span>
                </p>
              </div>
              <div>
                <span className="text-xs text-[var(--text-3)]">Daily average</span>
                <p className="text-xl font-extrabold text-[var(--text)]">
                  {latestBlock ? Math.round(latestBlock / 30).toLocaleString() : '---'}
                </p>
              </div>
            </div>
            <TxVolumeChart latestBlock={latestBlock} />
          </CardBody>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* Network Health */}
          <Card>
            <CardHeader>
              <Icons.Activity size={15} className="text-[var(--accent)]" />
              <span className="text-sm font-bold">Network Health</span>
            </CardHeader>
            <CardBody>
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${health?.data?.status === 'ok' ? 'bg-emerald-400 dot-pulse' : 'bg-red-400'}`} />
                    <span className="text-xs font-medium text-[var(--text-2)]">primary-gateway</span>
                  </div>
                  <Badge variant={health?.data?.status === 'ok' ? 'success' : 'danger'}>
                    {health?.data?.status === 'ok' ? 'online' : 'offline'}
                  </Badge>
                </div>
                <p className="text-[10px] text-[var(--text-3)] py-1 italic">Node-level metrics coming soon.</p>
              </div>
              <div className="pt-3 border-t border-[var(--border-subtle)]">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[var(--text-3)]">Consensus Status</span>
                  <span className="text-[var(--accent)] font-semibold">
                    {health?.data?.mode === 'consensus' ? 'Active' : 'Dev Mode'}
                  </span>
                </div>
                <Progress value={health?.data?.mode === 'consensus' ? 100 : 25} />
              </div>
            </CardBody>
          </Card>

          {/* TX Pool sparkline */}
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-[var(--text-2)]">Transaction Pool</span>
                <Badge variant={txPool > 0 ? 'warning' : 'success'}>{txPool} pending</Badge>
              </div>
              <div className="flex items-end gap-1.5 h-14">
                {barHeights.map((h, i) => (
                  <div key={i} className="flex-1 rounded-md bg-[var(--accent)] transition-all duration-300"
                    style={{ height: `${h}%`, opacity: 0.15 + (i / barHeights.length) * 0.55 }} />
                ))}
              </div>
              <p className="text-[10px] text-[var(--text-3)] mt-2 font-medium">Last 12 blocks</p>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Latest Blocks */}
      <Card>
        <CardHeader action={
          <button type="button" onClick={() => setPage('explorer')} className="flex items-center gap-1 text-xs text-[var(--text-3)] hover:text-[var(--accent)] transition-colors font-medium">
            View all <Icons.ArrowRight size={12} />
          </button>
        }>
          <Icons.Cube size={15} className="text-[var(--accent)]" />
          <span className="text-sm font-bold">Latest Blocks</span>
        </CardHeader>
        <div className="divide-y divide-[var(--border-subtle)]">
          {blocks?.map((block: any, i: number) => {
            const height = block.header?.block_number;
            const hash = block.metadata?.block_hash;
            const timestamp = block.header?.timestamp;
            const txCount = block.metadata?.tx_count;
            const creator = block.header?.creator_msp_id;
            return (
              <div key={height} onClick={() => setPage('explorer')}
                className="flex items-center justify-between px-5 py-3 hover:bg-[var(--raised)]/50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent-bg)] flex items-center justify-center text-xs font-bold text-[var(--accent)] font-mono shrink-0">
                    #{height}
                  </div>
                  <div>
                    <HashDisplay hash={hash} />
                    <p className="text-[11px] text-[var(--text-3)] mt-0.5">{txCount} txs · {creator}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="success">committed</Badge>
                  <span className="text-[11px] text-[var(--text-3)] tabular-nums">{timeAgo(timestamp)}</span>
                </div>
              </div>
            );
          })}
          {(!blocks || blocks.length === 0) && (
            <p className="py-12 text-center text-sm text-[var(--text-3)]">No blocks found.</p>
          )}
        </div>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader action={
          <button type="button" onClick={() => setPage('explorer')} className="flex items-center gap-1 text-xs text-[var(--text-3)] hover:text-[var(--accent)] transition-colors font-medium">
            View all <Icons.ArrowRight size={12} />
          </button>
        }>
          <Icons.Zap size={15} className="text-blue-400" />
          <span className="text-sm font-bold">Recent Transactions</span>
        </CardHeader>
        <Table
          columns={[
            {
              key: 'tx_id', label: 'TX ID',
              render: (v: any) => { const id = Array.isArray(v) ? formatTxId(v) : v; return <HashDisplay hash={id} />; }
            },
            {
              key: 'function_name', label: 'Function',
              render: (v: any, row: any) => (
                <span className="font-mono text-xs">
                  <span className="text-[var(--text-3)]">{row.contract_id}.</span>
                  <span className="text-[var(--text)]">{v}</span>
                </span>
              )
            },
            {
              key: 'channel_id', label: 'Channel',
              render: (v: any) => <span className="text-xs text-[var(--text-3)]">{v}</span>
            },
            {
              key: 'status', label: 'Status',
              render: v => {
                const s = String(v || 'committed');
                return <Badge variant={s === 'committed' ? 'success' : s === 'pending' ? 'warning' : 'danger'}>{s}</Badge>;
              }
            },
            {
              key: 'timestamp', label: 'Time',
              render: (v: any) => <span className="text-xs text-[var(--text-3)] tabular-nums">{timeAgo(v)}</span>
            },
          ]}
          data={(transactions || []) as unknown as Record<string, unknown>[]}
          onRowClick={() => setPage('explorer')}
        />
        {(!transactions || transactions.length === 0) && (
          <p className="py-12 text-center text-sm text-[var(--text-3)]">No recent transactions.</p>
        )}
      </Card>

      {/* Active Contracts + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <Icons.Code size={15} className="text-[var(--accent)]" />
            <span className="text-sm font-bold">Active Contracts</span>
          </CardHeader>
          {contracts && contracts.length > 0 ? (
            <div className="divide-y divide-[var(--border-subtle)]">
              {contracts.map((cc: any) => (
                <div key={cc.id} className="flex items-center justify-between px-5 py-3 hover:bg-[var(--raised)]/50 cursor-pointer transition-colors"
                  onClick={() => setPage('contracts')}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[var(--raised)] border border-[var(--border)] flex items-center justify-center shrink-0">
                      <Icons.Code size={15} className="text-[var(--text-2)]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)] font-mono">{cc.id}</p>
                      <p className="text-[11px] text-[var(--text-3)] mt-0.5">{cc.functions.length} function{cc.functions.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <Badge variant={cc.kind === 'native' ? 'success' : 'info'}>{cc.kind}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--text-3)]">
              <Icons.Code size={28} className="mb-2 opacity-20" />
              <p className="text-sm">No contracts deployed.</p>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <Icons.Zap size={15} className="text-[var(--accent)]" />
            <span className="text-sm font-bold">Quick Actions</span>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <Icons.Upload size={18} />, label: 'Deploy Contract', page: 'contracts', color: 'text-[var(--accent)]' },
                { icon: <Icons.Users size={18} />, label: 'Enroll User', page: 'pki', color: 'text-blue-400' },
                { icon: <Icons.Key size={18} />, label: 'Issue Certificate', page: 'pki', color: 'text-zinc-400' },
                { icon: <Icons.Terminal size={18} />, label: 'API Playground', page: 'api', color: 'text-amber-400' },
              ].map(a => (
                <button key={a.label} type="button" onClick={() => setPage(a.page)}
                  className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/30 hover:shadow-md hover:shadow-[var(--accent)]/5 transition-all text-[var(--text-2)] hover:text-[var(--text)]">
                  <span className={a.color}>{a.icon}</span>
                  <span className="text-xs font-semibold text-center">{a.label}</span>
                </button>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

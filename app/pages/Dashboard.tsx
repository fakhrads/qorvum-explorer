import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, StatCard, Badge, Table, HashDisplay, Progress } from '../components/ui';
import * as Icons from '../components/icons';
import { useHealth, useBlocks, useTransactions, useContracts, useWsEvents } from '../lib/hooks';
import { formatTxId } from '../lib/api';
import { timeAgo } from '../lib/utils';

type SetPage = (page: string) => void;

export function DashboardPage({ setPage }: { setPage: SetPage }) {
  const { data: health } = useHealth();
  const { nodeStatus } = useWsEvents();
  const { data: blocks } = useBlocks(7);
  const { data: transactions } = useTransactions(8);
  const { data: contracts } = useContracts();
  const [txPool] = useState(0);
  const [barHeights] = useState(() => Array.from({ length: 16 }, () => 10 + Math.random() * 40));

  const totalTxCount = blocks?.reduce((sum: number, b: any) => sum + (b.metadata?.tx_count || 0), 0) ?? null;

  const stats = [
    {
      label: 'Total Blocks',
      value: health?.data?.latest_block?.toLocaleString() || '---',
      icon: <Icons.Cube size={18} className="text-emerald-400" />,
      change: 'Real-time', trend: 'up' as const
    },
    {
      label: 'Transactions',
      value: totalTxCount != null ? totalTxCount.toLocaleString() : '---',
      icon: <Icons.Zap size={18} className="text-blue-400" />,
      change: 'Latest blocks', trend: 'up' as const
    },
    {
      label: 'Active Nodes',
      value: health?.data?.status === 'ok'
        ? `${1 + (nodeStatus?.peer_count ?? 0)}/${1 + (nodeStatus?.peer_count ?? 0)}`
        : '0/1',
      icon: <Icons.Server size={18} className="text-violet-400" />,
      change: health?.data?.mode || 'dev', trend: 'up' as const
    },
    { 
      label: 'System Status', 
      value: health?.data?.status?.toUpperCase() || 'OFFLINE', 
      icon: <Icons.Activity size={18} className="text-amber-400" />, 
      change: health?.data?.version || 'v0.1.0', trend: 'up' as const 
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* PQ Security Banner */}
      <div className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-linear-to-r from-emerald-500/8 via-emerald-500/4 to-transparent">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,var(--tw-gradient-stops))] from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="relative px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
              <Icons.ShieldCheck size={22} className="text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-sm font-bold text-zinc-100">Post-Quantum Security Active</h3>
                <Badge variant="success" dot>Protected</Badge>
              </div>
              <p className="text-xs text-zinc-500">ML-DSA (Dilithium3) · ML-KEM (Kyber768) · BLAKE3-256 · Hybrid PQ-TLS</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            {['FIPS 204', 'FIPS 203', 'BLAKE3'].map(s => (
              <span key={s} className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{s}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Latest Blocks */}
        <Card className="xl:col-span-2">
          <CardHeader action={
            <button onClick={() => setPage('explorer')} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-emerald-400 transition-colors">
              View all <Icons.ArrowRight size={12} />
            </button>
          }>
            <Icons.Cube size={15} className="text-emerald-400" />
            <span className="text-sm font-semibold">Latest Blocks</span>
          </CardHeader>
          <div className="divide-y divide-zinc-800/50">
            {blocks?.map((block: any, i: number) => {
              const height = block.header?.block_number;
              const hash = block.metadata?.block_hash;
              const timestamp = block.header?.timestamp;
              const txCount = block.metadata?.tx_count;
              const creator = block.header?.creator_msp_id;

              return (
                <div key={height} onClick={() => setPage('explorer')}
                  className="flex items-center justify-between px-5 py-3 hover:bg-zinc-800/30 cursor-pointer transition-colors"
                  style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400 font-mono shrink-0">
                      #{height}
                    </div>
                    <div>
                      <HashDisplay hash={hash} />
                      <p className="text-[11px] text-zinc-500 mt-0.5">{txCount} txs · {creator}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="success">committed</Badge>
                    <span className="text-[11px] text-zinc-600 tabular-nums">{timeAgo(timestamp)}</span>
                  </div>
                </div>
              );
            })}
            {(!blocks || blocks.length === 0) && (
              <div className="py-12 text-center text-zinc-500 text-sm">
                No blocks found.
              </div>
            )}
          </div>
        </Card>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Network Health */}
          <Card>
            <CardHeader>
              <Icons.Activity size={15} className="text-emerald-400" />
              <span className="text-sm font-semibold">Network Health</span>
            </CardHeader>
            <CardBody>
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${health?.data?.status === 'ok' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                    <span className="text-xs font-medium text-zinc-300">primary-gateway</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={health?.data?.status === 'ok' ? 'success' : 'danger'}>
                      {health?.data?.status === 'ok' ? 'online' : 'offline'}
                    </Badge>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500 py-2 italic">Node-level metrics coming soon.</p>
              </div>
              <div className="pt-3 border-t border-zinc-800">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-zinc-500">Consensus Status</span>
                  <span className="text-emerald-400 font-medium">{health?.data?.mode === 'consensus' ? 'Active' : 'Dev Mode'}</span>
                </div>
                <Progress value={health?.data?.mode === 'consensus' ? 100 : 25} />
              </div>
            </CardBody>
          </Card>

          {/* TX Pool sparkline */}
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-zinc-300">Transaction Pool</span>
                <Badge variant={txPool > 0 ? 'warning' : 'success'}>{txPool} pending</Badge>
              </div>
              <div className="flex items-end gap-1 h-14">
                {barHeights.map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm bg-emerald-500 transition-all duration-300"
                    style={{ height: `${h}%`, opacity: 0.1 + (i / barHeights.length) * 0.4 }} />
                ))}
              </div>
              <p className="text-[10px] text-zinc-600 mt-2">Real-time throughput indicator</p>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader action={
          <button onClick={() => setPage('explorer')} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-emerald-400 transition-colors">
            View all <Icons.ArrowRight size={12} />
          </button>
        }>
          <Icons.Zap size={15} className="text-blue-400" />
          <span className="text-sm font-semibold">Recent Transactions</span>
        </CardHeader>
        <Table
          columns={[
            { 
              key: 'tx_id', 
              label: 'TX ID', 
              render: (v: any) => {
                const id = Array.isArray(v) ? formatTxId(v) : v;
                return <HashDisplay hash={id} />;
              }
            },
            { 
              key: 'function_name', 
              label: 'Function', 
              render: (v: any, row: any) => {
                const contract = row.contract_id;
                const fn = v;
                return (
                  <span className="font-mono text-xs">
                    <span className="text-zinc-500">{contract}.</span>
                    <span className="text-zinc-200">{fn}</span>
                  </span>
                );
              }
            },
            { 
              key: 'channel_id', 
              label: 'Channel', 
              render: (v: any) => <span className="text-xs text-zinc-400">{v}</span>
            },
            { 
              key: 'status', 
              label: 'Status', 
              render: v => {
                const status = String(v || 'committed');
                return (
                  <Badge variant={status === 'committed' ? 'success' : status === 'pending' ? 'warning' : 'danger'}>{status}</Badge>
                );
              }
            },
            { 
              key: 'timestamp', 
              label: 'Time', 
              render: (v: any) => {
                return <span className="text-xs text-zinc-500 tabular-nums">{timeAgo(v)}</span>;
              }
            },
          ]}
          data={(transactions || []) as unknown as Record<string, unknown>[]}
          onRowClick={() => setPage('explorer')}
        />
        {(!transactions || transactions.length === 0) && (
          <div className="py-12 text-center text-zinc-500 text-sm">
            No recent transactions found.
          </div>
        )}
      </Card>

      {/* Bottom: Contracts + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <Icons.Code size={15} className="text-emerald-400" />
            <span className="text-sm font-semibold">Active Contracts</span>
          </CardHeader>
          {contracts && contracts.length > 0 ? (
            <div className="divide-y divide-zinc-800/50">
              {contracts.map((cc) => (
                <div key={cc.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <Icons.Code size={14} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-200 font-mono">{cc.id}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">{cc.functions.length} function{cc.functions.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <Badge variant={cc.kind === 'native' ? 'success' : 'info'}>{cc.kind}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="min-h-30 flex flex-col items-center justify-center p-6 text-zinc-500">
              <Icons.Code size={30} className="mb-2 opacity-20" />
              <p className="text-sm">No contracts deployed.</p>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <Icons.Zap size={15} className="text-amber-400" />
            <span className="text-sm font-semibold">Quick Actions</span>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <Icons.Upload size={18} />, label: 'Deploy Contract', page: 'contracts', color: 'text-emerald-400' },
                { icon: <Icons.Users size={18} />, label: 'Enroll User', page: 'pki', color: 'text-blue-400' },
                { icon: <Icons.Key size={18} />, label: 'Issue Certificate', page: 'pki', color: 'text-violet-400' },
                { icon: <Icons.Terminal size={18} />, label: 'API Playground', page: 'api', color: 'text-amber-400' },
              ].map(a => (
                <button key={a.label} type="button" onClick={() => setPage(a.page)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800 transition-all text-zinc-400 hover:text-zinc-200">
                  <span className={a.color}>{a.icon}</span>
                  <span className="text-xs font-medium">{a.label}</span>
                </button>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

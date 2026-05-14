import React, { useState } from 'react';
import { Card, CardHeader, CardBody, Badge, Progress } from '../components/ui';
import * as Icons from '../components/icons';
import { useHealth, useWsEvents } from '../lib/hooks';
import { getConfig } from '../lib/config';


export function NodesPage() {
  const { data: health } = useHealth();
  const { nodeStatus } = useWsEvents();
  const [selected, setSelected] = useState<any | null>(null);

  const primaryRole = health?.data?.mode === 'consensus' ? 'validator' : 'gateway';
  const selfOrg = getConfig().org || 'Org1';
  const peerNodes = (nodeStatus?.peers ?? []).map((p, i) => ({
    id: `peer-${i}`,
    name: `peer-${i + 1}`,
    role: 'validator' as const,
    status: 'online' as const,
    ip: p.addr,
    cpu: 0, mem: 0, latency: 0,
    blocks: nodeStatus?.latest_block ?? 0,
    peers: 0,
    uptime: 'Active',
    org: 'Org1',
    version: '-',
    peer_id: p.peer_id,
  }));

  const nodes: any[] = health?.data ? [
    {
      id: 'node-primary',
      name: 'node-primary',
      role: primaryRole,
      status: health.data.status === 'ok' ? 'online' : 'offline',
      ip: getConfig().baseUrl,
      cpu: 0,
      mem: 0,
      latency: 0,
      blocks: health.data.latest_block ?? 0,
      peers: nodeStatus?.peer_count ?? 0,
      uptime: 'Active',
      org: selfOrg,
      version: health.data.version || 'v0.1.0',
      mode: health.data.mode,
      peer_id: null,
    },
    ...peerNodes,
  ] : [];

  const roleIcon = (role: string) => {
    if (role === 'validator') return <Icons.ShieldCheck size={18} className="text-emerald-400" />;
    if (role === 'gateway') return <Icons.Globe size={18} className="text-blue-400" />;
    return <Icons.Network size={18} className="text-amber-400" />;
  };

  const roleBg = (role: string) => {
    if (role === 'validator') return 'bg-emerald-500/10 border-emerald-500/20';
    if (role === 'gateway') return 'bg-blue-500/10 border-blue-500/20';
    return 'bg-amber-500/10 border-amber-500/20';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Node Monitor</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Network node health and status overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" dot>Live Network</Badge>
          {health?.data && <Badge variant="info">Block #{health.data.latest_block}</Badge>}
        </div>
      </div>

      {nodes.length > 0 ? (
        <>
          {/* Node Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {nodes.map(node => (
              <Card key={node.id} hover onClick={() => setSelected(selected?.id === node.id ? null : node)}
                className={`transition-all ${selected?.id === node.id ? 'border-emerald-500/40 bg-zinc-900' : ''}`}>
                <CardBody>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${roleBg(node.role)}`}>
                        {roleIcon(node.role)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-100">{node.name}</p>
                        <p className="text-[11px] text-zinc-500 font-mono">{node.ip}</p>
                      </div>
                    </div>
                    <Badge variant={node.status === 'online' ? 'success' : node.status === 'syncing' ? 'warning' : 'danger'} dot>
                      {node.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: 'CPU', val: node.cpu, unit: '%', color: node.cpu > 70 ? 'bg-red-400' : 'bg-emerald-500' },
                      { label: 'Memory', val: node.mem, unit: '%', color: node.mem > 70 ? 'bg-red-400' : 'bg-blue-500' },
                      { label: 'Latency', val: node.latency, unit: 'ms', color: node.latency > 30 ? 'bg-amber-400' : 'bg-emerald-500' },
                    ].map(({ label, val, unit, color }) => (
                      <div key={label}>
                        <p className="text-[10px] text-zinc-500 mb-1">{label}</p>
                        <p className="text-xs font-bold text-zinc-200 mb-1.5">{val}{unit}</p>
                        <Progress value={unit === 'ms' ? (val / 100) * 100 : val} color={color} />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-600 pt-2.5 border-t border-zinc-800">
                    <span>Block: <span className="text-zinc-400 font-mono">#{node.blocks}</span></span>
                    <span>Peers: <span className="text-zinc-400">{node.peers}</span></span>
                    <span>Up: <span className="text-zinc-400">{node.uptime}</span></span>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          {/* Network Topology SVG */}
          <Card>
            <CardHeader>
              <Icons.Network size={15} className="text-emerald-400" />
              <span className="text-sm font-semibold">Network Topology</span>
            </CardHeader>
            <CardBody>
              <div className="flex items-center justify-center py-4">
                <div className="relative" style={{ width: 500, height: 240 }}>
                  <svg className="absolute inset-0" width="500" height="240">
                    {nodes.map((node, i) => {
                      const angles = [-72, -36, 0, 36, 72];
                      const a = (angles[i] * Math.PI) / 180;
                      const cx = 250 + 170 * Math.cos(a);
                      const cy = 120 + 80 * Math.sin(a);
                      return (
                        <line key={node.id} x1={250} y1={120} x2={cx} y2={cy}
                          stroke={node.status === 'online' ? '#10b981' : '#f59e0b'}
                          strokeWidth="1.5"
                          strokeDasharray={node.status === 'syncing' ? '6 4' : 'none'}
                          opacity="0.25" />
                      );
                    })}
                  </svg>

                  {/* Center hub */}
                  <div className="absolute" style={{ left: 250 - 28, top: 120 - 28 }}>
                    <div className="w-14 h-14 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex flex-col items-center justify-center z-10">
                      <span className="text-[9px] font-bold text-emerald-400">P2P</span>
                      <span className="text-[8px] text-zinc-500">gossipsub</span>
                    </div>
                  </div>

                  {nodes.map((node, i) => {
                    const angles = [-72, -36, 0, 36, 72];
                    const a = (angles[i] * Math.PI) / 180;
                    const cx = 250 + 170 * Math.cos(a) - 20;
                    const cy = 120 + 80 * Math.sin(a) - 20;
                    const colors: Record<string, string> = { online: 'bg-emerald-600', syncing: 'bg-amber-500', offline: 'bg-red-500' };
                    return (
                      <div key={node.id} className="absolute flex flex-col items-center gap-1" style={{ left: cx, top: cy }}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-[11px] font-bold shadow-lg ${colors[node.status] ?? 'bg-zinc-600'}`}>
                          {node.role[0].toUpperCase()}
                        </div>
                        <span className="text-[9px] text-zinc-500 font-mono whitespace-nowrap bg-zinc-950 px-1 rounded">
                          {node.name.replace('node-', '')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardBody>
          </Card>
        </>
      ) : (
        <Card>
          <CardBody className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <Icons.Network size={40} className="mb-4 opacity-20" />
            <p>No active nodes detected in the network.</p>
            <p className="text-xs mt-1">Node monitoring API is not yet available in this environment.</p>
          </CardBody>
        </Card>
      )}

      {/* Node Detail Panel */}
      {selected && (
        <Card>
          <CardHeader action={
            <button type="button" aria-label="Close" onClick={() => setSelected(null)} className="text-zinc-500 hover:text-zinc-300">
              <Icons.X size={15} />
            </button>
          }>
            <span className="text-sm font-semibold">{selected.name}</span>
            <Badge variant={selected.status === 'online' ? 'success' : 'warning'} dot>{selected.status}</Badge>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                ['Role', <Badge variant="accent">{selected.role}</Badge>],
                ['Organization', <Badge variant="info">{selected.org}</Badge>],
                ['Version', selected.version],
                ['Uptime', selected.uptime],
                ['IP / Address', <span className="font-mono text-xs text-zinc-300">{selected.ip}</span>],
                ['Latest Block', `#${selected.blocks}`],
                ['Connected Peers', selected.peers],
                ['Latency', `${selected.latency}ms`],
                ...(selected.peer_id ? [['Peer ID', <span className="font-mono text-[10px] text-zinc-400 break-all">{selected.peer_id}</span>]] : []),
              ].map(([k, v], i) => (
                <div key={i} className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                  <p className="text-[10px] text-zinc-500 mb-1.5">{k}</p>
                  <div className="text-sm font-medium text-zinc-200">{v as React.ReactNode}</div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

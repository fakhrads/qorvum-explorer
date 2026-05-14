import React, { useState } from 'react';
import * as Icons from './icons';
import { ConnectionBanner } from './ConnectionBanner';
import { Modal, Button, Input, DetailRow, Badge } from './ui';
import { useHealth } from '../lib/hooks';
import { getConfig, setConfig, clearAuth } from '../lib/config';

type Page = 'dashboard' | 'explorer' | 'contracts' | 'pki' | 'nodes' | 'events' | 'api';

interface NavItem { id: Page; icon: React.ComponentType<{ size?: number; className?: string }>; label: string; }
interface NavSection { label?: string; items: NavItem[] }

const NAV: NavSection[] = [
  {
    items: [
      { id: 'dashboard', icon: Icons.Home, label: 'Dashboard' },
      { id: 'explorer', icon: Icons.Cube, label: 'Explorer' },
      { id: 'contracts', icon: Icons.Code, label: 'Contracts' },
    ]
  },
  {
    label: 'Security',
    items: [
      { id: 'pki', icon: Icons.ShieldCheck, label: 'PKI & Certs' },
    ]
  },
  {
    label: 'Infrastructure',
    items: [
      { id: 'nodes', icon: Icons.Server, label: 'Nodes' },
      { id: 'events', icon: Icons.Activity, label: 'Events' },
      { id: 'api', icon: Icons.Terminal, label: 'API Playground' },
    ]
  },
];

function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-3 px-3">
      <div className="w-8 h-8 rounded-xl bg-linear-to-br from-emerald-400 to-emerald-700 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-900/50">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M12 7l5 3v6l-5 3-5-3v-6l5-3z" fill="white" fillOpacity="0.3" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
      </div>
      {!collapsed && (
        <div>
          <div className="text-sm font-bold text-zinc-100 leading-tight">Qorvum</div>
          <div className="text-[10px] text-zinc-500 leading-tight">Post-Quantum Chain</div>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ page, setPage, collapsed, setCollapsed }: {
  page: Page; setPage: (p: Page) => void;
  collapsed: boolean; setCollapsed: (v: boolean) => void;
}) {
  return (
    <aside className={`fixed top-0 left-0 h-screen z-40 flex flex-col transition-all duration-300 ease-in-out
      bg-zinc-950 border-r border-zinc-800/80 ${collapsed ? 'w-[68px]' : 'w-[220px]'}`}>

      {/* Logo */}
      <div className="flex items-center h-16 px-3 border-b border-zinc-800/60 shrink-0">
        <Logo collapsed={collapsed} />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-4">
        {NAV.map((section, si) => (
          <div key={si}>
            {section.label && !collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">{section.label}</p>
            )}
            {section.label && collapsed && <div className="mx-2 border-t border-zinc-800 mb-2" />}
            <div className="space-y-0.5">
              {section.items.map(item => {
                const Icon = item.icon;
                const active = page === item.id;
                return (
                  <button key={item.id} onClick={() => setPage(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
                      ${active
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 border border-transparent'
                      } ${collapsed ? 'justify-center' : ''}`}
                    title={collapsed ? item.label : undefined}>
                    <Icon size={17} className={active ? 'text-emerald-400' : ''} />
                    {!collapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-2.5 py-3 border-t border-zinc-800/60 space-y-1">
        {/* PQ Security indicator */}
        {!collapsed && (
          <div className="px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-medium text-emerald-400">PQ-TLS Active</span>
            </div>
            <div className="text-[9px] text-zinc-600 mt-0.5 font-mono">Dilithium3 · Kyber768</div>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-all">
          {collapsed ? <Icons.ChevronRight size={15} /> : <><Icons.ChevronRight size={15} className="rotate-180" /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}

export function TopBar({ collapsed, page, onLogout }: { collapsed: boolean; page: Page; onLogout?: () => void }) {
  const [search, setSearch] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data: health, error: healthError, refetch } = useHealth();
  const config = getConfig();

  const titles: Record<Page, string> = {
    dashboard: 'Dashboard',
    explorer: 'Block Explorer',
    contracts: 'Contracts',
    pki: 'PKI & Certificates',
    nodes: 'Node Monitor',
    events: 'Event Log',
    api: 'API Playground',
  };

  const port = config.baseUrl.split(':').pop() || '8080';

  return (
    <>
      <header className={`fixed top-0 right-0 z-30 h-16 flex items-center justify-between px-6 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl transition-all duration-300
        ${collapsed ? 'left-[68px]' : 'left-[220px]'}`}>

        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold text-zinc-300">{titles[page]}</div>
          <div className="w-px h-4 bg-zinc-700" />
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${healthError ? 'bg-red-400' : 'bg-emerald-400'} animate-pulse`} />
            <span className="text-xs text-zinc-500 font-mono">{health?.data?.channel || 'main-channel'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden lg:block">
            <Icons.Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search blocks, tx, users..."
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 placeholder-zinc-600 rounded-lg pl-8 pr-4 py-1.5 text-xs w-52 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          {/* API status */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <span className={`w-1.5 h-1.5 rounded-full ${healthError ? 'bg-red-400' : 'bg-emerald-400'} animate-pulse`} />
            <span className="text-[11px] text-zinc-400">:{port}</span>
          </div>

          {/* Block counter */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <Icons.Cube size={12} className={healthError ? 'text-zinc-600' : 'text-emerald-400'} />
            <span className="text-[11px] text-zinc-300 font-mono">#{health?.data?.latest_block || '---'}</span>
          </div>

          <div className="w-px h-6 bg-zinc-800 mx-1" />

          <button 
            title="settings"
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-all"
          >
            <Icons.Settings size={18} />
          </button>
        </div>
      </header>

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="System Settings">
        <div className="space-y-6">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Gateway Configuration</label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input 
                  value={config.baseUrl}
                  onChange={(e) => setConfig({ baseUrl: e.target.value })}
                  placeholder="http://localhost:8080"
                  className="flex-1"
                />
                <Button variant="secondary" size="sm" onClick={() => refetch()}>Test</Button>
              </div>
              <p className="text-[10px] text-zinc-500">
                Connection Status: {healthError ? 
                  <span className="text-red-500 font-medium">Disconnected</span> : 
                  <span className="text-emerald-500 font-medium">Connected</span>}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">User Identity</label>
            <div className="bg-zinc-950/50 rounded-xl border border-zinc-800/50 p-4 space-y-1">
              <DetailRow label="Username" value={<span className="font-bold">{config.username}</span>} />
              <DetailRow label="Organization" value={config.org} />
              <DetailRow label="Roles" value={
                <div className="flex flex-wrap gap-1 justify-end">
                  {config.roles.map(r => <Badge key={r} variant="info" className="px-1.5 py-0">{r}</Badge>)}
                </div>
              } />
              <DetailRow label="Token Expiry" value={
                config.tokenExpiry ? new Date(config.tokenExpiry * 1000).toLocaleString() : 'Never'
              } />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <Button variant="danger" className="flex-1" onClick={() => {
              setSettingsOpen(false);
              onLogout?.();
            }}>
              Logout Session
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setSettingsOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function Layout({ page, setPage, children, onLogout }: {
  page: Page; setPage: (p: Page) => void; children: React.ReactNode; onLogout?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { error: healthError, refetch } = useHealth();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Sidebar page={page} setPage={setPage} collapsed={collapsed} setCollapsed={setCollapsed} />
      <TopBar collapsed={collapsed} page={page} onLogout={onLogout} />
      <main className={`transition-all duration-300 pt-16 ${collapsed ? 'ml-[68px]' : 'ml-[220px]'}`}>
        <ConnectionBanner 
          isDisconnected={!!healthError} 
          onRefresh={() => refetch()} 
          onLogout={onLogout} 
        />
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

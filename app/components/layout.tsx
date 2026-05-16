import React, { useState, useEffect, useRef } from 'react';
import * as Icons from './icons';
import { ConnectionBanner } from './ConnectionBanner';
import { Modal, Button, Input, DetailRow, Badge } from './ui';
import { useHealth } from '../lib/hooks';
import { getConfig, setConfig } from '../lib/config';

export type Page =
  | 'dashboard' | 'explorer' | 'contracts' | 'pki'
  | 'nodes' | 'events' | 'api'
  | 'admin' | 'devtools';

interface NavItem { id: Page; icon: React.ComponentType<{ size?: number; className?: string }>; label: string; }
interface NavSection { label?: string; items: NavItem[]; adminOnly?: boolean }

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
  {
    label: 'Administration',
    adminOnly: true,
    items: [
      { id: 'admin', icon: Icons.UserCog, label: 'Admin Tools' },
      { id: 'devtools', icon: Icons.Wrench, label: 'Dev Console' },
    ]
  },
];

function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-600 to-zinc-800 flex items-center justify-center shrink-0 shadow-md shadow-black/40">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M12 7l5 3v6l-5 3-5-3v-6l5-3z" fill="white" fillOpacity="0.3" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
      </div>
      {!collapsed && (
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-extrabold text-[var(--text)] tracking-tight">Qorvum</span>
          <span className="text-[10px] font-medium text-[var(--text-3)] leading-tight">Post-Quantum Blockchain</span>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ page, setPage, collapsed, setCollapsed }: {
  page: Page; setPage: (p: Page) => void;
  collapsed: boolean; setCollapsed: (v: boolean) => void;
}) {
  const { roles } = getConfig();
  const isAdmin = roles.includes('ADMIN');

  return (
    <aside className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center h-[60px] px-4 shrink-0">
        <Logo collapsed={collapsed} />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-5">
        {NAV.map((section, si) => {
          if (section.adminOnly && !isAdmin) return null;
          return (
            <div key={si}>
              {section.label && !collapsed && (
                <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-3)]">{section.label}</p>
              )}
              {section.label && collapsed && <div className="mx-auto w-6 border-t border-[var(--border)] mb-2 mt-1" />}
              <div className="space-y-1">
                {section.items.map(item => {
                  const Icon = item.icon;
                  const active = page === item.id;
                  return (
                    <button key={item.id} onClick={() => setPage(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 select-none
                        ${active
                          ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/25'
                          : 'text-[var(--text-2)] hover:bg-[var(--raised)] hover:text-[var(--text)]'}
                        ${collapsed ? 'justify-center' : ''}`}
                      title={collapsed ? item.label : undefined}>
                      <Icon size={18} />
                      {!collapsed && <span>{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* PQ indicator + Collapse */}
      <div className="px-3 py-3 border-t border-[var(--border)]/40 space-y-2">
        {!collapsed && (
          <div className="px-3 py-2 rounded-xl bg-[var(--accent-bg)] border border-[var(--accent)]/20">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] dot-pulse" />
              <span className="text-[10px] font-bold text-[var(--accent)]">PQ-TLS Active</span>
            </div>
            <div className="text-[9px] text-[var(--text-3)] mt-0.5 font-mono">Dilithium3 · Kyber768</div>
          </div>
        )}
        <button type="button" onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-[var(--text-3)] hover:bg-[var(--raised)] hover:text-[var(--text)] transition-all">
          {collapsed
            ? <Icons.ChevronRight size={16} />
            : <><Icons.ChevronRight size={16} className="rotate-180" /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}

// ── Profile Dropdown ──────────────────────────────────────────────────────────
function ProfileDropdown({ onClose, onLogout, setPage, onOpenSettings }: {
  onClose: () => void;
  onLogout?: () => void;
  setPage: (p: Page) => void;
  onOpenSettings: () => void;
}) {
  const config = getConfig();
  const isAdmin = config.roles.includes('ADMIN');
  const expiry = config.tokenExpiry
    ? new Date(config.tokenExpiry * 1000)
    : null;
  const isExpiringSoon = expiry
    ? expiry.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
    : false;

  const items = [
    { icon: Icons.ShieldCheck, label: 'My Certificate', action: () => { setPage('pki'); onClose(); } },
    { icon: Icons.Settings, label: 'Settings', action: () => { onOpenSettings(); onClose(); } },
    ...(isAdmin ? [
      { icon: Icons.UserCog, label: 'Admin Tools', action: () => { setPage('admin'); onClose(); } },
      { icon: Icons.Wrench, label: 'Dev Console', action: () => { setPage('devtools'); onClose(); } },
    ] : []),
  ];

  return (
    <div className="absolute right-0 top-full mt-2 w-72 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl shadow-black/40 z-50 overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="px-4 py-4 border-b border-[var(--border-subtle)] bg-[var(--raised)]/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-500 to-zinc-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {(config.username?.[0] ?? 'A').toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--text)] truncate">{config.username || 'admin'}</p>
            <p className="text-[11px] text-[var(--text-3)] truncate">{config.org || '—'}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-3">
          {config.roles.map(r => (
            <Badge key={r} variant={r === 'ADMIN' ? 'accent' : 'default'} className="px-1.5 py-0 text-[10px]">{r}</Badge>
          ))}
        </div>
        {expiry && (
          <div className={`mt-2 flex items-center gap-1.5 text-[10px] ${isExpiringSoon ? 'text-amber-400' : 'text-[var(--text-3)]'}`}>
            <Icons.Lock size={10} />
            Token expires {expiry.toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Menu items */}
      <div className="p-2">
        {items.map((item) => (
          <button key={item.label} type="button" onClick={item.action}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-[var(--text-2)] hover:bg-[var(--raised)] hover:text-[var(--text)] transition-all text-left">
            <item.icon size={15} className="shrink-0" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Logout */}
      <div className="p-2 border-t border-[var(--border-subtle)]">
        <button type="button" onClick={() => { onLogout?.(); onClose(); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-red-400 hover:bg-red-500/8 transition-all text-left">
          <Icons.LogOut size={15} className="shrink-0" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ── TopBar ────────────────────────────────────────────────────────────────────
export function TopBar({ dark, toggleDark, page, onLogout, setPage }: {
  dark?: boolean; toggleDark?: () => void;
  page: Page; onLogout?: () => void;
  setPage?: (p: Page) => void;
}) {
  const [search, setSearch] = useState('');
  const [searchFocus, setSearchFocus] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { data: health, error: healthError, refetch } = useHealth();
  const config = getConfig();

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileOpen]);

  const titles: Record<Page, string> = {
    dashboard: 'Dashboard',
    explorer: 'Block Explorer',
    contracts: 'Contracts',
    pki: 'PKI & Certificates',
    nodes: 'Node Monitor',
    events: 'Event Log',
    api: 'API Playground',
    admin: 'Admin Tools',
    devtools: 'Dev Console',
  };

  return (
    <>
      <header className="sticky top-0 z-30 shrink-0 border-b border-[var(--border)]/40">
        <div className="flex items-center justify-between h-[60px] px-6">
          {/* Page title + status */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-[var(--text)]">{titles[page]}</span>
            <div className="w-px h-4 bg-[var(--border)]" />
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${healthError ? 'bg-red-400' : 'bg-emerald-400'} dot-pulse`} />
              <span className="text-xs text-[var(--text-3)] font-mono">{health?.data?.channel || 'main-channel'}</span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1.5">
            {/* Search */}
            <div className={`relative hidden lg:flex items-center transition-all duration-200 ${searchFocus ? 'w-72' : 'w-52'}`}>
              <Icons.Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setSearchFocus(true)}
                onBlur={() => setSearchFocus(false)}
                placeholder="Search blocks, tx, users..."
                className="w-full bg-[var(--raised)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-3)] rounded-xl pl-9 pr-10 py-2 text-xs focus:outline-none focus:border-[var(--accent)]/40 focus:ring-2 focus:ring-[var(--accent)]/10 transition-all"
              />
              <kbd className="absolute right-3 text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-3)] bg-[var(--surface)] font-mono">⌘K</kbd>
            </div>

            {/* Network badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/8 border border-emerald-500/15 ml-1">
              <span className={`w-1.5 h-1.5 rounded-full ${healthError ? 'bg-red-400' : 'bg-emerald-400'} dot-pulse`} />
              <span className="text-[11px] font-semibold text-emerald-400">#{health?.data?.latest_block ?? '---'}</span>
            </div>

            {/* Dark mode */}
            {toggleDark && (
              <button type="button" onClick={toggleDark} title="Toggle theme"
                className="p-2 rounded-xl text-[var(--text-3)] hover:bg-[var(--raised)] hover:text-[var(--text)] transition-all">
                {dark ? <Icons.Sun size={18} /> : <Icons.Moon size={18} />}
              </button>
            )}

            {/* Bell */}
            <button type="button" title="Notifications"
              className="p-2 rounded-xl text-[var(--text-3)] hover:bg-[var(--raised)] hover:text-[var(--text)] transition-all relative">
              <Icons.Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--accent)]" />
            </button>

            <div className="w-px h-6 bg-[var(--border)] mx-1" />

            {/* Settings */}
            <button type="button" onClick={() => setSettingsOpen(true)} title="Gateway Settings"
              className="p-2 rounded-xl text-[var(--text-3)] hover:bg-[var(--raised)] hover:text-[var(--text)] transition-all">
              <Icons.Settings size={18} />
            </button>

            {/* User avatar + Profile Dropdown */}
            <div ref={profileRef} className="relative ml-1 pl-3 border-l border-[var(--border)]">
              <button type="button" onClick={() => setProfileOpen(v => !v)}
                className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-[var(--raised)] transition-all">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-500 to-zinc-700 flex items-center justify-center text-white text-xs font-bold">
                  {(config.username?.[0] ?? 'A').toUpperCase()}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-bold text-[var(--text)] leading-tight">{config.username || 'admin'}</p>
                  <p className="text-[10px] text-[var(--text-3)]">{config.org} · {config.roles[0] ?? 'USER'}</p>
                </div>
                <Icons.ChevronDown size={13} className={`text-[var(--text-3)] transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileOpen && setPage && (
                <ProfileDropdown
                  onClose={() => setProfileOpen(false)}
                  onLogout={onLogout}
                  setPage={setPage}
                  onOpenSettings={() => setSettingsOpen(true)}
                />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Gateway Settings Modal */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Gateway Settings">
        <div className="space-y-6">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)] mb-2">Gateway URL</label>
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
              <p className="text-[10px] text-[var(--text-3)]">
                Connection:{' '}
                {healthError
                  ? <span className="text-red-400 font-semibold">Disconnected</span>
                  : <span className="text-emerald-400 font-semibold">Connected</span>}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border)]">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)] mb-2">Session Identity</label>
            <div className="bg-[var(--raised)]/50 rounded-xl border border-[var(--border)] p-4 space-y-1">
              <DetailRow label="Username" value={<span className="font-bold">{config.username}</span>} />
              <DetailRow label="Organization" value={config.org} />
              <DetailRow label="Roles" value={
                <div className="flex flex-wrap gap-1 justify-end">
                  {config.roles.map(r => <Badge key={r} variant="accent" className="px-1.5 py-0">{r}</Badge>)}
                </div>
              } />
              <DetailRow label="Token Expiry" value={
                config.tokenExpiry ? new Date(config.tokenExpiry * 1000).toLocaleString() : 'Never'
              } />
            </div>
          </div>

          <div className="pt-2">
            <Button variant="outline" className="w-full" onClick={() => setSettingsOpen(false)}>Close</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
export function Layout({ page, setPage, children, onLogout }: {
  page: Page; setPage: (p: Page) => void; children: React.ReactNode; onLogout?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(true);
  const { error: healthError, refetch } = useHealth();

  useEffect(() => {
    document.documentElement.classList.toggle('light', !dark);
  }, [dark]);

  return (
    <div className="qv-workspace">
      <div className={`qv-panel shrink-0 flex flex-col transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-[var(--sidebar-w)]'}`}>
        <Sidebar page={page} setPage={setPage} collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>

      <div className="qv-panel flex-1 flex flex-col min-w-0">
        <TopBar
          dark={dark}
          toggleDark={() => setDark(d => !d)}
          page={page}
          onLogout={onLogout}
          setPage={setPage}
        />
        <ConnectionBanner
          isDisconnected={!!healthError}
          onRefresh={() => refetch()}
          onLogout={onLogout}
        />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

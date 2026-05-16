import React, { useState } from 'react';
import { createPortal } from 'react-dom';

// ─── Badge ────────────────────────────────────────────────────────────────────
type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent';
export function Badge({ children, variant = 'default', dot, className = '' }: {
  children: React.ReactNode; variant?: BadgeVariant; dot?: boolean; className?: string;
}) {
  const styles: Record<BadgeVariant, string> = {
    default: 'bg-[var(--raised)] text-[var(--text-2)] border-[var(--border)]',
    success: 'bg-emerald-500/8 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/8 text-amber-400 border-amber-500/20',
    danger:  'bg-red-500/8 text-red-400 border-red-500/20',
    info:    'bg-blue-500/8 text-blue-400 border-blue-500/20',
    accent:  'bg-[var(--accent-bg)] text-[var(--accent)] border-[var(--accent)]/20',
  };
  const dotStyles: Record<BadgeVariant, string> = {
    default: 'bg-[var(--text-3)]', success: 'bg-emerald-400', warning: 'bg-amber-400',
    danger: 'bg-red-400', info: 'bg-blue-400', accent: 'bg-[var(--accent)]',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold border rounded-full ${styles[variant]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[variant]} dot-pulse`} />}
      {children}
    </span>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';
export function Button({ children, variant = 'default', size = 'md', onClick, className = '', disabled, icon, type = 'button' }: {
  children?: React.ReactNode; variant?: ButtonVariant; size?: ButtonSize;
  onClick?: (e: React.MouseEvent) => void; className?: string; disabled?: boolean;
  icon?: React.ReactNode; type?: 'button' | 'submit';
}) {
  const vs: Record<ButtonVariant, string> = {
    default:   'bg-[var(--accent)] text-white hover:brightness-110 shadow-sm shadow-[var(--accent)]/25 border-[var(--accent)]',
    secondary: 'bg-[var(--raised)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--border)]/50',
    outline:   'bg-transparent text-[var(--text-2)] border-[var(--border)] hover:bg-[var(--raised)] hover:text-[var(--text)]',
    ghost:     'bg-transparent text-[var(--text-2)] border-transparent hover:bg-[var(--raised)] hover:text-[var(--text)]',
    danger:    'bg-red-500/8 text-red-400 border-red-500/20 hover:bg-red-500/15',
  };
  const ss: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-sm gap-2',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`inline-flex items-center justify-center font-semibold rounded-xl border transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${vs[variant]} ${ss[size]} ${className}`}>
      {icon}{children}
    </button>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
export function Input({ placeholder, value, onChange, type = 'text', className = '', icon, readOnly }: {
  placeholder?: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; className?: string; icon?: React.ReactNode; readOnly?: boolean;
}) {
  const base = 'bg-[var(--raised)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-3)] rounded-xl text-sm focus:outline-none focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/10 transition-all';
  if (icon) {
    return (
      <div className={`relative ${className}`}>
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]">{icon}</span>
        <input type={type} placeholder={placeholder} value={value} onChange={onChange} readOnly={readOnly}
          className={`w-full ${base} pl-9 pr-3 py-2`} />
      </div>
    );
  }
  return (
    <input type={type} placeholder={placeholder} value={value} onChange={onChange} readOnly={readOnly}
      className={`${base} px-3 py-2 ${className}`} />
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────
export function Textarea({ placeholder, rows = 3, className = '', value, onChange }: {
  placeholder?: string; rows?: number; className?: string;
  value?: string; onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <textarea placeholder={placeholder} rows={rows} value={value} onChange={onChange}
      className={`w-full bg-[var(--raised)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-3)] rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-[var(--accent)]/50 transition-all resize-none ${className}`} />
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────
export function Select({ options, value, onChange, className = '' }: {
  options: string[]; value?: string; onChange?: (v: string) => void; className?: string;
}) {
  return (
    <select value={value} onChange={e => onChange?.(e.target.value)} title={value}
      className={`bg-[var(--raised)] border border-[var(--border)] text-[var(--text)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]/50 transition-all ${className}`}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', onClick, hover, style }: {
  children: React.ReactNode; className?: string; onClick?: () => void;
  hover?: boolean; style?: React.CSSProperties;
}) {
  return (
    <div onClick={onClick} style={style}
      className={`bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm transition-all duration-200
        ${hover ? 'cursor-pointer hover:border-[var(--accent)]/40 hover:shadow-lg hover:shadow-[var(--accent)]/5' : ''}
        ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, action, className = '' }: { children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-subtle)] ${className}`}>
      <div className="flex items-center gap-2 min-w-0">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}

// ─── Table ────────────────────────────────────────────────────────────────────
interface Column<T> {
  key: keyof T | string;
  label: string;
  width?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}
export function Table<T extends Record<string, unknown>>({ columns, data, onRowClick }: {
  columns: Column<T>[]; data: T[]; onRowClick?: (row: T) => void;
}) {
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            {columns.map(col => (
              <th key={String(col.key)} className="px-5 py-3 text-left text-[11px] font-bold text-[var(--text-3)] uppercase tracking-wider whitespace-nowrap"
                style={col.width ? { width: col.width } : {}}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} onClick={() => onRowClick?.(row)}
              className={`border-b border-[var(--border-subtle)] last:border-0 transition-colors
                ${onRowClick ? 'cursor-pointer hover:bg-[var(--raised)]/60' : ''}`}>
              {columns.map(col => {
                const val = row[col.key as keyof T];
                return (
                  <td key={String(col.key)} className="px-5 py-3.5 text-[var(--text-2)] whitespace-nowrap">
                    {col.render ? col.render(val, row) : String(val ?? '')}
                  </td>
                );
              })}
            </tr>
          ))}
          {data.length === 0 && (
            <tr><td colSpan={columns.length} className="px-5 py-12 text-center text-sm text-[var(--text-3)]">No data</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange, className = '' }: {
  tabs: { id: string; label: string }[]; active: string;
  onChange: (id: string) => void; className?: string;
}) {
  return (
    <div className={`flex items-center gap-1 bg-[var(--raised)] border border-[var(--border)] rounded-2xl p-1 ${className}`}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => onChange(tab.id)}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 whitespace-nowrap
            ${active === tab.id
              ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm'
              : 'text-[var(--text-3)] hover:text-[var(--text-2)]'}`}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── Progress ────────────────────────────────────────────────────────────────
export function Progress({ value, color = 'bg-[var(--accent)]' }: { value: number; color?: string }) {
  return (
    <div className="w-full bg-[var(--raised)] rounded-full h-2 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

// ─── Status Dot ──────────────────────────────────────────────────────────────
export function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    online: 'bg-emerald-400', syncing: 'bg-amber-400', offline: 'bg-red-400',
  };
  return <span className={`w-2 h-2 rounded-full ${colors[status] ?? 'bg-[var(--text-3)]'} dot-pulse`} />;
}

// ─── Hash display ────────────────────────────────────────────────────────────
export function HashDisplay({ hash }: { hash: string }) {
  const [copied, setCopied] = useState(false);
  const display = hash?.length > 20 ? `${hash.slice(0, 10)}...${hash.slice(-6)}` : (hash || '---');
  const copy = () => {
    navigator.clipboard?.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs">
      <span className="text-[var(--accent)]">{display}</span>
      <button onClick={copy} title="Copy" className="text-[var(--text-3)] hover:text-[var(--text)] transition-colors">
        {copied
          ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>}
      </button>
    </span>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────
const ICON_BG: Record<string, string> = {
  purple: 'bg-zinc-500/15', blue: 'bg-blue-500/15',
  green: 'bg-emerald-500/15', orange: 'bg-orange-500/15', amber: 'bg-amber-500/15',
  gray: 'bg-zinc-500/15',
};

export function StatCard({ label, value, icon, change, trend, color = 'purple' }: {
  label: string; value: string; icon: React.ReactNode;
  change?: string; trend?: 'up' | 'down'; color?: string;
}) {
  return (
    <Card className="p-5">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3.5 ${ICON_BG[color] ?? ICON_BG.purple}`}>
        {icon}
      </div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)] mb-1">{label}</p>
      <p className="text-[26px] font-extrabold text-[var(--text)] tracking-tight leading-none">{value}</p>
      {change && (
        <p className={`text-xs font-semibold mt-1.5 ${trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend === 'up' ? '↑' : '↓'} {change}
        </p>
      )}
    </Card>
  );
}

// ─── Pagination ──────────────────────────────────────────────────────────────
export function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border-subtle)]">
      <span className="text-xs text-[var(--text-3)]">Page {page} of {total}</span>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => onChange(page - 1)}>← Prev</Button>
        <Button variant="ghost" size="sm" disabled={page === total} onClick={() => onChange(page + 1)}>Next →</Button>
      </div>
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 'max-w-lg' }: {
  open: boolean; onClose: () => void; title: string;
  children: React.ReactNode; width?: string;
}) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={`relative ${width} w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl shadow-black/50 max-h-[85vh] overflow-y-auto animate-slide-up`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h3 className="text-base font-bold text-[var(--text)]">{title}</h3>
          <button title="close" onClick={onClose} className="text-[var(--text-3)] hover:text-[var(--text)] transition-colors p-1 rounded-lg hover:bg-[var(--raised)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────
export function Empty({ icon, title, description }: { icon: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 p-3 rounded-xl bg-[var(--raised)]">{icon}</div>
      <p className="text-sm font-semibold text-[var(--text-2)]">{title}</p>
      {description && <p className="text-xs text-[var(--text-3)] mt-1">{description}</p>}
    </div>
  );
}

// ─── Section header ──────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, children }: {
  title: string; subtitle?: string; children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h1 className="text-xl font-extrabold text-[var(--text)]">{title}</h1>
        {subtitle && <p className="text-xs text-[var(--text-3)] mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

// ─── Detail Row ──────────────────────────────────────────────────────────────
export function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-[var(--border-subtle)] last:border-0">
      <span className="text-xs text-[var(--text-3)] shrink-0 w-36">{label}</span>
      <div className="text-xs text-[var(--text-2)] text-right">{value}</div>
    </div>
  );
}

// ─── Method badge ─────────────────────────────────────────────────────────────
export function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'text-emerald-400 bg-emerald-500/8', POST: 'text-blue-400 bg-blue-500/8',
    PUT: 'text-amber-400 bg-amber-500/8', DELETE: 'text-red-400 bg-red-500/8',
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 text-xs font-bold font-mono rounded-lg ${colors[method] ?? ''}`}>{method}</span>
  );
}

// ─── Code block ───────────────────────────────────────────────────────────────
export function CodeBlock({ code, lang = 'rust', className = '', maxH = 'max-h-96' }: {
  code: string; lang?: string; className?: string; maxH?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--code-bg)] overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
        <span className="text-xs font-mono text-[var(--text-3)]">{lang}</span>
        <button onClick={copy} className="text-xs text-[var(--text-3)] hover:text-[var(--text)] transition-colors flex items-center gap-1">
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
      <pre className={`p-4 overflow-auto scrollbar-thin text-xs font-mono leading-relaxed text-[var(--text-2)] ${maxH}`}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ─── Gauge ring (circular progress) ──────────────────────────────────────────
export function GaugeRing({ value, label, color = 'var(--accent)', size = 96 }: {
  value: number; label: string; color?: string; size?: number;
}) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, value) / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--raised)" strokeWidth="8" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-extrabold text-[var(--text)]">{value}%</span>
        </div>
      </div>
      <span className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">{label}</span>
    </div>
  );
}

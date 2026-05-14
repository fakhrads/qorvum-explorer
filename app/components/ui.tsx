import React from 'react';

// ─── Badge ────────────────────────────────────────────────────────────────────
type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent';
export function Badge({ children, variant = 'default', dot, className = '' }: {
  children: React.ReactNode; variant?: BadgeVariant; dot?: boolean; className?: string;
}) {
  const styles: Record<BadgeVariant, string> = {
    default: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    danger:  'bg-red-500/15 text-red-400 border-red-500/25',
    info:    'bg-blue-500/15 text-blue-400 border-blue-500/25',
    accent:  'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  };
  const dotStyles: Record<BadgeVariant, string> = {
    default: 'bg-zinc-400', success: 'bg-emerald-400', warning: 'bg-amber-400',
    danger: 'bg-red-400', info: 'bg-blue-400', accent: 'bg-emerald-400',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${styles[variant]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[variant]} animate-pulse`}/>}
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
    default:   'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-900/30',
    secondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700',
    outline:   'bg-transparent hover:bg-zinc-800 text-zinc-300 border-zinc-700',
    ghost:     'bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-transparent',
    danger:    'bg-red-600 hover:bg-red-500 text-white border-red-600',
  };
  const ss: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-sm gap-2',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`inline-flex items-center justify-center font-medium rounded-lg border transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${vs[variant]} ${ss[size]} ${className}`}>
      {icon}{children}
    </button>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
export function Input({ placeholder, value, onChange, type = 'text', className = '', icon, readOnly }: {
  placeholder?: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; className?: string; icon?: React.ReactNode; readOnly?: boolean;
}) {
  if (icon) {
    return (
      <div className={`relative ${className}`}>
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">{icon}</span>
        <input type={type} placeholder={placeholder} value={value} onChange={onChange} readOnly={readOnly}
          className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 placeholder-zinc-500 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
      </div>
    );
  }
  return (
    <input type={type} placeholder={placeholder} value={value} onChange={onChange} readOnly={readOnly}
      className={`bg-zinc-900 border border-zinc-700 text-zinc-200 placeholder-zinc-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors ${className}`} />
  );
}

// ─── Textarea ────────────────────────────────────────────────────────────────
export function Textarea({ placeholder, rows = 3, className = '', value, onChange }: {
  placeholder?: string; rows?: number; className?: string;
  value?: string; onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <textarea placeholder={placeholder} rows={rows} value={value} onChange={onChange}
      className={`w-full bg-zinc-900 border border-zinc-700 text-zinc-200 placeholder-zinc-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none ${className}`} />
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────
export function Select({ options, value, onChange, className = '' }: {
  options: string[]; value?: string; onChange?: (v: string) => void; className?: string;
}) {
  return (
    <select value={value} onChange={e => onChange?.(e.target.value)} title={value}
      className={`bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors ${className}`}>
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
      className={`bg-zinc-900/60 border border-zinc-800 rounded-xl backdrop-blur-sm ${hover ? 'cursor-pointer hover:border-zinc-600 hover:bg-zinc-900 transition-all duration-150' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
      <div className="flex items-center gap-2">{children}</div>
      {action && <div>{action}</div>}
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
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800">
            {columns.map(col => (
              <th key={String(col.key)} className="px-5 py-3 text-left text-[11px] font-semibold text-zinc-500 uppercase tracking-wider whitespace-nowrap"
                style={col.width ? { width: col.width } : {}}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} onClick={() => onRowClick?.(row)}
              className={`border-b border-zinc-800/50 last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-zinc-800/40 transition-colors' : ''}`}>
              {columns.map(col => {
                const val = row[col.key as keyof T];
                return (
                  <td key={String(col.key)} className="px-5 py-3 text-sm text-zinc-300 whitespace-nowrap">
                    {col.render ? col.render(val, row) : String(val ?? '')}
                  </td>
                );
              })}
            </tr>
          ))}
          {data.length === 0 && (
            <tr><td colSpan={columns.length} className="px-5 py-12 text-center text-sm text-zinc-500">No data</td></tr>
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
    <div className={`flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 ${className}`}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => onChange(tab.id)}
          className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 whitespace-nowrap
            ${active === tab.id ? 'bg-zinc-700 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── Progress ────────────────────────────────────────────────────────────────
export function Progress({ value, color = 'bg-emerald-500' }: { value: number; color?: string }) {
  return (
    <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

// ─── Status Dot ──────────────────────────────────────────────────────────────
export function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    online: 'bg-emerald-400', syncing: 'bg-amber-400', offline: 'bg-red-400',
  };
  return <span className={`w-2 h-2 rounded-full ${colors[status] ?? 'bg-zinc-400'} animate-pulse`} />;
}

// ─── Hash display ────────────────────────────────────────────────────────────
export function HashDisplay({ hash }: { hash: string }) {
  const display = hash.length > 20 ? `${hash.slice(0, 10)}...${hash.slice(-6)}` : hash;
  return <span className="font-mono text-xs text-emerald-400">{display}</span>;
}

// ─── Stat card ───────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon, change, trend }: {
  label: string; value: string; icon: React.ReactNode;
  change?: string; trend?: 'up' | 'down';
}) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">{icon}</div>
          {change && (
            <span className={`text-[11px] font-medium ${trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
              {change}
            </span>
          )}
        </div>
        <p className="text-2xl font-bold text-zinc-100 font-mono">{value}</p>
        <p className="text-xs text-zinc-500 mt-1">{label}</p>
      </CardBody>
    </Card>
  );
}

// ─── Pagination ──────────────────────────────────────────────────────────────
export function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800">
      <span className="text-xs text-zinc-500">Page {page} of {total}</span>
      <div className="flex gap-2">
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative ${width} w-full bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl shadow-black/50 max-h-[85vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h3 className="text-sm font-bold text-zinc-100">{title}</h3>
          <button title="close" onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────
export function Empty({ icon, title, description }: { icon: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 opacity-40">{icon}</div>
      <p className="text-sm font-medium text-zinc-400">{title}</p>
      {description && <p className="text-xs text-zinc-600 mt-1">{description}</p>}
    </div>
  );
}

// ─── Section header ──────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, children }: {
  title: string; subtitle?: string; children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">{title}</h1>
        {subtitle && <p className="text-sm text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

// ─── Detail Row ──────────────────────────────────────────────────────────────
export function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-zinc-800/60 last:border-0">
      <span className="text-xs text-zinc-500 shrink-0 w-36">{label}</span>
      <div className="text-xs text-zinc-300 text-right">{value}</div>
    </div>
  );
}

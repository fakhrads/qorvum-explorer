import React, { useState } from 'react';
import { Button, Input, Badge } from '../components/ui';
import * as Icons from '../components/icons';
import { api, ApiError } from '../lib/api';
import { setConfig, getConfig } from '../lib/config';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [baseUrl, setBaseUrl] = useState(getConfig().baseUrl);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tab, setTab] = useState<'login' | 'bootstrap'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [bootstrapOrg, setBootstrapOrg] = useState('Org1');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'ok' | 'failed'>('idle');

  const testConnection = async () => {
    setConnectionStatus('checking');
    try {
      setConfig({ baseUrl });
      const health = await api.getHealth();
      setConnectionStatus(health.success ? 'ok' : 'failed');
    } catch {
      setConnectionStatus('failed');
    }
  };

  const handleBootstrap = async () => {
    if (!username || !password) {
      setError('Username and password are required');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      setConfig({ baseUrl });
      await api.bootstrap(username, password, bootstrapOrg);
      setSuccessMessage('Admin account bootstrapped successfully! You can now sign in.');
      setTimeout(() => { setTab('login'); setSuccessMessage(null); }, 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Bootstrap failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      setConfig({ baseUrl });
      if (manualToken.trim()) {
        setConfig({ token: manualToken.trim(), username: 'admin@manual', roles: ['ADMIN'] });
        onLoginSuccess();
        return;
      }
      const res = await api.login(username, password);
      if (res.success) {
        setConfig({
          token: res.data.token,
          tokenExpiry: res.data.expires_at,
          username: res.data.subject,
          org: res.data.org,
          roles: res.data.roles,
        });
        onLoginSuccess();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Connection failed. Please check the gateway URL.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Icons.ShieldCheck, label: 'Post-Quantum PKI', desc: 'Dilithium3 (ML-DSA) certificates — resistant to quantum attacks per NIST FIPS 204.' },
    { icon: Icons.Activity,    label: 'BFT Consensus',   desc: 'HotStuff Byzantine Fault Tolerant consensus across multiple organizations.' },
    { icon: Icons.Code,        label: 'Smart Contracts', desc: 'Deploy and invoke Rust/WASM contracts with full ledger audit trail.' },
    { icon: Icons.Users,       label: 'Multi-Org MSP',   desc: 'Federated identity across orgs — each with its own CA and cert registry.' },
  ];

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[var(--bg)]">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[15%] -left-[10%] w-[50%] h-[50%] bg-zinc-500/4 blur-[140px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[5%] w-[40%] h-[40%] bg-blue-600/4 blur-[130px] rounded-full" />
        <div className="absolute top-[35%] right-[30%] w-[20%] h-[20%] bg-zinc-400/3 blur-[100px] rounded-full" />
      </div>

      {/* Two-column layout */}
      <div className="min-h-full flex flex-col-reverse lg:flex-row relative z-10">

        {/* ── Left panel — branding & features ── */}
        <div className="lg:flex-1 flex flex-col justify-between px-8 py-10 lg:px-14 lg:py-16 border-t lg:border-t-0 lg:border-r border-[var(--border-subtle)]">
          {/* Logo + tagline */}
          <div>
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-600 to-zinc-800 flex items-center justify-center shadow-lg shadow-black/30 shrink-0">
                <Icons.LogoIcon size={20} className="text-white" />
              </div>
              <div>
                <p className="text-base font-extrabold text-[var(--text)] leading-none">Qorvum Explorer</p>
                <p className="text-[10px] text-[var(--text-3)] mt-0.5 uppercase tracking-widest">Enterprise Blockchain</p>
              </div>
            </div>

            <h2 className="text-3xl lg:text-4xl font-extrabold text-[var(--text)] leading-tight mb-4">
              Permissioned<br />
              <span className="text-[var(--accent)]">Post-Quantum</span><br />
              Blockchain
            </h2>
            <p className="text-sm text-[var(--text-3)] leading-relaxed max-w-sm mb-10">
              Enterprise-grade distributed ledger with quantum-resistant cryptography, Byzantine fault tolerance, and multi-organization identity management.
            </p>

            {/* Feature list */}
            <div className="space-y-5">
              {features.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--raised)] border border-[var(--border)] flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={14} className="text-[var(--accent)]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--text)] mb-0.5">{label}</p>
                    <p className="text-[11px] text-[var(--text-3)] leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom badges */}
          <div className="mt-10 pt-6 border-t border-[var(--border-subtle)]">
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant="default">v0.1.0-alpha</Badge>
              <Badge variant="default">FIPS 204</Badge>
              <Badge variant="default">CNSA 2.0</Badge>
              <Badge variant="default">BFT</Badge>
            </div>
            <p className="text-[10px] text-[var(--text-3)] uppercase tracking-[0.15em]">&copy; 2026 Qorvum Ledger Systems</p>
          </div>
        </div>

        {/* ── Right panel — form ── */}
        <div className="lg:w-[460px] shrink-0 flex flex-col justify-center px-8 py-10 lg:px-12 lg:py-16">
          <div className="w-full max-w-sm mx-auto">
            <div className="mb-8">
              <h1 className="text-xl font-extrabold text-[var(--text)] mb-1">Sign in</h1>
              <p className="text-xs text-[var(--text-3)]">Authenticate with your PKI identity</p>
            </div>

            {/* Tab switcher */}
            <div className="flex p-1 bg-[var(--raised)] border border-[var(--border)] rounded-xl w-full mb-7">
              {(['login', 'bootstrap'] as const).map(t => (
                <button key={t} type="button" onClick={() => setTab(t)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all
                    ${tab === t ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/30' : 'text-[var(--text-3)] hover:text-[var(--text)]'}`}>
                  {t === 'login' ? 'Sign In' : 'Bootstrap'}
                </button>
              ))}
            </div>

            {tab === 'login' ? (
              <form onSubmit={handleLogin} className="flex flex-col gap-5">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">Gateway URL</label>
                  <div className="flex gap-2">
                    <Input icon={<Icons.Globe size={15} />} placeholder="http://localhost:8080"
                      value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="flex-1" />
                    <Button variant="secondary" size="sm" onClick={testConnection}
                      disabled={connectionStatus === 'checking'} className="shrink-0">
                      {connectionStatus === 'checking' ? <Icons.Activity size={14} className="spin" /> : 'Test'}
                    </Button>
                  </div>
                  {connectionStatus === 'ok' && (
                    <p className="text-[10px] text-emerald-400 mt-1.5 flex items-center gap-1"><Icons.CheckCircle size={11} /> Gateway reachable</p>
                  )}
                  {connectionStatus === 'failed' && (
                    <p className="text-[10px] text-red-400 mt-1.5 flex items-center gap-1"><Icons.XCircle size={11} /> Connection failed</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">Username</label>
                  <Input icon={<Icons.Users size={15} />} placeholder="admin"
                    value={username} onChange={(e) => setUsername(e.target.value)} className="w-full" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">Password</label>
                  <div className="relative">
                    <Input icon={<Icons.Key size={15} />} type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text)] transition-colors">
                      {showPassword ? <Icons.EyeOff size={15} /> : <Icons.Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-[var(--border)]" /></div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                    <span className="bg-[var(--bg)] px-3 text-[var(--text-3)] font-semibold">Manual Token</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">
                    Bearer Token <span className="normal-case font-normal">(optional)</span>
                  </label>
                  <textarea
                    className="w-full h-20 bg-[var(--code-bg)] border border-[var(--border)] rounded-xl p-3 text-[10px] font-mono text-[var(--accent)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--accent)]/40 focus:ring-2 focus:ring-[var(--accent)]/10 transition-all resize-none"
                    placeholder="Paste Dilithium3 Bearer token…"
                    value={manualToken} onChange={(e) => setManualToken(e.target.value)}
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-start gap-2">
                    <Icons.XCircle size={14} className="mt-0.5 shrink-0" /><span>{error}</span>
                  </div>
                )}

                <Button type="submit" variant="default" className="w-full h-11 text-sm font-bold" disabled={loading}>
                  {loading ? 'Authenticating…' : 'Sign In'}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-[var(--border)]" /></div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                    <span className="bg-[var(--bg)] px-3 text-[var(--text-3)]">Or</span>
                  </div>
                </div>

                <Button type="button" variant="outline" className="w-full h-10 text-sm"
                  onClick={() => { setConfig({ baseUrl, username: 'admin@dev', roles: ['ADMIN', 'HR_MANAGER'], token: null }); onLoginSuccess(); }}>
                  Guest Access (Dev Mode)
                </Button>
              </form>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="p-4 bg-[var(--accent-bg)] border border-[var(--accent)]/20 rounded-xl">
                  <h3 className="text-sm font-bold text-[var(--accent)] mb-1 flex items-center gap-2">
                    <Icons.ShieldCheck size={15} /> Initial Bootstrap
                  </h3>
                  <p className="text-xs text-[var(--text-3)] leading-relaxed">
                    Enroll the first administrator account if you haven't done so via the CLI.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">Admin Username</label>
                  <Input icon={<Icons.Users size={15} />} placeholder="admin"
                    value={username} onChange={(e) => setUsername(e.target.value)} className="w-full" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">Password</label>
                  <Input icon={<Icons.Key size={15} />} type="password" placeholder="••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)} className="w-full" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">Organization</label>
                  <Input icon={<Icons.Globe size={15} />} placeholder="e.g. NadamaOrg"
                    value={bootstrapOrg} onChange={(e) => setBootstrapOrg(e.target.value)} className="w-full" />
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-start gap-2">
                    <Icons.XCircle size={14} className="mt-0.5 shrink-0" /><span>{error}</span>
                  </div>
                )}
                {successMessage && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-start gap-2">
                    <Icons.CheckCircle size={14} className="mt-0.5 shrink-0" /><span>{successMessage}</span>
                  </div>
                )}

                <Button variant="default" className="w-full h-11 text-sm font-bold"
                  onClick={handleBootstrap} disabled={loading}>
                  {loading ? 'Processing…' : 'Enroll First Admin'}
                </Button>
              </div>
            )}

            <div className="mt-8 pt-5 border-t border-[var(--border-subtle)] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] dot-pulse shrink-0" />
              <p className="text-[10px] text-[var(--text-3)]">
                Secured with <span className="text-[var(--accent)] font-mono">Dilithium3</span> · NIST FIPS 204 · Post-Quantum Safe
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

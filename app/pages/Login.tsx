import React, { useState, useEffect } from 'react';
import { Button, Input, Card, CardBody, Badge } from '../components/ui';
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
      // Temporarily update config to test the new URL
      const oldUrl = getConfig().baseUrl;
      setConfig({ baseUrl });
      const health = await api.getHealth();
      if (health.success) {
        setConnectionStatus('ok');
      } else {
        setConnectionStatus('failed');
      }
      // Revert if it's just a test, or keep if the user intends to use it
    } catch (err) {
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
      // Save base URL in case it changed
      setConfig({ baseUrl });

      await api.bootstrap(username, password, bootstrapOrg);

      setSuccessMessage('Admin account bootstrapped successfully! You can now sign in.');
      setTimeout(() => {
        setTab('login');
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Bootstrap failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Save base URL first
      setConfig({ baseUrl });

      if (manualToken.trim()) {
        setConfig({
          token: manualToken.trim(),
          username: 'admin@manual',
          roles: ['ADMIN'], // Default to admin for manual tokens
        });
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
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Connection failed. Please check the gateway URL.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-violet-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-emerald-500 to-violet-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-4">
            <Icons.LogoIcon size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Qorvum Explorer</h1>
          <p className="text-zinc-500 text-sm mt-1">Connect to Post-Quantum Blockchain</p>
        </div>

        <Card className="border-zinc-800/50 shadow-2xl shadow-black/50">
          <CardBody className="p-8">
            <div className="flex justify-center mb-8">
              <div className="flex p-1 bg-zinc-950 border border-zinc-800 rounded-xl w-full">
                <button 
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${tab === 'login' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                  onClick={() => setTab('login')}
                >
                  Sign In
                </button>
                <button 
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${tab === 'bootstrap' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                  onClick={() => setTab('bootstrap')}
                >
                  Bootstrap
                </button>
              </div>
            </div>

            {tab === 'login' ? (
              <form onSubmit={handleLogin} className="space-gap-y-6 flex flex-col gap-5">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Gateway URL</label>
                  <div className="flex gap-2">
                    <Input 
                      icon={<Icons.Globe size={16} />}
                      placeholder="http://localhost:8080"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={testConnection}
                      disabled={connectionStatus === 'checking'}
                      className="shrink-0"
                    >
                      {connectionStatus === 'checking' ? <Icons.Activity size={14} className="animate-spin" /> : 'Test'}
                    </Button>
                  </div>
                  {connectionStatus === 'ok' && (
                    <p className="text-[10px] text-emerald-400 mt-1.5 flex items-center gap-1">
                      <Icons.CheckCircle size={12} /> Gateway reachable
                    </p>
                  )}
                  {connectionStatus === 'failed' && (
                    <p className="text-[10px] text-red-400 mt-1.5 flex items-center gap-1">
                      <Icons.XCircle size={12} /> Connection failed
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Username</label>
                  <Input 
                    icon={<Icons.Users size={16} />}
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Password</label>
                  <div className="relative">
                    <Input 
                      icon={<Icons.Key size={16} />}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full"
                    />
                    <button 
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <Icons.EyeOff size={16} /> : <Icons.Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-800" /></div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-zinc-900 px-2 text-zinc-600 font-bold text-emerald-500/50">Manual Token Bypass</span></div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Security Token (Optional)</label>
                  <textarea 
                    className="w-full h-20 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-[10px] font-mono text-emerald-400 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                    placeholder="Paste Dilithium3 Bearer token here..."
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                  />
                  <p className="text-[10px] text-zinc-600 mt-1 italic">Use this if the gateway is in PQ-Secure mode and you have a token from `qv identity token`.</p>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs flex items-start gap-2">
                    <Icons.XCircle size={14} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button 
                  type="submit" 
                  variant="default" 
                  className="w-full h-11 text-base font-semibold mt-2"
                  disabled={loading}
                >
                  {loading ? 'Authenticating...' : 'Sign In'}
                </Button>

                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-800" /></div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-zinc-900 px-2 text-zinc-600">Or</span></div>
                </div>

                <Button 
                  type="button" 
                  variant="secondary" 
                  className="w-full h-10 text-sm border-zinc-800 hover:bg-zinc-800/50"
                  onClick={() => {
                    setConfig({
                      baseUrl,
                      username: 'admin@dev',
                      roles: ['ADMIN', 'HR_MANAGER'],
                      token: null
                    });
                    onLoginSuccess();
                  }}
                >
                  Guest Access (Dev Mode)
                </Button>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl mb-4">
                  <h3 className="text-sm font-bold text-emerald-400 mb-1 flex items-center gap-2">
                    <Icons.ShieldCheck size={16} /> Initial Bootstrap
                  </h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Use this tool to enroll your first administrator account if you haven't done so via the CLI.
                  </p>
                </div>

                <div className="flex flex-col gap-5">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Admin Username</label>
                    <Input 
                      icon={<Icons.UserIcon size={16} />}
                      placeholder="e.g. admin"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">New Password</label>
                    <Input 
                      icon={<Icons.Key size={16} />}
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Organization</label>
                    <Input 
                      icon={<Icons.Globe size={16} />}
                      placeholder="e.g. Org1"
                      value={bootstrapOrg}
                      onChange={(e) => setBootstrapOrg(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs flex items-start gap-2">
                      <Icons.XCircle size={14} className="mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {successMessage && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs flex items-start gap-2">
                      <Icons.CheckCircle size={14} className="mt-0.5 shrink-0" />
                      <span>{successMessage}</span>
                    </div>
                  )}

                  <Button 
                    variant="default" 
                    className="w-full h-11 text-sm font-semibold shadow-lg shadow-emerald-500/20"
                    onClick={handleBootstrap}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Enroll First Admin'}
                  </Button>
                </div>

              </div>
            )}

            <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
              <p className="text-[11px] text-zinc-600">
                This explorer uses <span className="text-emerald-500/70 font-mono">Dilithium3</span> post-quantum cryptography for secure session tokens.
              </p>
              <div className="mt-4 flex items-center justify-center gap-4">
                <Badge variant="default" className="bg-zinc-800/50">v0.1.0-alpha</Badge>
                <Badge variant="default" className="bg-zinc-800/50">PQ-Secure</Badge>
              </div>
            </div>
          </CardBody>
        </Card>

        <p className="text-center text-zinc-700 text-[10px] mt-8 uppercase tracking-[0.2em]">
          &copy; 2026 Qorvum Ledger Systems
        </p>
      </div>
    </div>
  );
}

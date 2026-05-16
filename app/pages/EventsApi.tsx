import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Badge, Table, HashDisplay, Button, Input } from '../components/ui';
import * as Icons from '../components/icons';
import { getConfig } from '../lib/config';
import { useWsEvents } from '../lib/hooks';
import type { RealtimeEvent } from '../lib/hooks';
import { formatTxId } from '../lib/api';

const API_ENDPOINTS = [
  { method: 'GET',  path: '/api/v1/health',                               desc: 'Gateway health check',                       auth: false },
  { method: 'GET',  path: '/api/v1/stats',                                desc: 'Network statistics',                         auth: false },
  { method: 'POST', path: '/api/v1/auth/login',                           desc: 'Authenticate and get bearer token',           auth: false, body: '{\n  "username": "admin",\n  "password": "secret1234",\n  "ttl": 3600\n}' },
  { method: 'POST', path: '/api/v1/auth/bootstrap',                       desc: 'Bootstrap first admin (only once)',           auth: false, body: '{\n  "username": "admin",\n  "password": "secret1234",\n  "org": "Org1"\n}' },
  { method: 'POST', path: '/api/v1/auth/refresh',                         desc: 'Refresh current session token',               auth: true,  body: '{}' },
  { method: 'GET',  path: '/api/v1/blocks',                               desc: 'List latest blocks (paginated)',              auth: true  },
  { method: 'GET',  path: '/api/v1/blocks/:number',                       desc: 'Get block by number',                        auth: true  },
  { method: 'GET',  path: '/api/v1/records/:collection',                  desc: 'List ledger records (filterable)',            auth: true  },
  { method: 'GET',  path: '/api/v1/records/:collection/:partition/:id',   desc: 'Get a specific record by key',                auth: true  },
  { method: 'GET',  path: '/api/v1/history/:collection/:id',              desc: 'Get record version history',                  auth: true  },
  { method: 'GET',  path: '/api/v1/admin/users',                          desc: 'List enrolled users',                        auth: true  },
  { method: 'POST', path: '/api/v1/admin/users/enroll',                   desc: 'Enroll a new user',                          auth: true,  body: '{\n  "username": "alice",\n  "password": "password123",\n  "org": "Org1",\n  "roles": ["EMPLOYEE"],\n  "days": 365\n}' },
  { method: 'POST', path: '/api/v1/admin/users/:username/revoke',         desc: 'Revoke user access immediately',              auth: true,  body: '{\n  "reason": "Left organization"\n}' },
  { method: 'POST', path: '/api/v1/invoke/:contract/:function',           desc: 'Invoke contract function (writes to ledger)', auth: true, body: '{}' },
  { method: 'GET',  path: '/api/v1/query/:contract/:function',            desc: 'Query contract function (read-only)',         auth: true  },
];

export function EventsPage() {
  const [search, setSearch] = useState('');
  const { events, connected } = useWsEvents();

  const filteredEvents = events.filter(e => {
    if (!search) return true;
    const s = search.toLowerCase();
    return JSON.stringify(e.data).toLowerCase().includes(s) || e.type.includes(s);
  });

  const getEventIcon = (type: RealtimeEvent['type']) => {
    switch (type) {
      case 'block': return <Icons.Cube size={14} className="text-emerald-400" />;
      case 'tx': return <Icons.Zap size={14} className="text-blue-400" />;
      case 'node_status': return <Icons.Server size={14} className="text-violet-400" />;
      default: return <Icons.Activity size={14} className="text-zinc-400" />;
    }
  };

  const getEventTitle = (e: RealtimeEvent) => {
    switch (e.type) {
      case 'block': return `New Block #${e.data.block_num}`;
      case 'tx': return `Transaction Executed: ${e.data.function_name}`;
      case 'node_status': return `Node Status: ${e.data.status}`;
      case 'connected': return `WebSocket Connected`;
      default: return e.type;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Event Log</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Live system events pushed via WebSocket (WS)</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-[11px] font-medium text-zinc-400">
              {connected ? 'Connected' : 'Reconnecting...'}
            </span>
          </div>
          <Input icon={<Icons.Search size={13} />} placeholder="Filter events..." value={search} onChange={e => setSearch(e.target.value)} className="w-48" />
        </div>
      </div>

      {filteredEvents.length > 0 ? (
        <div className="space-y-3">
          {filteredEvents.map((e, i) => (
            <Card key={i} className="border-l-2 border-l-zinc-800 hover:border-l-emerald-500/50 transition-colors">
              <CardBody className="py-3 px-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getEventIcon(e.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-zinc-200">{getEventTitle(e)}</span>
                      <span className="text-[10px] text-zinc-600 font-mono">
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 font-mono bg-zinc-950/50 p-2 rounded border border-zinc-900 overflow-x-auto">
                      {e.type === 'tx' ? (
                        <div className="space-y-1">
                          <div className="flex gap-2">
                            <span className="text-zinc-600">ID:</span>
                            <span className="text-blue-400">{e.data.tx_id}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-zinc-600">Caller:</span>
                            <span>{e.data.caller}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-zinc-600">Contract:</span>
                            <span className="text-emerald-400">{e.data.contract_id}</span>
                          </div>
                        </div>
                      ) : (
                        JSON.stringify(e.data, null, 2)
                      )}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="flex flex-col items-center justify-center py-24 text-zinc-600">
             <Icons.Activity size={32} className="mb-3 opacity-20" />
             <p className="text-sm">No events matching your search.</p>
             <p className="text-[10px] mt-1 italic">Waiting for incoming events from {connected ? 'gateway' : 'reconnection'}...</p>
          </div>
        </Card>
      )}
    </div>
  );
}

export function ApiPage() {
  const [selected, setSelected] = useState<any>(null);
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const config = getConfig();
    setBaseUrl(config.baseUrl);
    setToken(config.token || '');
  }, []);

  const methodColor: Record<string, string> = {
    GET: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
    POST: 'text-blue-400 bg-blue-500/10 border-blue-500/25',
    DELETE: 'text-red-400 bg-red-500/10 border-red-500/25',
  };

  const sendRequest = async () => {
    if (!selected) return;
    setLoading(true);
    setResponse(null);
    
    const start = performance.now();
    try {
      const path = selected.path
        .replace(':contract', 'hr-service')
        .replace(':function', 'get_employee')
        .replace(':collection', 'employees')
        .replace(':partition', 'IT')
        .replace(':id', 'EMP001')
        .replace(':number', '1')
        .replace(':username', 'alice');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${baseUrl}${path}`, {
        method: selected.method,
        headers,
        body: selected.method === 'POST' ? body : undefined,
      });

      const data = await res.json().catch(() => ({ message: 'Failed to parse JSON' }));
      const duration = (performance.now() - start).toFixed(0);
      
      setResponse({
        status: res.status,
        statusText: res.statusText,
        duration: `${duration}ms`,
        data,
      });
    } catch (err: any) {
      const duration = (performance.now() - start).toFixed(0);
      setResponse({
        error: true,
        message: err.message || 'Network error',
        duration: `${duration}ms`,
        hint: 'If this is a CORS error, ensure the gateway has CorsLayer::permissive() enabled.',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response.data || response, null, 2)).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">API Playground</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Explore and test Qorvum REST API endpoints</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" dot>REST API</Badge>
          <Badge variant="accent">axum 0.7</Badge>
        </div>
      </div>

      <Card className="mb-4">
        <CardBody className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-48">
            <span className="text-xs text-zinc-500 shrink-0">Base URL</span>
            <Input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} className="flex-1 text-xs font-mono" />
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-64">
            <span className="text-xs text-zinc-500 shrink-0 flex items-center gap-1"><Icons.Key size={11} /> Bearer</span>
            <Input value={token} onChange={e => setToken(e.target.value)} placeholder="Paste token..." className="flex-1 text-xs font-mono" />
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Endpoint list */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <Icons.Layers size={14} className="text-emerald-400" />
            <span className="text-sm font-semibold">Endpoints</span>
            <span className="text-xs text-zinc-500 font-mono">({API_ENDPOINTS.length})</span>
          </CardHeader>
          <div className="divide-y divide-zinc-800/50">
            {API_ENDPOINTS.map((ep, i) => (
              <button type="button" key={i} onClick={() => { setSelected(ep); setBody(ep.body ?? ''); setResponse(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${selected === ep ? 'bg-zinc-800' : 'hover:bg-zinc-800/40'}`}>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border font-mono shrink-0 ${methodColor[ep.method] ?? 'text-zinc-400 bg-zinc-800 border-zinc-700'}`}>
                  {ep.method}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-mono text-zinc-300 truncate">{ep.path}</div>
                  <div className="text-[10px] text-zinc-500 truncate">{ep.desc}</div>
                </div>
                {ep.auth && <Icons.Key size={10} className="text-zinc-600 shrink-0" />}
              </button>
            ))}
          </div>
        </Card>

        {/* Request + Response */}
        <div className="lg:col-span-3 space-y-4">
          {selected ? (
            <>
              <Card>
                <CardHeader>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border font-mono shrink-0 ${methodColor[selected.method] ?? ''}`}>
                    {selected.method}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-mono text-zinc-300 truncate">{selected.path}</div>
                    <div className="text-[10px] font-mono text-zinc-600 truncate mt-0.5">
                      {baseUrl}{selected.path
                        .replace(':contract', 'hr-service')
                        .replace(':function', 'get_employee')
                        .replace(':collection', 'employees')
                        .replace(':partition', 'IT')
                        .replace(':id', 'EMP001')
                        .replace(':number', '1')
                        .replace(':username', 'alice')}
                    </div>
                  </div>
                  {selected.auth && <Badge variant="warning"><Icons.Key size={10} /> Auth required</Badge>}
                </CardHeader>
                <CardBody>
                  {selected.body && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-zinc-500 mb-2">Request Body</p>
                      <textarea
                        aria-label="Request body"
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        rows={8}
                        spellCheck={false}
                        placeholder="Enter JSON body..."
                        className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-xs p-3 rounded-lg focus:outline-none focus:border-zinc-600 resize-none"
                      />
                    </div>
                  )}
                  <Button variant="default" onClick={sendRequest} disabled={loading}
                    icon={loading ? undefined : <Icons.Play size={13} />}>
                    {loading ? 'Sending...' : 'Send Request'}
                  </Button>
                </CardBody>
              </Card>

              {(response || loading) && (
                <Card>
                  <CardHeader action={
                    response ? (
                      <button type="button" onClick={copyResponse} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
                        <Icons.Copy size={12} />{copied ? 'Copied!' : 'Copy'}
                      </button>
                    ) : undefined
                  }>
                    <Icons.Terminal size={14} className="text-emerald-400" />
                    <span className="text-sm font-semibold">Response</span>
                    {response && (
                      <div className="flex gap-2">
                        <Badge variant={response.error ? 'danger' : 'success'}>
                          {response.status || 'ERROR'} {response.statusText}
                        </Badge>
                        <Badge variant="default">{response.duration}</Badge>
                      </div>
                    )}
                  </CardHeader>
                  <div className="p-4">
                    {loading ? (
                      <div className="flex items-center gap-2 text-zinc-500 text-sm py-4 justify-center">
                        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        Waiting for response...
                      </div>
                    ) : (
                      <pre className="text-xs text-zinc-300 font-mono overflow-x-auto bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                        {JSON.stringify(response.data || response, null, 2)}
                      </pre>
                    )}
                  </div>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Icons.Terminal size={32} className="text-zinc-700 mb-3" />
                <p className="text-sm font-medium text-zinc-500">Select an endpoint</p>
                <p className="text-xs text-zinc-600 mt-1">Click an endpoint from the left panel to get started</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

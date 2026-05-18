import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardBody, Badge, Button, Input } from '../components/ui';
import * as Icons from '../components/icons';
import { getConfig } from '../lib/config';
import { useWsEvents } from '../lib/hooks';
import type { RealtimeEvent } from '../lib/hooks';

// ── Endpoint definitions ──────────────────────────────────────────────────────

type BlobType = 'upload' | 'get' | 'delete';

interface Endpoint {
  method: string;
  path: string;
  desc: string;
  auth: boolean;
  body?: string;
  section: 'general' | 'blob';
  blobType?: BlobType;
}

const API_ENDPOINTS: Endpoint[] = [
  // ── General ───────────────────────────────────────────────────────────────
  { section: 'general', method: 'GET',  path: '/api/v1/health',                             desc: 'Gateway health check',                        auth: false },
  { section: 'general', method: 'GET',  path: '/api/v1/stats',                              desc: 'Network statistics',                          auth: false },
  { section: 'general', method: 'POST', path: '/api/v1/auth/login',                         desc: 'Authenticate and get bearer token',            auth: false, body: '{\n  "username": "admin",\n  "password": "secret1234",\n  "ttl": 3600\n}' },
  { section: 'general', method: 'POST', path: '/api/v1/auth/bootstrap',                     desc: 'Bootstrap first admin (only once)',            auth: false, body: '{\n  "username": "admin",\n  "password": "secret1234",\n  "org": "Org1"\n}' },
  { section: 'general', method: 'POST', path: '/api/v1/auth/refresh',                       desc: 'Refresh current session token',               auth: true,  body: '{}' },
  { section: 'general', method: 'GET',  path: '/api/v1/blocks',                             desc: 'List latest blocks (paginated)',               auth: true  },
  { section: 'general', method: 'GET',  path: '/api/v1/blocks/:number',                     desc: 'Get block by number',                         auth: true  },
  { section: 'general', method: 'GET',  path: '/api/v1/records/:collection',                desc: 'List ledger records (filterable)',             auth: true  },
  { section: 'general', method: 'GET',  path: '/api/v1/records/:collection/:partition/:id', desc: 'Get a specific record by key',                 auth: true  },
  { section: 'general', method: 'GET',  path: '/api/v1/history/:collection/:id',            desc: 'Get record version history',                  auth: true  },
  { section: 'general', method: 'GET',  path: '/api/v1/admin/users',                        desc: 'List enrolled users',                         auth: true  },
  { section: 'general', method: 'POST', path: '/api/v1/admin/users/enroll',                 desc: 'Enroll a new user',                           auth: true,  body: '{\n  "username": "alice",\n  "password": "password123",\n  "org": "Org1",\n  "email": "alice@example.com",\n  "roles": ["EMPLOYEE"],\n  "days": 365\n}' },
  { section: 'general', method: 'POST', path: '/api/v1/admin/users/:username/revoke',       desc: 'Revoke user access immediately',              auth: true,  body: '{\n  "reason": "Left organization"\n}' },
  { section: 'general', method: 'GET',  path: '/api/v1/contracts',                          desc: 'List all deployed contracts and their functions', auth: true },
  { section: 'general', method: 'POST', path: '/api/v1/invoke/:contract/:function',         desc: 'Invoke contract function (writes to ledger)', auth: true,  body: '{}' },
  { section: 'general', method: 'GET',  path: '/api/v1/query/:contract/:function',          desc: 'Query contract function (read-only)',         auth: true  },
  // ── BlobStore ─────────────────────────────────────────────────────────────
  { section: 'blob', blobType: 'upload', method: 'POST',   path: '/api/v1/blob/upload',      desc: 'Upload a file — returns blob_id + blake3_hash', auth: true },
  { section: 'blob', blobType: 'get',    method: 'GET',    path: '/api/v1/blob/:blob_id',    desc: 'Retrieve file bytes with correct Content-Type',  auth: true },
  { section: 'blob', blobType: 'delete', method: 'DELETE', path: '/api/v1/blob/:blob_id',    desc: 'Soft-delete a blob (file stays on disk)',        auth: true },
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
      case 'block': return <Icons.Cube size={14} className="text-[var(--accent)]" />;
      case 'tx': return <Icons.Zap size={14} className="text-blue-400" />;
      case 'node_status': return <Icons.Server size={14} className="text-zinc-400" />;
      default: return <Icons.Activity size={14} className="text-[var(--text-3)]" />;
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

  const eventAccent: Record<string, string> = {
    block: 'border-l-[var(--accent)]',
    tx: 'border-l-blue-500',
    node_status: 'border-l-zinc-500',
  };

  return (
    <div className="animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Event Log</h1>
          <p className="text-sm text-[var(--text-3)] mt-0.5">Live system events pushed via WebSocket (WS)</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${connected ? 'bg-emerald-500/8 border-emerald-500/20' : 'bg-red-500/8 border-red-500/20'}`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 dot-pulse' : 'bg-red-500'}`} />
            <span className={`text-[11px] font-medium ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
              {connected ? 'Connected' : 'Reconnecting...'}
            </span>
          </div>
          <Input icon={<Icons.Search size={13} />} placeholder="Filter events..." value={search} onChange={e => setSearch(e.target.value)} className="w-48" />
        </div>
      </div>

      {filteredEvents.length > 0 ? (
        <div className="space-y-3">
          {filteredEvents.map((e, i) => (
            <Card key={i} className={`border-l-2 ${eventAccent[e.type] ?? 'border-l-[var(--border)]'} transition-colors`}>
              <CardBody className="py-3 px-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0">{getEventIcon(e.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-bold text-[var(--text)]">{getEventTitle(e)}</span>
                      <span className="text-[10px] text-[var(--text-3)] font-mono shrink-0 ml-2">
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--text-3)] font-mono bg-[var(--code-bg)] p-2.5 rounded-xl border border-[var(--border)] overflow-x-auto">
                      {e.type === 'tx' ? (
                        <div className="space-y-1">
                          <div className="flex gap-2">
                            <span className="text-[var(--text-3)]">ID:</span>
                            <span className="text-blue-400">{e.data.tx_id}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-[var(--text-3)]">Caller:</span>
                            <span className="text-[var(--text-2)]">{e.data.caller}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-[var(--text-3)]">Contract:</span>
                            <span className="text-[var(--accent)]">{e.data.contract_id}</span>
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
          <div className="flex flex-col items-center justify-center py-24 text-[var(--text-3)]">
            <Icons.Activity size={32} className="mb-3 opacity-20" />
            <p className="text-sm">No events matching your search.</p>
            <p className="text-[10px] mt-1 italic">Waiting for incoming events from {connected ? 'gateway' : 'reconnection'}...</p>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function resolvePath(
  template: string,
  params: Record<string, string>,
): string {
  return template.replace(/:([a-z_]+)/g, (_, k) => params[k] ?? `:${k}`);
}

const DEFAULT_PARAMS: Record<string, string> = {
  contract: 'hr-service',
  function: 'get_employee',
  collection: 'employees',
  partition: 'IT',
  id: 'EMP001',
  number: '1',
  username: 'alice',
};

const METHOD_COLOR: Record<string, string> = {
  GET:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  POST:   'text-blue-400   bg-blue-500/10   border-blue-500/25',
  DELETE: 'text-red-400    bg-red-500/10    border-red-500/25',
};

// ── FileDropZone ──────────────────────────────────────────────────────────────

function FileDropZone({
  file,
  onFile,
}: {
  file: File | null;
  onFile: (f: File) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) onFile(f);
    },
    [onFile],
  );

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all
        ${dragging
          ? 'border-(--accent) bg-(--accent-bg)'
          : file
            ? 'border-emerald-500/40 bg-emerald-500/5'
            : 'border-(--border) hover:border-(--accent)/50 hover:bg-(--raised)/50'
        }`}
    >
      <input
        ref={inputRef}
        type="file"
        aria-label="Choose file to upload"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
      {file ? (
        <>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Icons.CheckCircle size={20} className="text-emerald-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-(--text) truncate max-w-48">{file.name}</p>
            <p className="text-xs text-(--text-3) mt-0.5">
              {file.type || 'application/octet-stream'} · {formatBytes(file.size)}
            </p>
          </div>
          <p className="text-[10px] text-(--text-3)">Click or drop to replace</p>
        </>
      ) : (
        <>
          <div className="w-10 h-10 rounded-xl bg-(--raised) border border-(--border) flex items-center justify-center">
            <Icons.Upload size={20} className="text-(--text-3)" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-(--text-2)">Drop a file here</p>
            <p className="text-xs text-(--text-3) mt-0.5">or click to browse</p>
          </div>
          <p className="text-[10px] text-(--text-3)">Images, PDFs, documents — any binary</p>
        </>
      )}
    </div>
  );
}

// ── BinaryResponse ────────────────────────────────────────────────────────────

function BinaryResponse({
  objectUrl,
  contentType,
  filename,
}: {
  objectUrl: string;
  contentType: string;
  filename: string;
}) {
  const isImage = contentType.startsWith('image/');

  return (
    <div className="space-y-3">
      {isImage && (
        <div className="rounded-xl border border-(--border) overflow-hidden bg-[repeating-conic-gradient(#ffffff0a_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]">
          <img
            src={objectUrl}
            alt="blob preview"
            className="max-h-96 mx-auto object-contain block"
          />
        </div>
      )}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-(--raised) border border-(--border)">
        <div className="w-8 h-8 rounded-lg bg-(--accent-bg) border border-(--accent)/20 flex items-center justify-center shrink-0">
          {isImage
            ? <Icons.Eye size={14} className="text-(--accent)" />
            : <Icons.Download size={14} className="text-(--accent)" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-(--text) truncate">{filename}</p>
          <p className="text-[10px] text-(--text-3) font-mono">{contentType}</p>
        </div>
        <a
          href={objectUrl}
          download={filename}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-(--accent) text-white hover:brightness-110 transition-all"
        >
          <Icons.Download size={12} />
          Download
        </a>
      </div>
    </div>
  );
}

// ── ApiPage ───────────────────────────────────────────────────────────────────

export function ApiPage() {
  const [selected, setSelected]   = useState<Endpoint | null>(null);
  const [body, setBody]           = useState('');
  const [response, setResponse]   = useState<any | null>(null);
  const [loading, setLoading]     = useState(false);
  const [token, setToken]         = useState('');
  const [baseUrl, setBaseUrl]     = useState('');
  const [copied, setCopied]       = useState(false);

  // Blob-specific state
  const [uploadFile, setUploadFile]       = useState<File | null>(null);
  const [mimeOverride, setMimeOverride]   = useState('');
  const [pathParams, setPathParams]       = useState<Record<string, string>>({});
  const [lastBlobId, setLastBlobId]       = useState('');
  const [binaryResult, setBinaryResult]   = useState<{ objectUrl: string; contentType: string; filename: string } | null>(null);
  const prevObjectUrl = useRef<string | null>(null);

  useEffect(() => {
    const cfg = getConfig();
    setBaseUrl(cfg.baseUrl);
    setToken(cfg.token || '');
  }, []);

  // Revoke previous object URL to avoid memory leaks
  useEffect(() => {
    return () => {
      if (prevObjectUrl.current) URL.revokeObjectURL(prevObjectUrl.current);
    };
  }, []);

  const selectEndpoint = (ep: Endpoint) => {
    setSelected(ep);
    setBody(ep.body ?? '');
    setResponse(null);
    setBinaryResult(null);
    if (ep.blobType === 'upload') {
      setUploadFile(null);
      setMimeOverride('');
    }
    if (ep.blobType === 'get' || ep.blobType === 'delete') {
      setPathParams({ blob_id: lastBlobId });
    }
  };

  const resolvedPath = selected
    ? resolvePath(selected.path, { ...DEFAULT_PARAMS, ...pathParams })
    : '';

  const sendRequest = async () => {
    if (!selected) return;
    setLoading(true);
    setResponse(null);
    setBinaryResult(null);
    if (prevObjectUrl.current) {
      URL.revokeObjectURL(prevObjectUrl.current);
      prevObjectUrl.current = null;
    }

    const start = performance.now();
    const authHeaders: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    try {
      // ── Blob upload (multipart) ────────────────────────────────────────────
      if (selected.blobType === 'upload') {
        if (!uploadFile) {
          setResponse({ error: true, message: 'No file selected.', duration: '0ms' });
          setLoading(false);
          return;
        }
        const form = new FormData();
        form.append('file', uploadFile, uploadFile.name);
        if (mimeOverride.trim()) form.append('mime_type', mimeOverride.trim());

        const res = await fetch(`${baseUrl}${resolvedPath}`, {
          method: 'POST',
          headers: authHeaders,
          body: form,
        });
        const data = await res.json().catch(() => ({ message: 'Failed to parse JSON' }));
        const duration = `${(performance.now() - start).toFixed(0)}ms`;
        setResponse({ status: res.status, statusText: res.statusText, duration, data });

        // Store blob_id for quick use in GET/DELETE
        if (res.ok && data?.data?.blob_id) {
          setLastBlobId(data.data.blob_id);
        }
        return;
      }

      // ── Blob GET (binary response) ─────────────────────────────────────────
      if (selected.blobType === 'get') {
        const res = await fetch(`${baseUrl}${resolvedPath}`, {
          method: 'GET',
          headers: authHeaders,
        });
        const duration = `${(performance.now() - start).toFixed(0)}ms`;

        if (!res.ok) {
          const data = await res.json().catch(() => ({ message: res.statusText }));
          setResponse({ status: res.status, statusText: res.statusText, duration, data });
          return;
        }

        const contentType = res.headers.get('content-type') || 'application/octet-stream';
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        prevObjectUrl.current = objectUrl;

        const dispHeader = res.headers.get('content-disposition') || '';
        const fnMatch = dispHeader.match(/filename="?([^";]+)"?/);
        const filename = fnMatch?.[1] || pathParams['blob_id'] || 'blob';

        setResponse({ status: res.status, statusText: res.statusText, duration, data: null });
        setBinaryResult({ objectUrl, contentType, filename });
        return;
      }

      // ── Standard JSON request (blob delete + all general endpoints) ────────
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...authHeaders,
      };
      const res = await fetch(`${baseUrl}${resolvedPath}`, {
        method: selected.method,
        headers,
        body: selected.method !== 'GET' && body ? body : undefined,
      });
      const data = await res.json().catch(() => ({ message: 'Failed to parse JSON' }));
      const duration = `${(performance.now() - start).toFixed(0)}ms`;
      setResponse({ status: res.status, statusText: res.statusText, duration, data });

    } catch (err: any) {
      const duration = `${(performance.now() - start).toFixed(0)}ms`;
      setResponse({
        error: true,
        message: err.message || 'Network error',
        duration,
        hint: 'Check CORS — gateway must have CorsLayer enabled.',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyResponse = () => {
    const text = JSON.stringify(response?.data ?? response, null, 2);
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Extract path params that need user input (e.g. :blob_id)
  const dynamicParams = selected
    ? [...selected.path.matchAll(/:([a-z_]+)/g)]
        .map(m => m[1])
        .filter(p => !(p in DEFAULT_PARAMS))
    : [];

  // Group endpoints by section for the sidebar
  const generalEndpoints = API_ENDPOINTS.filter(e => e.section === 'general');
  const blobEndpoints    = API_ENDPOINTS.filter(e => e.section === 'blob');

  return (
    <div className="animate-slide-up">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-(--text)">API Playground</h1>
          <p className="text-sm text-(--text-3) mt-0.5">Explore and test Qorvum REST API — including BlobStore</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" dot>REST API</Badge>
          <Badge variant="accent">axum 0.7</Badge>
          <Badge variant="info"><Icons.Database size={10} /> BlobStore</Badge>
        </div>
      </div>

      {/* Connection bar */}
      <Card className="mb-4">
        <CardBody className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-48">
            <span className="text-xs text-(--text-3) shrink-0">Base URL</span>
            <Input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} className="flex-1 text-xs font-mono" />
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-64">
            <span className="text-xs text-(--text-3) shrink-0 flex items-center gap-1">
              <Icons.Key size={11} /> Bearer
            </span>
            <Input
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Paste token..."
              className="flex-1 text-xs font-mono"
            />
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* ── Endpoint list ────────────────────────────────────────────────── */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader>
            <Icons.Layers size={14} className="text-(--accent)" />
            <span className="text-sm font-semibold">Endpoints</span>
            <span className="text-xs text-(--text-3) font-mono">({API_ENDPOINTS.length})</span>
          </CardHeader>

          {/* General section */}
          <div className="px-4 py-1.5 border-b border-(--border)/50 bg-(--raised)/30">
            <span className="text-[9px] font-bold uppercase tracking-widest text-(--text-3)">General</span>
          </div>
          <div className="divide-y divide-(--border)/40">
            {generalEndpoints.map((ep, i) => (
              <EndpointRow key={i} ep={ep} selected={selected === ep} onClick={() => selectEndpoint(ep)} />
            ))}
          </div>

          {/* BlobStore section */}
          <div className="px-4 py-1.5 border-y border-(--border)/50 bg-blue-500/5 mt-0.5">
            <div className="flex items-center gap-1.5">
              <Icons.Database size={10} className="text-blue-400" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-blue-400">BlobStore</span>
              <span className="ml-auto text-[9px] text-blue-400/60 font-mono">off-chain</span>
            </div>
          </div>
          <div className="divide-y divide-(--border)/40">
            {blobEndpoints.map((ep, i) => (
              <EndpointRow key={i} ep={ep} selected={selected === ep} onClick={() => selectEndpoint(ep)} />
            ))}
          </div>

          {/* Last blob_id hint */}
          {lastBlobId && (
            <div className="px-4 py-3 border-t border-(--border)/50 bg-(--raised)/20">
              <p className="text-[9px] font-bold uppercase tracking-widest text-(--text-3) mb-1.5">Last uploaded blob_id</p>
              <div className="flex items-center gap-2">
                <code className="text-[10px] font-mono text-(--accent) bg-(--accent-bg) px-2 py-1 rounded-lg border border-(--accent)/20 truncate flex-1">
                  {lastBlobId}
                </code>
                <button
                  type="button"
                  title="Copy blob_id"
                  onClick={() => navigator.clipboard.writeText(lastBlobId).catch(() => {})}
                  className="shrink-0 p-1.5 rounded-lg text-(--text-3) hover:bg-(--raised) hover:text-(--text) transition-colors"
                >
                  <Icons.Copy size={12} />
                </button>
              </div>
              <div className="flex gap-1.5 mt-2">
                {blobEndpoints
                  .filter(e => e.blobType !== 'upload')
                  .map((ep, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { selectEndpoint(ep); setPathParams({ blob_id: lastBlobId }); }}
                      className={`flex-1 text-[9px] font-semibold px-2 py-1 rounded-lg border transition-all
                        ${METHOD_COLOR[ep.method] ?? 'text-(--text-3) bg-(--raised) border-(--border)'}`}
                    >
                      {ep.method} blob
                    </button>
                  ))}
              </div>
            </div>
          )}
        </Card>

        {/* ── Request + Response panel ──────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          {selected ? (
            <>
              {/* Request card */}
              <Card>
                <CardHeader>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border font-mono shrink-0 ${METHOD_COLOR[selected.method] ?? ''}`}>
                    {selected.method}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-mono text-(--text-2) truncate">{selected.path}</div>
                    <div className="text-[10px] font-mono text-(--text-3) truncate mt-0.5">
                      {baseUrl}{resolvedPath}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {selected.section === 'blob' && (
                      <Badge variant="info"><Icons.Database size={9} /> Blob</Badge>
                    )}
                    {selected.auth && <Badge variant="warning"><Icons.Key size={9} /> Auth</Badge>}
                  </div>
                </CardHeader>

                <CardBody className="space-y-4">
                  {/* Dynamic path params (e.g. :blob_id) */}
                  {dynamicParams.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-(--text-3)">Path Parameters</p>
                      {dynamicParams.map(param => (
                        <div key={param} className="flex items-center gap-2">
                          <code className="text-[10px] font-mono text-(--accent) bg-(--accent-bg) px-2 py-1 rounded-lg border border-(--accent)/20 shrink-0">
                            :{param}
                          </code>
                          <Input
                            value={pathParams[param] ?? ''}
                            onChange={e => setPathParams(p => ({ ...p, [param]: e.target.value }))}
                            placeholder={`Enter ${param}...`}
                            className="flex-1 text-xs font-mono"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Blob upload UI */}
                  {selected.blobType === 'upload' && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-(--text-3)">File</p>
                      <FileDropZone file={uploadFile} onFile={setUploadFile} />
                      {uploadFile && (
                        <div>
                          <p className="text-xs font-semibold text-(--text-3) mb-1.5">
                            MIME type override
                            <span className="ml-1 font-normal text-[10px] opacity-60">optional — auto-detected from file</span>
                          </p>
                          <Input
                            value={mimeOverride}
                            onChange={e => setMimeOverride(e.target.value)}
                            placeholder={uploadFile?.type || 'application/octet-stream'}
                            className="text-xs font-mono"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Standard JSON body */}
                  {selected.body !== undefined && selected.blobType !== 'upload' && (
                    <div>
                      <p className="text-xs font-semibold text-(--text-3) mb-1.5">Request Body</p>
                      <textarea
                        aria-label="Request body"
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        rows={7}
                        spellCheck={false}
                        className="w-full bg-(--code-bg) border border-(--border) text-(--text-2) font-mono text-xs p-3 rounded-xl focus:outline-none focus:border-(--accent)/40 focus:ring-2 focus:ring-(--accent)/10 resize-none transition-all"
                      />
                    </div>
                  )}

                  <Button
                    variant="default"
                    onClick={sendRequest}
                    disabled={loading || (selected.blobType === 'upload' && !uploadFile)}
                    icon={loading ? undefined : <Icons.Play size={13} />}
                  >
                    {loading ? 'Sending...' : selected.blobType === 'upload' ? 'Upload File' : 'Send Request'}
                  </Button>
                </CardBody>
              </Card>

              {/* Response card */}
              {(response || binaryResult || loading) && (
                <Card>
                  <CardHeader action={
                    response?.data ? (
                      <button
                        type="button"
                        onClick={copyResponse}
                        className="flex items-center gap-1 text-xs text-(--text-3) hover:text-(--text) transition-colors"
                      >
                        <Icons.Copy size={12} />{copied ? 'Copied!' : 'Copy JSON'}
                      </button>
                    ) : undefined
                  }>
                    <Icons.Terminal size={14} className="text-(--accent)" />
                    <span className="text-sm font-semibold">Response</span>
                    {response && (
                      <div className="flex gap-2">
                        <Badge variant={response.error || response.status >= 400 ? 'danger' : 'success'}>
                          {response.status ?? 'ERROR'} {response.statusText}
                        </Badge>
                        <Badge variant="default">{response.duration}</Badge>
                        {binaryResult && (
                          <Badge variant="info">binary</Badge>
                        )}
                      </div>
                    )}
                  </CardHeader>

                  <div className="p-4 space-y-3">
                    {loading ? (
                      <div className="flex items-center gap-2 text-(--text-3) text-sm py-6 justify-center">
                        <div className="w-4 h-4 border-2 border-(--accent) border-t-transparent rounded-full spin" />
                        Waiting for response...
                      </div>
                    ) : (
                      <>
                        {/* Binary preview (blob GET) */}
                        {binaryResult && (
                          <BinaryResponse
                            objectUrl={binaryResult.objectUrl}
                            contentType={binaryResult.contentType}
                            filename={binaryResult.filename}
                          />
                        )}

                        {/* JSON response */}
                        {response?.data && (
                          <>
                            {/* After successful upload: quick-use hint */}
                            {selected?.blobType === 'upload' && response.status < 400 && response.data?.data?.blob_id && (
                              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                                <Icons.CheckCircle size={16} className="text-emerald-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-emerald-400">Upload successful</p>
                                  <code className="text-[10px] font-mono text-(--text-2) break-all">
                                    blob_id: {response.data.data.blob_id}
                                  </code>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => navigator.clipboard.writeText(response.data.data.blob_id).catch(() => {})}
                                  className="shrink-0 p-1.5 rounded-lg text-(--text-3) hover:bg-(--raised) transition-colors"
                                  title="Copy blob_id"
                                >
                                  <Icons.Copy size={12} />
                                </button>
                              </div>
                            )}
                            <pre className="text-xs text-(--text-2) font-mono overflow-x-auto bg-(--code-bg) p-4 rounded-xl border border-(--border) max-h-80">
                              {JSON.stringify(response.data, null, 2)}
                            </pre>
                          </>
                        )}

                        {/* Error response */}
                        {response?.error && (
                          <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                            <Icons.AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-semibold text-red-400">{response.message}</p>
                              {response.hint && (
                                <p className="text-[10px] text-(--text-3) mt-1">{response.hint}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </Card>
              )}
            </>
          ) : (
            /* Empty state */
            <Card>
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-(--raised) border border-(--border) flex items-center justify-center mb-4">
                  <Icons.Terminal size={24} className="text-(--text-3)" />
                </div>
                <p className="text-sm font-medium text-(--text-2)">Select an endpoint</p>
                <p className="text-xs text-(--text-3) mt-1">
                  General API or BlobStore — click any endpoint on the left
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <Badge variant="info"><Icons.Database size={10} /> New: BlobStore endpoints</Badge>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ── EndpointRow (extracted for reuse) ────────────────────────────────────────

function EndpointRow({
  ep,
  selected,
  onClick,
}: {
  ep: Endpoint;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
        ${selected ? 'bg-(--raised)' : 'hover:bg-(--raised)/40'}`}
    >
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border font-mono shrink-0
        ${METHOD_COLOR[ep.method] ?? 'text-(--text-3) bg-(--raised) border-(--border)'}`}>
        {ep.method}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-mono text-(--text-2) truncate">{ep.path}</div>
        <div className="text-[10px] text-(--text-3) truncate">{ep.desc}</div>
      </div>
      {ep.auth && <Icons.Key size={10} className="text-(--text-3) shrink-0" />}
    </button>
  );
}

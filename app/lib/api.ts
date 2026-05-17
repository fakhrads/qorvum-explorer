/**
 * Qorvum API Client
 * Typed client for interacting with the Qorvum REST API.
 */

import { getConfig, getAuthHeader } from './config';

// --- Types ---

export interface HealthResponse {
  success: boolean;
  data: {
    status: string;
    channel: string;
    mode: 'dev' | 'consensus';
    latest_block: number | null;
    version: string;
  };
}

export interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    expires_at: number;
    subject: string;
    org: string;
    roles: string[];
  };
}

export interface RefreshResponse {
  success: boolean;
  data: {
    subject: string;
    org: string;
    roles: string[];
    expires_at: number;
    message?: string;
  };
}

export interface BootstrapResponse {
  success: boolean;
  data: {
    username: string;
    org: string;
    roles: string[];
    message: string;
  };
}

export interface Transaction {
  tx_id: number[]; // hex bytes as array of numbers
  channel_id: string;
  contract_id: string;
  function_name: string;
  args: unknown;
  timestamp: number; // unix nanos
}

export interface Block {
  header: {
    block_number: number;
    previous_hash: string;
    transactions_root: string;
    state_root: string;
    timestamp: number; // unix nanos
    channel_id: string;
    creator_msp_id: string;
  };
  transactions: Transaction[];
  metadata: {
    block_hash: string;
    tx_count: number;
  };
}

export interface LedgerRecord {
  meta: {
    id: string;
    collection: string;
    partition: string;
    version: number;
    created_at: number;
    updated_at: number;
    created_by: string;
    updated_by: string;
    is_deleted: boolean;
    tx_id: number[];
    block_num: number;
  };
  fields: Record<string, { t: string; v: unknown }>;
}

export interface ListResponse {
  success: boolean;
  data: LedgerRecord[];
}

// Backend returns only version + block_num per history entry (no full record data)
export interface HistoryEntry {
  version: number;
  block_num: number;
}

export interface InvokeResponse {
  success: boolean;
  data: {
    tx_id: string;
    block_num?: number;
    response: unknown;
  };
}

export interface Contract {
  id: string;
  kind: 'native' | 'wasm';
  functions: string[];
}

export interface User {
  username: string;
  org: string;
  roles: string[];
  expires_at: number;
  status: 'VALID' | 'EXPIRED' | 'REVOKED';
}

export interface EnrollRequest {
  username: string;
  password?: string;
  roles: string[];
  org: string;
  days: number;
  email?: string;
}

export interface EnrolledUser {
  username: string;
  org: string;
  roles: string[];
  cert_fingerprint: string;
  expires_at: number;
  message: string;
}

export interface RevokeResponse {
  username: string;
  serial: string;
  reason: string;
  message: string;
}

export interface Certificate {
  serial: string;
  subject: string;
  org: string;
  org_unit: string | null;
  email: string | null;
  issuer: string;
  cert_type: 'User' | 'Node' | 'CA';
  algorithm: string;
  roles: string[];
  not_before: number;
  not_after: number;
  fingerprint: string;
  status: 'VALID' | 'EXPIRED' | 'REVOKED';
  revoke_reason: string | null;
}

export interface CaInfo {
  name: string;
  org: string;
  serial: string;
  algorithm: string;
  not_before: number;
  not_after: number;
  fingerprint: string;
}

export interface CertsResponse {
  certs: Certificate[];
  crl: Record<string, string>;
  ca: CaInfo;       // first/local CA (backwards compat)
  cas: CaInfo[];    // all trusted CAs (federation)
  total: number;
}

export interface StatsResponse {
  success: boolean;
  data: {
    channel: string;
    block_height: number | null;
    total_tx: number;
    mode: 'dev' | 'consensus';
    version: string;
  };
}

export interface MetricsResponse {
  success: boolean;
  data: {
    cpu_percent: number;
    mem_used_mb: number;
    mem_total_mb: number;
    mem_percent: number;
  };
}

export class ApiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// --- Helpers ---

export function formatTimestamp(nanos: number): string {
  return new Date(nanos / 1_000_000).toISOString();
}

export function formatTxId(txId: number[]): string {
  return Array.from(txId)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function formatHash(h: number[] | string | null | undefined): string {
  if (!h) return '';
  if (typeof h === 'string') return h;
  return Array.from(h).map((b) => (b as number).toString(16).padStart(2, '0')).join('');
}

function normalizeBlock(raw: any): Block {
  return {
    header: {
      ...raw.header,
      previous_hash: formatHash(raw.header?.previous_hash),
      transactions_root: formatHash(raw.header?.transactions_root),
      state_root: formatHash(raw.header?.state_root),
    },
    transactions: (raw.transactions || []).map((tx: any) => ({
      ...tx,
      tx_id: Array.isArray(tx.tx_id) ? tx.tx_id : tx.tx_id,
    })),
    metadata: {
      ...raw.metadata,
      block_hash: formatHash(raw.metadata?.block_hash),
    },
  };
}

// --- API Client ---

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { baseUrl } = getConfig();
  const url = `${baseUrl}${path}`;
  const headers = new Headers(options.headers);

  const authHeader = getAuthHeader();
  if (authHeader) {
    headers.set('Authorization', authHeader);
  }

  // Support for bypass login in dev mode if token is missing
  const config = getConfig();
  if (!config.token && config.username) {
    headers.set('X-Identity', config.username);
    headers.set('X-Roles', config.roles.join(','));
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let message = response.statusText;
    let code: string | undefined;
    try {
      const errorData = await response.json();
      // Gateway wraps errors as { success: false, error: { code, message } }
      // but some endpoints use { message } directly
      message = errorData?.error?.message || errorData?.message || response.statusText;
      code = errorData?.error?.code || errorData?.code;
    } catch {
      // ignore parse errors, use statusText
    }
    throw new ApiError(message, response.status, code);
  }

  return response.json();
}

export const api = {
  // Auth
  async login(username: string, password?: string, ttl?: number): Promise<LoginResponse> {
    return request<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, ttl }),
    });
  },

  async bootstrap(username: string, password: string, org?: string): Promise<BootstrapResponse> {
    const { baseUrl } = getConfig();
    const url = `${baseUrl}/api/v1/auth/bootstrap`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, org }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new ApiError(errorData.message || response.statusText, response.status);
    }

    return response.json();
  },

  async refresh(ttl?: number): Promise<RefreshResponse> {
    return request<RefreshResponse>('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl }),
    });
  },

  // Health
  async getHealth(): Promise<HealthResponse> {
    const res = await request<any>('/api/v1/health');
    // The gateway's health endpoint returns a flat object, 
    // while others are wrapped in { success: true, data: ... }.
    // We normalize it here.
    if (res.status === 'ok' && !res.success) {
      return { success: true, data: res };
    }
    return res;
  },

  // Blockchain
  async getBlock(num: number): Promise<Block> {
    const res = await request<{ success: boolean; data: any }>(`/api/v1/blocks/${num}`);
    return normalizeBlock(res.data);
  },

  async listBlocks(limit: number = 20, offset: number = 0): Promise<{ blocks: Block[]; total: number; offset: number; limit: number }> {
    const res = await request<{ success: boolean; data: { blocks: any[]; total: number; offset: number; limit: number } }>(
      `/api/v1/blocks?limit=${limit}&offset=${offset}`
    );
    return { ...res.data, blocks: res.data.blocks.map(normalizeBlock) };
  },

  async getLatestBlocks(limit: number = 10): Promise<Block[]> {
    const result = await this.listBlocks(limit);
    return result.blocks;
  },

  async getTransactions(limit: number = 20): Promise<Transaction[]> {
    const blocks = await this.getLatestBlocks(Math.ceil(limit / 2));
    const txs: Transaction[] = [];
    for (const block of blocks) {
      txs.push(...block.transactions);
      if (txs.length >= limit) break;
    }
    return txs.slice(0, limit);
  },

  // Records
  async getRecord(collection: string, partition: string, id: string): Promise<LedgerRecord> {
    const res = await request<{ success: boolean; data: LedgerRecord }>(
      `/api/v1/records/${collection}/${partition}/${id}`
    );
    return res.data;
  },

  async listRecords(collection: string, params: Record<string, string> = {}): Promise<LedgerRecord[]> {
    const query = new URLSearchParams(params).toString();
    const res = await request<{ success: boolean; data: { records: LedgerRecord[]; total: number; offset: number; limit: number } }>(
      `/api/v1/records/${collection}${query ? `?${query}` : ''}`
    );
    return res.data.records;
  },

  async getHistory(collection: string, id: string): Promise<HistoryEntry[]> {
    const res = await request<{ success: boolean; data: { id: string; collection: string; history: HistoryEntry[] } }>(
      `/api/v1/history/${collection}/${id}`
    );
    return res.data.history;
  },

  // Contract
  async invoke(contract: string, fn: string, args: object): Promise<InvokeResponse> {
    return request<InvokeResponse>(`/api/v1/invoke/${contract}/${fn}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
  },

  async query(contract: string, fn: string, args?: object): Promise<unknown> {
    const query = args ? `?args=${encodeURIComponent(JSON.stringify(args))}` : '';
    const res = await request<{ success: boolean; data: unknown }>(
      `/api/v1/query/${contract}/${fn}${query}`
    );
    return res.data;
  },

  // Contracts
  async listContracts(): Promise<Contract[]> {
    const res = await request<{ success: boolean; data: { contracts: Contract[]; total: number } }>('/api/v1/contracts');
    return res.data.contracts;
  },

  async deployContract(contractId: string, wasmFile: File): Promise<{ contract_id: string; size_bytes: number; status: string }> {
    const { baseUrl } = getConfig();
    const url = `${baseUrl}/api/v1/contracts/deploy`;
    const headers = new Headers();
    const authHeader = getAuthHeader();
    if (authHeader) headers.set('Authorization', authHeader);

    const form = new FormData();
    form.append('contract_id', contractId);
    form.append('wasm', wasmFile);

    const response = await fetch(url, { method: 'POST', headers, body: form });
    if (!response.ok) {
      let message = response.statusText;
      try {
        const err = await response.json();
        message = err?.error?.message || message;
      } catch { /* ignore */ }
      throw new ApiError(message, response.status);
    }
    const res = await response.json();
    return res.data;
  },

  // Admin / PKI
  async listUsers(): Promise<User[]> {
    const res = await request<{ success: boolean; data: { users: User[]; total: number } }>('/api/v1/admin/users');
    return res.data.users;
  },

  async enrollUser(data: EnrollRequest): Promise<EnrolledUser> {
    const res = await request<{ success: boolean; data: EnrolledUser }>('/api/v1/admin/users/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async listCertificates(): Promise<CertsResponse> {
    const res = await request<{ success: boolean; data: CertsResponse }>('/api/v1/admin/certs');
    return res.data;
  },

  async revokeUser(username: string, reason: string): Promise<RevokeResponse> {
    const res = await request<{ success: boolean; data: RevokeResponse }>(`/api/v1/admin/users/${username}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    return res.data;
  },

  async getStats(): Promise<StatsResponse> {
    return request<StatsResponse>('/api/v1/stats');
  },

  async getMetrics(): Promise<MetricsResponse> {
    return request<MetricsResponse>('/api/v1/metrics');
  },
};

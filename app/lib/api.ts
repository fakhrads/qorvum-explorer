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

export interface HistoryEntry {
  tx_id: number[];
  block_num: number;
  timestamp: number;
  value: LedgerRecord | null;
  is_delete: boolean;
}

export interface InvokeResponse {
  success: boolean;
  data: {
    tx_id: string;
    block_num?: number;
    response: unknown;
  };
}

export interface Chaincode {
  id: string;
  kind: 'native' | 'wasm';
  functions: string[];
}

export interface User {
  username: string;
  org: string;
  roles: string[];
  expires_at: number;
  status: 'VALID' | 'EXPIRED';
}

export interface EnrollRequest {
  username: string;
  password?: string;
  roles: string[];
  org: string;
  days: number;
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

  // Chaincode
  async invoke(chaincode: string, fn: string, args: object): Promise<InvokeResponse> {
    return request<InvokeResponse>(`/api/v1/invoke/${chaincode}/${fn}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
  },

  async query(chaincode: string, fn: string, args?: object): Promise<unknown> {
    const query = args ? `?args=${encodeURIComponent(JSON.stringify(args))}` : '';
    const res = await request<{ success: boolean; data: unknown }>(
      `/api/v1/query/${chaincode}/${fn}${query}`
    );
    return res.data;
  },

  // Chaincodes
  async listChaincodes(): Promise<Chaincode[]> {
    const res = await request<{ success: boolean; data: { contracts: Chaincode[]; total: number } }>('/api/v1/contracts');
    return res.data.contracts;
  },

  // Admin / PKI
  async listUsers(): Promise<User[]> {
    const res = await request<{ success: boolean; data: { users: User[]; total: number } }>('/api/v1/admin/users');
    return res.data.users;
  },

  async enrollUser(data: EnrollRequest): Promise<User> {
    const res = await request<{ success: boolean; data: User }>('/api/v1/admin/users/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async revokeUser(username: string, reason: string): Promise<void> {
    await request(`/api/v1/admin/users/${username}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
  },
};

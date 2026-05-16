/**
 * Qorvum Data Hooks
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './api';
import type { HealthResponse, Block, Transaction, LedgerRecord, User, Contract, CertsResponse } from './api';
import { useWsContext } from './ws-context';
export type { RealtimeEvent } from './ws-context';

interface HookResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

function usePolling<T>(
  fetchFn: () => Promise<T>,
  intervalMs?: number,
  deps: any[] = [],
  skip: boolean = false
): HookResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async (isInitial = false) => {
    if (!isInitial && typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }
    if (isInitial) setLoading(true);
    try {
      const result = await fetchFn();
      setData(result);
      setError(null);
    } catch (err) {
      console.error('API Error:', err);
      setError(err as Error);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    if (!data && !error) {
      fetchData(true);
    }
    if (intervalMs && intervalMs > 0 && !skip) {
      const jitter = (Math.random() - 0.5) * (intervalMs * 0.2);
      timerRef.current = setInterval(() => fetchData(), intervalMs + jitter);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchData, intervalMs, skip, ...deps]);

  return { data, loading, error, refetch: () => fetchData(true) };
}

// --- Token Refresh Hook ---
// Backend's /auth/refresh does not issue a new token — it returns cert info and
// advises re-authentication. This hook is intentionally a no-op; expiry warnings
// are handled by ConnectionBanner which prompts the user to re-login.
export function useTokenRefresh() {}

// --- Specific Hooks ---

export function useHealth(intervalMs = 15000) {
  const { nodeStatus, latestBlock, connected } = useWsContext();
  const polling = usePolling(() => api.getHealth(), intervalMs, [], connected);

  const latestBlockNum = latestBlock != null
    ? latestBlock.block_num
    : nodeStatus?.latest_block ?? null;

  const data = nodeStatus ? {
    success: true,
    data: {
      status: nodeStatus.status,
      channel: polling.data?.data?.channel ?? 'main-channel',
      mode: nodeStatus.mode as 'dev' | 'consensus',
      latest_block: latestBlockNum,
      version: polling.data?.data?.version ?? 'v0.1.0'
    }
  } : polling.data;

  return { ...polling, data };
}

// Initial HTTP fetch once, then WS push for real-time updates — no polling.
export function useBlocks(limit = 10) {
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { latestBlock } = useWsContext();
  const seenBlockRef = useRef<number | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    api.getLatestBlocks(limit)
      .then(data => { setBlocks(data); setError(null); })
      .catch(err => setError(err))
      .finally(() => setLoading(false));
  }, [limit]);

  // Initial fetch
  useEffect(() => { fetch(); }, [fetch]);

  // Real-time: WS block event → fetch full block and prepend
  useEffect(() => {
    if (!latestBlock) return;
    if (latestBlock.block_num === seenBlockRef.current) return;
    seenBlockRef.current = latestBlock.block_num;

    api.getBlock(latestBlock.block_num)
      .then(block => {
        setBlocks(prev => {
          if (!prev) return [block];
          if (prev.some(b => b.header.block_number === block.header.block_number)) return prev;
          return [block, ...prev].slice(0, limit);
        });
      })
      .catch(() => {});
  }, [latestBlock, limit]);

  return { data: blocks, loading, error, refetch: fetch };
}

// Initial HTTP fetch once, then WS block event triggers tx extraction — no polling.
export function useTransactions(limit = 10) {
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { latestBlock } = useWsContext();
  const seenBlockRef = useRef<number | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    api.getTransactions(limit)
      .then(data => { setTransactions(data); setError(null); })
      .catch(err => setError(err))
      .finally(() => setLoading(false));
  }, [limit]);

  // Initial fetch
  useEffect(() => { fetch(); }, [fetch]);

  // Real-time: new block → get its transactions and prepend
  useEffect(() => {
    if (!latestBlock) return;
    if (latestBlock.block_num === seenBlockRef.current) return;
    seenBlockRef.current = latestBlock.block_num;

    api.getBlock(latestBlock.block_num)
      .then(block => {
        if (!block.transactions.length) return;
        setTransactions(prev => {
          const incoming = block.transactions;
          if (!prev) return incoming;
          const existingIds = new Set(prev.map(t => JSON.stringify(t.tx_id)));
          const fresh = incoming.filter(t => !existingIds.has(JSON.stringify(t.tx_id)));
          return [...fresh, ...prev].slice(0, limit);
        });
      })
      .catch(() => {});
  }, [latestBlock, limit]);

  return { data: transactions, loading, error, refetch: fetch };
}

export function useRecord(collection: string, partition: string, id: string) {
  return usePolling(
    () => api.getRecord(collection, partition, id),
    0,
    [collection, partition, id]
  );
}

export function useListRecords(collection: string, params: Record<string, string> = {}) {
  return usePolling(
    () => api.listRecords(collection, params),
    30000,
    [collection, JSON.stringify(params)]
  );
}

export function useUsers() {
  return usePolling(() => api.listUsers(), 60000);
}

export function useContracts(intervalMs = 60000) {
  return usePolling<Contract[]>(() => api.listContracts(), intervalMs);
}

export function useCertificates(intervalMs = 60000) {
  return usePolling<CertsResponse>(() => api.listCertificates(), intervalMs);
}

// Backwards-compat re-exports
export { useWsContext as useWsEvents };
export type SseEvent = import('./ws-context').RealtimeEvent;

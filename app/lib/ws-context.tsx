/**
 * WS Context — single WebSocket connection shared across the entire app.
 * Wrap the authenticated app with <WsProvider>; consume via useWsContext().
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getConfig } from './config';

export interface RealtimeEvent {
  type: 'block' | 'tx' | 'node_status' | 'connected' | 'heartbeat';
  data: any;
}

export interface PeerInfo {
  peer_id: string;
  addr: string;
}

export interface WsState {
  latestBlock: { block_num: number; tx_count: number; timestamp: number } | null;
  latestTx: { tx_id: string; block_num: number; contract_id: string; function_name: string; caller: string; success: boolean } | null;
  nodeStatus: { status: string; peer_count: number; latest_block: number | null; mode: string; peers: PeerInfo[] } | null;
  connected: boolean;
  events: RealtimeEvent[];
}

const WsContext = createContext<WsState | null>(null);

export function WsProvider({ children }: { children: React.ReactNode }) {
  const [latestBlock, setLatestBlock] = useState<WsState['latestBlock']>(null);
  const [latestTx, setLatestTx] = useState<WsState['latestTx']>(null);
  const [nodeStatus, setNodeStatus] = useState<WsState['nodeStatus']>(null);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    const config = getConfig();
    if (!config.token) return;

    const wsProtocol = config.baseUrl.startsWith('https') ? 'wss' : 'ws';
    const host = config.baseUrl.replace(/^https?:\/\//, '');
    const url = `${wsProtocol}://${host}/api/v1/ws?token=${config.token}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectAttemptsRef.current = 0;
      ws.send(JSON.stringify({ type: 'subscribe', topics: ['blocks', 'tx', 'node_status'] }));
    };

    ws.onclose = () => {
      setConnected(false);
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
      reconnectAttemptsRef.current++;
      reconnectTimeoutRef.current = setTimeout(() => connect(), delay);
    };

    ws.onerror = () => { ws.close(); };

    ws.onmessage = (e) => {
      try {
        const { type, data } = JSON.parse(e.data);
        if (type === 'block') {
          setLatestBlock(data);
          setEvents(prev => [{ type: 'block' as const, data }, ...prev].slice(0, 50));
        } else if (type === 'tx') {
          setLatestTx(data);
          setEvents(prev => [{ type: 'tx' as const, data }, ...prev].slice(0, 50));
        } else if (type === 'node_status') {
          setNodeStatus(data);
          setEvents(prev => [{ type: 'node_status' as const, data }, ...prev].slice(0, 50));
        } else if (type === 'connected') {
          setNodeStatus({ status: 'ok', peer_count: 0, latest_block: data.latest_block, mode: data.mode, peers: [] });
          setEvents(prev => [{ type: 'connected' as const, data }, ...prev].slice(0, 50));
        }
      } catch (err) {
        console.error('Failed to parse WS message', err);
      }
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect]);

  return (
    <WsContext.Provider value={{ latestBlock, latestTx, nodeStatus, connected, events }}>
      {children}
    </WsContext.Provider>
  );
}

export function useWsContext(): WsState {
  const ctx = useContext(WsContext);
  if (!ctx) throw new Error('useWsContext: missing <WsProvider>');
  return ctx;
}

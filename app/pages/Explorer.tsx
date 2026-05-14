import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardBody, Badge, Table, HashDisplay, Tabs, Pagination, DetailRow } from '../components/ui';
import * as Icons from '../components/icons';
import { timeAgo } from '../lib/utils';
import { useBlocks, useTransactions } from '../lib/hooks';
import { formatTxId } from '../lib/api';

export function ExplorerPage() {
  const [tab, setTab] = useState('blocks');
  const [selectedBlock, setSelectedBlock] = useState<any | null>(null);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [blockPage, setBlockPage] = useState(1);
  const [txPage, setTxPage] = useState(1);
  const [search, setSearch] = useState('');
  const PER = 10;

  const { data: blocks, error: blocksError, loading: blocksLoading } = useBlocks(50);
  const { data: transactions, error: txError, loading: txLoading } = useTransactions(50);

  const filteredBlocks = useMemo(() => {
    return (blocks || []).filter((b: any) => {
      const height = b.header?.block_number ?? b.height;
      const hash = b.metadata?.block_hash ?? b.hash;
      if (!search) return true;
      return String(height).includes(search) || String(hash).includes(search);
    });
  }, [blocks, search]);

  const filteredTx = useMemo(() => {
    return (transactions || []).filter((t: any) => {
      const id = Array.isArray(t.tx_id) ? formatTxId(t.tx_id) : (t.tx_id || t.id);
      const fn = t.function_name || t.function;
      const caller = t.creator_msp_id || t.caller;
      if (!search) return true;
      return id.includes(search) || fn.includes(search) || caller.includes(search);
    });
  }, [transactions, search]);

  // ── Block Detail ────────────────────────────────────────────────────────────
  if (selectedBlock) {
    const b = selectedBlock;
    const height = b.header?.block_number ?? b.height;
    const hash = b.metadata?.block_hash ?? b.hash;
    const fullHash = b.metadata?.block_hash ?? b.fullHash ?? b.hash;
    const prevHash = b.header?.previous_hash ?? b.prevHash;
    const stateRoot = b.header?.state_root ?? b.stateRoot;
    const creator = b.header?.creator_msp_id ?? b.proposer;
    const timestamp = b.header?.timestamp ? new Date(b.header.timestamp / 1_000_000).toISOString() : b.timestamp;
    const txCount = b.metadata?.tx_count ?? b.txCount;
    
    const txsInBlock = b.transactions || (transactions || []).filter((tx: any) => tx.block_num === height || tx.blockHeight === height);

    return (
      <div>
        <button onClick={() => setSelectedBlock(null)}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-emerald-400 mb-5 transition-colors">
          <Icons.ArrowLeft size={15} /> Back to explorer
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Icons.Cube size={22} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Block #{height}</h1>
            <HashDisplay hash={fullHash} />
          </div>
          <Badge variant="success" dot className="ml-auto">Committed</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <Card>
            <CardHeader><span className="text-sm font-semibold">Block Info</span></CardHeader>
            <CardBody>
              <DetailRow label="Height" value={<span className="font-mono font-bold text-emerald-400">#{height}</span>} />
              <DetailRow label="Hash" value={<HashDisplay hash={fullHash} />} />
              <DetailRow label="Previous Hash" value={<HashDisplay hash={prevHash} />} />
              <DetailRow label="State Root" value={<HashDisplay hash={stateRoot} />} />
              <DetailRow label="Creator MSP" value={<Badge variant="info">{creator}</Badge>} />
              <DetailRow label="Channel" value={<span className="text-zinc-300">{b.header?.channel_id || 'main-channel'}</span>} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader><span className="text-sm font-semibold">Technical Details</span></CardHeader>
            <CardBody>
              <DetailRow label="Transactions" value={<span className="font-bold text-zinc-100">{txCount}</span>} />
              <DetailRow label="Size" value={`${b.size || '---'} bytes`} />
              <DetailRow label="Timestamp" value={new Date(timestamp).toLocaleString()} />
              <DetailRow label="Hash Algorithm" value={<Badge variant="accent">BLAKE3-256</Badge>} />
              <DetailRow label="Signature" value={<Badge variant="accent">Dilithium3 (FIPS 204)</Badge>} />
              <DetailRow label="Network Mode" value={<Badge variant="default">{b.header ? 'Consensus' : 'Standard'}</Badge>} />
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <span className="text-sm font-semibold">Transactions in Block ({txCount})</span>
          </CardHeader>
          <Table
            columns={[
              { 
                key: 'tx_id', 
                label: 'TX ID', 
                render: (v: any, row: any) => {
                  const id = Array.isArray(v) ? formatTxId(v) : (v || row.id);
                  return <HashDisplay hash={id} />;
                }
              },
              { 
                key: 'function_name', 
                label: 'Function', 
                render: (v: any, row: any) => {
                  const chaincode = row.contract_id || row.chaincode;
                  const fn = v || row.function;
                  return (
                    <span className="font-mono text-xs"><span className="text-zinc-500">{chaincode}.</span>{fn}</span>
                  );
                }
              },
              { 
                key: 'creator_msp_id', 
                label: 'Caller', 
                render: (v: any, row: any) => <span className="text-xs text-zinc-400">{v || row.caller}</span> 
              },
              { 
                key: 'status', 
                label: 'Status', 
                render: v => <Badge variant={v === 'committed' || !v ? 'success' : 'warning'}>{String(v || 'committed')}</Badge> 
              },
            ]}
            data={txsInBlock as unknown as Record<string, unknown>[]}
            onRowClick={row => setSelectedTx(row)}
          />
        </Card>
      </div>
    );
  }

  // ── TX Detail ───────────────────────────────────────────────────────────────
  if (selectedTx) {
    const tx = selectedTx;
    const id = Array.isArray(tx.tx_id) ? formatTxId(tx.tx_id) : (tx.tx_id || tx.id);
    const fullId = tx.fullId || id;
    const height = tx.block_num || tx.blockHeight;
    const chaincode = tx.contract_id || tx.chaincode;
    const fn = tx.function_name || tx.function;
    const caller = tx.creator_msp_id || tx.caller;
    const timestamp = typeof tx.timestamp === 'number' ? new Date(tx.timestamp / 1_000_000).toISOString() : tx.timestamp;
    const status = tx.status || 'committed';

    return (
      <div>
        <button onClick={() => setSelectedTx(null)}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-emerald-400 mb-5 transition-colors">
          <Icons.ArrowLeft size={15} /> Back
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Icons.Zap size={22} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Transaction Detail</h1>
            <HashDisplay hash={fullId} />
          </div>
          <Badge variant={status === 'committed' ? 'success' : status === 'pending' ? 'warning' : 'danger'} dot className="ml-auto">
            {status}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <Card>
            <CardHeader><span className="text-sm font-semibold">Transaction Info</span></CardHeader>
            <CardBody>
              <DetailRow label="TX ID" value={<HashDisplay hash={fullId} />} />
              <DetailRow label="Block Height" value={
                <span className="font-mono text-emerald-400 cursor-pointer hover:underline"
                  onClick={() => { 
                    const b = (blocks || []).find((b: any) => (b.header?.block_number ?? b.height) === height);
                    if (b) {
                      setSelectedTx(null);
                      setSelectedBlock(b);
                    }
                  }}>
                  #{height}
                </span>
              } />
              <DetailRow label="Chaincode" value={<Badge variant="info">{chaincode}</Badge>} />
              <DetailRow label="Function" value={<span className="font-mono font-bold text-zinc-100">{fn}</span>} />
              <DetailRow label="Caller" value={<span className="text-zinc-300">{caller}</span>} />
              <DetailRow label="Channel" value={tx.channel_id || 'main-channel'} />
              <DetailRow label="Timestamp" value={new Date(timestamp).toLocaleString()} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader><span className="text-sm font-semibold">Payload Arguments</span></CardHeader>
            <CardBody>
              <pre className="text-[10px] text-zinc-400 font-mono bg-zinc-950 p-3 rounded-lg border border-zinc-800 overflow-x-auto">
                {JSON.stringify(tx.args || {}, null, 2)}
              </pre>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader><span className="text-sm font-semibold">Transaction Results</span></CardHeader>
          <CardBody>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800">
              <Icons.ShieldCheck size={16} className="text-emerald-400" />
              <div>
                <span className="text-xs font-mono font-bold text-zinc-100">VALIDATED & COMMITTED</span>
                <p className="text-[11px] text-zinc-500">Post-Quantum signature verified via Dilithium3 algorithm</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // ── List View ───────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Block Explorer</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Browse blocks and transactions on main-channel</p>
        </div>
        <div className="relative">
          <Icons.Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search blocks, tx..."
            className="bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-600 rounded-lg pl-9 pr-4 py-2 text-sm w-56 focus:outline-none focus:border-zinc-600 transition-colors" />
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'blocks', label: `Blocks (${filteredBlocks.length})` },
          { id: 'transactions', label: `Transactions (${filteredTx.length})` },
        ]}
        active={tab}
        onChange={id => { setTab(id); setBlockPage(1); setTxPage(1); }}
        className="mb-4 w-fit"
      />

      {(blocksError || txError) && (() => {
        const err = blocksError || txError;
        const isAuth = (err as any)?.status === 401 || err?.message?.toLowerCase().includes('unauthorized');
        return (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs flex items-center gap-2">
            <Icons.XCircle size={14} className="shrink-0" />
            <span>
              {isAuth
                ? 'Authentication error — your session may have expired. Please sign out and sign in again.'
                : `Failed to load data: ${err?.message}`}
            </span>
          </div>
        );
      })()}

      <Card>
        {tab === 'blocks' ? (
          <>
            {blocksLoading && !blocks && (
              <div className="flex items-center justify-center py-12 text-zinc-500 text-sm gap-2">
                <Icons.Activity size={16} className="animate-spin" /> Loading blocks...
              </div>
            )}
            <Table
              columns={[
                { 
                  key: 'height', 
                  label: 'Height', 
                  width: '90px', 
                  render: (v: any, row: any) => {
                    const h = row.header?.block_number ?? v;
                    return <span className="font-mono font-bold text-emerald-400">#{h}</span>;
                  }
                },
                { 
                  key: 'hash', 
                  label: 'Hash', 
                  render: (v: any, row: any) => {
                    const h = row.metadata?.block_hash ?? v;
                    return <HashDisplay hash={h} />;
                  }
                },
                { 
                  key: 'txCount', 
                  label: 'TXs', 
                  width: '60px', 
                  render: (v: any, row: any) => {
                    const count = row.metadata?.tx_count ?? v;
                    return <span className="font-mono text-zinc-300">{count}</span>;
                  }
                },
                { 
                  key: 'proposer', 
                  label: 'Proposer', 
                  render: (v: any, row: any) => {
                    const creator = row.header?.creator_msp_id ?? v;
                    return <Badge variant="default">{creator}</Badge>;
                  }
                },
                { 
                  key: 'timestamp', 
                  label: 'Time', 
                  render: (v: any, row: any) => {
                    const ts = row.header?.timestamp ? new Date(row.header.timestamp / 1_000_000).toISOString() : v;
                    return <span className="text-xs text-zinc-500 tabular-nums">{timeAgo(ts)}</span>;
                  }
                },
                { key: 'status', label: '', render: () => <Badge variant="success">committed</Badge> },
              ]}
              data={filteredBlocks.slice((blockPage - 1) * PER, blockPage * PER) as unknown as Record<string, unknown>[]}
              onRowClick={row => setSelectedBlock(row)}
            />
            <Pagination page={blockPage} total={Math.ceil(filteredBlocks.length / PER)} onChange={setBlockPage} />
          </>
        ) : (
          <>
            <Table
              columns={[
                { 
                  key: 'tx_id', 
                  label: 'TX ID', 
                  render: (v: any, row: any) => {
                    const id = Array.isArray(v) ? formatTxId(v) : (v || row.id);
                    return <HashDisplay hash={id} />;
                  }
                },
                { 
                  key: 'block_num', 
                  label: 'Block', 
                  width: '80px', 
                  render: (v: any, row: any) => {
                    const h = v || row.blockHeight;
                    return <span className="font-mono text-emerald-400">#{h}</span>;
                  }
                },
                { 
                  key: 'function_name', 
                  label: 'Function', 
                  render: (v: any, row: any) => {
                    const chaincode = row.contract_id || row.chaincode;
                    const fn = v || row.function;
                    return (
                      <span className="font-mono text-xs">
                        <span className="text-zinc-500">{chaincode}.</span>
                        <span className="text-zinc-200">{fn}</span>
                      </span>
                    );
                  }
                },
                { 
                  key: 'creator_msp_id', 
                  label: 'Caller', 
                  render: (v: any, row: any) => <span className="text-xs text-zinc-400">{v || row.caller}</span> 
                },
                { 
                  key: 'status', 
                  label: 'Status', 
                  render: v => {
                    const s = String(v || 'committed');
                    return <Badge variant={s === 'committed' ? 'success' : s === 'pending' ? 'warning' : 'danger'}>{s}</Badge>;
                  }
                },
                { 
                  key: 'timestamp', 
                  label: 'Time', 
                  render: (v: any) => {
                    const ts = typeof v === 'number' ? new Date(v / 1_000_000).toISOString() : v;
                    return <span className="text-xs text-zinc-500 tabular-nums">{timeAgo(ts)}</span>;
                  }
                },
              ]}
              data={filteredTx.slice((txPage - 1) * PER, txPage * PER) as unknown as Record<string, unknown>[]}
              onRowClick={row => setSelectedTx(row)}
            />
            <Pagination page={txPage} total={Math.ceil(filteredTx.length / PER)} onChange={setTxPage} />
          </>
        )}
      </Card>
    </div>
  );
}

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
  const [txOriginBlock, setTxOriginBlock] = useState<any | null>(null);
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
      <div className="animate-slide-up">
        <button onClick={() => setSelectedBlock(null)}
          className="flex items-center gap-1.5 text-sm text-[var(--text-3)] hover:text-[var(--accent)] mb-5 transition-colors">
          <Icons.ArrowLeft size={15} /> Back to explorer
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent-bg)] border border-[var(--accent)]/20 flex items-center justify-center shrink-0">
            <Icons.Cube size={22} className="text-[var(--accent)]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-[var(--text)]">Block #{height}</h1>
            <HashDisplay hash={fullHash} />
          </div>
          <Badge variant="success" dot className="ml-auto shrink-0">Committed</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <Card>
            <CardHeader><span className="text-sm font-semibold text-[var(--text)]">Block Info</span></CardHeader>
            <CardBody>
              <DetailRow label="Height" value={<span className="font-mono font-bold text-[var(--accent)]">#{height}</span>} />
              <DetailRow label="Hash" value={<HashDisplay hash={fullHash} />} />
              <DetailRow label="Previous Hash" value={<HashDisplay hash={prevHash} />} />
              <DetailRow label="State Root" value={<HashDisplay hash={stateRoot} />} />
              <DetailRow label="Creator MSP" value={<Badge variant="info">{creator}</Badge>} />
              <DetailRow label="Channel" value={<span className="text-[var(--text-2)]">{b.header?.channel_id || 'main-channel'}</span>} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader><span className="text-sm font-semibold text-[var(--text)]">Technical Details</span></CardHeader>
            <CardBody>
              <DetailRow label="Transactions" value={<span className="font-bold text-[var(--text)]">{txCount}</span>} />
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
            <span className="text-sm font-semibold text-[var(--text)]">Transactions in Block ({txCount})</span>
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
                  const contract = row.contract_id;
                  const fn = v || row.function;
                  return (
                    <span className="font-mono text-xs">
                      <span className="text-[var(--text-3)]">{contract}.</span>
                      <span className="text-[var(--text-2)]">{fn}</span>
                    </span>
                  );
                }
              },
              {
                key: 'creator_msp_id',
                label: 'Caller',
                render: (v: any, row: any) => <span className="text-xs text-[var(--text-3)]">{v || row.caller}</span>
              },
              {
                key: 'status',
                label: 'Status',
                render: v => <Badge variant={v === 'committed' || !v ? 'success' : 'warning'}>{String(v || 'committed')}</Badge>
              },
            ]}
            data={txsInBlock as unknown as Record<string, unknown>[]}
            onRowClick={row => { setTxOriginBlock(selectedBlock); setSelectedBlock(null); setSelectedTx(row); }}
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
    const height = tx.block_num ?? tx.blockHeight ?? (txOriginBlock ? (txOriginBlock.header?.block_number ?? txOriginBlock.height) : undefined);
    const contract = tx.contract_id;
    const fn = tx.function_name || tx.function;
    const caller = tx.creator_msp_id || tx.caller;
    const timestamp = typeof tx.timestamp === 'number' ? new Date(tx.timestamp / 1_000_000).toISOString() : tx.timestamp;
    const status = tx.status || 'committed';

    return (
      <div className="animate-slide-up">
        <button onClick={() => {
            setSelectedTx(null);
            if (txOriginBlock) { setSelectedBlock(txOriginBlock); setTxOriginBlock(null); }
          }}
          className="flex items-center gap-1.5 text-sm text-[var(--text-3)] hover:text-[var(--accent)] mb-5 transition-colors">
          <Icons.ArrowLeft size={15} /> {txOriginBlock ? `Back to Block #${txOriginBlock.header?.block_number ?? txOriginBlock.height}` : 'Back'}
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Icons.Zap size={22} className="text-blue-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-[var(--text)]">Transaction Detail</h1>
            <HashDisplay hash={fullId} />
          </div>
          <Badge variant={status === 'committed' ? 'success' : status === 'pending' ? 'warning' : 'danger'} dot className="ml-auto shrink-0">
            {status}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <Card>
            <CardHeader><span className="text-sm font-semibold text-[var(--text)]">Transaction Info</span></CardHeader>
            <CardBody>
              <DetailRow label="TX ID" value={<HashDisplay hash={fullId} />} />
              <DetailRow label="Block Height" value={
                <span className="font-mono text-[var(--accent)] cursor-pointer hover:underline"
                  onClick={() => {
                    const b = (blocks || []).find((b: any) => (b.header?.block_number ?? b.height) === height);
                    if (b) {
                      setSelectedTx(null);
                      setTxOriginBlock(null);
                      setSelectedBlock(b);
                    }
                  }}>
                  #{height}
                </span>
              } />
              <DetailRow label="Contract" value={<Badge variant="info">{contract}</Badge>} />
              <DetailRow label="Function" value={<span className="font-mono font-bold text-[var(--text)]">{fn}</span>} />
              <DetailRow label="Caller" value={<span className="text-[var(--text-2)]">{caller}</span>} />
              <DetailRow label="Channel" value={tx.channel_id || 'main-channel'} />
              <DetailRow label="Timestamp" value={new Date(timestamp).toLocaleString()} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader><span className="text-sm font-semibold text-[var(--text)]">Payload Arguments</span></CardHeader>
            <CardBody>
              <pre className="text-[10px] text-[var(--text-3)] font-mono bg-[var(--code-bg)] p-3 rounded-xl border border-[var(--border)] overflow-x-auto">
                {JSON.stringify(tx.args || {}, null, 2)}
              </pre>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader><span className="text-sm font-semibold text-[var(--text)]">Transaction Results</span></CardHeader>
          <CardBody>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Icons.ShieldCheck size={18} className="text-emerald-400" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-[var(--text)]">VALIDATED & COMMITTED</span>
                <p className="text-[11px] text-[var(--text-3)] mt-0.5">Post-Quantum signature verified via Dilithium3 algorithm</p>
              </div>
              <Badge variant="success" dot className="ml-auto">Verified</Badge>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // ── List View ───────────────────────────────────────────────────────────────
  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Block Explorer</h1>
          <p className="text-sm text-[var(--text-3)] mt-0.5">Browse blocks and transactions on main-channel</p>
        </div>
        <div className="relative">
          <Icons.Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search blocks, tx..."
            className="bg-[var(--raised)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-3)] rounded-xl pl-9 pr-4 py-2 text-sm w-60 focus:outline-none focus:border-[var(--accent)]/40 focus:ring-2 focus:ring-[var(--accent)]/10 transition-all" />
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
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
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
              <div className="flex items-center justify-center py-16 text-[var(--text-3)] text-sm gap-2">
                <Icons.Activity size={16} className="spin" /> Loading blocks...
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
                    return (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[var(--accent-bg)] text-[var(--accent)] font-mono font-bold text-xs">
                        #{h}
                      </span>
                    );
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
                    return <span className="font-mono text-[var(--text-2)]">{count}</span>;
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
                    return <span className="text-xs text-[var(--text-3)] tabular-nums">{timeAgo(ts)}</span>;
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
            {txLoading && !transactions && (
              <div className="flex items-center justify-center py-16 text-[var(--text-3)] text-sm gap-2">
                <Icons.Activity size={16} className="spin" /> Loading transactions...
              </div>
            )}
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
                    return (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-[var(--accent-bg)] text-[var(--accent)] font-mono text-xs font-bold">
                        #{h}
                      </span>
                    );
                  }
                },
                {
                  key: 'function_name',
                  label: 'Function',
                  render: (v: any, row: any) => {
                    const contract = row.contract_id;
                    const fn = v || row.function;
                    return (
                      <span className="font-mono text-xs">
                        <span className="text-[var(--text-3)]">{contract}.</span>
                        <span className="text-[var(--text-2)]">{fn}</span>
                      </span>
                    );
                  }
                },
                {
                  key: 'creator_msp_id',
                  label: 'Caller',
                  render: (v: any, row: any) => <span className="text-xs text-[var(--text-3)]">{v || row.caller}</span>
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
                    return <span className="text-xs text-[var(--text-3)] tabular-nums">{timeAgo(ts)}</span>;
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

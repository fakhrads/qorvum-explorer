import React, { useState } from 'react';
import { Card, CardHeader, CardBody, Badge, Tabs, Button, Input, Select } from '../components/ui';
import * as Icons from '../components/icons';
import { useContracts } from '../lib/hooks';
import type { Contract } from '../lib/api';

// ─── Code templates ───────────────────────────────────────────────────────────

const BLANK_CODE = `use chain_sdk::{ChainContext, FieldValue};
use std::collections::HashMap;

pub fn dispatch(
    fn_name: &str,
    args: serde_json::Value,
    ctx: &dyn ChainContext,
) -> Result<serde_json::Value, String> {
    match fn_name {
        "create" => create(args, ctx),
        _ => Err(format!("Unknown function: {}", fn_name)),
    }
}

fn create(
    args: serde_json::Value,
    ctx: &dyn ChainContext,
) -> Result<serde_json::Value, String> {
    if !ctx.has_role("WRITER") {
        return Err("Requires WRITER role".into());
    }
    let id = args["id"].as_str().ok_or("missing id")?;
    let value = args["value"].as_str().ok_or("missing value")?;

    let mut fields = HashMap::new();
    fields.insert("value".into(), FieldValue::Text(value.into()));
    fields.insert(
        "created_by".into(),
        FieldValue::Text(ctx.caller_identity().subject.clone()),
    );

    let record = ctx.insert("my_collection", "default", id, fields)
        .map_err(|e| e.to_string())?;

    ctx.emit_event("CREATED", id.as_bytes());
    Ok(record)
}`;

const HR_CODE = `use chain_sdk::{ChainContext, FieldValue};
use serde::Deserialize;
use std::collections::HashMap;

const COLLECTION: &str = "employees";

#[derive(Deserialize)]
struct HireInput {
    id: String, name: String, department: String,
    position: String, salary: i64, join_date: String, email: String,
}

pub fn dispatch(fn_name: &str, args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    match fn_name {
        "hire_employee"       => hire(args, ctx),
        "get_employee"        => get(args, ctx),
        "update_salary"       => update_salary(args, ctx),
        "transfer_department" => transfer(args, ctx),
        "terminate_employee"  => terminate(args, ctx),
        other => Err(format!("Unknown function: {}", other)),
    }
}

fn hire(args: serde_json::Value, ctx: &dyn ChainContext)
    -> Result<serde_json::Value, String>
{
    let input: HireInput = serde_json::from_value(args)
        .map_err(|e| format!("Invalid args: {}", e))?;

    if !ctx.has_role("HR_MANAGER") && !ctx.has_role("HR_ADMIN") {
        return Err("Requires HR_MANAGER or HR_ADMIN role".into());
    }
    if input.salary < 3_000_000 {
        return Err("Salary below minimum wage".into());
    }

    let mut fields = HashMap::new();
    fields.insert("name".into(),       FieldValue::Text(input.name));
    fields.insert("department".into(), FieldValue::Text(input.department.clone()));
    fields.insert("position".into(),   FieldValue::Text(input.position));
    fields.insert("salary".into(),     FieldValue::Int(input.salary));
    fields.insert("status".into(),     FieldValue::Text("ACTIVE".into()));

    let record = ctx.insert(COLLECTION, &input.department, &input.id, fields)
        .map_err(|e| e.to_string())?;

    ctx.emit_event("EMPLOYEE_HIRED", input.id.as_bytes());
    Ok(record)
}`;

const TEMPLATES = [
  { id: 'blank', name: 'Blank Contract', desc: 'Start from scratch with minimal boilerplate', icon: Icons.FileCode, code: BLANK_CODE },
  { id: 'hr', name: 'HR Service', desc: 'Full employee management with CRUD operations', icon: Icons.Users, code: HR_CODE },
  { id: 'token', name: 'Token Contract', desc: 'Fungible token with mint/transfer/burn', icon: Icons.Zap, code: BLANK_CODE },
  { id: 'acl', name: 'Access Control', desc: 'Role-based access management system', icon: Icons.Shield, code: BLANK_CODE },
];

// ─── List view ────────────────────────────────────────────────────────────────

function ContractList({ onNew, onSelect }: {
  onNew: () => void;
  onSelect: (c: Contract) => void;
}) {
  const { data: contracts, loading } = useContracts();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Contracts</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Smart contracts deployed on the network</p>
        </div>
        <Button variant="default" size="sm" icon={<Icons.Plus size={13} />} onClick={onNew}>
          New Contract
        </Button>
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardBody>
                <div className="animate-pulse space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800" />
                    <div className="space-y-2 flex-1">
                      <div className="h-3.5 bg-zinc-800 rounded w-1/2" />
                      <div className="h-2.5 bg-zinc-800 rounded w-1/3" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-zinc-800">
                    <div className="h-5 bg-zinc-800 rounded-md w-20" />
                    <div className="h-5 bg-zinc-800 rounded-md w-24" />
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {!loading && contracts && contracts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {contracts.map(contract => (
            <ContractCard key={contract.id} contract={contract} onClick={() => onSelect(contract)} />
          ))}
        </div>
      )}

      {!loading && (!contracts || contracts.length === 0) && (
        <Card>
          <div className="flex flex-col items-center justify-center py-28 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Icons.FileCode size={28} className="text-zinc-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-zinc-300">No contracts deployed</p>
              <p className="text-xs text-zinc-600 mt-1">Deploy your first smart contract to get started</p>
            </div>
            <Button variant="default" size="sm" icon={<Icons.Plus size={13} />} onClick={onNew}>
              Deploy Contract
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function ContractCard({ contract, onClick }: { contract: Contract; onClick: () => void }) {
  const visible = contract.functions.slice(0, 4);
  const extra = contract.functions.length - visible.length;

  return (
    <Card hover onClick={onClick}>
      <CardBody>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Icons.FileCode size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-100 font-mono">{contract.id}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {contract.functions.length} function{contract.functions.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Badge variant={contract.kind === 'native' ? 'success' : 'info'}>{contract.kind}</Badge>
        </div>

        {contract.functions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-3 border-t border-zinc-800/60">
            {visible.map(fn => (
              <span key={fn} className="px-2 py-0.5 text-[10px] font-mono rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400">
                {fn}
              </span>
            ))}
            {extra > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-mono rounded-md bg-zinc-900 border border-zinc-800 text-zinc-600">
                +{extra} more
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-end mt-3">
          <span className="text-[11px] text-zinc-600 flex items-center gap-1">
            View details <Icons.ArrowRight size={11} />
          </span>
        </div>
      </CardBody>
    </Card>
  );
}

// ─── Detail view ──────────────────────────────────────────────────────────────

function ContractDetail({ contract, onBack }: { contract: Contract; onBack: () => void }) {
  const [tab, setTab] = useState('overview');
  const [inspectFn, setInspectFn] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button type="button" onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-200 transition-colors">
            <Icons.ChevronRight size={14} className="rotate-180" />
            Contracts
          </button>
          <div className="w-px h-4 bg-zinc-800" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Icons.FileCode size={15} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-100 font-mono">{contract.id}</h1>
              <p className="text-xs text-zinc-500">
                {contract.functions.length} functions · {contract.kind}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={contract.kind === 'native' ? 'success' : 'info'}>{contract.kind}</Badge>
          <Badge variant="success" dot>active</Badge>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'functions', label: `Functions (${contract.functions.length})` },
        ]}
        active={tab}
        onChange={setTab}
        className="mb-4"
      />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <Icons.Code size={14} className="text-emerald-400" />
              <span className="text-sm font-semibold">Exposed Functions</span>
            </CardHeader>
            {contract.functions.length > 0 ? (
              <div className="divide-y divide-zinc-800/50">
                {contract.functions.map((fn, i) => (
                  <div key={fn} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-zinc-600 font-mono w-5 text-right tabular-nums">{i + 1}</span>
                      <span className="text-sm font-mono text-zinc-200">{fn}</span>
                    </div>
                    <button type="button"
                      onClick={() => { setInspectFn(fn); setTab('functions'); }}
                      className="text-[11px] text-zinc-600 hover:text-emerald-400 transition-colors flex items-center gap-1">
                      Inspect <Icons.ArrowRight size={10} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <CardBody>
                <p className="text-sm text-zinc-500 text-center py-8">No functions registered.</p>
              </CardBody>
            )}
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <Icons.Activity size={14} className="text-emerald-400" />
                <span className="text-sm font-semibold">Info</span>
              </CardHeader>
              <CardBody className="space-y-3">
                {[
                  { label: 'Contract ID', value: <span className="font-mono">{contract.id}</span> },
                  { label: 'Runtime', value: contract.kind === 'native' ? 'Native Rust' : 'WASM' },
                  { label: 'Status', value: <Badge variant="success" dot>active</Badge> },
                  { label: 'Functions', value: String(contract.functions.length) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">{label}</span>
                    <span className="text-zinc-200 font-medium">{value}</span>
                  </div>
                ))}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <Icons.Terminal size={14} className="text-emerald-400" />
                <span className="text-sm font-semibold">Endpoints</span>
              </CardHeader>
              <CardBody className="space-y-2">
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-400 leading-relaxed">
                  <span className="text-blue-400">POST</span>{' '}
                  /api/v1/invoke/<span className="text-emerald-400">{contract.id}</span>/{'{'}<span className="text-zinc-300">fn</span>{'}'}
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-400 leading-relaxed">
                  <span className="text-emerald-400">GET</span>{' '}
                  /api/v1/query/<span className="text-emerald-400">{contract.id}</span>/{'{'}<span className="text-zinc-300">fn</span>{'}'}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {tab === 'functions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader>
              <span className="text-sm font-semibold">Functions</span>
            </CardHeader>
            {contract.functions.length > 0 ? (
              <div className="divide-y divide-zinc-800/50">
                {contract.functions.map(fn => (
                  <button key={fn} type="button" onClick={() => setInspectFn(fn)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors
                      ${inspectFn === fn ? 'bg-zinc-800' : 'hover:bg-zinc-800/40'}`}>
                    <Icons.Code size={13} className={inspectFn === fn ? 'text-emerald-400' : 'text-zinc-600'} />
                    <span className={`text-sm font-mono font-medium ${inspectFn === fn ? 'text-emerald-400' : 'text-zinc-200'}`}>
                      {fn}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <CardBody>
                <p className="text-xs text-zinc-500 text-center py-6">No functions found.</p>
              </CardBody>
            )}
          </Card>

          <Card className="lg:col-span-2">
            {inspectFn ? (
              <>
                <CardHeader>
                  <Icons.Code size={14} className="text-emerald-400" />
                  <span className="text-sm font-semibold font-mono">{inspectFn}()</span>
                  <Badge variant={contract.kind === 'native' ? 'success' : 'info'}>{contract.kind}</Badge>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                    <p className="text-[10px] font-semibold text-zinc-500 mb-3 uppercase tracking-wider">Invoke (state-changing)</p>
                    <p className="font-mono text-xs text-zinc-300">
                      <span className="text-blue-400">POST</span>{' '}
                      <span className="text-zinc-500">/api/v1/invoke/</span>
                      <span className="text-emerald-400">{contract.id}</span>
                      <span className="text-zinc-500">/</span>
                      <span className="text-zinc-100">{inspectFn}</span>
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                    <p className="text-[10px] font-semibold text-zinc-500 mb-3 uppercase tracking-wider">Query (read-only)</p>
                    <p className="font-mono text-xs text-zinc-300">
                      <span className="text-emerald-400">GET</span>{' '}
                      <span className="text-zinc-500">/api/v1/query/</span>
                      <span className="text-emerald-400">{contract.id}</span>
                      <span className="text-zinc-500">/</span>
                      <span className="text-zinc-100">{inspectFn}</span>
                    </p>
                  </div>
                  <p className="text-[11px] text-zinc-600 italic">
                    Detailed parameter schema (types, roles, returns) will be available once source introspection is added.
                  </p>
                </CardBody>
              </>
            ) : (
              <div className="flex flex-col items-center py-20">
                <Icons.Code size={28} className="text-zinc-700 mb-3" />
                <p className="text-sm text-zinc-500">Select a function to inspect</p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── New Contract view ────────────────────────────────────────────────────────

function NewContract({ onBack, onDeployed }: { onBack: () => void; onDeployed: () => void }) {
  const [tab, setTab] = useState('templates');
  const [code, setCode] = useState(BLANK_CODE);
  const [deployStep, setDeployStep] = useState(0);
  const [consoleLog, setConsoleLog] = useState<{ time: string; msg: string; type: string }[]>([]);

  const lineCount = code.split('\n').length;
  const addLog = (msg: string, type = 'info') =>
    setConsoleLog(prev => [...prev, { time: new Date().toISOString().slice(11, 23), msg, type }]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button type="button" onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-200 transition-colors">
            <Icons.ChevronRight size={14} className="rotate-180" />
            Contracts
          </button>
          <div className="w-px h-4 bg-zinc-800" />
          <div>
            <h1 className="text-lg font-bold text-zinc-100">New Contract</h1>
            <p className="text-xs text-zinc-500">Write, test, and deploy a smart contract</p>
          </div>
        </div>
        <Button variant="default" size="sm" icon={<Icons.Upload size={13} />} onClick={() => setTab('deploy')}>
          Deploy
        </Button>
      </div>

      <Tabs
        tabs={[
          { id: 'templates', label: 'Templates' },
          { id: 'editor', label: 'Code Editor' },
          { id: 'deploy', label: 'Deploy' },
        ]}
        active={tab}
        onChange={setTab}
        className="mb-4"
      />

      {/* ── Templates ── */}
      {tab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TEMPLATES.map(tmpl => {
            const Icon = tmpl.icon;
            return (
              <Card key={tmpl.id} hover onClick={() => { setCode(tmpl.code); setTab('editor'); }}>
                <CardBody className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Icon size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100 mb-1">{tmpl.name}</h3>
                    <p className="text-xs text-zinc-500 mb-3">{tmpl.desc}</p>
                    <Badge variant="accent">Use Template →</Badge>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Editor ── */}
      {tab === 'editor' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <Card>
              <CardHeader action={
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" icon={<Icons.Copy size={12} />}
                    onClick={() => navigator.clipboard.writeText(code).catch(() => {})}>Copy</Button>
                  <Button variant="ghost" size="sm" icon={<Icons.Download size={12} />}>Export</Button>
                </div>
              }>
                <Icons.FileCode size={15} className="text-emerald-400" />
                <span className="text-sm font-semibold">src/lib.rs</span>
                <Badge variant="accent">Rust</Badge>
              </CardHeader>
              <div className="relative font-mono text-xs">
                <div className="absolute left-0 top-0 bottom-0 w-10 bg-zinc-950 border-r border-zinc-800 flex flex-col items-end pr-2 pt-4 select-none overflow-hidden">
                  {Array.from({ length: lineCount }, (_, i) => (
                    <div key={i} className="leading-relaxed text-zinc-700 h-4.5 flex items-center text-[10px]">{i + 1}</div>
                  ))}
                </div>
                <textarea
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  spellCheck={false}
                  aria-label="Contract source code editor"
                  className="code-editor-textarea w-full bg-zinc-950/80 text-zinc-300 font-mono text-xs leading-relaxed p-4 pl-12 outline-none resize-none min-h-125"
                />
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader action={
                <button type="button" onClick={() => setConsoleLog([])}
                  className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
                  <Icons.Trash size={11} /> Clear
                </button>
              }>
                <Icons.Terminal size={14} className="text-emerald-400" />
                <span className="text-sm font-semibold">Console</span>
              </CardHeader>
              <div className="p-3 bg-zinc-950 min-h-30 max-h-44 overflow-y-auto font-mono text-xs space-y-1">
                {consoleLog.length === 0 && <p className="text-zinc-600">Ready.</p>}
                {consoleLog.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-zinc-600 shrink-0">[{l.time}]</span>
                    <span className={
                      l.type === 'error' ? 'text-red-400' :
                      l.type === 'success' ? 'text-emerald-400' : 'text-zinc-400'
                    }>{l.msg}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardBody className="space-y-2">
                <Button variant="default" className="w-full" icon={<Icons.Play size={13} />}
                  onClick={() => {
                    addLog('Compiling...');
                    setTimeout(() => addLog('cargo build: OK (2.1s)', 'success'), 1200);
                  }}>
                  Compile
                </Button>
                <Button variant="outline" className="w-full" icon={<Icons.Upload size={13} />}
                  onClick={() => setTab('deploy')}>
                  Deploy to Network
                </Button>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* ── Deploy ── */}
      {tab === 'deploy' && (
        <Card>
          <CardBody>
            <div className="max-w-lg mx-auto py-6">
              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-8">
                {['Configuration', 'Verification', 'Deploy'].map((s, i) => (
                  <React.Fragment key={i}>
                    <div className={`flex items-center gap-1.5 ${i <= deployStep ? 'text-emerald-400' : 'text-zinc-600'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border
                        ${i <= deployStep ? 'bg-emerald-600 text-white border-emerald-600' : 'border-zinc-700 text-zinc-600'}`}>
                        {i < deployStep ? '✓' : i + 1}
                      </div>
                      <span className="text-xs font-medium">{s}</span>
                    </div>
                    {i < 2 && <div className={`flex-1 h-px ${i < deployStep ? 'bg-emerald-600' : 'bg-zinc-800'}`} />}
                  </React.Fragment>
                ))}
              </div>

              {deployStep === 0 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Contract Name</label>
                    <Input placeholder="my-contract" className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Version</label>
                    <Input placeholder="1.0.0" className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Channel</label>
                    <Select options={['main-channel']} className="w-full" />
                  </div>
                  <Button variant="default" onClick={() => setDeployStep(1)} className="w-full">Next →</Button>
                </div>
              )}

              {deployStep === 1 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2.5">
                    {[
                      ['Contract', 'my-contract'],
                      ['Version', '1.0.0'],
                      ['Channel', 'main-channel'],
                      ['Runtime', 'Native Rust'],
                      ['Functions detected', String(code.match(/^fn \w+/gm)?.length ?? '?')],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs">
                        <span className="text-zinc-500">{k}</span>
                        <span className="text-zinc-200 font-medium font-mono">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setDeployStep(0)} className="flex-1">← Back</Button>
                    <Button variant="default" onClick={() => setDeployStep(2)} className="flex-1">Deploy Now</Button>
                  </div>
                </div>
              )}

              {deployStep === 2 && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-4">
                    <Icons.CheckCircle size={28} className="text-emerald-400" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-100 mb-1">Deployment Successful!</h3>
                  <p className="text-sm text-zinc-500 mb-5">Contract is now active on main-channel</p>
                  <Button variant="default" onClick={onDeployed}>Back to Contracts</Button>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

// ─── Page root ────────────────────────────────────────────────────────────────

type View = 'list' | 'detail' | 'new';

export function ContractsPage() {
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<Contract | null>(null);

  if (view === 'detail' && selected) {
    return <ContractDetail contract={selected} onBack={() => setView('list')} />;
  }
  if (view === 'new') {
    return <NewContract onBack={() => setView('list')} onDeployed={() => setView('list')} />;
  }
  return (
    <ContractList
      onNew={() => setView('new')}
      onSelect={(c) => { setSelected(c); setView('detail'); }}
    />
  );
}

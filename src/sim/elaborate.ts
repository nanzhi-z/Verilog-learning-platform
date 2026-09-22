/**
 * Elaboration: builds the instance tree, resolves parameters, aliases ports,
 * and creates simulation processes.
 */
import { Vec, X, Z } from './values';
import { Scheduler, SimError, Signal, Proc, EdgeKind } from './scheduler';
import {
  Instance, Ctx, evalExpr, rangeWidth, initialProc, edgeAlwaysProc, combAlwaysProc,
  delayAlwaysProc, contAssignProc,
} from './interpreter';
import type {
  ModuleDef, ModuleItem, InstanceDecl, Expr, Stmt, LValue, FunctionDecl, PortDecl, AssignStmt,
} from './ast';

interface ProcEntry {
  p: Proc;
  kind: 'comb' | 'edge' | 'initial';
}

function elabModuleDefPrepass(def: ModuleDef): {
  portDir: Map<string, 'input' | 'output' | 'inout'>;
  paramOrder: string[];
} {
  const portDir = new Map<string, 'input' | 'output' | 'inout'>();
  const paramOrder: string[] = [];
  for (const it of def.items) {
    if (it.kind === 'port') portDir.set(it.name, it.dir);
    if (it.kind === 'param' && !it.local) paramOrder.push(...it.names);
  }
  return { portDir, paramOrder };
}

const prepassCache = new WeakMap<ModuleDef, ReturnType<typeof elabModuleDefPrepass>>();
function prepass(def: ModuleDef) {
  let p = prepassCache.get(def);
  if (!p) {
    p = elabModuleDefPrepass(def);
    prepassCache.set(def, p);
  }
  return p;
}

/** resolve an expression to a constant number (params only reachable) */
function evalConstExpr(e: Expr, ctx: Ctx, what: string): number {
  const v = evalExpr(e, ctx);
  if (typeof v === 'string') throw new SimError(`${what} must be a constant number`, (e as { line?: number }).line);
  return v.requireNumber(what);
}

// ---------- sensitivity collection (resolves identifiers to signals) ----------

function sensExpr(e: Expr, inst: Instance, out: Set<Signal>): void {
  switch (e.kind) {
    case 'id': {
      if (inst.signals.has(e.name)) out.add(inst.signals.get(e.name)!);
      else if (inst.params.has(e.name) || inst.children.has(e.name) || inst.functions.has(e.name)) {
        /* not a signal — skip */
      } else {
        throw new SimError(`undeclared identifier '${e.name}'`, e.line);
      }
      break;
    }
    case 'hier': {
      let cur = inst;
      for (let i = 0; i < e.path.length - 1; i++) {
        const c = cur.children.get(e.path[i]);
        if (!c) throw new SimError(`no instance '${e.path[i]}' inside '${cur.path || cur.defName}'`, e.line);
        cur = c;
      }
      const sig = cur.signals.get(e.path[e.path.length - 1]);
      if (!sig) throw new SimError(`no signal '${e.path[e.path.length - 1]}' in '${cur.path || cur.defName}'`, e.line);
      out.add(sig);
      break;
    }
    case 'index': sensExpr(e.base, inst, out); sensExpr(e.index, inst, out); break;
    case 'part': sensExpr(e.base, inst, out); sensExpr(e.msb, inst, out); sensExpr(e.lsb, inst, out); break;
    case 'concat': e.parts.forEach((p) => sensExpr(p, inst, out)); break;
    case 'repl': sensExpr(e.count, inst, out); sensExpr(e.value, inst, out); break;
    case 'unary': sensExpr(e.operand, inst, out); break;
    case 'binary': sensExpr(e.left, inst, out); sensExpr(e.right, inst, out); break;
    case 'cond': sensExpr(e.cond, inst, out); sensExpr(e.then, inst, out); sensExpr(e.else, inst, out); break;
    case 'call': e.args.forEach((a) => sensExpr(a, inst, out)); break;
    default: break;
  }
}

function sensLValue(lv: LValue, inst: Instance, out: Set<Signal>): void {
  switch (lv.kind) {
    case 'lvid':
      if (inst.signals.has(lv.name)) out.add(inst.signals.get(lv.name)!);
      break; // undeclared LHS is caught at runtime with a clearer message
    case 'lvindex': sensLValue({ kind: 'lvid', line: lv.line, name: lv.name } as LValue, inst, out); sensExpr(lv.index, inst, out); break;
    case 'lvpart': {
      sensLValue({ kind: 'lvid', line: lv.line, name: lv.name } as LValue, inst, out);
      sensExpr(lv.msb, inst, out);
      sensExpr(lv.lsb, inst, out);
      break;
    }
    case 'lvconcat': lv.parts.forEach((p) => sensLValue(p, inst, out)); break;
  }
}

function sensStmt(s: Stmt, inst: Instance, out: Set<Signal>): void {
  switch (s.kind) {
    case 'block': s.stmts.forEach((x) => sensStmt(x, inst, out)); break;
    case 'if': sensExpr(s.cond, inst, out); sensStmt(s.then, inst, out); if (s.else) sensStmt(s.else, inst, out); break;
    case 'case':
      sensExpr(s.subject, inst, out);
      s.items.forEach((it) => { if (it.test) sensExpr(it.test, inst, out); sensStmt(it.body, inst, out); });
      break;
    case 'for':
      sensExpr(s.init.rhs, inst, out); sensLValue(s.init.lhs, inst, out);
      sensExpr(s.cond, inst, out);
      sensExpr(s.step.rhs, inst, out); sensLValue(s.step.lhs, inst, out);
      sensStmt(s.body, inst, out);
      break;
    case 'while': sensExpr(s.cond, inst, out); sensStmt(s.body, inst, out); break;
    case 'repeat': sensExpr(s.count, inst, out); sensStmt(s.body, inst, out); break;
    case 'forever': sensStmt(s.body, inst, out); break;
    case 'blocking': case 'nonblocking': sensLValue(s.lhs, inst, out); sensExpr(s.rhs, inst, out); break;
    case 'delay': sensExpr(s.amount, inst, out); if (s.body) sensStmt(s.body, inst, out); break;
    case 'eventwait': if (s.body) sensStmt(s.body, inst, out); break;
    case 'sys': s.args.forEach((a) => sensExpr(a, inst, out)); break;
    default: break;
  }
}

/** After a port is aliased to a parent signal, re-point every remaining
 *  reference to the old child signal inside the child's subtree —
 *  grandchildren connected to that port during the child's own elaboration
 *  still hold the original (now orphaned) signal object. */
function remapPort(node: Instance, from: Signal, to: Signal): void {
  for (const [k, sig] of node.signals) {
    if (sig === from) node.signals.set(k, to);
  }
  for (const c of node.children.values()) remapPort(c, from, to);
}

/** convert an expression used as an output port connection into an lvalue */
function exprToLValue(e: Expr, line: number): LValue {
  switch (e.kind) {
    case 'id':
      return { kind: 'lvid', line, name: e.name };
    case 'index':
      if (e.base.kind === 'id') return { kind: 'lvindex', line, name: e.base.name, index: e.index };
      break;
    case 'part':
      if (e.base.kind === 'id') return { kind: 'lvpart', line, name: e.base.name, msb: e.msb, lsb: e.lsb };
      break;
    case 'concat':
      return { kind: 'lvconcat', line, parts: e.parts.map((p) => exprToLValue(p, line)) };
    default:
      break;
  }
  throw new SimError(
    'this port connection expression cannot be driven — use a plain signal, bit select, part select or concatenation',
    line
  );
}

// ---------- instance building ----------

interface BuildResult {
  inst: Instance;
  regInits: { sig: Signal; expr: Expr; ctx: Ctx }[];
}

function buildInstance(
  def: ModuleDef,
  instName: string,
  path: string,
  overrides: Map<string, number>,
  scheduler: Scheduler,
  defs: Map<string, ModuleDef>
): BuildResult {
  const inst = new Instance();
  inst.name = instName;
  inst.defName = def.name;
  inst.path = path;
  inst.params = new Map(overrides);
  const regInits: BuildResult['regInits'] = [];
  const ctx: Ctx = { inst, scheduler };

  const mkSignal = (name: string, width: number, isReg: boolean): Signal => {
    const disp = path ? `${path}.${name}` : name;
    const s = new Signal(disp, name, width, isReg, isReg ? Vec.xes(width) : Vec.fill(width, Z));
    inst.signals.set(name, s);
    inst.order.push(name);
    return s;
  };

  // ---- pass A: parameters ----
  const declaredParams = new Set<string>();
  for (const it of def.items) {
    if (it.kind === 'param') {
      for (const nm of it.names) {
        if (declaredParams.has(nm)) {
          throw new SimError(`duplicate parameter '${nm}' in module ${def.name}`, it.line);
        }
        declaredParams.add(nm);
        if (!inst.params.has(nm)) {
          // not overridden by the instantiation — evaluate the default
          const v = evalConstExpr(it.init, ctx, `parameter '${nm}'`);
          inst.params.set(nm, v);
        }
      }
    }
  }

  // ---- pass B: ports and nets ----
  for (const it of def.items) {
    if (it.kind === 'port') {
      if (inst.signals.has(it.name)) {
        throw new SimError(`duplicate declaration of '${it.name}' in module ${def.name}`, it.line);
      }
      const w = rangeWidth(it.range, ctx);
      mkSignal(it.name, w, it.netType === 'reg');
    } else if (it.kind === 'net') {
      const w = rangeWidth(it.range, ctx);
      for (const nm of it.names) {
        if (inst.signals.has(nm)) {
          throw new SimError(`duplicate declaration of '${nm}' in module ${def.name}`, it.line);
        }
        const s = mkSignal(nm, w, it.netType === 'reg');
        if (it.netType === 'reg' && it.init) {
          regInits.push({ sig: s, expr: it.init, ctx });
        }
      }
    }
  }

  // ---- pass C: functions ----
  for (const it of def.items) {
    if (it.kind === 'function') {
      inst.functions.set(it.name, it as FunctionDecl);
    }
  }

  // ---- pass D: children ----
  for (const it of def.items) {
    if (it.kind !== 'instance') continue;
    const item = it as InstanceDecl;
    const childDef = defs.get(item.module);
    if (!childDef) {
      throw new SimError(`unknown module '${item.module}' (is it defined?)`, item.line);
    }
    const { paramOrder } = prepass(childDef);
    const childOverrides = new Map<string, number>();
    let posIdx = 0;
    for (const pa of item.params) {
      const v = evalConstExpr(pa.expr, ctx, 'parameter override');
      if (pa.name.startsWith('#')) {
        const idx = posIdx++;
        const nm = paramOrder[idx];
        if (!nm) throw new SimError(`module '${item.module}' has no parameter #${idx}`, item.line);
        childOverrides.set(nm, v);
      } else {
        if (!paramOrder.includes(pa.name)) {
          throw new SimError(`module '${item.module}' has no parameter '${pa.name}'`, item.line);
        }
        childOverrides.set(pa.name, v);
      }
    }
    const childPath = path ? `${path}.${item.name}` : item.name;
    const child = buildInstance(childDef, item.name, childPath, childOverrides, scheduler, defs);
    inst.children.set(item.name, child.inst);
    regInits.push(...child.regInits);
  }

  // ---- pass E: port connections (after children exist, before any processes) ----
  for (const it of def.items) {
    if (it.kind !== 'instance') continue;
    const item = it as InstanceDecl;
    const child = inst.children.get(item.name)!;
    const childDef = defs.get(item.module)!;
    const { portDir } = prepass(childDef);
    const portOrder = childDef.portOrder;
    const connected = new Set<string>();

    const connect = (portName: string, expr: Expr | null): void => {
      if (!portDir.has(portName)) {
        throw new SimError(`module '${item.module}' has no port '${portName}'`, item.line);
      }
      if (connected.has(portName)) {
        throw new SimError(`port '${portName}' connected twice on instance '${item.name}'`, item.line);
      }
      connected.add(portName);
      const childSig = child.signals.get(portName);
      if (!childSig) {
        throw new SimError(`port '${portName}' of module '${item.module}' is not declared inside the module`, item.line);
      }
      if (expr === null) return; // unconnected
      if (expr.kind === 'id') {
        const name = expr.name;
        if (inst.children.has(name)) {
          throw new SimError(`cannot connect instance '${name}' to a port`, item.line);
        }
        if (inst.functions.has(name)) {
          throw new SimError(`'${name}' is a function, not a signal`, item.line);
        }
        let target = inst.signals.get(name);
        if (!target && inst.params.has(name)) {
          // parameter as port connection → constant
          const s = new Signal(
            (path ? `${path}.` : '') + `${item.name}.${portName}`,
            `${item.name}.${portName}`,
            childSig.width,
            false,
            Vec.fromNumber(inst.params.get(name)!, childSig.width)
          );
          s.hidden = true;
          inst.signals.set(`${item.name}.${portName}`, s);
          target = s;
        }
        if (!target) {
          if (childSig.width !== 1) {
            throw new SimError(
              `'${name}' is not declared. Implicit nets are 1-bit wide, but port '${portName}' is ${childSig.width} bits wide — declare a wire`,
              item.line
            );
          }
          target = mkSignal(name, 1, false);
        }
        if (target.width !== childSig.width) {
          throw new SimError(
            `width mismatch: port '${portName}' of ${item.name} is ${childSig.width} bit(s), connected signal '${name}' is ${target.width} bit(s)`,
            item.line
          );
        }
        child.signals.set(portName, target);
        remapPort(child, childSig, target);
        const dir = portDir.get(portName)!;
        // propagate drive permissions through the alias chain: a parent-side net
        // must stay assignable when any downstream level drives it procedurally
        // (reg port) or continuously (assign-driven wire port).
        if (dir !== 'input' && !target.isReg && (childSig.isReg || childSig.allowProcedural)) {
          target.allowProcedural = true;
        }
        if (dir !== 'input' && target.isReg && (!childSig.isReg || childSig.allowContinuous)) {
          target.allowContinuous = true;
        }
      } else {
        // expression connection: constant, or built from parent signals/params
        const ids = new Set<string>();
        (function collect(e: Expr): void {
          switch (e.kind) {
            case 'id': ids.add(e.name); break;
            case 'index': collect(e.base); collect(e.index); break;
            case 'part': collect(e.base); collect(e.msb); collect(e.lsb); break;
            case 'concat': e.parts.forEach(collect); break;
            case 'repl': collect(e.count); collect(e.value); break;
            case 'unary': collect(e.operand); break;
            case 'binary': collect(e.left); collect(e.right); break;
            case 'cond': collect(e.cond); collect(e.then); collect(e.else); break;
            case 'call': e.args.forEach(collect); break;
            default: break;
          }
        })(expr);
        for (const n of ids) {
          if (inst.children.has(n) || inst.functions.has(n)) {
            throw new SimError(`'${n}' is not a signal or parameter`, item.line);
          }
          if (!inst.params.has(n) && !inst.signals.has(n)) {
            throw new SimError(`'${n}' is not declared in this module`, item.line);
          }
        }
        const allConst = [...ids].every((n) => inst.params.has(n));
        if (allConst) {
          const v = evalExpr(expr, ctx);
          if (typeof v === 'string') throw new SimError('string cannot be connected to a port', item.line);
          const s = new Signal(
            (path ? `${path}.` : '') + `${item.name}.${portName}`,
            `${item.name}.${portName}`,
            childSig.width,
            false,
            v.resize(childSig.width)
          );
          s.hidden = true;
          inst.signals.set(`${item.name}.${portName}`, s);
          child.signals.set(portName, s);
          remapPort(child, childSig, s);
        } else {
          // route through a hidden net: assign h = expr (input) / assign expr = h (output)
          const hname = `${item.name}.${portName}`;
          const h = new Signal(
            (path ? `${path}.` : '') + hname,
            hname,
            childSig.width,
            false,
            Vec.fill(childSig.width, Z)
          );
          h.hidden = true;
          inst.signals.set(hname, h);
          child.signals.set(portName, h);
          remapPort(child, childSig, h);
          const dir = portDir.get(portName)!;
          if (dir === 'input') {
            inst.extraAssigns.push({ line: item.line, lhs: { kind: 'lvid', line: item.line, name: hname }, rhs: expr });
          } else {
            inst.extraAssigns.push({
              line: item.line,
              lhs: exprToLValue(expr, item.line),
              rhs: { kind: 'id', line: item.line, name: hname },
            });
          }
        }
      }
    };

    for (const c of item.conns) {
      if (c.port.startsWith('#')) {
        const idx = parseInt(c.port.slice(1), 10);
        const nm = portOrder[idx];
        if (!nm) throw new SimError(`module '${item.module}' has no port #${idx}`, item.line);
        connect(nm, c.expr);
      } else {
        connect(c.port, c.expr);
      }
    }
  }

  return { inst, regInits };
}

// ---------- process creation (phase 2) ----------

function createProcs(
  inst: Instance,
  def: ModuleDef,
  scheduler: Scheduler,
  procs: ProcEntry[]
): void {
  const ctx: Ctx = { inst, scheduler };
  for (const it of def.items) {
    if (it.kind === 'assign') {
      // LHS names must be declared nets (or become implicit 1-bit wires)
      const ensureLhs = (lv: LValue): void => {
        if (lv.kind === 'lvconcat') { lv.parts.forEach(ensureLhs); return; }
        const name = lv.name;
        if (!inst.signals.has(name)) {
          if (inst.children.has(name) || inst.functions.has(name)) {
            throw new SimError(`cannot assign to '${name}' — not a signal`, lv.line);
          }
          const s = new Signal(
            (inst.path ? `${inst.path}.` : '') + name,
            name,
            1,
            false,
            Vec.fill(1, Z)
          );
          inst.signals.set(name, s);
          inst.order.push(name);
        }
        const sig = inst.signals.get(name)!;
        if (sig.isReg && !sig.allowContinuous) {
          throw new SimError(
            `'assign' drives reg '${name}' — continuous assignment targets wires; use an always block`,
            lv.line
          );
        }
      };
      ensureLhs(it.lhs);
      const sens = new Set<Signal>();
      sensExpr(it.rhs, inst, sens);
      const sensArr = [...sens].map((sig) => ({ sig, edge: 'any' as EdgeKind }));
      const p = new Proc(contAssignProc(it, sensArr, ctx), `assign`);
      procs.push({ p, kind: 'comb' });
    } else if (it.kind === 'always') {
      if (it.delayAmount) {
        const p = new Proc(delayAlwaysProc(it, ctx), `always #`);
        procs.push({ p, kind: 'comb' }); // seeded: starts by waiting the delay
      } else if (it.trig === 'comb') {
        const sens = new Set<Signal>();
        sensStmt(it.body, inst, sens);
        const sensArr = [...sens].map((sig) => ({ sig, edge: 'any' as EdgeKind }));
        const p = new Proc(combAlwaysProc(it, sensArr, ctx), `always @(*)`);
        procs.push({ p, kind: 'comb' });
      } else {
        const edges = it.edges.map((ed) => {
          const sig = inst.signals.get(ed.sig);
          if (!sig) throw new SimError(`undeclared signal '${ed.sig}' in sensitivity list`, it.line);
          return { sig, edge: (ed.edge === 'level' ? 'any' : ed.edge) as EdgeKind };
        });
        const p = new Proc(edgeAlwaysProc(it, edges, ctx), `always @(edge)`);
        procs.push({ p, kind: 'edge' });
      }
    } else if (it.kind === 'initial') {
      const p = new Proc(initialProc(it, ctx), `initial`);
      procs.push({ p, kind: 'initial' });
    }
  }
  // synthetic assigns created by expression port connections
  for (const ea of inst.extraAssigns) {
    const sens = new Set<Signal>();
    sensExpr(ea.rhs, inst, sens);
    const sensArr = [...sens].map((sig) => ({ sig, edge: 'any' as EdgeKind }));
    const stmt: AssignStmt = { kind: 'assign', line: ea.line, lhs: ea.lhs, rhs: ea.rhs };
    const p = new Proc(contAssignProc(stmt, sensArr, ctx), `port`);
    procs.push({ p, kind: 'comb' });
  }
}

function walkTree(inst: Instance, fn: (inst: Instance) => void): void {
  fn(inst);
  for (const child of inst.children.values()) walkTree(child, fn);
}

// ---------- top-level elaborate ----------

export interface ElabResult {
  top: Instance;
  scheduler: Scheduler;
}

export function elaborate(
  defs: ModuleDef[],
  topName?: string
): ElabResult {
  const scheduler = new Scheduler();
  const registry = new Map<string, ModuleDef>();
  for (const d of defs) {
    if (registry.has(d.name)) {
      throw new SimError(`module '${d.name}' defined more than once`, d.line);
    }
    registry.set(d.name, d);
  }

  let topDef: ModuleDef | undefined;
  if (topName) {
    topDef = registry.get(topName);
    if (!topDef) throw new SimError(`module '${topName}' not found`);
  } else {
    const instantiated = new Set<string>();
    for (const d of defs) {
      for (const it of d.items) {
        if (it.kind === 'instance') instantiated.add(it.module);
      }
    }
    const cands = defs.filter((d) => !instantiated.has(d.name));
    if (cands.length === 0) {
      throw new SimError('no top module found — every module is instantiated; add a testbench module');
    }
    if (cands.length > 1) {
      throw new SimError(
        `multiple top-level modules: ${cands.map((c) => c.name).join(', ')} — pass one explicitly or remove the extra`
      );
    }
    topDef = cands[0];
  }

  const built = buildInstance(topDef, topDef.name, '', new Map(), scheduler, registry);

  // phase 2: create processes top-down
  const procEntries: ProcEntry[] = [];
  const defOf = new Map<Instance, ModuleDef>();
  walkTree(built.inst, (ins) => {
    const def = registry.get(ins.defName)!;
    defOf.set(ins, def);
  });
  walkTree(built.inst, (ins) => {
    createProcs(ins, defOf.get(ins)!, scheduler, procEntries);
  });

  // phase 3: seed
  // 1) reg initial values
  for (const ri of built.regInits) {
    const v = evalExpr(ri.expr, ri.ctx);
    if (typeof v !== 'string') scheduler.setSignal(ri.sig, v.resize(ri.sig.width));
  }
  // 2) comb procs, then edge procs, then initial procs
  for (const e of procEntries) if (e.kind === 'comb') scheduler.addProc(e.p);
  for (const e of procEntries) if (e.kind === 'edge') scheduler.addProc(e.p);
  for (const e of procEntries) if (e.kind === 'initial') scheduler.addProc(e.p);

  return { top: built.inst, scheduler };
}

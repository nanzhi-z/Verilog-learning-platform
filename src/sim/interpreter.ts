/**
 * Interpreter: expression evaluation and statement execution.
 * Statements run inside generator coroutines; timing controls yield to the scheduler.
 */
import {
  Vec, X, Z, timeVec,
} from './values';
import {
  SimError, FinishSim, Scheduler, Signal, Proc, YieldCond, EdgeKind, ProcGen,
} from './scheduler';
import type {
  Expr, Stmt, LValue, Range, FunctionDecl, AlwaysBlock, InitialBlock, AssignStmt,
} from './ast';

// ---------- scope objects (defined here to avoid circular imports with elaborate) ----------

export interface FrameLocal {
  width: number;
  value: Vec;
}

export class Instance {
  name!: string; // instance name (path base)
  defName!: string;
  path!: string; // hierarchical path ('' for top)
  params = new Map<string, number>();
  signals = new Map<string, Signal>();
  children = new Map<string, Instance>();
  functions = new Map<string, FunctionDecl>();
  order: string[] = []; // declaration order of signal names (waveform order)
  /** synthetic continuous assignments created for expression port connections */
  extraAssigns: { line: number; lhs: LValue; rhs: Expr }[] = [];
}

export interface Ctx {
  inst: Instance;
  scheduler: Scheduler;
  frame?: Map<string, FrameLocal>;
  inFunction?: boolean;
}

export function rangeWidth(range: Range, ctx: Ctx): number {
  if (!range) return 1;
  const msb = evalConst(range.msb, ctx);
  const lsb = evalConst(range.lsb, ctx);
  return Math.abs(msb - lsb) + 1;
}

/** evaluate a constant expression (params only) to a number */
function evalConst(e: Expr, ctx: Ctx): number {
  const v = evalExpr(e, ctx);
  if (typeof v === 'string') throw new SimError('string is not a constant expression', (e as { line?: number }).line);
  return v.requireNumber('constant');
}

function expectVec(v: Vec | string, line: number | undefined, what: string): Vec {
  if (typeof v === 'string') {
    throw new SimError(`${what}: a string literal cannot be used here`, line);
  }
  return v;
}

// ---------- identifier / scope resolution ----------

export function lookupSignal(inst: Instance, name: string): Signal | undefined {
  const s = inst.signals.get(name);
  if (s) return s;
  // search parent chain only for the module's own scope: no — Verilog is not lexically nested.
  return undefined;
}

function resolveName(
  ctx: Ctx,
  name: string,
  line?: number
):
  | { kind: 'local'; local: FrameLocal }
  | { kind: 'param'; value: number }
  | { kind: 'signal'; sig: Signal }
  | { kind: 'instance'; inst: Instance }
  | { kind: 'notfound' }
{
  if (ctx.frame?.has(name)) return { kind: 'local', local: ctx.frame.get(name)! };
  if (ctx.inst.params.has(name)) return { kind: 'param', value: ctx.inst.params.get(name)! };
  const sig = ctx.inst.signals.get(name);
  if (sig) return { kind: 'signal', sig };
  const child = ctx.inst.children.get(name);
  if (child) return { kind: 'instance', inst: child };
  return { kind: 'notfound' };
}

function errNotFound(ctx: Ctx, name: string, line?: number): never {
  const inFn = ctx.inFunction ? ' (function arguments and locals must be declared before use)' : '';
  throw new SimError(`undeclared identifier '${name}'${inFn}`, line);
}

// ---------- lvalue resolution ----------

interface LTarget {
  // simple signal (with optional slice)
  kind: 'sig';
  sig: Signal;
  hi?: number;
  lo?: number;
  idx?: number;
  dead?: boolean; // out-of-range select: writes are ignored
}

interface LTargetLocal {
  kind: 'local';
  local: FrameLocal;
  name: string;
  hi?: number;
  lo?: number;
  idx?: number;
  dead?: boolean;
}

type ResolvedLValue = { kind: 'one'; t: LTarget | LTargetLocal } | { kind: 'concat'; parts: (LTarget | LTargetLocal)[] };

function resolveLValue(lv: LValue, ctx: Ctx): ResolvedLValue {
  const r = (l: LValue): LTarget | LTargetLocal => {
    switch (l.kind) {
      case 'lvid': {
        const res = resolveName(ctx, l.name, l.line);
        if (res.kind === 'notfound') errNotFound(ctx, l.name, l.line);
        if (res.kind === 'local') return { kind: 'local', local: res.local, name: l.name };
        if (res.kind === 'signal') return { kind: 'sig', sig: res.sig };
        throw new SimError(`cannot assign to '${l.name}' — not a variable or signal`, l.line);
      }
      case 'lvindex':
      case 'lvpart': {
        const res = resolveName(ctx, l.name, l.line);
        if (res.kind === 'local') {
          const w = res.local.width;
          if (l.kind === 'lvindex') {
            const idx = evalConst(l.index, ctx);
            if (idx < 0 || idx >= w) return { kind: 'local', local: res.local, name: l.name, dead: true };
            return { kind: 'local', local: res.local, name: l.name, idx };
          }
          let hi = evalConst(l.msb, ctx);
          let lo = evalConst(l.lsb, ctx);
          if (hi < lo) [hi, lo] = [lo, hi];
          return { kind: 'local', local: res.local, name: l.name, hi, lo };
        }
        if (res.kind === 'signal') {
          const sig = res.sig;
          if (l.kind === 'lvindex') {
            const idx = evalConst(l.index, ctx);
            if (idx < 0 || idx >= sig.width) return { kind: 'sig', sig, dead: true };
            return { kind: 'sig', sig, idx };
          }
          let hi = evalConst(l.msb, ctx);
          let lo = evalConst(l.lsb, ctx);
          if (hi < lo) [hi, lo] = [lo, hi];
          return { kind: 'sig', sig, hi, lo };
        }
        if (res.kind === 'notfound') errNotFound(ctx, l.name, l.line);
        throw new SimError(`cannot assign to '${l.name}'`, l.line);
      }
      case 'lvconcat':
        throw new SimError('nested concatenation in assignment target is not supported', l.line);
    }
  };

  if (lv.kind === 'lvconcat') {
    return { kind: 'concat', parts: lv.parts.map((p) => r(p)) };
  }
  return { kind: 'one', t: r(lv) };
}

function pieceWidth(t: LTarget | LTargetLocal): number {
  if (t.dead) return 0;
  if (t.kind === 'sig') {
    if (t.idx !== undefined) return 1;
    if (t.hi !== undefined && t.lo !== undefined) return t.hi - t.lo + 1;
    return t.sig.width;
  }
  if (t.idx !== undefined) return 1;
  if (t.hi !== undefined && t.lo !== undefined) return t.hi - t.lo + 1;
  return t.local.width;
}

function applyPiece(t: LTarget | LTargetLocal, v: Vec, continuous: boolean, ctx: Ctx): void {
  if (t.dead) return;
  const val = v.resize(pieceWidth(t));
  if (t.kind === 'local') {
    let nv = t.local.value;
    if (t.idx !== undefined) nv = nv.withBit(t.idx, val.bits[0] ?? X);
    else if (t.hi !== undefined && t.lo !== undefined) nv = nv.withSlice(t.hi, t.lo, val);
    else nv = val;
    t.local.value = nv;
    return;
  }
  const sig = t.sig;
  if (!continuous && !sig.isReg && !sig.allowProcedural) {
    throw new SimError(
      `cannot make procedural assignment to wire '${sig.name}' — declare it as reg, or use 'assign'`,
      undefined
    );
  }
  if (continuous && sig.isReg && !sig.allowContinuous) {
    throw new SimError(
      `'assign' drives reg '${sig.name}' — continuous assignment targets wires; use an always block`,
      undefined
    );
  }
  let nv = sig.value;
  if (t.idx !== undefined) nv = nv.withBit(t.idx, val.bits[0] ?? X);
  else if (t.hi !== undefined && t.lo !== undefined) nv = nv.withSlice(t.hi, t.lo, val);
  else nv = val;
  ctx.scheduler.setSignal(sig, nv);
}

/** procedural blocking assignment */
function assignBlocking(lv: LValue, val: Vec, ctx: Ctx): void {
  const res = resolveLValue(lv, ctx);
  if (res.kind === 'one') {
    applyPiece(res.t, val, false, ctx);
  } else {
    const total = res.parts.reduce((a, p) => a + pieceWidth(p), 0);
    const v = val.resize(total);
    let off = 0;
    // first part is MSB; apply LSB-first offsets from the end
    for (let k = res.parts.length - 1; k >= 0; k--) {
      const w = pieceWidth(res.parts[k]);
      applyPiece(res.parts[k], v.slice(off + w - 1, off), false, ctx);
      off += w;
    }
  }
}

/** continuous assignment (assign) — nets only */
function assignContinuous(lv: LValue, val: Vec, ctx: Ctx): void {
  const res = resolveLValue(lv, ctx);
  if (res.kind === 'one') {
    if (res.t.kind === 'local') throw new SimError('cannot continuously assign a function local');
    applyPiece(res.t, val, true, ctx);
  } else {
    const total = res.parts.reduce((a, p) => a + pieceWidth(p), 0);
    const v = val.resize(total);
    let off = 0;
    for (let k = res.parts.length - 1; k >= 0; k--) {
      const w = pieceWidth(res.parts[k]);
      if (res.parts[k].kind === 'local') throw new SimError('cannot continuously assign a function local');
      applyPiece(res.parts[k], v.slice(off + w - 1, off), true, ctx);
      off += w;
    }
  }
}

// ---------- expression evaluation ----------

export function evalExpr(e: Expr, ctx: Ctx): Vec | string {
  switch (e.kind) {
    case 'num': {
      if (e.width !== null) {
        return Vec.parseBits(e.digits, e.base, e.width);
      }
      if (e.base === 10) {
        return Vec.fromNumber(parseInt(e.digits.replace(/_/g, ''), 10), 32);
      }
      const bitsPer = e.base === 2 ? 1 : e.base === 8 ? 3 : 4;
      const w = Math.max(1, e.digits.replace(/_/g, '').length * bitsPer);
      return Vec.parseBits(e.digits, e.base, w);
    }
    case 'str':
      return e.value;
    case 'id': {
      const res = resolveName(ctx, e.name, e.line);
      if (res.kind === 'notfound') errNotFound(ctx, e.name, e.line);
      if (res.kind === 'param') return Vec.fromNumber(res.value, 32);
      if (res.kind === 'signal') return res.sig.value;
      if (res.kind === 'local') return res.local.value;
      throw new SimError(`'${e.name}' is a module instance — use a hierarchical path like ${e.name}.signal`, e.line);
    }
    case 'hier': {
      let cur = ctx.inst;
      for (let i = 0; i < e.path.length - 1; i++) {
        const seg = e.path[i];
        const child = cur.children.get(seg);
        if (!child) throw new SimError(`no instance '${seg}' inside '${cur.path || cur.defName}'`, e.line);
        cur = child;
      }
      const last = e.path[e.path.length - 1];
      const sig = cur.signals.get(last);
      if (!sig) throw new SimError(`no signal '${last}' in instance '${cur.path || cur.defName}'`, e.line);
      return sig.value;
    }
    case 'index': {
      const base = expectVec(evalExpr(e.base, ctx), e.line, 'bit-select');
      const idx = expectVec(evalExpr(e.index, ctx), e.line, 'bit-select index').requireNumber('index');
      return new Vec([base.bit(idx)]);
    }
    case 'part': {
      const base = expectVec(evalExpr(e.base, ctx), e.line, 'part-select');
      let hi = evalConst(e.msb, ctx);
      let lo = evalConst(e.lsb, ctx);
      if (hi < lo) [hi, lo] = [lo, hi];
      return base.slice(hi, lo);
    }
    case 'concat': {
      const parts = e.parts.map((p) => expectVec(evalExpr(p, ctx), e.line, 'concatenation'));
      if (!parts.length) throw new SimError('empty concatenation {}', e.line);
      return Vec.concat(parts);
    }
    case 'repl': {
      const n = evalConst(e.count, ctx);
      if (n < 0) throw new SimError('replication count cannot be negative', e.line);
      if (n > 65536) throw new SimError('replication count too large', e.line);
      const v = expectVec(evalExpr(e.value, ctx), e.line, 'replication');
      if (n === 0) return new Vec([]);
      return Vec.concat(new Array(n).fill(v));
    }
    case 'unary': {
      const op = e.op;
      const line = e.line;
      const v = expectVec(evalExpr(e.operand, ctx), e.line, `unary '${e.op}'`);
      switch (op) {
        case '+': return v;
        case '-': return Vec.zero(Math.max(v.width, 1)).sub(v);
        case '~': return v.not();
        case '!': return v.logicalNot();
        case '&': return v.reduce('&');
        case '~&': return v.reduce('~&');
        case '|': return v.reduce('|');
        case '~|': return v.reduce('~|');
        case '^': return v.reduce('^');
        case '~^': case '^~': return v.reduce('~^');
      }
      throw new SimError(`unsupported unary operator '${op}'`, line);
    }
    case 'binary': {
      const l = expectVec(evalExpr(e.left, ctx), e.line, `'${e.op}'`);
      const r = expectVec(evalExpr(e.right, ctx), e.line, `'${e.op}'`);
      switch (e.op) {
        case '+': return l.add(r);
        case '-': return l.sub(r);
        case '*': return l.mul(r);
        case '/': return l.div(r);
        case '%': return l.mod(r);
        case '**': return l.pow(r);
        case '&': return l.and(r);
        case '|': return l.or(r);
        case '^': return l.xor(r);
        case '&&': {
          if (l.isFalse() || r.isFalse()) return new Vec([0]);
          if (l.toBool() === X || r.toBool() === X) return new Vec([X]);
          return new Vec([1]);
        }
        case '||': {
          if (l.toBool() === 1 || r.toBool() === 1) return new Vec([1]);
          if (l.toBool() === X || r.toBool() === X) return new Vec([X]);
          return new Vec([0]);
        }
        case '==': return l.eq(r);
        case '!=': return l.ne(r);
        case '===': return l.caseEq(r);
        case '!==': return l.caseNe(r);
        case '<': return l.lt(r);
        case '<=': return l.le(r);
        case '>': return l.gt(r);
        case '>=': return l.ge(r);
        case '<<': case '<<<': return l.shiftLeft(r);
        case '>>': return l.shiftRight(r);
        case '>>>': return l.arithShiftRight(r);
      }
      throw new SimError(`unsupported operator '${e.op}'`, e.line);
    }
    case 'cond': {
      const c = expectVec(evalExpr(e.cond, ctx), e.line, 'conditional');
      const b = c.toBool();
      if (b === 1) return expectVec(evalExpr(e.then, ctx), e.line, 'conditional');
      if (b === 0) return expectVec(evalExpr(e.else, ctx), e.line, 'conditional');
      const tv = expectVec(evalExpr(e.then, ctx), e.line, 'conditional');
      const ev = expectVec(evalExpr(e.else, ctx), e.line, 'conditional');
      return Vec.xes(Math.max(tv.width, ev.width));
    }
    case 'call': {
      if (e.name === '$time') return timeVec(ctx.scheduler.now);
      if (e.name === '$random') {
        // deterministic pseudo-random, 32-bit
        const s = (ctx.scheduler.now * 2654435761 + ctx.inst.signals.size * 40503) >>> 0;
        return Vec.fromNumber(s, 32);
      }
      const fd = ctx.inst.functions.get(e.name);
      if (!fd) {
        throw new SimError(`unknown function or system task '${e.name}'`, e.line);
      }
      const args = e.args.map((a) => expectVec(evalExpr(a, ctx), e.line, `argument of ${e.name}`));
      return callUserFunction(fd, args, ctx, e.line);
    }
  }
}

// ---------- function calls ----------

export function callUserFunction(fd: FunctionDecl, args: Vec[], ctx: Ctx, line?: number): Vec {
  if (args.length !== fd.ports.length) {
    throw new SimError(
      `function '${fd.name}' expects ${fd.ports.length} argument(s), got ${args.length}`,
      line ?? fd.line
    );
  }
  const retW = rangeWidth(fd.range, ctx);
  const frame = new Map<string, FrameLocal>();
  frame.set(fd.name, { width: retW, value: Vec.xes(retW) });
  fd.ports.forEach((p, i) => {
    const w = rangeWidth(p.range, ctx);
    frame.set(p.name, { width: w, value: args[i].resize(w) });
  });
  // local declarations (old-style functions)
  for (const d of fd.decls) {
    if (d.kind === 'net') {
      const w = rangeWidth(d.range, ctx);
      for (const nm of d.names) frame.set(nm, { width: w, value: Vec.xes(w) });
    } else if (d.kind === 'param') {
      for (const nm of d.names) {
        const v = evalConst(d.init, { ...ctx, frame });
        frame.set(nm, { width: 32, value: Vec.fromNumber(v, 32) });
      }
    } else if (d.kind === 'port') {
      const w = rangeWidth(d.range, ctx);
      frame.set(d.name, { width: w, value: Vec.xes(w) });
    }
  }
  const fnCtx: Ctx = { inst: ctx.inst, scheduler: ctx.scheduler, frame, inFunction: true };
  const g = execStmt(fd.body, fnCtx);
  const r = g.next();
  if (!r.done) {
    throw new SimError(
      `timing control (# or @) is not allowed inside function '${fd.name}'`,
      fd.line
    );
  }
  return frame.get(fd.name)!.value;
}

// ---------- $display formatting ----------

function unescapeLiteral(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && i + 1 < s.length) {
      const c = s[i + 1];
      if (c === 'n') { out += '\n'; i++; continue; }
      if (c === 't') { out += '\t'; i++; continue; }
      if (c === '\\') { out += '\\'; i++; continue; }
      if (c === '"') { out += '"'; i++; continue; }
    }
    out += s[i];
  }
  return out;
}

export function formatDisplay(fmt: string, args: (Vec | string)[], now: number): string {
  let out = '';
  let ai = 0;
  const s = unescapeLiteral(fmt);
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== '%') {
      out += s[i];
      continue;
    }
    // parse % [0-9]* spec
    let j = i + 1;
    while (j < s.length && /[0-9]/.test(s[j])) j++;
    if (j >= s.length) { out += '%'; break; }
    const spec = s[j];
    i = j;
    switch (spec) {
      case '%': out += '%'; break;
      case 'b': case 'd': case 'h': case 'o': {
        const a = args[ai++];
        if (a === undefined) break;
        const v = typeof a === 'string' ? Vec.zero(8 * a.length) : a;
        out += v.format(spec);
        break;
      }
      case 's': {
        const a = args[ai++];
        if (a === undefined) break;
        out += typeof a === 'string' ? a : a.format('b');
        break;
      }
      case 't': {
        out += String(now);
        break;
      }
      default:
        out += '%' + spec;
        break;
    }
  }
  return out;
}

// ---------- statement execution ----------

export function* execStmt(s: Stmt, ctx: Ctx): Generator<YieldCond, void, unknown> {
  ctx.scheduler.tick((s as { line?: number }).line);
  switch (s.kind) {
    case 'block':
      for (const st of s.stmts) yield* execStmt(st, ctx);
      return;

    case 'if': {
      const c = expectVec(evalExpr(s.cond, ctx), s.line, 'if condition');
      const b = c.toBool();
      if (b === 1) yield* execStmt(s.then, ctx);
      else if (b === 0) { if (s.else) yield* execStmt(s.else, ctx); }
      return;
    }

    case 'case': {
      const subj = expectVec(evalExpr(s.subject, ctx), s.line, 'case expression');
      for (const item of s.items) {
        if (item.test === null) {
          yield* execStmt(item.body, ctx);
          return;
        }
        const tv = expectVec(evalExpr(item.test, ctx), s.line, 'case item');
        if (subj.caseEq(tv).toBool() === 1) {
          yield* execStmt(item.body, ctx);
          return;
        }
      }
      return;
    }

    case 'for': {
      assignBlockingFor(s.init, ctx);
      for (;;) {
        ctx.scheduler.tick(s.line);
        const c = expectVec(evalExpr(s.cond, ctx), s.line, 'for condition');
        if (c.toBool() !== 1) break;
        yield* execStmt(s.body, ctx);
        assignBlockingFor(s.step, ctx);
      }
      return;
    }

    case 'while': {
      for (;;) {
        ctx.scheduler.tick(s.line);
        const c = expectVec(evalExpr(s.cond, ctx), s.line, 'while condition');
        if (c.toBool() !== 1) break;
        yield* execStmt(s.body, ctx);
      }
      return;
    }

    case 'repeat': {
      const n = expectVec(evalExpr(s.count, ctx), s.line, 'repeat count').requireNumber('repeat count');
      for (let i = 0; i < n; i++) {
        ctx.scheduler.tick(s.line);
        yield* execStmt(s.body, ctx);
      }
      return;
    }

    case 'forever': {
      for (;;) {
        ctx.scheduler.tick(s.line);
        yield* execStmt(s.body, ctx);
      }
    }
    case 'blocking': {
      const v = expectVec(evalExpr(s.rhs, ctx), s.line, 'assignment');
      assignBlocking(s.lhs, v, ctx);
      return;
    }

    case 'nonblocking': {
      if (ctx.inFunction) {
        throw new SimError('nonblocking assignment (<=) is not allowed inside a function', s.line);
      }
      const v = expectVec(evalExpr(s.rhs, ctx), s.line, 'assignment');
      // resolve target now (indices evaluated at scheduling time)
      const res = resolveLValue(s.lhs, ctx);
      const sched = ctx.scheduler;
      if (res.kind === 'one') {
        const t = res.t;
        if (t.kind === 'local') throw new SimError('cannot schedule nonblocking assignment to a function local', s.line);
        sched.scheduleNBA(() => applyPiece(t, v, false, ctx));
      } else {
        const parts = res.parts;
        const total = parts.reduce((a, p) => a + pieceWidth(p), 0);
        const vv = v.resize(total);
        sched.scheduleNBA(() => {
          let off = 0;
          for (let k = parts.length - 1; k >= 0; k--) {
            const w = pieceWidth(parts[k]);
            if (parts[k].kind === 'local') throw new SimError('cannot schedule nonblocking assignment to a function local');
            applyPiece(parts[k], vv.slice(off + w - 1, off), false, ctx);
            off += w;
          }
        });
      }
      return;
    }

    case 'delay': {
      const amount = expectVec(evalExpr(s.amount, ctx), s.line, 'delay').requireNumber('delay amount');
      if (amount < 0) throw new SimError('delay must be non-negative', s.line);
      yield { kind: 'delay', amount };
      if (s.body) yield* execStmt(s.body, ctx);
      return;
    }

    case 'eventwait': {
      const edges = s.edges.map((ed) => {
        const res = resolveName(ctx, ed.sig, s.line);
        if (res.kind === 'signal') {
          return { sig: res.sig, edge: (ed.edge === 'level' ? 'any' : ed.edge) as EdgeKind };
        }
        throw new SimError(`undeclared signal '${ed.sig}' in event control`, s.line);
      });
      yield { kind: 'wait', edges };
      if (s.body) yield* execStmt(s.body, ctx);
      return;
    }

    case 'sys': {
      execSysCall(s, ctx);
      return;
    }

    case 'disable':
      throw new SimError("'disable' and named blocks are not supported in this subset", s.line);
  }
}

function assignBlockingFor(init: { isBlocking: boolean; lhs: LValue; rhs: Expr }, ctx: Ctx): void {
  const v = expectVec(evalExpr(init.rhs, ctx), undefined, 'for-loop assignment');
  assignBlocking(init.lhs, v, ctx);
}

function execSysCall(s: { name: string; args: Expr[]; line: number }, ctx: Ctx): void {
  const sched = ctx.scheduler;
  switch (s.name) {
    case '$display':
    case '$write': {
      if (s.args.length === 0) {
        sched.write('', s.name === '$display');
        return;
      }
      const first = evalExpr(s.args[0], ctx);
      if (typeof first === 'string') {
        const rest = s.args.slice(1).map((a) => {
          const v = evalExpr(a, ctx);
          return v;
        });
        sched.write(formatDisplay(first, rest, sched.now), s.name === '$display');
      } else {
        // no format string: print all args space separated
        const parts: string[] = [];
        for (const a of s.args) {
          const v = evalExpr(a, ctx);
          parts.push(typeof v === 'string' ? v : v.format('d'));
        }
        sched.write(parts.join(' '), s.name === '$display');
      }
      return;
    }
    case '$finish':
    case '$finish;':
      sched.write('$finish called at time ' + sched.now, true);
      throw new FinishSim();
    case '$stop':
      throw new SimError("$stop is not supported — use $finish", s.line);
    case '$dumpfile':
    case '$dumpvars':
    case '$dumpall':
    case '$dumpon':
    case '$dumpoff':
      // waveform is always recorded; ignore arguments
      return;
    case '$monitor':
    case '$monitoron':
    case '$monitoroff':
      throw new SimError(`'${s.name}' is not supported; use $display`, s.line);
    default:
      throw new SimError(`system task '${s.name}' is not supported`, s.line);
  }
}

// ---------- process generators (created by elaborate) ----------

export function* initialProc(ib: InitialBlock, ctx: Ctx): ProcGen {
  yield* execStmt(ib.body, ctx);
}

export function* edgeAlwaysProc(ab: AlwaysBlock, edges: { sig: Signal; edge: EdgeKind }[], ctx: Ctx): ProcGen {
  for (;;) {
    yield { kind: 'wait', edges };
    yield* execStmt(ab.body, ctx);
  }
}

export function* combAlwaysProc(ab: AlwaysBlock, edges: { sig: Signal; edge: EdgeKind }[], ctx: Ctx): ProcGen {
  for (;;) {
    yield* execStmt(ab.body, ctx);
    yield { kind: 'wait', edges };
  }
}

export function* delayAlwaysProc(ab: AlwaysBlock, ctx: Ctx): ProcGen {
  for (;;) {
    const amount = expectVec(evalExpr(ab.delayAmount!, ctx), ab.line, 'delay').requireNumber('delay amount');
    yield { kind: 'delay', amount };
    yield* execStmt(ab.body, ctx);
  }
}

export function* contAssignProc(
  a: AssignStmt,
  sens: { sig: Signal; edge: EdgeKind }[],
  ctx: Ctx
): ProcGen {
  for (;;) {
    const v = expectVec(evalExpr(a.rhs, ctx), a.line, 'assign');
    assignContinuous(a.lhs, v, ctx);
    yield { kind: 'wait', edges: sens };
  }
}

export function makeProc(gen: ProcGen, desc: string): Proc {
  return new Proc(gen, desc);
}

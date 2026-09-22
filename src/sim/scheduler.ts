/**
 * Event-driven simulation kernel with delta cycles and NBA region.
 * Processes are JS generators; they yield wait-conditions to the scheduler.
 */
import { Vec, X } from './values';

export class SimError extends Error {
  line?: number;
  constructor(msg: string, line?: number) {
    super(msg);
    this.line = line;
  }
}

/** thrown by $finish */
export class FinishSim extends Error {}

export type EdgeKind = 'pos' | 'neg' | 'any';

export interface Watcher {
  proc: Proc;
  edge: EdgeKind;
  sig: Signal;
}

export class Signal {
  name: string;
  path: string; // hierarchical display name
  width: number;
  isReg: boolean;
  value: Vec;
  changes: { t: number; v: Vec }[] = [];
  watchers = new Set<Watcher>();
  /** true if this signal is just an elaboration constant (hidden from waveform) */
  hidden = false;
  /** port-alias flags: allow procedural/continuous writes through module ports */
  allowProcedural = false;
  allowContinuous = false;

  constructor(path: string, name: string, width: number, isReg: boolean, value: Vec) {
    this.path = path;
    this.name = name;
    this.width = width;
    this.isReg = isReg;
    this.value = value;
    this.changes.push({ t: 0, v: value });
  }
}

export interface WaitEdges {
  kind: 'wait';
  edges: { sig: Signal; edge: EdgeKind }[];
}
export interface WaitDelay {
  kind: 'delay';
  amount: number;
}
export type YieldCond = WaitEdges | WaitDelay;

export type ProcGen = Generator<YieldCond, void, unknown>;

export class Proc {
  gen: ProcGen;
  desc: string;
  state: 'ready' | 'waiting' | 'running' | 'done' = 'ready';
  dirty = false; // signal changed while running/ready — re-arm after registering wait
  waitingOn: Watcher[] = [];

  constructor(gen: ProcGen, desc: string) {
    this.gen = gen;
    this.desc = desc;
  }
}

interface TimedEvent {
  t: number;
  seq: number;
  proc: Proc;
}

export interface SimErrorInfo {
  message: string;
  line?: number;
}

export class Scheduler {
  now = 0;
  console: string[] = [];
  partial = '';
  errors: SimErrorInfo[] = [];
  finished = false;
  time = 0;
  maxTime = 100000;
  maxDelta = 10000;
  budget = 5_000_000;
  allSignals: Signal[] = [];

  private ready: Proc[] = [];
  private nba: { apply: () => void }[] = [];
  private heap: TimedEvent[] = [];
  private seq = 0;
  private delta = 0;
  private stopped = false;

  // ---------- console ----------

  write(text: string, newline: boolean): void {
    if (newline) {
      this.console.push(this.partial + text);
      this.partial = '';
    } else {
      this.partial += text;
    }
  }

  flushPartial(): void {
    if (this.partial !== '') {
      this.console.push(this.partial);
      this.partial = '';
    }
  }

  // ---------- processes ----------

  addProc(p: Proc): void {
    this.ready.push(p);
  }

  private registerWait(p: Proc, edges: { sig: Signal; edge: EdgeKind }[]): void {
    this.unregisterWait(p);
    for (const e of edges) {
      const w: Watcher = { proc: p, edge: e.edge, sig: e.sig };
      e.sig.watchers.add(w);
      p.waitingOn.push(w);
    }
    p.state = 'waiting';
    if (p.dirty) {
      p.dirty = false;
      this.makeReady(p);
    }
  }

  private unregisterWait(p: Proc): void {
    for (const w of p.waitingOn) w.sig.watchers.delete(w);
    p.waitingOn = [];
  }

  private makeReady(p: Proc): void {
    p.state = 'ready';
    this.ready.push(p);
  }

  private wake(p: Proc): void {
    if (p.state === 'waiting') {
      this.unregisterWait(p);
      this.makeReady(p);
    } else if (p.state === 'ready' || p.state === 'running') {
      p.dirty = true;
    }
  }

  runProc(p: Proc): void {
    p.state = 'running';
    try {
      const r = p.gen.next();
      if (r.done) {
        p.state = 'done';
        this.unregisterWait(p);
      } else {
        const y = r.value;
        if (y.kind === 'delay') {
          this.heapPush({ t: this.now + y.amount, seq: this.seq++, proc: p });
          p.state = 'waiting';
        } else {
          this.registerWait(p, y.edges);
        }
      }
    } catch (e) {
      p.state = 'done';
      this.unregisterWait(p);
      if (e instanceof FinishSim) {
        this.finished = true;
      } else if (e instanceof SimError) {
        this.errors.push({ message: e.message, line: e.line });
        this.finished = true;
      } else if (e instanceof Error) {
        this.errors.push({ message: `internal simulator error: ${e.message}` });
        this.finished = true;
      }
    }
  }

  // ---------- signal updates ----------

  setSignal(sig: Signal, v: Vec): void {
    if (sig.value.equals(v)) return;
    const old = sig.value;
    sig.value = v;
    if (!sig.hidden) sig.changes.push({ t: this.now, v });
    const oldLsb = old.bit(0);
    const newLsb = v.bit(0);
    for (const w of sig.watchers) {
      let fire = false;
      if (w.edge === 'any') fire = true;
      else if (w.edge === 'pos') fire = oldLsb !== 1 && newLsb === 1;
      else if (w.edge === 'neg') fire = oldLsb !== 0 && newLsb === 0;
      if (fire) this.wake(w.proc);
    }
  }

  scheduleNBA(apply: () => void): void {
    this.nba.push({ apply });
  }

  // ---------- statement budget ----------

  tick(line?: number): void {
    if (--this.budget < 0) {
      throw new SimError(
        'simulation exceeded the statement budget — possible infinite loop (while/forever without delay?)',
        line
      );
    }
  }

  // ---------- heap ----------

  private heapPush(e: TimedEvent): void {
    this.heap.push(e);
    let i = this.heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.heap[i].t < this.heap[parent].t) {
        [this.heap[i], this.heap[parent]] = [this.heap[parent], this.heap[i]];
        i = parent;
      } else break;
    }
  }

  private heapPeek(): TimedEvent | null {
    return this.heap.length ? this.heap[0] : null;
  }

  private heapPop(): TimedEvent | null {
    if (!this.heap.length) return null;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length) {
      this.heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = 2 * i + 2;
        let m = i;
        if (l < this.heap.length && this.heap[l].t < this.heap[m].t) m = l;
        if (r < this.heap.length && this.heap[r].t < this.heap[m].t) m = r;
        if (m === i) break;
        [this.heap[i], this.heap[m]] = [this.heap[m], this.heap[i]];
        i = m;
      }
    }
    return top;
  }

  // ---------- main loop ----------

  run(): void {
    while (!this.finished && !this.stopped) {
      if (this.ready.length) {
        if (++this.delta > this.maxDelta) {
          this.errors.push({
            message: `combinational logic did not settle within ${this.maxDelta} delta cycles at time ${this.now} — check for feedback loops or oscillation`,
          });
          return;
        }
        const p = this.ready.shift()!;
        this.runProc(p);
        continue;
      }
      if (this.nba.length) {
        if (++this.delta > this.maxDelta) {
          this.errors.push({
            message: `combinational logic did not settle within ${this.maxDelta} delta cycles at time ${this.now} — check for feedback loops or oscillation`,
          });
          return;
        }
        const items = this.nba;
        this.nba = [];
        for (const it of items) {
          if (this.finished) break;
          it.apply();
        }
        continue;
      }
      // advance time
      const next = this.heapPeek();
      if (!next) break;
      if (next.t > this.maxTime) {
        this.errors.push({
          message: `simulation did not finish before max time ${this.maxTime} — missing $finish, or clock never ends?`,
        });
        return;
      }
      this.now = next.t;
      this.delta = 0;
      // wake all events at this time
      for (;;) {
        const e = this.heapPeek();
        if (!e || e.t !== this.now) break;
        this.heapPop();
        if (e.proc.state === 'waiting') {
          this.unregisterWait(e.proc);
          this.makeReady(e.proc);
        }
      }
    }
    this.flushPartial();
    this.time = this.now;
  }
}

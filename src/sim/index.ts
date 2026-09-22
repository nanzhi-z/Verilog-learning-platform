/**
 * Public API: simulate(sources) → console output, waveform, errors.
 */
import { parseModule } from './parser';
import { ParseError } from './parser';
import { LexError } from './lexer';
import { elaborate } from './elaborate';
import { Scheduler, SimError, Signal } from './scheduler';
import { Vec } from './values';
import type { Instance } from './interpreter';

export { Vec };
export type { Bit } from './values';

export interface WaveChange {
  t: number;
  v: Vec;
}

export interface WaveSignal {
  name: string;
  width: number;
  changes: WaveChange[];
}

export interface SimErrorInfo {
  message: string;
  line?: number;
  /** 1-based line number offset of the user source if the testbench was appended */
  userLine?: number;
}

export interface SimResult {
  console: string[];
  waveform: WaveSignal[];
  errors: SimErrorInfo[];
  finished: boolean;
  time: number;
}

export interface SimOptions {
  top?: string;
  maxTime?: number;
  budget?: number;
}

function collectWaveform(top: Instance): WaveSignal[] {
  const out: WaveSignal[] = [];
  const seen = new Set<Signal>();
  const walk = (inst: Instance): void => {
    for (const name of inst.order) {
      const sig = inst.signals.get(name);
      if (!sig || sig.hidden || seen.has(sig)) continue;
      seen.add(sig);
      out.push({ name: sig.path, width: sig.width, changes: sig.changes });
    }
    for (const child of inst.children.values()) walk(child);
  };
  walk(top);
  return out;
}

export function simulate(
  sources: string | string[],
  opts: SimOptions = {}
): SimResult {
  const srcs = Array.isArray(sources) ? sources : [sources];
  try {
    const defs = srcs.flatMap((s) => parseModule(s));
    let elab;
    try {
      elab = elaborate(defs, opts.top);
    } catch (e) {
      if (e instanceof SimError) {
        return { console: [], waveform: [], errors: [{ message: e.message, line: e.line }], finished: false, time: 0 };
      }
      throw e;
    }
    const scheduler: Scheduler = elab.scheduler;
    scheduler.maxTime = opts.maxTime ?? 20000;
    if (opts.budget !== undefined) scheduler.budget = opts.budget;
    scheduler.run();
    return {
      console: scheduler.console,
      waveform: collectWaveform(elab.top),
      errors: scheduler.errors.map((e) => ({ message: e.message, line: e.line })),
      finished: scheduler.finished && scheduler.errors.length === 0,
      time: scheduler.now,
    };
  } catch (e) {
    if (e instanceof ParseError || e instanceof LexError) {
      return { console: [], waveform: [], errors: [{ message: e.message, line: e.line }], finished: false, time: 0 };
    }
    if (e instanceof SimError) {
      return { console: [], waveform: [], errors: [{ message: e.message, line: e.line }], finished: false, time: 0 };
    }
    return {
      console: [],
      waveform: [],
      errors: [{ message: `internal error: ${(e as Error).message}` }],
      finished: false,
      time: 0,
    };
  }
}

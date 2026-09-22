import { describe, it, expect } from 'vitest';
import { simulate } from '../sim';
import { chapters } from './index';

const SIM_OPTS = { maxTime: 500000, budget: 200_000_000 } as const;

describe('course content integrity', () => {
  it('has 23 chapters', () => {
    expect(chapters.length).toBe(23);
  });

  it('every solution passes its testbench', () => {
    const failures: string[] = [];
    for (const ch of chapters) {
      for (const ex of ch.exercises) {
        const r = simulate([ex.solution, ex.testbench], SIM_OPTS);
        const ok =
          r.errors.length === 0 && r.console.join('\n').includes('ALL TESTS PASSED');
        if (!ok) {
          failures.push(
            `ch${ch.id} ex${ex.id} "${ex.title}": ` +
              (r.errors.length
                ? r.errors.map((e) => e.message).join('; ')
                : `console=${JSON.stringify(r.console)}`)
          );
        }
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('starter code is not the solution and mentions TODO', () => {
    for (const ch of chapters) {
      for (const ex of ch.exercises) {
        expect(ex.starter).not.toBe(ex.solution);
        expect(ex.starter).toMatch(/TODO/);
      }
    }
  });
});

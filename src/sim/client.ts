/**
 * 仿真客户端：在 Web Worker 中运行仿真，返回 Promise<SimResult>。
 * 单个 worker 复用，按请求 id 对应响应。
 */
import { Vec, type SimResult, type SimOptions } from './index';
import type { Bit } from './values';

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, (r: SimResult) => void>();

function errorResult(message: string): SimResult {
  return {
    console: [],
    waveform: [],
    errors: [{ message }],
    finished: false,
    time: 0,
  };
}

/**
 * postMessage 的结构化克隆会把 Vec 类实例变成普通对象（{ bits: [...] }），
 * 丢失原型方法（bit / toHexString）。这里把波形中的值重新构造为 Vec。
 */
function hydrate(result: SimResult): SimResult {
  for (const sig of result.waveform) {
    for (const c of sig.changes) {
      const raw = c.v as unknown as { bits?: Bit[] } | null;
      if (raw && Array.isArray(raw.bits)) {
        c.v = new Vec(raw.bits);
      }
    }
  }
  return result;
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent) => {
      const data = e.data as { id: number; result: SimResult };
      const resolve = pending.get(data.id);
      if (resolve) {
        pending.delete(data.id);
        resolve(hydrate(data.result));
      }
    };
    worker.onerror = (e) => {
      const result = errorResult(`仿真线程加载失败：${e.message || 'unknown error'}`);
      pending.forEach((resolve) => resolve(result));
      pending.clear();
      worker = null;
    };
  }
  return worker;
}

export function runSim(sources: string[], opts?: SimOptions): Promise<SimResult> {
  return new Promise((resolve) => {
    const id = ++seq;
    pending.set(id, resolve);
    getWorker().postMessage({ id, sources, opts });
  });
}

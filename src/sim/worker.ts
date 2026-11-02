/// <reference lib="webworker" />
/**
 * 仿真 Web Worker：在后台线程运行 simulate，避免大设计阻塞主线程渲染。
 * 由 sim/client.ts 创建并通过消息驱动。
 */
import { simulate, type SimOptions, type SimResult } from './index';


export interface SimRequest {
  id: number;
  sources: string[];
  opts?: SimOptions;
}
export interface SimResponse {
  id: number;
  result: SimResult;
}

const scope = self as unknown as {
  onmessage: ((e: MessageEvent<SimRequest>) => void) | null;
  postMessage: (m: SimResponse) => void;
};

scope.onmessage = (e: MessageEvent<SimRequest>) => {
  const { id, sources, opts } = e.data;
  const result = simulate(sources, opts);
  scope.postMessage({ id, result });
};

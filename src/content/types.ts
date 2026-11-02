/** Content data model for the Learn Verilog course. */

export type Block =
  | { k: 'p'; t: string }
  | { k: 'h2'; t: string }
  | { k: 'h3'; t: string }
  | { k: 'code'; label?: string; code: string }
  | { k: 'ul'; items: string[] }
  | { k: 'ol'; items: string[] }
  | { k: 'note'; tone: 'tip' | 'warn' | 'info'; title: string; t: string }
  | { k: 'table'; head: string[]; rows: string[][] };

/** 参考答案逐行讲解：line 为 solution 中的 1-based 行号，text 解释这行在电路里的含义 */
export interface ExplainLine {
  line: number;
  text: string;
}

/** 预期真值表（也可表达关键输入/输出约定） */
export interface TruthTable {
  caption?: string;
  head: string[];
  rows: string[][];
}

/** 分步引导：把一道大题拆成多步脚手架，code 为该步要补的关键代码 */
export interface GuideStep {
  title: string;
  text: string;
  code?: string;
}

/** 同一电路的另一种写法 */
export interface Alternative {
  label: string;
  note: string;
  code: string;
}

/** 门级电路节点：用网格坐标布局，inputs 引用其他节点 id */
export interface CircuitNode {
  id: string;
  kind:
    | 'in' // 输入引脚
    | 'out' // 输出引脚
    | 'and'
    | 'or'
    | 'not'
    | 'xor'
    | 'nand'
    | 'nor'
    | 'dff' // D 触发器
    | 'mux' // 二选一
    | 'add'; // 加法器
  /** 网格列（从 0 开始，每列约 120px） */
  x: number;
  /** 网格行（每行约 76px） */
  y: number;
  /** 引脚/门的显示名（in/out 默认用 id） */
  label?: string;
  /** 门、输出引脚的输入来源节点 id（按输入端顺序） */
  inputs?: string[];
}

/** 门级电路：一组节点 + 可选说明 */
export interface Circuit {
  nodes: CircuitNode[];
  note?: string;
}

/** 章末自测题（单选） */
export interface QuizQ {
  q: string;
  options: string[];
  /** 正确选项下标 */
  answer: number;
  explain?: string;
}

export interface Exercise {
  /** local id, unique within chapter ("1", "2", ...) */
  id: string;
  title: string;
  /** assignment text, supports `code` and **bold** inline */
  desc: string;
  hints: string[];
  /** module skeleton the learner edits */
  starter: string;
  /** testbench appended for simulation; must print ALL TESTS PASSED */
  testbench: string;
  /** reference solution, verified against testbench */
  solution: string;
  /** 参考答案逐行讲解 */
  explain?: ExplainLine[];
  /** 预期真值表 / 输入输出约定 */
  truthTable?: TruthTable;
  /** 关键波形的文字说明（实际波形运行后可见） */
  expectedWave?: string;
  /** 分步引导（用于综合题） */
  steps?: GuideStep[];
  /** 多写法对比 */
  alternatives?: Alternative[];
  /** 门级电路示意 */
  circuit?: Circuit;
}

export interface Chapter {
  /** zero-padded number "00".."22" */
  id: string;
  title: string;
  subtitle: string;
  blocks: Block[];
  exercises: Exercise[];
  /** 章末自测 */
  quiz?: QuizQ[];
}

export interface Stage {
  id: string;
  title: string;
  tagline: string;
  desc: string;
  chapters: Chapter[];
}

/** key for progress tracking */
export const exKey = (cid: string, eid: string) => `${cid}/${eid}`;

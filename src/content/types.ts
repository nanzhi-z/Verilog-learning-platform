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
}

export interface Chapter {
  /** zero-padded number "00".."22" */
  id: string;
  title: string;
  subtitle: string;
  blocks: Block[];
  exercises: Exercise[];
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

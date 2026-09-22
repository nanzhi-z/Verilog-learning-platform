/** AST node definitions for the Verilog teaching subset. All nodes carry a source line. */

export interface Pos { line: number }

export type Range = { msb: Expr; lsb: Expr } | null;

// ---------- declarations ----------

export interface PortDecl extends Pos {
  kind: 'port';
  dir: 'input' | 'output' | 'inout';
  netType: 'wire' | 'reg' | 'tri' | null; // input reg not allowed in our subset except fun
  signed: boolean;
  range: Range;
  name: string;
  defaultExpr: Expr | null; // ANSI port default (unused)
}

export interface NetDecl extends Pos {
  kind: 'net';
  netType: 'wire' | 'reg' | 'tri';
  signed: boolean;
  range: Range;
  names: string[];
  init: Expr | null; // reg a = 0
}

export interface ParamDecl extends Pos {
  kind: 'param';
  names: string[];
  init: Expr;
  local: boolean;
}

export interface ParamAssign extends Pos {
  kind: 'paramassign';
  name: string;
  expr: Expr;
}

export interface AssignStmt extends Pos {
  kind: 'assign';
  lhs: LValue;
  rhs: Expr;
}

export type AlwaysKind = 'comb' | 'edge'; // comb = @(*) / @* / (*)

export interface EdgeSpec {
  edge: 'pos' | 'neg' | 'level';
  sig: string; // identifier
}

export interface AlwaysBlock extends Pos {
  kind: 'always';
  trig: AlwaysKind;
  edges: EdgeSpec[]; // for edge-triggered
  delayAmount: Expr | null; // for `always #N ...`
  body: Stmt;
}

export interface InitialBlock extends Pos {
  kind: 'initial';
  body: Stmt;
}

export interface InstanceDecl extends Pos {
  kind: 'instance';
  module: string;
  params: ParamAssign[];
  name: string;
  conns: { port: string; expr: Expr | null }[]; // null = unconnected
}

export interface FunctionDecl extends Pos {
  kind: 'function';
  range: Range; // return width
  name: string;
  ports: PortDecl[]; // inputs (ANSI or old-style)
  decls: ModuleItem[]; // extra local decls
  body: Stmt;
}

export type ModuleItem =
  | PortDecl
  | NetDecl
  | ParamDecl
  | ParamAssign
  | AssignStmt
  | AlwaysBlock
  | InitialBlock
  | InstanceDecl
  | FunctionDecl;

export interface ModuleDef extends Pos {
  kind: 'module';
  name: string;
  ansiPorts: boolean;
  items: ModuleItem[];
  portOrder: string[]; // positional port order
}

export type SourceItem = ModuleDef;

// ---------- statements ----------

export interface SeqBlock extends Pos { kind: 'block'; stmts: Stmt[] }

export interface IfStmt extends Pos {
  kind: 'if';
  cond: Expr;
  then: Stmt;
  else: Stmt | null;
}

export interface CaseStmt extends Pos {
  kind: 'case';
  subject: Expr;
  items: { test: Expr | null; body: Stmt }[]; // test null = default
}

export interface ForInit {
  isBlocking: boolean;
  lhs: LValue;
  rhs: Expr;
}
export interface ForStmt extends Pos {
  kind: 'for';
  init: ForInit;
  cond: Expr;
  step: ForInit;
  body: Stmt;
}

export interface WhileStmt extends Pos {
  kind: 'while';
  cond: Expr;
  body: Stmt;
}

export interface RepeatStmt extends Pos {
  kind: 'repeat';
  count: Expr;
  body: Stmt;
}

export interface ForeverStmt extends Pos {
  kind: 'forever';
  body: Stmt;
}

export interface AssignExprStmt extends Pos {
  kind: 'blocking' | 'nonblocking';
  lhs: LValue;
  rhs: Expr;
}

export interface DelayStmt extends Pos {
  kind: 'delay';
  amount: Expr; // number expr
  body: Stmt | null; // null = plain `#10;`
}

export interface EventWaitStmt extends Pos {
  kind: 'eventwait';
  edges: EdgeSpec[];
  body: Stmt | null; // null = plain `@(posedge clk);`
}

export interface SysCallStmt extends Pos {
  kind: 'sys';
  name: string; // '$display' etc
  args: Expr[];
}

export interface DisableStmt extends Pos { kind: 'disable'; label: string }

export type Stmt =
  | SeqBlock
  | IfStmt
  | CaseStmt
  | ForStmt
  | WhileStmt
  | RepeatStmt
  | ForeverStmt
  | AssignExprStmt
  | DelayStmt
  | EventWaitStmt
  | SysCallStmt
  | DisableStmt;

// ---------- expressions ----------

export interface NumLit extends Pos {
  kind: 'num';
  width: number | null; // null = unsized (32)
  base: 2 | 8 | 10 | 16;
  digits: string;
}

export interface StrLit extends Pos { kind: 'str'; value: string }

export interface Ident extends Pos { kind: 'id'; name: string }

/** hierarchical reference a.b.c — read only */
export interface HierId extends Pos { kind: 'hier'; path: string[] }

export interface IndexExpr extends Pos {
  kind: 'index';
  base: Expr; // identifier
  index: Expr;
}

export interface PartSelectExpr extends Pos {
  kind: 'part';
  base: Expr; // identifier
  msb: Expr;
  lsb: Expr;
}

export interface ConcatExpr extends Pos { kind: 'concat'; parts: Expr[] }

export interface ReplExpr extends Pos { kind: 'repl'; count: Expr; value: Expr }

export interface UnaryExpr extends Pos {
  kind: 'unary';
  op: '+' | '-' | '~' | '!' | '&' | '~&' | '|' | '~|' | '^' | '~^' | '^~';
  operand: Expr;
}

export interface BinaryExpr extends Pos {
  kind: 'binary';
  op: string; // + - * / % & | ^ && || << >> <<< >>> < <= > >= == != === !==
  left: Expr;
  right: Expr;
}

export interface CondExpr extends Pos {
  kind: 'cond';
  cond: Expr;
  then: Expr;
  else: Expr;
}

export interface CallExpr extends Pos {
  kind: 'call';
  name: string;
  args: Expr[];
}

export type Expr =
  | NumLit
  | StrLit
  | Ident
  | HierId
  | IndexExpr
  | PartSelectExpr
  | ConcatExpr
  | ReplExpr
  | UnaryExpr
  | BinaryExpr
  | CondExpr
  | CallExpr;

// ---------- lvalues ----------

export interface LvIdent extends Pos { kind: 'lvid'; name: string }
export interface LvIndex extends Pos { kind: 'lvindex'; name: string; index: Expr }
export interface LvPart extends Pos { kind: 'lvpart'; name: string; msb: Expr; lsb: Expr }
export interface LvConcat extends Pos { kind: 'lvconcat'; parts: LValue[] }

export type LValue = LvIdent | LvIndex | LvPart | LvConcat;

/** collect every identifier referenced inside an expression (for sensitivity) */
export function exprIdents(e: Expr, out: Set<string>): void {
  switch (e.kind) {
    case 'id': out.add(e.name); break;
    case 'hier': e.path.forEach((p) => out.add(p)); break;
    case 'index': exprIdents(e.base, out); exprIdents(e.index, out); break;
    case 'part': exprIdents(e.base, out); exprIdents(e.msb, out); exprIdents(e.lsb, out); break;
    case 'concat': e.parts.forEach((p) => exprIdents(p, out)); break;
    case 'repl': exprIdents(e.count, out); exprIdents(e.value, out); break;
    case 'unary': exprIdents(e.operand, out); break;
    case 'binary': exprIdents(e.left, out); exprIdents(e.right, out); break;
    case 'cond': exprIdents(e.cond, out); exprIdents(e.then, out); exprIdents(e.else, out); break;
    case 'call': e.args.forEach((a) => exprIdents(a, out)); break;
    default: break;
  }
}

/** collect identifiers referenced in a statement (for comb sensitivity) */
export function stmtIdents(s: Stmt, out: Set<string>): void {
  switch (s.kind) {
    case 'block': s.stmts.forEach((x) => stmtIdents(x, out)); break;
    case 'if': exprIdents(s.cond, out); stmtIdents(s.then, out); if (s.else) stmtIdents(s.else, out); break;
    case 'case': exprIdents(s.subject, out); s.items.forEach((it) => stmtIdents(it.body, out)); break;
    case 'for': exprIdents(s.init.rhs, out); exprIdents(s.cond, out); exprIdents(s.step.rhs, out); stmtIdents(s.body, out); break;
    case 'while': exprIdents(s.cond, out); stmtIdents(s.body, out); break;
    case 'repeat': exprIdents(s.count, out); stmtIdents(s.body, out); break;
    case 'forever': stmtIdents(s.body, out); break;
    case 'blocking':
    case 'nonblocking': lvalueIdents(s.lhs, out); exprIdents(s.rhs, out); break;
    case 'delay': exprIdents(s.amount, out); if (s.body) stmtIdents(s.body, out); break;
    case 'eventwait': if (s.body) stmtIdents(s.body, out); break;
    case 'sys': s.args.forEach((a) => exprIdents(a, out)); break;
    default: break;
  }
}

export function lvalueIdents(lv: LValue, out: Set<string>): void {
  switch (lv.kind) {
    case 'lvid': out.add(lv.name); break;
    case 'lvindex': out.add(lv.name); exprIdents(lv.index, out); break;
    case 'lvpart': out.add(lv.name); exprIdents(lv.msb, out); exprIdents(lv.lsb, out); break;
    case 'lvconcat': lv.parts.forEach((p) => lvalueIdents(p, out)); break;
  }
}

/** Recursive-descent parser for the Verilog teaching subset. */
import { tokenize, Token } from './lexer';
import type {
  ModuleDef, ModuleItem, PortDecl, NetDecl, ParamDecl, ParamAssign, AssignStmt,
  AlwaysBlock, InitialBlock, InstanceDecl, FunctionDecl, Stmt, Expr, LValue,
  EdgeSpec, AlwaysKind, SourceItem, Range, ForInit,
} from './ast';

export class ParseError extends Error {
  line: number;
  constructor(line: number, msg: string) {
    super(msg);
    this.line = line;
  }
}

const KEYWORDS = new Set([
  'module', 'endmodule', 'input', 'output', 'inout', 'wire', 'reg', 'tri',
  'parameter', 'localparam', 'assign', 'always', 'initial', 'begin', 'end',
  'if', 'else', 'case', 'endcase', 'default', 'for', 'while', 'repeat',
  'forever', 'posedge', 'negedge', 'or', 'function', 'endfunction', 'signed',
  'unsigned', 'integer', 'defparam', 'casex', 'casez',
]);

class Parser {
  toks: Token[];
  p = 0;
  /** extra items produced when one syntactic declaration declares several signals */
  pending: ModuleItem[] = [];

  constructor(src: string) {
    this.toks = tokenize(src);
  }

  peek(k = 0): Token {
    return this.toks[Math.min(this.p + k, this.toks.length - 1)];
  }

  next(): Token {
    return this.toks[this.p++];
  }

  at(text: string): boolean {
    const t = this.peek();
    return t.text === text && (t.type === 'punct' || t.type === 'id' || t.type === 'sysid');
  }

  atKeyword(kw: string): boolean {
    const t = this.peek();
    return t.type === 'id' && t.text === kw;
  }

  eat(text: string): Token {
    if (!this.at(text)) {
      const t = this.peek();
      throw new ParseError(t.line, `expected '${text}' but found '${t.text || 'end of file'}'`);
    }
    return this.next();
  }

  eatKeyword(kw: string): Token {
    if (!this.atKeyword(kw)) {
      const t = this.peek();
      throw new ParseError(t.line, `expected '${kw}' but found '${t.text || 'end of file'}'`);
    }
    return this.next();
  }

  id(what = 'identifier'): Token {
    const t = this.peek();
    if (t.type !== 'id' || KEYWORDS.has(t.text)) {
      throw new ParseError(t.line, `expected ${what} but found '${t.text || 'end of file'}'`);
    }
    return this.next();
  }

  line(): number { return this.peek().line; }

  optTypeKw(): 'wire' | 'reg' | 'tri' | null {
    if (this.atKeyword('wire')) { this.next(); return 'wire'; }
    if (this.atKeyword('reg')) { this.next(); return 'reg'; }
    if (this.atKeyword('tri')) { this.next(); return 'tri'; }
    return null;
  }

  optSigned(): boolean {
    if (this.atKeyword('signed')) {
      const t = this.peek();
      throw new ParseError(t.line, "'signed' is not supported in this teaching subset (use unsigned)");
    }
    if (this.atKeyword('unsigned')) this.next();
    return false;
  }

  range(): Range {
    if (!this.at('[')) return null;
    this.next();
    const msb = this.expr();
    this.eat(':');
    const lsb = this.expr();
    this.eat(']');
    return { msb, lsb };
  }

  // ---------- top level ----------

  parseSource(): SourceItem[] {
    const items: SourceItem[] = [];
    while (this.peek().type !== 'eof') {
      if (this.atKeyword('module')) items.push(this.module());
      else {
        const t = this.peek();
        throw new ParseError(t.line, `expected 'module' declaration but found '${t.text}'`);
      }
    }
    return items;
  }

  module(): ModuleDef {
    const kw = this.eatKeyword('module');
    const name = this.id('module name').text;
    const mod: ModuleDef = {
      kind: 'module', name, line: kw.line, ansiPorts: false, items: [], portOrder: [],
    };
    // module header parameters: module foo #(parameter W = 4, H = 2) (...)
    if (this.at('#')) {
      this.next();
      this.eat('(');
      if (!this.at(')')) {
        for (;;) {
          const line = this.peek().line;
          const local = this.atKeyword('localparam');
          if (local) this.next();
          if (this.atKeyword('parameter')) this.next();
          this.range(); // optional width, ignored
          const pn = this.id('parameter name').text;
          this.eat('=');
          const e = this.expr();
          mod.items.push({ kind: 'param', line, names: [pn], init: e, local });
          if (this.at(',')) { this.next(); continue; }
          break;
        }
      }
      this.eat(')');
    }
    if (this.at('(')) {
      this.next();
      if (!this.at(')')) {
        const isAnsi =
          this.atKeyword('input') || this.atKeyword('output') || this.atKeyword('inout');
        if (isAnsi) {
          mod.ansiPorts = true;
          for (;;) {
            const pd = this.ansiPort();
            mod.items.push(pd);
            mod.portOrder.push(pd.name);
            while (this.pending.length) {
              const extra = this.pending.shift()! as PortDecl;
              mod.items.push(extra);
              mod.portOrder.push(extra.name);
            }
            if (this.at(',')) { this.next(); continue; }
            break;
          }
        } else {
          for (;;) {
            const t = this.id('port name');
            mod.portOrder.push(t.text);
            if (this.at(',')) { this.next(); continue; }
            break;
          }
        }
      }
      this.eat(')');
    }
    this.eat(';');
    while (!this.atKeyword('endmodule') && this.peek().type !== 'eof') {
      const item = this.moduleItem();
      mod.items.push(item);
      while (this.pending.length) mod.items.push(this.pending.shift()!);
    }
    if (this.peek().type === 'eof') {
      throw new ParseError(this.peek().line, `missing 'endmodule' for module '${name}'`);
    }
    this.eatKeyword('endmodule');
    return mod;
  }

  ansiPort(): PortDecl {
    const dirKw = this.peek();
    let dir: 'input' | 'output' | 'inout';
    if (this.atKeyword('input')) { this.next(); dir = 'input'; }
    else if (this.atKeyword('output')) { this.next(); dir = 'output'; }
    else if (this.atKeyword('inout')) { this.next(); dir = 'inout'; }
    else throw new ParseError(dirKw.line, `expected 'input', 'output' or 'inout' in port list`);
    const netType = this.optTypeKw();
    this.optSigned();
    const range = this.range();
    const name = this.id('port name').text;
    // additional names sharing this direction/type/width: input a, b, c
    while (this.at(',')) {
      const nt = this.peek(1);
      if (nt.type === 'id' && (nt.text === 'input' || nt.text === 'output' || nt.text === 'inout')) break;
      this.next();
      const extra = this.id('port name').text;
      this.pending.push({ kind: 'port', line: dirKw.line, dir, netType, signed: false, range, name: extra, defaultExpr: null });
    }
    return { kind: 'port', line: dirKw.line, dir, netType, signed: false, range, name, defaultExpr: null };
  }

  moduleItem(): ModuleItem {
    const t = this.peek();
    const line = t.line;

    // non-ANSI port declaration: input/output/inout [type] [range] names ;
    if (this.atKeyword('input') || this.atKeyword('output') || this.atKeyword('inout')) {
      const dir = this.next().text as 'input' | 'output' | 'inout';
      const netType = this.optTypeKw();
      this.optSigned();
      const range = this.range();
      const first = this.id('port name').text;
      const all = [first];
      while (this.at(',')) {
        this.next();
        all.push(this.id('port name').text);
      }
      this.eat(';');
      const decls: PortDecl[] = all.map((name) => ({
        kind: 'port', line, dir, netType, signed: false, range, name, defaultExpr: null,
      }));
      for (let i = 1; i < decls.length; i++) this.pending.push(decls[i]);
      return decls[0];
    }

    // net / variable declaration
    if (this.atKeyword('wire') || this.atKeyword('reg') || this.atKeyword('tri')) {
      const netType = this.optTypeKw()!;
      this.optSigned();
      const range = this.range();
      const decls: NetDecl[] = [];
      for (;;) {
        const name = this.id('signal name').text;
        let init: Expr | null = null;
        if (this.at('=')) {
          this.next();
          init = this.expr();
        }
        decls.push({ kind: 'net', line, netType, signed: false, range, names: [name], init });
        if (this.at(',')) { this.next(); continue; }
        break;
      }
      this.eat(';');
      for (let i = 1; i < decls.length; i++) this.pending.push(decls[i]);
      return decls[0];
    }

    // parameter / localparam
    if (this.atKeyword('parameter') || this.atKeyword('localparam')) {
      const local = this.next().text === 'localparam';
      this.range(); // optional, ignored (params take value width)
      const decls: ParamDecl[] = [];
      for (;;) {
        const name = this.id('parameter name').text;
        this.eat('=');
        const e = this.expr();
        decls.push({ kind: 'param', line, names: [name], init: e, local });
        if (this.at(',')) { this.next(); continue; }
        break;
      }
      this.eat(';');
      for (let i = 1; i < decls.length; i++) this.pending.push(decls[i]);
      return decls[0];
    }

    if (this.atKeyword('assign')) {
      this.next();
      const lhs = this.lvalue();
      this.eat('=');
      const rhs = this.expr();
      this.eat(';');
      const a: AssignStmt = { kind: 'assign', line, lhs, rhs };
      return a;
    }

    if (this.atKeyword('always')) {
      this.next();
      // `always #N stmt` — delay loop (classic clock generator)
      if (this.at('#')) {
        this.next();
        const amount = this.primary();
        const body = this.stmt();
        return { kind: 'always', line, trig: 'edge', edges: [], delayAmount: amount, body };
      }
      this.eat('@');
      const edges: EdgeSpec[] = [];
      let trig: AlwaysKind = 'edge';
      if (this.at('*')) {
        // `always @*` (no parentheses)
        this.next();
        trig = 'comb';
      } else {
        this.eat('(');
        if (this.at('*')) {
          this.next();
          trig = 'comb';
        } else {
          for (;;) {
            if (this.atKeyword('posedge') || this.atKeyword('negedge')) {
              const e = this.next().text === 'posedge' ? 'pos' : 'neg';
              const sig = this.id('signal').text;
              edges.push({ edge: e, sig });
            } else if (this.atKeyword('or')) {
              this.next();
              continue;
            } else {
              const sig = this.id('signal in sensitivity list').text;
              edges.push({ edge: 'level', sig });
            }
            if (this.atKeyword('or')) { this.next(); continue; }
            break;
          }
          if (edges.length === 0) throw new ParseError(line, 'empty sensitivity list');
        }
        this.eat(')');
      }
      const body = this.stmt();
      const a: AlwaysBlock = { kind: 'always', line, trig, edges, delayAmount: null, body };
      return a;
    }

    if (this.atKeyword('initial')) {
      this.next();
      const body = this.stmt();
      const ib: InitialBlock = { kind: 'initial', line, body };
      return ib;
    }

    if (this.atKeyword('function')) {
      return this.functionDecl();
    }

    if (this.atKeyword('defparam')) {
      throw new ParseError(line, "'defparam' is not supported; use parameter override at instantiation");
    }

    if (this.atKeyword('integer')) {
      throw new ParseError(line, "'integer' is not supported; use reg [31:0] for wide counters");
    }

    if (this.atKeyword('signed')) {
      throw new ParseError(line, "'signed' is not supported in this teaching subset (use unsigned)");
    }

    if (this.atKeyword('casex') || this.atKeyword('casez')) {
      throw new ParseError(line, `'${t.text}' is not supported in this teaching subset; use 'case'`);
    }

    // module instance:  modname [#(...)] instname ( ... ) ;
    if (t.type === 'id' && !KEYWORDS.has(t.text)) {
      const module = this.next().text;
      const params: ParamAssign[] = [];
      if (this.at('#')) {
        this.next();
        this.eat('(');
        if (!this.at(')')) {
          for (;;) {
            if (this.at('.')) {
              this.next();
              const pn = this.id('parameter name').text;
              this.eat('(');
              const e = this.expr();
              this.eat(')');
              params.push({ kind: 'paramassign', line, name: pn, expr: e });
            } else {
              const e = this.expr();
              params.push({ kind: 'paramassign', line, name: `#${params.length}`, expr: e });
            }
            if (this.at(',')) { this.next(); continue; }
            break;
          }
        }
        this.eat(')');
      }
      const name = this.id('instance name').text;
      this.eat('(');
      const conns: { port: string; expr: Expr | null }[] = [];
      if (!this.at(')')) {
        for (;;) {
          if (this.at('.')) {
            this.next();
            const pn = this.id('port name').text;
            this.eat('(');
            const e = this.at(')') ? null : this.expr();
            this.eat(')');
            conns.push({ port: pn, expr: e });
          } else {
            const e = this.expr();
            conns.push({ port: `#${conns.length}`, expr: e });
          }
          if (this.at(',')) { this.next(); continue; }
          break;
        }
      }
      this.eat(')');
      this.eat(';');
      const inst: InstanceDecl = { kind: 'instance', line, module, params, name, conns };
      return inst;
    }

    throw new ParseError(line, `unexpected token '${t.text}' in module body`);
  }

  functionDecl(): FunctionDecl {
    const kw = this.eatKeyword('function');
    const range = this.range();
    const name = this.id('function name').text;
    const ports: PortDecl[] = [];
    const decls: ModuleItem[] = [];
    let body: Stmt | null = null;
    if (this.at('(')) {
      // ANSI style: function [7:0] f(input [3:0] a, input b); ... endfunction
      this.next();
      if (!this.at(')')) {
        for (;;) {
          ports.push(this.funArg());
          if (this.at(',')) { this.next(); continue; }
          break;
        }
      }
      this.eat(')');
      this.eat(';');
      body = this.stmtSeqUntilEndfunction();
    } else {
      this.eat(';');
      // old style: input [3:0] a; local decls; statements
      while (!this.atKeyword('begin') && !this.atKeyword('endfunction') && this.peek().type !== 'eof') {
        if (this.atKeyword('input')) {
          const line = this.line();
          this.next();
          this.optTypeKw();
          this.optSigned();
          const rg = this.range();
          for (;;) {
            const pn = this.id('argument name').text;
            ports.push({ kind: 'port', line, dir: 'input', netType: null, signed: false, range: rg, name: pn, defaultExpr: null });
            if (this.at(',')) { this.next(); continue; }
            break;
          }
          this.eat(';');
        } else if (this.atKeyword('reg') || this.atKeyword('wire') || this.atKeyword('parameter') || this.atKeyword('localparam')) {
          decls.push(this.moduleItem());
          while (this.pending.length) decls.push(this.pending.shift()!);
        } else {
          throw new ParseError(this.line(), `unexpected token in function header: '${this.peek().text}'`);
        }
      }
      body = this.stmtSeqUntilEndfunction();
    }
    this.eatKeyword('endfunction');
    return { kind: 'function', line: kw.line, range, name, ports, decls, body: body! };
  }

  funArg(): PortDecl {
    const dirKw = this.peek();
    if (!this.atKeyword('input')) {
      throw new ParseError(dirKw.line, "function arguments must be declared 'input'");
    }
    this.next();
    this.optTypeKw();
    this.optSigned();
    const rg = this.range();
    const pn = this.id('argument name').text;
    return { kind: 'port', line: dirKw.line, dir: 'input', netType: null, signed: false, range: rg, name: pn, defaultExpr: null };
  }

  stmtSeqUntilEndfunction(): Stmt {
    const line = this.line();
    const stmts: Stmt[] = [];
    while (!this.atKeyword('endfunction') && this.peek().type !== 'eof') {
      stmts.push(this.stmt());
    }
    return { kind: 'block', line, stmts };
  }

  // ---------- statements ----------

  stmt(): Stmt {
    const t = this.peek();
    const line = t.line;

    if (this.atKeyword('begin')) {
      this.next();
      const stmts: Stmt[] = [];
      while (!this.atKeyword('end')) {
        if (this.peek().type === 'eof') throw new ParseError(line, "missing 'end'");
        stmts.push(this.stmt());
      }
      this.eatKeyword('end');
      return { kind: 'block', line, stmts };
    }

    if (this.atKeyword('if')) {
      this.next();
      this.eat('(');
      const cond = this.expr();
      this.eat(')');
      const then = this.stmt();
      let els: Stmt | null = null;
      if (this.atKeyword('else')) {
        this.next();
        els = this.stmt();
      }
      return { kind: 'if', line, cond, then, else: els };
    }

    if (this.atKeyword('case')) {
      this.next();
      this.eat('(');
      const subject = this.expr();
      this.eat(')');
      const items: { test: Expr | null; body: Stmt }[] = [];
      while (!this.atKeyword('endcase')) {
        if (this.peek().type === 'eof') throw new ParseError(line, "missing 'endcase'");
        let test: Expr | null;
        if (this.atKeyword('default')) {
          this.next();
          test = null;
          if (this.at(':')) this.next();
        } else {
          test = this.expr();
          this.eat(':');
        }
        const body = this.stmt();
        items.push({ test, body });
      }
      this.eatKeyword('endcase');
      return { kind: 'case', line, subject, items };
    }

    if (this.atKeyword('for')) {
      this.next();
      this.eat('(');
      const lhs = this.lvalue();
      this.eat('=');
      const initRhs = this.expr();
      this.eat(';');
      const cond = this.expr();
      this.eat(';');
      const stepLhs = this.lvalue();
      const isEq = this.at('=');
      const isLe = this.at('<=');
      if (!isEq && !isLe) throw new ParseError(line, "expected '=' or '<=' in for-step");
      this.next();
      const stepRhs = this.expr();
      this.eat(')');
      const init: ForInit = { isBlocking: true, lhs, rhs: initRhs };
      const step: ForInit = { isBlocking: isEq, lhs: stepLhs, rhs: stepRhs };
      const body = this.stmt();
      return { kind: 'for', line, init, cond, step, body };
    }

    if (this.atKeyword('while')) {
      this.next();
      this.eat('(');
      const cond = this.expr();
      this.eat(')');
      const body = this.stmt();
      return { kind: 'while', line, cond, body };
    }

    if (this.atKeyword('repeat')) {
      this.next();
      this.eat('(');
      const count = this.expr();
      this.eat(')');
      const body = this.stmt();
      return { kind: 'repeat', line, count, body };
    }

    if (this.atKeyword('forever')) {
      this.next();
      const body = this.stmt();
      return { kind: 'forever', line, body };
    }

    if (this.at('#')) {
      this.next();
      const amount = this.primary();
      let body: Stmt | null = null;
      if (!this.at(';')) body = this.stmt();
      else this.eat(';');
      return { kind: 'delay', line, amount, body };
    }

    if (this.at('@')) {
      this.next();
      this.eat('(');
      const edges: EdgeSpec[] = [];
      for (;;) {
        if (this.atKeyword('posedge') || this.atKeyword('negedge')) {
          const e = this.next().text === 'posedge' ? 'pos' : 'neg';
          const sig = this.id('signal').text;
          edges.push({ edge: e, sig });
        } else {
          const sig = this.id('signal').text;
          edges.push({ edge: 'level', sig });
        }
        if (this.atKeyword('or')) { this.next(); continue; }
        break;
      }
      this.eat(')');
      let body: Stmt | null = null;
      if (!this.at(';')) body = this.stmt();
      else this.eat(';');
      return { kind: 'eventwait', line, edges, body };
    }

    if (t.type === 'sysid') {
      const name = this.next().text;
      const args: Expr[] = [];
      if (this.at('(')) {
        this.next();
        if (!this.at(')')) {
          for (;;) {
            args.push(this.expr());
            if (this.at(',')) { this.next(); continue; }
            break;
          }
        }
        this.eat(')');
      }
      this.eat(';');
      return { kind: 'sys', line, name, args };
    }

    if (this.atKeyword('disable')) {
      this.next();
      const label = this.id('label').text;
      this.eat(';');
      return { kind: 'disable', line, label };
    }

    // assignment statement: lvalue = expr ;  |  lvalue <= expr ;
    {
      const lhs = this.lvalue();
      if (this.at('=')) {
        this.next();
        const rhs = this.expr();
        this.eat(';');
        return { kind: 'blocking', line, lhs, rhs };
      }
      if (this.at('<=')) {
        this.next();
        const rhs = this.expr();
        this.eat(';');
        return { kind: 'nonblocking', line, lhs, rhs };
      }
      const nm = (lhs as { name?: string }).name ?? '';
      throw new ParseError(line, `expected '=' or '<=' after '${nm}' in statement`);
    }
  }

  lvalue(): LValue {
    if (this.at('{')) {
      // concatenation lvalue: {a, b[3:0], c}
      const line = this.peek().line;
      this.next();
      const parts: LValue[] = [];
      for (;;) {
        if (this.at('{')) throw new ParseError(this.peek().line, 'nested concatenation lvalue is not supported');
        parts.push(this.lvalue());
        if (this.at(',')) { this.next(); continue; }
        break;
      }
      this.eat('}');
      return { kind: 'lvconcat', line, parts };
    }
    const t = this.id('lvalue');
    const line = t.line;
    const name = t.text;
    if (this.at('[')) {
      this.next();
      const first = this.expr();
      if (this.at(':')) {
        this.next();
        const second = this.expr();
        this.eat(']');
        return { kind: 'lvpart', line, name, msb: first, lsb: second };
      }
      this.eat(']');
      return { kind: 'lvindex', line, name, index: first };
    }
    return { kind: 'lvid', line, name };
  }

  // ---------- expressions ----------

  expr(): Expr {
    return this.condExpr();
  }

  condExpr(): Expr {
    const cond = this.orExpr();
    if (this.at('?')) {
      const line = this.peek().line;
      this.next();
      const then = this.expr();
      this.eat(':');
      const els = this.condExpr();
      return { kind: 'cond', line, cond, then, else: els };
    }
    return cond;
  }

  orExpr(): Expr {
    let left = this.logAndExpr();
    while (this.at('||')) {
      const line = this.peek().line;
      this.next();
      const right = this.logAndExpr();
      left = { kind: 'binary', line, op: '||', left, right };
    }
    return left;
  }

  logAndExpr(): Expr {
    let left = this.bitOrExpr();
    while (this.at('&&')) {
      const line = this.peek().line;
      this.next();
      const right = this.bitOrExpr();
      left = { kind: 'binary', line, op: '&&', left, right };
    }
    return left;
  }

  bitOrExpr(): Expr {
    let left = this.bitXorExpr();
    while (this.at('|')) {
      const line = this.peek().line;
      this.next();
      const right = this.bitXorExpr();
      left = { kind: 'binary', line, op: '|', left, right };
    }
    return left;
  }

  bitXorExpr(): Expr {
    let left = this.bitAndExpr();
    while (this.at('^')) {
      const line = this.peek().line;
      this.next();
      const right = this.bitAndExpr();
      left = { kind: 'binary', line, op: '^', left, right };
    }
    return left;
  }

  bitAndExpr(): Expr {
    let left = this.eqExpr();
    while (this.at('&')) {
      const line = this.peek().line;
      this.next();
      const right = this.eqExpr();
      left = { kind: 'binary', line, op: '&', left, right };
    }
    return left;
  }

  eqExpr(): Expr {
    let left = this.relExpr();
    for (;;) {
      let op: string | null = null;
      const line = this.peek().line;
      if (this.at('==')) op = '==';
      else if (this.at('!=')) op = '!=';
      else if (this.at('===')) op = '===';
      else if (this.at('!==')) op = '!==';
      else break;
      this.next();
      const right = this.relExpr();
      left = { kind: 'binary', line, op, left, right };
    }
    return left;
  }

  relExpr(): Expr {
    let left = this.shiftExpr();
    for (;;) {
      let op: string | null = null;
      const line = this.peek().line;
      if (this.at('<=')) op = '<=';
      else if (this.at('>=')) op = '>=';
      else if (this.at('<')) op = '<';
      else if (this.at('>')) op = '>';
      else break;
      this.next();
      const right = this.shiftExpr();
      left = { kind: 'binary', line, op, left, right };
    }
    return left;
  }

  shiftExpr(): Expr {
    let left = this.addExpr();
    for (;;) {
      let op: string | null = null;
      const line = this.peek().line;
      if (this.at('<<<')) op = '<<<';
      else if (this.at('>>>')) op = '>>>';
      else if (this.at('<<')) op = '<<';
      else if (this.at('>>')) op = '>>';
      else break;
      this.next();
      const right = this.addExpr();
      left = { kind: 'binary', line, op, left, right };
    }
    return left;
  }

  addExpr(): Expr {
    let left = this.mulExpr();
    for (;;) {
      let op: string | null = null;
      const line = this.peek().line;
      if (this.at('+')) op = '+';
      else if (this.at('-')) op = '-';
      else break;
      this.next();
      const right = this.mulExpr();
      left = { kind: 'binary', line, op, left, right };
    }
    return left;
  }

  mulExpr(): Expr {
    let left = this.unaryExpr();
    for (;;) {
      let op: string | null = null;
      const line = this.peek().line;
      if (this.at('*')) op = '*';
      else if (this.at('/')) op = '/';
      else if (this.at('%')) op = '%';
      else if (this.at('**')) op = '**';
      else break;
      this.next();
      const right = this.unaryExpr();
      left = { kind: 'binary', line, op, left, right };
    }
    return left;
  }

  unaryExpr(): Expr {
    const t = this.peek();
    const line = t.line;
    if (this.at('~') || this.at('!') || this.at('+') || this.at('-') || this.at('&') || this.at('|') || this.at('^')) {
      const op = this.next().text as '+' | '-' | '~' | '!' | '&' | '|' | '^';
      if (op === '~' && (this.at('&') || this.at('|') || this.at('^'))) {
        const op2 = this.next().text;
        const operand = this.unaryExpr();
        return { kind: 'unary', line, op: (op + op2) as '~&' | '~|' | '~^', operand };
      }
      if (op === '^' && this.at('~')) {
        this.next();
        const operand = this.unaryExpr();
        return { kind: 'unary', line, op: '^~', operand };
      }
      const operand = this.unaryExpr();
      return { kind: 'unary', line, op, operand };
    }
    return this.primary();
  }

  primary(): Expr {
    const t = this.peek();
    const line = t.line;

    if (this.at('(')) {
      this.next();
      const e = this.expr();
      this.eat(')');
      return e;
    }

    if (this.at('{')) {
      this.next();
      // replication: { n { ... } }
      if (this.at('{')) {
        this.next();
        const count = this.expr();
        this.eat('{');
        const parts: Expr[] = [];
        for (;;) {
          parts.push(this.expr());
          if (this.at(',')) { this.next(); continue; }
          break;
        }
        this.eat('}');
        this.eat('}');
        const rep: Expr = parts.length === 1
          ? { kind: 'repl', line, count, value: parts[0] }
          : { kind: 'repl', line, count, value: { kind: 'concat', line, parts } };
        // { {n{x}}, y, ... }: replication as the first part of a larger concatenation
        if (this.at(',')) {
          const cparts: Expr[] = [rep];
          while (this.at(',')) {
            this.next();
            cparts.push(this.expr());
          }
          this.eat('}');
          return { kind: 'concat', line, parts: cparts };
        }
        return rep;
      }
      const parts: Expr[] = [];
      for (;;) {
        parts.push(this.expr());
        if (this.at(',')) { this.next(); continue; }
        break;
      }
      this.eat('}');
      return { kind: 'concat', line, parts };
    }

    if (t.type === 'num') {
      this.next();
      return this.numLit(t.text, line);
    }

    if (t.type === 'str') {
      this.next();
      return { kind: 'str', line, value: t.text };
    }

    if (t.type === 'sysid') {
      this.next();
      const name = t.text;
      if (this.at('(')) {
        this.next();
        const args: Expr[] = [];
        if (!this.at(')')) {
          for (;;) {
            args.push(this.expr());
            if (this.at(',')) { this.next(); continue; }
            break;
          }
        }
        this.eat(')');
        return { kind: 'call', line, name, args };
      }
      return { kind: 'call', line, name, args: [] };
    }

    if (t.type === 'id' && !KEYWORDS.has(t.text)) {
      this.next();
      const name = t.text;
      // hierarchical reference?
      const path = [name];
      while (this.at('.')) {
        const nt = this.peek(1);
        if (nt.type === 'id' && !KEYWORDS.has(nt.text)) {
          this.next();
          path.push(this.id('hierarchical name').text);
        } else break;
      }
      if (path.length > 1) return { kind: 'hier', line, path };

      // function call?
      if (this.at('(')) {
        this.next();
        const args: Expr[] = [];
        if (!this.at(')')) {
          for (;;) {
            args.push(this.expr());
            if (this.at(',')) { this.next(); continue; }
            break;
          }
        }
        this.eat(')');
        return { kind: 'call', line, name, args };
      }
      // select
      if (this.at('[')) {
        this.next();
        const first = this.expr();
        if (this.at(':')) {
          this.next();
          const second = this.expr();
          this.eat(']');
          return { kind: 'part', line, base: { kind: 'id', line, name }, msb: first, lsb: second };
        }
        this.eat(']');
        return { kind: 'index', line, base: { kind: 'id', line, name }, index: first };
      }
      return { kind: 'id', line, name };
    }

    throw new ParseError(line, `unexpected token '${t.text || 'end of file'}' in expression`);
  }

  numLit(text: string, line: number): Expr {
    const m = /^([0-9][0-9_]*)?'([sS]?)([bodhBODH])([0-9a-fA-FxXzZ?_]+)$/.exec(text);
    if (m) {
      const sizeStr = m[1];
      const baseCh = m[3].toLowerCase();
      const base = baseCh === 'b' ? 2 : baseCh === 'o' ? 8 : baseCh === 'h' ? 16 : 10;
      const width = sizeStr ? parseInt(sizeStr.replace(/_/g, ''), 10) : null;
      if (base === 10 && /[xXzZ?]/.test(m[4])) {
        throw new ParseError(line, "x/z digits are only allowed in 'b/'o/'h literals");
      }
      if (width !== null && width > 4096) {
        throw new ParseError(line, `literal width ${width} is too large (max 4096)`);
      }
      return { kind: 'num', line, width, base: base as 2 | 8 | 10 | 16, digits: m[4] };
    }
    const plain = /^([0-9][0-9_]*)$/.exec(text);
    if (plain) {
      return { kind: 'num', line, width: null, base: 10, digits: plain[1] };
    }
    throw new ParseError(line, `malformed number literal '${text}'`);
  }
}

export function parseModule(src: string): SourceItem[] {
  return new Parser(src).parseSource();
}

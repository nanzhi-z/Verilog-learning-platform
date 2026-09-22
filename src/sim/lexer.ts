/** Tokenizer for the Verilog teaching subset. */

export interface Token {
  type: 'id' | 'sysid' | 'num' | 'str' | 'punct' | 'eof';
  text: string;
  line: number;
  col: number;
}

export class LexError extends Error {
  line: number;
  constructor(line: number, msg: string) {
    super(msg);
    this.line = line;
  }
}

const PUNCTS = [
  '<<<=',
  '>>>=',
  '===',
  '!==',
  '<<<',
  '>>>',
  '<=',
  '>=',
  '==',
  '!=',
  '&&',
  '||',
  '**',
  '<<',
  '>>',
  '~&',
  '~|',
  '^~',
  '~^',
  ':',
  ',',
  ';',
  '(',
  ')',
  '[',
  ']',
  '{',
  '}',
  '.',
  '#',
  '@',
  '+',
  '-',
  '*',
  '/',
  '%',
  '&',
  '|',
  '^',
  '~',
  '!',
  '?',
  '=',
  '<',
  '>',
];

export function tokenize(src: string): Token[] {
  const toks: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;
  const n = src.length;

  const push = (type: Token['type'], text: string) => {
    toks.push({ type, text, line, col });
  };

  while (i < n) {
    const c = src[i];

    // whitespace
    if (c === ' ' || c === '\t' || c === '\r') {
      i++; col++;
      continue;
    }
    if (c === '\n') {
      i++; line++; col = 1;
      continue;
    }

    // comments
    if (c === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') { i++; col++; }
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const startLine = line;
      i += 2; col += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] === '\n') { line++; col = 1; } else col++;
        i++;
      }
      if (i >= n) throw new LexError(startLine, 'unterminated block comment');
      i += 2; col += 2;
      continue;
    }

    // compiler directive `timescale ... — skip whole line silently
    if (c === '`') {
      while (i < n && src[i] !== '\n') { i++; col++; }
      continue;
    }

    // strings
    if (c === '"') {
      const startLine = line;
      i++; col++;
      let s = '';
      while (i < n && src[i] !== '"') {
        if (src[i] === '\\' && i + 1 < n) {
          s += src[i] + src[i + 1];
          i += 2; col += 2;
        } else {
          if (src[i] === '\n') { line++; col = 1; } else col++;
          s += src[i];
          i++;
        }
      }
      if (i >= n) throw new LexError(startLine, 'unterminated string');
      i++; col++;
      push('str', s);
      continue;
    }

    // system identifiers: $display, $finish, $time ...
    if (c === '$') {
      const m = /^[$A-Za-z_][$A-Za-z0-9_]*/.exec(src.slice(i));
      if (!m) throw new LexError(line, `stray '$'`);
      push('sysid', m[0]);
      i += m[0].length; col += m[0].length;
      continue;
    }

    // identifiers / keywords
    if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][$A-Za-z0-9_]*/.exec(src.slice(i))!;
      push('id', m[0]);
      i += m[0].length; col += m[0].length;
      continue;
    }

    // numbers:  [size]'s?base digits  |  decimal
    if (/[0-9]/.test(c)) {
      const m = /^[0-9][0-9_]*('s?[bodhBODH][0-9a-fA-FxXzZ?_]+)?/.exec(src.slice(i))!;
      // handle possible 'sb / 'sh etc
      let len = m[0].length;
      // also accept uppercase S
      const m2 = /^[0-9][0-9_]*'[sS]?[bodhBODH][0-9a-fA-FxXzZ?_]+/.exec(src.slice(i));
      if (m2 && m2[0].length > len) len = m2[0].length;
      const text = src.slice(i, i + len);
      push('num', text);
      i += len; col += len;
      continue;
    }

    // punctuation
    let matched = false;
    for (const p of PUNCTS) {
      if (src.startsWith(p, i)) {
        push('punct', p);
        i += p.length; col += p.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    throw new LexError(line, `unexpected character '${c}'`);
  }

  toks.push({ type: 'eof', text: '', line, col });
  return toks;
}

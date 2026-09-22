/**
 * 4-value logic bit and vector implementation.
 * Bits are stored LSB-first. Width is fixed per Vec.
 * Teaching subset: unsigned arithmetic only.
 */
export type Bit = 0 | 1 | 'x' | 'z';

export const X: Bit = 'x';
export const Z: Bit = 'z';

/** treat z as x for most operations */
const zx = (b: Bit): 0 | 1 | 'x' => (b === 'z' ? 'x' : b);

/** Verilog bitwise AND table (x/z semantics) */
export function and2(a: Bit, b: Bit): Bit {
  const p = zx(a), q = zx(b);
  if (p === 0 || q === 0) return 0;
  if (p === 'x' || q === 'x') return X;
  return 1;
}

export function or2(a: Bit, b: Bit): Bit {
  const p = zx(a), q = zx(b);
  if (p === 1 || q === 1) return 1;
  if (p === 'x' || q === 'x') return X;
  return 0;
}

export function xor2(a: Bit, b: Bit): Bit {
  const p = zx(a), q = zx(b);
  if (p === 'x' || q === 'x') return X;
  return (p ^ q) as 0 | 1;
}

export function not1(a: Bit): Bit {
  const p = zx(a);
  if (p === 'x') return X;
  return (1 - p) as 0 | 1;
}

export class Vec {
  bits: Bit[]; // LSB first, fixed length

  constructor(bits: Bit[]) {
    this.bits = bits;
  }

  get width(): number {
    return this.bits.length;
  }

  static zero(width: number): Vec {
    return new Vec(new Array(width).fill(0));
  }

  static fill(width: number, b: Bit): Vec {
    return new Vec(new Array(width).fill(b));
  }

  static xes(width: number): Vec {
    return Vec.fill(width, X);
  }

  static ones(width: number): Vec {
    return Vec.fill(width, 1);
  }

  static fromNumber(n: number, width: number): Vec {
    // negative n → two's complement truncation
    const bits: Bit[] = [];
    let v = BigInt(Math.trunc(n));
    const mask = (1n << BigInt(width)) - 1n;
    v &= mask;
    for (let i = 0; i < width; i++) {
      bits.push(Number((v >> BigInt(i)) & 1n) as 0 | 1);
    }
    return new Vec(bits);
  }

  /** parse digits string of given base, digits may contain x/X/z/Z/? (in based literals) */
  static parseBits(digits: string, base: number, width: number): Vec {
    if (base === 10) {
      return Vec.fromNumber(parseInt(digits.replace(/_/g, ''), 10), width);
    }
    const digitBits = base === 2 ? 1 : base === 8 ? 3 : 4;
    // build MSB-first bit sequence (digits in string are MSB digit first)
    const msbFirst: Bit[] = [];
    for (const ch of digits) {
      if (ch === '_') continue;
      if (ch === 'x' || ch === 'X' || ch === '?') {
        for (let i = 0; i < digitBits; i++) msbFirst.push(X);
      } else if (ch === 'z' || ch === 'Z') {
        for (let i = 0; i < digitBits; i++) msbFirst.push(Z);
      } else {
        const v = parseInt(ch, base);
        if (Number.isNaN(v)) throw new Error(`bad digit '${ch}' in based literal`);
        for (let i = digitBits - 1; i >= 0; i--) msbFirst.push(((v >> i) & 1) as 0 | 1);
      }
    }
    const lsbFirst = msbFirst.slice().reverse();
    const out: Bit[] = new Array(width).fill(0);
    for (let i = 0; i < Math.min(width, lsbFirst.length); i++) out[i] = lsbFirst[i];
    return new Vec(out);
  }

  /** decimal number literal (unsized semantics handled by caller) */
  static fromDecimalString(s: string, width: number): Vec {
    const n = parseInt(s.replace(/_/g, ''), 10);
    return Vec.fromNumber(n, width);
  }

  isKnown(): boolean {
    return this.bits.every((b) => b === 0 || b === 1);
  }

  toNumber(): number | null {
    if (!this.isKnown()) return null;
    let v = 0;
    for (let i = this.width - 1; i >= 0; i--) v = v * 2 + (this.bits[i] as 0 | 1);
    return v;
  }

  isFalse(): boolean {
    return this.isKnown() && this.toNumber()! === 0;
  }

  /** 1 if known nonzero, 0 if known zero, x otherwise */
  toBool(): 0 | 1 | 'x' {
    if (!this.isKnown()) return 'x';
    return this.toNumber()! !== 0 ? 1 : 0;
  }

  resize(width: number): Vec {
    const out = new Array<Bit>(width);
    for (let i = 0; i < width; i++) {
      out[i] = i < this.width ? this.bits[i] : 0; // zero-extend (unsigned semantics)
    }
    return new Vec(out);
  }

  slice(hi: number, lo: number): Vec {
    const out: Bit[] = [];
    for (let i = lo; i <= hi; i++) out.push(i < this.width ? this.bits[i] : X);
    return new Vec(out);
  }

  bit(i: number): Bit {
    return i >= 0 && i < this.width ? this.bits[i] : X;
  }

  withBit(i: number, b: Bit): Vec {
    const bits = this.bits.slice();
    if (i >= 0 && i < bits.length) bits[i] = b;
    return new Vec(bits);
  }

  withSlice(hi: number, lo: number, v: Vec): Vec {
    const bits = this.bits.slice();
    for (let i = lo; i <= hi; i++) {
      const j = i - lo;
      if (i >= 0 && i < bits.length && j < v.width) bits[i] = v.bits[j];
    }
    return new Vec(bits);
  }

  static concat(vecs: Vec[]): Vec {
    const bits: Bit[] = [];
    // first vec is MSB part
    for (let k = vecs.length - 1; k >= 0; k--) for (const b of vecs[k].bits) bits.push(b);
    return new Vec(bits);
  }

  // ---- operations (result width = max) ----

  private map2(o: Vec, f: (a: Bit, b: Bit) => Bit): Vec {
    const w = Math.max(this.width, o.width);
    const a = this.resize(w), b = o.resize(w);
    const out: Bit[] = [];
    for (let i = 0; i < w; i++) out.push(f(a.bits[i], b.bits[i]));
    return new Vec(out);
  }

  and(o: Vec): Vec { return this.map2(o, and2); }
  or(o: Vec): Vec { return this.map2(o, or2); }
  xor(o: Vec): Vec { return this.map2(o, xor2); }

  not(): Vec {
    return new Vec(this.bits.map(not1));
  }

  reduce(op: '&' | '|' | '^' | '~&' | '~|' | '~^'): Vec {
    let acc: Bit = op === '&' || op === '~&' ? 1 : op === '|' || op === '~|' ? 0 : 0;
    for (let i = 0; i < this.width; i++) {
      const b = this.bits[i];
      if (op === '&' || op === '~&') acc = and2(acc, b);
      else if (op === '|' || op === '~|') acc = or2(acc, b);
      else acc = xor2(acc, b);
    }
    if (op === '~&') acc = not1(acc);
    if (op === '~|') acc = not1(acc);
    if (op === '~^') acc = not1(acc);
    return new Vec([acc]);
  }

  add(o: Vec): Vec {
    const w = Math.max(this.width, o.width);
    if (!this.isKnown() || !o.isKnown()) return Vec.xes(w);
    return Vec.fromNumber(this.toNumber()! + o.toNumber()!, w);
  }

  sub(o: Vec): Vec {
    const w = Math.max(this.width, o.width);
    if (!this.isKnown() || !o.isKnown()) return Vec.xes(w);
    return Vec.fromNumber(this.toNumber()! - o.toNumber()!, w);
  }

  mul(o: Vec): Vec {
    const w = Math.max(this.width, o.width);
    if (!this.isKnown() || !o.isKnown()) return Vec.xes(w);
    return Vec.fromNumber(this.toNumber()! * o.toNumber()!, w);
  }

  div(o: Vec): Vec {
    const w = Math.max(this.width, o.width);
    if (!this.isKnown() || !o.isKnown()) return Vec.xes(w);
    const d = o.toNumber()!;
    if (d === 0) return Vec.xes(w);
    return Vec.fromNumber(Math.floor(this.toNumber()! / d), w);
  }

  mod(o: Vec): Vec {
    const w = Math.max(this.width, o.width);
    if (!this.isKnown() || !o.isKnown()) return Vec.xes(w);
    const d = o.toNumber()!;
    if (d === 0) return Vec.xes(w);
    return Vec.fromNumber(this.toNumber()! % d, w);
  }

  pow(o: Vec): Vec {
    const w = Math.max(this.width, o.width);
    if (!this.isKnown() || !o.isKnown()) return Vec.xes(w);
    return Vec.fromNumber(Math.pow(this.toNumber()!, o.toNumber()!), w);
  }

  /** numeric power for replication counts etc. (throws if unknown) */
  requireNumber(what: string): number {
    const n = this.toNumber();
    if (n === null) throw new Error(`${what} must be a known constant, got x/z`);
    return n;
  }

  lt(o: Vec): Vec {
    if (!this.isKnown() || !o.isKnown()) return new Vec([X]);
    return new Vec([(this.toNumber()! < o.toNumber()! ? 1 : 0) as 0 | 1]);
  }
  le(o: Vec): Vec {
    if (!this.isKnown() || !o.isKnown()) return new Vec([X]);
    return new Vec([(this.toNumber()! <= o.toNumber()! ? 1 : 0) as 0 | 1]);
  }
  gt(o: Vec): Vec {
    if (!this.isKnown() || !o.isKnown()) return new Vec([X]);
    return new Vec([(this.toNumber()! > o.toNumber()! ? 1 : 0) as 0 | 1]);
  }
  ge(o: Vec): Vec {
    if (!this.isKnown() || !o.isKnown()) return new Vec([X]);
    return new Vec([(this.toNumber()! >= o.toNumber()! ? 1 : 0) as 0 | 1]);
  }

  /** logical equality: x if either unknown */
  eq(o: Vec): Vec {
    if (!this.isKnown() || !o.isKnown()) return new Vec([X]);
    return new Vec([(this.toNumber() === o.toNumber() ? 1 : 0) as 0 | 1]);
  }
  ne(o: Vec): Vec {
    const e = this.eq(o);
    if (e.bits[0] === X) return e;
    return e.not();
  }

  /** case equality: compares x/z bitwise, never x */
  caseEq(o: Vec): Vec {
    const w = Math.max(this.width, o.width);
    const a = this.resize(w), b = o.resize(w);
    let r: 0 | 1 = 1;
    for (let i = 0; i < w; i++) if (a.bits[i] !== b.bits[i]) r = 0;
    return new Vec([r]);
  }
  caseNe(o: Vec): Vec {
    return this.caseEq(o).not();
  }

  shiftLeft(o: Vec): Vec {
    if (!o.isKnown()) return Vec.xes(this.width);
    const n = o.toNumber()!;
    if (n >= this.width) return Vec.zero(this.width);
    const bits = new Array<Bit>(this.width).fill(0);
    for (let i = this.width - 1; i >= 0; i--) {
      const src = i - n;
      bits[i] = src >= 0 ? this.bits[src] : 0;
    }
    return new Vec(bits);
  }

  shiftRight(o: Vec): Vec {
    if (!o.isKnown()) return Vec.xes(this.width);
    const n = o.toNumber()!;
    if (n >= this.width) return Vec.zero(this.width);
    const bits = new Array<Bit>(this.width).fill(0);
    for (let i = 0; i < this.width; i++) {
      const src = i + n;
      bits[i] = src < this.width ? this.bits[src] : 0;
    }
    return new Vec(bits);
  }

  arithShiftRight(o: Vec): Vec {
    if (!o.isKnown()) return Vec.xes(this.width);
    const n = o.toNumber()!;
    const sign = this.bits[this.width - 1];
    const bits = new Array<Bit>(this.width).fill(sign === 'x' || sign === 'z' ? X : sign);
    for (let i = 0; i < this.width && i + n < this.width; i++) {
      bits[i] = this.bits[i + n];
    }
    return new Vec(bits);
  }

  logicalNot(): Vec {
    return new Vec([not1(this.toBool() as Bit)]);
  }

  // ---- formatting ----

  /** binary string MSB first, with x/z characters */
  toBinString(): string {
    let s = '';
    for (let i = this.width - 1; i >= 0; i--) s += String(this.bits[i]);
    return s;
  }

  private hexDigit(b: Bit[]): string {
    if (b.some((x) => x === 'x')) return 'x';
    if (b.some((x) => x === 'z')) return 'z';
    return b.reduce<number>((acc, x, i) => acc + (x === 1 ? 1 << i : 0), 0).toString(16);
  }

  toHexString(): string {
    if (this.width === 0) return '';
    let s = '';
    for (let i = this.width - 4; i >= 0 || s === ''; i -= 4) {
      let nib: Bit[];
      if (i >= 0) nib = this.bits.slice(i, i + 4);
      else {
        nib = this.bits.slice(0, i + 4);
        while (nib.length < 4) nib.push(0); // zero pad high
      }
      s += this.hexDigit(nib);
      if (i <= 0) break;
    }
    return s;
  }

  toOctString(): string {
    let s = '';
    for (let i = this.width - 3; i >= 0; i -= 3) {
      const g = this.bits.slice(i, i + 3);
      while (g.length < 3) g.push(0);
      if (g.some((x) => x === 'x')) s += 'x';
      else if (g.some((x) => x === 'z')) s += 'z';
      else s += g.reduce<number>((acc, x, j) => acc + (x === 1 ? 1 << j : 0), 0).toString(8);
    }
    return s === '' ? '0' : s;
  }

  toDecString(): string {
    if (!this.isKnown()) return 'x';
    return String(this.toNumber()!);
  }

  format(kind: 'b' | 'd' | 'h' | 'o' | 's'): string {
    switch (kind) {
      case 'b': return this.toBinString();
      case 'd': return this.toDecString();
      case 'h': return this.toHexString();
      case 'o': return this.toOctString();
      case 's': return this.toBinString();
    }
  }

  equals(o: Vec): boolean {
    if (this.width !== o.width) return false;
    for (let i = 0; i < this.width; i++) if (this.bits[i] !== o.bits[i]) return false;
    return true;
  }

  clone(): Vec {
    return new Vec(this.bits.slice());
  }

  toString(): string {
    return `Vec(${this.toBinString()})`;
  }
}

/** format a 32-bit time value for %t */
export function timeVec(t: number): Vec {
  return Vec.fromNumber(t, 32);
}

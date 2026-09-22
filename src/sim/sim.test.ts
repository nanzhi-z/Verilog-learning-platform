import { describe, it, expect } from 'vitest';
import { simulate } from './index';

const n = (s: string) => s.split('\n').map((l) => l.trim()).join('\n');

describe('values & formatting', () => {
  it('formats binary/hex/decimal with x', () => {
    const r = simulate(`
module tb;
  reg [3:0] a = 4'b10x1;
  initial begin
    $display("%b %h %d", a, a, a);
    a = 4'hA;
    $display("%b %h %d", a, a, a);
    $finish;
  end
endmodule
`);
    expect(r.errors).toEqual([]);
    expect(r.console[0]).toBe('10x1 x x');
    expect(r.console[1]).toBe('1010 a 10');
  });
});

describe('combinational logic', () => {
  it('assign with mux and operators', () => {
    const r = simulate(`
module top(a, b, sel, y);
  input a, b, sel;
  output y;
  assign y = sel ? (a ^ b) : (a & b) | (~a & ~b);
endmodule
module tb;
  reg a, b, sel;
  wire y;
  top dut(.a(a), .b(b), .sel(sel), .y(y));
  reg [31:0] pass = 0;
  initial begin
    a=0; b=0; sel=0; #10;
    if (y === 1'b1) pass = pass + 1; else $display("FAIL sel=0 a=0 b=0 y=%b", y);
    sel=1; #10;
    if (y === 1'b0) pass = pass + 1; else $display("FAIL sel=1 a=0 b=0 y=%b", y);
    a=1; b=1; sel=0; #10;
    if (y === 1'b1) pass = pass + 1; else $display("FAIL sel=0 a=1 b=1 y=%b", y);
    if (pass == 3) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule
`);
    expect(r.errors).toEqual([]);
    expect(r.console.join('\\n')).toContain('ALL TESTS PASSED');
  });

  it('always @(*) with case', () => {
    const r = simulate(`
module top(sel, a, b, c, d, y);
  input [1:0] sel;
  input [3:0] a, b, c, d;
  output reg [3:0] y;
  always @(*) begin
    case (sel)
      2'd0: y = a;
      2'd1: y = b;
      2'd2: y = c;
      default: y = d;
    endcase
  end
endmodule
module tb;
  reg [1:0] sel;
  reg [3:0] a, b, c, d;
  wire [3:0] y;
  top dut(.sel(sel), .a(a), .b(b), .c(c), .d(d), .y(y));
  reg [31:0] pass = 0;
  initial begin
    a=4'h1; b=4'h2; c=4'h4; d=4'h8;
    sel=0; #10; if (y === 4'h1) pass = pass+1; else $display("FAIL %h", y);
    sel=1; #10; if (y === 4'h2) pass = pass+1; else $display("FAIL %h", y);
    sel=2; #10; if (y === 4'h4) pass = pass+1; else $display("FAIL %h", y);
    sel=3; #10; if (y === 4'h8) pass = pass+1; else $display("FAIL %h", y);
    if (pass == 4) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule
`);
    expect(r.errors).toEqual([]);
    expect(r.console.join('\\n')).toContain('ALL TESTS PASSED');
  });
});

describe('sequential logic', () => {
  it('d flip-flop with nonblocking assignment', () => {
    const r = simulate(`
module top(clk, d, q);
  input clk, d;
  output reg q;
  always @(posedge clk) q <= d;
endmodule
module tb;
  reg clk = 0, d = 0;
  wire q;
  top dut(.clk(clk), .d(d), .q(q));
  reg [31:0] pass = 0;
  always #5 clk = ~clk;
  initial begin
    d = 1;
    @(posedge clk); #1;
    if (q === 1'b1) pass = pass+1; else $display("FAIL after 1st edge q=%b", q);
    d = 0;
    @(posedge clk); #1;
    if (q === 1'b0) pass = pass+1; else $display("FAIL after 2nd edge q=%b", q);
    if (pass == 2) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule
`);
    expect(r.errors).toEqual([]);
    expect(r.console.join('\\n')).toContain('ALL TESTS PASSED');
  });

  it('0-9 counter', () => {
    const r = simulate(`
module top(clk, rst, count);
  input clk, rst;
  output reg [3:0] count;
  always @(posedge clk or posedge rst) begin
    if (rst) count <= 4'd0;
    else if (count == 4'd9) count <= 4'd0;
    else count <= count + 4'd1;
  end
endmodule
module tb;
  reg clk = 0, rst = 1;
  wire [3:0] count;
  top dut(.clk(clk), .rst(rst), .count(count));
  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  initial begin
    @(posedge clk);
    rst = 0;
    repeat (10) @(posedge clk);
    #1;
    if (count === 4'd0) pass = pass+1; else $display("FAIL count=%0d", count);
    if (pass == 1) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule
`);
    expect(r.errors).toEqual([]);
    expect(r.console.join('\\n')).toContain('ALL TESTS PASSED');
  });

  it('blocking vs nonblocking difference', () => {
    const r = simulate(`
module top(clk, a, b1, b2);
  input clk, a;
  output reg b1, b2;
  always @(posedge clk) begin
    b1 = a;      // blocking: visible immediately
    b2 <= a;     // nonblocking: updated later
  end
endmodule
module tb;
  reg clk = 0, a = 0;
  wire b1, b2;
  top dut(.clk(clk), .a(a), .b1(b1), .b2(b2));
  always #5 clk = ~clk;
  initial begin
    a = 1;
    @(posedge clk); #1;
    $display("settled: b1=%b b2=%b", b1, b2);
    a = 0;
    @(posedge clk);
    $display("at edge: b1=%b b2=%b", b1, b2);
    #1;
    $display("after:  b1=%b b2=%b", b1, b2);
    $finish;
  end
endmodule
`);
    expect(r.errors).toEqual([]);
    expect(r.console[0]).toBe('settled: b1=1 b2=1');
    expect(r.console[1]).toBe('at edge: b1=0 b2=1');
    expect(r.console[2]).toBe('after:  b1=0 b2=0');
  });
});

describe('functions and loops', () => {
  it('function with for loop (popcount, old-style header)', () => {
    const r = simulate(`
module top(v, y);
  input [7:0] v;
  output [2:0] y;
  function [2:0] popcount;
    input [7:0] val;
    reg [2:0] acc;
    reg [7:0] i;
    begin
      acc = 3'd0;
      for (i = 0; i < 8; i = i + 1)
        if (val[i]) acc = acc + 3'd1;
      popcount = acc;
    end
  endfunction
  assign y = popcount(v);
endmodule
module tb;
  reg [7:0] v;
  wire [2:0] y;
  top dut(.v(v), .y(y));
  reg [31:0] pass = 0;
  initial begin
    v = 8'b1011_0001; #10;
    if (y === 3'd4) pass = pass+1; else $display("FAIL y=%0d", y);
    v = 8'b0000_0000; #10;
    if (y === 3'd0) pass = pass+1; else $display("FAIL y=%0d", y);
    v = 8'b1111_1110; #10;
    if (y === 3'd7) pass = pass+1; else $display("FAIL y=%0d", y);
    if (pass == 3) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule
`);
    expect(r.errors).toEqual([]);
    expect(r.console.join('\\n')).toContain('ALL TESTS PASSED');
  });

  it('popcount with per-bit tests in always', () => {
    const r = simulate(`
module top(v, y);
  input [7:0] v;
  output reg [2:0] y;
  always @(*) begin
    y = 3'd0;
    if (v[0]) y = y + 1;
    if (v[1]) y = y + 1;
    if (v[2]) y = y + 1;
    if (v[3]) y = y + 1;
    if (v[4]) y = y + 1;
    if (v[5]) y = y + 1;
    if (v[6]) y = y + 1;
    if (v[7]) y = y + 1;
  end
endmodule
module tb;
  reg [7:0] v;
  wire [2:0] y;
  top dut(.v(v), .y(y));
  reg [31:0] pass = 0;
  initial begin
    v = 8'b1011_0001; #10;
    if (y === 3'd4) pass = pass+1; else $display("FAIL y=%0d", y);
    v = 8'b0000_0000; #10;
    if (y === 3'd0) pass = pass+1; else $display("FAIL y=%0d", y);
    if (pass == 2) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule
`);
    expect(r.errors).toEqual([]);
    expect(r.console.join('\\n')).toContain('ALL TESTS PASSED');
  });

  it('for loop in initial with function call', () => {
    const r = simulate(`
module top;
  function [7:0] addone;
    input [7:0] x;
    begin
      addone = x + 8'd1;
    end
  endfunction
  reg [7:0] i;
  initial begin
    for (i = 0; i < 5; i = i + 1) begin
      $display("addone(%0d) = %0d", i, addone(i));
    end
    $finish;
  end
endmodule
`);
    expect(r.errors).toEqual([]);
    expect(r.console).toEqual([
      'addone(0) = 1',
      'addone(1) = 2',
      'addone(2) = 3',
      'addone(3) = 4',
      'addone(4) = 5',
      '$finish called at time 0',
    ]);
  });
});

describe('parameters and hierarchy', () => {
  it('parameterized width via #(.N())', () => {
    const r = simulate(`
module top(clk, q);
  parameter N = 4;
  input clk;
  output reg [N-1:0] q;
  initial q = 0;
  always @(posedge clk) q <= q + 1;
endmodule
module tb;
  reg clk = 0;
  wire [7:0] q;
  top #(.N(8)) dut(.clk(clk), .q(q));
  always #5 clk = ~clk;
  initial begin
    repeat (3) @(posedge clk);
    #1;
    $display("q=%0d", q);
    $finish;
  end
endmodule
`);
    expect(r.errors).toEqual([]);
    expect(r.console[0]).toBe('q=3');
  });

  it('hierarchical read of internal signal', () => {
    const r = simulate(`
module top(clk, q);
  input clk;
  output reg [3:0] q;
  initial q = 0;
  always @(posedge clk) q <= q + 1;
endmodule
module tb;
  reg clk = 0;
  wire [3:0] q;
  top dut(.clk(clk), .q(q));
  always #5 clk = ~clk;
  initial begin
    repeat (2) @(posedge clk);
    #1;
    $display("dut.q=%0d q=%0d", dut.q, q);
    $finish;
  end
endmodule
`);
    expect(r.errors).toEqual([]);
    expect(r.console[0]).toBe('dut.q=2 q=2');
  });
});

describe('waveform', () => {
  it('records signal changes with times', () => {
    const r = simulate(`
module top;
  reg clk = 0;
  reg [1:0] cnt = 0;
  always #5 clk = ~clk;
  always @(posedge clk) cnt <= cnt + 1;
  initial begin
    #40 $finish;
  end
endmodule
`);
    expect(r.errors).toEqual([]);
    const clk = r.waveform.find((w) => w.name === 'clk')!;
    expect(clk.changes.length).toBeGreaterThan(6);
    const cnt = r.waveform.find((w) => w.name === 'cnt')!;
    expect(cnt.changes.length).toBe(6); // t0 x, t0 0 (reg init), then 1,2,3,0 (2-bit wrap)
    const last = cnt.changes[cnt.changes.length - 1];
    expect(last.v.toNumber()).toBe(0);
  });
});

describe('errors', () => {
  it('reports parse errors with line numbers', () => {
    const r = simulate(`module top(
  input a
  output y;
endmodule`);
    expect(r.errors.length).toBe(1);
    expect(r.errors[0].line).toBe(3);
  });

  it('reports undeclared identifiers', () => {
    const r = simulate(`
module top(a, y);
  input a;
  output y;
  assign y = a & b;
endmodule
`);
    expect(r.errors.length).toBe(1);
    expect(r.errors[0].message).toContain("undeclared identifier 'b'");
    expect(r.errors[0].line).toBe(5);
  });

  it('catches infinite loops via budget', () => {
    const r = simulate(`
module top;
  reg [3:0] i;
  initial begin
    i = 0;
    while (i < 5) begin
      i = i + 2;
    end
    $finish;
  end
endmodule
`);
    // i = 0,2,4,6... wait 6 >= 5 terminates. use different loop:
    const r2 = simulate(`
module top;
  reg [3:0] i;
  initial begin
    i = 0;
    while (i != 3) begin
      i = i + 2;
    end
    $finish;
  end
endmodule
`, { budget: 100000 });
    expect(r2.errors.length).toBe(1);
    expect(r2.errors[0].message).toContain('budget');
  });

  it('catches missing $finish with max time', () => {
    const r = simulate(`
module top;
  reg clk = 0;
  always #5 clk = ~clk;
endmodule
`, { maxTime: 100 });
    expect(r.errors.length).toBe(1);
    expect(r.errors[0].message).toContain('max time');
  });

  it('procedural assignment to wire is an error', () => {
    const r = simulate(`
module top(clk, y);
  input clk;
  output y;
  reg dummy;
  always @(posedge clk) y = 1'b1;
endmodule
module tb;
  reg clk = 0;
  wire y;
  top dut(.clk(clk), .y(y));
  always #5 clk = ~clk;
  initial begin #20 $finish; end
endmodule
`);
    expect(r.errors.length).toBe(1);
    expect(r.errors[0].message).toContain('wire');
  });
});

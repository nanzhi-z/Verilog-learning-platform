import type { Stage } from './types';

/** Stage 3 — 工程实践（第 16–22 章，21 个练习） */
export const practice: Stage = {
  id: 'practice',
  title: '第三站 · 工程实践',
  tagline: '把零件装配成系统',
  desc: 'ALU、FIFO、UART、交通灯……用前面学到的积木搭建接近真实项目的数字系统。',
  chapters: [
    // ---------------- 第 16 章 ----------------
    {
      id: '16',
      title: 'ALU 与数据通路',
      subtitle: '运算器的骨架：op 选择行为，标志位记录结果',
      blocks: [
        {
          k: 'p',
          t: '**ALU（算术逻辑单元）**是 CPU 的运算核心。它本质上是：一组按 `op` 选择行为的组合逻辑，外加几个**标志位（flags）**记录结果的性质。',
        },
        {
          k: 'code',
          label: 'ALU 的骨架',
          code: `module alu (
  input  [1:0] op,
  input  [3:0] a, b,
  output reg [3:0] y
);
  always @(*) begin
    case (op)
      2'd0:    y = a & b;   // 按位与
      2'd1:    y = a | b;   // 按位或
      2'd2:    y = a + b;   // 加（高位截断）
      default: y = a - b;   // 减
    endcase
  end
endmodule`,
        },
        {
          k: 'p',
          t: '注意两点：**组合逻辑用阻塞赋值 `=`**（`always @(*)` 里没有任何寄存器）；`case` 必须有 `default`——漏掉它，未列出的 `op` 会得到不确定的值。',
        },
        { k: 'h2', t: '标志位：比大小、判溢出的线索' },
        {
          k: 'ul',
          items: [
            '**zero**：`assign zero = (y == 8\'d0);`——机器比较两数是否相等，就是做减法再看 zero 标志。',
            '**carry（cout）**：加法最高位向前的进位。把宽度撑到 N+1 位就能"看见"它：`{cout, sum} = a + b;`',
            '**overflow（v）**：**有符号**溢出——两数同号相加，结果却变号：`v = (a[7] == binv[7]) && (y[7] != a[7]);`',
          ],
        },
        {
          k: 'note',
          tone: 'warn',
          title: 'carry 与 overflow 不是一回事',
          t: 'carry 是无符号世界的"装不下"（比如 0xFF + 1），overflow 是有符号世界的"装不下"（比如 127 + 1）。同一加法器，两套标志，分别服务无符号/有符号两种解释。',
        },
      ],
      exercises: [
        {
          id: '1',
          title: '4 位 ALU',
          desc: '实现 4 位 ALU：`op=00` 按位与、`01` 按位或、`10` 加法、`11` 减法。加法结果超过 4 位时自然截断。',
          hints: [
            '组合逻辑：`always @(*)` + `case (op)`，用阻塞赋值 `=`。',
            'case 最后一支用 `default` 兜住减法。',
          ],
          starter: `module alu4 (
  input  [1:0] op,
  input  [3:0] a, b,
  output reg [3:0] y
);

  // TODO: case (op) 选择 AND / OR / ADD / SUB

endmodule`,
          testbench: `module tb;
  reg [1:0] op;
  reg [3:0] a, b;
  wire [3:0] y;
  alu4 dut(.op(op), .a(a), .b(b), .y(y));

  reg [31:0] pass = 0;
  initial begin
    op = 2'd0; a = 4'b1010; b = 4'b0110;
    #5;
    if (y === 4'b0010) pass = pass + 1; else $display("FAIL: and y=%04b", y);

    op = 2'd1;
    #5;
    if (y === 4'b1110) pass = pass + 1; else $display("FAIL: or y=%04b", y);

    op = 2'd2; a = 4'd15; b = 4'd1;
    #5;
    if (y === 4'd0) pass = pass + 1; else $display("FAIL: add wrap y=%0d", y);

    op = 2'd3; a = 4'd3; b = 4'd5;
    #5;
    if (y === 4'd14) pass = pass + 1; else $display("FAIL: sub wrap y=%0d", y);

    op = 2'd2; a = 4'd9; b = 4'd8;
    #5;
    if (y === 4'd1) pass = pass + 1; else $display("FAIL: add y=%0d", y);

    if (pass == 5) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module alu4 (
  input  [1:0] op,
  input  [3:0] a, b,
  output reg [3:0] y
);

  always @(*) begin
    case (op)
      2'd0:    y = a & b;
      2'd1:    y = a | b;
      2'd2:    y = a + b;
      default: y = a - b;
    endcase
  end

endmodule`,
        },
        {
          id: '2',
          title: '加减法器与标志位',
          desc: '实现 8 位加减法器 `alu8f`：`sub=0` 加法、`sub=1` 减法（提示：`a - b = a + ~b + 1`）。输出 `y[7:0]`、进位 `cout`、零标志 `zero`、有符号溢出 `v`。',
          hints: [
            '被加数按 sub 取反：`assign binv = sub ? ~b : b;`，然后 `{cout, y} = a + binv + sub;` 的思路——先用 9 位中间和。',
            '溢出：同号相加变号 `v = (a[7] == binv[7]) && (y[7] != a[7]);`',
            'zero 用数值比较 `==` 即可。',
          ],
          starter: `module alu8f (
  input        sub,
  input  [7:0] a, b,
  output [7:0] y,
  output       cout,
  output       zero,
  output       v
);
  wire [7:0] binv;
  wire [8:0] sum;

  // TODO: binv 按 sub 取反；sum 按位宽撑到 9 位再相加（含 +sub）
  // TODO: y / cout / zero / v

endmodule`,
          testbench: `module tb;
  reg sub;
  reg [7:0] a, b;
  wire [7:0] y;
  wire cout, zero, v;
  alu8f dut(.sub(sub), .a(a), .b(b), .y(y), .cout(cout), .zero(zero), .v(v));

  reg [31:0] pass = 0;
  initial begin
    sub = 0; a = 8'd0; b = 8'd0;
    #5;
    if (y === 8'd0 && zero == 1'b1 && v == 1'b0 && cout == 1'b0) pass = pass + 1;
    else $display("FAIL: 0+0 y=%0d z=%b", y, zero);

    a = 8'd3; b = 8'd4;
    #5;
    if (y === 8'd7 && zero == 1'b0 && v == 1'b0) pass = pass + 1;
    else $display("FAIL: 3+4 y=%0d", y);

    a = 8'h7F; b = 8'd1;
    #5;
    if (y === 8'h80 && v == 1'b1 && zero == 1'b0) pass = pass + 1;
    else $display("FAIL: 7F+1 y=%02h v=%b", y, v);

    a = 8'h50; b = 8'h30;
    #5;
    if (y === 8'h80 && v == 1'b1) pass = pass + 1;
    else $display("FAIL: 50+30 y=%02h v=%b", y, v);

    a = 8'hC0; b = 8'h40;
    #5;
    if (v == 1'b0 && cout == 1'b1) pass = pass + 1;
    else $display("FAIL: C0+40 v=%b c=%b", v, cout);

    sub = 1; a = 8'd5; b = 8'd3;
    #5;
    if (y === 8'd2 && v == 1'b0 && cout == 1'b1) pass = pass + 1;
    else $display("FAIL: 5-3 y=%0d c=%b", y, cout);

    a = 8'h80; b = 8'd1;
    #5;
    if (y === 8'h7F && v == 1'b1) pass = pass + 1;
    else $display("FAIL: 80-1 y=%02h v=%b", y, v);

    if (pass == 7) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module alu8f (
  input        sub,
  input  [7:0] a, b,
  output [7:0] y,
  output       cout,
  output       zero,
  output       v
);
  wire [7:0] binv;
  wire [8:0] sum;

  assign binv = sub ? ~b : b;
  assign sum  = {1'b0, a} + {1'b0, binv} + sub;
  assign y    = sum[7:0];
  assign cout = sum[8];
  assign zero = (y == 8'd0);
  assign v    = (a[7] == binv[7]) && (y[7] != a[7]);

endmodule`,
        },
        {
          id: '3',
          title: '4 位乘法器',
          desc: '实现 4×4 无符号乘法器，输出 8 位积 `p = a * b`。关键：**先把操作数零扩展到 8 位**，否则结果会被截成 4 位。',
          hints: [
            '`{4\'b0, a}` 把 a 变成 8 位，b 同理，再相乘。',
            '乘法运算符 `*` 综合后会变成硬件乘法器或移位加电路。',
          ],
          starter: `module mul4 (
  input  [3:0] a, b,
  output [7:0] p
);
  wire [7:0] ae, be;

  // TODO: 零扩展后相乘

endmodule`,
          testbench: `module tb;
  reg [3:0] a, b;
  wire [7:0] p;
  mul4 dut(.a(a), .b(b), .p(p));

  reg [31:0] pass = 0;
  initial begin
    a = 4'd12; b = 4'd13;
    #5;
    if (p === 8'd156) pass = pass + 1; else $display("FAIL: 12x13 p=%0d", p);

    a = 4'd15; b = 4'd15;
    #5;
    if (p === 8'd225) pass = pass + 1; else $display("FAIL: 15x15 p=%0d", p);

    a = 4'd0; b = 4'd7;
    #5;
    if (p === 8'd0) pass = pass + 1; else $display("FAIL: 0x7 p=%0d", p);

    a = 4'd1; b = 4'd15;
    #5;
    if (p === 8'd15) pass = pass + 1; else $display("FAIL: 1x15 p=%0d", p);

    if (pass == 4) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module mul4 (
  input  [3:0] a, b,
  output [7:0] p
);
  wire [7:0] ae, be;

  assign ae = {4'b0, a};
  assign be = {4'b0, b};
  assign p  = ae * be;

endmodule`,
        },
      ],
    },

    // ---------------- 第 17 章 ----------------
    {
      id: '17',
      title: '寄存器堆与优先级',
      subtitle: '多组寄存器的读写选择，以及"谁先谁后"',
      blocks: [
        {
          k: 'p',
          t: 'CPU 里通用寄存器堆（register file）是"一排小存储器"：写口按地址选一组寄存器写入，读口按地址把某一组**组合地**引出来。',
        },
        {
          k: 'code',
          label: '4×4 位寄存器堆',
          code: `module regfile4 (
  input            clk, rst, we,
  input      [1:0] wa, ra,   // 写地址 / 读地址
  input      [3:0] wd,       // 写数据
  output reg [3:0] rd
);
  reg [3:0] r0, r1, r2, r3;

  always @(posedge clk) begin
    if (rst) begin
      r0 <= 0; r1 <= 0; r2 <= 0; r3 <= 0;
    end else if (we) begin
      case (wa)
        2'd0: r0 <= wd;
        2'd1: r1 <= wd;
        2'd2: r2 <= wd;
        default: r3 <= wd;
      endcase
    end
  end

  always @(*) begin
    case (ra)
      2'd0: rd = r0;
      2'd1: rd = r1;
      2'd2: rd = r2;
      default: rd = r3;
    endcase
  end
endmodule`,
        },
        {
          k: 'p',
          t: '要点：**写是时序**（posedge 采样 `we`+`wa`），**读是组合**（`always @(*)` 里 `case (ra)` 做多路选择器）。一套数据、两种节奏。',
        },
        { k: 'h2', t: '优先编码器：if 的顺序就是优先级' },
        {
          k: 'p',
          t: '中断控制器要回答"多个请求同时来，先响应谁？"——**优先编码器**输出最高优先级请求的编号。组合逻辑里 `if` 链的顺序天然编码了优先级：**写在前面的先匹配，后面的只做"补位"**。',
        },
        {
          k: 'note',
          tone: 'tip',
          title: '一条链，两种读法',
          t: '`if (a[7]) ... else if (a[6]) ...` 顺着读是"先看高位"；倒着读是"低位只在高位全 0 时才有机会"。优先级电路 = 顺序即语义。',
        },
      ],
      exercises: [
        {
          id: '1',
          title: '8 位串入并出（SIPO）',
          desc: '实现 SIPO 移位寄存器：`en=1` 时每拍把 `d` 移入最低位（左移），8 拍后 `q` 并行保存最近 8 个串行位（先入在高位）。`en=0` 时保持。',
          hints: ['移位就一句：`q <= {q[6:0], d};`', '优先级：rst > en > 保持。'],
          starter: `module sipo8 (
  input        clk, rst, en,
  input        d,
  output reg [7:0] q
);

  // TODO: 复位清零；en 时左移入 d

endmodule`,
          testbench: `module tb;
  reg clk, rst, en, d;
  wire [7:0] q;
  sipo8 dut(.clk(clk), .rst(rst), .en(en), .d(d), .q(q));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  initial begin
    clk = 0; rst = 1; en = 0; d = 0;
    @(posedge clk); #1;
    if (q === 8'd0) pass = pass + 1; else $display("FAIL: reset q=%0d", q);
    rst = 0;

    // 串入 1,0,1,1,0,0,1,0
    en = 1;
    d = 1; @(posedge clk); #1;
    d = 0; @(posedge clk); #1;
    d = 1; @(posedge clk); #1;
    d = 1; @(posedge clk); #1;
    d = 0; @(posedge clk); #1;
    d = 0; @(posedge clk); #1;
    d = 1; @(posedge clk); #1;
    d = 0; @(posedge clk); #1;
    if (q === 8'b10110010) pass = pass + 1; else $display("FAIL: q=%08b", q);

    // en=0 冻结
    en = 0; d = 1;
    @(posedge clk); #1;
    if (q === 8'b10110010) pass = pass + 1; else $display("FAIL: freeze q=%08b", q);

    // 继续移 1 位
    en = 1;
    @(posedge clk); #1;
    if (q === 8'b01100101) pass = pass + 1; else $display("FAIL: q=%08b", q);

    if (pass == 4) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module sipo8 (
  input        clk, rst, en,
  input        d,
  output reg [7:0] q
);

  always @(posedge clk) begin
    if (rst)
      q <= 8'd0;
    else if (en)
      q <= {q[6:0], d};
  end

endmodule`,
        },
        {
          id: '2',
          title: '4×4 位寄存器堆',
          desc: '实现 4 组 4 位寄存器：`we=1` 时写 `wa` 号寄存器（`wd`）；`ra` 组合选择读出某一组到 `rd`。',
          hints: [
            '两个 always：写用 `@(posedge clk)` + `case (wa)`；读用 `@(*)` + `case (ra)`。',
            '复位把 4 个寄存器全部清零。',
          ],
          starter: `module regfile4 (
  input            clk, rst, we,
  input      [1:0] wa, ra,
  input      [3:0] wd,
  output reg [3:0] rd
);
  reg [3:0] r0, r1, r2, r3;

  // TODO: 时序写（case wa）；组合读（case ra）

endmodule`,
          testbench: `module tb;
  reg clk, rst, we;
  reg [1:0] wa, ra;
  reg [3:0] wd;
  wire [3:0] rd;
  regfile4 dut(.clk(clk), .rst(rst), .we(we), .wa(wa), .ra(ra), .wd(wd), .rd(rd));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  initial begin
    clk = 0; rst = 1; we = 0; wa = 0; ra = 0; wd = 0;
    @(posedge clk); #1;
    rst = 0;
    ra = 0; #1;
    if (rd === 4'd0) pass = pass + 1; else $display("FAIL: reset rd=%0d", rd);

    // 写 r0=5
    we = 1; wa = 2'd0; wd = 4'd5;
    @(posedge clk); #1;
    // 写 r2=9
    wa = 2'd2; wd = 4'd9;
    @(posedge clk); #1;
    we = 0;

    ra = 0; #1;
    if (rd === 4'd5) pass = pass + 1; else $display("FAIL: ra0 rd=%0d", rd);
    ra = 1; #1;
    if (rd === 4'd0) pass = pass + 1; else $display("FAIL: ra1 rd=%0d", rd);
    ra = 2; #1;
    if (rd === 4'd9) pass = pass + 1; else $display("FAIL: ra2 rd=%0d", rd);

    // 覆盖写 r0=7
    we = 1; wa = 2'd0; wd = 4'd7;
    @(posedge clk); #1;
    we = 0;
    ra = 0; #1;
    if (rd === 4'd7) pass = pass + 1; else $display("FAIL: overwrite rd=%0d", rd);

    if (pass == 5) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module regfile4 (
  input            clk, rst, we,
  input      [1:0] wa, ra,
  input      [3:0] wd,
  output reg [3:0] rd
);
  reg [3:0] r0, r1, r2, r3;

  always @(posedge clk) begin
    if (rst) begin
      r0 <= 4'd0; r1 <= 4'd0; r2 <= 4'd0; r3 <= 4'd0;
    end else if (we) begin
      case (wa)
        2'd0: r0 <= wd;
        2'd1: r1 <= wd;
        2'd2: r2 <= wd;
        default: r3 <= wd;
      endcase
    end
  end

  always @(*) begin
    case (ra)
      2'd0: rd = r0;
      2'd1: rd = r1;
      2'd2: rd = r2;
      default: rd = r3;
    endcase
  end
endmodule`,
        },
        {
          id: '3',
          title: '优先编码器',
          desc: '实现 8 位优先编码器：输出**最高位**那个 1 的位置 `pos`；全 0 时 `valid=0`。例如 `a=8\'b1000_0100` 时 `pos=7`。',
          hints: [
            '组合 `always @(*)` 里写 if-else 链，从 `a[7]` 判到 `a[0]`。',
            '最后一支 `else` 处理全 0：`valid=0`（pos 值随意）。',
          ],
          starter: `module prio8 (
  input      [7:0] a,
  output reg [2:0] pos,
  output reg       valid
);

  // TODO: if-else 链，高位优先

endmodule`,
          testbench: `module tb;
  reg [7:0] a;
  wire [2:0] pos;
  wire valid;
  prio8 dut(.a(a), .pos(pos), .valid(valid));

  reg [31:0] pass = 0;
  initial begin
    a = 8'd0;
    #5;
    if (valid == 1'b0) pass = pass + 1; else $display("FAIL: all-zero valid=%b", valid);

    a = 8'h84;
    #5;
    if (pos === 3'd7 && valid == 1'b1) pass = pass + 1; else $display("FAIL: 84 pos=%0d", pos);

    a = 8'h04;
    #5;
    if (pos === 3'd2 && valid == 1'b1) pass = pass + 1; else $display("FAIL: 04 pos=%0d", pos);

    a = 8'hFF;
    #5;
    if (pos === 3'd7) pass = pass + 1; else $display("FAIL: FF pos=%0d", pos);

    a = 8'h01;
    #5;
    if (pos === 3'd0 && valid == 1'b1) pass = pass + 1; else $display("FAIL: 01 pos=%0d", pos);

    a = 8'h20;
    #5;
    if (pos === 3'd5) pass = pass + 1; else $display("FAIL: 20 pos=%0d", pos);

    if (pass == 6) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module prio8 (
  input      [7:0] a,
  output reg [2:0] pos,
  output reg       valid
);

  always @(*) begin
    if      (a[7]) begin pos = 3'd7; valid = 1'b1; end
    else if (a[6]) begin pos = 3'd6; valid = 1'b1; end
    else if (a[5]) begin pos = 3'd5; valid = 1'b1; end
    else if (a[4]) begin pos = 3'd4; valid = 1'b1; end
    else if (a[3]) begin pos = 3'd3; valid = 1'b1; end
    else if (a[2]) begin pos = 3'd2; valid = 1'b1; end
    else if (a[1]) begin pos = 3'd1; valid = 1'b1; end
    else if (a[0]) begin pos = 3'd0; valid = 1'b1; end
    else           begin pos = 3'd0; valid = 1'b0; end
  end

endmodule`,
        },
      ],
    },

    // ---------------- 第 18 章 ----------------
    {
      id: '18',
      title: 'FIFO 与数据流',
      subtitle: '缓冲与节拍：让生产者和消费者速度不同也能合作',
      blocks: [
        {
          k: 'p',
          t: '生产者一次吐一批、消费者一次吃一个——两边节奏不同，中间就需要 **FIFO（先进先出队列）**。它是跨时钟域、总线缓冲、DMA 传输的标准零件。',
        },
        {
          k: 'p',
          t: 'FIFO 的三件套：**写指针 `wptr`**（写到哪了）、**读指针 `rptr`**（读到哪了）、**计数 `count`**（还剩多少没读）。读写都在指针处转圈，回绕后自然复用同一片存储。',
        },
        {
          k: 'code',
          label: 'FIFO 的骨架（示意）',
          code: `// 写：we 且未满
if (we && !full) begin
  mem[wptr] <= wdata;      // 写入当前位置
  wptr <= wptr + 1;        // 指针转圈
end
// 读：re 且非空
if (re && !empty) begin
  rdata <= mem[rptr];      // 读出当前位置
  rptr <= rptr + 1;
end
// count：一加一减
full  = (count == DEPTH);
empty = (count == 0);`,
        },
        {
          k: 'note',
          tone: 'info',
          title: '满不写、空不读',
          t: 'FIFO 的契约：`full` 时写请求被丢弃，`empty` 时读请求无效。使用方必须先看标志再动手——这就是"流控"。',
        },
        { k: 'h2', t: '数据打包与乒乓缓冲' },
        {
          k: 'ul',
          items: [
            '**打包（packing）**：串行到达的窄数据拼成并行宽字——通信里"组帧"的基本动作。',
            '**乒乓（ping-pong）**：两组缓冲交替读写：一边收新数据一边出旧数据，`swap` 一下身份互换——视频帧缓冲、DMA 双缓冲的核心思想。',
          ],
        },
      ],
      exercises: [
        {
          id: '1',
          title: '4 深 4 位 FIFO',
          desc: '实现同步 FIFO：`we=1` 且未满时写入 `wdata`；`re=1` 且非空时读出（同步读：下一拍 `rdata` 有效）。`full`/`empty` 指示状态。',
          hints: [
            '存储用 4 个独立寄存器 `mem0..mem3`，`case (wptr)` 选择写入哪个——本课程子集不支持存储器数组。',
            '读也是 `case (rptr)`，读出值存进 `rdata`（同步弹出）。',
            'count 同时读写时不变，只写加一，只读减一。',
          ],
          starter: `module fifo4 (
  input        clk, rst,
  input        we, re,
  input  [3:0] wdata,
  output reg [3:0] rdata,
  output       full, empty
);
  reg [3:0] mem0, mem1, mem2, mem3;
  reg [1:0] wptr, rptr;
  reg [2:0] count;

  // TODO: 写 case (wptr) 选择写入；读 case (rptr) 弹出到 rdata
  // TODO: count 加减；full / empty

endmodule`,
          testbench: `module tb;
  reg clk, rst, we, re;
  reg [3:0] wdata;
  wire [3:0] rdata;
  wire full, empty;
  fifo4 dut(.clk(clk), .rst(rst), .we(we), .re(re), .wdata(wdata), .rdata(rdata), .full(full), .empty(empty));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  initial begin
    clk = 0; rst = 1; we = 0; re = 0; wdata = 0;
    @(posedge clk); #1;
    if (empty == 1'b1 && full == 1'b0) pass = pass + 1;
    else $display("FAIL: reset e=%b f=%b", empty, full);
    rst = 0;

    // 写满 1,2,3,4
    we = 1;
    wdata = 4'd1; @(posedge clk); #1;
    wdata = 4'd2; @(posedge clk); #1;
    wdata = 4'd3; @(posedge clk); #1;
    wdata = 4'd4; @(posedge clk); #1;
    we = 0;
    if (full == 1'b1 && empty == 1'b0) pass = pass + 1;
    else $display("FAIL: full f=%b", full);

    // 满了再写应被忽略
    we = 1; wdata = 4'd9;
    @(posedge clk); #1;
    we = 0;
    if (full == 1'b1) pass = pass + 1;
    else $display("FAIL: still full f=%b", full);

    // 读 4 个，顺序 1,2,3,4
    re = 1;
    @(posedge clk); #1;
    if (rdata === 4'd1) pass = pass + 1; else $display("FAIL: r1=%0d", rdata);
    @(posedge clk); #1;
    if (rdata === 4'd2) pass = pass + 1; else $display("FAIL: r2=%0d", rdata);
    @(posedge clk); #1;
    if (rdata === 4'd3) pass = pass + 1; else $display("FAIL: r3=%0d", rdata);
    @(posedge clk); #1;
    re = 0;
    if (rdata === 4'd4) pass = pass + 1; else $display("FAIL: r4=%0d", rdata);
    if (empty == 1'b1) pass = pass + 1;
    else $display("FAIL: empty e=%b", empty);

    // 写 7,8 后同时读写
    we = 1; wdata = 4'd7;
    @(posedge clk); #1;
    wdata = 4'd8;
    @(posedge clk); #1;
    we = 1; re = 1; wdata = 4'd9;
    @(posedge clk); #1;
    we = 0; re = 0;
    if (rdata === 4'd7) pass = pass + 1; else $display("FAIL: sim rw=%0d", rdata);

    re = 1;
    @(posedge clk); #1;
    if (rdata === 4'd8) pass = pass + 1; else $display("FAIL: r8=%0d", rdata);
    @(posedge clk); #1;
    re = 0;
    if (rdata === 4'd9) pass = pass + 1; else $display("FAIL: r9=%0d", rdata);
    if (empty == 1'b1) pass = pass + 1;
    else $display("FAIL: empty2 e=%b", empty);

    if (pass == 12) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module fifo4 (
  input        clk, rst,
  input        we, re,
  input  [3:0] wdata,
  output reg [3:0] rdata,
  output       full, empty
);
  reg [3:0] mem0, mem1, mem2, mem3;
  reg [1:0] wptr, rptr;
  reg [2:0] count;

  assign full  = (count == 3'd4);
  assign empty = (count == 3'd0);

  always @(posedge clk) begin
    if (rst) begin
      wptr <= 0; rptr <= 0; count <= 0; rdata <= 0;
      mem0 <= 0; mem1 <= 0; mem2 <= 0; mem3 <= 0;
    end else begin
      if (we && !full) begin
        case (wptr)
          2'd0: mem0 <= wdata;
          2'd1: mem1 <= wdata;
          2'd2: mem2 <= wdata;
          default: mem3 <= wdata;
        endcase
        wptr <= wptr + 2'd1;
      end
      if (re && !empty) begin
        case (rptr)
          2'd0: rdata <= mem0;
          2'd1: rdata <= mem1;
          2'd2: rdata <= mem2;
          default: rdata <= mem3;
        endcase
        rptr <= rptr + 2'd1;
      end
      if (we && !full && re && !empty) count <= count;
      else if (we && !full) count <= count + 3'd1;
      else if (re && !empty) count <= count - 3'd1;
    end
  end
endmodule`,
        },
        {
          id: '2',
          title: '串行打包器',
          desc: '实现 nibble 打包器：`in_valid` 时收一个 4 位 `din`，收满 4 个后 `done` 拉高一拍，`dout` 输出 16 位结果（**先收的在高位**）。',
          hints: [
            '左移拼接：`dout <= {dout[11:0], din};`',
            'state 计到 3 的那次收数正好是第 4 个：置 done、清零计数。',
            'done 默认每拍清 0，只有完成拍置 1（单拍脉冲）。',
          ],
          starter: `module pack16 (
  input        clk, rst,
  input        in_valid,
  input  [3:0] din,
  output reg [15:0] dout,
  output reg       done
);
  reg [1:0] state;   // 已收 nibble 个数

  // TODO: in_valid 时左移打包；收满 4 个 done 一拍

endmodule`,
          testbench: `module tb;
  reg clk, rst, iv;
  reg [3:0] din;
  wire [15:0] dout;
  wire done;
  pack16 dut(.clk(clk), .rst(rst), .in_valid(iv), .din(din), .dout(dout), .done(done));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  initial begin
    clk = 0; rst = 1; iv = 0; din = 0;
    @(posedge clk); #1;
    rst = 0;

    // 收 A,5,C,3 -> 0xA5C3（先收在高位）
    iv = 1;
    din = 4'hA; @(posedge clk); #1;
    din = 4'h5; @(posedge clk); #1;
    din = 4'hC; @(posedge clk); #1;
    din = 4'h3; @(posedge clk); #1;
    if (done == 1'b1 && dout === 16'hA5C3) pass = pass + 1;
    else $display("FAIL: pack1 done=%b dout=%0d", done, dout);

    iv = 0;
    @(posedge clk); #1;
    if (done == 1'b0) pass = pass + 1; else $display("FAIL: done pulse");

    // 收 F,0,F,0 -> 0xF0F0
    iv = 1;
    din = 4'hF; @(posedge clk); #1;
    din = 4'h0; @(posedge clk); #1;
    din = 4'hF; @(posedge clk); #1;
    din = 4'h0; @(posedge clk); #1;
    if (done == 1'b1 && dout === 16'hF0F0) pass = pass + 1;
    else $display("FAIL: pack2 dout=%0d", dout);

    if (pass == 3) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module pack16 (
  input        clk, rst,
  input        in_valid,
  input  [3:0] din,
  output reg [15:0] dout,
  output reg       done
);
  reg [1:0] state;

  always @(posedge clk) begin
    if (rst) begin
      state <= 2'd0; dout <= 16'd0; done <= 1'b0;
    end else begin
      done <= 1'b0;
      if (in_valid) begin
        dout <= {dout[11:0], din};
        if (state == 2'd3) begin
          state <= 2'd0;
          done  <= 1'b1;
        end else
          state <= state + 2'd1;
      end
    end
  end
endmodule`,
        },
        {
          id: '3',
          title: '乒乓双缓冲',
          desc: '实现双缓冲：`we=1` 写**当前写缓冲**；`swap=1` 一拍后读写身份互换（原来的写缓冲变成读缓冲）；`q` 组合输出当前**读缓冲**。',
          hints: [
            '一位 `sel` 记录身份：`sel=0` 时写 buf0、读 buf1；`sel=1` 反过来。',
            '读输出用组合：`assign q = sel ? buf0 : buf1;`',
            'we 和 swap 可以同一拍发生（先写后换）。',
          ],
          starter: `module swap4 (
  input        clk, rst,
  input        we, swap,
  input  [3:0] d,
  output [3:0] q
);
  reg [3:0] buf0, buf1;
  reg       sel;

  // TODO: we 写当前写缓冲；swap 翻转 sel；q 组合读

endmodule`,
          testbench: `module tb;
  reg clk, rst, we, swap;
  reg [3:0] d;
  wire [3:0] q;
  swap4 dut(.clk(clk), .rst(rst), .we(we), .swap(swap), .d(d), .q(q));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  initial begin
    clk = 0; rst = 1; we = 0; swap = 0; d = 0;
    @(posedge clk); #1;
    if (q === 4'd0) pass = pass + 1; else $display("FAIL: reset q=%0d", q);
    rst = 0;

    // 写 buf0=5，读 buf1 仍 0
    we = 1; d = 4'd5;
    @(posedge clk); #1;
    we = 0;
    if (q === 4'd0) pass = pass + 1; else $display("FAIL: before swap q=%0d", q);

    // swap -> 读 buf0=5
    swap = 1;
    @(posedge clk); #1;
    swap = 0;
    if (q === 4'd5) pass = pass + 1; else $display("FAIL: after swap q=%0d", q);

    // 写 buf1=9，读 buf0 仍 5
    we = 1; d = 4'd9;
    @(posedge clk); #1;
    we = 0;
    if (q === 4'd5) pass = pass + 1; else $display("FAIL: stable q=%0d", q);

    // swap -> 读 buf1=9
    swap = 1;
    @(posedge clk); #1;
    swap = 0;
    if (q === 4'd9) pass = pass + 1; else $display("FAIL: swap2 q=%0d", q);

    // 再 swap -> 读 buf0=5（旧数据还在）
    swap = 1;
    @(posedge clk); #1;
    swap = 0;
    if (q === 4'd5) pass = pass + 1; else $display("FAIL: swap3 q=%0d", q);

    if (pass == 6) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module swap4 (
  input        clk, rst,
  input        we, swap,
  input  [3:0] d,
  output [3:0] q
);
  reg [3:0] buf0, buf1;
  reg       sel;

  assign q = sel ? buf0 : buf1;

  always @(posedge clk) begin
    if (rst) begin
      buf0 <= 4'd0; buf1 <= 4'd0; sel <= 1'b0;
    end else begin
      if (we) begin
        if (sel) buf1 <= d;
        else     buf0 <= d;
      end
      if (swap) sel <= ~sel;
    end
  end
endmodule`,
        },
      ],
    },

    // ---------------- 第 19 章 ----------------
    {
      id: '19',
      title: 'UART 与 SPI',
      subtitle: '两根线传一个字节：真实世界最常用的两个串行协议',
      blocks: [
        {
          k: 'p',
          t: '芯片和芯片说话，最省引脚的办法是**串行**：一次传一位，按约定的节奏拼成字节。**UART** 用两根线（TX/RX），**SPI** 用四根（CS/SCLK/MOSI/MISO），它们是嵌入式的"普通话"。',
        },
        { k: 'h2', t: 'UART：没有时钟线，靠节奏对齐' },
        {
          k: 'ul',
          items: [
            '一帧 = **起始位 0** + 8 个数据位（LSB 先）+ **停止位 1**。空闲时线保持 1。',
            '没有时钟线，双方约定波特率。本课程约定 **OVER=4**：一个位持续 4 个 clk。',
            '接收方检测到起始位下降沿后，等 1.5 个位周期到第一个数据位**中点**采样，之后每隔 4 拍采一位——错开半位，抗抖动。',
          ],
        },
        {
          k: 'code',
          label: 'TX 的状态机骨架',
          code: `// state: 0=idle, 1=start, 2..9=data, 10=stop
// tick:  位内计数 0..3；每满 4 拍进入下一位
else if (tick == 3) begin
  tick <= 0;
  state <= state + 1;
  // 进入数据位前右移：txd = sh[0]
end else tick <= tick + 1;`,
        },
        { k: 'h2', t: 'SPI：有时钟线，边沿即语义' },
        {
          k: 'ul',
          items: [
            '主机拉低 **CS** 开始传输，翻转 **SCLK** 打拍子；**模式 0** 在上升沿采样、下降沿换数据。',
            '本课程约定 **HALF=2**：SCLK 每 2 个 clk 翻转一次（一个位 4 拍）。',
            'MSB 先发：`sdo <= data[7];` 装载第一个位，之后每个下降沿移出下一位。',
          ],
        },
        {
          k: 'note',
          tone: 'tip',
          title: '测串口的空门',
          t: 'TB 模拟接收方：`@(negedge txd)` 抓起始位，`repeat(OVER/2)` 走到位中点采样，之后 `repeat(OVER)` 一位一位收——和真实接收机的动作一模一样。',
        },
      ],
      exercises: [
        {
          id: '1',
          title: 'UART 发送器',
          desc: '实现 `uart_tx`（每位 4 个 clk，即 OVER=4）：`start=1` 时装载 `data` 开始发送一帧——起始位 0、8 个数据位（**LSB 先**）、停止位 1。`txd` 空闲为 1，`busy` 发送期间为 1。',
          hints: [
            'state 编号：0=idle、1=起始位、2..9=数据位、10=停止位；tick 计到 3 换位。',
            '`txd` 组合输出：state 0/10 时为 1，state 1 时为 0，否则 `sh[0]`。',
            '进入 state 2..9 时右移 `sh <= {1\'b1, sh[7:1]};`（低位先出，高位补 1）。',
          ],
          starter: `module uart_tx (
  input        clk,
  input        rst,
  input        start,
  input  [7:0] data,
  output       txd,
  output       busy
);
  reg [3:0] state;   // 0=idle 1=start 2..9=data 10=stop
  reg [1:0] tick;
  reg [7:0] sh;

  // TODO: assign txd / busy；状态机装载-发送-回 idle

endmodule`,
          testbench: `module tb;
  reg clk, rst, start;
  reg [7:0] data;
  wire txd, busy;
  uart_tx dut(.clk(clk), .rst(rst), .start(start), .data(data), .txd(txd), .busy(busy));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  reg [31:0] i;
  initial begin
    clk = 0; rst = 1; start = 0; data = 8'h00;
    @(posedge clk); #1; rst = 0;

    if (busy == 1'b0 && txd == 1'b1) pass = pass + 1;
    else $display("FAIL: idle busy=%b txd=%b", busy, txd);

    data = 8'hA5; start = 1;
    @(negedge txd);
    start = 0;
    #1;
    if (busy == 1'b1) pass = pass + 1; else $display("FAIL: busy=%b", busy);

    repeat (2) @(posedge clk); #1;
    if (txd == 1'b0) pass = pass + 1; else $display("FAIL: start bit txd=%b", txd);

    for (i = 0; i < 8; i = i + 1) begin
      repeat (4) @(posedge clk); #1;
      if (txd === data[i]) pass = pass + 1;
      else $display("FAIL: bit %0d txd=%b", i, txd);
    end

    repeat (4) @(posedge clk); #1;
    if (txd == 1'b1) pass = pass + 1; else $display("FAIL: stop bit txd=%b", txd);
    repeat (2) @(posedge clk); #1;
    if (busy == 1'b0) pass = pass + 1; else $display("FAIL: after stop busy=%b", busy);

    if (pass == 13) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module uart_tx (
  input        clk,
  input        rst,
  input        start,
  input  [7:0] data,
  output       txd,
  output       busy
);
  reg [3:0] state;   // 0=idle 1=start 2..9=data 10=stop
  reg [1:0] tick;
  reg [7:0] sh;

  assign txd  = (state == 4'd0 || state == 4'd10) ? 1'b1 :
                (state == 4'd1) ? 1'b0 : sh[0];
  assign busy = (state != 4'd0);

  always @(posedge clk) begin
    if (rst) begin
      state <= 4'd0; tick <= 2'd0; sh <= 8'hFF;
    end else if (state == 4'd0) begin
      if (start) begin
        sh <= data; state <= 4'd1; tick <= 2'd0;
      end
    end else if (tick == 2'd3) begin
      tick <= 2'd0;
      if (state == 4'd10)
        state <= 4'd0;
      else begin
        if (state >= 4'd2 && state < 4'd9)
          sh <= {1'b1, sh[7:1]};
        state <= state + 4'd1;
      end
    end else
      tick <= tick + 2'd1;
  end
endmodule`,
        },
        {
          id: '2',
          title: 'UART 接收器（环回测试）',
          desc: '实现 `uart_rx`（OVER=4）：检测 `rx` 下降沿进入接收，在**位中点**采样，8 位收齐、停止位正确时 `done` 拉高一拍、`data` 给出结果（LSB 先收）。测试台内置了上一题的发送器做环回。',
          hints: [
            'state：0=idle、1=sync（等 2 拍到数据位 0 的中点）、2=data、3=stop。',
            'data 态在 `tick == 2` 采样：`sh <= {rx, sh[7:1]};`（右移入高位，最后一位正好落在低位）。',
            'bitcnt 记已收位数，第 8 位收完（tick==3 且 bitcnt==7）把 sh 存进 data，转 stop。',
            'stop 态 `tick == 2` 时若 rx 为 1 则 done 一拍；`done` 默认每拍清 0。',
          ],
          starter: `module uart_rx (
  input        clk,
  input        rst,
  input        rx,
  output reg [7:0] data,
  output reg       done
);
  reg [2:0] state;   // 0=idle 1=sync 2=data 3=stop
  reg [1:0] tick;
  reg [3:0] bitcnt;
  reg [7:0] sh;

  // TODO: idle 检测起始位；sync 等 2 拍；data 位中点采样 + 计数；
  // TODO: stop 校验后 done 一拍

endmodule`,
          testbench: `// 测试台自带一个标准发送器做环回
module uart_tx (
  input        clk,
  input        rst,
  input        start,
  input  [7:0] data,
  output       txd,
  output       busy
);
  reg [3:0] state;
  reg [1:0] tick;
  reg [7:0] sh;

  assign txd  = (state == 4'd0 || state == 4'd10) ? 1'b1 :
                (state == 4'd1) ? 1'b0 : sh[0];
  assign busy = (state != 4'd0);

  always @(posedge clk) begin
    if (rst) begin
      state <= 4'd0; tick <= 2'd0; sh <= 8'hFF;
    end else if (state == 4'd0) begin
      if (start) begin
        sh <= data; state <= 4'd1; tick <= 2'd0;
      end
    end else if (tick == 2'd3) begin
      tick <= 2'd0;
      if (state == 4'd10)
        state <= 4'd0;
      else begin
        if (state >= 4'd2 && state < 4'd9)
          sh <= {1'b1, sh[7:1]};
        state <= state + 4'd1;
      end
    end else
      tick <= tick + 2'd1;
  end
endmodule

module tb;
  reg clk, rst, start;
  reg [7:0] txdata;
  wire txd, busy;
  wire [7:0] rxdata;
  wire done;

  uart_tx tx(.clk(clk), .rst(rst), .start(start), .data(txdata), .txd(txd), .busy(busy));
  uart_rx dut(.clk(clk), .rst(rst), .rx(txd), .data(rxdata), .done(done));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  initial begin
    clk = 0; rst = 1; start = 0; txdata = 8'h00;
    @(posedge clk); #1; rst = 0;

    txdata = 8'hA5; start = 1;
    @(posedge clk); #1;
    @(posedge clk); #1; start = 0;
    @(posedge done); #1;
    if (rxdata === 8'hA5) pass = pass + 1;
    else $display("FAIL: A5 got=%0d", rxdata);

    start = 1; txdata = 8'h3C;
    @(posedge clk); #1;
    @(posedge clk); #1;
    @(posedge clk); #1; start = 0;
    @(posedge done); #1;
    if (rxdata === 8'h3C) pass = pass + 1;
    else $display("FAIL: 3C got=%0d", rxdata);

    if (pass == 2) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module uart_rx (
  input        clk,
  input        rst,
  input        rx,
  output reg [7:0] data,
  output reg       done
);
  reg [2:0] state;   // 0=idle 1=sync 2=data 3=stop
  reg [1:0] tick;
  reg [3:0] bitcnt;
  reg [7:0] sh;

  always @(posedge clk) begin
    if (rst) begin
      state <= 3'd0; tick <= 2'd0; bitcnt <= 4'd0;
      sh <= 8'd0; data <= 8'd0; done <= 1'b0;
    end else begin
      done <= 1'b0;
      case (state)
        3'd0:
          if (rx == 1'b0) begin
            state <= 3'd1; tick <= 2'd0;
          end
        3'd1: begin
          if (tick == 2'd1) begin
            state <= 3'd2; tick <= 2'd0; bitcnt <= 4'd0;
          end else
            tick <= tick + 2'd1;
        end
        3'd2: begin
          if (tick == 2'd2)
            sh <= {rx, sh[7:1]};
          if (tick == 2'd3) begin
            tick <= 2'd0;
            if (bitcnt == 4'd7) begin
              data <= sh;
              state <= 3'd3;
            end else
              bitcnt <= bitcnt + 4'd1;
          end else
            tick <= tick + 2'd1;
        end
        default: begin
          if (tick == 2'd2)
            done <= (rx == 1'b1);
          if (tick == 2'd3)
            state <= 3'd0;
          else
            tick <= tick + 2'd1;
        end
      endcase
    end
  end
endmodule`,
        },
        {
          id: '3',
          title: 'SPI 主发送器（模式 0）',
          desc: '实现 `spi_tx`（HALF=2，SCLK 每 2 拍翻转）：`start=1` 时拉低 `cs`、装载数据 **MSB 先**发。8 个上升沿发完，拉回 `cs`。模式 0：下降沿换数据、上升沿采样。',
          hints: [
            '装载：`sh <= data; sdo <= data[7]; cs <= 0;`',
            '`cnt` 计 HALF 拍翻转 sclk；**sclk 下降沿**（sclk 当前是 1）时移出下一位：`sh <= {sh[6:0], 1\'b0}; sdo <= sh[6];`',
            '发完 8 位（bitcnt==7 后再遇下降沿）拉高 cs 结束。',
          ],
          starter: `module spi_tx (
  input        clk,
  input        rst,
  input        start,
  input  [7:0] data,
  output reg   cs,
  output reg   sclk,
  output reg   sdo,
  output       busy
);
  reg [1:0] cnt;
  reg [2:0] bitcnt;
  reg [7:0] sh;

  // TODO: idle 装载；发送中每 HALF 拍翻转 sclk；下降沿移位/结束

endmodule`,
          testbench: `module tb;
  reg clk, rst, start;
  reg [7:0] data;
  wire cs, sclk, sdo, busy;
  spi_tx dut(.clk(clk), .rst(rst), .start(start), .data(data), .cs(cs), .sclk(sclk), .sdo(sdo), .busy(busy));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  reg [31:0] i;
  initial begin
    clk = 0; rst = 1; start = 0; data = 8'h00;
    @(posedge clk); #1; rst = 0;

    if (cs == 1'b1 && sclk == 1'b0 && busy == 1'b0) pass = pass + 1;
    else $display("FAIL: idle cs=%b sclk=%b", cs, sclk);

    data = 8'hB7; start = 1;
    @(negedge cs);
    start = 0;

    for (i = 0; i < 8; i = i + 1) begin
      @(posedge sclk);
      if (sdo === data[7-i]) pass = pass + 1;
      else $display("FAIL: bit %0d sdo=%b", i, sdo);
    end
    @(posedge cs); #1;
    if (busy == 1'b0) pass = pass + 1; else $display("FAIL: after busy=%b", busy);

    if (pass == 10) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module spi_tx (
  input        clk,
  input        rst,
  input        start,
  input  [7:0] data,
  output reg   cs,
  output reg   sclk,
  output reg   sdo,
  output       busy
);
  reg [1:0] cnt;
  reg [2:0] bitcnt;
  reg [7:0] sh;

  assign busy = (cs == 1'b0);

  always @(posedge clk) begin
    if (rst) begin
      cs <= 1'b1; sclk <= 1'b0; sdo <= 1'b0;
      cnt <= 2'd0; bitcnt <= 3'd0; sh <= 8'd0;
    end else if (cs) begin
      if (start) begin
        sh <= data; sdo <= data[7];
        cs <= 1'b0; sclk <= 1'b0; cnt <= 2'd0; bitcnt <= 3'd0;
      end
    end else begin
      if (cnt == 2'd1) begin
        cnt <= 2'd0;
        sclk <= ~sclk;
        if (sclk) begin
          if (bitcnt == 3'd7)
            cs <= 1'b1;
          else begin
            sh <= {sh[6:0], 1'b0};
            sdo <= sh[6];
            bitcnt <= bitcnt + 3'd1;
          end
        end
      end else
        cnt <= cnt + 2'd1;
    end
  end
endmodule`,
        },
      ],
    },

    // ---------------- 第 20 章 ----------------
    {
      id: '20',
      title: '数码管与 BCD',
      subtitle: '让人看懂的显示：扫描、译码与十进制修正',
      blocks: [
        {
          k: 'p',
          t: '七段数码管是 8 个 LED 排成 "8" 字。想让 4 只管同时显示，不需要 32 根线——**扫描**：每一拍只点亮一只管，快速轮换，眼睛的视觉暂留会把它们"同时"留住。',
        },
        {
          k: 'code',
          label: '扫描的原理（4 只管）',
          code: `// cnt 高位选管；an 低有效（选中那位为 0）
always @(*) begin
  case (sel)
    2'd0: begin an = 4'b1110; seg = seg7(d0); end
    2'd1: begin an = 4'b1101; seg = seg7(d1); end
    2'd2: begin an = 4'b1011; seg = seg7(d2); end
    2'd3: begin an = 4'b0111; seg = seg7(d3); end
  endcase
end`,
        },
        {
          k: 'p',
          t: '`seg7` 是纯组合译码：4 位数字 → 7 段亮暗。本课程约定 `seg = {a,b,c,d,e,f,g}`（a 是最高位），**亮为 1**（共阴接法）。',
        },
        { k: 'h2', t: 'BCD：二进制里的十进制' },
        {
          k: 'p',
          t: '显示 99 要两位十进制数字。直接存二进制不好译码，于是每个十进制位用 4 位二进制单独存——这就是 **BCD**。加法出错的地方在于：4 位加出 10~15 时十进制要进位，修正方法很简单：**加 6**。',
        },
        {
          k: 'note',
          tone: 'info',
          title: '为什么是 +6',
          t: '4 位二进制到 16 才进位，十进制到 10 就要进位，差 6。`7+5=12`（十六进制 C），`12+6=18=1_0010`——进位 1、本位 2，正是十进制的 12。',
        },
      ],
      exercises: [
        {
          id: '1',
          title: '七段译码器',
          desc: '实现组合译码器 `seg7`：输入 4 位 `d`，输出 `seg = {a,b,c,d,e,f,g}`（a 为最高位，亮为 1）。数字 0-9 的编码按标准字形，其余值显示"全灭以外的安全值"（返回 9 的编码即可）。',
          hints: [
            '编码表：0=7\'h7E、1=7\'h30、2=7\'h6D、3=7\'h79、4=7\'h33、5=7\'h5B、6=7\'h5F、7=7\'h70、8=7\'h7F、9=7\'h7B。',
            '`always @(*)` + `case (d)`，`default` 兜 9。',
          ],
          starter: `module seg7dec (
  input      [3:0] d,
  output reg [6:0] seg
);

  // TODO: case (d) 按标准字形译码

endmodule`,
          testbench: `module tb;
  reg [3:0] d;
  wire [6:0] seg;
  seg7dec dut(.d(d), .seg(seg));

  reg [6:0] exp;
  reg [31:0] pass = 0;
  reg [31:0] i;
  initial begin
    for (i = 0; i < 10; i = i + 1) begin
      d = i[3:0];
      #5;
      case (i)
        0: exp = 7'h7E;
        1: exp = 7'h30;
        2: exp = 7'h6D;
        3: exp = 7'h79;
        4: exp = 7'h33;
        5: exp = 7'h5B;
        6: exp = 7'h5F;
        7: exp = 7'h70;
        8: exp = 7'h7F;
        default: exp = 7'h7B;
      endcase
      if (seg === exp) pass = pass + 1;
      else $display("FAIL: d=%0d seg=%0d exp=%0d", d, seg, exp);
    end
    if (pass == 10) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module seg7dec (
  input      [3:0] d,
  output reg [6:0] seg
);

  always @(*) begin
    case (d)
      4'd0: seg = 7'h7E;
      4'd1: seg = 7'h30;
      4'd2: seg = 7'h6D;
      4'd3: seg = 7'h79;
      4'd4: seg = 7'h33;
      4'd5: seg = 7'h5B;
      4'd6: seg = 7'h5F;
      4'd7: seg = 7'h70;
      4'd8: seg = 7'h7F;
      default: seg = 7'h7B;
    endcase
  end
endmodule`,
        },
        {
          id: '2',
          title: '4 位扫描显示',
          desc: '实现扫描显示：计数器 `cnt` 一直加一，取 `cnt` 的选管位段轮流点亮 4 只管（`an` 低有效：选 d0 时 an=1110、d1 时 1101、d2 时 1011、d3 时 0111），`seg` 输出对应数字的译码。参数 `LOG2` 是"每 2^LOG2 拍换一只管"。',
          hints: [
            '三个部件：cnt 时钟分频（`cnt <= cnt + 1`）、组合 `case (cnt[LOG2+1:LOG2])` 选 an+seg、function `seg7` 译码。',
            'function 写在 module 里：`function [6:0] seg7(input [3:0] d); ... endfunction`，编码同上一题。',
            '选管序列 0→1→2→3 循环；复位 cnt 清 0。',
          ],
          starter: `module scan4 #(
  parameter LOG2 = 2
) (
  input            clk,
  input            rst,
  input      [3:0] d0, d1, d2, d3,
  output reg  [3:0] an,
  output reg  [6:0] seg
);
  reg [31:0] cnt;

  // TODO: function seg7；cnt 计数；组合 case 选 an / seg

endmodule`,
          testbench: `module tb;
  reg clk, rst;
  reg [3:0] d0, d1, d2, d3;
  wire [3:0] an;
  wire [6:0] seg;
  scan4 #(.LOG2(0)) dut(.clk(clk), .rst(rst), .d0(d0), .d1(d1), .d2(d2), .d3(d3), .an(an), .seg(seg));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  initial begin
    clk = 0; rst = 1; d0 = 4'd1; d1 = 4'd2; d2 = 4'd4; d3 = 4'd8;
    @(posedge clk); #1;
    rst = 0;

    if (an === 4'b1110 && seg === 7'h30) pass = pass + 1;
    else $display("FAIL: t0 an=%b seg=%0d", an, seg);

    @(posedge clk); #1;
    if (an === 4'b1101 && seg === 7'h6D) pass = pass + 1;
    else $display("FAIL: t1 an=%b seg=%0d", an, seg);

    @(posedge clk); #1;
    if (an === 4'b1011 && seg === 7'h33) pass = pass + 1;
    else $display("FAIL: t2 an=%b seg=%0d", an, seg);

    @(posedge clk); #1;
    if (an === 4'b0111 && seg === 7'h7F) pass = pass + 1;
    else $display("FAIL: t3 an=%b seg=%0d", an, seg);

    @(posedge clk); #1;
    if (an === 4'b1110 && seg === 7'h30) pass = pass + 1;
    else $display("FAIL: wrap an=%b seg=%0d", an, seg);

    if (pass == 5) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module scan4 #(
  parameter LOG2 = 2
) (
  input            clk,
  input            rst,
  input      [3:0] d0, d1, d2, d3,
  output reg  [3:0] an,
  output reg  [6:0] seg
);
  reg [31:0] cnt;

  function [6:0] seg7(input [3:0] d);
    case (d)
      4'd0: seg7 = 7'h7E;
      4'd1: seg7 = 7'h30;
      4'd2: seg7 = 7'h6D;
      4'd3: seg7 = 7'h79;
      4'd4: seg7 = 7'h33;
      4'd5: seg7 = 7'h5B;
      4'd6: seg7 = 7'h5F;
      4'd7: seg7 = 7'h70;
      4'd8: seg7 = 7'h7F;
      default: seg7 = 7'h7B;
    endcase
  endfunction

  always @(posedge clk) begin
    if (rst) cnt <= 32'd0;
    else cnt <= cnt + 32'd1;
  end

  always @(*) begin
    case (cnt[LOG2+1:LOG2])
      2'd0: begin an = 4'b1110; seg = seg7(d0); end
      2'd1: begin an = 4'b1101; seg = seg7(d1); end
      2'd2: begin an = 4'b1011; seg = seg7(d2); end
      default: begin an = 4'b0111; seg = seg7(d3); end
    endcase
  end
endmodule`,
        },
        {
          id: '3',
          title: 'BCD 加法器',
          desc: '实现一位 BCD 加法器：`a + b` 是十进制加法。和大于 9 时本位减 10（即加 6 修正）并 `cout=1`。',
          hints: [
            '先按普通二进制加到 5 位中间量：`assign raw = {1\'b0, a} + {1\'b0, b};`（显式零扩展，防止 4 位截断）。',
            '`raw > 9` 时：`s = raw[3:0] + 6`（截断后正好是减 10 的结果）、`cout = 1`；否则原样、`cout = 0`。',
          ],
          starter: `module bcd_add (
  input  [3:0] a, b,
  output reg [3:0] s,
  output reg      cout
);
  wire [4:0] raw;

  // TODO: raw 二进制和；raw > 9 时 +6 修正并进位

endmodule`,
          testbench: `module tb;
  reg [3:0] a, b;
  wire [3:0] s;
  wire cout;
  bcd_add dut(.a(a), .b(b), .s(s), .cout(cout));

  reg [31:0] pass = 0;
  initial begin
    a = 4'd3; b = 4'd5;
    #5;
    if (s === 4'd8 && cout == 1'b0) pass = pass + 1;
    else $display("FAIL: 3+5 s=%0d c=%b", s, cout);

    a = 4'd7; b = 4'd5;
    #5;
    if (s === 4'd2 && cout == 1'b1) pass = pass + 1;
    else $display("FAIL: 7+5 s=%0d c=%b", s, cout);

    a = 4'd9; b = 4'd9;
    #5;
    if (s === 4'd8 && cout == 1'b1) pass = pass + 1;
    else $display("FAIL: 9+9 s=%0d c=%b", s, cout);

    a = 4'd0; b = 4'd0;
    #5;
    if (s === 4'd0 && cout == 1'b0) pass = pass + 1;
    else $display("FAIL: 0+0 s=%0d c=%b", s, cout);

    a = 4'd2; b = 4'd8;
    #5;
    if (s === 4'd0 && cout == 1'b1) pass = pass + 1;
    else $display("FAIL: 2+8 s=%0d c=%b", s, cout);

    if (pass == 5) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module bcd_add (
  input  [3:0] a, b,
  output reg [3:0] s,
  output reg      cout
);
  wire [4:0] raw;

  assign raw = {1'b0, a} + {1'b0, b};

  always @(*) begin
    if (raw > 5'd9) begin
      s = raw[3:0] + 4'd6;
      cout = 1'b1;
    end else begin
      s = raw[3:0];
      cout = 1'b0;
    end
  end
endmodule`,
        },
      ],
    },

    // ---------------- 第 21 章 ----------------
    {
      id: '21',
      title: '综合项目：状态机实战',
      subtitle: '交通灯、密码锁、秒表——把零件装配成整机',
      blocks: [
        {
          k: 'p',
          t: '三个项目，三种典型结构：**交通灯**是"状态 + 定时"的教科书级 Moore 机；**密码锁**展示"状态即匹配进度"的序列检测；**秒表**把第 20 章的 BCD 级联成多级计数。它们是面试与课程设计中出镜率最高的三种电路。',
        },
        { k: 'h2', t: '交通灯：状态机的名片' },
        {
          k: 'code',
          label: '状态 + 递减定时器',
          code: `module traffic #(
  parameter T_GREEN = 60,
  parameter T_YELLOW = 5
)(
  input      clk, rst,
  output reg mg, my, mr,   // 主路 绿/黄/红
  output reg sg, sy, sr    // 支路 绿/黄/红
);
  reg [1:0] state;   // 0=MG 1=MY 2=SG 3=SY
  reg [5:0] timer;

  always @(posedge clk) begin
    if (rst) begin
      state <= 2'd0;
      timer <= T_GREEN - 1;
    end else if (timer != 6'd0)
      timer <= timer - 1;
    else begin
      state <= state + 2'd1;   // 2 位自然回绕
      // TODO: 按新状态装载 timer
    end
  end

  always @(*) begin
    case (state)
      // TODO: 六个灯
    endcase
  end
endmodule`,
        },
        {
          k: 'p',
          t: '两个部件分工明确：**时序块**只管"什么时候变"——`timer` 每拍递减，减到 0 换态并按新态重装时长；**组合块**只管"变到什么"——`case (state)` 查表点亮六个灯。回绕不需要 if：`state <= state + 2\'d1;` 在 2 位宽度下自然从 SY 回到 MG。',
        },
        { k: 'h2', t: '密码锁：状态即进度' },
        {
          k: 'p',
          t: '检测固定序列 5→3→9→7？让 `state` 记录"已匹配几位"：每个 `key_valid` 拍，匹配则推进、失配则归零并让 `fail_cnt` 加一。第 4 位匹配后 `unlock` 置位并**保持**——不复位就不清零，寄存器天然给出"锁存"语义。',
        },
        { k: 'h2', t: '秒表：BCD 也能级联' },
        {
          k: 'p',
          t: '从 0.99 计到 1.00 不需要借位判断：每级都是"本位逢 9 清零、同时给高位 +1"，嵌套 if 从 `cs_lo` 一路包到 `s_lo`——与手算竖式完全同构。',
        },
        {
          k: 'note',
          tone: 'tip',
          title: '项目题的通用骨架',
          t: '先画状态转移图，再按固定顺序写时序块：复位分支 → 递减/等待分支 → 换态分支；输出单独放组合块。"什么时候变"与"变到什么"分开放，就不会互相污染。',
        },
      ],
      exercises: [
        {
          id: '1',
          title: '十字路口交通灯',
          desc: '实现 `traffic`：主路 `mg/my/mr`、支路 `sg/sy/sr`（绿/黄/红），灯 1=亮。四态循环 MG→MY→SG→SY：绿灯亮 `T_GREEN` 拍、黄灯亮 `T_YELLOW` 拍，参数例化时可覆盖。',
          hints: [
            '换态时用 `case (state + 2\'d1)` 看新态装时长：新态 0 或 2 装 `T_GREEN-1`，其余装 `T_YELLOW-1`。',
            '灯是纯组合：`case (state)` 给六灯赋值，MG 态是 mg=1 且 sr=1，SG 态是 mr=1 且 sg=1。',
            '灯较多时可以用拼接左侧值：`{mg, my, mr, sg, sy, sr} = 6\'b100001;`。',
          ],
          starter: `module traffic #(
  parameter T_GREEN = 60,
  parameter T_YELLOW = 5
)(
  input      clk, rst,
  output reg mg, my, mr,   // 主路 绿/黄/红
  output reg sg, sy, sr    // 支路 绿/黄/红
);
  reg [1:0] state;   // 0=MG 1=MY 2=SG 3=SY
  reg [5:0] timer;

  // TODO: 时序块——rst 复位；timer 减到 0 换态（state + 1 回绕）并重装

  // TODO: 组合块——case (state) 装六个灯

endmodule`,
          testbench: `module tb;
  reg clk, rst;
  wire mg, my, mr, sg, sy, sr;
  traffic #(.T_GREEN(3), .T_YELLOW(2)) dut(
    .clk(clk), .rst(rst),
    .mg(mg), .my(my), .mr(mr), .sg(sg), .sy(sy), .sr(sr)
  );

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  initial begin
    clk = 0; rst = 1;
    @(posedge clk); #1;
    rst = 0;
    if (mg == 1'b1 && sr == 1'b1) pass = pass + 1;
    else $display("FAIL: reset mg=%b sr=%b", mg, sr);

    @(posedge clk); #1;
    if (mg == 1'b1 && sr == 1'b1) pass = pass + 1;
    else $display("FAIL: p1 mg=%b sr=%b", mg, sr);

    @(posedge clk); #1;
    if (mg == 1'b1 && sr == 1'b1) pass = pass + 1;
    else $display("FAIL: p2 mg=%b sr=%b", mg, sr);

    @(posedge clk); #1;
    if (my == 1'b1 && sr == 1'b1) pass = pass + 1;
    else $display("FAIL: my1 my=%b sr=%b", my, sr);

    @(posedge clk); #1;
    if (my == 1'b1 && sr == 1'b1) pass = pass + 1;
    else $display("FAIL: my2 my=%b", my);

    @(posedge clk); #1;
    if (sg == 1'b1 && mr == 1'b1) pass = pass + 1;
    else $display("FAIL: sg1 sg=%b mr=%b", sg, mr);

    @(posedge clk); #1;
    if (sg == 1'b1 && mr == 1'b1) pass = pass + 1;
    else $display("FAIL: sg2 sg=%b", sg);

    @(posedge clk); #1;
    if (sg == 1'b1 && mr == 1'b1) pass = pass + 1;
    else $display("FAIL: sg3 sg=%b", sg);

    @(posedge clk); #1;
    if (sy == 1'b1 && mr == 1'b1) pass = pass + 1;
    else $display("FAIL: sy1 sy=%b mr=%b", sy, mr);

    @(posedge clk); #1;
    if (sy == 1'b1 && mr == 1'b1) pass = pass + 1;
    else $display("FAIL: sy2 sy=%b", sy);

    @(posedge clk); #1;
    if (mg == 1'b1 && sr == 1'b1) pass = pass + 1;
    else $display("FAIL: wrap mg=%b sr=%b", mg, sr);

    if (pass == 11) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module traffic #(
  parameter T_GREEN = 60,
  parameter T_YELLOW = 5
)(
  input      clk, rst,
  output reg mg, my, mr,   // 主路 绿/黄/红
  output reg sg, sy, sr    // 支路 绿/黄/红
);
  reg [1:0] state;   // 0=MG 1=MY 2=SG 3=SY
  reg [5:0] timer;

  always @(posedge clk) begin
    if (rst) begin
      state <= 2'd0;
      timer <= T_GREEN - 1;
    end else if (timer != 6'd0) begin
      timer <= timer - 1;
    end else begin
      state <= state + 2'd1;
      case (state + 2'd1)
        2'd0:    timer <= T_GREEN - 1;
        2'd2:    timer <= T_GREEN - 1;
        default: timer <= T_YELLOW - 1;
      endcase
    end
  end

  always @(*) begin
    case (state)
      2'd0:    {mg, my, mr, sg, sy, sr} = 6'b100001;
      2'd1:    {mg, my, mr, sg, sy, sr} = 6'b010001;
      2'd2:    {mg, my, mr, sg, sy, sr} = 6'b001100;
      default: {mg, my, mr, sg, sy, sr} = 6'b001010;
    endcase
  end
endmodule`,
        },
        {
          id: '2',
          title: '序列密码锁',
          desc: '实现 `lock`：密码是 5→3→9→7。每个 `key_valid=1` 的拍检查 `key`：匹配则推进进度（`state`），失配则进度清零、`fail_cnt` 加一。第 4 位匹配后 `unlock` 置 1 并**保持**——之后无论再按什么都解锁着（直到复位）。',
          hints: [
            'state 是"已匹配位数"0..3，`case (state)` 每支比较 `key` 与密码对应位。',
            '失配统一写法：`state <= 2\'d0; fail_cnt <= fail_cnt + 2\'d1;`。',
            'state 3 匹配 7 时只做 `unlock <= 1\'b1;`（停在 3，可反复匹配）。`key_valid=0` 的拍什么都不做。',
          ],
          starter: `module lock (
  input        clk, rst,
  input        key_valid,
  input  [3:0] key,
  output reg       unlock,
  output reg [1:0] fail_cnt
);
  reg [1:0] state;   // 已匹配的位数：0..3

  // TODO: key_valid 拍 case (state) 匹配推进 / 失配清零计数

endmodule`,
          testbench: `module tb;
  reg clk, rst, key_valid;
  reg [3:0] key;
  wire unlock;
  wire [1:0] fail_cnt;

  lock dut(.clk(clk), .rst(rst), .key_valid(key_valid), .key(key),
           .unlock(unlock), .fail_cnt(fail_cnt));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  initial begin
    clk = 0; rst = 1; key_valid = 0; key = 4'd0;
    @(posedge clk); #1;
    rst = 0;
    if (unlock == 1'b0 && fail_cnt == 2'd0) pass = pass + 1;
    else $display("FAIL: reset u=%b fc=%0d", unlock, fail_cnt);

    // 5 对、9 错（此时期望 3）
    @(negedge clk); key_valid = 1; key = 4'd5;
    @(negedge clk); key = 4'd9;
    @(negedge clk); key_valid = 0;
    @(posedge clk); #1;
    if (fail_cnt == 2'd1 && unlock == 1'b0) pass = pass + 1;
    else $display("FAIL: fc1 fc=%0d", fail_cnt);

    // 3 错（进度已清零，期望 5）
    @(negedge clk); key_valid = 1; key = 4'd3;
    @(negedge clk); key_valid = 0;
    @(posedge clk); #1;
    if (fail_cnt == 2'd2) pass = pass + 1;
    else $display("FAIL: fc2 fc=%0d", fail_cnt);

    // 正确序列 5 3 9 7
    @(negedge clk); key_valid = 1; key = 4'd5;
    @(negedge clk); key = 4'd3;
    @(negedge clk); key = 4'd9;
    @(negedge clk); key = 4'd7;
    @(negedge clk); key_valid = 0;
    @(posedge clk); #1;
    if (unlock == 1'b1) pass = pass + 1;
    else $display("FAIL: unlock u=%b", unlock);

    // 解锁后乱按，unlock 保持
    @(negedge clk); key_valid = 1; key = 4'd5;
    @(negedge clk); key_valid = 0;
    @(posedge clk); #1;
    if (unlock == 1'b1) pass = pass + 1;
    else $display("FAIL: hold u=%b", unlock);

    if (pass == 5) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module lock (
  input        clk, rst,
  input        key_valid,
  input  [3:0] key,
  output reg       unlock,
  output reg [1:0] fail_cnt
);
  reg [1:0] state;   // 已匹配的位数：0..3

  always @(posedge clk) begin
    if (rst) begin
      state    <= 2'd0;
      unlock   <= 1'b0;
      fail_cnt <= 2'd0;
    end else if (key_valid) begin
      case (state)
        2'd0: begin
          if (key == 4'd5) state <= 2'd1;
          else begin state <= 2'd0; fail_cnt <= fail_cnt + 2'd1; end
        end
        2'd1: begin
          if (key == 4'd3) state <= 2'd2;
          else begin state <= 2'd0; fail_cnt <= fail_cnt + 2'd1; end
        end
        2'd2: begin
          if (key == 4'd9) state <= 2'd3;
          else begin state <= 2'd0; fail_cnt <= fail_cnt + 2'd1; end
        end
        default: begin
          if (key == 4'd7) unlock <= 1'b1;
          else begin state <= 2'd0; fail_cnt <= fail_cnt + 2'd1; end
        end
      endcase
    end
  end
endmodule`,
        },
        {
          id: '3',
          title: '百分秒秒表',
          desc: '实现 `stopwatch`：`tick=1` 的每拍百分秒加 1。三级 BCD 级联：`cs_lo`（0.1 秒位）逢 9 进到 `cs_hi`（个位秒），`cs_hi` 逢 9 进到 `s_lo`（十位秒），`s_lo` 到 9 回 0。`tick=0` 时全部保持。',
          hints: [
            '嵌套 if：`cs_lo == 4\'d9` 时本位清零、看 `cs_hi`；否则本位加一。',
            '每级结构相同："逢 9 清零并进位，否则加一"，最内层处理 `s_lo`。',
            '复位清三组；`tick=0` 拍什么都不做。',
          ],
          starter: `module stopwatch (
  input      clk, rst, tick,
  output reg [3:0] cs_lo, cs_hi, s_lo
);
  // TODO: tick=1 拍百分秒 +1，三级 BCD 级联进位

endmodule`,
          testbench: `module tb;
  reg clk, rst, tick;
  wire [3:0] cs_lo, cs_hi, s_lo;
  stopwatch dut(.clk(clk), .rst(rst), .tick(tick),
                .cs_lo(cs_lo), .cs_hi(cs_hi), .s_lo(s_lo));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  initial begin
    clk = 0; rst = 1; tick = 0;
    @(posedge clk); #1;
    rst = 0;
    if (cs_lo == 4'd0 && cs_hi == 4'd0 && s_lo == 4'd0) pass = pass + 1;
    else $display("FAIL: reset cs=%0d%0d s=%0d", cs_hi, cs_lo, s_lo);

    tick = 1;
    repeat (9) @(posedge clk); #1;
    if (cs_lo == 4'd9 && cs_hi == 4'd0 && s_lo == 4'd0) pass = pass + 1;
    else $display("FAIL: 9 cs=%0d%0d", cs_hi, cs_lo);

    @(posedge clk); #1;
    if (cs_lo == 4'd0 && cs_hi == 4'd1) pass = pass + 1;
    else $display("FAIL: 10 cs=%0d%0d", cs_hi, cs_lo);

    repeat (89) @(posedge clk); #1;
    if (cs_lo == 4'd9 && cs_hi == 4'd9 && s_lo == 4'd0) pass = pass + 1;
    else $display("FAIL: 99 cs=%0d%0d", cs_hi, cs_lo);

    @(posedge clk); #1;
    if (cs_lo == 4'd0 && cs_hi == 4'd0 && s_lo == 4'd1) pass = pass + 1;
    else $display("FAIL: 100 s=%0d cs=%0d%0d", s_lo, cs_hi, cs_lo);

    repeat (9) @(posedge clk); #1;
    if (cs_lo == 4'd9 && s_lo == 4'd1) pass = pass + 1;
    else $display("FAIL: 109 cs=%0d%0d s=%0d", cs_hi, cs_lo, s_lo);

    if (pass == 6) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module stopwatch (
  input      clk, rst, tick,
  output reg [3:0] cs_lo, cs_hi, s_lo
);
  always @(posedge clk) begin
    if (rst) begin
      cs_lo <= 4'd0; cs_hi <= 4'd0; s_lo <= 4'd0;
    end else if (tick) begin
      if (cs_lo == 4'd9) begin
        cs_lo <= 4'd0;
        if (cs_hi == 4'd9) begin
          cs_hi <= 4'd0;
          if (s_lo == 4'd9) s_lo <= 4'd0;
          else s_lo <= s_lo + 4'd1;
        end else begin
          cs_hi <= cs_hi + 4'd1;
        end
      end else begin
        cs_lo <= cs_lo + 4'd1;
      end
    end
  end
endmodule`,
        },
      ],
    },

    // ---------------- 第 22 章 ----------------
    {
      id: '22',
      title: '毕业挑战',
      subtitle: '售货机、UART 回声、正交编码器——最后三题',
      blocks: [
        {
          k: 'p',
          t: '最后三题没有新语法，只有**集成**：售货机把"算术 + 状态 + 脉冲输出"打包成一件；回声电路练多模块顶层连线——这正是 IP 复用的日常；正交编码器练边沿检测这个最常用的"事件"原语。',
        },
        {
          k: 'ul',
          items: [
            '**自动售货机**：`credit` 累加硬币面值，够 15 出货（`dispense` 单拍脉冲），恰好 20 找零（`change`）。',
            '**UART 回声**：`uart_rx` 的 `done` 直连 `uart_tx` 的 `start`——收完即发，一行额外状态机都不用写。',
            '**正交编码器**：A 相上升沿时看 B 相位定方向——电机转速表就是这么做的。',
          ],
        },
        {
          k: 'note',
          tone: 'warn',
          title: '脉冲输出的套路',
          t: '像 `dispense` 这种"拉高一拍"的信号，写法固定：动作拍 `<= 1`，**其余所有分支 `<= 0`**。漏掉任何一个清零分支，脉冲就变成电平，下游会被触发多次。',
        },
        {
          k: 'p',
          t: '完成这一章，23 章的旅程就到终点了。把三题全部点亮，然后——去搭属于自己的 CPU 吧。',
        },
      ],
      exercises: [
        {
          id: '1',
          title: '自动售货机',
          desc: '实现 `vending`：可乐 15 元，只收 5 元与 10 元硬币（`coin_valid=1` 拍表示投入面值 `coin`）。余额达到 15：出货 `dispense`（单拍脉冲）、`credit` 清零；恰好 20 时 `change` 同拍找零。不足则累加余额。',
          hints: [
            'coin_valid 拍先判断：`credit + coin >= 5\'d15` 就三件套：`dispense <= 1\'b1; change <= (credit + coin == 5\'d20); credit <= 5\'d0;`。',
            '不足则 `credit <= credit + coin;`。',
            'dispense / change 是单拍脉冲：其余**所有**分支都要把它们清 0。',
          ],
          starter: `module vending (
  input        clk, rst,
  input        coin_valid,
  input  [3:0] coin,
  output reg       dispense,
  output reg       change,
  output reg [4:0] credit
);
  // TODO: coin_valid 拍判断出货或累加；其余拍清脉冲

endmodule`,
          testbench: `module tb;
  reg clk, rst, coin_valid;
  reg [3:0] coin;
  wire dispense, change;
  wire [4:0] credit;

  vending dut(.clk(clk), .rst(rst), .coin_valid(coin_valid), .coin(coin),
              .dispense(dispense), .change(change), .credit(credit));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  initial begin
    clk = 0; rst = 1; coin_valid = 0; coin = 4'd0;
    @(posedge clk); #1;
    rst = 0;

    // 投 5：余额 5
    @(negedge clk); coin_valid = 1; coin = 4'd5;
    @(posedge clk); #1; coin_valid = 0;
    if (credit == 5'd5 && dispense == 1'b0) pass = pass + 1;
    else $display("FAIL: 5 credit=%0d", credit);

    // 投 10：满 15 出货
    @(negedge clk); coin_valid = 1; coin = 4'd10;
    @(posedge clk); #1; coin_valid = 0;
    if (dispense == 1'b1 && credit == 5'd0 && change == 1'b0) pass = pass + 1;
    else $display("FAIL: 15 d=%b c=%0d ch=%b", dispense, credit, change);

    // 下一拍脉冲收回
    @(posedge clk); #1;
    if (dispense == 1'b0) pass = pass + 1;
    else $display("FAIL: pulse d=%b", dispense);

    // 投 10：余额 10
    @(negedge clk); coin_valid = 1; coin = 4'd10;
    @(posedge clk); #1; coin_valid = 0;
    if (credit == 5'd10) pass = pass + 1;
    else $display("FAIL: 10 credit=%0d", credit);

    // 再投 10：满 20 出货 + 找零
    @(negedge clk); coin_valid = 1; coin = 4'd10;
    @(posedge clk); #1; coin_valid = 0;
    if (dispense == 1'b1 && change == 1'b1) pass = pass + 1;
    else $display("FAIL: 20 d=%b ch=%b", dispense, change);

    // 5 + 5 + 5：满 15 出货、无找零
    @(negedge clk); coin_valid = 1; coin = 4'd5;
    @(posedge clk); #1;
    @(negedge clk); coin = 4'd5;
    @(posedge clk); #1;
    @(negedge clk); coin = 4'd5;
    @(posedge clk); #1; coin_valid = 0;
    if (dispense == 1'b1 && change == 1'b0) pass = pass + 1;
    else $display("FAIL: 555 d=%b ch=%b", dispense, change);

    if (pass == 6) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module vending (
  input        clk, rst,
  input        coin_valid,
  input  [3:0] coin,
  output reg       dispense,
  output reg       change,
  output reg [4:0] credit
);
  always @(posedge clk) begin
    if (rst) begin
      credit   <= 5'd0;
      dispense <= 1'b0;
      change   <= 1'b0;
    end else if (coin_valid) begin
      if (credit + coin >= 5'd15) begin
        dispense <= 1'b1;
        change   <= (credit + coin == 5'd20);
        credit   <= 5'd0;
      end else begin
        credit   <= credit + coin;
        dispense <= 1'b0;
        change   <= 1'b0;
      end
    end else begin
      dispense <= 1'b0;
      change   <= 1'b0;
    end
  end
endmodule`,
        },
        {
          id: '2',
          title: 'UART 回声电路（顶层集成）',
          desc: '毕业题：不写新模块，做**顶层集成**。`uart_rx` 与 `uart_tx` 已原样给出（第 19 章的作品），在 `echo_top` 里例化两者并连线：收到一个字节，原样发回去（`done` 直连 `start`）。',
          hints: [
            '顶层两条内部线：`wire [7:0] rdata; wire rdone;`。',
            '`uart_rx rx_i (.clk(clk), .rst(rst), .rx(rx), .data(rdata), .done(rdone));`',
            '`uart_tx tx_i (.clk(clk), .rst(rst), .start(rdone), .data(rdata), .txd(txd), .busy(busy));`',
          ],
          starter: `// 这两块是你在第 19 章的作品，原封不动搬来了
module uart_tx (
  input        clk,
  input        rst,
  input        start,
  input  [7:0] data,
  output       txd,
  output       busy
);
  reg [3:0] state;   // 0=idle 1=start 2..9=data 10=stop
  reg [1:0] tick;
  reg [7:0] sh;

  assign txd  = (state == 4'd0 || state == 4'd10) ? 1'b1 :
                (state == 4'd1) ? 1'b0 : sh[0];
  assign busy = (state != 4'd0);

  always @(posedge clk) begin
    if (rst) begin
      state <= 4'd0; tick <= 2'd0; sh <= 8'hFF;
    end else if (state == 4'd0) begin
      if (start) begin
        sh <= data; state <= 4'd1; tick <= 2'd0;
      end
    end else if (tick == 2'd3) begin
      tick <= 2'd0;
      if (state == 4'd10)
        state <= 4'd0;
      else begin
        if (state >= 4'd2 && state < 4'd9)
          sh <= {1'b1, sh[7:1]};
        state <= state + 4'd1;
      end
    end else
      tick <= tick + 2'd1;
  end
endmodule

module uart_rx (
  input        clk,
  input        rst,
  input        rx,
  output reg [7:0] data,
  output reg       done
);
  reg [2:0] state;   // 0=idle 1=sync 2=data 3=stop
  reg [1:0] tick;
  reg [3:0] bitcnt;
  reg [7:0] sh;

  always @(posedge clk) begin
    if (rst) begin
      state <= 3'd0; tick <= 2'd0; bitcnt <= 4'd0;
      sh <= 8'd0; data <= 8'd0; done <= 1'b0;
    end else begin
      done <= 1'b0;
      case (state)
        3'd0:
          if (rx == 1'b0) begin
            state <= 3'd1; tick <= 2'd0;
          end
        3'd1: begin
          if (tick == 2'd1) begin
            state <= 3'd2; tick <= 2'd0; bitcnt <= 4'd0;
          end else
            tick <= tick + 2'd1;
        end
        3'd2: begin
          if (tick == 2'd2)
            sh <= {rx, sh[7:1]};
          if (tick == 2'd3) begin
            tick <= 2'd0;
            if (bitcnt == 4'd7) begin
              data <= sh;
              state <= 3'd3;
            end else
              bitcnt <= bitcnt + 4'd1;
          end else
            tick <= tick + 2'd1;
        end
        default: begin
          if (tick == 2'd2)
            done <= (rx == 1'b1);
          if (tick == 2'd3)
            state <= 3'd0;
          else
            tick <= tick + 2'd1;
        end
      endcase
    end
  end
endmodule

// TODO: 顶层回声电路
module echo_top (
  input        clk,
  input        rst,
  input        rx,
  output       txd,
  output       busy
);
  wire [7:0] rdata;
  wire rdone;

  // TODO: 例化 uart_rx 和 uart_tx，done 接 start

endmodule`,
          testbench: `module tb;
  reg clk, rst;
  reg rx;
  wire txd, busy;

  echo_top dut(.clk(clk), .rst(rst), .rx(rx), .txd(txd), .busy(busy));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  reg [31:0] i;
  reg [7:0] data;
  initial begin
    clk = 0; rst = 1; rx = 1;
    @(posedge clk); #1; rst = 0;

    // 手动在 rx 上打一帧 0x96（起始位 + LSB 先 + 停止位）
    data = 8'h96;
    @(negedge clk); rx = 0;
    repeat (4) @(posedge clk); #1;
    for (i = 0; i < 8; i = i + 1) begin
      rx = data[i];
      repeat (4) @(posedge clk); #1;
    end
    rx = 1;
    repeat (2) @(posedge clk); #1;
    @(negedge txd);                    // 捕获回声的起始位

    repeat (2) @(posedge clk); #1;
    if (txd == 1'b0) pass = pass + 1;
    else $display("FAIL: echo start txd=%b", txd);
    for (i = 0; i < 8; i = i + 1) begin
      repeat (4) @(posedge clk); #1;
      if (txd === data[i]) pass = pass + 1;
      else $display("FAIL: bit %0d txd=%b", i, txd);
    end
    repeat (4) @(posedge clk); #1;
    if (txd == 1'b1) pass = pass + 1;
    else $display("FAIL: echo stop txd=%b", txd);
    repeat (2) @(posedge clk); #1;
    if (busy == 1'b0) pass = pass + 1;
    else $display("FAIL: idle busy=%b", busy);

    if (pass == 11) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module uart_tx (
  input        clk,
  input        rst,
  input        start,
  input  [7:0] data,
  output       txd,
  output       busy
);
  reg [3:0] state;   // 0=idle 1=start 2..9=data 10=stop
  reg [1:0] tick;
  reg [7:0] sh;

  assign txd  = (state == 4'd0 || state == 4'd10) ? 1'b1 :
                (state == 4'd1) ? 1'b0 : sh[0];
  assign busy = (state != 4'd0);

  always @(posedge clk) begin
    if (rst) begin
      state <= 4'd0; tick <= 2'd0; sh <= 8'hFF;
    end else if (state == 4'd0) begin
      if (start) begin
        sh <= data; state <= 4'd1; tick <= 2'd0;
      end
    end else if (tick == 2'd3) begin
      tick <= 2'd0;
      if (state == 4'd10)
        state <= 4'd0;
      else begin
        if (state >= 4'd2 && state < 4'd9)
          sh <= {1'b1, sh[7:1]};
        state <= state + 4'd1;
      end
    end else
      tick <= tick + 2'd1;
  end
endmodule

module uart_rx (
  input        clk,
  input        rst,
  input        rx,
  output reg [7:0] data,
  output reg       done
);
  reg [2:0] state;   // 0=idle 1=sync 2=data 3=stop
  reg [1:0] tick;
  reg [3:0] bitcnt;
  reg [7:0] sh;

  always @(posedge clk) begin
    if (rst) begin
      state <= 3'd0; tick <= 2'd0; bitcnt <= 4'd0;
      sh <= 8'd0; data <= 8'd0; done <= 1'b0;
    end else begin
      done <= 1'b0;
      case (state)
        3'd0:
          if (rx == 1'b0) begin
            state <= 3'd1; tick <= 2'd0;
          end
        3'd1: begin
          if (tick == 2'd1) begin
            state <= 3'd2; tick <= 2'd0; bitcnt <= 4'd0;
          end else
            tick <= tick + 2'd1;
        end
        3'd2: begin
          if (tick == 2'd2)
            sh <= {rx, sh[7:1]};
          if (tick == 2'd3) begin
            tick <= 2'd0;
            if (bitcnt == 4'd7) begin
              data <= sh;
              state <= 3'd3;
            end else
              bitcnt <= bitcnt + 4'd1;
          end else
            tick <= tick + 2'd1;
        end
        default: begin
          if (tick == 2'd2)
            done <= (rx == 1'b1);
          if (tick == 2'd3)
            state <= 3'd0;
          else
            tick <= tick + 2'd1;
        end
      endcase
    end
  end
endmodule

module echo_top (
  input        clk,
  input        rst,
  input        rx,
  output       txd,
  output       busy
);
  wire [7:0] rdata;
  wire rdone;

  uart_rx rx_i (.clk(clk), .rst(rst), .rx(rx), .data(rdata), .done(rdone));
  uart_tx tx_i (.clk(clk), .rst(rst), .start(rdone), .data(rdata), .txd(txd), .busy(busy));

endmodule`,
        },
        {
          id: '3',
          title: '正交编码器计数器',
          desc: '实现 `quad`：检测 `a` 的**上升沿**（本拍 `a==1` 且上一拍为 0），此时若 `b==0` 正转：`cnt+1`、`dir=0`；若 `b==1` 反转：`cnt-1`、`dir=1`。其余拍 `cnt` 保持。',
          hints: [
            '每拍无条件保存上一拍：`a_prev <= a;`（放在 if 外面）。',
            '上升沿条件：`if (a == 1\'b1 && a_prev == 1\'b0)`。',
            'dir 只在计数的拍更新，其余拍保持。',
          ],
          starter: `module quad (
  input      clk, rst,
  input      a, b,
  output reg [3:0] cnt,
  output reg      dir
);
  reg a_prev;

  // TODO: 检测 a 上升沿，按 b 决定加减与方向

endmodule`,
          testbench: `module tb;
  reg clk, rst;
  reg a, b;
  wire [3:0] cnt;
  wire dir;

  quad dut(.clk(clk), .rst(rst), .a(a), .b(b), .cnt(cnt), .dir(dir));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  reg [31:0] i;
  initial begin
    clk = 0; rst = 1; a = 0; b = 0;
    @(posedge clk); #1;
    rst = 0;
    if (cnt == 4'd0) pass = pass + 1;
    else $display("FAIL: reset cnt=%0d", cnt);

    // 正转 3 步
    for (i = 0; i < 3; i = i + 1) begin
      @(negedge clk); a = 1;
      @(negedge clk); a = 0;
    end
    @(posedge clk); #1;
    if (cnt == 4'd3 && dir == 1'b0) pass = pass + 1;
    else $display("FAIL: fwd cnt=%0d dir=%b", cnt, dir);

    // b=1 后反转 1 步
    @(negedge clk); b = 1; a = 1;
    @(negedge clk); a = 0;
    @(posedge clk); #1;
    if (cnt == 4'd2 && dir == 1'b1) pass = pass + 1;
    else $display("FAIL: rev cnt=%0d dir=%b", cnt, dir);

    if (pass == 3) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module quad (
  input      clk, rst,
  input      a, b,
  output reg [3:0] cnt,
  output reg      dir
);
  reg a_prev;

  always @(posedge clk) begin
    if (rst) begin
      cnt    <= 4'd0;
      dir    <= 1'b0;
      a_prev <= 1'b0;
    end else begin
      if (a == 1'b1 && a_prev == 1'b0) begin
        if (b == 1'b0) begin
          cnt <= cnt + 4'd1;
          dir <= 1'b0;
        end else begin
          cnt <= cnt - 4'd1;
          dir <= 1'b1;
        end
      end
      a_prev <= a;
    end
  end
endmodule`,
        },
      ],
    },
  ],
};

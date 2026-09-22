import type { Stage } from './types';

/**
 * Stage 2 — 时序逻辑（第 08–15 章，25 个练习）
 */
export const sequential: Stage = {
  id: 'seq',
  title: '第二站 · 时序逻辑',
  tagline: '时钟、寄存器与状态机',
  desc: '给电路加上时间维度：非阻塞赋值、触发器、计数器、移位寄存器与状态机——数字设计的核心。',
  chapters: [
    // ---------------- 第 08 章 ----------------
    {
      id: '08',
      title: '时钟与非阻塞赋值',
      subtitle: 'always @(posedge clk) 与 <= 的寄存器语义',
      blocks: [
        {
          k: 'p',
          t: '到目前为止我们写的都是**组合逻辑**：输出只取决于当前输入，没有记忆。这一章给电路加上**时间**——先认识数字世界的心跳：**时钟（clock）**。',
        },
        {
          k: 'h2',
          t: '时钟：电路的心跳',
        },
        {
          k: 'p',
          t: '时钟是一根周期性翻转的方波信号。Verilog 里通常这样生成（仅在测试平台中）:',
        },
        {
          k: 'code',
          label: '测试平台里的时钟发生器',
          code: `reg clk = 0;
always #5 clk = ~clk;   // 每 5 个时间单位翻转一次，周期 = 10`,
        },
        {
          k: 'p',
          t: '我们把 0→1 的跳变叫**上升沿（posedge）**，1→0 的跳变叫**下降沿（negedge）**。绝大多数数字芯片在上升沿「干活」——所有寄存器在同一时钟沿统一更新，整块电路像仪仗队一样步调一致，这就是**同步逻辑**。',
        },
        {
          k: 'h2',
          t: 'D 触发器：一位的记忆',
        },
        {
          k: 'p',
          t: '最基本的时序元件是 **D 触发器（DFF）**：在每个时钟上升沿，把输入 `d` 的值「拍」进寄存器 `q`，其余时间 `q` 纹丝不动。一行 Verilog 就能写出它：',
        },
        {
          k: 'code',
          label: 'D 触发器',
          code: `module dff (
  input      clk,   // 时钟
  input      d,     // 数据输入
  output reg q      // 寄存器输出（reg 类型）
);
  always @(posedge clk)
    q <= d;         // 每个上升沿，把 d 装进 q
endmodule`,
        },
        {
          k: 'p',
          t: '两个新面孔：**`always @(posedge clk)`** 表示「每当 clk 上升沿就执行一次里面的语句」；**`<=`** 是**非阻塞赋值**——它不立刻生效，而是在当前时间步结束时统一更新，模拟真实寄存器「整拍更新」的行为。',
        },
        {
          k: 'note',
          tone: 'warn',
          title: '时序逻辑铁律：用 <=',
          t: '在 always @(posedge clk) 里一律使用非阻塞赋值 <=，不要用 =。阻塞赋值 = 会立刻生效，多个 = 混在同一拍里会产生「谁先谁后」的软件思维，综合出的电路行为难以预料。记住口诀：**沿触发、用箭头（<=）**。',
        },
        {
          k: 'p',
          t: '还有一个细节：`q` 从 wire 变成了 **`output reg`**。在 Verilog 里，凡是always 块里被赋值的信号必须声明为 reg。reg 不等于「寄存器」（组合逻辑的 always @(*) 里也能用 reg），但时序电路里它通常就是寄存器。',
        },
      ],
      exercises: [
        {
          id: '1',
          title: '你的第一个触发器',
          desc: '补全 D 触发器：每个时钟上升沿把 `d` 装进 `q`。运行测试平台，观察波形中 `q` 如何只在上升沿跟随 `d` 变化。',
          hints: [
            '敏感列表写成 `always @(posedge clk)`。',
            '时序逻辑里用非阻塞赋值 `q <= d;`。',
          ],
          starter: `module dff (
  input      clk,
  input      d,
  output reg q
);

  // TODO: 每个时钟上升沿，把 d 装进 q

endmodule`,
          testbench: `module tb;
  reg clk, d;
  wire q;
  dff dut(.clk(clk), .d(d), .q(q));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  initial begin
    clk = 0;
    d = 1'b1;
    @(posedge clk); #1;
    if (q === 1'b1) pass = pass + 1; else $display("FAIL: after edge, q=%b", q);

    d = 1'b0;
    #2;
    if (q === 1'b1) pass = pass + 1; else $display("FAIL: q changed between edges");
    @(posedge clk); #1;
    if (q === 1'b0) pass = pass + 1; else $display("FAIL: after edge, q=%b", q);

    d = 1'b1;
    #3;
    if (q === 1'b0) pass = pass + 1; else $display("FAIL: q changed between edges");
    @(posedge clk); #1;
    if (q === 1'b1) pass = pass + 1; else $display("FAIL: after edge, q=%b", q);

    if (pass == 5) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module dff (
  input      clk,
  input      d,
  output reg q
);

  always @(posedge clk)
    q <= d;

endmodule`,
        },
        {
          id: '2',
          title: '带异步复位的触发器',
          desc: '真实的触发器都有复位脚。实现**异步复位**：`rst` 为 1 的瞬间 `q` 立刻清零（不必等时钟沿）；`rst` 为 0 时恢复正常触发器行为。',
          hints: [
            '异步复位要同时放进敏感列表：`always @(posedge clk or posedge rst)`。',
            '块内先处理复位：`if (rst) q <= 1\'b0; else q <= d;`。',
          ],
          starter: `module dff_rst (
  input      clk,
  input      rst,   // 异步复位，高有效
  input      d,
  output reg q
);

  // TODO: 异步复位 + 上升沿采样
  // 敏感列表: posedge clk 和 posedge rst 都要写

endmodule`,
          testbench: `module tb;
  reg clk, rst, d;
  wire q;
  dff_rst dut(.clk(clk), .rst(rst), .d(d), .q(q));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  initial begin
    clk = 0; rst = 1; d = 1'b1;
    @(posedge clk); #1;
    if (q === 1'b0) pass = pass + 1; else $display("FAIL: reset, q=%b", q);

    rst = 0; d = 1'b1;
    @(posedge clk); #1;
    if (q === 1'b1) pass = pass + 1; else $display("FAIL: after edge, q=%b", q);

    // 异步：时钟沿之间拉高复位，q 应立刻清零
    d = 1'b1;
    #2;
    rst = 1;
    #1;
    if (q === 1'b0) pass = pass + 1; else $display("FAIL: async reset, q=%b", q);

    #3;
    if (q === 1'b0) pass = pass + 1; else $display("FAIL: q escaped reset");

    rst = 0; d = 1'b0;
    @(posedge clk); #1;
    if (q === 1'b0) pass = pass + 1; else $display("FAIL: after edge, q=%b", q);

    d = 1'b1;
    @(posedge clk); #1;
    if (q === 1'b1) pass = pass + 1; else $display("FAIL: after edge, q=%b", q);

    if (pass == 6) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module dff_rst (
  input      clk,
  input      rst,
  input      d,
  output reg q
);

  always @(posedge clk or posedge rst) begin
    if (rst)
      q <= 1'b0;
    else
      q <= d;
  end

endmodule`,
        },
        {
          id: '3',
          title: '移位寄存器：一拍进两位',
          desc: '实现一个 8 位**移位寄存器**：同步复位为 0；每个时钟沿，`q` 整体左移两位，低 2 位用输入 `d` 补上。像传送带一样，每拍送进来两位新数据。',
          hints: [
            '左移两位并补新数据：`q <= {q[5:0], d};`（拼接的高位在左）。',
            '先处理同步复位 `if (rst) q <= 8\'d0; else ...`。',
          ],
          starter: `module shift2 (
  input            clk,
  input            rst,      // 同步复位
  input      [1:0] d,        // 每拍移入两位
  output reg [7:0] q
);

  // TODO: 同步复位清零；否则 q 左移两位，低两位填入 d

endmodule`,
          testbench: `module tb;
  reg clk, rst;
  reg [1:0] d;
  wire [7:0] q;
  shift2 dut(.clk(clk), .rst(rst), .d(d), .q(q));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  initial begin
    clk = 0; rst = 1; d = 2'b00;
    @(posedge clk); #1;
    if (q === 8'h00) pass = pass + 1; else $display("FAIL: reset q=%h", q);
    rst = 0;

    d = 2'b01; @(posedge clk); #1;
    if (q === 8'h01) pass = pass + 1; else $display("FAIL: t1 q=%h", q);

    d = 2'b10; @(posedge clk); #1;
    if (q === 8'h06) pass = pass + 1; else $display("FAIL: t2 q=%h", q);

    d = 2'b11; @(posedge clk); #1;
    if (q === 8'h1B) pass = pass + 1; else $display("FAIL: t3 q=%h", q);

    d = 2'b00; @(posedge clk); #1;
    if (q === 8'h6C) pass = pass + 1; else $display("FAIL: t4 q=%h", q);

    rst = 1;
    @(posedge clk); #1;
    if (q === 8'h00) pass = pass + 1; else $display("FAIL: sync reset q=%h", q);

    if (pass == 6) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module shift2 (
  input            clk,
  input            rst,
  input      [1:0] d,
  output reg [7:0] q
);

  always @(posedge clk) begin
    if (rst)
      q <= 8'd0;
    else
      q <= {q[5:0], d};
  end

endmodule`,
        },
      ],
    },

    // ---------------- 第 09 章 ----------------
    {
      id: '09',
      title: '寄存器与移位',
      subtitle: '使能、串行移位与环形计数器',
      blocks: [
        {
          k: 'p',
          t: '触发器是砖块，**寄存器（register）**是一排砖砌成的墙。一个 N 位寄存器就是 N 个触发器共享同一个时钟——在 Verilog 里一个 `reg [N-1:0]` 加一个 always 块就描述完了。',
        },
        {
          k: 'h2',
          t: '使能：让寄存器「选择性工作」',
        },
        {
          k: 'p',
          t: '很多电路里寄存器不是每拍都更新的，而是受一个**使能（enable）**信号控制。写法非常直白：',
        },
        {
          k: 'code',
          label: '带使能的 8 位寄存器',
          code: `module reg8 (
  input            clk,
  input            en,       // 写使能
  input      [7:0] d,
  output reg [7:0] q
);
  always @(posedge clk)
    if (en)
      q <= d;    // en=1 才更新；否则 q 保持
endmodule`,
        },
        {
          k: 'p',
          t: '`en=0` 时什么也不赋值，寄存器就保持原值——这是 Verilog 的语义：**没被赋值的 reg 保持不变**。',
        },
        {
          k: 'h2',
          t: '移位寄存器：串行世界的传送带',
        },
        {
          k: 'p',
          t: '把 `q <= {q[2:0], din}` 写进时钟块，就得到一个**串入串出（SISO）移位寄存器**：数据一位一位从右边进队，老数据往左挪。N 位寄存器要拍满 N 拍，最先进入的位才会从最高位 `q[N-1]` 走到队首——这是串行通信的基础。',
        },
        {
          k: 'p',
          t: '如果移出的那一位再接回输入端，就得到**环形计数器（ring counter）**：一个 1 在环里转圈，任意时刻只有一位为 1——常用来产生节拍/顺序控制信号。',
        },
        {
          k: 'note',
          tone: 'tip',
          title: '观察波形',
          t: '做完本章练习记得点开波形图：移位寄存器的每一位都是方波，但相位逐位错开一拍，像瀑布一样——这是「数据在时间轴上流动」最直观的样子。',
        },
      ],
      exercises: [
        {
          id: '1',
          title: '带使能的 8 位寄存器',
          desc: '实现带写使能的 8 位寄存器：`en=1` 时上升沿装载 `d`；`en=0` 时保持不变。',
          hints: [
            '结构就是 `if (en) q <= d;`——else 分支什么都不写即保持。',
            '别忘了复位优先级更高：`if (rst) ... else if (en) ...`。',
          ],
          starter: `module reg8 (
  input            clk,
  input            rst,
  input            en,
  input      [7:0] d,
  output reg [7:0] q
);

  // TODO: 同步复位；en=1 时装载 d，否则保持

endmodule`,
          testbench: `module tb;
  reg clk, rst, en;
  reg [7:0] d;
  wire [7:0] q;
  reg8 dut(.clk(clk), .rst(rst), .en(en), .d(d), .q(q));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  initial begin
    clk = 0; rst = 1; en = 0; d = 8'h00;
    @(posedge clk); #1;
    rst = 0;

    en = 1; d = 8'hA5;
    @(posedge clk); #1;
    if (q === 8'hA5) pass = pass + 1; else $display("FAIL: load q=%h", q);

    en = 0; d = 8'h3C;
    @(posedge clk); #1;
    @(posedge clk); #1;
    if (q === 8'hA5) pass = pass + 1; else $display("FAIL: should hold, q=%h", q);

    en = 1;
    @(posedge clk); #1;
    if (q === 8'h3C) pass = pass + 1; else $display("FAIL: load q=%h", q);

    en = 0; d = 8'hFF;
    @(posedge clk); #1;
    if (q === 8'h3C) pass = pass + 1; else $display("FAIL: should hold, q=%h", q);

    if (pass == 4) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module reg8 (
  input            clk,
  input            rst,
  input            en,
  input      [7:0] d,
  output reg [7:0] q
);

  always @(posedge clk) begin
    if (rst)
      q <= 8'd0;
    else if (en)
      q <= d;
  end

endmodule`,
        },
        {
          id: '2',
          title: '串入串出：4 拍延迟线',
          desc: '实现 4 位 SISO 移位寄存器：每拍 `q` 左移一位，`din` 进入最低位。输出 `dout = q[3]`——最先送入的那一位要经过 4 拍才到达 `dout`。',
          hints: [
            '移位：`q <= {q[2:0], din};`。',
            '`dout` 是组合输出，用 `assign dout = q[3];`（q 是 reg，可以被 assign 读）。',
          ],
          starter: `module siso (
  input        clk,
  input        rst,
  input        din,
  output reg [3:0] q,
  output       dout
);

  assign dout = q[3];

  // TODO: 同步复位清零；否则 q 左移一位，din 进入最低位

endmodule`,
          testbench: `module tb;
  reg clk, rst, din;
  wire [3:0] q;
  wire dout;
  siso dut(.clk(clk), .rst(rst), .din(din), .q(q), .dout(dout));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  initial begin
    clk = 0; rst = 1; din = 0;
    @(posedge clk); #1;
    rst = 0;

    // 送入序列 1,0,1,1
    din = 1; @(posedge clk); #1;
    if (q === 4'b0001) pass = pass + 1; else $display("FAIL: t1 q=%b", q);
    din = 0; @(posedge clk); #1;
    if (q === 4'b0010) pass = pass + 1; else $display("FAIL: t2 q=%b", q);
    din = 1; @(posedge clk); #1;
    if (q === 4'b0101) pass = pass + 1; else $display("FAIL: t3 q=%b", q);
    din = 1; @(posedge clk); #1;
    if (q === 4'b1011) pass = pass + 1; else $display("FAIL: t4 q=%b", q);

    // 第 1 位送入的 1 现在到达 q[3]
    if (dout === 1'b1) pass = pass + 1; else $display("FAIL: dout=%b", dout);

    din = 0; @(posedge clk); #1;
    // 第 2 位（0）到达队首
    if (dout === 1'b0) pass = pass + 1; else $display("FAIL: dout=%b", dout);
    if (q === 4'b0110) pass = pass + 1; else $display("FAIL: t5 q=%b", q);

    if (pass == 7) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module siso (
  input        clk,
  input        rst,
  input        din,
  output reg [3:0] q,
  output       dout
);

  assign dout = q[3];

  always @(posedge clk) begin
    if (rst)
      q <= 4'd0;
    else
      q <= {q[2:0], din};
  end

endmodule`,
        },
        {
          id: '3',
          title: '环形计数器',
          desc: '实现 4 位环形计数器：复位后 `q = 0001`；此后每个时钟沿，那个唯一的 1 循环左移：0001 → 0010 → 0100 → 1000 → 0001 → …',
          hints: [
            '循环左移 = 把最高位接到最低位：`q <= {q[2:0], q[3]};`。',
            '复位值是 `4\'b0001`，不是 0。',
          ],
          starter: `module ring4 (
  input        clk,
  input        rst,
  output reg [3:0] q
);

  // TODO: 复位到 0001；每个上升沿让唯一的 1 循环左移

endmodule`,
          testbench: `module tb;
  reg clk, rst;
  wire [3:0] q;
  ring4 dut(.clk(clk), .rst(rst), .q(q));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  initial begin
    clk = 0; rst = 1;
    @(posedge clk); #1;
    if (q === 4'b0001) pass = pass + 1; else $display("FAIL: reset q=%b", q);
    rst = 0;

    @(posedge clk); #1;
    if (q === 4'b0010) pass = pass + 1; else $display("FAIL: q=%b", q);
    @(posedge clk); #1;
    if (q === 4'b0100) pass = pass + 1; else $display("FAIL: q=%b", q);
    @(posedge clk); #1;
    if (q === 4'b1000) pass = pass + 1; else $display("FAIL: q=%b", q);
    @(posedge clk); #1;
    if (q === 4'b0001) pass = pass + 1; else $display("FAIL: q=%b", q);
    @(posedge clk); #1;
    if (q === 4'b0010) pass = pass + 1; else $display("FAIL: q=%b", q);

    if (pass == 6) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module ring4 (
  input        clk,
  input        rst,
  output reg [3:0] q
);

  always @(posedge clk) begin
    if (rst)
      q <= 4'b0001;
    else
      q <= {q[2:0], q[3]};
  end

endmodule`,
        },
      ],
    },

    // ---------------- 第 10 章 ----------------
    {
      id: '10',
      title: '计数器',
      subtitle: '加一、回绕与装载',
      blocks: [
        {
          k: 'p',
          t: '计数器是数字系统里出场率最高的电路：程序计数器、定时器、分频器、地址发生器……它的核心只有一句：**`q <= q + 1`**。',
        },
        {
          k: 'code',
          label: '4 位自由计数器',
          code: `module counter (
  input        clk,
  input        rst,
  output reg [3:0] q
);
  always @(posedge clk) begin
    if (rst)
      q <= 4'd0;
    else
      q <= q + 1;   // 数到 1111 后回绕到 0000
  end
endmodule`,
        },
        {
          k: 'p',
          t: '`q + 1` 的结果按数学是 5 位，但赋回 4 位的 `q` 时**自动截断高位**——于是 15 之后自然回到 0。这就是计数器的**回绕（wrap-around）**，也是模运算在硬件里的样子：4 位计数器就是一个 mod-16 计数器。',
        },
        {
          k: 'h2',
          t: '三个常用变体',
        },
        {
          k: 'ul',
          items: [
            '**模 N 计数器**：数到 N-1 就回 0，比如 BCD 计数器数到 9 回 0：`if (q == 9) q <= 0; else q <= q + 1;`',
            '**可装载**：来一个 `load` 脉冲就把初值 `d` 装进去，从指定位置开始数——CPU 的循环指令就这么实现。',
            '**可逆（up/down）**：由 `up` 决定加一还是减一——减到 0 再减会回绕到全 1，同样自然。',
          ],
        },
        {
          k: 'note',
          tone: 'info',
          title: '优先级就是 if 的顺序',
          t: '`if (rst) ... else if (load) ... else ...` 中，写在前的条件优先。设计计数器时先想清楚：复位 > 装载 > 计数，这个顺序几乎总是对的。',
        },
        {
          k: 'p',
          t: '注意比较运算 `q == 9` 是**数值比较**：两侧位宽不同也没关系，Verilog 会按数值解释（9 默认是 32 位有宽度的常量，比较时自动对齐）。',
        },
      ],
      exercises: [
        {
          id: '1',
          title: '模 16 计数器',
          desc: '实现 4 位计数器：同步复位为 0，其余每个上升沿加一；数到 15 后回绕到 0。',
          hints: ['核心就一句 `q <= q + 1;`，回绕由位宽截断自动完成。'],
          starter: `module cnt16 (
  input        clk,
  input        rst,
  output reg [3:0] q
);

  // TODO: 同步复位清零；否则加一

endmodule`,
          testbench: `module tb;
  reg clk, rst;
  wire [3:0] q;
  cnt16 dut(.clk(clk), .rst(rst), .q(q));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  reg [31:0] i;
  initial begin
    clk = 0; rst = 1;
    @(posedge clk); #1;
    if (q === 4'd0) pass = pass + 1; else $display("FAIL: reset q=%0d", q);
    rst = 0;

    @(posedge clk); #1;
    if (q === 4'd1) pass = pass + 1; else $display("FAIL: q=%0d", q);
    @(posedge clk); #1;
    if (q === 4'd2) pass = pass + 1; else $display("FAIL: q=%0d", q);

    // 数到 15：再走 13 拍
    for (i = 0; i < 13; i = i + 1) @(posedge clk);
    #1;
    if (q === 4'd15) pass = pass + 1; else $display("FAIL: q=%0d", q);

    // 回绕
    @(posedge clk); #1;
    if (q === 4'd0) pass = pass + 1; else $display("FAIL: wrap q=%0d", q);
    @(posedge clk); #1;
    if (q === 4'd1) pass = pass + 1; else $display("FAIL: q=%0d", q);

    if (pass == 6) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module cnt16 (
  input        clk,
  input        rst,
  output reg [3:0] q
);

  always @(posedge clk) begin
    if (rst)
      q <= 4'd0;
    else
      q <= q + 1;
  end

endmodule`,
        },
        {
          id: '2',
          title: '0 到 9 十进制计数器',
          desc: '实现一位 BCD 计数器：从 0 数到 9，然后回到 0 重新开始。9 之后**不能**回绕到 10~15。',
          hints: [
            '加一前先判满：`if (q == 9) q <= 4\'d0; else q <= q + 1;`',
            '`==` 是数值比较，位宽不同不影响。',
          ],
          starter: `module cnt10 (
  input        clk,
  input        rst,
  output reg [3:0] q
);

  // TODO: 同步复位；数到 9 回 0，否则加一

endmodule`,
          testbench: `module tb;
  reg clk, rst;
  wire [3:0] q;
  cnt10 dut(.clk(clk), .rst(rst), .q(q));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  reg [31:0] i;
  initial begin
    clk = 0; rst = 1;
    @(posedge clk); #1;
    rst = 0;

    for (i = 0; i < 9; i = i + 1) @(posedge clk);
    #1;
    if (q === 4'd9) pass = pass + 1; else $display("FAIL: q=%0d", q);

    @(posedge clk); #1;
    if (q === 4'd0) pass = pass + 1; else $display("FAIL: wrap q=%0d", q);
    @(posedge clk); #1;
    if (q === 4'd1) pass = pass + 1; else $display("FAIL: q=%0d", q);

    // 第二轮数到 9 再回 0
    for (i = 0; i < 8; i = i + 1) @(posedge clk);
    #1;
    if (q === 4'd9) pass = pass + 1; else $display("FAIL: q=%0d", q);
    @(posedge clk); #1;
    if (q === 4'd0) pass = pass + 1; else $display("FAIL: wrap q=%0d", q);

    if (pass == 5) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module cnt10 (
  input        clk,
  input        rst,
  output reg [3:0] q
);

  always @(posedge clk) begin
    if (rst)
      q <= 4'd0;
    else if (q == 9)
      q <= 4'd0;
    else
      q <= q + 1;
  end

endmodule`,
        },
        {
          id: '3',
          title: '可装载、可逆计数器',
          desc: '实现 4 位多功能计数器：优先级从高到低——同步复位清零；`load=1` 时装载 `d`；否则 `up=1` 加一、`up=0` 减一。',
          hints: [
            '三个 else-if 分支按优先级排：rst → load → 加减。',
            '减一是 `q <= q - 1;`，减到 0 再减自然回绕到 15。',
          ],
          starter: `module cnt_ud (
  input        clk,
  input        rst,
  input        load,
  input        up,
  input  [3:0] d,
  output reg [3:0] q
);

  // TODO: rst > load > up/down，三级优先

endmodule`,
          testbench: `module tb;
  reg clk, rst, load, up;
  reg [3:0] d;
  wire [3:0] q;
  cnt_ud dut(.clk(clk), .rst(rst), .load(load), .up(up), .d(d), .q(q));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  initial begin
    clk = 0; rst = 1; load = 0; up = 1; d = 4'd5;
    @(posedge clk); #1;
    rst = 0;

    load = 1;
    @(posedge clk); #1;
    if (q === 4'd5) pass = pass + 1; else $display("FAIL: load q=%0d", q);
    load = 0; up = 1;

    @(posedge clk); #1;
    if (q === 4'd6) pass = pass + 1; else $display("FAIL: up q=%0d", q);
    @(posedge clk); #1;
    if (q === 4'd7) pass = pass + 1; else $display("FAIL: up q=%0d", q);

    up = 0;
    @(posedge clk); #1;
    if (q === 4'd6) pass = pass + 1; else $display("FAIL: down q=%0d", q);
    @(posedge clk); #1;
    if (q === 4'd5) pass = pass + 1; else $display("FAIL: down q=%0d", q);

    // 减到 0 以下回绕
    load = 1; d = 4'd0;
    @(posedge clk); #1;
    load = 0;
    @(posedge clk); #1;
    if (q === 4'd15) pass = pass + 1; else $display("FAIL: wrap q=%0d", q);

    if (pass == 6) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module cnt_ud (
  input        clk,
  input        rst,
  input        load,
  input        up,
  input  [3:0] d,
  output reg [3:0] q
);

  always @(posedge clk) begin
    if (rst)
      q <= 4'd0;
    else if (load)
      q <= d;
    else if (up)
      q <= q + 1;
    else
      q <= q - 1;
  end

endmodule`,
        },
      ],
    },

    // ---------------- 第 11 章 ----------------
    {
      id: '11',
      title: '边沿、分频与伪随机',
      subtitle: '上一拍的记忆 + 异或反馈',
      blocks: [
        {
          k: 'p',
          t: '这一章把「记忆上一拍」这个小技巧玩出花：边沿检测、时钟分频、伪随机序列，全都靠它。',
        },
        {
          k: 'h2',
          t: '边沿检测：按钮按下的一瞬间',
        },
        {
          k: 'p',
          t: '按钮 `btn` 是电平信号，按住多久就是 1 多久。但很多场合（比如 +1 计数）我们只想在**按下的那一瞬间**响应一次。技巧：用寄存器保存上一拍的值，和当前值组合比较：',
        },
        {
          k: 'code',
          label: '上升沿检测器',
          code: `module edge_detect (
  input      clk,
  input      btn,
  output     pe,      // 单拍脉冲：btn 的上升沿
  output reg prev     // 上一拍的 btn
);
  always @(posedge clk)
    prev <= btn;             // 记住上一拍

  assign pe = btn & ~prev;   // 现在是 1，上一拍是 0 → 刚跳变
endmodule`,
        },
        {
          k: 'p',
          t: '`pe` 只会从「采样到按下」到「下一拍寄存完成」之间保持一个时钟宽——完美的一次性脉冲。',
        },
        {
          k: 'h2',
          t: '分频：把时钟变慢一半',
        },
        {
          k: 'p',
          t: '让寄存器每拍翻转一次（`q <= ~q`），输出频率正好是时钟的一半——**二分频**。级联多级就得到 4 分频、8 分频……慢速外设（比如让 LED 肉眼可见地闪烁）全靠它。',
        },
        {
          k: 'h2',
          t: 'LFSR：最便宜的「随机数」',
        },
        {
          k: 'p',
          t: '**线性反馈移位寄存器（LFSR）**：移位寄存器把自己的某几位异或后喂回输入。选对反馈点（本原多项式），序列会以 2ⁿ-1 的周期遍历所有非零状态——看起来就像随机数，但只用了一个移位寄存器加一个异或门。硬件随机数、扰码器、LED 闪烁都常用它。',
        },
        {
          k: 'note',
          tone: 'warn',
          title: '为什么周期是 2ⁿ-1 不是 2ⁿ',
          t: '全 0 状态是 LFSR 的「黑洞」：反馈异或出 0，永远出不去。所以 4 位 LFSR 的最大周期是 15，种子千万不能选 0000。',
        },
      ],
      exercises: [
        {
          id: '1',
          title: '按钮上升沿检测',
          desc: '实现上升沿检测器：`pe` 在 `btn` 从 0 变 1 后保持一个时钟周期的高电平，其余时间（包括按住不放期间）为 0。',
          hints: [
            '时序部分只有一句：`prev <= btn;`。',
            '组合部分：`assign pe = btn & ~prev;`。',
          ],
          starter: `module edge_detect (
  input      clk,
  input      btn,
  output     pe,
  output reg prev
);

  // TODO: 1) 每拍记录 prev
  //       2) 组合输出 pe = 当前为 1 且上一拍为 0

endmodule`,
          testbench: `module tb;
  reg clk, btn;
  wire pe, prev;
  edge_detect dut(.clk(clk), .btn(btn), .pe(pe), .prev(prev));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  initial begin
    clk = 0; btn = 0;
    @(posedge clk); #1;   // prev 采样到 0

    btn = 1;
    #1;                   // 组合 settle，还没到时钟沿
    if (pe === 1'b1) pass = pass + 1; else $display("FAIL: pe=%b right after press", pe);

    @(posedge clk); #1;   // prev 更新为 1
    if (pe === 1'b0) pass = pass + 1; else $display("FAIL: pe=%b one clk later", pe);

    // 按住不放：不再有脉冲
    @(posedge clk); #1;
    if (pe === 1'b0) pass = pass + 1; else $display("FAIL: still high while held");
    @(posedge clk); #1;
    if (pe === 1'b0) pass = pass + 1; else $display("FAIL: still high while held");

    // 松开
    btn = 0;
    #1;
    if (pe === 1'b0) pass = pass + 1; else $display("FAIL: pe=%b on release", pe);
    @(posedge clk); #1;
    if (pe === 1'b0) pass = pass + 1; else $display("FAIL: pe=%b after release", pe);

    if (pass == 6) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module edge_detect (
  input      clk,
  input      btn,
  output     pe,
  output reg prev
);

  always @(posedge clk)
    prev <= btn;

  assign pe = btn & ~prev;

endmodule`,
        },
        {
          id: '2',
          title: '二分频器',
          desc: '实现二分频：`clk2` 是时钟频率的一半——寄存器每拍翻转即可。复位后从 0 开始。',
          hints: ['翻转就是取自己：`q <= ~q;`，输出直接引出 `clk2`。'],
          starter: `module div2 (
  input      clk,
  input      rst,
  output reg clk2
);

  // TODO: 同步复位为 0；每个上升沿翻转 clk2

endmodule`,
          testbench: `module tb;
  reg clk, rst;
  wire clk2;
  div2 dut(.clk(clk), .rst(rst), .clk2(clk2));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  initial begin
    clk = 0; rst = 1;
    @(posedge clk); #1;
    if (clk2 === 1'b0) pass = pass + 1; else $display("FAIL: reset clk2=%b", clk2);
    rst = 0;

    @(posedge clk); #1;
    if (clk2 === 1'b1) pass = pass + 1; else $display("FAIL: clk2=%b", clk2);
    @(posedge clk); #1;
    if (clk2 === 1'b0) pass = pass + 1; else $display("FAIL: clk2=%b", clk2);
    @(posedge clk); #1;
    if (clk2 === 1'b1) pass = pass + 1; else $display("FAIL: clk2=%b", clk2);
    @(posedge clk); #1;
    if (clk2 === 1'b0) pass = pass + 1; else $display("FAIL: clk2=%b", clk2);

    if (pass == 5) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module div2 (
  input      clk,
  input      rst,
  output reg clk2
);

  always @(posedge clk) begin
    if (rst)
      clk2 <= 1'b0;
    else
      clk2 <= ~clk2;
  end

endmodule`,
        },
        {
          id: '3',
          title: '4 位 LFSR 伪随机序列',
          desc: '实现最大长度 LFSR（本原多项式 x⁴+x+1）：同步复位到种子 `0001`；每个时钟沿，最高位与最低位异或后移入最低位：`q <= {q[2:0], q[3] ^ q[0]}`。序列周期应为 15（遍历所有非零状态）。',
          hints: [
            '反馈位：`q[3] ^ q[0]`（对应多项式 x⁴+x+1 的两个非零项）。',
            '拼接移位：`q <= {q[2:0], q[3] ^ q[0]};`',
          ],
          starter: `module lfsr4 (
  input        clk,
  input        rst,
  output reg [3:0] q
);

  // TODO: 复位到 4'b0001；每个上升沿
  //   q <= {q[2:0], q[3] ^ q[0]};

endmodule`,
          testbench: `module tb;
  reg clk, rst;
  wire [3:0] q;
  lfsr4 dut(.clk(clk), .rst(rst), .q(q));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  reg [31:0] i;
  initial begin
    clk = 0; rst = 1;
    @(posedge clk); #1;
    if (q === 4'b0001) pass = pass + 1; else $display("FAIL: seed q=%b", q);
    rst = 0;

    @(posedge clk); #1;
    if (q === 4'b0011) pass = pass + 1; else $display("FAIL: q=%b", q);
    @(posedge clk); #1;
    if (q === 4'b0111) pass = pass + 1; else $display("FAIL: q=%b", q);
    @(posedge clk); #1;
    if (q === 4'b1111) pass = pass + 1; else $display("FAIL: q=%b", q);
    @(posedge clk); #1;
    if (q === 4'b1110) pass = pass + 1; else $display("FAIL: q=%b", q);
    @(posedge clk); #1;
    if (q === 4'b1101) pass = pass + 1; else $display("FAIL: q=%b", q);

    // 中间 9 拍不检查
    for (i = 0; i < 9; i = i + 1) @(posedge clk);
    #1;
    if (q === 4'b1000) pass = pass + 1; else $display("FAIL: q=%b", q);

    // 第 15 拍回到种子
    @(posedge clk); #1;
    if (q === 4'b0001) pass = pass + 1; else $display("FAIL: period, q=%b", q);

    if (pass == 8) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module lfsr4 (
  input        clk,
  input        rst,
  output reg [3:0] q
);

  always @(posedge clk) begin
    if (rst)
      q <= 4'b0001;
    else
      q <= {q[2:0], q[3] ^ q[0]};
  end

endmodule`,
        },
      ],
    },

    // ---------------- 第 12 章 ----------------
    {
      id: '12',
      title: '状态机',
      subtitle: '用状态 + 转移描述有记忆的行为',
      blocks: [
        {
          k: 'p',
          t: '前面所有电路都可以用「数据通路」描述。但像「检测到 1011 就举手」这种**按协议工作**的行为，需要一个新的抽象：**有限状态机（FSM, Finite State Machine）**。',
        },
        {
          k: 'p',
          t: '状态机的全部要素：一组**状态**、一个**时钟驱动的状态转移**、一个基于当前状态的**输出**。三段式写法（状态寄存器 + 次态逻辑 + 输出逻辑）在 Verilog 里的样子：',
        },
        {
          k: 'code',
          label: '两状态 FSM 骨架',
          code: `module fsm (
  input      clk, rst, go,
  output reg [1:0] state,
  output     done
);
  localparam IDLE = 2'd0, BUSY = 2'd1;

  always @(posedge clk) begin
    if (rst)                       // 1) 复位回初始状态
      state <= IDLE;
    else case (state)              // 2) 次态逻辑
      IDLE: state <= go ? BUSY : IDLE;
      BUSY: state <= IDLE;
      default: state <= IDLE;
    endcase
  end

  assign done = (state == BUSY);   // 3) 输出逻辑
endmodule`,
        },
        {
          k: 'h2',
          t: 'Moore 与 Mealy：输出看哪里',
        },
        {
          k: 'ul',
          items: [
            '**Moore 机**：输出只由**当前状态**决定——`assign z = (state == S3);`。输出与时钟对齐、无毛刺，但要比输入晚一拍反应。',
            '**Mealy 机**：输出由**当前状态 + 当前输入**决定——`assign z = (state == S3) & x;`。反应快一拍，但输出在时钟沿之间就可能变化。',
          ],
        },
        {
          k: 'note',
          tone: 'tip',
          title: '重叠检测的技巧',
          t: '序列检测器检测到 101 之后，最后那个 1 可能是下一个 101 的开头——「S3 收到 1 回 S1 而不是 S0」就是重叠检测。想清楚**每个状态收到 0/1 各去哪里**，画一张状态转移图，代码只是照着图翻译。',
        },
        {
          k: 'p',
          t: '本章的四个练习从简到繁：T 触发器（最迷你的状态机）→ Moore 序列检测 → Mealy 序列检测 → 按钮单脉冲。做完你会掌握数字设计中最常用的行为建模工具。',
        },
      ],
      exercises: [
        {
          id: '1',
          title: 'T 触发器',
          desc: '实现 T 触发器（Toggle Flip-Flop）：`t=1` 时每个时钟沿翻转 `q`；`t=0` 时保持。复位清零。这是最小的状态机——状态只有 0 和 1。',
          hints: ['翻转：`q <= ~q;`，外面套一层 `if (t)`。'],
          starter: `module tff (
  input      clk,
  input      rst,
  input      t,
  output reg q
);

  // TODO: 复位清零；t=1 时每拍翻转，t=0 时保持

endmodule`,
          testbench: `module tb;
  reg clk, rst, t;
  wire q;
  tff dut(.clk(clk), .rst(rst), .t(t), .q(q));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  initial begin
    clk = 0; rst = 1; t = 0;
    @(posedge clk); #1;
    if (q === 1'b0) pass = pass + 1; else $display("FAIL: reset q=%b", q);
    rst = 0;

    t = 0;
    @(posedge clk); #1;
    if (q === 1'b0) pass = pass + 1; else $display("FAIL: hold q=%b", q);

    t = 1;
    @(posedge clk); #1;
    if (q === 1'b1) pass = pass + 1; else $display("FAIL: toggle q=%b", q);
    @(posedge clk); #1;
    if (q === 1'b0) pass = pass + 1; else $display("FAIL: toggle q=%b", q);
    @(posedge clk); #1;
    if (q === 1'b1) pass = pass + 1; else $display("FAIL: toggle q=%b", q);

    t = 0;
    @(posedge clk); #1;
    if (q === 1'b1) pass = pass + 1; else $display("FAIL: hold q=%b", q);
    @(posedge clk); #1;
    if (q === 1'b1) pass = pass + 1; else $display("FAIL: hold q=%b", q);

    if (pass == 7) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module tff (
  input      clk,
  input      rst,
  input      t,
  output reg q
);

  always @(posedge clk) begin
    if (rst)
      q <= 1'b0;
    else if (t)
      q <= ~q;
  end

endmodule`,
        },
        {
          id: '2',
          title: 'Moore 型 101 序列检测器',
          desc: '实现**重叠检测**的 Moore 序列检测器：串行输入 `x`，检测到 `101` 的下一拍 `z` 输出一个时钟宽的 1。重叠也要检测——`10101` 应该命中两次。',
          hints: [
            '四个状态：S0（空）、S1（见到 1）、S2（见到 10）、S3（见到 101）。',
            '转移：S0: x?S1:S0；S1: x?S1:S2；S2: x?S3:S0；S3: x?S1:S2（重叠！）。',
            'Moore 输出：`assign z = (state == S3);`',
          ],
          starter: `module detect101 (
  input        clk,
  input        rst,
  input        x,
  output reg [1:0] state,
  output       z
);
  localparam S0 = 2'd0, S1 = 2'd1, S2 = 2'd2, S3 = 2'd3;

  // TODO: 状态转移（注意 S3 的重叠处理）
  always @(posedge clk) begin
    if (rst)
      state <= S0;
    else case (state)

    endcase
  end

  // TODO: Moore 输出
  // assign z = ...;
endmodule`,
          testbench: `module tb;
  reg clk, rst, x;
  wire [1:0] state;
  wire z;
  detect101 dut(.clk(clk), .rst(rst), .x(x), .state(state), .z(z));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  initial begin
    clk = 0; rst = 1; x = 0;
    @(posedge clk); #1;
    rst = 0;

    // 输入序列 1 0 1 0 1 0 0
    x = 1; @(posedge clk); #1;
    if (z === 1'b0) pass = pass + 1; else $display("FAIL: t1 z=%b", z);

    x = 0; @(posedge clk); #1;
    if (z === 1'b0) pass = pass + 1; else $display("FAIL: t2 z=%b", z);

    x = 1; @(posedge clk); #1;
    if (z === 1'b1) pass = pass + 1; else $display("FAIL: t3 z=%b (101 detected)");

    x = 0; @(posedge clk); #1;
    if (z === 1'b0) pass = pass + 1; else $display("FAIL: t4 z=%b", z);

    x = 1; @(posedge clk); #1;
    if (z === 1'b1) pass = pass + 1; else $display("FAIL: t5 z=%b (overlap detected)");

    x = 0; @(posedge clk); #1;
    if (z === 1'b0) pass = pass + 1; else $display("FAIL: t6 z=%b", z);

    x = 0; @(posedge clk); #1;
    if (z === 1'b0) pass = pass + 1; else $display("FAIL: t7 z=%b", z);

    if (pass == 7) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module detect101 (
  input        clk,
  input        rst,
  input        x,
  output reg [1:0] state,
  output       z
);
  localparam S0 = 2'd0, S1 = 2'd1, S2 = 2'd2, S3 = 2'd3;

  always @(posedge clk) begin
    if (rst)
      state <= S0;
    else case (state)
      S0: state <= x ? S1 : S0;
      S1: state <= x ? S1 : S2;
      S2: state <= x ? S3 : S0;
      S3: state <= x ? S1 : S2;
      default: state <= S0;
    endcase
  end

  assign z = (state == S3);
endmodule`,
        },
        {
          id: '3',
          title: 'Mealy 型 1011 序列检测器',
          desc: '实现**重叠检测**的 Mealy 检测器：检测 `1011` 时 `z` **当拍**输出 1（状态到 S3 且当前输入 x=1），比 Moore 快一拍。',
          hints: [
            '转移与 101 检测器类似：S0: x?S1:S0；S1: x?S1:S2；S2: x?S3:S0；S3: x?S1:S2。',
            'Mealy 输出：`assign z = (state == S3) & x;`',
          ],
          starter: `module detect1011 (
  input        clk,
  input        rst,
  input        x,
  output reg [1:0] state,
  output       z
);
  localparam S0 = 2'd0, S1 = 2'd1, S2 = 2'd2, S3 = 2'd3;

  // TODO: 状态转移 + Mealy 输出

endmodule`,
          testbench: `module tb;
  reg clk, rst, x;
  wire [1:0] state;
  wire z;
  detect1011 dut(.clk(clk), .rst(rst), .x(x), .state(state), .z(z));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  initial begin
    clk = 0; rst = 1; x = 0;
    @(posedge clk); #1;
    rst = 0;

    // 输入序列 1 0 1 1 0 1 1 0（含重叠的两次 1011）
    x = 1; #1;
    if (z === 1'b0) pass = pass + 1; else $display("FAIL: t1 z=%b", z);
    @(posedge clk); #1;

    x = 0; #1;
    if (z === 1'b0) pass = pass + 1; else $display("FAIL: t2 z=%b", z);
    @(posedge clk); #1;

    x = 1; #1;
    if (z === 1'b0) pass = pass + 1; else $display("FAIL: t3 z=%b", z);
    @(posedge clk); #1;

    x = 1; #1;
    if (z === 1'b1) pass = pass + 1; else $display("FAIL: t4 z=%b (1011 detected)");
    @(posedge clk); #1;

    x = 0; #1;
    if (z === 1'b0) pass = pass + 1; else $display("FAIL: t5 z=%b", z);
    @(posedge clk); #1;

    x = 1; #1;
    if (z === 1'b0) pass = pass + 1; else $display("FAIL: t6 z=%b", z);
    @(posedge clk); #1;

    x = 1; #1;
    if (z === 1'b1) pass = pass + 1; else $display("FAIL: t7 z=%b (overlap detected)");
    @(posedge clk); #1;

    x = 0; #1;
    if (z === 1'b0) pass = pass + 1; else $display("FAIL: t8 z=%b", z);
    @(posedge clk); #1;

    if (pass == 8) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module detect1011 (
  input        clk,
  input        rst,
  input        x,
  output reg [1:0] state,
  output       z
);
  localparam S0 = 2'd0, S1 = 2'd1, S2 = 2'd2, S3 = 2'd3;

  always @(posedge clk) begin
    if (rst)
      state <= S0;
    else case (state)
      S0: state <= x ? S1 : S0;
      S1: state <= x ? S1 : S2;
      S2: state <= x ? S3 : S0;
      S3: state <= x ? S1 : S2;
      default: state <= S0;
    endcase
  end

  assign z = (state == S3) & x;
endmodule`,
        },
        {
          id: '4',
          title: '按钮单脉冲发生器',
          desc: '实现防重触发的单脉冲状态机：无论按钮按住多久，`pulse` 只输出**一个时钟宽**的脉冲；松开后再次按下才会输出下一个。状态：IDLE → FIRE（输出脉冲）→ WAIT（等松开）→ IDLE。',
          hints: [
            '三个状态的转移：IDLE 按 btn 进 FIRE；FIRE 无条件进 WAIT；WAIT 里 btn=1 留守、btn=0 回 IDLE。',
            '输出：`assign pulse = (state == FIRE);`',
          ],
          starter: `module oneshot (
  input        clk,
  input        rst,
  input        btn,
  output       pulse
);
  localparam IDLE = 2'd0, FIRE = 2'd1, WAIT = 2'd2;
  reg [1:0] state;

  // TODO: IDLE -> FIRE -> WAIT -> IDLE 状态机

  // TODO: assign pulse = ...

endmodule`,
          testbench: `module tb;
  reg clk, rst, btn;
  wire pulse;
  oneshot dut(.clk(clk), .rst(rst), .btn(btn), .pulse(pulse));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  initial begin
    clk = 0; rst = 1; btn = 0;
    @(posedge clk); #1;
    rst = 0;

    // 按住不放
    btn = 1;
    @(posedge clk); #1;
    if (pulse === 1'b1) pass = pass + 1; else $display("FAIL: t1 pulse=%b", pulse);
    @(posedge clk); #1;
    if (pulse === 1'b0) pass = pass + 1; else $display("FAIL: t2 pulse=%b (should be single)", pulse);
    @(posedge clk); #1;
    if (pulse === 1'b0) pass = pass + 1; else $display("FAIL: t3 pulse=%b", pulse);
    @(posedge clk); #1;
    if (pulse === 1'b0) pass = pass + 1; else $display("FAIL: t4 pulse=%b", pulse);

    // 松开
    btn = 0;
    @(posedge clk); #1;
    if (pulse === 1'b0) pass = pass + 1; else $display("FAIL: t5 pulse=%b", pulse);

    // 再按一次，又有且只有一个脉冲
    btn = 1;
    @(posedge clk); #1;
    if (pulse === 1'b1) pass = pass + 1; else $display("FAIL: t6 pulse=%b", pulse);
    @(posedge clk); #1;
    if (pulse === 1'b0) pass = pass + 1; else $display("FAIL: t7 pulse=%b", pulse);
    @(posedge clk); #1;
    if (pulse === 1'b0) pass = pass + 1; else $display("FAIL: t8 pulse=%b", pulse);

    if (pass == 8) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module oneshot (
  input        clk,
  input        rst,
  input        btn,
  output       pulse
);
  localparam IDLE = 2'd0, FIRE = 2'd1, WAIT = 2'd2;
  reg [1:0] state;

  always @(posedge clk) begin
    if (rst)
      state <= IDLE;
    else case (state)
      IDLE: state <= btn ? FIRE : IDLE;
      FIRE: state <= WAIT;
      WAIT: state <= btn ? WAIT : IDLE;
      default: state <= IDLE;
    endcase
  end

  assign pulse = (state == FIRE);
endmodule`,
        },
      ],
    },

    // ---------------- 第 13 章 ----------------
    {
      id: '13',
      title: '参数化与层次化设计',
      subtitle: '写一次，处处使用：参数与结构化搭建',
      blocks: [
        {
          k: 'p',
          t: '到目前为止每个模块的位宽都是写死的。要是 8 位加法器想改造成 16 位，得改一堆数字——**参数（parameter）**就是解法：把位宽变成一个可覆盖的常量。',
        },
        {
          k: 'code',
          label: '参数化计数器',
          code: `module cnt #(parameter W = 8) (
  input            clk,
  input            rst,
  output reg [W-1:0] q
);
  always @(posedge clk) begin
    if (rst) q <= 0;
    else     q <= q + 1;
  end
endmodule

// 使用时按需定制位宽：
cnt #(.W(16)) u1 (...);   // 16 位计数器
cnt #(.W(6))  u2 (...);   // 6 位计数器`,
        },
        {
          k: 'p',
          t: '`#(parameter W = 8)` 声明默认值 8；例化时 `#(.W(6))` 覆盖。模块内部 `[W-1:0]` 随参数伸缩——**一份代码，任意位宽**。`localparam` 则是模块内部私有的常量（外部不能覆盖），适合放派生值如 `localparam MAX = (1 << W) - 1;`。',
        },
        {
          k: 'h2',
          t: '结构化设计：把模块当积木',
        },
        {
          k: 'p',
          t: '第二站的重头戏：像搭积木一样**在模块里实例化模块**。一个 4 位行波加法器 = 4 个全加器串联：',
        },
        {
          k: 'code',
          label: 'adder4 = 4 × fulladd',
          code: `module adder4 (
  input  [3:0] a, b,
  input        cin,
  output [3:0] s,
  output       cout
);
  wire c1, c2, c3;
  fulladd u0(.a(a[0]), .b(b[0]), .cin(cin), .s(s[0]), .cout(c1));
  fulladd u1(.a(a[1]), .b(b[1]), .cin(c1),  .s(s[1]), .cout(c2));
  fulladd u2(.a(a[2]), .b(b[2]), .cin(c2),  .s(s[2]), .cout(c3));
  fulladd u3(.a(a[3]), .b(b[3]), .cin(c3),  .s(s[3]), .cout(cout));
endmodule`,
        },
        {
          k: 'p',
          t: '命名端口连接 `.port(signal)` 比按位置连接可读性强得多，位选择 `.a(a[0])` 也可以直接连。进位链 c1→c2→c3 一目了然——**代码结构就是电路结构**。',
        },
        {
          k: 'h2',
          t: '函数：组合逻辑的数学表达',
        },
        {
          k: 'p',
          t: '纯组合的运算用**函数（function）**写更自然，比如统计 8 位数据里 1 的个数：',
        },
        {
          k: 'code',
          label: 'popcount 函数',
          code: `function [3:0] cnt;
  input [7:0] v;
  reg [31:0] i;
  begin
    cnt = 0;
    for (i = 0; i < 8; i = i + 1)
      if (v[i]) cnt = cnt + 1;
  end
endfunction

assign n = cnt(d);   // 像调用数学函数一样使用`,
        },
        {
          k: 'note',
          tone: 'info',
          title: '函数 = 组合逻辑',
          t: '函数体内不能有延时和事件控制——它综合成纯组合逻辑，在零时间内算出结果。`cnt = 0` 用的是阻塞赋值 `=`（函数内惯例），返回值就是函数名本身。',
        },
      ],
      exercises: [
        {
          id: '1',
          title: '参数化计数器',
          desc: '实现参数化计数器 `cnt #(parameter W = 8)`：W 位、同步复位、每个时钟沿加一。测试平台会用 `#(.W(6))` 实例化它——一个 6 位计数器应当数到 63 后回绕到 0。',
          hints: [
            '模块头：`module cnt #(parameter W = 8) (input clk, input rst, output reg [W-1:0] q);`',
            '例化时 `#(.W(6))` 覆盖参数，模块内部的位宽全部跟随变化。',
          ],
          starter: `module cnt #(
  parameter W = 8
) (
  input            clk,
  input            rst,
  output reg [W-1:0] q
);

  // TODO: 同步复位；否则加一

endmodule`,
          testbench: `module tb;
  reg clk, rst;
  wire [5:0] q;
  cnt #(.W(6)) dut(.clk(clk), .rst(rst), .q(q));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  reg [31:0] i;
  initial begin
    clk = 0; rst = 1;
    @(posedge clk); #1;
    if (q === 6'd0) pass = pass + 1; else $display("FAIL: reset q=%0d", q);
    rst = 0;

    for (i = 0; i < 32; i = i + 1) @(posedge clk);
    #1;
    if (q === 6'd32) pass = pass + 1; else $display("FAIL: q=%0d", q);

    for (i = 0; i < 31; i = i + 1) @(posedge clk);
    #1;
    if (q === 6'd63) pass = pass + 1; else $display("FAIL: q=%0d", q);

    @(posedge clk); #1;
    if (q === 6'd0) pass = pass + 1; else $display("FAIL: wrap q=%0d", q);

    if (pass == 4) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module cnt #(
  parameter W = 8
) (
  input            clk,
  input            rst,
  output reg [W-1:0] q
);

  always @(posedge clk) begin
    if (rst)
      q <= 0;
    else
      q <= q + 1;
  end

endmodule`,
        },
        {
          id: '2',
          title: '行波进位加法器：积木搭建',
          desc: '用 4 个现成的 `fulladd` 模块搭出 4 位加法器 `adder4`。`fulladd` 已给出，你只需在 `adder4` 里完成 4 行实例化和进位链。',
          hints: [
            '三根中间进位线：`wire c1, c2, c3;`',
            '实例化格式：`fulladd u0(.a(a[0]), .b(b[0]), .cin(cin), .s(s[0]), .cout(c1));`',
            '最后一位的 cout 直接连顶层输出。',
          ],
          starter: `module fulladd (
  input  a, b, cin,
  output s, cout
);
  assign s    = a ^ b ^ cin;
  assign cout = (a & b) | (b & cin) | (a & cin);
endmodule

module adder4 (
  input  [3:0] a, b,
  input        cin,
  output [3:0] s,
  output       cout
);
  wire c1, c2, c3;

  // TODO: 实例化 4 个 fulladd，串好进位链
  // fulladd u0(.a(a[0]), .b(b[0]), .cin(cin), .s(s[0]), .cout(c1));
  // ...

endmodule`,
          testbench: `module tb;
  reg [3:0] a, b;
  reg cin;
  wire [3:0] s;
  wire cout;
  adder4 dut(.a(a), .b(b), .cin(cin), .s(s), .cout(cout));

  reg [31:0] pass = 0;
  reg [31:0] i, j;
  reg [4:0] exp;
  initial begin
    for (i = 0; i < 4; i = i + 1) begin
      for (j = 0; j < 4; j = j + 1) begin
        exp = i + j;
        a = i[3:0]; b = j[3:0]; cin = 1'b0; #2;
        if ({cout, s} === exp) pass = pass + 1;
        else $display("FAIL %0d+%0d: cout=%b s=%b", i, j, cout, s);

        exp = i + j + 1;
        cin = 1'b1; #2;
        if ({cout, s} === exp) pass = pass + 1;
        else $display("FAIL %0d+%0d+1: cout=%b s=%b", i, j, cout, s);
      end
    end
    if (pass == 32) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module fulladd (
  input  a, b, cin,
  output s, cout
);
  assign s    = a ^ b ^ cin;
  assign cout = (a & b) | (b & cin) | (a & cin);
endmodule

module adder4 (
  input  [3:0] a, b,
  input        cin,
  output [3:0] s,
  output       cout
);
  wire c1, c2, c3;

  fulladd u0(.a(a[0]), .b(b[0]), .cin(cin), .s(s[0]), .cout(c1));
  fulladd u1(.a(a[1]), .b(b[1]), .cin(c1),  .s(s[1]), .cout(c2));
  fulladd u2(.a(a[2]), .b(b[2]), .cin(c2),  .s(s[2]), .cout(c3));
  fulladd u3(.a(a[3]), .b(b[3]), .cin(c3),  .s(s[3]), .cout(cout));
endmodule`,
        },
        {
          id: '3',
          title: 'popcount：数一数有几个 1',
          desc: '实现 popcount（population count）：统计 8 位输入中 1 的个数。用一个**函数 + for 循环**完成，输出 4 位（0~8）。',
          hints: [
            '老式函数头：`function [3:0] cnt; input [7:0] v; reg [31:0] i; begin ... end endfunction`',
            '函数内用阻塞赋值 `cnt = ...`，返回值就是函数名。',
            '调用：`assign n = cnt(d);`',
          ],
          starter: `module popcnt8 (
  input  [7:0] d,
  output [3:0] n
);

  // TODO: 写一个函数统计 v 里 1 的个数，然后 assign n = cnt(d);

endmodule`,
          testbench: `module tb;
  reg [7:0] d;
  wire [3:0] n;
  popcnt8 dut(.d(d), .n(n));

  reg [31:0] pass = 0;
  initial begin
    d = 8'b00000000; #2;
    if (n === 4'd0) pass = pass + 1; else $display("FAIL: n=%0d", n);
    d = 8'b11111111; #2;
    if (n === 4'd8) pass = pass + 1; else $display("FAIL: n=%0d", n);
    d = 8'b10101010; #2;
    if (n === 4'd4) pass = pass + 1; else $display("FAIL: n=%0d", n);
    d = 8'b00000001; #2;
    if (n === 4'd1) pass = pass + 1; else $display("FAIL: n=%0d", n);
    d = 8'b10000000; #2;
    if (n === 4'd1) pass = pass + 1; else $display("FAIL: n=%0d", n);
    d = 8'b01111111; #2;
    if (n === 4'd7) pass = pass + 1; else $display("FAIL: n=%0d", n);

    if (pass == 6) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module popcnt8 (
  input  [7:0] d,
  output [3:0] n
);

  function [3:0] cnt;
    input [7:0] v;
    reg [31:0] i;
    begin
      cnt = 0;
      for (i = 0; i < 8; i = i + 1)
        if (v[i])
          cnt = cnt + 1;
    end
  endfunction

  assign n = cnt(d);

endmodule`,
        },
      ],
    },

    // ---------------- 第 14 章 ----------------
    {
      id: '14',
      title: '拼接与复制',
      subtitle: '把信号「打包」和「展开」的语法糖',
      blocks: [
        {
          k: 'p',
          t: '第一站你已经用过 `{a, b}` 拼接。这一章把它系统化——它是 Verilog 里最像「胶水」的语法：打包总线、符号扩展、循环冗余，全都靠它。',
        },
        {
          k: 'h2',
          t: '拼接 { }：按左高右低排成一排',
        },
        {
          k: 'p',
          t: '`{a, b, c}` 把多个操作数首尾相接，**左边的是高位**。操作数可以是任意表达式和位选择：',
        },
        {
          k: 'code',
          label: '拼接的典型用法',
          code: `assign frame = {wr, addr, data};      // 1+4+8 = 13 位总线
assign head  = frame[12:9];            // 再切出来
{cout, sum} = a + b;                   // 加法结果拆成进位与和`,
        },
        {
          k: 'p',
          t: '左值也能用拼接（上面第三行）：一次赋值把加法结果的高位分给 `cout`、低位分给 `sum`——比中间变量干净。',
        },
        {
          k: 'h2',
          t: '复制 {{N{...}}}：一位变一排',
        },
        {
          k: 'p',
          t: '`{{4{a[3]}}, a}` 把 `a` 的符号位复制 4 份接在前面——**符号扩展**的标准写法。复制也常用来造常量：`{8{1\'b0}}` 就是 8 个 0。',
        },
        {
          k: 'h2',
          t: '实战：格雷码计数器',
        },
        {
          k: 'p',
          t: '格雷码（Gray code）相邻两数只有一位变化，用在跨时钟域或旋转编码器里可以避免读数瞬间的毛刺。普通二进制转格雷只需一步异或：`g = bin ^ (bin >> 1)`。',
        },
        {
          k: 'table',
          head: ['bin', 'gray'],
          rows: [
            ['0000', '0000'],
            ['0001', '0001'],
            ['0010', '0011'],
            ['0011', '0010'],
            ['0100', '0110'],
          ],
        },
        {
          k: 'p',
          t: '每个 gray 相比前一个只翻转一位——这就是「相邻性」。下面三个练习分别练打包、复制和这对组合的实战。',
        },
      ],
      exercises: [
        {
          id: '1',
          title: '打包一个 13 位帧',
          desc: '实现打包器：把控制位 `wr`、地址 `addr[3:0]`、数据 `data[7:0]` 打包成 13 位总线 `frame`——wr 在最高位，data 在最低位。',
          hints: ['一句拼接：`assign frame = {wr, addr, data};`'],
          starter: `module packer (
  input         wr,
  input   [3:0] addr,
  input   [7:0] data,
  output [12:0] frame
);

  // TODO: 拼接打包

endmodule`,
          testbench: `module tb;
  reg wr;
  reg [3:0] addr;
  reg [7:0] data;
  wire [12:0] frame;
  packer dut(.wr(wr), .addr(addr), .data(data), .frame(frame));

  reg [31:0] pass = 0;
  initial begin
    wr = 1; addr = 4'b1010; data = 8'h3C; #2;
    if (frame === 13'b1_1010_0011_1100) pass = pass + 1;
    else $display("FAIL: frame=%b", frame);
    if (frame[12] === 1'b1 && frame[11:8] === 4'b1010 && frame[7:0] === 8'h3C)
      pass = pass + 1;
    else $display("FAIL: fields frame=%b", frame);

    wr = 0; addr = 4'b0011; data = 8'hFF; #2;
    if (frame === 13'b0_0011_1111_1111) pass = pass + 1;
    else $display("FAIL: frame=%b", frame);
    if (frame[12] === 1'b0 && frame[11:8] === 4'b0011 && frame[7:0] === 8'hFF)
      pass = pass + 1;
    else $display("FAIL: fields frame=%b", frame);

    if (pass == 4) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module packer (
  input         wr,
  input   [3:0] addr,
  input   [7:0] data,
  output [12:0] frame
);

  assign frame = {wr, addr, data};

endmodule`,
        },
        {
          id: '2',
          title: '符号扩展：4 位补码变 8 位',
          desc: '把 4 位补码数扩展成 8 位：最高位（符号位）复制 4 份填到高 4 位。例如 `1001`（-7）应变成 `1111_1001`。',
          hints: ['复制运算符：`{{4{a[3]}}, a}`——4 份符号位 + 原数。'],
          starter: `module signext (
  input  [3:0] a,
  output [7:0] y
);

  // TODO: 用复制运算符做符号扩展

endmodule`,
          testbench: `module tb;
  reg [3:0] a;
  wire [7:0] y;
  signext dut(.a(a), .y(y));

  reg [31:0] pass = 0;
  initial begin
    a = 4'b0000; #2;
    if (y === 8'b0000_0000) pass = pass + 1; else $display("FAIL: y=%b", y);
    a = 4'b0111; #2;
    if (y === 8'b0000_0111) pass = pass + 1; else $display("FAIL: y=%b", y);
    a = 4'b1000; #2;
    if (y === 8'b1111_1000) pass = pass + 1; else $display("FAIL: y=%b", y);
    a = 4'b1001; #2;
    if (y === 8'b1111_1001) pass = pass + 1; else $display("FAIL: y=%b", y);
    a = 4'b1111; #2;
    if (y === 8'b1111_1111) pass = pass + 1; else $display("FAIL: y=%b", y);

    if (pass == 5) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module signext (
  input  [3:0] a,
  output [7:0] y
);

  assign y = {{4{a[3]}}, a};

endmodule`,
        },
        {
          id: '3',
          title: '格雷码计数器',
          desc: '实现格雷码计数器：内部是普通的 4 位二进制计数器 `bin`，输出 `g` 是它的格雷码版本（相邻值只变一位）。`g` 是组合输出。',
          hints: [
            '二进制部分照抄计数器；组合输出 `assign g = bin ^ (bin >> 1);`',
            '右移 1 位在 Verilog 里是 `>> 1`。',
          ],
          starter: `module graycnt (
  input        clk,
  input        rst,
  output reg [3:0] bin,
  output [3:0] g
);

  // TODO: 1) bin 是同步复位的 4 位计数器
  //       2) g = bin ^ (bin >> 1)

endmodule`,
          testbench: `module tb;
  reg clk, rst;
  wire [3:0] bin, g;
  graycnt dut(.clk(clk), .rst(rst), .bin(bin), .g(g));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  initial begin
    clk = 0; rst = 1;
    @(posedge clk); #1;
    if (bin === 4'd0 && g === 4'd0) pass = pass + 1;
    else $display("FAIL: reset bin=%b g=%b", bin, g);
    rst = 0;

    @(posedge clk); #1;
    if (bin === 4'd1 && g === 4'd1) pass = pass + 1;
    else $display("FAIL: bin=%b g=%b", bin, g);
    @(posedge clk); #1;
    if (bin === 4'd2 && g === 4'd3) pass = pass + 1;
    else $display("FAIL: bin=%b g=%b", bin, g);
    @(posedge clk); #1;
    if (bin === 4'd3 && g === 4'd2) pass = pass + 1;
    else $display("FAIL: bin=%b g=%b", bin, g);
    @(posedge clk); #1;
    if (bin === 4'd4 && g === 4'd6) pass = pass + 1;
    else $display("FAIL: bin=%b g=%b", bin, g);
    @(posedge clk); #1;
    if (bin === 4'd5 && g === 4'd7) pass = pass + 1;
    else $display("FAIL: bin=%b g=%b", bin, g);
    @(posedge clk); #1;
    if (bin === 4'd6 && g === 4'd5) pass = pass + 1;
    else $display("FAIL: bin=%b g=%b", bin, g);
    @(posedge clk); #1;
    if (bin === 4'd7 && g === 4'd4) pass = pass + 1;
    else $display("FAIL: bin=%b g=%b", bin, g);
    @(posedge clk); #1;
    if (bin === 4'd8 && g === 4'd12) pass = pass + 1;
    else $display("FAIL: bin=%b g=%b", bin, g);

    if (pass == 9) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module graycnt (
  input        clk,
  input        rst,
  output reg [3:0] bin,
  output [3:0] g
);

  always @(posedge clk) begin
    if (rst)
      bin <= 4'd0;
    else
      bin <= bin + 1;
  end

  assign g = bin ^ (bin >> 1);

endmodule`,
        },
      ],
    },

    // ---------------- 第 15 章 ----------------
    {
      id: '15',
      title: '时序进阶',
      subtitle: '脉冲发生器、PWM 与呼吸灯',
      blocks: [
        {
          k: 'p',
          t: '第二站的收官一章：三个实用小电路，把前面学过的计数器、比较器、状态机串起来，做出真正「能看见」的效果。',
        },
        {
          k: 'h2',
          t: '周期脉冲发生器',
        },
        {
          k: 'p',
          t: '慢速外设不需要每个时钟拍都干活——每 N 拍发一个**单拍使能脉冲 tick**，就像给秒表打点。结构 = 模 N 计数器 + 比较归零：数到 N-1 时发脉冲并清零。参数 N 让「每秒一次」还是「每毫秒一次」只改一个数字。',
        },
        {
          k: 'h2',
          t: 'PWM：用「开关时间」模拟亮度',
        },
        {
          k: 'p',
          t: '**脉宽调制（PWM）**是控制 LED 亮度、电机转速的标准手法：以固定周期开关，**高电平时间占比（占空比 duty）决定输出能量**。相位计数器 `phase` 循环扫一圈，`phase < duty` 时输出 1——duty 越大，亮的时间越长。',
        },
        {
          k: 'code',
          label: 'PWM 核心',
          code: `// phase 循环 0..7；duty=6 → 75% 的时间输出高
assign pwm = (phase < duty);`,
        },
        {
          k: 'h2',
          t: '呼吸灯：三角波扫占空比',
        },
        {
          k: 'p',
          t: '把 PWM 的 duty 接到一个**先增后减的三角波计数器**上，LED 就会「呼吸」：渐亮 → 渐暗 → 循环。用参数 `PHASE_W` 控制位宽，`dir` 标志决定当前在爬坡还是下坡：到顶翻转方向，到底再翻回来。',
        },
        {
          k: 'note',
          tone: 'tip',
          title: '本章练习的测试平台更长',
          t: '时序电路需要拍很多拍才能看出周期行为，测试平台会比前面的长——但检查逻辑完全一样：数拍子、看输出。波形视图在这里特别有用，跑完记得看看 tick 的节拍、pwm 的占空比、level 的三角波。',
        },
      ],
      exercises: [
        {
          id: '1',
          title: '周期脉冲发生器',
          desc: '实现参数化脉冲发生器 `pulsegen #(parameter N = 4)`：每 N 个时钟周期产生一个**单拍宽**的 `tick`（高电平一拍）。`tick` 用寄存器输出。',
          hints: [
            '结构：`cnt` 计数到 N-1 时 `tick <= 1; cnt <= 0;` 否则 `tick <= 0; cnt <= cnt + 1;`',
            '比较用数值等：`cnt == N - 1`。',
          ],
          starter: `module pulsegen #(
  parameter N = 4
) (
  input      clk,
  input      rst,
  output reg tick
);
  reg [7:0] cnt;

  // TODO: 数到 N-1 发一个单拍 tick，同时清零计数

endmodule`,
          testbench: `module tb;
  reg clk, rst;
  wire tick;
  pulsegen #(.N(3)) dut(.clk(clk), .rst(rst), .tick(tick));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  reg [31:0] i;
  reg [31:0] hits;
  initial begin
    clk = 0; rst = 1;
    @(posedge clk); #1;
    rst = 0;

    // 前 4 拍逐拍检查：0, 0, 1, 0
    @(posedge clk); #1;
    if (tick === 1'b0) pass = pass + 1; else $display("FAIL: t1 tick=%b", tick);
    @(posedge clk); #1;
    if (tick === 1'b0) pass = pass + 1; else $display("FAIL: t2 tick=%b", tick);
    @(posedge clk); #1;
    if (tick === 1'b1) pass = pass + 1; else $display("FAIL: t3 tick=%b", tick);
    @(posedge clk); #1;
    if (tick === 1'b0) pass = pass + 1; else $display("FAIL: t4 tick=%b", tick);

    // 再数 14 拍（共 18 拍），tick 总数应为 6（第 3,6,9,12,15,18 拍）
    hits = 0;
    for (i = 5; i <= 18; i = i + 1) begin
      @(posedge clk); #1;
      if (tick === 1'b1) hits = hits + 1;
    end
    if (hits == 5) pass = pass + 1;
    else $display("FAIL: hits=%0d in 14 ticks", hits);

    if (pass == 5) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module pulsegen #(
  parameter N = 4
) (
  input      clk,
  input      rst,
  output reg tick
);
  reg [7:0] cnt;

  always @(posedge clk) begin
    if (rst) begin
      cnt  <= 8'd0;
      tick <= 1'b0;
    end else if (cnt == N - 1) begin
      cnt  <= 8'd0;
      tick <= 1'b1;
    end else begin
      cnt  <= cnt + 1;
      tick <= 1'b0;
    end
  end

endmodule`,
        },
        {
          id: '2',
          title: 'PWM 调光器',
          desc: '实现 3 位 PWM：`phase` 计数器循环 0→7；输出 `pwm = (phase < duty)`。测试平台会统计每种 `duty` 下 8 拍里高电平的拍数。',
          hints: [
            'phase 循环：`phase <= (phase == 3\'d7) ? 3\'d0 : phase + 1;`',
            '输出是纯组合：`assign pwm = (phase < duty);`',
          ],
          starter: `module pwm (
  input      clk,
  input      rst,
  input  [2:0] duty,
  output     pwm
);
  reg [2:0] phase;

  // TODO: phase 循环 0..7；组合输出 pwm

endmodule`,
          testbench: `module tb;
  reg clk, rst;
  reg [2:0] duty;
  wire pwm;
  pwm dut(.clk(clk), .rst(rst), .duty(duty), .pwm(pwm));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  reg [31:0] i;
  reg [31:0] hits;
  initial begin
    clk = 0; rst = 1; duty = 3'd4;
    @(posedge clk); #1;
    rst = 0;

    // duty=4：8 拍里 4 拍高
    hits = 0;
    for (i = 0; i < 8; i = i + 1) begin
      @(posedge clk); #1;
      if (pwm === 1'b1) hits = hits + 1;
    end
    if (hits == 4) pass = pass + 1;
    else $display("FAIL: duty=4 hits=%0d", hits);

    // duty=0：全灭
    duty = 3'd0;
    hits = 0;
    for (i = 0; i < 8; i = i + 1) begin
      @(posedge clk); #1;
      if (pwm === 1'b1) hits = hits + 1;
    end
    if (hits == 0) pass = pass + 1;
    else $display("FAIL: duty=0 hits=%0d", hits);

    // duty=7：8 拍里 7 拍高
    duty = 3'd7;
    hits = 0;
    for (i = 0; i < 8; i = i + 1) begin
      @(posedge clk); #1;
      if (pwm === 1'b1) hits = hits + 1;
    end
    if (hits == 7) pass = pass + 1;
    else $display("FAIL: duty=7 hits=%0d", hits);

    if (pass == 3) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module pwm (
  input      clk,
  input      rst,
  input  [2:0] duty,
  output     pwm
);
  reg [2:0] phase;

  always @(posedge clk) begin
    if (rst)
      phase <= 3'd0;
    else if (phase == 3'd7)
      phase <= 3'd0;
    else
      phase <= phase + 1;
  end

  assign pwm = (phase < duty);

endmodule`,
        },
        {
          id: '3',
          title: '呼吸灯（三角波亮度）',
          desc: '实现参数化三角波发生器 `breathe #(parameter PHASE_W = 3)`：`level` 从 0 数到最大值 2^PHASE_W−1，再数回 0，循环往复。`dir=1` 表示正在上升。',
          hints: [
            '上升时：到顶（`level == MAX`）则转下降，否则 +1。',
            '下降时：到底（`level == 0`）则转上升，否则 −1。',
            '`localparam MAX = (1 << PHASE_W) - 1;`（数值比较，位宽不同没关系）。',
          ],
          starter: `module breathe #(
  parameter PHASE_W = 3
) (
  input               clk,
  input               rst,
  output reg [PHASE_W-1:0] level
);
  localparam MAX = (1 << PHASE_W) - 1;
  reg dir;   // 1 = 上升, 0 = 下降

  // TODO: 到顶转向、到底转向；否则按 dir 加减

endmodule`,
          testbench: `module tb;
  reg clk, rst;
  wire [2:0] level;
  breathe #(.PHASE_W(3)) dut(.clk(clk), .rst(rst), .level(level));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  reg [31:0] i;
  initial begin
    clk = 0; rst = 1;
    @(posedge clk); #1;
    if (level === 3'd0) pass = pass + 1; else $display("FAIL: reset level=%0d", level);
    rst = 0;

    // 上升 1→7
    for (i = 0; i < 7; i = i + 1) begin
      @(posedge clk); #1;
      if (level === 1 + i[2:0]) pass = pass + 1;
      else $display("FAIL: up i=%0d level=%0d", i, level);
    end

    // 下降 6→0
    for (i = 0; i < 7; i = i + 1) begin
      @(posedge clk); #1;
      if (level === 6 - i[2:0]) pass = pass + 1;
      else $display("FAIL: down i=%0d level=%0d", i, level);
    end

    // 再次上升
    @(posedge clk); #1;
    if (level === 3'd1) pass = pass + 1;
    else $display("FAIL: rise again level=%0d", level);

    if (pass == 16) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module breathe #(
  parameter PHASE_W = 3
) (
  input               clk,
  input               rst,
  output reg [PHASE_W-1:0] level
);
  localparam MAX = (1 << PHASE_W) - 1;
  reg dir;   // 1 = 上升, 0 = 下降

  always @(posedge clk) begin
    if (rst) begin
      level <= 0;
      dir   <= 1'b1;
    end else if (dir) begin
      if (level == MAX) begin
        level <= level - 1;
        dir   <= 1'b0;
      end else
        level <= level + 1;
    end else begin
      if (level == 0) begin
        level <= level + 1;
        dir   <= 1'b1;
      end else
        level <= level - 1;
    end
  end

endmodule`,
        },
      ],
    },
  ],
};

import type { Stage } from './types';

/**
 * Stage 1 — 语言基础（第 00–07 章，22 个练习）
 */
export const basics: Stage = {
  id: 'basics',
  title: '第一站 · 语言基础',
  tagline: '认识模块、端口、向量与组合逻辑',
  desc: '从「硬件和软件有什么不同」出发，掌握 Verilog 的模块结构、数据类型、运算符，用 assign 与 always @(*) 写出第一批组合逻辑电路。',
  chapters: [
    // ---------------- 第 00 章 ----------------
    {
      id: '00',
      title: '走进硬件世界',
      subtitle: 'Verilog 是什么，仿真又是什么',
      blocks: [
        {
          k: 'p',
          t: '你已经会写软件了——一行一行地执行，变量在内存里改来改去。而 **Verilog** 是另一类语言：**硬件描述语言**（HDL, Hardware Description Language）。它描述的不是「一步步做什么」，而是「电路长什么样」。',
        },
        {
          k: 'h2',
          t: '软件程序 vs 硬件电路',
        },
        {
          k: 'ul',
          items: [
            '软件是**串行**的：同一时刻 CPU 只执行一条指令，靠时间先后表达逻辑。',
            '硬件是**并行**的：一个电路里所有的门、所有的寄存器**同时**在工作，没有「先后」。',
            '`a = b + c;` 在 C 语言里是一个动作；在 Verilog 里它描述的是**一个加法器**——一个真实存在、持续运算的器件。',
          ],
        },
        {
          k: 'p',
          t: '所以学 Verilog 最重要的思维转变是：**你写的每一行代码都对应一块电路**。写代码时要在脑子里「画电路」，而不是想执行顺序。',
        },
        {
          k: 'h2',
          t: '仿真：不用买芯片也能验证电路',
        },
        {
          k: 'p',
          t: '真实电路通电后用示波器观察，而在本教程里，我们用**仿真器**（simulator）做同样的事。它的核心概念：',
        },
        {
          k: 'ul',
          items: [
            '**仿真时间（simulation time）**：一个虚拟的时钟，从 0 开始前进，单位是任意的「时间单位」。电路中的事件（信号变化）都发生在某个时刻。',
            '**测试平台（testbench）**：一段专门「考试」用的代码，给电路施加输入、检查输出。它不是要综合成电路的代码。',
            '**波形（waveform）**：仿真器记录下每个信号随时间的变化，画成时序图，就像数字示波器的截图。',
          ],
        },
        {
          k: 'note',
          tone: 'tip',
          title: '本站内置仿真器',
          t: '这个网站在浏览器里内置了一个迷你 Verilog 仿真器。你写的每一道练习都会即时编译、运行、判分，还能看到完整波形——不需要安装任何软件。',
        },
        {
          k: 'h2',
          t: '四值逻辑：0、1 之外还有 x 和 z',
        },
        {
          k: 'p',
          t: '真实信号线上的电平除了确定的 0 和 1，还有两种特殊状态：**x**（未知，比如寄存器还没被初始化）和 **z**（高阻，比如没人驱动这根线）。Verilog 用这 4 个值来刻画电路，比软件里只有 0/1 更贴近硬件现实。后面章节会反复遇到它们。',
        },
        {
          k: 'code',
          label: '一个最小的 Verilog 模块',
          code: `module inverter (a, y);
  input  a;    // 一位输入端口
  output y;    // 一位输出端口

  assign y = ~a;   // y 永远等于 a 取反 —— 这就是一个非门
endmodule`,
        },
        {
          k: 'p',
          t: '这个模块描述了一个非门：只要 `a` 变化，`y` 立刻（组合逻辑意义下）跟着取反。注意 `assign` 不是「执行一次」的赋值——它是**持续驱动**：a 变一万次，y 就跟着变一万次。',
        },
        {
          k: 'p',
          t: '准备好了吗？下面完成你的第一个电路。',
        },
      ],
      exercises: [
        {
          id: '1',
          title: '你的第一个电路：二输入与门',
          desc: '补全模块 `and2`，让它实现一个**与门**：当且仅当 `a` 与 `b` 都为 1 时，`y` 才为 1。只需一行 `assign`。运行测试平台，看它变成绿色。',
          hints: [
            'Verilog 的按位与运算符是 `&`（单与号），不是 `&&`。',
            '组合逻辑用持续赋值：`assign y = ...;`',
          ],
          starter: `module and2 (
  input  a,
  input  b,
  output y
);

  // TODO: 用 assign 让 y 等于 a 与 b 的按位与

endmodule`,
          testbench: `module tb;
  reg a, b;
  wire y;
  and2 dut (.a(a), .b(b), .y(y));

  reg [31:0] pass = 0;
  initial begin
    a = 0; b = 0; #10;
    if (y === 1'b0) pass = pass + 1; else $display("FAIL a=0 b=0 y=%b", y);
    a = 0; b = 1; #10;
    if (y === 1'b0) pass = pass + 1; else $display("FAIL a=0 b=1 y=%b", y);
    a = 1; b = 0; #10;
    if (y === 1'b0) pass = pass + 1; else $display("FAIL a=1 b=0 y=%b", y);
    a = 1; b = 1; #10;
    if (y === 1'b1) pass = pass + 1; else $display("FAIL a=1 b=1 y=%b", y);

    if (pass == 4) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module and2 (
  input  a,
  input  b,
  output y
);

  assign y = a & b;

endmodule`,
          explain: [
            { line: 1, text: '声明一个名为 `and2` 的模块，括号里列出它对外的端口。' },
            { line: 2, text: '输入端口 `a`，1 位宽。' },
            { line: 3, text: '输入端口 `b`，1 位宽。' },
            { line: 4, text: '输出端口 `y`，1 位宽。' },
            { line: 5, text: '端口列表结束。' },
            { line: 7, text: '**核心**：持续把 `y` 驱动为 `a` 和 `b` 的按位与；这一行就对应一个真实的与门。' },
            { line: 9, text: '模块声明结束。' },
          ],
          truthTable: {
            caption: '二输入与门',
            head: ['a', 'b', 'y'],
            rows: [
              ['0', '0', '0'],
              ['0', '1', '0'],
              ['1', '0', '0'],
              ['1', '1', '1'],
            ],
          },
          alternatives: [
            {
              label: 'assign（推荐）',
              note: '单门、表达式简单时用 `assign` 最简洁，是一行持续赋值。',
              code: `module and2 (
  input  a,
  input  b,
  output y
);
  assign y = a & b;
endmodule`,
            },
            {
              label: 'always @(*)',
              note: '组合逻辑也可以用 `always @(*)`；此时输出要声明为 `reg`。功能与 assign 完全相同，多语句复杂逻辑时更方便。',
              code: `module and2 (
  input  a,
  input  b,
  output reg y
);
  always @(*) begin
    y = a & b;
  end
endmodule`,
            },
          ],
          circuit: {
            nodes: [
              { id: 'a', kind: 'in', x: 0, y: 0 },
              { id: 'b', kind: 'in', x: 0, y: 1 },
              { id: 'g1', kind: 'and', x: 1, y: 0, inputs: ['a', 'b'] },
              { id: 'y', kind: 'out', x: 2, y: 0, inputs: ['g1'] },
            ],
            note: '两根输入线进入一个与门，输出 y 仅在 a、b 同时为 1 时为 1。',
          },
        },
      ],
      quiz: [
        {
          q: 'Verilog 中 `assign y = a & b;` 描述的是？',
          options: ['一个先执行一次的赋值动作', '一个持续工作的与门电路', '一个时钟控制的寄存器'],
          answer: 1,
          explain: 'assign 是持续赋值，描述的是硬件电路（与门），不是执行一次的软件语句。',
        },
        {
          q: '按位与、逻辑与分别用哪个运算符？',
          options: ['& 与 &&', '&& 与 &', '| 与 &'],
          answer: 0,
          explain: '`&` 是按位与（门电路），`&&` 是逻辑与（结果为布尔真/假）。',
        },
        {
          q: 'Verilog 里的 x、z 分别表示？',
          options: ['未知 / 高阻', '0 / 1', '高电平 / 低电平'],
          answer: 0,
          explain: 'x 为未知（如未初始化），z 为高阻（无人驱动）。',
        },
      ],
    },

    // ---------------- 第 01 章 ----------------
    {
      id: '01',
      title: '模块与端口',
      subtitle: 'Verilog 世界的积木与插脚',
      blocks: [
        {
          k: 'p',
          t: '**module** 是 Verilog 的基本单位——一块自包含的电路，就像积木。复杂的芯片（CPU、显卡）就是由成千上万个 module 组成的。每个 module 有名字、有端口（port，对外暴露的输入输出），有内部实现。',
        },
        {
          k: 'h2',
          t: '两种端口写法',
        },
        {
          k: 'p',
          t: '端口声明有历史遗留的两种风格，都要能读懂。**ANSI 风格**（写在端口列表里，推荐）和**非 ANSI 风格**（分开声明）：',
        },
        {
          k: 'code',
          label: 'ANSI 风格（本教程主要使用）',
          code: `module mux21 (
  input  s,     // 方向和类型写在一起
  input  a,
  input  b,
  output y
);
  assign y = s ? b : a;
endmodule`,
        },
        {
          k: 'code',
          label: '非 ANSI 风格（老代码常见）',
          code: `module mux21 (s, a, b, y);
  input  s, a, b;      // 先只写端口名
  output y;            // 再声明方向
  assign y = s ? b : a;
endmodule`,
        },
        {
          k: 'h2',
          t: '实例化：把积木拼起来',
        },
        {
          k: 'p',
          t: '在一个模块里使用另一个模块，叫**实例化**（instantiation）。这就像在 PCB 板上焊一颗芯片——你提供的是同一种芯片的设计图（module 定义），可以焊很多颗（多个 instance）。',
        },
        {
          k: 'code',
          label: '命名端口连接（推荐）',
          code: `module top (a, b, y);
  input  a, b;
  output y;
  wire   n1, n2;                    // 内部连线

  not1 u1 (.a(a),  .y(n1));         // 例 1：端口对端口
  not1 u2 (.a(b),  .y(n2));        // 例 2：同一个模块用两次
  and2 u3 (.a(n1), .b(n2), .y(y));
endmodule`,
        },
        {
          k: 'note',
          tone: 'info',
          title: 'wire 是「导线」',
          t: '模块内部的信号默认是 wire——它就像电路板上的一根铜线，本身不保存任何值，只负责把驱动源的值传导过去。assign 和实例化输出都可以驱动 wire。',
        },
        {
          k: 'h2',
          t: '结构化建模：从底层门搭电路',
        },
        {
          k: 'p',
          t: '像上面那样，只用「基本门 + 连线」描述电路的方法叫**结构化建模**（structural modeling）。它最接近真实电路结构，也是历史上第一代设计方法。这一章的练习会让你用德摩根定律，从与门和非门「搭」出或门。',
        },
        {
          k: 'note',
          tone: 'tip',
          title: '德摩根定律预告',
          t: '`a | b = ~(~a & ~b)`。动手前先想想：要几个非门？几个与门？',
        },
      ],
      exercises: [
        {
          id: '1',
          title: '非门',
          desc: '实现一个非门 `not1`：`y` 永远是 `a` 的取反。这是最简单的模块，用来熟悉端口与 `assign`。',
          hints: ['按位取反运算符是 `~`（波浪号）。', '`assign y = ~a;` 一行即可。'],
          starter: `module not1 (
  input  a,
  output y
);

  // TODO: y = a 取反

endmodule`,
          testbench: `module tb;
  reg a;
  wire y;
  not1 dut (.a(a), .y(y));

  reg [31:0] pass = 0;
  initial begin
    a = 0; #10;
    if (y === 1'b1) pass = pass + 1; else $display("FAIL a=0 y=%b", y);
    a = 1; #10;
    if (y === 1'b0) pass = pass + 1; else $display("FAIL a=1 y=%b", y);

    if (pass == 2) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module not1 (
  input  a,
  output y
);

  assign y = ~a;

endmodule`,
          explain: [
            { line: 1, text: '声明模块 `not1`，端口在括号内。' },
            { line: 2, text: '输入端口 `a`。' },
            { line: 3, text: '输出端口 `y`。' },
            { line: 4, text: '端口列表结束。' },
            { line: 6, text: '持续把 `y` 驱动为 `a` 的取反，对应一个非门。' },
            { line: 8, text: '模块结束。' },
          ],
          truthTable: {
            caption: '非门',
            head: ['a', 'y'],
            rows: [
              ['0', '1'],
              ['1', '0'],
            ],
          },
          circuit: {
            nodes: [
              { id: 'a', kind: 'in', x: 0, y: 0 },
              { id: 'n1', kind: 'not', x: 1, y: 0, inputs: ['a'] },
              { id: 'y', kind: 'out', x: 2, y: 0, inputs: ['n1'] },
            ],
            note: '输入经过一个非门（三角形 + 小圆圈），输出是输入的反相。',
          },
        },
        {
          id: '2',
          title: '三输入与非门',
          desc: '实现三输入与非门 `nand3`：`y = ~(a & b & c)`。测试平台会用 `for` 循环遍历全部 8 种输入组合，顺便见识一下循环激励的写法。',
          hints: ['先把三个输入与起来，再整体取反。', '`assign y = ~(a & b & c);`'],
          starter: `module nand3 (
  input  a,
  input  b,
  input  c,
  output y
);

  // TODO: y = (a & b & c) 取反

endmodule`,
          testbench: `module tb;
  reg a, b, c;
  wire y;
  nand3 dut (.a(a), .b(b), .c(c), .y(y));

  reg [31:0] i;
  reg [31:0] pass = 0;
  initial begin
    for (i = 0; i < 8; i = i + 1) begin
      a = i[2]; b = i[1]; c = i[0];
      #10;
      if (y === (i == 7 ? 1'b0 : 1'b1)) pass = pass + 1;
      else
        $display("FAIL a=%b b=%b c=%b y=%b", a, b, c, y);
    end

    if (pass == 8) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module nand3 (
  input  a,
  input  b,
  input  c,
  output y
);

  assign y = ~(a & b & c);

endmodule`,
          explain: [
            { line: 1, text: '声明模块 `nand3`。' },
            { line: 2, text: '输入端口 `a`。' },
            { line: 3, text: '输入端口 `b`。' },
            { line: 4, text: '输入端口 `c`。' },
            { line: 5, text: '输出端口 `y`。' },
            { line: 6, text: '端口列表结束。' },
            { line: 7, text: '把 `a`、`b`、`c` 先与起来，再整体取反；对应一个三输入与非门，**只有全为 1 时 y 才为 0**。' },
            { line: 9, text: '模块结束。' },
          ],
          truthTable: {
            caption: '三输入与非门（仅全 1 时输出 0）',
            head: ['a', 'b', 'c', 'y'],
            rows: [
              ['0', '0', '0', '1'],
              ['0', '0', '1', '1'],
              ['0', '1', '0', '1'],
              ['0', '1', '1', '1'],
              ['1', '0', '0', '1'],
              ['1', '0', '1', '1'],
              ['1', '1', '0', '1'],
              ['1', '1', '1', '0'],
            ],
          },
          circuit: {
            nodes: [
              { id: 'a', kind: 'in', x: 0, y: 0 },
              { id: 'b', kind: 'in', x: 0, y: 1 },
              { id: 'c', kind: 'in', x: 0, y: 2 },
              { id: 'g1', kind: 'nand', x: 1, y: 1, inputs: ['a', 'b', 'c'] },
              { id: 'y', kind: 'out', x: 2, y: 1, inputs: ['g1'] },
            ],
            note: '三根输入进入一个与非门（与门 + 输出小圆圈），输出被整体取反。',
          },
        },
        {
          id: '3',
          title: '用积木搭或门',
          desc: '给定 `and2`（与门）和 `not1`（非门）两个模块（已提供，勿改），请**结构化**地搭出或门 `or2`：`y = a | b`。只能用实例化 + wire 连线，不允许写 `assign y = a | b`。',
          hints: [
            '德摩根定律：`a | b = ~(~a & ~b)`。',
            '先把 a、b 分别取反（2 个 not1），再与起来（1 个 and2），最后再取反（1 个 not1）。一共要实例化 4 个模块。',
            '内部连线需要先声明 `wire na, nb, w;`。',
          ],
          starter: `module and2 (
  input  a,
  input  b,
  output y
);
  assign y = a & b;
endmodule

module not1 (
  input  a,
  output y
);
  assign y = ~a;
endmodule

module or2 (
  input  a,
  input  b,
  output y
);

  // TODO: 声明需要的 wire，然后实例化 and2 / not1 搭出 y = a | b

endmodule`,
          testbench: `module tb;
  reg a, b;
  wire y;
  or2 dut (.a(a), .b(b), .y(y));

  reg [31:0] i;
  reg [31:0] pass = 0;
  initial begin
    for (i = 0; i < 4; i = i + 1) begin
      a = i[1]; b = i[0];
      #10;
      if (y === (a | b)) pass = pass + 1;
      else $display("FAIL a=%b b=%b y=%b", a, b, y);
    end

    if (pass == 4) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module and2 (
  input  a,
  input  b,
  output y
);
  assign y = a & b;
endmodule

module not1 (
  input  a,
  output y
);
  assign y = ~a;
endmodule

module or2 (
  input  a,
  input  b,
  output y
);

  wire na, nb, w;

  not1 u1 (.a(a), .y(na));
  not1 u2 (.a(b), .y(nb));
  and2 u3 (.a(na), .b(nb), .y(w));
  not1 u4 (.a(w), .y(y));

endmodule`,
          explain: [
            { line: 22, text: '声明 3 根内部连线：`na`、`nb` 是 a、b 的反相，`w` 是中间结果。' },
            { line: 24, text: '非门 u1 把 a 取反，得到 `na = ~a`。' },
            { line: 25, text: '非门 u2 把 b 取反，得到 `nb = ~b`。' },
            { line: 26, text: '与门 u3 把两个反相信号与起来，得到 `w = ~a & ~b`。' },
            { line: 27, text: '非门 u4 再取反，`y = ~(~a & ~b) = a | b`（德摩根定律）。' },
          ],
          truthTable: {
            caption: '搭出的或门',
            head: ['a', 'b', 'y'],
            rows: [
              ['0', '0', '0'],
              ['0', '1', '1'],
              ['1', '0', '1'],
              ['1', '1', '1'],
            ],
          },
          circuit: {
            nodes: [
              { id: 'a', kind: 'in', x: 0, y: 0 },
              { id: 'b', kind: 'in', x: 0, y: 2 },
              { id: 'u1', kind: 'not', x: 1, y: 0, inputs: ['a'] },
              { id: 'u2', kind: 'not', x: 1, y: 2, inputs: ['b'] },
              { id: 'u3', kind: 'and', x: 2, y: 1, inputs: ['u1', 'u2'] },
              { id: 'u4', kind: 'not', x: 3, y: 1, inputs: ['u3'] },
              { id: 'y', kind: 'out', x: 4, y: 1, inputs: ['u4'] },
            ],
            note: '两路先各自取反 → 与 → 再取反，用与门和非门搭出了或门（德摩根）。',
          },
        },
      ],
      quiz: [
        {
          q: 'ANSI 风格的端口列表，端口方向写在哪里？',
          options: ['写在括号内的端口列表里', '在模块外单独声明', '写在 testbench 里'],
          answer: 0,
          explain: 'ANSI 风格把方向和类型写在 module 端口列表里，是推荐写法。',
        },
        {
          q: '三输入与非门 y = ~(a & b & c)，什么时候输出 0？',
          options: ['任一输入为 0', '三个输入全为 1', '三个输入全为 0'],
          answer: 1,
          explain: '与非门仅在所有输入都为 1 时，与结果为 1、取反后为 0。',
        },
        {
          q: '德摩根定律中，a | b 等价于？',
          options: ['~(~a & ~b)', '~a & ~b', 'a & b'],
          answer: 0,
          explain: 'a | b = ~(~a & ~b)，这正是练习 3 用积木搭或门的依据。',
        },
        {
          q: '模块内部的连接线应该用什么声明？',
          options: ['wire', 'input', 'reg'],
          answer: 0,
          explain: '内部连线用 wire 声明；input 是对外端口，reg 是过程变量。',
        },
      ],
    },

    // ---------------- 第 02 章 ----------------
    {
      id: '02',
      title: 'wire 与 reg',
      subtitle: '两种赋值世界：持续驱动与过程赋值',
      blocks: [
        {
          k: 'p',
          t: 'Verilog 的变量只有两种主角：**wire** 和 **reg**。它们不是「线」和「寄存器」的严格对应，而是**赋值方式**的区别——这是初学者最容易混淆的概念，务必想清楚。',
        },
        {
          k: 'table',
          head: ['', 'wire', 'reg'],
          rows: [
            ['谁来赋值', '`assign` 持续赋值 / 模块输出', '`initial`、`always` 过程赋值'],
            ['语义', '永远等于右边表达式（持续驱动）', '在特定时刻被「写入」一次'],
            ['硬件对应', '组合逻辑 / 导线', '综合后可能是寄存器，也可能只是组合逻辑'],
            ['没赋值时', '值为 z（无驱动）', '值为 x（未知）'],
          ],
        },
        {
          k: 'code',
          label: '同一件事的两种写法',
          code: `// 写法一：wire + assign（持续驱动）
wire   y1;
assign y1 = a & b;

// 写法二：reg + always（过程赋值）
reg y2;
always @(*) y2 = a & b;    // 星号表示「右边用到的信号一变就重算」`,
        },
        {
          k: 'h2',
          t: 'initial 块与仿真时间',
        },
        {
          k: 'p',
          t: '`initial` 块只在仿真开始时执行一次，主要用在测试平台里。块内的语句按顺序执行，`#数字` 表示「等待 N 个时间单位」——这是你操纵仿真时间的手柄。',
        },
        {
          k: 'code',
          label: '时间轴上的信号',
          code: `reg pulse;
initial begin
  pulse = 1'b0;   // t = 0
  #10 pulse = 1'b1;   // t = 10 时变 1
  #20 pulse = 1'b0;   // t = 30 时变 0
end`,
        },
        {
          k: 'p',
          t: '把这段代码放进仿真器，波形图上会画出一个从 t=10 持续到 t=30 的脉冲。**读波形是硬件工程师的基本功**，本站的每一道练习都会展示波形。',
        },
        {
          k: 'h2',
          t: '中间信号：wire 串联组合逻辑',
        },
        {
          k: 'p',
          t: '复杂电路要拆成多级。比如全加器：`s = a ^ b ^ cin`，`cout = a&b | (a^b)&cin`。与其写一个吓人的大表达式，不如用 wire 命名中间结果，电路结构一目了然。',
        },
        {
          k: 'note',
          tone: 'warn',
          title: '位宽陷阱',
          t: '1 位信号相加最多得到 2（`1+1`），需要 2 位才能装下。直接写 `{cout, s} = a + b + cin` 时，加法结果会按 1 位截断、进位丢失。要用 `{1\'b0, a} + {1\'b0, b} + {1\'b0, cin}` 显式拓宽位宽——本章练习会踩到这个坑。',
        },
        {
          k: 'h2',
          t: '高阻态 z 与三态门',
        },
        {
          k: 'p',
          t: '当一根 wire 没有任何驱动源时，它的值是 **z**。三态缓冲器利用这一点实现「总线」：不使能时输出 z，把总线让给别的驱动者。比较 z 要用 `===`（逐位比较，见第 07 章）。',
        },
      ],
      exercises: [
        {
          id: '1',
          title: '全加器',
          desc: '实现一位全加器 `fulladd`：输入 `a`、`b`、`cin`（低位进位），输出和 `s` 与进位 `cout`。要求先算中间信号 `p = a ^ b`（ propagate）、`g = a & b`（generate），再用它们表达结果——体会 wire 命名中间结果的好处。',
          hints: [
            '`s = a ^ b ^ cin`。',
            '`cout = g | (p & cin)`，其中 `g = a & b`，`p = a ^ b`。',
            '小心位宽：用 `{cout, s} = {1\'b0, p} + {1\'b0, cin}...` 之前先想清楚，或直接分别 assign 两个输出。',
          ],
          starter: `module fulladd (
  input  a,
  input  b,
  input  cin,
  output s,
  output cout
);

  // TODO: 声明 wire p, g;
  // TODO: p = a 异或 b（本位和不含进位），g = a 与 b（直接进位）
  // TODO: s = p 异或 cin，cout = g 或 (p 与 cin)

endmodule`,
          testbench: `module tb;
  reg a, b, cin;
  wire s, cout;
  fulladd dut (.a(a), .b(b), .cin(cin), .s(s), .cout(cout));

  reg [31:0] i;
  reg [1:0] exp_sum;
  reg [31:0] pass = 0;
  initial begin
    for (i = 0; i < 8; i = i + 1) begin
      a = i[2]; b = i[1]; cin = i[0];
      #10;
      exp_sum = {1'b0, a} + {1'b0, b} + {1'b0, cin};
      if ({cout, s} === exp_sum)
        pass = pass + 1;
      else
        $display("FAIL a=%b b=%b cin=%b cout=%b s=%b", a, b, cin, cout, s);
    end

    if (pass == 8) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module fulladd (
  input  a,
  input  b,
  input  cin,
  output s,
  output cout
);

  wire p, g;

  assign p = a ^ b;
  assign g = a & b;
  assign s = p ^ cin;
  assign cout = g | (p & cin);

endmodule`,
          explain: [
            { line: 9, text: '声明两根内部线：`p`（半加和/propagate）、`g`（直接进位/generate）。' },
            { line: 11, text: '`p = a ^ b`：a、b 的异或，即不含进位的半加和。' },
            { line: 12, text: '`g = a & b`：a、b 都为 1 时直接产生的进位。' },
            { line: 13, text: '最终和 `s = p ^ cin`：半加和再与低位进位异或。' },
            { line: 14, text: '`cout = g | (p & cin)`：进位要么直接产生（g），要么由 p 传递（p&cin）。' },
            { line: 16, text: '模块结束。' },
          ],
          steps: [
            {
              title: '先算半加和与直接进位',
              text: '声明 `wire p, g`，用两个 assign 算出 `p = a ^ b`、`g = a & b`。',
              code: 'wire p, g;\nassign p = a ^ b;\nassign g = a & b;',
            },
            {
              title: '再算最终和 s',
              text: '把半加和 p 与低位进位 cin 再异或，得到 `s = p ^ cin`。',
              code: 'assign s = p ^ cin;',
            },
            {
              title: '最后算进位 cout',
              text: '两个来源取或：a、b 直接产生 g，或 p 把 cin 传递上来：`cout = g | (p & cin)`。',
              code: 'assign cout = g | (p & cin);',
            },
          ],
          truthTable: {
            caption: '全加器（cout 为进位、s 为本位和）',
            head: ['a', 'b', 'cin', 'cout', 's'],
            rows: [
              ['0', '0', '0', '0', '0'],
              ['0', '0', '1', '0', '1'],
              ['0', '1', '0', '0', '1'],
              ['0', '1', '1', '1', '0'],
              ['1', '0', '0', '0', '1'],
              ['1', '0', '1', '1', '0'],
              ['1', '1', '0', '1', '0'],
              ['1', '1', '1', '1', '1'],
            ],
          },
          circuit: {
            nodes: [
              { id: 'a', kind: 'in', x: 0, y: 0 },
              { id: 'b', kind: 'in', x: 0, y: 1 },
              { id: 'cin', kind: 'in', x: 0, y: 4 },
              { id: 'x1', kind: 'xor', x: 1, y: 0, inputs: ['a', 'b'] },
              { id: 'a1', kind: 'and', x: 1, y: 2, inputs: ['a', 'b'] },
              { id: 'x2', kind: 'xor', x: 2, y: 0, inputs: ['x1', 'cin'] },
              { id: 's', kind: 'out', x: 3, y: 0, inputs: ['x2'] },
              { id: 'a2', kind: 'and', x: 2, y: 3, inputs: ['x1', 'cin'] },
              { id: 'o1', kind: 'or', x: 3, y: 3, inputs: ['a1', 'a2'] },
              { id: 'cout', kind: 'out', x: 4, y: 3, inputs: ['o1'] },
            ],
            note: '全加器 = 两级异或求 s，两个与门 + 一个或门求进位 cout。',
          },
        },
        {
          id: '2',
          title: '波形发生器',
          desc: '编写模块 `siggen`：用 `initial` 块和 `#` 延迟，让输出 `y` 按下面的时间表变化：t=0 时 0，t=10 时 1，t=30 时 0，t=45 时 1，t=70 时 0。测试平台会在 5 个时间点采样核对，帮你建立「仿真时间轴」的直觉。',
          hints: [
            '两次变化之间的间隔用 `#` 累计：从 t=10 到 t=30 要写 `#20`。',
            '时间表：0→(10)→1→(20)→0→(15)→1→(25)→0。',
            '`y` 要声明成 `output reg`，因为它在过程块里赋值。',
          ],
          starter: `module siggen (
  output reg y
);

  initial begin
    // TODO: 按时间表驱动 y
    // t=0   y=0
    // t=10  y=1
    // t=30  y=0
    // t=45  y=1
    // t=70  y=0
  end

endmodule`,
          testbench: `module tb;
  wire y;
  siggen dut (.y(y));

  reg [31:0] pass = 0;
  initial begin
    #5;
    if (y === 1'b0) pass = pass + 1; else $display("FAIL t=5  y=%b", y);
    #10;   // t = 15
    if (y === 1'b1) pass = pass + 1; else $display("FAIL t=15 y=%b", y);
    #20;   // t = 35
    if (y === 1'b0) pass = pass + 1; else $display("FAIL t=35 y=%b", y);
    #15;   // t = 50
    if (y === 1'b1) pass = pass + 1; else $display("FAIL t=50 y=%b", y);
    #25;   // t = 75
    if (y === 1'b0) pass = pass + 1; else $display("FAIL t=75 y=%b", y);

    if (pass == 5) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module siggen (
  output reg y
);

  initial begin
    y = 1'b0;      // t = 0
    #10 y = 1'b1;  // t = 10
    #20 y = 1'b0;  // t = 30
    #15 y = 1'b1;  // t = 45
    #25 y = 1'b0;  // t = 70
  end

endmodule`,
          explain: [
            { line: 2, text: '`y` 声明为 `output reg`，因为它在 initial 过程块里被赋值。' },
            { line: 5, text: 'initial 块在仿真开始时执行一次。' },
            { line: 6, text: 't=0 时先把 y 置为 0。' },
            { line: 7, text: '`#10` 等待 10 个时间单位，t=10 时 y 变 1。' },
            { line: 8, text: '`#20` 累计到 t=30，y 变 0。' },
            { line: 9, text: '`#15` 累计到 t=45，y 变 1。' },
            { line: 10, text: '`#25` 累计到 t=70，y 变 0。注意 `#` 是相对上一条的累计延迟。' },
          ],
        },
        {
          id: '3',
          title: '三态缓冲器',
          desc: '实现三态缓冲器 `tribuf`：`en=1` 时 `y` 跟随 `a`；`en=0` 时 `y` 输出高阻 z（把总线让出来）。测试平台用 `===` 检查 z 值——只有三态输出能通过。',
          hints: [
            '条件运算符：`en ? a : 1\'bz`。',
            '`assign y = en ? a : 1\'bz;`',
          ],
          starter: `module tribuf (
  input  en,
  input  a,
  output y
);

  // TODO: en 为 1 时 y=a；为 0 时 y=z

endmodule`,
          testbench: `module tb;
  reg en, a;
  wire y;
  tribuf dut (.en(en), .a(a), .y(y));

  reg [31:0] pass = 0;
  initial begin
    en = 0; a = 0; #10;
    if (y === 1'bz) pass = pass + 1; else $display("FAIL en=0 a=0 y=%b", y);
    en = 0; a = 1; #10;
    if (y === 1'bz) pass = pass + 1; else $display("FAIL en=0 a=1 y=%b", y);
    en = 1; a = 0; #10;
    if (y === 1'b0) pass = pass + 1; else $display("FAIL en=1 a=0 y=%b", y);
    en = 1; a = 1; #10;
    if (y === 1'b1) pass = pass + 1; else $display("FAIL en=1 a=1 y=%b", y);

    if (pass == 4) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module tribuf (
  input  en,
  input  a,
  output y
);

  assign y = en ? a : 1'bz;

endmodule`,
          explain: [
            { line: 2, text: '使能端 `en`。' },
            { line: 3, text: '数据输入 `a`。' },
            { line: 7, text: '**三态门**：en=1 时 y 跟随 a；en=0 时输出高阻 `z`，把总线让给别的驱动者。' },
          ],
        },
      ],
      quiz: [
        {
          q: '全加器中，进位 cout 在什么情况下为 1？',
          options: ['a、b 都为 1，或半加和 p 与 cin 都为 1', '只要 a 为 1', '只有 cin 为 1'],
          answer: 0,
          explain: 'cout = g | (p & cin)，即 a、b 直接产生进位，或 p 把 cin 传递上来。',
        },
        {
          q: '在 initial 块里，连续两条 `#10 a=1; #20 a=0;`，a 变 0 的时刻是？',
          options: ['t=20', 't=30', 't=10'],
          answer: 1,
          explain: '# 是相对上一条的累计延迟，10+20=30。',
        },
        {
          q: '三态缓冲器 en=0 时输出什么？',
          options: ['高阻 z', '0', '保持 a 的值'],
          answer: 0,
          explain: 'en=0 时输出 z（高阻），把总线让出，这是总线复用的基础。',
        },
        {
          q: '为什么把复杂电路拆成多个 wire 命名中间结果？',
          options: ['电路结构更清晰、便于推理与复用', '能让仿真更快', '语法上必须这样写'],
          answer: 0,
          explain: '命名中间结果（如 p、g）让电路结构一目了然，避免一个难以理解的大表达式。',
        },
      ],
    },

    // ---------------- 第 03 章 ----------------
    {
      id: '03',
      title: '向量、常量与字面量',
      subtitle: '从 1 根线到一束线',
      blocks: [
        {
          k: 'p',
          t: '一根 wire 只能传 1 位。真实的总线、寄存器、地址都是**向量**（vector）——一束有编号的线。声明时用 `[MSB:LSB]` 指定位宽，编号习惯上下行不拘，但**本教程统一 `[N-1:0]`**（左边是最高位）。',
        },
        {
          k: 'code',
          code: `reg [7:0]  data;    // 8 位向量，data[7] 是最高位，data[0] 是最低位
wire [31:0] addr;    // 32 位
reg  [3:0]  nib;     // 4 位（半字节）

data[3]      = 1'b1;        // 位选择：选 1 位
data[7:4]    = 4'hF;        // 部分选择：选一段
data[5:2]    = nib;          // 部分选择也可以整体赋值`,
        },
        {
          k: 'h2',
          t: '数字怎么写：位宽 + 进制 + 数字',
        },
        {
          k: 'p',
          t: "硬件世界里十进制不总是主角。Verilog 字面量的完整格式是 **`宽度'进制 数值`**，进制有 `b`（二）、`h`（十六）、`d`（十）、`o`（八）：",
        },
        {
          k: 'table',
          head: ['写法', '含义', '值'],
          rows: [
            ["`4'b1010`", '4 位二进制', '10'],
            ["`8'hFF`", '8 位十六进制', '255'],
            ["`6'd42`", '6 位十进制', '42'],
            ["`4'b10x1`", '含未知位 x 的向量', '不确定值'],
            ["`32`", '不写宽度的十进制（至少 32 位）', '42 之外还有陷阱'],
          ],
        },
        {
          k: 'note',
          tone: 'warn',
          title: '截断会悄悄发生',
          t: '`4\'h1F` 超出 4 位范围，高位会被截断成 `4\'hF`。写位宽时要养成「先算需要的宽度」的习惯，本教程的所有练习都会强调这一点。',
        },
        {
          k: 'h2',
          t: '拼接：把几束线捆成一束',
        },
        {
          k: 'p',
          t: '`{}` 拼接运算符把多个信号按**从左到右、从高位到低位**的顺序连成一个新向量，是从零散信号组装总线的关键工具：',
        },
        {
          k: 'code',
          code: `wire [3:0] hi = 4'hA, lo = 4'h5;
wire [7:0] byte0 = {hi, lo};      // 8'hA5 —— hi 在高位

// 部分选择和拼接混用：
byte1 = {hi[1:0], lo, 2'b00};     // {10, 0101, 00} = 8'b10010100`,
        },
        {
          k: 'h2',
          t: 'parameter：编译期常量',
        },
        {
          k: 'p',
          t: '`parameter` 让模块「可配置」。一个参数化的加法器，实例化时改个数字就能变成 8 位或 32 位——写一次，到处复用。实例化时用 `#(.参数名(值))` 覆盖默认值；`localparam` 则不允许外部覆盖，用于模块内部约定。',
        },
        {
          k: 'code',
          label: '参数化的与门阵列',
          code: `module andw #(
  parameter W = 8
) (
  input  [W-1:0] a, b,
  output [W-1:0] y
);
  assign y = a & b;
endmodule

// 使用时：
andw #(.W(16)) u (.a(x16), .b(y16), .z(z16));   // 16 位版本`,
        },
      ],
      exercises: [
        {
          id: '1',
          title: '字节打包器',
          desc: '实现 `packer`：把两个 4 位半字节 `hi`、`lo` 拼成一个 8 位字节 `y = {hi, lo}`（`hi` 在高位）。',
          hints: ['拼接运算符：`{hi, lo}`，左边的在高位。', '`assign y = {hi, lo};`'],
          starter: `module packer (
  input  [3:0] hi,
  input  [3:0] lo,
  output [7:0] y
);

  // TODO: 把 hi、lo 拼成 8 位输出

endmodule`,
          testbench: `module tb;
  reg [3:0] hi, lo;
  wire [7:0] y;
  packer dut (.hi(hi), .lo(lo), .y(y));

  reg [31:0] pass = 0;
  initial begin
    hi = 4'hA; lo = 4'h5; #10;
    if (y === 8'hA5) pass = pass + 1; else $display("FAIL A5 got=%h", y);
    hi = 4'h0; lo = 4'hF; #10;
    if (y === 8'h0F) pass = pass + 1; else $display("FAIL 0F got=%h", y);
    hi = 4'hF; lo = 4'hF; #10;
    if (y === 8'hFF) pass = pass + 1; else $display("FAIL FF got=%h", y);
    hi = 4'h1; lo = 4'h2; #10;
    if (y === 8'h12) pass = pass + 1; else $display("FAIL 12 got=%h", y);

    if (pass == 4) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module packer (
  input  [3:0] hi,
  input  [3:0] lo,
  output [7:0] y
);

  assign y = {hi, lo};

endmodule`,
          explain: [
            { line: 2, text: '`hi` 是 4 位输入（将放在高半字节）。' },
            { line: 3, text: '`lo` 是 4 位输入（将放在低半字节）。' },
            { line: 7, text: '拼接运算符 `{hi, lo}` 把 hi 放在高 4 位、lo 放在低 4 位，合成 8 位；如 hi=A、lo=5 得 `A5`。' },
          ],
        },
        {
          id: '2',
          title: '半字节交换',
          desc: '实现 `nswap`：把 8 位输入 `a` 的高 4 位与低 4 位交换后输出到 `y`。用部分选择 + 拼接完成。',
          hints: ['`a[7:4]` 是高半字节，`a[3:0]` 是低半字节。', '`assign y = {a[3:0], a[7:4]};`'],
          starter: `module nswap (
  input  [7:0] a,
  output [7:0] y
);

  // TODO: 交换 a 的高低半字节

endmodule`,
          testbench: `module tb;
  reg [7:0] a;
  wire [7:0] y;
  nswap dut (.a(a), .y(y));

  reg [31:0] pass = 0;
  initial begin
    a = 8'hAB; #10;
    if (y === 8'hBA) pass = pass + 1; else $display("FAIL AB got=%h", y);
    a = 8'h0F; #10;
    if (y === 8'hF0) pass = pass + 1; else $display("FAIL 0F got=%h", y);
    a = 8'h12; #10;
    if (y === 8'h21) pass = pass + 1; else $display("FAIL 12 got=%h", y);
    a = 8'h00; #10;
    if (y === 8'h00) pass = pass + 1; else $display("FAIL 00 got=%h", y);

    if (pass == 4) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module nswap (
  input  [7:0] a,
  output [7:0] y
);

  assign y = {a[3:0], a[7:4]};

endmodule`,
          explain: [
            { line: 2, text: '8 位输入 `a`。' },
            { line: 6, text: '部分选择取低半字节 `a[3:0]` 放高位、高半字节 `a[7:4]` 放低位，交换高低半字节；如 AB → BA。' },
          ],
        },
        {
          id: '3',
          title: '参数化与门',
          desc: '实现参数化的按位与门 `andw`：位宽由参数 `W`（默认 4）决定，`y = a & b`，对每一位分别相与。测试平台会分别用 `W=4` 和 `W=8` 实例化两个实例来验证。',
          hints: [
            '端口声明用 `[W-1:0]`，实例化时用 `#(.W(宽度))` 覆盖参数。',
            '按位与 `&` 对向量是逐位进行的，直接 `assign y = a & b;` 即可。',
            '两个实例同名模块没问题——它们共享同一个 module 定义。',
          ],
          starter: `module andw #(
  parameter W = 4
) (
  input  [W-1:0] a,
  input  [W-1:0] b,
  output [W-1:0] y
);

  // TODO: y = a 和 b 按位与

endmodule`,
          testbench: `module tb;
  reg  [3:0] a4, b4;
  wire [3:0] y4;
  reg  [7:0] a8, b8;
  wire [7:0] y8;

  andw #(.W(4)) dut4 (.a(a4), .b(b4), .y(y4));
  andw #(.W(8)) dut8 (.a(a8), .b(b8), .y(y8));

  reg [31:0] pass = 0;
  initial begin
    a4 = 4'b1010; b4 = 4'b0110; #10;
    if (y4 === 4'b0010) pass = pass + 1; else $display("FAIL 4b got=%b", y4);
    a4 = 4'b1111; b4 = 4'b1111; #10;
    if (y4 === 4'b1111) pass = pass + 1; else $display("FAIL 4b all got=%b", y4);

    a8 = 8'hF0; b8 = 8'h0F; #10;
    if (y8 === 8'h00) pass = pass + 1; else $display("FAIL 8h got=%h", y8);
    a8 = 8'hFF; b8 = 8'h3C; #10;
    if (y8 === 8'h3C) pass = pass + 1; else $display("FAIL 8h mask got=%h", y8);

    if (pass == 4) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module andw #(
  parameter W = 4
) (
  input  [W-1:0] a,
  input  [W-1:0] b,
  output [W-1:0] y
);

  assign y = a & b;

endmodule`,
          explain: [
            { line: 1, text: '`#(...)` 声明参数列表。' },
            { line: 2, text: '参数 `W` 默认 4，实例化时可用 `#(.W(8))` 覆盖。' },
            { line: 4, text: '端口位宽 `[W-1:0]` 随参数变化，一套代码适配任意位宽。' },
            { line: 9, text: '按位与 `&` 对向量逐位进行，一行即可处理所有位。' },
          ],
        },
      ],
      quiz: [
        {
          q: '拼接 {hi, lo} 中，哪个在高位？',
          options: ['hi（左边）', 'lo（右边）', '随机'],
          answer: 0,
          explain: '拼接结果中，左边的表达式占据高位，如 {4\'hA,4\'h5}=8\'hA5。',
        },
        {
          q: 'Verilog 向量默认（本教程）的编号方向是？',
          options: ['[N-1:0]，左边是最高位', '[0:N-1]，右边是最高位', '没有编号'],
          answer: 0,
          explain: '本教程统一 [N-1:0]，data[0] 是最低位、data[N-1] 是最高位。',
        },
        {
          q: '参数化模块的主要好处是？',
          options: ['一套代码通过参数适配不同位宽/规模', '让代码更短', '语法更简单'],
          answer: 0,
          explain: 'parameter 让模块可复用，如一个参数化与门可同时用于 4 位和 8 位。',
        },
        {
          q: '8\'hA5 中，高半字节和低半字节分别是？',
          options: ['A 和 5', '5 和 A', 'A5 和 0'],
          answer: 0,
          explain: '十六进制每位对应 4 位，A 在高 4 位、5 在低 4 位。',
        },
      ],
    },

    // ---------------- 第 04 章 ----------------
    {
      id: '04',
      title: '运算符全家桶',
      subtitle: '算术、逻辑、缩位与移位',
      blocks: [
        {
          k: 'p',
          t: 'Verilog 的运算符和 C 很像，但有两点本质不同：**按位运算作用于向量的每一位**，而**缩位运算把一整个向量压缩成一位**。混淆这两者是最常见的 bug 来源之一。',
        },
        {
          k: 'table',
          head: ['类别', '运算符', '说明'],
          rows: [
            ['算术', '`+  -  *  /  %`', '无符号运算（本教程子集）'],
            ['按位', '`&  |  ^  ~`', '逐位运算，位宽取两侧较宽者'],
            ['逻辑', '`&&  ||  !`', '整体看待，非零即真，结果 1 位'],
            ['缩位', '`&a  |a  ^a  ~&a`', '把所有位折叠成 1 位，如 `^d` 是奇偶校验'],
            ['移位', '`<<  >>`', '逻辑移位，右移补 0'],
            ['比较', '`==  !=  <  <=  >  >=`', '结果 1 位；`===` 逐位比较含 x/z'],
            ['条件', '`cond ? a : b`', '三目选择，组合逻辑版 if'],
          ],
        },
        {
          k: 'h2',
          t: '按位 vs 逻辑 vs 缩位',
        },
        {
          k: 'code',
          code: `reg [3:0] x = 4'b1010, y = 4'b0110;

x & y    // 4'b0010  —— 按位与，还是 4 位
x && y   // 1'b1      —— 逻辑与：两个都非零
&x       // 1'b0      —— 缩位与：所有位都为 1 才是 1
^x       // 1'b1      —— 缩位异或：1 的个数为奇数 → 奇校验`,
        },
        {
          k: 'note',
          tone: 'warn',
          title: '`==` 的坑：遇到 x 就躺平',
          t: "`a == b` 只要任一边含 x/z，结果就是 x（既不是真也不是假）。要**逐位**比较（x 和 x 也算相等）必须用 `===` / `!==`。测试平台里判断「未知态」时永远用 `===`。",
        },
        {
          k: 'h2',
          t: '位宽规则：结果装不下会怎样',
        },
        {
          k: 'p',
          t: '两个 8 位数相加，结果最宽仍是 8 位——**第 8 位的进位会静悄悄地丢掉**。想保住进位，要把操作数显式拓宽：`{1\'b0, a} + {1\'b0, b}` 得到 9 位和。这是写出正确运算电路的第一要诀。',
        },
        {
          k: 'code',
          code: `wire [7:0] a = 8'hFF, b = 8'h01;

wire [7:0] s8  = a + b;                       // 8'h00 —— 进位丢了！
wire [8:0] s9  = {1'b0, a} + {1'b0, b};        // 9'h100 —— 正确
wire       c   = s9[8];                        // 进位位`,
        },
        {
          k: 'h2',
          t: '移位：左乘右除',
        },
        {
          k: 'p',
          t: '`a << 1` 相当于 a×2，`a >> 2` 相当于 a÷4。移位次数可以是变量，这让「桶形移位器」一类的电路写起来非常自然。',
        },
      ],
      exercises: [
        {
          id: '1',
          title: '带进位的 8 位加法器',
          desc: '实现 8 位加法器 `adder8`：输出 8 位和 `s` 与进位 `cout`。当 `a + b` 超过 255 时 `cout` 为 1。**注意**：必须显式拓宽操作数到 9 位再相加，否则进位会丢失。',
          hints: [
            '`{1\'b0, a}` 把 8 位数变成 9 位（高位补 0）。',
            '`assign {cout, s} = {1\'b0, a} + {1\'b0, b};` —— 拼接的左侧一共 9 位，正好接住 9 位加法结果。',
          ],
          starter: `module adder8 (
  input  [7:0] a,
  input  [7:0] b,
  output [7:0] s,
  output       cout
);

  // TODO: 9 位加法，把结果拆成 cout 和 s

endmodule`,
          testbench: `module tb;
  reg [7:0] a, b;
  wire [7:0] s;
  wire cout;
  adder8 dut (.a(a), .b(b), .s(s), .cout(cout));

  reg [31:0] pass = 0;
  initial begin
    a = 8'd12;  b = 8'd34;  #10;
    if ({cout, s} === 9'd46) pass = pass + 1; else $display("FAIL 12+34 c=%b s=%d", cout, s);
    a = 8'hFF;  b = 8'h01;  #10;
    if ({cout, s} === 9'd256) pass = pass + 1; else $display("FAIL FF+01 c=%b s=%h", cout, s);
    a = 8'h7F;  b = 8'h01;  #10;
    if ({cout, s} === 9'd128) pass = pass + 1; else $display("FAIL 7F+01 c=%b s=%h", cout, s);
    a = 8'd200; b = 8'd100; #10;
    if ({cout, s} === 9'd300) pass = pass + 1; else $display("FAIL 200+100 c=%b s=%d", cout, s);

    if (pass == 4) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module adder8 (
  input  [7:0] a,
  input  [7:0] b,
  output [7:0] s,
  output       cout
);

  assign {cout, s} = {1'b0, a} + {1'b0, b};

endmodule`,
          explain: [
            { line: 2, text: '8 位输入 `a`。' },
            { line: 3, text: '8 位输入 `b`。' },
            { line: 4, text: '8 位和 `s`。' },
            { line: 5, text: '进位 `cout`。' },
            { line: 8, text: '**关键**：用 `{1\'b0, a}` 把操作数拓宽到 9 位再相加，结果 9 位；左边 `{cout, s}` 正好接住，最高位是进位。若不拓宽，加法按 8 位截断、进位丢失。' },
          ],
        },
        {
          id: '2',
          title: '移位器',
          desc: '实现 4 位逻辑右移器 `shifter`：`y = a >> amt`，`amt` 是 2 位移位量（0–3）。右移高位补 0，移出位丢弃。',
          hints: ['移位量可以是变量：`a >> amt`。', '右移补 0 是逻辑移位的定义，`>>` 本身就够。'],
          starter: `module shifter (
  input  [3:0] a,
  input  [1:0] amt,
  output [3:0] y
);

  // TODO: y = a 右移 amt 位

endmodule`,
          testbench: `module tb;
  reg [3:0] a;
  reg [1:0] amt;
  wire [3:0] y;
  shifter dut (.a(a), .amt(amt), .y(y));

  reg [31:0] pass = 0;
  initial begin
    a = 4'hF;
    amt = 2'd0; #10;
    if (y === 4'hF) pass = pass + 1; else $display("FAIL F>>0 got=%h", y);
    amt = 2'd1; #10;
    if (y === 4'h7) pass = pass + 1; else $display("FAIL F>>1 got=%h", y);
    amt = 2'd2; #10;
    if (y === 4'h3) pass = pass + 1; else $display("FAIL F>>2 got=%h", y);
    amt = 2'd3; #10;
    if (y === 4'h1) pass = pass + 1; else $display("FAIL F>>3 got=%h", y);

    a = 4'h8;
    amt = 2'd3; #10;
    if (y === 4'h1) pass = pass + 1; else $display("FAIL 8>>3 got=%h", y);
    a = 4'hA;
    amt = 2'd1; #10;
    if (y === 4'h5) pass = pass + 1; else $display("FAIL A>>1 got=%h", y);

    if (pass == 6) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module shifter (
  input  [3:0] a,
  input  [1:0] amt,
  output [3:0] y
);

  assign y = a >> amt;

endmodule`,
          explain: [
            { line: 3, text: '移位量 `amt`（0–3），可以是变量。' },
            { line: 7, text: '右移 amt 位：高位补 0、移出位丢弃。如 F=1111 右移 1 位得 0111。' },
          ],
        },
        {
          id: '3',
          title: '奇偶校验位',
          desc: '实现奇偶发生器 `parity`：输出 `p` 等于 8 位数据 `d` 的**缩位异或** `^d`——即 `d` 中 1 的个数为奇数时 `p=1`。这是串行通信里最经典的检错手段，一行缩位运算就能实现。',
          hints: ['缩位异或写作 `^d`（单个 `^` 后面直接跟向量）。', '先手算 `8\'hA5 = 1010_0101` 里 1 的个数：4 个 → 偶数 → p=0。'],
          starter: `module parity (
  input  [7:0] d,
  output       p
);

  // TODO: p = d 的缩位异或

endmodule`,
          testbench: `module tb;
  reg [7:0] d;
  wire p;
  parity dut (.d(d), .p(p));

  reg [31:0] pass = 0;
  initial begin
    d = 8'h00; #10;
    if (p === 1'b0) pass = pass + 1; else $display("FAIL 00 got=%b", p);
    d = 8'hFF; #10;
    if (p === 1'b0) pass = pass + 1; else $display("FAIL FF got=%b", p);
    d = 8'hA5; #10;
    if (p === 1'b0) pass = pass + 1; else $display("FAIL A5 got=%b", p);
    d = 8'h0F; #10;
    if (p === 1'b0) pass = pass + 1; else $display("FAIL 0F got=%b", p);
    d = 8'h01; #10;
    if (p === 1'b1) pass = pass + 1; else $display("FAIL 01 got=%b", p);
    d = 8'h81; #10;
    if (p === 1'b0) pass = pass + 1; else $display("FAIL 81 got=%b", p);
    d = 8'h03; #10;
    if (p === 1'b0) pass = pass + 1; else $display("FAIL 03 got=%b", p);
    d = 8'h07; #10;
    if (p === 1'b1) pass = pass + 1; else $display("FAIL 07 got=%b", p);

    if (pass == 8) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module parity (
  input  [7:0] d,
  output       p
);

  assign p = ^d;

endmodule`,
          explain: [
            { line: 2, text: '8 位数据 `d`。' },
            { line: 6, text: '**缩位异或** `^d` 把 8 位折叠成 1 位：d 中 1 的个数为奇数时 p=1，偶数时 p=0。如 A5=10100101 有 4 个 1，p=0。' },
          ],
        },
      ],
      quiz: [
        {
          q: '8 位加法器为什么要先把操作数拓宽到 9 位？',
          options: ['否则进位会被按 8 位截断而丢失', '语法强制要求', '能让和变大'],
          answer: 0,
          explain: '8 位相加最多 255+255=510，需要 9 位才能装下进位；{1\'b0,a} 显式拓宽。',
        },
        {
          q: '^d（缩位异或）的结果位宽是？',
          options: ['1 位', '与 d 相同', '8 位'],
          answer: 0,
          explain: '缩位运算把整个向量折叠成 1 位，常用于奇偶校验。',
        },
        {
          q: '4\'b1111 >> 2 的结果是？',
          options: ['0011', '1100', '0111'],
          answer: 0,
          explain: '右移 2 位，高位补 0、低 2 位丢弃：1111 → 0011。',
        },
        {
          q: '按位与 & 和逻辑与 && 的区别是？',
          options: ['& 逐位运算得向量，&& 整体看待得 1 位布尔', '两者完全相同', '&& 逐位，& 整体'],
          answer: 0,
          explain: '如 4\'b1010 & 4\'b1100 = 1000；而 4\'b1010 && 4\'b1100 = 1（非零即真）。',
        },
      ],
    },

    // ---------------- 第 05 章 ----------------
    {
      id: '05',
      title: 'assign：组合逻辑之道',
      subtitle: '数据流建模',
      blocks: [
        {
          k: 'p',
          t: '**组合逻辑**（combinational logic）的输出只取决于当前输入，没有记忆。用 `assign` 描述的电路就是纯组合逻辑：右边表达式里的任何信号变化，左边的 wire 都会立刻重新求值。',
        },
        {
          k: 'code',
          label: 'assign 的本质',
          code: `assign y = a & b | c;   // 不是「执行一次」，而是描述一个持续运算的电路
assign w = ~y;           // 第二个 assign 引用第一个的结果 —— 两级逻辑`,
        },
        {
          k: 'h2',
          t: '条件运算符：assign 里的 if',
        },
        {
          k: 'p',
          t: '`assign` 里不能写 `if`，但有三目条件运算符 `? :`。它是**数据选择器（MUX）**的直接写照——每个分支都是一路输入，条件是选择信号：',
        },
        {
          k: 'code',
          label: '2:1 多路选择器',
          code: `assign y = sel ? b : a;     // sel=1 选 b，否则选 a

// 嵌套可以实现更多路：
assign y = s[1] ? (s[0] ? d : c)
                : (s[0] ? b : a);   // 4:1 MUX`,
        },
        {
          k: 'h2',
          t: '优先级结构：assign 链',
        },
        {
          k: 'p',
          t: '嵌套的条件运算符天然表达**优先级**：最外层的条件最先被判断，最后的是兜底。中断仲裁器、优先编码器这类「谁先来谁先得」的电路，用条件链描述非常自然。',
        },
        {
          k: 'code',
          label: '优先编码器（优先级 3 > 2 > 1 > 0）',
          code: `assign valid = |req;    // 缩位或：有任何一个请求
assign idx   = req[3] ? 2'd3
             : req[2] ? 2'd2
             : req[1] ? 2'd1
             :         2'd0;`,
        },
        {
          k: 'note',
          tone: 'info',
          title: '一个 wire 只能有一个驱动',
          t: '同一个 wire 写两条 `assign` 是多驱动冲突，值会变成 x。想表达「多路来源」必须用 MUX（条件运算符）显式选择，而不是多个 assign。',
        },
        {
          k: 'p',
          t: 'assign（数据流建模）适合简洁的布尔/选择关系；下一章的 `always @(*)` 则适合带过程感的复杂逻辑（case 分支、多步计算）。两者描述的都是组合逻辑，风格可以按需选择。',
        },
      ],
      exercises: [
        {
          id: '1',
          title: '2:1 多路选择器',
          desc: '实现 2:1 选择器 `mux21`：`s=1` 时 `y=b`，否则 `y=a`。测试平台遍历全部 8 种 `(s,a,b)` 组合。',
          hints: ['条件运算符：`s ? b : a`。', '`assign y = s ? b : a;`'],
          starter: `module mux21 (
  input  s,
  input  a,
  input  b,
  output y
);

  // TODO: s=1 时选 b，s=0 时选 a

endmodule`,
          testbench: `module tb;
  reg s, a, b;
  wire y;
  mux21 dut (.s(s), .a(a), .b(b), .y(y));

  reg [31:0] i;
  reg exp;
  reg [31:0] pass = 0;
  initial begin
    for (i = 0; i < 8; i = i + 1) begin
      s = i[2]; a = i[1]; b = i[0];
      #10;
      exp = s ? b : a;
      if (y === exp) pass = pass + 1;
      else $display("FAIL s=%b a=%b b=%b y=%b", s, a, b, y);
    end

    if (pass == 8) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module mux21 (
  input  s,
  input  a,
  input  b,
  output y
);

  assign y = s ? b : a;

endmodule`,
          explain: [
            { line: 2, text: '选择信号 `s`。' },
            { line: 3, text: '数据输入 `a`（s=0 时被选中）。' },
            { line: 4, text: '数据输入 `b`（s=1 时被选中）。' },
            { line: 8, text: '**条件运算符**：s=1 选 b，s=0 选 a；这就是一个二选一多路选择器。' },
          ],
          steps: [
            {
              title: '确定选择逻辑',
              text: 's 为 1 时输出 b，为 0 时输出 a，正好对应三目运算符 `s ? b : a`。',
            },
            {
              title: '用 assign 驱动输出',
              text: '写 `assign y = s ? b : a;`，综合后得到一个 2:1 MUX。',
              code: 'assign y = s ? b : a;',
            },
          ],
          truthTable: {
            caption: '2:1 多路选择器',
            head: ['s', 'a', 'b', 'y'],
            rows: [
              ['0', '0', '0', '0'],
              ['0', '1', '0', '1'],
              ['0', '0', '1', '0'],
              ['0', '1', '1', '1'],
              ['1', '0', '0', '0'],
              ['1', '1', '0', '0'],
              ['1', '0', '1', '1'],
              ['1', '1', '1', '1'],
            ],
          },
          circuit: {
            nodes: [
              { id: 'a', kind: 'in', x: 0, y: 0 },
              { id: 'b', kind: 'in', x: 0, y: 2 },
              { id: 's', kind: 'in', x: 0, y: 4 },
              { id: 'm', kind: 'mux', x: 1, y: 1, inputs: ['a', 'b', 's'] },
              { id: 'y', kind: 'out', x: 2, y: 1, inputs: ['m'] },
            ],
            note: 'MUX 有两个数据输入（a、b）和一个选择端 s，s 决定把哪一路接到输出。',
          },
        },
        {
          id: '2',
          title: '4:1 多路选择器',
          desc: '实现 4:1 选择器 `mux41`：2 位选择信号 `s` 从 `a`/`b`/`c`/`d` 中挑一个送到 `y`（`s=0` 选 `a`，`s=1` 选 `b`，`s=2` 选 `c`，`s=3` 选 `d`）。用嵌套条件运算符实现。',
          hints: [
            '`s[1]` 决定前两路还是后两路，`s[0]` 再细分。',
            '`assign y = s[1] ? (s[0] ? d : c) : (s[0] ? b : a);`',
          ],
          starter: `module mux41 (
  input  [1:0] s,
  input  [3:0] a,
  input  [3:0] b,
  input  [3:0] c,
  input  [3:0] d,
  output [3:0] y
);

  // TODO: 按 s 从四路输入中选择

endmodule`,
          testbench: `module tb;
  reg [1:0] s;
  reg [3:0] a, b, c, d;
  wire [3:0] y;
  mux41 dut (.s(s), .a(a), .b(b), .c(c), .d(d), .y(y));

  reg [31:0] pass = 0;
  initial begin
    a = 4'h1; b = 4'h2; c = 4'h4; d = 4'h8;
    s = 2'd0; #10;
    if (y === 4'h1) pass = pass + 1; else $display("FAIL s=0 got=%h", y);
    s = 2'd1; #10;
    if (y === 4'h2) pass = pass + 1; else $display("FAIL s=1 got=%h", y);
    s = 2'd2; #10;
    if (y === 4'h4) pass = pass + 1; else $display("FAIL s=2 got=%h", y);
    s = 2'd3; #10;
    if (y === 4'h8) pass = pass + 1; else $display("FAIL s=3 got=%h", y);

    a = 4'hF; b = 4'hE; c = 4'hD; d = 4'hC;
    s = 2'd0; #10;
    if (y === 4'hF) pass = pass + 1; else $display("FAIL s=0b got=%h", y);
    s = 2'd3; #10;
    if (y === 4'hC) pass = pass + 1; else $display("FAIL s=3b got=%h", y);

    if (pass == 6) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module mux41 (
  input  [1:0] s,
  input  [3:0] a,
  input  [3:0] b,
  input  [3:0] c,
  input  [3:0] d,
  output [3:0] y
);

  assign y = s[1] ? (s[0] ? d : c) : (s[0] ? b : a);

endmodule`,
          explain: [
            { line: 2, text: '2 位选择信号 `s`。' },
            { line: 10, text: '**嵌套条件**：s[1] 先决定前两路（a,b）还是后两路（c,d），s[0] 再细分；s=0选a、1选b、2选c、3选d。' },
          ],
        },
        {
          id: '3',
          title: '优先编码器',
          desc: '实现 4 位优先编码器 `penc`：输入请求向量 `req`，输出最高位请求的编号 `idx`（`req[3]` 优先级最高），以及 `valid`（有无任何请求）。要求只用 `assign` 与条件运算符。',
          hints: [
            '`valid = |req;`（缩位或）。',
            '`idx` 用条件链：`req[3] ? 3 : req[2] ? 2 : req[1] ? 1 : 0`。',
            '多个请求同时到来时，`idx` 只指向优先级最高的那一位。',
          ],
          starter: `module penc (
  input  [3:0] req,
  output [1:0] idx,
  output       valid
);

  // TODO: valid = 有请求；idx = 最高位请求的编号

endmodule`,
          testbench: `module tb;
  reg [3:0] req;
  wire [1:0] idx;
  wire valid;
  penc dut (.req(req), .idx(idx), .valid(valid));

  reg [31:0] pass = 0;
  initial begin
    req = 4'b0000; #10;
    if (valid === 1'b0 && idx === 2'd0) pass = pass + 1;
    else $display("FAIL 0000 v=%b i=%b", valid, idx);
    req = 4'b0001; #10;
    if (valid === 1'b1 && idx === 2'd0) pass = pass + 1;
    else $display("FAIL 0001 v=%b i=%b", valid, idx);
    req = 4'b0010; #10;
    if (valid === 1'b1 && idx === 2'd1) pass = pass + 1;
    else $display("FAIL 0010 v=%b i=%b", valid, idx);
    req = 4'b0011; #10;
    if (valid === 1'b1 && idx === 2'd1) pass = pass + 1;
    else $display("FAIL 0011 v=%b i=%b", valid, idx);
    req = 4'b0100; #10;
    if (valid === 1'b1 && idx === 2'd2) pass = pass + 1;
    else $display("FAIL 0100 v=%b i=%b", valid, idx);
    req = 4'b0110; #10;
    if (valid === 1'b1 && idx === 2'd2) pass = pass + 1;
    else $display("FAIL 0110 v=%b i=%b", valid, idx);
    req = 4'b1000; #10;
    if (valid === 1'b1 && idx === 2'd3) pass = pass + 1;
    else $display("FAIL 1000 v=%b i=%b", valid, idx);
    req = 4'b1111; #10;
    if (valid === 1'b1 && idx === 2'd3) pass = pass + 1;
    else $display("FAIL 1111 v=%b i=%b", valid, idx);
    req = 4'b1101; #10;
    if (valid === 1'b1 && idx === 2'd3) pass = pass + 1;
    else $display("FAIL 1101 v=%b i=%b", valid, idx);

    if (pass == 9) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module penc (
  input  [3:0] req,
  output [1:0] idx,
  output       valid
);

  assign valid = |req;
  assign idx = req[3] ? 2'd3
            : req[2] ? 2'd2
            : req[1] ? 2'd1
            :         2'd0;

endmodule`,
          explain: [
            { line: 2, text: '请求向量 `req`。' },
            { line: 3, text: '输出请求编号 `idx`。' },
            { line: 4, text: '有效标志 `valid`。' },
            { line: 7, text: '`valid = |req` 缩位或：有任何请求时为 1。' },
            { line: 8, text: '**条件链从最高位 req[3] 开始**：多个请求同时到来时，只指向优先级最高的那一位。' },
          ],
        },
      ],
      quiz: [
        {
          q: '2:1 MUX 的条件表达式 `s ? b : a`，s=0 时输出？',
          options: ['a', 'b', '0'],
          answer: 0,
          explain: '三目运算符冒号前是条件为真，s=0 为假，取 a。',
        },
        {
          q: '4:1 MUX 用 2 位选择信号，最多可选几路？',
          options: ['4 路', '2 路', '8 路'],
          answer: 0,
          explain: 'n 位选择信号可寻址 2^n 路，2 位 = 4 路。',
        },
        {
          q: '优先编码器 req=4\'b0110 时，idx 指向？',
          options: ['2（req[2]）', '1（req[1]）', '3'],
          answer: 0,
          explain: 'req[2]、req[1] 同时为 1，最高位 req[2] 优先，idx=2。',
        },
        {
          q: '组合逻辑电路的输出取决于？',
          options: ['仅当前输入', '历史状态', '时钟'],
          answer: 0,
          explain: '组合逻辑没有记忆，输出只由当前输入决定，assign 描述的就是组合逻辑。',
        },
      ],
    },

    // ---------------- 第 06 章 ----------------
    {
      id: '06',
      title: 'always @(*)',
      subtitle: '行为级描述组合电路',
      blocks: [
        {
          k: 'p',
          t: '`assign` 只能写一个表达式。当逻辑复杂到需要分情况讨论（case）、分步骤计算时，就该请出 **always 块**。用于组合逻辑的 always 块长这样：',
        },
        {
          k: 'code',
          code: `always @(*) begin
  // 过程性的代码：if / case / 顺序计算
  tmp = a ^ b;
  y   = tmp & en;
end`,
        },
        {
          k: 'note',
          tone: 'info',
          title: '@(*) 是什么意思',
          t: "`@(...)` 是敏感列表——信号变化时块才重新执行。手写敏感列表容易漏（漏了就不刷新），所以 IEEE 定义了 `@(*)`：「右边用到的所有信号」，编译器自动推导。组合逻辑永远用 `@(*)`，不用手写列表。",
        },
        {
          k: 'h2',
          t: 'reg 出场了',
        },
        {
          k: 'p',
          t: '在 always 块里被赋值的信号必须声明为 `reg`。再强调一次：**reg 只表示「被过程赋值驱动」，不一定对应寄存器**。`always @(*)` + 阻塞赋值 `=` 综合后就是纯组合逻辑。端口上要写 `output reg [3:0] y;`。',
        },
        {
          k: 'h2',
          t: '阻塞赋值 =',
        },
        {
          k: 'p',
          t: '组合 always 里用 `=`（阻塞赋值）：语句**立即**生效，后面的语句能看到新值——和软件直觉一致。一个块内按顺序执行，最后留下的值就是电路输出。下一章讲时序时会遇到它的孪生兄弟 `<=`。',
        },
        {
          k: 'h2',
          t: 'case：多路分支',
        },
        {
          k: 'code',
          label: '8:1 选择器',
          code: `module mux8 (
  input  [2:0] sel,
  input  [7:0] d,      // 8 路 1 位输入打成包
  output reg    y
);
  always @(*) begin
    case (sel)
      3'd0:    y = d[0];
      3'd1:    y = d[1];
      3'd2:    y = d[2];
      3'd3:    y = d[3];
      3'd4:    y = d[4];
      3'd5:    y = d[5];
      3'd6:    y = d[6];
      default: y = d[7];
    endcase
  end
endmodule`,
        },
        {
          k: 'note',
          tone: 'warn',
          title: 'default 不是可选项',
          t: 'case 不写 `default`（或分支不全）时，未覆盖的输入会让信号「保持原值」——综合器只好造出一个锁存器（latch）。组合逻辑电路里出现锁存器几乎总是 bug，下一章专门讨论。',
        },
      ],
      exercises: [
        {
          id: '1',
          title: 'always 版与门',
          desc: '用 `always @(*)` 重新实现与门：模块 `and2b`，`y = a & b`。体会与 `assign` 版本的差异——输出要声明成 `output reg`。',
          hints: ['`output reg y;`，因为 y 在过程块里赋值。', '块内写 `y = a & b;`（阻塞赋值）。'],
          starter: `module and2b (
  input  a,
  input  b,
  output reg y
);

  always @(*) begin
    // TODO: y = a & b
  end

endmodule`,
          testbench: `module tb;
  reg a, b;
  wire y;
  and2b dut (.a(a), .b(b), .y(y));

  reg [31:0] i;
  reg [31:0] pass = 0;
  initial begin
    for (i = 0; i < 4; i = i + 1) begin
      a = i[1]; b = i[0];
      #10;
      if (y === (a & b)) pass = pass + 1;
      else $display("FAIL a=%b b=%b y=%b", a, b, y);
    end

    if (pass == 4) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module and2b (
  input  a,
  input  b,
  output reg y
);

  always @(*) begin
    y = a & b;
  end

endmodule`,
          explain: [
            { line: 4, text: '输出声明为 `reg`，因为它在 always 块里被赋值（reg 不代表一定是寄存器）。' },
            { line: 7, text: '`always @(*)`：组合逻辑块，输入一变化块就重新执行。' },
            { line: 8, text: '**阻塞赋值** `=` 立即生效，综合后就是与门，和 assign 版电路完全相同。' },
          ],
        },
        {
          id: '2',
          title: 'if/else 版选择器',
          desc: '用 `always @(*)` + `if/else` 实现 2:1 选择器 `mux21b`：`s=1` 选 `b`，`s=0` 选 `a`。与第 05 章的条件运算符版本对比，代码风格不同、电路完全相同。',
          hints: ['块内：`if (s) y = b; else y = a;`', '两条分支都要给 y 赋值，否则会产生锁存器。'],
          starter: `module mux21b (
  input  s,
  input  a,
  input  b,
  output reg y
);

  always @(*) begin
    // TODO: s=1 → y=b，s=0 → y=a
  end

endmodule`,
          testbench: `module tb;
  reg s, a, b;
  wire y;
  mux21b dut (.s(s), .a(a), .b(b), .y(y));

  reg [31:0] i;
  reg exp;
  reg [31:0] pass = 0;
  initial begin
    for (i = 0; i < 8; i = i + 1) begin
      s = i[2]; a = i[1]; b = i[0];
      #10;
      exp = s ? b : a;
      if (y === exp) pass = pass + 1;
      else $display("FAIL s=%b a=%b b=%b y=%b", s, a, b, y);
    end

    if (pass == 8) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module mux21b (
  input  s,
  input  a,
  input  b,
  output reg y
);

  always @(*) begin
    if (s) y = b;
    else   y = a;
  end

endmodule`,
          explain: [
            { line: 9, text: 's 为真时选 b。' },
            { line: 10, text: 'else 分支选 a；**两条分支都必须给 y 赋值**，否则未覆盖的情况会保持原值、综合出锁存器。' },
          ],
        },
        {
          id: '3',
          title: 'case 版 8:1 选择器',
          desc: '用 `case` 实现 8:1 选择器 `mux8`：3 位选择信号 `sel`，从打包的 8 路输入 `d[7:0]` 中选出一位送到 `y`（`sel=k` 时输出 `d[k]`）。',
          hints: [
            '`case (sel)` 里用 `3\'d0`、`3\'d1`… 作标号，`default` 兜底（或者写成 `default: y = d[7];`）。',
            '每条分支都是 `y = d[k];`。',
          ],
          starter: `module mux8 (
  input  [2:0] sel,
  input  [7:0] d,
  output reg   y
);

  always @(*) begin
    // TODO: case (sel) 选出 d 的某一位
  end

endmodule`,
          testbench: `module tb;
  reg [2:0] sel;
  reg [7:0] d;
  wire y;
  mux8 dut (.sel(sel), .d(d), .y(y));

  reg [31:0] i;
  reg [31:0] pass = 0;
  initial begin
    d = 8'b1011_0010;
    for (i = 0; i < 8; i = i + 1) begin
      sel = i;
      #10;
      if (y === d[i]) pass = pass + 1;
      else $display("FAIL sel=%d y=%b", sel, y);
    end

    if (pass == 8) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module mux8 (
  input  [2:0] sel,
  input  [7:0] d,
  output reg   y
);

  always @(*) begin
    case (sel)
      3'd0:    y = d[0];
      3'd1:    y = d[1];
      3'd2:    y = d[2];
      3'd3:    y = d[3];
      3'd4:    y = d[4];
      3'd5:    y = d[5];
      3'd6:    y = d[6];
      default: y = d[7];
    endcase
  end

endmodule`,
          explain: [
            { line: 8, text: '`case (sel)` 按 sel 的值多路分支。' },
            { line: 9, text: 'sel=0 时输出 d[0]，其余分支类似。' },
            { line: 16, text: '`default` 兜底未列出的情况，避免遗漏产生锁存器。' },
          ],
        },
      ],
      quiz: [
        {
          q: '组合逻辑 always 块的敏感列表应该写？',
          options: ['@(*)', '@(a)', '@(posedge clk)'],
          answer: 0,
          explain: '@(*) 自动包含右边用到的所有信号，组合逻辑永远用它，避免漏写导致不刷新。',
        },
        {
          q: '在 always 块里被赋值的信号必须声明为？',
          options: ['reg', 'wire', 'input'],
          answer: 0,
          explain: 'reg 只表示被过程赋值驱动；@(*) + 阻塞赋值仍综合为组合逻辑。',
        },
        {
          q: '组合 always 块里应该用哪种赋值？',
          options: ['阻塞赋值 =', '非阻塞赋值 <=', 'continuous assign'],
          answer: 0,
          explain: '组合逻辑用 =，语句立即生效；非阻塞 <= 留给时序逻辑。',
        },
        {
          q: 'if 语句没有 else、且未给输出赋默认值，会综合出什么？',
          options: ['锁存器', '与门', '纯组合逻辑'],
          answer: 0,
          explain: '输出在某些输入组合下保持原值，综合器会插入锁存器，这通常是 bug。',
        },
      ],
    },

    // ---------------- 第 07 章 ----------------
    {
      id: '07',
      title: '条件语句与锁存器陷阱',
      subtitle: 'if、case 与「不完整的赋值」',
      blocks: [
        {
          k: 'p',
          t: '`if/else` 和 `case` 是行为级建模的主力。但它们在组合 always 块里有一个著名的陷阱：**分支没覆盖到的输入，会让信号保持旧值**——这模拟的是锁存器（latch）行为，而不是你想要的组合逻辑。',
        },
        {
          k: 'h2',
          t: '锁存器是怎么被写出来的',
        },
        {
          k: 'code',
          label: '有 bug 的组合逻辑',
          code: `always @(*) begin
  if (en) y = d;     // en=0 时 y 是多少？——「保持不变」！
end                    // 综合器只能生成锁存器`,
        },
        {
          k: 'code',
          label: '修复：给每个分支都赋值',
          code: `always @(*) begin
  if (en) y = d;
  else    y = 1'b0;  // 或者 y = y 的旧值——但那还是锁存器！
end`,
        },
        {
          k: 'note',
          tone: 'warn',
          title: '三条铁律',
          t: '① 组合 always 的每个分支都要给**所有**输出赋值；② case 必须有 default（或覆盖全部取值）；③ 想要「保持」，就明说——去用时序逻辑（下一站），别靠漏写分支。',
        },
        {
          k: 'h2',
          t: '优先级逻辑 vs 并行逻辑',
        },
        {
          k: 'p',
          t: '`if / else if / else if` 链是**串行判断**：前面的条件先赢。而 `case` 的各分支**互相排斥、地位平等**，更像一层与或阵列。中断仲裁（有先后）用 if 链，操作码译码（无冲突）用 case——按电路本质选语句。',
        },
        {
          k: 'code',
          label: '带优先级的仲裁器',
          code: `always @(*) begin
  if      (req[3]) grant = 4'b1000;   // 3 号最优先
  else if (req[2]) grant = 4'b0100;
  else if (req[1]) grant = 4'b0001;   // ← 故意的吗？1 号居然排第 3
  else if (req[0]) grant = 4'b0001;
  else             grant = 4'b0000;   // 兜底：谁都不给
end`,
        },
        {
          k: 'h2',
          t: '=== 与 !==：逐位比较',
        },
        {
          k: 'p',
          t: "普通 `==` 遇到 x/z 结果是 x，条件既不成立也不不成立。`===`（case equality）逐位比较，`x===x` 为真，`z===z` 为真。测试平台判断三态输出（z）、复位后状态（x）时必须用它。",
        },
      ],
      exercises: [
        {
          id: '1',
          title: '优先级仲裁器',
          desc: '实现 4 位仲裁器 `arb`：输入请求 `req`，输出 one-hot 的授权向量 `grant`，`req[3]` 优先级最高，`req[0]` 最低，无请求时 `grant=0`。要求用 `if/else if` 链（体现优先级）。',
          hints: [
            '4 个分支 + 1 个 else 兜底，每个分支给 grant 赋对应的 one-hot 值。',
            '例如 `else if (req[1]) grant = 4\'b0010;`。',
            '别忘了 else `grant = 4\'b0000;`——没有它就是锁存器。',
          ],
          starter: `module arb (
  input  [3:0] req,
  output reg [3:0] grant
);

  always @(*) begin
    // TODO: if/else if 链，按 req[3] > req[2] > req[1] > req[0] 授权
  end

endmodule`,
          testbench: `module tb;
  reg [3:0] req;
  wire [3:0] grant;
  arb dut (.req(req), .grant(grant));

  reg [31:0] pass = 0;
  initial begin
    req = 4'b0000; #10;
    if (grant === 4'b0000) pass = pass + 1; else $display("FAIL 0000 g=%b", grant);
    req = 4'b0001; #10;
    if (grant === 4'b0001) pass = pass + 1; else $display("FAIL 0001 g=%b", grant);
    req = 4'b0010; #10;
    if (grant === 4'b0010) pass = pass + 1; else $display("FAIL 0010 g=%b", grant);
    req = 4'b0011; #10;
    if (grant === 4'b0010) pass = pass + 1; else $display("FAIL 0011 g=%b", grant);
    req = 4'b0100; #10;
    if (grant === 4'b0100) pass = pass + 1; else $display("FAIL 0100 g=%b", grant);
    req = 4'b0110; #10;
    if (grant === 4'b0100) pass = pass + 1; else $display("FAIL 0110 g=%b", grant);
    req = 4'b1000; #10;
    if (grant === 4'b1000) pass = pass + 1; else $display("FAIL 1000 g=%b", grant);
    req = 4'b1111; #10;
    if (grant === 4'b1000) pass = pass + 1; else $display("FAIL 1111 g=%b", grant);
    req = 4'b1010; #10;
    if (grant === 4'b1000) pass = pass + 1; else $display("FAIL 1010 g=%b", grant);

    if (pass == 9) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module arb (
  input  [3:0] req,
  output reg [3:0] grant
);

  always @(*) begin
    if      (req[3]) grant = 4'b1000;
    else if (req[2]) grant = 4'b0100;
    else if (req[1]) grant = 4'b0010;
    else if (req[0]) grant = 4'b0001;
    else             grant = 4'b0000;
  end

endmodule`,
          explain: [
            { line: 7, text: 'if / else if 链天然体现优先级：先判 req[3]，最高。' },
            { line: 10, text: '依次向下，多请求同时到来时只授权最高优先级位。' },
            { line: 11, text: '**最后的 else 必须有**：无请求时 grant=0；缺了它输出在某些组合下保持原值，综合出锁存器。' },
          ],
        },
        {
          id: '2',
          title: '一位 ALU',
          desc: '用 `case` 实现一位 ALU `alu1`：2 位操作码 `op`，`00` → 与，`01` → 或，`10` → 异或，其他 → `~a`。**必须有 default 分支**——想想为什么。',
          hints: [
            '`case (op)` 四条分支，最后一条是 `default: y = ~a;`。',
            '操作数只有 1 位：`a & b`、`a | b`、`a ^ b`。',
          ],
          starter: `module alu1 (
  input  [1:0] op,
  input        a,
  input        b,
  output reg   y
);

  always @(*) begin
    // TODO: case 实现 4 种操作
  end

endmodule`,
          testbench: `module tb;
  reg [1:0] op;
  reg a, b;
  wire y;
  alu1 dut (.op(op), .a(a), .b(b), .y(y));

  reg [31:0] i;
  reg exp;
  reg [31:0] pass = 0;
  initial begin
    a = 1'b1; b = 1'b0;
    for (i = 0; i < 4; i = i + 1) begin
      op = i;
      #10;
      exp = (i == 0) ? (a & b) : (i == 1) ? (a | b) : (i == 2) ? (a ^ b) : (~a);
      if (y === exp) pass = pass + 1;
      else $display("FAIL op=%b y=%b", op, y);
    end

    a = 1'b0; b = 1'b1;
    for (i = 0; i < 4; i = i + 1) begin
      op = i;
      #10;
      exp = (i == 0) ? (a & b) : (i == 1) ? (a | b) : (i == 2) ? (a ^ b) : (~a);
      if (y === exp) pass = pass + 1;
      else $display("FAIL op=%b y=%b", op, y);
    end

    if (pass == 8) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module alu1 (
  input  [1:0] op,
  input        a,
  input        b,
  output reg   y
);

  always @(*) begin
    case (op)
      2'd0:    y = a & b;
      2'd1:    y = a | b;
      2'd2:    y = a ^ b;
      default: y = ~a;
    endcase
  end

endmodule`,
          explain: [
            { line: 10, text: 'op=00 与、01 或、02 异或。' },
            { line: 13, text: '**default 必须有**：op=11 时 y=~a；否则该组合下 y 未赋值，综合出锁存器。' },
          ],
        },
        {
          id: '3',
          title: '二进制转格雷码',
          desc: '实现组合的 `bin2gray`：`g = b ^ (b >> 1)`，把 4 位二进制 `b` 转成格雷码 `g`。格雷码相邻两个数只有一位不同，是旋转编码器（第 22 章会用到）的数学基础。',
          hints: ['`assign g = b ^ (b >> 1);`，或者放 always 里也行。', '验证示例：`4\'b0010(2)` → `4\'b0011(3)`，`4\'b0111(7)` → `4\'b0100(4)`。'],
          starter: `module bin2gray (
  input  [3:0] b,
  output [3:0] g
);

  // TODO: g = b 异或 (b 右移 1 位)

endmodule`,
          testbench: `module tb;
  reg [3:0] b;
  wire [3:0] g;
  bin2gray dut (.b(b), .g(g));

  reg [31:0] pass = 0;
  initial begin
    b = 4'd0;  #10;
    if (g === 4'd0)  pass = pass + 1; else $display("FAIL 0  g=%b", g);
    b = 4'd1;  #10;
    if (g === 4'd1)  pass = pass + 1; else $display("FAIL 1  g=%b", g);
    b = 4'd2;  #10;
    if (g === 4'd3)  pass = pass + 1; else $display("FAIL 2  g=%b", g);
    b = 4'd3;  #10;
    if (g === 4'd2)  pass = pass + 1; else $display("FAIL 3  g=%b", g);
    b = 4'd4;  #10;
    if (g === 4'd6)  pass = pass + 1; else $display("FAIL 4  g=%b", g);
    b = 4'd7;  #10;
    if (g === 4'd4)  pass = pass + 1; else $display("FAIL 7  g=%b", g);
    b = 4'd8;  #10;
    if (g === 4'd12) pass = pass + 1; else $display("FAIL 8  g=%b", g);
    b = 4'd15; #10;
    if (g === 4'd8) pass = pass + 1; else $display("FAIL 15 g=%b", g);

    if (pass == 8) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module bin2gray (
  input  [3:0] b,
  output [3:0] g
);

  assign g = b ^ (b >> 1);

endmodule`,
          explain: [
            { line: 2, text: '4 位二进制输入 `b`。' },
            { line: 6, text: '`g = b ^ (b>>1)`：每一位与它前一位异或；得到的格雷码相邻两个数仅一位不同，如 2(0010)→3(0011)。' },
          ],
        },
      ],
      quiz: [
        {
          q: '综合出锁存器的根本原因是？',
          options: ['某些输入组合下输出未被赋值、需保持原值', '用了 always 块', '用了 reg'],
          answer: 0,
          explain: '组合逻辑必须在所有输入组合下都给输出赋值；有遗漏就会产生保持原值的锁存器。',
        },
        {
          q: '避免锁存器的常用做法不包括？',
          options: ['去掉所有 reg 声明', 'if 配 else、case 配 default', '块开头给输出赋默认值'],
          answer: 0,
          explain: 'reg 是过程赋值必需的，不能去掉；补全分支或先赋默认值才是防锁存器的方法。',
        },
        {
          q: 'case 里 default 分支的作用是？',
          options: ['覆盖未列出的输入组合，避免锁存器', '让仿真更快', '语法装饰'],
          answer: 0,
          explain: 'default 兜底所有未列举情况，保证输出在任何组合下都被赋值。',
        },
        {
          q: '格雷码最重要的特性是？',
          options: ['相邻数值仅一位不同', '数值更小', '全是 0 和 1'],
          answer: 0,
          explain: '相邻数仅一位翻转，可消除多位同时变化的毛刺，广泛用于旋转编码器和异步 FIFO 指针。',
        },
      ],
    },
  ],
};

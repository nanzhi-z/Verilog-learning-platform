import type { Stage } from './types';

/** Stage 4 — 实际应用挑战（第 23 章起，FPGA 真实应用主题） */
export const apps: Stage = {
  id: 'apps',
  title: '第四站 · 实际应用挑战',
  tagline: '把 Verilog 变成 FPGA 上能解决真实问题的电路',
  desc: '信号发生器、线路编码、数据校验、视频显示、数字滤波——每一章都对应一类 FPGA 真实主流应用。',
  chapters: [
    // ---------------- 第 23 章 ----------------
    {
      id: '23',
      title: '实际应用挑战：DDS 任意波形发生器',
      subtitle: '用相位累加器"算"出任意频率的波形',
      blocks: [
        {
          k: 'p',
          t: '前三站我们一直在"生成"信号：计数器、PWM、分频。这一章把它们升级成 FPGA 里最经典的信号生成技术——**DDS（Direct Digital Synthesis，直接数字频率合成）**。它是几乎所有"需要一个精确可调频率"的场合的标准答案。',
        },
        { k: 'h2', t: 'DDS 在 FPGA 里的真实应用' },
        {
          k: 'ul',
          items: [
            '**函数/任意波形发生器**：实验室里那台能输出正弦波、方波的仪器，核心就是 DDS。',
            '**软件无线电（SDR）**：产生精确的载波频率，做 FM/AM 调制、数字上下变频。',
            '**音频合成器与电子琴**：每个琴键对应一个频率，DDS 同时生成几十个音调。',
            '**雷达线性调频（chirp）**：让频率随时间线性变化，探测目标距离。',
            '**电机/开关电源的频率源**：给出稳定、可调的驱动时钟。',
          ],
        },
        { k: 'h2', t: '心脏：相位累加器' },
        {
          k: 'p',
          t: 'DDS 的核心是一个 **N 位相位累加器**：每个时钟沿把"频率控制字" `fcw` 加到相位上。相位像一个不断绕圈的指针，**它绕一圈的速度就是输出频率**：',
        },
        {
          k: 'code',
          label: '频率控制字与输出频率',
          code: `// 相位累加器位宽 N，时钟 fclk
// 输出频率 fout = fcw * fclk / 2^N
// fcw 越大，相位绕得越快，输出频率越高（频率分辨率 = fclk / 2^N）`,
        },
        {
          k: 'code',
          label: '相位累加器',
          code: `reg [7:0] phase;
always @(posedge clk) begin
  if (rst) phase <= 8'd0;
  else     phase <= phase + fcw;   // 溢出靠 8 位宽度自然回绕
end`,
        },
        { k: 'h2', t: '相位如何变成波形' },
        {
          k: 'p',
          t: '相位是一个 0→255 循环的"指针"。把它映射成不同波形：**锯齿波**直接用相位；**方波**看相位最高位；**三角波**前半段递增、后半段递减（用最高位判断方向，对其余位做乘 2/取反）。',
        },
        {
          k: 'code',
          label: '三种波形的组合映射',
          code: `case (sel)
  2'd0: wave = phase;                                   // 锯齿
  2'd1: wave = phase[7] ? 8'd255 : 8'd0;                 // 方波
  2'd2: wave = phase[7] ? (8'd254 - {phase[6:0],1'b0})  // 三角（下降）
                       : {phase[6:0], 1'b0};             // 三角（上升）
endcase`,
        },
        {
          k: 'note',
          tone: 'info',
          title: '正弦波为什么要"查找表"？',
          t: '正弦无法用简单运算表达，真实 DDS 会把相位高位作为地址，去 ROM 里查预先算好的正弦值（再经 DAC 输出）。本课程仿真器不支持存储器数组，所以用可直接计算的锯齿/方波/三角波——掌握了相位累加器，接上 ROM 就是完整 DDS。',
        },
        {
          k: 'note',
          tone: 'tip',
          title: '案例讲解',
          t: '本章把 DDS 拆成两个模块：先做**相位累加器**（时序，验证它按 fcw 走），再做**波形映射器**（组合，把给定相位翻译成三种波形）。真实工程里这两部分常合成一个模块，分开是为了便于你分别验证。',
        },
      ],
      exercises: [
        {
          id: '1',
          title: '相位累加器',
          desc: '实现 DDS 的相位累加器 `phase_acc`：8 位相位 `phase`，同步复位；每个时钟沿把频率控制字 `fcw` 加到相位上，溢出靠位宽自然回绕。',
          hints: [
            '模块头：`module phase_acc (input clk, rst, input [7:0] fcw, output reg [7:0] phase);`',
            '复位清零，否则 `phase <= phase + fcw;`',
          ],
          starter: `module phase_acc (
  input        clk,
  input        rst,
  input  [7:0] fcw,
  output reg [7:0] phase
);

  // TODO: 同步复位；否则 phase 累加 fcw

endmodule`,
          testbench: `module tb;
  reg clk, rst;
  reg [7:0] fcw;
  wire [7:0] phase;
  phase_acc dut(.clk(clk), .rst(rst), .fcw(fcw), .phase(phase));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  reg [31:0] i;
  initial begin
    clk = 0; rst = 1; fcw = 8'd16;
    @(posedge clk); #1;
    if (phase === 8'd0) pass = pass + 1; else $display("FAIL: reset %0d", phase);
    rst = 0;

    @(posedge clk); #1;
    if (phase === 8'd16) pass = pass + 1; else $display("FAIL: 16 %0d", phase);
    @(posedge clk); #1;
    if (phase === 8'd32) pass = pass + 1; else $display("FAIL: 32 %0d", phase);
    @(posedge clk); #1;
    if (phase === 8'd48) pass = pass + 1; else $display("FAIL: 48 %0d", phase);

    // 大步进测试溢出回绕
    fcw = 8'd200;
    for (i = 0; i < 3; i = i + 1) @(posedge clk);
    #1;
    if (phase === 8'd136) pass = pass + 1; else $display("FAIL: wrap %0d (exp 136)", phase);

    if (pass == 5) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module phase_acc (
  input        clk,
  input        rst,
  input  [7:0] fcw,
  output reg [7:0] phase
);

  always @(posedge clk) begin
    if (rst)
      phase <= 8'd0;
    else
      phase <= phase + fcw;
  end

endmodule`,
          explain: [
            { line: 9, text: '同步复位清零。' },
            { line: 11, text: '每拍累加 fcw，超过 255 靠 8 位宽度截断回绕，这就是"绕圈的相位指针"。' },
          ],
        },
        {
          id: '2',
          title: '波形映射器：锯齿/方波/三角',
          desc: '实现组合波形映射器 `wave_gen`：输入相位 `phase` 和波形选择 `sel`（00 锯齿、01 方波、10 三角），输出 8 位 `wave`。',
          hints: [
            '锯齿：`wave = phase;`；方波：`wave = phase[7] ? 255 : 0;`',
            '三角：`phase[7] ? (254 - {phase[6:0],1\'b0}) : {phase[6:0],1\'b0};`',
          ],
          starter: `module wave_gen (
  input  [7:0] phase,
  input  [1:0] sel,
  output reg [7:0] wave
);

  // TODO: case (sel) 输出锯齿 / 方波 / 三角

endmodule`,
          testbench: `module tb;
  reg [7:0] phase;
  reg [1:0] sel;
  wire [7:0] wave;
  wave_gen dut(.phase(phase), .sel(sel), .wave(wave));

  reg [31:0] pass = 0;
  initial begin
    // 锯齿波
    sel = 2'd0;
    phase = 8'd0;   #1; if (wave === 8'd0)   pass = pass + 1; else $display("FAIL: saw0 %0d", wave);
    phase = 8'd120; #1; if (wave === 8'd120) pass = pass + 1; else $display("FAIL: saw120 %0d", wave);

    // 方波
    sel = 2'd1;
    phase = 8'd64;  #1; if (wave === 8'd0)   pass = pass + 1; else $display("FAIL: sq0 %0d", wave);
    phase = 8'd200; #1; if (wave === 8'd255) pass = pass + 1; else $display("FAIL: sq1 %0d", wave);

    // 三角波
    sel = 2'd2;
    phase = 8'd0;   #1; if (wave === 8'd0)   pass = pass + 1; else $display("FAIL: tri0 %0d", wave);
    phase = 8'd64;  #1; if (wave === 8'd128) pass = pass + 1; else $display("FAIL: tri128 %0d", wave);
    phase = 8'd127; #1; if (wave === 8'd254) pass = pass + 1; else $display("FAIL: tri254 %0d", wave);
    phase = 8'd128; #1; if (wave === 8'd254) pass = pass + 1; else $display("FAIL: tri254b %0d", wave);
    phase = 8'd255; #1; if (wave === 8'd0)   pass = pass + 1; else $display("FAIL: tri0b %0d", wave);

    if (pass == 9) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module wave_gen (
  input  [7:0] phase,
  input  [1:0] sel,
  output reg [7:0] wave
);

  always @(*) begin
    case (sel)
      2'd0: wave = phase;
      2'd1: wave = phase[7] ? 8'd255 : 8'd0;
      2'd2: wave = phase[7] ? (8'd254 - {phase[6:0], 1'b0})
                           : {phase[6:0], 1'b0};
      default: wave = phase;
    endcase
  end

endmodule`,
          explain: [
            { line: 8, text: '锯齿波直接用相位。' },
            { line: 9, text: '方波：相位最高位为 1 输出满幅，否则为 0。' },
            { line: 10, text: '三角波：最高位为 0 时乘 2 上升，为 1 时从 254 减，形成对称三角。' },
          ],
        },
      ],
      quiz: [
        {
          q: 'DDS 输出频率由什么决定？',
          options: ['频率控制字 fcw（fout = fcw·fclk/2^N）', '相位的位宽', '波形选择'],
          answer: 0,
          explain: 'fcw 越大相位累加器绕得越快，输出频率越高；波形选择只改形状不改频率。',
        },
        {
          q: '相位累加器如何实现"绕圈"？',
          options: ['靠 N 位加法的溢出截断，无需额外判断', '用 if 判断归零', '用状态机'],
          answer: 0,
          explain: 'phase + fcw 超过 2^N−1 时，位宽截断自然回到 0。',
        },
        {
          q: '提高相位累加器位宽 N 的直接好处是？',
          options: ['频率分辨率更细（fclk/2^N）', '输出更亮', '时钟更快'],
          answer: 0,
          explain: 'N 越大，fcw 最小变化对应的频率步进越小，频率越精确。',
        },
        {
          q: '真实 DDS 输出正弦波通常需要？',
          options: ['相位查找表 ROM（+ DAC）', '更多加法器', '更高时钟'],
          answer: 0,
          explain: '正弦值预存在 ROM 中，相位高位作地址查表；本课程用可计算波形替代。',
        },
      ],
    },

    // ---------------- 第 24 章 ----------------
    {
      id: '24',
      title: '实际应用挑战：曼彻斯特编码器',
      subtitle: '让每一位数据"自带时钟"',
      blocks: [
        {
          k: 'p',
          t: 'UART 靠约定波特率对齐，收发双方时钟稍有偏差就可能出错。还有一种更可靠的办法：**曼彻斯特编码（Manchester）**——在每个位周期中间强制插入一个跳变，**数据和时钟一起传**，接收方靠跳变就能恢复时钟。',
        },
        { k: 'h2', t: '编码规则：位中间一定有跳变' },
        {
          k: 'p',
          t: '本课程采用 **IEEE 802.3（以太网）约定**：数据 `1` 编码为"低→高"，数据 `0` 编码为"高→低"。注意每一位的中间都有跳变。',
        },
        {
          k: 'code',
          label: '前半位 / 后半位（IEEE 802.3）',
          code: `// 位周期 = 2 个半位时钟
// 数据 1：前半 0、后半 1（低→高）
// 数据 0：前半 1、后半 0（高→低）
// 统一：前半 = ~data，后半 = data`,
        },
        { k: 'h2', t: '曼彻斯特编码在 FPGA 里的真实应用' },
        {
          k: 'ul',
          items: [
            '**以太网（10BASE-T）**：经典曼彻斯特编码，每一位中间都有跳变。',
            '**RFID / NFC 应答器**：卡与读写器之间的基带编码。',
            '**无线收发芯片**：如 nRF、红外遥控的线路编码。',
            '**列车总线与工业控制总线**：需要可靠自同步的场合。',
          ],
        },
        { k: 'h2', t: '为什么要这样编码？' },
        {
          k: 'ul',
          items: [
            '**自同步**：数据流里包含足够的跳变，接收方无需单独时钟线即可恢复节拍。',
            '**无直流分量**：每一位 0 和 1 各占一半，长时间平均电平为 0，便于变压器/交流耦合。',
            '**抗干扰**：只需判断跳变方向，对电平漂移不敏感。',
          ],
        },
        {
          k: 'note',
          tone: 'warn',
          title: '注意：有两种相反的约定',
          t: 'IEEE 802.3 规定 1=低→高；而 G.E. Thomas 约定正好相反（1=高→低）。对接两个系统时务必先确认用的是哪一种，否则解出的数据全反。',
        },
        {
          k: 'note',
          tone: 'tip',
          title: '案例讲解',
          t: '用 2 倍于位速率的时钟（每拍是一个"半位"），加一个 half 标志区分前半/后半：前半输出 ~data、后半输出 data 并右移到下一位。8 位发完拉高 done。',
        },
      ],
      exercises: [
        {
          id: '1',
          title: '曼彻斯特并串编码器',
          desc: '实现曼彻斯特编码器 `manchester`：`clk` 是 2 倍位速率时钟；`load=1` 时装载 8 位 `din` 开始发送。空闲时 `mdata=1`，发送期间按 IEEE 802.3 编码（1=低→高、0=高→低），`busy` 为 1；8 位发完 `done` 拉高一拍。',
          hints: [
            '用 half 标志：half=0 时 `mdata <= ~sh[0]; half<=1;`，half=1 时 `mdata <= sh[0];` 并右移、half<=0。',
            '右移用 `sh <= {1\'b1, sh[7:1]};`，bitcnt 计 0..7。',
            'done 只在最后一位后半拍拉高，其余拍清 0。',
          ],
          starter: `module manchester (
  input        clk,
  input        rst,
  input        load,
  input  [7:0] din,
  output reg   mdata,
  output reg   busy,
  output reg   done
);
  reg [7:0] sh;
  reg [3:0] bitcnt;
  reg       half;

  // TODO: 空闲 mdata=1；load 后按前半 ~data、后半 data 编码并移位

endmodule`,
          testbench: `module tb;
  reg clk, rst, load;
  reg [7:0] din;
  wire mdata, busy, done;
  manchester dut(.clk(clk), .rst(rst), .load(load), .din(din),
                 .mdata(mdata), .busy(busy), .done(done));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  reg [31:0] i;
  initial begin
    clk = 0; rst = 1; load = 0; din = 8'd0;
    repeat (2) @(posedge clk);
    rst = 0;
    @(posedge clk); #1;
    if (mdata === 1'b1 && busy === 1'b0) pass = pass + 1;
    else $display("FAIL: idle mdata=%b busy=%b", mdata, busy);

    din = 8'hA5;
    @(negedge clk); load = 1;
    @(posedge clk); #1; load = 0;   // 识别 load

    for (i = 0; i < 8; i = i + 1) begin
      @(posedge clk); #1;           // 前半位
      if (mdata === ~din[i]) pass = pass + 1;
      else $display("FAIL: bit%0d first mdata=%b exp%b", i, mdata, ~din[i]);
      @(posedge clk); #1;           // 后半位
      if (mdata === din[i]) pass = pass + 1;
      else $display("FAIL: bit%0d second mdata=%b exp%b", i, mdata, din[i]);
    end

    if (done === 1'b1) pass = pass + 1; else $display("FAIL: done=%b", done);
    @(posedge clk); #1;
    if (busy === 1'b0 && mdata === 1'b1) pass = pass + 1;
    else $display("FAIL: back idle busy=%b mdata=%b", busy, mdata);

    if (pass == 19) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module manchester (
  input        clk,
  input        rst,
  input        load,
  input  [7:0] din,
  output reg   mdata,
  output reg   busy,
  output reg   done
);
  reg [7:0] sh;
  reg [3:0] bitcnt;
  reg       half;

  always @(posedge clk) begin
    if (rst) begin
      mdata <= 1'b1; busy <= 1'b0; done <= 1'b0;
      sh <= 8'd0; bitcnt <= 4'd0; half <= 1'b0;
    end else begin
      done <= 1'b0;
      if (!busy) begin
        mdata <= 1'b1;
        if (load) begin
          sh <= din; bitcnt <= 4'd0; half <= 1'b0;
          busy <= 1'b1;
        end
      end else if (!half) begin
        mdata <= ~sh[0];
        half  <= 1'b1;
      end else begin
        mdata <= sh[0];
        if (bitcnt == 4'd7) begin
          busy <= 1'b0; done <= 1'b1;
        end else begin
          sh <= {1'b1, sh[7:1]};
          bitcnt <= bitcnt + 4'd1;
          half <= 1'b0;
        end
      end
    end
  end
endmodule`,
          explain: [
            { line: 21, text: '空闲时 mdata 保持 1，等待 load。' },
            { line: 23, text: 'load 时装载数据、复位 half 与 bitcnt，busy 拉高。' },
            { line: 26, text: '前半位输出 ~data，切到后半。' },
            { line: 28, text: '后半位输出 data。' },
            { line: 30, text: '最后一位后半：busy 拉低、done 一拍。' },
            { line: 32, text: '否则右移、推进 bitcnt，准备下一位。' },
          ],
        },
      ],
      quiz: [
        {
          q: '按 IEEE 802.3 约定，数据 1 的曼彻斯特编码是？',
          options: ['低→高（前半0、后半1）', '高→低', '保持高'],
          answer: 0,
          explain: '前半位输出 ~data=0，后半位输出 data=1。',
        },
        {
          q: '曼彻斯特编码最主要的优点是？',
          options: ['自同步（数据流自带时钟）', '占用带宽更小', '电平更高'],
          answer: 0,
          explain: '位中间必有跳变，接收方据此恢复时钟，无需单独时钟线。',
        },
        {
          q: '曼彻斯特编码的直流分量情况是？',
          options: ['无直流分量（每位 0/1 各半）', '直流很大', '取决于数据'],
          answer: 0,
          explain: '每位都由一个 0 和一个 1 组成，长时间平均为 0，便于交流耦合。',
        },
        {
          q: '对接两个曼彻斯特系统时为什么要先确认约定？',
          options: ['IEEE 与 G.E. Thomas 两种约定电平相反', '时钟不同', '位宽不同'],
          answer: 0,
          explain: '两种约定对 1 的编码方向相反，不确认会解出全部相反的数据。',
        },
      ],
    },

    // ---------------- 第 25 章 ----------------
    {
      id: '25',
      title: '实际应用挑战：CRC 数据校验',
      subtitle: '用移位寄存器给数据"盖一个防错章"',
      blocks: [
        {
          k: 'p',
          t: '数据在传输或存储时可能被干扰而出错。**CRC（Cyclic Redundancy Check，循环冗余校验）** 是数字系统里最常用、最可靠的错误检测方法：发送方算一个校验值附在数据后，接收方重算即可发现数据是否被改动。',
        },
        { k: 'h2', t: 'CRC 在 FPGA 里的真实应用' },
        {
          k: 'ul',
          items: [
            '**以太网帧校验**：每个帧末尾带 32 位 CRC-32。',
            '**USB、SATA、SPI Flash**：数据传输与读写的完整性校验。',
            '**无线通信**：蓝牙、Wi-Fi 帧的 CRC 校验。',
            '**压缩与文件格式**：ZIP、PNG 等都含 CRC。',
            '**存储 ECC**：检测并（配合其他算法）纠正存储错误。',
          ],
        },
        { k: 'h2', t: '原理：把数据当成多项式做"模 2 除法"' },
        {
          k: 'p',
          t: '把数据位看成一个二进制多项式的系数，用一个约定的"生成多项式"做除法，**减法在模 2 下就是异或（XOR）**。除完得到的余数就是 CRC。它可以用一个移位寄存器（LFSR）逐位高效实现。',
        },
        {
          k: 'code',
          label: 'CRC-8（多项式 0x07，即 x^8+x^2+x+1）逐位算法',
          code: `// 每来一位 din：
// fb = din ^ crc[7]
// crc = {crc[6:0], 1'b0} ^ (fb ? 8'h07 : 8'h00)`,
        },
        {
          k: 'note',
          tone: 'info',
          title: '为什么接收方算完余数是 0？',
          t: '发送方把 CRC 附在数据后面；接收方对"数据+CRC"整体再做一次除法，因为 CRC 正是这一除法的余数，正常情况下最终余数为 0；非 0 就说明数据被破坏。',
        },
        {
          k: 'note',
          tone: 'tip',
          title: '案例讲解',
          t: '输入一个 8 位字节，内部用移位寄存器逐位（MSB first）计算 CRC-8，8 拍后 done 并输出结果。例如 0x41 的 CRC-8 是 0xC0；把 0x41 和 0xC0 一起再算，余数为 0。',
        },
      ],
      exercises: [
        {
          id: '1',
          title: 'CRC-8 逐位生成器',
          desc: '实现 `crc8`：`start=1` 时装载 8 位 `data` 并开始计算，初始 `crc=0`；用移位寄存器逐位（MSB first）按 CRC-8（多项式 0x07）计算，8 拍后 `done` 拉高一拍，`crc` 输出校验值。',
          hints: [
            '当前位在 `sh[7]`，每拍 `sh <= {sh[6:0], 1\'b0};`。',
            '反馈 `fb = sh[7] ^ crc[7];`，`crc <= {crc[6:0],1\'b0} ^ (fb ? 8\'h07 : 8\'h00);`',
            'bitcnt 0..7，第 8 拍 busy<=0、done<=1。',
          ],
          starter: `module crc8 (
  input        clk,
  input        rst,
  input        start,
  input  [7:0] data,
  output reg [7:0] crc,
  output reg       done
);
  reg [7:0] sh;
  reg [3:0] bitcnt;
  reg       busy;

  // TODO: start 后逐位计算 CRC-8，8 拍后 done

endmodule`,
          testbench: `module tb;
  reg clk, rst, start;
  reg [7:0] data;
  wire [7:0] crc;
  wire done;
  crc8 dut(.clk(clk), .rst(rst), .start(start), .data(data),
           .crc(crc), .done(done));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  reg [31:0] i;
  reg [7:0] exp;
  initial begin
    clk = 0; rst = 1; start = 0; data = 8'd0;
    repeat (2) @(posedge clk);
    rst = 0;

    for (i = 0; i < 4; i = i + 1) begin
      case (i)
        0: begin data = 8'h00; exp = 8'h00; end
        1: begin data = 8'hff; exp = 8'hf3; end
        2: begin data = 8'hab; exp = 8'h58; end
        3: begin data = 8'h31; exp = 8'h97; end
      endcase
      @(negedge clk); start = 1;
      @(posedge clk); #1; start = 0;   // t0
      repeat (8) @(posedge clk);       // t1..t8
      #1;
      if (done === 1'b1) pass = pass + 1;
      else $display("FAIL: vec%0d done", i);
      if (crc === exp) pass = pass + 1;
      else $display("FAIL: vec%0d crc=%h exp %h", i, crc, exp);
    end

    if (pass == 8) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module crc8 (
  input        clk,
  input        rst,
  input        start,
  input  [7:0] data,
  output reg [7:0] crc,
  output reg       done
);
  reg [7:0] sh;
  reg [3:0] bitcnt;
  reg       busy;

  always @(posedge clk) begin
    if (rst) begin
      crc <= 8'd0; done <= 1'b0;
      sh <= 8'd0; bitcnt <= 4'd0; busy <= 1'b0;
    end else begin
      done <= 1'b0;
      if (!busy) begin
        if (start) begin
          sh <= data; bitcnt <= 4'd0;
          crc <= 8'd0; busy <= 1'b1;
        end
      end else begin
        if (sh[7] ^ crc[7])
          crc <= {crc[6:0], 1'b0} ^ 8'h07;
        else
          crc <= {crc[6:0], 1'b0};
        sh <= {sh[6:0], 1'b0};
        if (bitcnt == 4'd7) begin
          busy <= 1'b0; done <= 1'b1;
        end else begin
          bitcnt <= bitcnt + 4'd1;
        end
      end
    end
  end
endmodule`,
          explain: [
            { line: 18, text: 'start 时装载数据、清 CRC 与 bitcnt，开始计算。' },
            { line: 23, text: '反馈位为 1 时，移位后异或生成多项式 0x07。' },
            { line: 25, text: '反馈位为 0 时仅移位。' },
            { line: 27, text: '数据移位寄存器左移，准备下一位。' },
            { line: 28, text: '第 8 拍结束，busy 拉低、done 一拍。' },
          ],
        },
      ],
      quiz: [
        {
          q: 'CRC 计算中的"模 2 减法"等价于？',
          options: ['异或（XOR）', '普通减法', '与（AND）'],
          answer: 0,
          explain: '模 2 下加法和减法都是异或，没有进位/借位。',
        },
        {
          q: 'CRC 最适合用什么硬件结构实现？',
          options: ['移位寄存器（LFSR）+ 异或', '加法器', '乘法器'],
          answer: 0,
          explain: '逐位移位并在反馈位异或生成多项式，是典型的 LFSR。',
        },
        {
          q: '接收方对"数据+CRC"重新计算，正常情况下余数是？',
          options: ['0', '生成多项式', '全 1'],
          answer: 0,
          explain: 'CRC 是这一除法的余数，正确数据整体再除余数为 0。',
        },
        {
          q: '下列哪个协议/格式没有典型使用 CRC？',
          options: ['以太网帧 / USB / ZIP', 'VGA 模拟视频', 'SPI Flash'],
          answer: 1,
          explain: 'VGA 是显示时序，不涉及数据校验；其余均广泛使用 CRC。',
        },
      ],
    },

    // ---------------- 第 26 章 ----------------
    {
      id: '26',
      title: '实际应用挑战：VGA 显示驱动',
      subtitle: '用行/场同步时序"画"出图像',
      blocks: [
        {
          k: 'p',
          t: 'VGA 是 FPGA 最经典的显示输出接口。它没有复杂的协议，**纯粹靠精确的时序**：两个同步信号告诉显示器电子束扫到哪里，RGB 三通道决定当前像素的颜色。掌握它你就能让 FPGA 直接驱动显示器。',
        },
        { k: 'h2', t: 'VGA 在 FPGA 里的真实应用' },
        {
          k: 'ul',
          items: [
            '**CRT/LCD 显示器、投影仪**：直接产生行场同步与像素数据。',
            '**数字示波器/逻辑分析仪屏幕**：把波形实时画到屏幕上。',
            '**复古游戏机、FPGA 小游戏**：经典的 Pong、贪吃蛇等。',
            '**工业 HMI 人机界面**：设备状态、参数显示。',
            '**图像/视频处理的输出端**：把处理结果显示出来。',
          ],
        },
        { k: 'h2', t: '关键：消隐（blanking）时序' },
        {
          k: 'p',
          t: '显示器扫描一行时，并不是整行都在显示：有效显示区之后依次是**前沿（front porch）、同步脉冲（sync）、后沿（back porch）**，这段时间电子束在"回扫"，RGB 必须为黑。场（垂直）方向同理。以 640×480@60Hz 为例：',
        },
        {
          k: 'table',
          head: ['参数', '水平（每行）', '垂直（每场）'],
          rows: [
            ['有效显示区', '640 像素', '480 行'],
            ['前沿 front porch', '16', '10'],
            ['同步脉冲 sync', '96', '2'],
            ['后沿 back porch', '48', '33'],
            ['总数', '800 像素', '525 行'],
          ],
        },
        {
          k: 'code',
          label: '水平/垂直计数器与同步',
          code: `// 行同步低电平区间：656 ~ 751
hsync = (hcnt >= 656 && hcnt < 752) ? 1'b0 : 1'b1;
// 场同步低电平区间：490 ~ 491
vsync = (vcnt >= 490 && vcnt < 492) ? 1'b0 : 1'b1;
// 只有在有效显示区才输出颜色
active = (hcnt < 640 && vcnt < 480);`,
        },
        {
          k: 'note',
          tone: 'info',
          title: '像素时钟',
          t: '640×480@60Hz 需要约 25.175 MHz 像素时钟（800×525×60≈25.175M）。真实 FPGA 用 PLL 从板载晶振产生这个频率；本章用一个 clk 代表像素时钟，专注时序逻辑。',
        },
        {
          k: 'note',
          tone: 'tip',
          title: '案例讲解',
          t: '做两个计数器：hcnt 每拍 0–799 循环，hcnt 到 799 时 vcnt 加 1（0–524 循环）。组合逻辑产生 hsync/vsync 和 active；active 时用 hcnt 高位产生竖彩条，否则输出黑。',
        },
      ],
      exercises: [
        {
          id: '1',
          title: 'VGA 时序发生器与彩条',
          desc: '实现 `vga_driver`：`clk` 为像素时钟，同步复位。`hcnt` 每拍 0–799 循环；`hcnt==799` 时 `vcnt` 加 1（0–524 循环）。`hsync` 在 656–751 为低、`vsync` 在 490–491 为低；`active` 在 hcnt<640 且 vcnt<480 时为 1；有效区用 `hcnt[8:6]` 输出竖彩条，否则黑。',
          hints: [
            'hcnt 计到 799 回 0，否则加 1；vcnt 只在 hcnt==799 时推进。',
            '同步用组合 always：`hsync = (hcnt>=656 && hcnt<752)?0:1;`',
            '非 active 时 `rgb=000`，否则 `rgb = hcnt[8:6];`',
          ],
          starter: `module vga_driver (
  input        clk,
  input        rst,
  output reg       hsync,
  output reg       vsync,
  output reg [9:0] hcnt,
  output reg [9:0] vcnt,
  output reg       active,
  output reg [2:0] rgb
);

  // TODO: hcnt/vcnt 计数器；组合产生 hsync/vsync/active/rgb

endmodule`,
          testbench: `module tb;
  reg clk, rst;
  wire hsync, vsync, active;
  wire [9:0] hcnt, vcnt;
  wire [2:0] rgb;
  vga_driver dut(.clk(clk), .rst(rst), .hsync(hsync), .vsync(vsync),
                 .hcnt(hcnt), .vcnt(vcnt), .active(active), .rgb(rgb));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  initial begin
    clk = 0; rst = 1;
    repeat (2) @(posedge clk);
    #1;
    if (hcnt === 10'd0 && vcnt === 10'd0) pass = pass + 1;
    else $display("FAIL: reset hcnt=%0d vcnt=%0d", hcnt, vcnt);
    if (active === 1'b1 && hsync === 1'b1 && vsync === 1'b1) pass = pass + 1;
    else $display("FAIL: initial active=%b hsync=%b vsync=%b", active, hsync, vsync);
    if (rgb === 3'b000) pass = pass + 1; else $display("FAIL: rgb0 %b", rgb);
    rst = 0;

    repeat (64) @(posedge clk); #1;
    if (hcnt === 10'd64 && rgb === 3'b001) pass = pass + 1;
    else $display("FAIL: h64 hcnt=%0d rgb=%b", hcnt, rgb);

    repeat (64) @(posedge clk); #1;
    if (hcnt === 10'd128 && rgb === 3'b010) pass = pass + 1;
    else $display("FAIL: h128 hcnt=%0d rgb=%b", hcnt, rgb);

    repeat (528) @(posedge clk); #1;   // hcnt=656
    if (hcnt === 10'd656) begin
      if (hsync === 1'b0) pass = pass + 1; else $display("FAIL: hsync low %b", hsync);
      if (active === 1'b0) pass = pass + 1; else $display("FAIL: active off");
    end

    repeat (96) @(posedge clk); #1;    // hcnt=752
    if (hsync === 1'b1) pass = pass + 1; else $display("FAIL: hsync high %b", hsync);

    repeat (48) @(posedge clk); #1;    // 行末回绕
    if (hcnt === 10'd0 && vcnt === 10'd1) pass = pass + 1;
    else $display("FAIL: wrap hcnt=%0d vcnt=%0d", hcnt, vcnt);

    if (pass == 9) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module vga_driver (
  input        clk,
  input        rst,
  output reg       hsync,
  output reg       vsync,
  output reg [9:0] hcnt,
  output reg [9:0] vcnt,
  output reg       active,
  output reg [2:0] rgb
);

  always @(posedge clk) begin
    if (rst)
      hcnt <= 10'd0;
    else if (hcnt == 10'd799)
      hcnt <= 10'd0;
    else
      hcnt <= hcnt + 10'd1;
  end

  always @(posedge clk) begin
    if (rst)
      vcnt <= 10'd0;
    else if (hcnt == 10'd799) begin
      if (vcnt == 10'd524)
        vcnt <= 10'd0;
      else
        vcnt <= vcnt + 10'd1;
    end
  end

  always @(*) begin
    hsync = (hcnt >= 10'd656 && hcnt < 10'd752) ? 1'b0 : 1'b1;
    vsync = (vcnt >= 10'd490 && vcnt < 10'd492) ? 1'b0 : 1'b1;
    active = (hcnt < 10'd640 && vcnt < 10'd480);
    if (!active)
      rgb = 3'b000;
    else
      rgb = hcnt[8:6];
  end
endmodule`,
          explain: [
            { line: 11, text: '水平计数器 0–799 循环。' },
            { line: 20, text: '垂直计数器只在每行结束时推进，0–524 循环。' },
            { line: 30, text: '行同步在 656–751 为低。' },
            { line: 31, text: '场同步在 490–491 为低。' },
            { line: 32, text: 'active 标记有效显示区。' },
            { line: 33, text: '消隐区必须输出黑，否则回扫时出现杂线。' },
            { line: 35, text: '有效区用 hcnt 高位产生竖彩条。' },
          ],
        },
      ],
      quiz: [
        {
          q: 'VGA 一条水平扫描线由哪些部分组成？',
          options: ['有效显示 + 前沿 + 同步 + 后沿', '只有有效显示', '同步 + 显示'],
          answer: 0,
          explain: '消隐区（前沿/同步/后沿）用于电子束回扫，共 800 像素。',
        },
        {
          q: '640×480@60Hz 一行的总像素数是？',
          options: ['800', '640', '525'],
          answer: 0,
          explain: '640+16+96+48=800；525 是每场总行数。',
        },
        {
          q: '在消隐区（非 active）RGB 应该？',
          options: ['输出黑色（0）', '保持上一像素', '白色'],
          answer: 0,
          explain: '回扫期间不显示，必须为黑，否则屏幕出现杂线。',
        },
        {
          q: 'vcnt（垂直计数）何时加 1？',
          options: ['hcnt 计到 799（一行结束）时', '每拍', 'hsync 时'],
          answer: 0,
          explain: '一行扫完才进入下一行，所以 vcnt 在 hcnt==799 时推进。',
        },
      ],
    },

    // ---------------- 第 27 章 ----------------
    {
      id: '27',
      title: '实际应用挑战：FIR 数字滤波器',
      subtitle: '用延迟线和乘加做数字信号处理',
      blocks: [
        {
          k: 'p',
          t: '传感器采进来的信号往往带着噪声。**FIR（Finite Impulse Response，有限脉冲响应）滤波器** 是数字信号处理（DSP）里最基础、应用最广的滤波器：把当前和过去的样本加权求和，就能滤掉不需要的频率成分。',
        },
        { k: 'h2', t: 'FIR 在 FPGA 里的真实应用' },
        {
          k: 'ul',
          items: [
            '**音频降噪与均衡器（EQ）**：滤除嘶嘶声、调节高低音。',
            '**软件无线电（SDR）**：信道选择滤波、数字下变频。',
            '**生物医学信号**：ECG/EEG 去工频干扰与基线漂移。',
            '**数据采集与仪器前端**：抗混叠滤波、平滑测量。',
            '**图像处理**：二维 FIR 做模糊、锐化。',
          ],
        },
        { k: 'h2', t: '结构：抽头延迟线 + 乘加（MAC）' },
        {
          k: 'p',
          t: 'FIR 先用一条**延迟线**保存当前和过去的样本，再对每个样本乘一个系数并求和：',
        },
        {
          k: 'code',
          label: 'FIR 差分方程',
          code: `y[n] = h[0]*x[n] + h[1]*x[n-1] + ... + h[N-1]*x[n-(N-1)]
// N 个抽头 = N 个乘法器 + 加法树；FPGA 用移位寄存器实现延迟线`,
        },
        { k: 'h2', t: '移动平均：最简单的 FIR' },
        {
          k: 'p',
          t: '当所有系数都相等（h = 1/N），FIR 就变成**移动平均**：输出是最近 N 个样本的平均值。它能平滑掉快速抖动，是工业测量里最常用的简单滤波。',
        },
        {
          k: 'code',
          label: '4 抽头移动平均',
          code: `// 延迟线：x1=x[n-1], x2=x[n-2], x3=x[n-3]
sum  <= din + x1 + x2 + x3;
dout <= (din + x1 + x2 + x3) >> 2;   // 除以 4`,
        },
        {
          k: 'note',
          tone: 'info',
          title: '为什么 FIR 重要？',
          t: 'FIR 一定稳定、可实现严格线性相位（各频率延迟一致，不产生相位失真）。代价是相同性能下比 IIR 用更多乘法器，而 FPGA 恰好擅长并行乘加，所以 FIR 是 FPGA 信号处理的主力。',
        },
        {
          k: 'note',
          tone: 'tip',
          title: '案例讲解',
          t: '用三个寄存器 x1/x2/x3 做延迟线，每拍移入新样本；输出最近 4 个样本的和与平均。喂入 100,100,100,100,200,... 可看到平均输出平滑地从 25 逐步爬到 200，体现滤波的平滑与延迟效果。',
        },
      ],
      exercises: [
        {
          id: '1',
          title: '4 抽头移动平均 FIR',
          desc: '实现 `fir4`：同步复位。用寄存器 `x1/x2/x3` 保存过去 3 个样本（每拍 `x1<=din; x2<=x1; x3<=x2;`）。`sum` 输出最近 4 个样本之和，`dout` 输出其右移 2 位（除以 4）的平均值。',
          hints: [
            '延迟线：`x1 <= din; x2 <= x1; x3 <= x2;`',
            '用显式 assign：`wire [9:0] acc; assign acc = {2\'d0,din} + {2\'d0,x1} + {2\'d0,x2} + {2\'d0,x3};`',
            '`sum <= acc; dout <= acc[9:2];`（acc[9:2] 即除以 4）',
          ],
          starter: `module fir4 (
  input        clk,
  input        rst,
  input  [7:0] din,
  output reg [9:0] sum,
  output reg [7:0] dout
);
  reg [7:0] x1, x2, x3;

  // 提示：先把每个样本扩展到 10 位再相加（用显式 assign）
  // wire [9:0] acc;
  // assign acc = {2'd0, din} + {2'd0, x1} + ...;

  // TODO: 延迟线；sum <= acc；dout <= acc[9:2]

endmodule`,
          testbench: `module tb;
  reg clk, rst;
  reg [7:0] din;
  wire [9:0] sum;
  wire [7:0] dout;
  fir4 dut(.clk(clk), .rst(rst), .din(din), .sum(sum), .dout(dout));

  always #5 clk = ~clk;
  reg [31:0] pass = 0;
  reg [31:0] i;
  reg [9:0] esum;
  reg [7:0] eavg;
  initial begin
    clk = 0; rst = 1; din = 8'd0;
    repeat (2) @(posedge clk);
    #1;
    if (sum === 10'd0 && dout === 8'd0) pass = pass + 1;
    else $display("FAIL: reset sum=%0d dout=%0d", sum, dout);
    rst = 0;

    for (i = 0; i < 8; i = i + 1) begin
      if (i < 4) din = 8'd100; else din = 8'd200;
      @(posedge clk); #1;
      case (i)
        0: begin esum = 10'd100; eavg = 8'd25;  end
        1: begin esum = 10'd200; eavg = 8'd50;  end
        2: begin esum = 10'd300; eavg = 8'd75;  end
        3: begin esum = 10'd400; eavg = 8'd100; end
        4: begin esum = 10'd500; eavg = 8'd125; end
        5: begin esum = 10'd600; eavg = 8'd150; end
        6: begin esum = 10'd700; eavg = 8'd175; end
        7: begin esum = 10'd800; eavg = 8'd200; end
      endcase
      if (sum === esum) pass = pass + 1;
      else $display("FAIL: n%0d sum=%0d exp %0d", i, sum, esum);
      if (dout === eavg) pass = pass + 1;
      else $display("FAIL: n%0d avg=%0d exp %0d", i, dout, eavg);
    end

    if (pass == 17) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule`,
          solution: `module fir4 (
  input        clk,
  input        rst,
  input  [7:0] din,
  output reg [9:0] sum,
  output reg [7:0] dout
);
  reg [7:0] x1, x2, x3;

  // 显式把每个 8 位样本扩展到 10 位，避免加法按 8 位截断
  wire [9:0] acc;
  assign acc = {2'd0, din} + {2'd0, x1}
             + {2'd0, x2}  + {2'd0, x3};

  always @(posedge clk) begin
    if (rst) begin
      x1 <= 8'd0; x2 <= 8'd0; x3 <= 8'd0;
      sum <= 10'd0; dout <= 8'd0;
    end else begin
      x1 <= din;
      x2 <= x1;
      x3 <= x2;
      sum  <= acc;
      dout <= acc[9:2];   // 除以 4
    end
  end
endmodule`,
          explain: [
            { line: 13, text: '显式扩展到 10 位再相加，避免 4 个 8 位和被截断。' },
            { line: 18, text: '复位清空延迟线与输出。' },
            { line: 22, text: '延迟线：x1 存上一个样本，x2/x3 依次更旧。' },
            { line: 26, text: 'sum 输出最近 4 个样本之和。' },
            { line: 27, text: '取 acc[9:2] 即除以 4，得到移动平均。' },
          ],
        },
      ],
      quiz: [
        {
          q: 'FIR 滤波器的输出由什么构成？',
          options: ['当前和过去样本的加权求和', '仅当前样本', '过去输出的反馈'],
          answer: 0,
          explain: 'y[n]=Σ h[i]·x[n−i]，只含输入的延迟项，不含输出反馈。',
        },
        {
          q: '4 抽头移动平均 FIR 的系数是？',
          options: ['全部 1/4', '全部 1', '1,2,3,4'],
          answer: 0,
          explain: '等系数即平均，对应除以 4（右移 2 位）。',
        },
        {
          q: '在 FPGA 上实现 FIR 延迟线通常用？',
          options: ['移位寄存器（寄存器级联）', 'RAM 数组', '计数器'],
          answer: 0,
          explain: '样本逐拍后移，形成抽头延迟线；本章用 x1/x2/x3 级联。',
        },
        {
          q: '相比 IIR，FIR 的突出优点是？',
          options: ['绝对稳定、可线性相位', '乘法器更少', '延迟更小'],
          answer: 0,
          explain: 'FIR 无反馈所以一定稳定，且可设计成线性相位，不产生相位失真。',
        },
      ],
    },
  ],
};

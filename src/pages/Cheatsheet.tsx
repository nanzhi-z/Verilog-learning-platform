import { useMemo, useState } from 'react';
import { useTitle } from '../useTitle';

interface CheatItem {
  syntax: string;
  note: string;
}
interface CheatSection {
  title: string;
  items: CheatItem[];
}

const SECTIONS: CheatSection[] = [
  {
    title: '模块结构',
    items: [
      { syntax: 'module name (ports); ... endmodule', note: '定义一个模块（一块电路）' },
      { syntax: 'module m (input a, output y);', note: 'ANSI 风格端口列表（推荐）' },
    ],
  },
  {
    title: '端口与类型',
    items: [
      { syntax: 'input a', note: '1 位输入（默认 wire）' },
      { syntax: 'output y', note: '1 位输出' },
      { syntax: 'output reg q', note: '在 always 中赋值的输出要声明为 reg' },
      { syntax: 'input [7:0] data', note: '8 位输入向量，格式 [MSB:LSB]' },
      { syntax: 'wire [3:0] w', note: '4 位线网，由 assign 驱动' },
      { syntax: 'reg [7:0] cnt', note: '8 位变量，在过程块中赋值' },
    ],
  },
  {
    title: '组合逻辑',
    items: [
      { syntax: 'assign y = a & b;', note: '持续赋值：与门' },
      { syntax: 'assign y = s ? a : b;', note: '三目运算：二选一 MUX' },
      { syntax: 'always @(*) begin ... end', note: '组合逻辑过程块，敏感列表用 *' },
    ],
  },
  {
    title: '时序逻辑',
    items: [
      { syntax: 'always @(posedge clk) q <= d;', note: 'D 触发器；时序用非阻塞赋值 <=' },
      { syntax: 'always @(posedge clk or negedge rst_n)', note: '含异步复位的敏感列表' },
      { syntax: 'q <= rst_n ? d : 0;', note: '复位时清零、否则取 d' },
    ],
  },
  {
    title: '常量与位宽',
    items: [
      { syntax: "4'b1010", note: '4 位二进制 1010' },
      { syntax: "8'h3f", note: '8 位十六进制 3f' },
      { syntax: "12'd100", note: '12 位十进制 100' },
      { syntax: 'parameter N = 8;', note: '可在例化时覆盖的参数' },
      { syntax: 'localparam S0 = 0;', note: '不可覆盖的局部参数' },
    ],
  },
  {
    title: '运算符',
    items: [
      { syntax: '& | ~ ^', note: '按位 与 / 或 / 非 / 异或' },
      { syntax: '&& || !', note: '逻辑 与 / 或 / 非' },
      { syntax: '+ - * / %', note: '算术运算' },
      { syntax: '<< >>', note: '逻辑移位（补 0）' },
      { syntax: '<<< >>>', note: '算术移位（>>> 保留符号位）' },
      { syntax: '== !=', note: '逻辑相等（任一未知则结果为 x）' },
      { syntax: '=== !==', note: 'case 相等（逐位比较 x/z）' },
      { syntax: '{a, b}', note: '位拼接' },
      { syntax: '{n{a}}', note: '把 a 重复 n 次' },
    ],
  },
  {
    title: '过程语句',
    items: [
      { syntax: 'if (cond) ... else ...', note: '条件分支' },
      { syntax: 'case (sel) ... endcase', note: '多分支选择，综合成 MUX' },
      { syntax: 'default: ...', note: 'case 中覆盖其余情况' },
      { syntax: 'for (i=0; i<N; i=i+1)', note: '循环（综合时展开）' },
    ],
  },
  {
    title: '模块例化',
    items: [
      { syntax: 'and2 u1 (.a(x), .b(y), .y(z));', note: '按命名端口连接例化（推荐）' },
    ],
  },
  {
    title: '系统任务',
    items: [
      { syntax: '$display("...", x);', note: '打印，格式 %b %d %h %o %t' },
      { syntax: '$monitor(...);', note: '参数变化时自动打印' },
      { syntax: '$finish;', note: '结束仿真' },
      { syntax: '$time', note: '当前仿真时间' },
      { syntax: '$random', note: '返回随机数' },
    ],
  },
];

export default function Cheatsheet() {
  const [q, setQ] = useState('');
  useTitle('语法速查 · Learn Verilog');

  const filtered = useMemo(() => {
    const key = q.trim().toLowerCase();
    if (!key) return SECTIONS;
    return SECTIONS.map((s) => ({
      ...s,
      items: s.items.filter(
        (it) =>
          it.syntax.toLowerCase().includes(key) || it.note.toLowerCase().includes(key)
      ),
    })).filter((s) => s.items.length > 0);
  }, [q]);

  const total = SECTIONS.reduce((a, s) => a + s.items.length, 0);

  return (
    <main className="container cheatsheet">
      <h1>Verilog 语法速查</h1>
      <p className="nb-sub">共 {total} 条，输入关键字即可快速检索。</p>
      <input
        className="cheat-search"
        type="search"
        placeholder="搜索，如 赋值、移位、posedge、%b…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {filtered.length === 0 && <p className="cheat-empty">没有匹配「{q}」的语法条目。</p>}
      <div className="cheat-grid">
        {filtered.map((s) => (
          <section key={s.title} className="cheat-section">
            <h2>{s.title}</h2>
            {s.items.map((it, i) => (
              <div key={i} className="cheat-item">
                <code className="cheat-syntax mono">{it.syntax}</code>
                <span className="cheat-note">{it.note}</span>
              </div>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}

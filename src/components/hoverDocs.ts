import { hoverTooltip, type EditorView } from '@codemirror/view';

/** Verilog 关键字与系统任务的悬停说明 */
const DOCS: Record<string, string> = {
  module: '模块声明开始：定义一块电路的名称和端口。',
  endmodule: '模块声明结束。',
  input: '输入端口：信号进入电路的入口。',
  output: '输出端口：信号离开电路的出口。',
  inout: '双向端口：既可作输入也可作输出。',
  wire: '线网类型：由 assign 或门持续驱动的连线，默认值为 z。',
  reg: '变量类型：在 always/initial 中被过程赋值，会保持上一次的值。',
  assign: '持续赋值：描述组合逻辑；右边信号一变化，左边立即更新。',
  always: '过程块：描述反复执行的逻辑，@(...) 是敏感列表。',
  initial: '过程块：仿真开始时执行一次，常用于测试台。',
  begin: '顺序语句块开始（类似 C 的 {）。',
  end: '顺序语句块结束（类似 C 的 }）。',
  if: '条件语句，会综合成选择逻辑。',
  else: '条件不成立时执行的分支。',
  case: '多分支选择，会综合成多路选择器。',
  endcase: 'case 语句结束。',
  posedge: '上升沿：信号由 0 跳变为 1。',
  negedge: '下降沿：信号由 1 跳变为 0。',
  parameter: '参数：编译时常量，可在例化时覆盖。',
  localparam: '局部参数：不能被外部覆盖的常量。',
  integer: '整数类型：32 位有符号，常用于循环变量。',
  default: 'case 中未列出的其余情况。',
  $display: '按格式打印一行到控制台（类似 printf）。',
  $write: '打印但不换行。',
  $monitor: '持续监视：参数变化时自动打印。',
  $finish: '结束仿真。',
  $stop: '暂停仿真（交互调试用）。',
  $time: '当前仿真时间（64 位）。',
  $random: '返回一个随机数，测试台常用。',
};

const isWordCh = (c: string | undefined): boolean =>
  c !== undefined && /[A-Za-z0-9_$]/.test(c);

/** 鼠标悬停在 Verilog 关键字/系统任务上时显示说明 */
export const verilogHoverDocs = hoverTooltip((view: EditorView, pos: number, side: -1 | 1) => {
  const line = view.state.doc.lineAt(pos);
  const col = pos - line.from;
  const cur = line.text[col];
  const prev = line.text[col - 1];
  const next = line.text[col];

  let word = '';
  let from = pos;
  let to = pos;

  if (isWordCh(cur)) {
    const left = line.text.slice(0, col).match(/[A-Za-z0-9_$]*$/)?.[0] ?? '';
    const right = line.text.slice(col).match(/^[A-Za-z0-9_$]*/)?.[0] ?? '';
    word = left + right;
    from = pos - left.length;
    to = pos + right.length;
  } else if (side === -1 && isWordCh(prev)) {
    const left = line.text.slice(0, col).match(/[A-Za-z0-9_$]*$/)?.[0] ?? '';
    word = left;
    from = pos - left.length;
    to = pos;
  } else if (side === 1 && isWordCh(next)) {
    const right = line.text.slice(col).match(/^[A-Za-z0-9_$]*/)?.[0] ?? '';
    word = right;
    from = pos;
    to = pos + right.length;
  }

  const key = word.toLowerCase();
  const doc = DOCS[key];
  if (!word || !doc) return null;

  return {
    pos: from,
    end: to,
    create: () => {
      const dom = document.createElement('div');
      dom.className = 'hover-doc';
      const head = document.createElement('div');
      head.className = 'hover-doc-word mono';
      head.textContent = word;
      const body = document.createElement('div');
      body.className = 'hover-doc-text';
      body.textContent = doc;
      dom.appendChild(head);
      dom.appendChild(body);
      return { dom };
    },
  };
});

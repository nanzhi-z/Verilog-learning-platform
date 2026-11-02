import type { Circuit, CircuitNode } from '../content/types';

/**
 * 门级电路可视化：用网格坐标布局，渲染标准门符号与正交走线。
 * 帮助学习者把 Verilog 代码和真实门电路对应起来。
 */

const CELL_W = 120;
const CELL_H = 76;
const GATE_X = 26; // 门输入边相对 cell 左的偏移
const GATE_Y = 18; // 门顶相对 cell 上的偏移（门高 40，中心 y=38）

interface Pt {
  x: number;
  y: number;
}

const cellX = (n: CircuitNode) => n.x * CELL_W;
const cellY = (n: CircuitNode) => n.y * CELL_H;

/** 门左侧第 k 个输入的 y（局部，门高 40） */
function inputYs(n: number): number[] {
  if (n <= 1) return [20];
  if (n === 2) return [12, 28];
  return [8, 20, 32];
}

/** 节点输出锚点（绝对坐标） */
function outPos(n: CircuitNode): Pt {
  const cx = cellX(n);
  const cy = cellY(n);
  switch (n.kind) {
    case 'in':
      return { x: cx + GATE_X, y: cy + 38 };
    case 'and':
    case 'or':
    case 'xor':
      return { x: cx + GATE_X + 40, y: cy + 38 };
    case 'nand':
    case 'nor':
      return { x: cx + GATE_X + 52, y: cy + 38 };
    case 'not':
      return { x: cx + GATE_X + 44, y: cy + 38 };
    case 'dff':
      return { x: cx + GATE_X + 46, y: cy + GATE_Y + 12 };
    case 'mux':
      return { x: cx + GATE_X + 38, y: cy + GATE_Y + 20 };
    case 'add':
      return { x: cx + GATE_X + 44, y: cy + GATE_Y + 20 };
    default:
      return { x: cx + GATE_X, y: cy + 38 };
  }
}

/** 节点第 k 个输入锚点（绝对坐标） */
function inPos(n: CircuitNode, k: number): Pt {
  const cx = cellX(n);
  const cy = cellY(n);
  const gx = cx + GATE_X;
  const gy = cy + GATE_Y;
  switch (n.kind) {
    case 'out':
      return { x: gx, y: cy + 38 };
    case 'dff':
      // inputs[0]=D, inputs[1]=CLK
      return k === 0 ? { x: gx, y: gy + 12 } : { x: gx, y: gy + 32 };
    case 'mux':
      // inputs[0]=数据0, inputs[1]=数据1, inputs[2]=sel
      if (k === 0) return { x: gx, y: gy + 14 };
      if (k === 1) return { x: gx, y: gy + 26 };
      return { x: gx + 20, y: gy + 40 };
    case 'add':
      return k === 0 ? { x: gx, y: gy + 12 } : { x: gx, y: gy + 28 };
    default: {
      const ys = inputYs(n.inputs?.length ?? 1);
      return { x: gx, y: gy + ys[Math.min(k, ys.length - 1)] };
    }
  }
}

/** 正交走线：水平—垂直—水平 */
function wire(a: Pt, b: Pt): string {
  const midX = (a.x + b.x) / 2;
  return `M ${a.x} ${a.y} H ${midX} V ${b.y} H ${b.x}`;
}

/** 门符号（局部坐标，输入边 x=0，门高 40，中心 y=20） */
function GateShape({ n }: { n: CircuitNode }) {
  switch (n.kind) {
    case 'and':
      return <path d="M 0 0 H 20 A 20 20 0 0 1 20 40 H 0 Z" className="gate" />;
    case 'nand':
      return (
        <g className="gate">
          <path d="M 0 0 H 20 A 20 20 0 0 1 20 40 H 0 Z" />
          <circle cx={46} cy={20} r={6} />
        </g>
      );
    case 'or':
      return (
        <path
          d="M 0 0 Q 16 20 0 40 M 0 0 Q 30 2 40 20 Q 30 38 0 40"
          className="gate"
          fill="none"
        />
      );
    case 'nor':
      return (
        <g className="gate" fill="none">
          <path d="M 0 0 Q 16 20 0 40 M 0 0 Q 30 2 40 20 Q 30 38 0 40" />
          <circle cx={46} cy={20} r={6} />
        </g>
      );
    case 'xor':
      return (
        <g className="gate" fill="none">
          <path d="M 0 0 Q 16 20 0 40 M 0 0 Q 30 2 40 20 Q 30 38 0 40" />
          <path d="M -6 0 Q 10 20 -6 40" />
        </g>
      );
    case 'not':
      return (
        <g className="gate">
          <path d="M 0 4 L 32 20 L 0 36 Z" />
          <circle cx={38} cy={20} r={6} />
        </g>
      );
    case 'dff':
      return (
        <g className="gate">
          <rect x={0} y={0} width={46} height={40} rx={2} />
          <text x={7} y={15} className="gate-text">
            D
          </text>
          <text x={33} y={15} className="gate-text">
            Q
          </text>
          <path d="M 0 26 L 8 32 L 0 38" className="gate" fill="none" />
        </g>
      );
    case 'mux':
      return (
        <g className="gate">
          <path d="M 0 6 L 38 0 L 38 40 L 0 34 Z" />
          <text x={10} y={17} className="gate-text">
            0
          </text>
          <text x={10} y={29} className="gate-text">
            1
          </text>
        </g>
      );
    case 'add':
      return (
        <g className="gate">
          <circle cx={20} cy={20} r={20} />
          <text x={20} y={26} textAnchor="middle" className="gate-text">
            +
          </text>
        </g>
      );
    default:
      return null;
  }
}

export default function GateDiagram({ circuit }: { circuit: Circuit }) {
  const nodes = circuit.nodes;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const maxX = Math.max(...nodes.map((n) => n.x)) + 1;
  const maxY = Math.max(...nodes.map((n) => n.y)) + 1;
  const W = maxX * CELL_W + 10;
  const H = maxY * CELL_H + 10;

  // 收集所有连线
  const wires: string[] = [];
  for (const t of nodes) {
    const srcs = t.inputs ?? [];
    srcs.forEach((sid, k) => {
      const s = byId.get(sid);
      if (s) wires.push(wire(outPos(s), inPos(t, k)));
    });
  }

  return (
    <div className="gate-card">
      <div className="tt-title">门级电路示意</div>
      <div className="gate-scroll">
        <svg className="gate-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="门级电路">
          {wires.map((d, i) => (
            <path key={i} d={d} className="gate-wire" fill="none" />
          ))}
          {nodes.map((n) => {
            const cx = cellX(n);
            const cy = cellY(n);
            if (n.kind === 'in') {
              return (
                <g key={n.id}>
                  <text x={cx + GATE_X - 6} y={cy + 42} textAnchor="end" className="gate-pin">
                    {n.label ?? n.id}
                  </text>
                </g>
              );
            }
            if (n.kind === 'out') {
              return (
                <text
                  key={n.id}
                  x={cx + GATE_X + 8}
                  y={cy + 42}
                  className="gate-pin"
                >
                  {n.label ?? n.id}
                </text>
              );
            }
            return (
              <g key={n.id} transform={`translate(${cx + GATE_X}, ${cy + GATE_Y})`}>
                <GateShape n={n} />
              </g>
            );
          })}
        </svg>
      </div>
      {circuit.note && <p className="gate-note">{circuit.note}</p>}
    </div>
  );
}

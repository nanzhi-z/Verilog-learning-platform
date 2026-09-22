import type { Vec, WaveSignal } from '../sim';

/** dark-island SVG waveform viewer (GTKWave-flavoured) */
export default function Waveform({ signals, time }: { signals: WaveSignal[]; time: number }) {
  if (signals.length === 0) return null;

  const tEnd = Math.max(time, 1);
  const rowH = 24;
  const gap = 9;
  const padT = 10;
  const axisH = 22;
  const nameW = Math.min(
    230,
    Math.max(120, ...signals.map((s) => s.name.length * 7.4)) + 26
  );
  const W = 980;
  const padR = 14;
  const plotW = W - nameW - padR;
  const H = padT + signals.length * (rowH + gap) - gap + axisH;
  const x = (t: number) => nameW + (t / tEnd) * plotW;

  // nice tick step: ~4-9 ticks
  const rawStep = tEnd / 7;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(rawStep, 1))));
  const step =
    [1, 2, 5, 10].map((m) => m * mag).find((s) => tEnd / s <= 9) ?? 10 * mag;
  const ticks: number[] = [];
  for (let t = 0; t <= tEnd + 1e-9; t += step) ticks.push(t);

  const hi = (yTop: number) => yTop + 3;
  const lo = (yTop: number) => yTop + rowH - 4;

  return (
    <div className="wave-scroll">
      <svg
        className="wave-svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMinYMin meet"
        role="img"
        aria-label="仿真波形"
      >
        {ticks.map((t, i) => (
          <line key={`g${i}`} x1={x(t)} x2={x(t)} y1={padT - 4} y2={H - axisH} className="wave-grid" />
        ))}
        {signals.map((s, i) => {
          const yTop = padT + i * (rowH + gap);
          const segs: { t0: number; t1: number; v: Vec }[] = [];
          for (let j = 0; j < s.changes.length; j++) {
            const c = s.changes[j];
            const t1 = j + 1 < s.changes.length ? s.changes[j + 1].t : tEnd;
            if (t1 > c.t) segs.push({ t0: c.t, t1, v: c.v });
          }
          let path = '';
          let prevY: number | null = null;
          const vecs: { x0: number; w: number; label: string }[] = [];
          for (const sg of segs) {
            const x0 = x(sg.t0);
            const x1 = x(sg.t1);
            if (s.width === 1) {
              const b = sg.v.bit(0);
              const yy = b === 1 ? hi(yTop) : b === 0 ? lo(yTop) : yTop + rowH / 2;
              if (prevY === null) path += `M ${x0.toFixed(1)} ${yy}`;
              else if (prevY !== yy) path += ` L ${x0.toFixed(1)} ${prevY} L ${x0.toFixed(1)} ${yy}`;
              path += ` L ${x1.toFixed(1)} ${yy}`;
              prevY = yy;
            } else {
              vecs.push({ x0, w: x1 - x0, label: sg.v.toHexString() });
            }
          }
          return (
            <g key={i}>
              <text x={nameW - 8} y={yTop + rowH / 2 + 3.5} className="wave-name">
                {s.name}
              </text>
              {s.width === 1 ? (
                path && <path d={path} className="wave-bit" />
              ) : (
                vecs.map((v, j) => (
                  <g key={j}>
                    <rect
                      x={v.x0 + 0.5}
                      y={yTop + 3}
                      width={Math.max(v.w - 1, 1.5)}
                      height={rowH - 6}
                      rx={2.5}
                      className="wave-vec-bg"
                    />
                    {v.w > 20 && (
                      <text
                        x={v.x0 + v.w / 2}
                        y={yTop + rowH / 2 + 3.5}
                        textAnchor="middle"
                        className="wave-vec-val"
                      >
                        {v.label}
                      </text>
                    )}
                  </g>
                ))
              )}
            </g>
          );
        })}
        {ticks.map((t, i) => (
          <text key={`t${i}`} x={x(t)} y={H - 6} textAnchor="middle" className="wave-tick">
            {t}
          </text>
        ))}
      </svg>
    </div>
  );
}

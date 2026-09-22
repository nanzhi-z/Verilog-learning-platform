import type { ReactNode } from 'react';

/** minimal inline markdown: `code` and **bold** */
const RE = /(`[^`]+`|\*\*[^*]+\*\*)/g;

export function InlineMD({ t }: { t: string }): ReactNode {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  RE.lastIndex = 0;
  while ((m = RE.exec(t)) !== null) {
    if (m.index > last) out.push(t.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('`')) {
      out.push(
        <code key={k++} className="inline-code">
          {tok.slice(1, -1)}
        </code>
      );
    } else {
      out.push(<strong key={k++}>{tok.slice(2, -2)}</strong>);
    }
    last = m.index + tok.length;
  }
  if (last < t.length) out.push(t.slice(last));
  return <>{out}</>;
}

/** strip inline markdown markers (for one-line previews) */
export const plainMD = (t: string): string => t.replace(/`|\*\*/g, '');

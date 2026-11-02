import type { ReactNode } from 'react';
import type { Block } from '../content/types';

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

function Dots() {
  return (
    <span className="dots" aria-hidden>
      <i />
      <i />
      <i />
    </span>
  );
}

/** render one course content block */
export function BlockView({ block }: { block: Block }): ReactNode {
  switch (block.k) {
    case 'p':
      return (
        <p className="read-p">
          <InlineMD t={block.t} />
        </p>
      );
    case 'h2':
      return <h2 className="read-h2">{block.t}</h2>;
    case 'h3':
      return <h3 className="read-h3">{block.t}</h3>;
    case 'code':
      return (
        <div className="codeblock">
          <div className="codeblock-bar">
            <Dots />
            {block.label && <span className="codeblock-label">{block.label}</span>}
          </div>
          <pre>{block.code}</pre>
        </div>
      );
    case 'ul':
      return (
        <ul className="read-ul">
          {block.items.map((it, i) => (
            <li key={i}>
              <InlineMD t={it} />
            </li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol className="read-ol">
          {block.items.map((it, i) => (
            <li key={i}>
              <InlineMD t={it} />
            </li>
          ))}
        </ol>
      );
    case 'note':
      return (
        <div className={`note note-${block.tone}`}>
          <div className="note-title">{block.title}</div>
          <p>
            <InlineMD t={block.t} />
          </p>
        </div>
      );
    case 'table':
      return (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {block.head.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}>
                      <InlineMD t={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
}

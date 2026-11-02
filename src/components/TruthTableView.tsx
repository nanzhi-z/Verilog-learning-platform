import type { TruthTable } from '../content/types';
import { InlineMD } from './md';

/** 预期真值表：做题前先明确「什么输入该得到什么输出」 */
export default function TruthTableView({ table }: { table: TruthTable }) {
  return (
    <div className="tt-card">
      <div className="tt-title">
        预期真值表{table.caption ? ` · ${table.caption}` : ''}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {table.head.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r, i) => (
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
    </div>
  );
}

import type { ExplainLine } from '../content/types';
import { InlineMD } from './md';

/**
 * 参考答案查看器：逐行展示 solution，有讲解的行在下方显示说明条。
 * 解决「看得懂代码、看不懂意图」的问题。
 */
export default function SolutionView({
  solution,
  explain,
}: {
  solution: string;
  explain?: ExplainLine[];
}) {
  const lines = solution.split('\n');
  const map = new Map<number, string>((explain ?? []).map((e) => [e.line, e.text]));

  return (
    <div className="codeblock solution-view">
      <div className="codeblock-bar">
        <span className="dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="codeblock-label">参考答案 · 逐行讲解</span>
      </div>
      <div className="solution-body">
        {lines.map((ln, i) => {
          const lineNo = i + 1;
          const ex = map.get(lineNo);
          return (
            <div key={i} className="sol-line-wrap">
              <div className="sol-line">
                <span className="sol-lineno">{lineNo}</span>
                <pre className="sol-pre">{ln || ' '}</pre>
              </div>
              {ex && (
                <div className="sol-explain">
                  <span className="sol-explain-mark" aria-hidden>
                    ▸
                  </span>
                  <InlineMD t={ex} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

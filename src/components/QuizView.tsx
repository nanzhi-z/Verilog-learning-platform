import { useState } from 'react';
import type { QuizQ } from '../content/types';
import { InlineMD } from './md';

/** 章末自测：单选，即时反馈对错与讲解，全部作答后显示得分 */
export default function QuizView({ quiz }: { quiz: QuizQ[] }) {
  const [picked, setPicked] = useState<(number | null)[]>(quiz.map(() => null));
  const answered = picked.filter((p) => p !== null).length;
  const correct = picked.filter((p, i) => p === quiz[i].answer).length;

  return (
    <div className="quiz-card">
      <div className="tt-title">章末自测 · {quiz.length} 题</div>
      {quiz.map((q, i) => {
        const sel = picked[i];
        return (
          <div key={i} className="quiz-q">
            <div className="quiz-qtext">
              {i + 1}. <InlineMD t={q.q} />
            </div>
            <div className="quiz-opts">
              {q.options.map((o, j) => {
                let cls = 'quiz-opt';
                if (sel !== null) {
                  if (j === q.answer) cls += ' correct';
                  else if (j === sel) cls += ' wrong';
                }
                return (
                  <button
                    key={j}
                    className={cls}
                    disabled={sel !== null}
                    onClick={() => {
                      const next = picked.slice();
                      next[i] = j;
                      setPicked(next);
                    }}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
            {sel !== null && q.explain && (
              <div className="quiz-explain">
                <InlineMD t={q.explain} />
              </div>
            )}
          </div>
        );
      })}
      {answered === quiz.length && (
        <div className="quiz-score">
          得分：{correct} / {quiz.length}
          {correct === quiz.length ? ' · 全部答对，掌握得不错！' : ' · 可回到上文复习对应知识点。'}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import type { GuideStep } from '../content/types';
import { InlineMD } from './md';

/** 分步引导：把综合题拆成多步脚手架，默认折叠，建议逐步展开 */
export default function StepsGuide({ steps }: { steps: GuideStep[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="steps-card">
      <div className="tt-title">分步引导 · 建议逐步展开，不要一次全看</div>
      <div className="steps-list">
        {steps.map((s, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className="step-item">
              <button
                className="step-head"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
              >
                <span className="step-no">第 {i + 1} 步</span>
                <span className="step-title">{s.title}</span>
                <span className="step-caret" aria-hidden>
                  {isOpen ? '−' : '+'}
                </span>
              </button>
              {isOpen && (
                <div className="step-body">
                  <p>
                    <InlineMD t={s.text} />
                  </p>
                  {s.code && (
                    <div className="codeblock">
                      <pre>{s.code}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

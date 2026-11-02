import { useState } from 'react';
import type { Alternative } from '../content/types';
import { InlineMD } from './md';

/** 同一电路的多种写法（如 assign 与 always @(*)），用标签切换对比 */
export default function AlternativesView({ alternatives }: { alternatives: Alternative[] }) {
  const [tab, setTab] = useState(0);
  const cur = alternatives[tab];

  return (
    <div className="alt-card">
      <div className="tt-title">同一电路的多种写法</div>
      <div className="alt-tabs" role="tablist">
        {alternatives.map((a, i) => (
          <button
            key={i}
            className={`alt-tab${tab === i ? ' active' : ''}`}
            role="tab"
            aria-selected={tab === i}
            onClick={() => setTab(i)}
          >
            {a.label}
          </button>
        ))}
      </div>
      <div className="alt-body">
        <p className="alt-note">
          <InlineMD t={cur.note} />
        </p>
        <div className="codeblock">
          <pre>{cur.code}</pre>
        </div>
      </div>
    </div>
  );
}

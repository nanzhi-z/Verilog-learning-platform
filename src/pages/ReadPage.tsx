import { useEffect } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { chapterIndex, chapterNeighbors, type Block } from '../content';
import { useProgress } from '../progress';
import { InlineMD, plainMD } from '../components/md';

function BlockView({ b }: { b: Block }) {
  switch (b.k) {
    case 'p':
      return (
        <p className="read-p">
          <InlineMD t={b.t} />
        </p>
      );
    case 'h2':
      return (
        <h2 className="read-h2">
          <InlineMD t={b.t} />
        </h2>
      );
    case 'h3':
      return (
        <h3 className="read-h3">
          <InlineMD t={b.t} />
        </h3>
      );
    case 'code':
      return (
        <div className="codeblock">
          <div className="codeblock-bar">
            <span className="dots" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            <span className="codeblock-label">{b.label ?? 'verilog'}</span>
          </div>
          <pre>{b.code}</pre>
        </div>
      );
    case 'ul':
      return (
        <ul className="read-ul">
          {b.items.map((it, i) => (
            <li key={i}>
              <InlineMD t={it} />
            </li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol className="read-ol">
          {b.items.map((it, i) => (
            <li key={i}>
              <InlineMD t={it} />
            </li>
          ))}
        </ol>
      );
    case 'note':
      return (
        <div className={`note note-${b.tone}`}>
          <div className="note-title">{b.title}</div>
          <p>
            <InlineMD t={b.t} />
          </p>
        </div>
      );
    case 'table':
      return (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {b.head.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, i) => (
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
  }
}

export default function ReadPage() {
  const { cid } = useParams();
  const nav = useNavigate();
  const ch = chapterIndex.get(cid ?? '');
  const p = useProgress();
  const { markRead } = p;

  useEffect(() => {
    if (ch && p.chapterUnlocked(ch.id)) markRead(ch.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid]);

  if (!ch) return <Navigate to="/" replace />;

  const { prev, next } = chapterNeighbors(ch.id);
  const unlockedCh = p.chapterUnlocked(ch.id);
  if (!unlockedCh) {
    return (
      <main className="container locked-page">
        <span className="chip">未解锁</span>
        <h1>这一章还没有开放</h1>
        <p>
          按顺序完成第 {prev!.id} 章的全部练习（{prev!.exercises.length} 题）后，本章自动解锁。
        </p>
        <Link className="btn btn-primary" to={`/read/${prev!.id}`}>
          回到第 {prev!.id} 章
        </Link>
      </main>
    );
  }

  const done = ch.exercises.filter((e) => p.isDone(ch.id, e.id)).length;

  return (
    <main className="read-wrap">
      <header className="read-head">
        <div className="read-breadcrumb">
          <Link to="/">课程</Link>
          <span className="crumb-sep">/</span>
          <span>
            第 {ch.id} 章 · {ch.title}
          </span>
        </div>
        <h1>{ch.title}</h1>
        <p className="read-sub">{ch.subtitle}</p>
      </header>

      {ch.blocks.map((b, i) => (
        <BlockView key={i} b={b} />
      ))}

      <section className="read-ex">
        <h2 className="read-h2">
          本章练习 · {done}/{ch.exercises.length} 已完成
        </h2>
        <div className="ex-list">
          {ch.exercises.map((ex, i) => {
            const unlocked = p.unlocked(ch.id, ex.id);
            const isDone = p.isDone(ch.id, ex.id);
            return (
              <div
                key={ex.id}
                role="link"
                tabIndex={unlocked ? 0 : -1}
                onClick={() => unlocked && nav(`/ex/${ch.id}/${ex.id}`)}
                onKeyDown={(e) => {
                  if (unlocked && (e.key === 'Enter' || e.key === ' ')) nav(`/ex/${ch.id}/${ex.id}`);
                }}
                className={`ex-item${unlocked ? '' : ' locked'}`}
              >
                <span className={`ex-status${isDone ? ' ok' : ''}`}>{isDone ? '✓' : i + 1}</span>
                <div className="ex-info">
                  <div className="ex-title">{ex.title}</div>
                  <div className="ex-sub">{plainMD(ex.desc)}</div>
                </div>
                {unlocked ? (
                  <span className="ch-go">{isDone ? '重温 →' : '开始 →'}</span>
                ) : (
                  <span className="ch-lock">先完成上一题</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <nav className="chapter-nav">
        {prev ? (
          <Link to={`/read/${prev.id}`} className="btn btn-ghost">
            ← 第 {prev.id} 章 · {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={`/read/${next.id}`} className="btn btn-primary">
            第 {next.id} 章 · {next.title} →
          </Link>
        )}
      </nav>
    </main>
  );
}

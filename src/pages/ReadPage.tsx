import { Link, Navigate, useParams } from 'react-router-dom';
import type { ReactNode } from 'react';
import { chapterIndex, chapterNeighbors } from '../content';
import { useProgress } from '../progress';
import { useTitle } from '../useTitle';
import { BlockView } from '../components/md';
import QuizView from '../components/QuizView';

export default function ReadPage() {
  const { cid } = useParams();
  const ch = chapterIndex.get(cid ?? '');
  const p = useProgress();
  const { prev, next } = chapterNeighbors(cid ?? '');

  useTitle(ch ? `第 ${ch.id} 章 · ${ch.title}` : undefined);

  if (!ch) return <Navigate to="/" replace />;

  if (!p.chapterUnlocked(ch.id)) {
    return (
      <main className="container locked-page">
        <span className="chip">未解锁</span>
        <h1>第 {ch.id} 章 · {ch.title}</h1>
        <p>完成第 {prev?.id} 章的全部练习后即可解锁本章。</p>
        {prev && (
          <Link className="btn btn-primary" to={`/read/${prev.id}`}>
            去第 {prev.id} 章
          </Link>
        )}
      </main>
    );
  }

  const doneCount = ch.exercises.filter((e) => p.isDone(ch.id, e.id)).length;

  return (
    <main className="container read-page">
      <nav className="read-breadcrumb">
        <Link to="/">首页</Link>
        <span className="crumb-sep">/</span>
        <span>第 {ch.id} 章</span>
      </nav>

      <header className="read-head">
        <span className="ch-num large">{ch.id}</span>
        <h1>{ch.title}</h1>
        <p className="read-subtitle">{ch.subtitle}</p>
        <div className="read-progress">
          <div className="read-progress-bar" style={{ width: `${(doneCount / ch.exercises.length) * 100}%` }} />
        </div>
        <span className="read-progress-label">
          {doneCount} / {ch.exercises.length} 练习完成
        </span>
      </header>

      <article className="read-body">
        {ch.blocks.map((b, i) => (
          <BlockView key={i} block={b} />
        ))}
      </article>

      <section className="read-exercises">
        <h2>本章练习</h2>
        {ch.exercises.map((e, i) => {
          const done = p.isDone(ch.id, e.id);
          const unlocked = p.unlocked(ch.id, e.id);
          const inner: ReactNode = (
            <>
              <div className="ex-item-left">
                <span className="ex-num">{e.id}</span>
                <div>
                  <h3>{e.title}</h3>
                  <p>{e.desc}</p>
                </div>
              </div>
              <span className={`ex-status ${done ? 'done' : ''}`}>
                {done ? '✓ 已完成' : unlocked ? '开始 →' : '🔒'}
              </span>
            </>
          );
          return unlocked ? (
            <Link
              to={`/ex/${ch.id}/${e.id}`}
              className={`ex-item ${done ? 'done' : ''}`}
              key={e.id}
            >
              {inner}
            </Link>
          ) : (
            <div className="ex-item locked" aria-disabled="true" key={e.id}>
              {inner}
            </div>
          );
        })}
      </section>

      {ch.quiz && <QuizView quiz={ch.quiz} />}

      <nav className="chapter-nav">
        {prev ? (
          <Link to={`/read/${prev.id}`} className="btn btn-ghost">
            ← 第 {prev.id} 章
          </Link>
        ) : (
          <Link to="/" className="btn btn-ghost">
            ← 首页
          </Link>
        )}
        {next && (
          <Link to={`/read/${next.id}`} className="btn btn-ghost">
            第 {next.id} 章 →
          </Link>
        )}
      </nav>
    </main>
  );
}

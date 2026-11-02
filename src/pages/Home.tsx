import { Link, useNavigate } from 'react-router-dom';
import { stages, chapters } from '../content';
import { useProgress, totalExercises } from '../progress';
import { useTitle } from '../useTitle';
import type { ReactNode } from 'react';

const totalChapters = chapters.length;

export default function Home() {
  useTitle();
  const p = useProgress();
  const nav = useNavigate();

  // 第一个尚未完成的练习，即「继续学习」的目标
  const nextTarget = (() => {
    for (const ch of chapters) {
      for (const ex of ch.exercises) {
        if (!p.isDone(ch.id, ex.id)) {
          return { url: `/ex/${ch.id}/${ex.id}` };
        }
      }
    }
    return null;
  })();
  const doneCount = p.totalDone;

  return (
    <main className="container home">
      <section className="hero">
        <span className="chip">interactive · 交互式 Verilog 教程</span>
        <h1>Learn Verilog</h1>
        <p className="hero-sub">
          从软件思维到硬件思维：在浏览器里写 Verilog、即时仿真、看波形，
          一步步搭出门级电路、时序逻辑和真实硬件模块。
        </p>
        <div className="hero-actions">
          {nextTarget ? (
            <button className="btn btn-primary" onClick={() => nav(nextTarget.url)}>
              {doneCount === 0 ? '开始学习' : '继续学习'} →
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => nav('/read/00')}>
              从头开始
            </button>
          )}
        </div>
        <div className="hero-meta">
          <span>{totalChapters} 章</span>
          <span>{totalExercises} 道练习</span>
          <span>
            已完成 {doneCount} / {totalExercises}
          </span>
        </div>
      </section>

      <section className="stages">
        {stages.map((s) => {
          const stageDone = s.chapters.filter((c) =>
            c.exercises.every((e) => p.isDone(c.id, e.id))
          ).length;
          return (
            <div className="stage-block" key={s.id}>
              <div className="stage-head">
                <div>
                  <h2>{s.title}</h2>
                  <p className="stage-tagline">{s.tagline}</p>
                </div>
                <span className="stage-count">
                  {stageDone} / {s.chapters.length} 章
                </span>
              </div>
              <p className="stage-desc">{s.desc}</p>
              <div className="ch-grid">
                {s.chapters.map((ch) => {
                  const d = ch.exercises.filter((e) => p.isDone(ch.id, e.id)).length;
                  const unlocked = p.chapterUnlocked(ch.id);
                  const inner: ReactNode = (
                    <>
                      <div className="ch-card-top">
                        <span className="ch-num">{ch.id}</span>
                        {ch.exercises.every((e) => p.isDone(ch.id, e.id)) ? (
                          <span className="ch-done-badge">✓</span>
                        ) : d > 0 ? (
                          <span className="ch-progress">{d}/{ch.exercises.length}</span>
                        ) : null}
                      </div>
                      <h3>{ch.title}</h3>
                      <p className="ch-sub">{ch.subtitle}</p>
                      <span className="ch-count">{ch.exercises.length} 练习</span>
                    </>
                  );
                  return unlocked ? (
                    <Link
                      to={`/read/${ch.id}`}
                      className={`ch-card ${d === ch.exercises.length ? 'done' : ''}`}
                      key={ch.id}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div className="ch-card locked" aria-disabled="true" key={ch.id}>
                      {inner}
                      <span className="lock-label">🔒 完成前一章后解锁</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      <footer className="home-footer">
        <p>
          纯静态站点 · 学习进度保存在浏览器本地 · 源码与文档见 <code>TECHNICAL.md</code>
        </p>
      </footer>
    </main>
  );
}

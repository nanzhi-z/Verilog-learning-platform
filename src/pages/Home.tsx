import { useNavigate } from 'react-router-dom';
import { chapters, stages } from '../content';
import { useProgress, totalExercises } from '../progress';

export default function Home() {
  const p = useProgress();
  const nav = useNavigate();

  const fresh = p.totalDone === 0 && p.read.length === 0;
  const pct = Math.round((p.totalDone / totalExercises) * 100);

  const nextTarget = (): string => {
    for (const ch of chapters) {
      for (const ex of ch.exercises) {
        if (!p.isDone(ch.id, ex.id) && p.unlocked(ch.id, ex.id)) {
          return `/ex/${ch.id}/${ex.id}`;
        }
      }
    }
    return '/read/00';
  };

  return (
    <main>
      <section className="hero">
        <div className="container">
          <span className="chip">交互式 Verilog 教程 · 无需安装任何工具</span>
          <h1>
            在浏览器里
            <br />
            <span className="hero-accent">从零学会 Verilog</span>
          </h1>
          <p className="hero-sub">
            像学编程一样学硬件：{chapters.length} 章课程、{totalExercises} 个在线练习，
            内置仿真器即时运行你的代码——写模块、看波形、点亮每一题。
          </p>
          <div className="hero-cta">
            {fresh ? (
              <button className="btn btn-primary" onClick={() => nav('/read/00')}>
                从第 00 章开始
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => nav(nextTarget())}>
                继续学习
              </button>
            )}
            <button
              className="btn btn-ghost"
              onClick={() => document.getElementById('stages')?.scrollIntoView({ behavior: 'smooth' })}
            >
              查看课程大纲
            </button>
          </div>
          {!fresh && (
            <div className="hero-progress">
              <div className="prog-track">
                <div className="prog-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="prog-label">
                总进度 {p.totalDone} / {totalExercises} 题（{pct}%）· 已读 {p.read.length} 章
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="container stages" id="stages">
        {stages.map((st) => (
          <div className="stage" key={st.id}>
            <div className="stage-head">
              <h2>{st.title}</h2>
              <p>
                {st.tagline} —— {st.desc}
              </p>
            </div>
            <div className="ch-grid">
              {st.chapters.map((ch) => {
                const unlockedCh = p.chapterUnlocked(ch.id);
                const done = ch.exercises.filter((e) => p.isDone(ch.id, e.id)).length;
                const chDone = p.chapterDone(ch.id);
                return (
                  <div
                    key={ch.id}
                    role="link"
                    tabIndex={unlockedCh ? 0 : -1}
                    onClick={() => unlockedCh && nav(`/read/${ch.id}`)}
                    onKeyDown={(e) => {
                      if (unlockedCh && (e.key === 'Enter' || e.key === ' ')) nav(`/read/${ch.id}`);
                    }}
                    className={`ch-card${unlockedCh ? '' : ' locked'}${chDone ? ' done' : ''}`}
                  >
                    <div className="ch-card-top">
                      <span className="ch-num mono">{ch.id}</span>
                      <div className="ch-titles">
                        <h3>{ch.title}</h3>
                        <p>{ch.subtitle}</p>
                      </div>
                      {chDone && <span className="ch-done-dot" title="本章完成" />}
                    </div>
                    <div className="ch-card-foot">
                      {unlockedCh ? (
                        <span className="ch-meta">
                          {p.isRead(ch.id) ? '已读' : '未读'} · {done}/{ch.exercises.length} 题
                        </span>
                      ) : (
                        <span className="ch-lock">完成上一章后解锁</span>
                      )}
                      {unlockedCh && <span className="ch-go">阅读 →</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <p className="stages-foot">
          三站进阶：语法与组合逻辑 → 时序与状态机 → 工程实践。逐章解锁，稳扎稳打。
        </p>
      </section>
    </main>
  );
}

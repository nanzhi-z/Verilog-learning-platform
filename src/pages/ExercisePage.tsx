import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import CodeMirror from '@uiw/react-codemirror';
import { StreamLanguage } from '@codemirror/language';
import { verilog } from '@codemirror/legacy-modes/mode/verilog';
import { chapterIndex, chapterNeighbors } from '../content';
import { useProgress } from '../progress';
import { simulate, type SimResult } from '../sim';
import Waveform from '../components/Waveform';
import { InlineMD } from '../components/md';

const SIM_OPTS = { maxTime: 500_000, budget: 200_000_000 };
const codeKey = (cid: string, eid: string) => `lv-code-${cid}/${eid}`;
const verilogExt = StreamLanguage.define(verilog);

function loadCode(cid: string, eid: string, starter: string): string {
  try {
    return localStorage.getItem(codeKey(cid, eid)) ?? starter;
  } catch {
    return starter;
  }
}

export default function ExercisePage() {
  const { cid, eid } = useParams();
  const ch = chapterIndex.get(cid ?? '');
  const ex = ch?.exercises.find((e) => e.id === eid);
  const p = useProgress();

  const initial = useMemo(
    () => (ch && ex ? loadCode(ch.id, ex.id, ex.starter) : ''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cid, eid]
  );
  const [code, setCode] = useState(initial);
  const [result, setResult] = useState<SimResult | null>(null);
  const [running, setRunning] = useState(false);
  const [showHints, setShowHints] = useState(false);

  if (!ch || !ex) return <Navigate to="/" replace />;

  const isDone = p.isDone(ch.id, ex.id);
  if (!p.unlocked(ch.id, ex.id)) {
    return (
      <main className="container locked-page">
        <span className="chip">未解锁</span>
        <h1>这一题还没有开放</h1>
        <p>按顺序完成本章前面的练习后，自动解锁。</p>
        <Link className="btn btn-primary" to={`/read/${ch.id}`}>
          返回本章
        </Link>
      </main>
    );
  }

  const idx = ch.exercises.findIndex((e) => e.id === ex.id);
  const prevEx = ch.exercises[idx - 1];
  const nextEx = ch.exercises[idx + 1];
  const nextCh = chapterNeighbors(ch.id).next;
  const modName = ex.starter.match(/module\s+(\w+)/)?.[1] ?? 'design';
  const userLines = code.split('\n').length;

  const onCode = (v: string) => {
    setCode(v);
    try {
      localStorage.setItem(codeKey(ch.id, ex.id), v);
    } catch {
      /* ignore */
    }
  };

  const reset = () => {
    setCode(ex.starter);
    setResult(null);
    try {
      localStorage.removeItem(codeKey(ch.id, ex.id));
    } catch {
      /* ignore */
    }
  };

  const run = () => {
    setRunning(true);
    window.setTimeout(() => {
      const r = simulate([code, ex.testbench], SIM_OPTS);
      setResult(r);
      setRunning(false);
      if (r.console.some((l) => l.includes('ALL TESTS PASSED'))) {
        p.complete(ch.id, ex.id);
      }
    }, 30);
  };

  const passed = !!result?.console.some((l) => l.includes('ALL TESTS PASSED'));
  const hasErrors = (result?.errors.length ?? 0) > 0;

  return (
    <main className="ex-wrap">
      <header className="ex-head">
        <div className="read-breadcrumb">
          <Link to={`/read/${ch.id}`}>
            第 {ch.id} 章 · {ch.title}
          </Link>
          <span className="crumb-sep">/</span>
          <span>
            练习 {ex.id}
            {isDone ? ' · 已完成' : ''}
          </span>
        </div>
        <h1>{ex.title}</h1>
        <div className="ex-desc card">
          <InlineMD t={ex.desc} />
          <button className="hint-toggle" onClick={() => setShowHints((v) => !v)}>
            {showHints ? '收起提示' : '需要提示？'}
          </button>
          {showHints && (
            <ul className="hints">
              {ex.hints.map((h, i) => (
                <li key={i}>
                  <InlineMD t={h} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      <div className="editor-card">
        <div className="editor-toolbar">
          <div className="editor-file">
            <span className="dots" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            <span className="mono">
              {modName}.v · 编辑后点「运行仿真」
            </span>
          </div>
          <div className="editor-actions">
            <button className="btn btn-ghost btn-sm" onClick={reset} title="放弃修改，恢复到初始代码">
              恢复初始
            </button>
            <button className="btn btn-run" onClick={run} disabled={running}>
              {running ? '运行中…' : '运行仿真'}
            </button>
          </div>
        </div>
        <div className="ex-editor">
          <CodeMirror
            value={code}
            height="440px"
            theme="dark"
            extensions={[verilogExt]}
            onChange={onCode}
          />
        </div>
      </div>

      {result && (
        <>
          {passed && (
            <div className="verdict ok">
              <span className="verdict-text">
                全部测试通过！
                {!nextEx ? ' 本章练习全部完成。' : ''}
              </span>
              {nextEx ? (
                <Link className="btn btn-primary btn-sm" to={`/ex/${ch.id}/${nextEx.id}`}>
                  下一题 →
                </Link>
              ) : nextCh ? (
                <Link className="btn btn-primary btn-sm" to={`/read/${nextCh.id}`}>
                  进入第 {nextCh.id} 章 →
                </Link>
              ) : (
                <Link className="btn btn-primary btn-sm" to="/">
                  返回首页 →
                </Link>
              )}
            </div>
          )}
          {!passed && hasErrors && (
            <div className="verdict err">
              <span className="verdict-text">仿真出错（{result.errors.length} 个）——按错误提示修复后重新运行</span>
            </div>
          )}
          {!passed && !hasErrors && (
            <div className="verdict fail">
              <span className="verdict-text">未通过——查看控制台中的 FAIL 行，定位出错的用例</span>
            </div>
          )}

          <div className="console-card">
            <div className="panel-title">console · t = {result.time}</div>
            {result.console.length === 0 && !hasErrors && <div className="con-empty">（无输出）</div>}
            <div className="console">
              {result.console.map((l, i) => (
                <div key={i} className={l.includes('FAIL') ? 'con-fail' : undefined}>
                  {l}
                </div>
              ))}
            </div>
            {result.errors.map((e, i) => (
              <div key={i} className="sim-error">
                {e.message}
                {e.line ? `（${e.line <= userLines ? '你的代码' : '测试台'}第 ${e.line} 行）` : ''}
              </div>
            ))}
          </div>

          <div className="wave-card">
            <div className="panel-title">waveform · {result.waveform.length} 信号</div>
            <Waveform signals={result.waveform} time={result.time} />
          </div>
        </>
      )}

      <nav className="chapter-nav">
        {prevEx ? (
          <Link to={`/ex/${ch.id}/${prevEx.id}`} className="btn btn-ghost">
            ← 上一题
          </Link>
        ) : (
          <Link to={`/read/${ch.id}`} className="btn btn-ghost">
            ← 返回本章
          </Link>
        )}
        {nextEx && (
          <Link to={`/ex/${ch.id}/${nextEx.id}`} className="btn btn-ghost">
            下一题 →
          </Link>
        )}
      </nav>
    </main>
  );
}

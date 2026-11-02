import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { StreamLanguage } from '@codemirror/language';
import { verilog } from '@codemirror/legacy-modes/mode/verilog';
import { toggleComment } from '@codemirror/commands';
import { keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { chapterIndex, chapterNeighbors } from '../content';
import { useProgress } from '../progress';
import { type SimResult, type SimOptions } from '../sim';
import { runSim } from '../sim/client';
import Waveform from '../components/Waveform';
import { InlineMD } from '../components/md';
import { verilogCompletion } from '../components/verilogComplete';
import { commentCompartment, commentHidingExtension } from '../components/commentToggle';
import { verilogHoverDocs } from '../components/hoverDocs';
import SolutionView from '../components/SolutionView';
import TruthTableView from '../components/TruthTableView';
import StepsGuide from '../components/StepsGuide';
import AlternativesView from '../components/AlternativesView';
import GateDiagram from '../components/GateDiagram';
import { useTitle } from '../useTitle';

const SIM_OPTS: SimOptions = { maxTime: 500_000, budget: 200_000_000 };
const codeKey = (cid: string, eid: string) => `lv-code-${cid}/${eid}`;

// Verilog 高亮
const verilogLang = StreamLanguage.define(verilog);
// 注释符号，供 toggleComment 命令读取
const commentData = EditorState.languageData.of(() => [
  { commentTokens: { line: '//', block: { open: '/*', close: '*/' } } },
]);

/** 判分：必须正常结束、无错误、无 FAIL 行，且测试台输出成功标识 */
function isPassed(r: SimResult): boolean {
  return (
    r.finished &&
    r.errors.length === 0 &&
    !r.console.some((l) => l.includes('FAIL')) &&
    r.console.some((l) => l.includes('ALL TESTS PASSED'))
  );
}

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
  const [commentsHidden, setCommentsHidden] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const cmRef = useRef<ReactCodeMirrorRef>(null);

  useTitle(ch && ex ? `练习 ${ex.id} · ${ex.title}` : undefined);

  if (!ch || !ex) return <Navigate to="/" replace />;

  const isDone = p.isDone(ch.id, ex.id);
  const starred = p.isStarred(ch.id, ex.id);
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
    if (running) return;
    setRunning(true);
    // Worker 中异步运行，仿真期间页面仍可响应
    runSim([code, ex.testbench], SIM_OPTS).then((r) => {
      setResult(r);
      setRunning(false);
      if (isPassed(r)) {
        p.complete(ch.id, ex.id);
      }
    });
  };

  // 始终指向最新的 run，供快捷键调用
  const runRef = useRef(run);
  runRef.current = run;

  // Ctrl/Cmd + Enter 运行仿真
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runRef.current();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // 注释显示/隐藏开关
  const toggleCommentVisibility = () => {
    const next = !commentsHidden;
    setCommentsHidden(next);
    const view = cmRef.current?.view;
    if (view) {
      view.dispatch({
        effects: commentCompartment.reconfigure(commentHidingExtension(next)),
      });
    }
  };

  const passed = !!result && isPassed(result);
  const hasErrors = (result?.errors.length ?? 0) > 0;

  const extensions = useMemo(
    () => [
      verilogLang,
      commentData,
      verilogCompletion,
      verilogHoverDocs,
      keymap.of([{ key: 'Mod-/', run: toggleComment }]),
      commentCompartment.of(commentHidingExtension(false)),
    ],
    []
  );

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

      {/* 做题前的学习辅助：预期真值表、关键波形、门级电路、分步引导 */}
      {ex.truthTable && <TruthTableView table={ex.truthTable} />}
      {ex.expectedWave && (
        <div className="expected-wave card">
          <span className="tt-title">关键波形 · 预期</span>
          <p>
            <InlineMD t={ex.expectedWave} />
          </p>
        </div>
      )}
      {ex.circuit && <GateDiagram circuit={ex.circuit} />}
      {ex.steps && <StepsGuide steps={ex.steps} />}

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
            <button
              className={`btn btn-ghost btn-sm star-btn${starred ? ' starred' : ''}`}
              onClick={() => p.toggleStar(ch.id, ex.id)}
              title={starred ? '从错题本移除' : '收藏到错题本'}
            >
              {starred ? '★ 已收藏' : '☆ 收藏'}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={toggleCommentVisibility}
              title="显示或隐藏代码中的注释（不修改代码）"
            >
              {commentsHidden ? '显示注释' : '隐藏注释'}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowSolution((v) => !v)}
              title="查看带逐行讲解的参考答案"
            >
              {showSolution ? '收起答案' : '查看答案'}
            </button>
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
            ref={cmRef}
            value={code}
            height="440px"
            theme="dark"
            extensions={extensions}
            onChange={onCode}
          />
        </div>
      </div>

      {/* 参考答案与逐行讲解、多写法对比 */}
      {showSolution && (
        <div className="solution-zone">
          <SolutionView solution={ex.solution} explain={ex.explain} />
          {ex.alternatives && <AlternativesView alternatives={ex.alternatives} />}
        </div>
      )}

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
                {e.line
                  ? e.line <= userLines
                    ? `（你的代码第 ${e.line} 行）`
                    : `（测试台第 ${e.line - userLines} 行）`
                  : ''}
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

      <p className="ex-shortcuts">
        快捷键：<span className="mono">Ctrl/⌘ + Enter</span> 运行 ·{' '}
        <span className="mono">Ctrl/⌘ + /</span> 注释/取消注释 · 悬停关键字查看说明
      </p>
    </main>
  );
}

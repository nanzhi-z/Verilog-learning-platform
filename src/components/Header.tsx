import { Link } from 'react-router-dom';
import { useProgress, totalExercises } from '../progress';

export default function Header() {
  const p = useProgress();
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="logo">
          <span className="logo-badge mono">LV</span>
          <span>
            Learn&nbsp;<b>Verilog</b>
          </span>
        </Link>
        <nav className="header-nav" aria-label="辅助功能">
          <Link to="/cheatsheet" className="header-link">
            语法速查
          </Link>
          <Link to="/notebook" className="header-link">
            错题本
            {p.starred.length > 0 ? ` (${p.starred.length})` : ''}
          </Link>
        </nav>
        <div className="header-right">
          <span className="chip" title="已完成练习数">
            {p.totalDone} / {totalExercises} 题
          </span>
          {p.totalDone > 0 && (
            <button
              className="header-reset"
              title="清空全部学习进度"
              onClick={() => {
                if (window.confirm('确定要清空全部学习进度吗？此操作不可撤销。')) p.reset();
              }}
            >
              重置
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

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

import { Link } from 'react-router-dom';
import { chapterIndex, type Exercise } from '../content';
import { useProgress } from '../progress';
import { useTitle } from '../useTitle';

interface Item {
  cid: string;
  ex: Exercise;
}

function NoteEditor({ cid, eid }: { cid: string; eid: string }) {
  const p = useProgress();
  return (
    <textarea
      className="nb-note"
      rows={2}
      placeholder="记录你的思路、易错点（失焦自动保存）"
      defaultValue={p.getNote(cid, eid)}
      onBlur={(e) => p.setNote(cid, eid, e.target.value)}
    />
  );
}

export default function Notebook() {
  const p = useProgress();
  useTitle('错题本 · Learn Verilog');

  const items: Item[] = [];
  for (const key of p.starred) {
    const [cid, eid] = key.split('/');
    const ex = chapterIndex.get(cid)?.exercises.find((e) => e.id === eid);
    if (ex) items.push({ cid, ex });
  }

  return (
    <main className="container notebook">
      <h1>错题本 / 收藏</h1>
      <p className="nb-sub">收藏需要重点复习的题目，点击标题继续练习，可随时记录笔记。</p>

      {items.length === 0 && (
        <div className="empty-card">
          <p>还没有收藏任何题目。</p>
          <p>在练习页点「☆ 收藏」即可把题目加入这里。</p>
        </div>
      )}

      <div className="nb-list">
        {items.map(({ cid, ex }) => {
          const done = p.isDone(cid, ex.id);
          return (
            <div key={`${cid}/${ex.id}`} className="nb-item">
              <div className="nb-item-head">
                <Link to={`/ex/${cid}/${ex.id}`} className="nb-item-title">
                  {chapterIndex.get(cid)?.title} · 练习 {ex.id}：{ex.title}
                </Link>
                <span className={`chip ${done ? 'chip-done' : 'chip-todo'}`}>
                  {done ? '已完成' : '未完成'}
                </span>
                <button
                  className="nb-unstar"
                  onClick={() => p.toggleStar(cid, ex.id)}
                  title="从错题本移除"
                >
                  移除
                </button>
              </div>
              <NoteEditor cid={cid} eid={ex.id} />
            </div>
          );
        })}
      </div>
    </main>
  );
}

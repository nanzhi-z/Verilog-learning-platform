import { useEffect } from 'react';

const BASE = 'Learn Verilog';

/** 设置当前页面的浏览器标签标题；不传则使用站点默认标题。 */
export function useTitle(t?: string) {
  useEffect(() => {
    document.title = t ? `${t} · ${BASE}` : `${BASE} — 交互式 Verilog 教程`;
  }, [t]);
}

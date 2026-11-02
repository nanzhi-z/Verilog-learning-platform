/**
 * 注释显示/隐藏开关：隐藏时用 Decoration 把注释（整行注释整行消失，
 * 行内注释只隐藏注释文本）从视图中移除，不改动实际文档，切回即恢复。
 */
import { Compartment, StateField, type EditorState, type Range } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';

function buildDecorations(state: EditorState): Range<Decoration>[] {
  const ranges: Range<Decoration>[] = [];
  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name !== 'comment' && node.type.name !== 'comment') return;
      const firstLine = state.doc.lineAt(node.from);
      const before = state.doc.sliceString(firstLine.from, node.from);
      const fullLine = /^\s*$/.test(before);
      if (fullLine) {
        // 整行注释：覆盖到结束行的行尾，并吃掉换行，避免留下空行
        const endLine = state.doc.lineAt(node.to);
        let end = endLine.to;
        if (end < state.doc.length) end += 1;
        ranges.push(Decoration.replace({}).range(firstLine.from, end));
      } else {
        // 行内注释：仅隐藏注释本身
        ranges.push(Decoration.replace({}).range(node.from, node.to));
      }
    },
  });
  ranges.sort((a, b) => a.from - b.from);
  return ranges;
}

const hideCommentsField = StateField.define<DecorationSet>({
  create(state) {
    return Decoration.set(buildDecorations(state));
  },
  update(decos, tr) {
    if (tr.docChanged) return Decoration.set(buildDecorations(tr.state));
    return decos;
  },
  provide: (f) => EditorView.decorations.from(f),
});

export const commentCompartment = new Compartment();

export function commentHidingExtension(hidden: boolean) {
  return hidden ? hideCommentsField : [];
}

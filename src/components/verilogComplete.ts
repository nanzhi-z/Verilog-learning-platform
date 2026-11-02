/**
 * Verilog 编辑器自动补全：关键字、系统任务、常用代码片段（snippet）。
 */
import {
  autocompletion,
  snippet,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';

const KEYWORDS = [
  'module', 'endmodule', 'input', 'output', 'inout', 'wire', 'reg', 'tri',
  'parameter', 'localparam', 'assign', 'always', 'initial', 'begin', 'end',
  'if', 'else', 'case', 'endcase', 'default', 'for', 'while', 'repeat',
  'forever', 'posedge', 'negedge', 'function', 'endfunction', 'or',
];

const keywordOptions: Completion[] = KEYWORDS.map((label) => ({
  label,
  type: 'keyword',
}));

const systemOptions: Completion[] = [
  '$display', '$write', '$finish', '$stop', '$time', '$random',
  '$monitor', '$dumpfile', '$dumpvars',
].map((label) => ({ label, type: 'builtin', detail: '系统任务' }));

const snippetOptions: Completion[] = [
  {
    label: 'module', type: 'snippet', detail: '模块骨架',
    apply: snippet('module ${1:name} (${2});\n  ${}\nendmodule'),
  },
  {
    label: 'alwaysff', type: 'snippet', detail: '时序 always 块',
    apply: snippet('always @(posedge ${1:clk}) begin\n  ${}\nend'),
  },
  {
    label: 'alwayscomb', type: 'snippet', detail: '组合 always 块',
    apply: snippet('always @(*) begin\n  ${}\nend'),
  },
  {
    label: 'if', type: 'snippet', detail: 'if 语句',
    apply: snippet('if (${1:cond}) begin\n  ${}\nend'),
  },
  {
    label: 'case', type: 'snippet', detail: 'case 语句',
    apply: snippet('case (${1:sel})\n  ${2:value}: ${}\n  default: ${}\nendcase'),
  },
  {
    label: 'for', type: 'snippet', detail: 'for 循环',
    apply: snippet('for (${1:i} = 0; ${2}; ${3}) begin\n  ${}\nend'),
  },
  {
    label: 'initial', type: 'snippet', detail: 'initial 块',
    apply: snippet('initial begin\n  ${}\nend'),
  },
];

const WORD = /[\w$]*/;

export function verilogAutocomplete(context: CompletionContext): CompletionResult | null {
  const before = context.matchBefore(WORD);
  if (!before) return null;
  // 系统任务：以 $ 开头
  if (before.text.startsWith('$')) {
    return { from: before.from, options: systemOptions, validFor: WORD };
  }
  if (before.from === before.to && !context.explicit) return null;
  return {
    from: before.from,
    options: [...keywordOptions, ...snippetOptions],
    validFor: WORD,
  };
}

export const verilogCompletion = autocompletion({
  override: [verilogAutocomplete],
});

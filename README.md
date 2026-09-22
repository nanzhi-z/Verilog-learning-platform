# Learn Verilog 技术文档

一个运行在浏览器里的交互式 Verilog 教程网站。
无需安装任何 EDA 工具：课程正文、在线练习、代码编辑、仿真运行、波形查看、自动判分全部在浏览器内完成。

---

## 1. 项目概览

| 维度 | 说明 |
| --- | --- |
| 课程规模 | 23 章（00–22）· 68 道练习 · 三站进阶 |
| 仿真器 | 自研纯 TypeScript 实现（词法 → 语法 → elaborate → 事件驱动仿真），无外部依赖 |
| 判分方式 | 拼接「用户代码 + 内置测试台」运行，控制台输出包含 `ALL TESTS PASSED` 即判通过 |
| 进度存储 | localStorage（完成状态、已读章节、代码草稿） |
| 构建产物 | 纯静态站点（`dist/`），可部署到任意静态托管 |

### 三站内容

| 站 | 文件 | 章节 | 题数 | 主题 |
| --- | --- | --- | --- | --- |
| 第一站 · 语言基础 | `src/content/basics.ts` | 00–07 | 22 | 模块/端口/运算符/组合逻辑 |
| 第二站 · 时序与状态机 | `src/content/sequential.ts` | 08–15 | 25 | 时钟/寄存器/状态机/计数器 |
| 第三站 · 工程实践 | `src/content/practice.ts` | 16–22 | 21 | UART/SPI/BCD/交通灯/售货机等综合设计 |

---

## 2. 技术栈与常用命令

- **React 18** + **Vite 5** + **TypeScript 5.5**（strict 模式）
- 路由：`react-router-dom` 6（**HashRouter**，便于纯静态部署）
- 编辑器：`@uiw/react-codemirror` + `@codemirror/language`（StreamLanguage）+ `@codemirror/legacy-modes`（verilog 高亮）
- 测试：`vitest` 2

```bash
npm install        # 安装依赖
npm run dev        # 开发服务器（http://localhost:5173/）
npm run build      # tsc --noEmit 类型检查 + vite 生产构建 → dist/
npm run preview    # 本地预览 dist/ 产物
npm test           # 运行全部 20 个测试
```

> PowerShell 下查看测试输出建议：`npm test 2>&1 | Out-String -Width 340`。

---

## 3. 目录结构

```
learn-verilog/
├── src/
│   ├── main.tsx              # 入口，挂载 <App/>
│   ├── App.tsx               # HashRouter + 路由 + ReKey/ScrollTop
│   ├── index.css             # 全部样式：设计令牌 + 组件样式 + 响应式
│   ├── progress.ts           # 进度状态（useProgress hook + localStorage）
│   ├── pages/
│   │   ├── Home.tsx          # 首页：hero + 三站章节卡片网格
│   │   ├── ReadPage.tsx      # 阅读页：正文渲染 + 本章练习列表
│   │   └── ExercisePage.tsx  # 练习页：编辑器 + 判分 + 控制台 + 波形
│   ├── components/
│   │   ├── Header.tsx        # 顶栏：logo + 进度 chip + 重置
│   │   ├── Waveform.tsx      # 深色 SVG 波形查看器
│   │   └── md.tsx            # 轻量行内 Markdown（`code` 与 **bold**）
│   ├── content/
│   │   ├── types.ts          # Block/Exercise/Chapter/Stage 类型 + exKey
│   │   ├── basics.ts         # 第一站（00–07 章 22 题）
│   │   ├── sequential.ts     # 第二站（08–15 章 25 题）
│   │   ├── practice.ts       # 第三站（16–22 章 21 题）
│   │   └── index.ts          # stages/chapters/chapterIndex/chapterNeighbors
│   └── sim/                  # ★ 自研 Verilog 仿真器
│       ├── lexer.ts          # 词法分析
│       ├── ast.ts            # AST 节点定义
│       ├── parser.ts         # 语法分析（含多名端口、pending 端口机制）
│       ├── elaborate.ts      # 实例树/参数/端口别名/敏感列表/顶层选择
│       ├── interpreter.ts    # 表达式求值 + 语句执行 + 进程工厂
│       ├── scheduler.ts     # 事件驱动调度内核（delta cycle + NBA）
│       ├── values.ts         # 四值逻辑 Vec（0/1/x/z）
│       └── index.ts          # 对外 API：simulate(sources, opts)
└── TECHNICAL.md              # 本文档
```

---

## 4. 前端架构

### 4.1 路由（App.tsx）

采用 HashRouter，路由变化时通过 `ReKey`（以 pathname 为 key 重挂载页面组件）保证 `/ex/:cid/:eid` 等参数变化时组件状态完全重建；`ScrollTop` 在路由变化时滚动到页首。

| 路径 | 页面 | 说明 |
| --- | --- | --- |
| `/` | Home | 首页 |
| `/read/:cid` | ReadPage | 章节阅读（cid = 章节号，如 `00`） |
| `/ex/:cid/:eid` | ExercisePage | 练习（eid = 题号，如 `1`） |
| `*` | → `/` | 兜底重定向 |

### 4.2 首页（Home.tsx）

- hero：首次访问显示「从第 00 章开始」，否则显示「继续学习」（指向第一个未完成且已解锁的练习）；
- 总进度条（`totalDone / totalExercises`）；
- 三站章节卡片网格（`ch-grid`，auto-fill 318px）：
  - `locked`：未解锁置灰禁点；
  - `done`：本章全部题目完成（绿色 + 完成圆点）；
  - foot 显示「已读/未读 · x/y 题」与「阅读 →」。

### 4.3 阅读页（ReadPage.tsx）

- 挂载时调用 `markRead(cid)`（**有守卫**：仅当本章已解锁才标记已读）；
- `BlockView` 渲染正文的 8 种 Block：`p / h2 / h3 / code / ul / ol / note / table`；
  - code 块带 mac 三点窗口条 + 语言标签；
  - note 有三种色调：tip（绿）/ warn（黄）/ info（蓝）；
- 本章练习列表：已完成 ✓，未解锁置灰禁点；
- 章末上一章/下一章导航；未解锁章显示 locked-page 引导文案。

### 4.4 练习页（ExercisePage.tsx）——核心页面

```
面包屑 + 标题 + 题目描述卡（hints 可折叠）
└── editor-card：mac 三点 + 文件名 + 「恢复初始」+「运行仿真」
    └── CodeMirror（dark，verilog 高亮，440px 高）
└── verdict 判分横幅（三态）
└── console-card：仿真输出（FAIL 行红色高亮）
└── wave-card：SVG 波形
└── 章内上一题/下一题导航
```

关键实现：

```ts
const SIM_OPTS = { maxTime: 500_000, budget: 200_000_000 };

const run = () => {
  setRunning(true);
  window.setTimeout(() => {                 // 30ms 让出主线程渲染"运行中…"
    const r = simulate([code, ex.testbench], SIM_OPTS);
    setResult(r);
    setRunning(false);
    if (r.console.some(l => l.includes('ALL TESTS PASSED'))) {
      p.complete(ch.id, ex.id);             // 写入进度 → 解锁下一题
    }
  }, 30);
};
```

- **判分三态**：
  - `verdict ok`（绿）：含 `ALL TESTS PASSED`，附「下一题 →」（章末则「进入第 N 章 →」）；
  - `verdict fail`（黄）：未通过，提示查看 FAIL 行；
  - `verdict err`（红）：仿真出错，逐条显示错误信息；行号归属启发式：`e.line <= 用户代码行数 ? '你的代码' : '测试台'`。
- **代码草稿**：每次编辑即写 `localStorage['lv-code-${cid}/${eid}']`，重进页面自动恢复；「恢复初始」清空草稿回到 starter。
- **编辑器扩展**：`StreamLanguage.define(verilog)`（legacy mode 提供关键字高亮）。

### 4.5 波形查看器（Waveform.tsx）

深色 SVG 渲染，`rowH=24`、信号名列宽按最长名自适应：

- 1 位信号：绿色阶梯折线（`wave-bit`）；
- 多位信号：圆角矩形分段色带（`wave-vec-bg`）+ 十六进制值标签（`wave-vec-val`，蓝）；
- 时间轴自动选择"nice"刻度步长（约 4–9 个刻度）；
- `changes` 数组构建分段，末段延伸至仿真结束时间；容器横向可滚动（`wave-scroll`）。

### 4.6 设计令牌（index.css）

| 令牌 | 值 | 用途 |
| --- | --- | --- |
| 页面底色 | `#FFFFFF` | 全局背景 |
| 卡片 | `#F8FAFC` | 阅读卡/描述卡 |
| 正文 | `#0F172A` | 主文字 |
| 信号绿 | `#05994F` 系 | 品牌色/按钮/完成态 |
| 波形蓝 | `#80C1FF` | 向量值标签 |
| 编辑器深色 | `#0f172a` | editor/console/wave 面板底色 |
| `--content-w` | 1080px | 内容最大宽度 |
| `--header-h` | 60px | 顶栏高度（sticky + blur） |

响应式：`@media (max-width: 720px)` 调整 hero 字号、章节导航纵向排列、verdict/面包屑允许换行；hero-cta、editor-toolbar 自带 `flex-wrap`，console 使用 `pre-wrap`，表格横向滚动（`table-wrap`）。

---

## 5. 课程内容模型（content/）

### 5.1 类型定义（types.ts）

```ts
interface Exercise {
  id: string;          // 题号 '1'、'2'…
  title: string;       // 中文标题
  desc: string;        // 题目描述（支持 `code` 与 **bold**）
  hints: string[];     // 提示（可折叠）
  starter: string;     // 初始代码（含 TODO，不是答案）
  testbench: string;   // 内置测试台（用户不可见）
  solution: string;    // 参考答案（需通过自家 testbench）
}
interface Chapter { id: string; title: string; subtitle: string; blocks: Block[]; exercises: Exercise[] }
interface Stage { id: string; title: string; tagline: string; desc: string; chapters: Chapter[] }
```

正文的 `Block` 为带判别的联合：`p / h2 / h3 / code{label, code} / ul{items} / ol{items} / note{tone, title, t} / table{head, rows}`。

### 5.2 内容测试约束（content.test.ts 自动校验）

1. 章节总数 = 23；
2. **所有 68 个 solution 都能通过自家 testbench**（全部输出 `ALL TESTS PASSED`）；
3. 每个 starter 含 TODO 且与 solution 不同。

### 5.3 测试台编写铁律（TB conventions）

写新练习的 testbench 时必须遵守：

1. 结尾固定模式：`if (pass == N) $display("ALL TESTS PASSED"); $finish;`
2. 时序检查一律 `@(posedge clk); #1;` 之后采样；
3. **单拍脉冲信号**（如 `dispense`、`done`）：必须在触发它的那个 posedge 后 `#1` 立即检查——下一拍就会被设计清零；
4. **等待输出边沿**（如 UART 的 `txd` 下降沿）：必须先挂起 `@(negedge txd)` 再等时钟，否则会错过事件；
5. 复位释放后的第一个时钟沿通常用于检查复位态。

---

## 6. 进度与解锁（progress.ts）

### 6.1 存储

- key：`lv-progress-v1`，结构 `{ completed: string[] /* "00/1" */, read: string[] /* 章节号 */ }`；
- 代码草稿：`lv-code-${cid}/${eid}`；
- 模块级单例 `current` + 监听器集合，`useProgress()` 通过订阅强制重渲染；`emit()` 同步写 localStorage。

### 6.2 解锁规则

```
章 N 解锁   ⇔ N == 00 或 第 N-1 章全部题目完成
题 k 解锁   ⇔ 本章已解锁 且 (k 是本章第一题 或 题 k-1 已完成)
```

- `chapterDone(cid)`：本章所有练习都在 `completed`；
- `chapterUnlocked(cid)`、`unlocked(cid, eid)`：如上规则；
- `markRead` 仅在章节已解锁时生效（直接访问锁定章 URL 只会看到 locked-page，不会污染已读状态）；
- `reset()`：清空全部进度（顶栏按钮 + confirm）。

---

## 7. Verilog 仿真器（sim/）

自研教学子集仿真器，约 2500 行 TS，管线如下：

```
源代码(用户代码 + testbench)
  → lexer.ts     词法（LexError 带行号）
  → parser.ts    语法 → AST（ParseError 带行号；支持多名端口 pending 机制）
  → elaborate.ts 实例树/参数求值/端口别名/敏感列表收集/顶层选择（SimError）
  → scheduler.ts 事件驱动仿真（delta cycle + NBA 区，进程为 JS generator）
  → SimResult { console, waveform, errors, finished, time }
```

### 7.1 四值逻辑（values.ts）

- `Bit = 0 | 1 | 'x' | 'z'`；`Vec` 按位存储（LSB first），宽度固定；
- 按位与/或/异或/取反采用标准 x/z 传播真值表（z 按 x 处理）；
- 比较运算遇未知返回 `x`；`===`/`!==`（case equality）逐位比较永不为 x。

### 7.2 宽度语义（重要）

- **二元运算结果宽度 = max(左右操作数宽度)**（不截断、不补符号位）；
  例：5 位的 `credit` + 4 位的 `coin` 得 5 位结果，进位自然丢弃——与 Verilog 无符号语义一致；
- 位选择/切片越界返回 `x`；赋值宽度不匹配时按 Verilog 惯例截断/零扩展。

### 7.3 支持的语言子集

| 类别 | 支持 |
| --- | --- |
| 声明 | module（ANSI/非 ANSI 端口）、wire/reg/tri、parameter/localparam、多名声明、`output reg a, b, c`、reg 初始化 `reg a = 0` |
| 实例化 | 命名端口连接、参数覆盖 `#(.N(8))`、输出端口连到信号/位选/切片/拼接 |
| 语句 | begin/end、if/else、case（含 default）、for、while、repeat、forever、阻塞 `=`/非阻塞 `<=`、`#delay`、`@(...)`、`disable` |
| 表达式 | 有/无尺寸字面量（2/8/10/16 进制，含 x/z/?）、全部一元（含 `&`/`|`/`^` 归约）、二元算术/逻辑/移位/比较（`==` `===` 等）、三目、拼接 `{}`、重复 `{n{}}`、位选/切片、层次引用（只读）、函数调用 |
| 过程块 | initial、always（组合 `@(*)`/边沿 `@(posedge...)`/延时 `always #N`）、assign |
| 系统任务 | `$display`（%b/%d/%h/%s）、`$finish`、`$time` 等 |
| 函数 | function…endfunction（返回值 + 局部声明） |

**明确不支持**（教学子集边界）：signed 运算、generate、task、fork/join、多维数组/memory、specify 块、强度模型、timescale（`#` 数值按抽象时间处理）。

### 7.4 调度内核（scheduler.ts）

- **进程即 generator**：initial/always/assign 各编译为一个 `ProcGen`，通过 `yield` 挂起条件（等边沿 / 等延时）交还调度器；
- **事件循环**：推进到最近事件 → 唤醒进程 → delta cycle 迭代至稳定（组合进程可能互相触发）→ 提交 NBA（非阻塞赋值在时间步末尾统一生效）；
- 每个信号维护 `changes: {t, v}[]` 增量历史（波形数据源）与 `watchers`（边沿监听）；
- 保护机制：`maxTime`（默认 20000，练习页用 500_000）防时钟不停；`budget`（执行步数上限，练习页 200_000_000）防死循环。

### 7.5 elaborate 要点

- **顶层选择**：拼接 [用户代码, testbench] 后，取**唯一未被任何实例例化的模块**（即测试台）；
- 端口连接到父信号时做**别名**（`remapPort` 递归重指向，保证孙实例引用一致）；
- 输出端口驱动权限传播（`allowProcedural`/`allowContinuous`）——防止多驱动；
- 组合 `always` 敏感列表由语句静态收集标识符（`sensStmt`）。

### 7.6 对外 API（index.ts）

```ts
simulate(sources: string | string[], opts?: {
  top?: string;            // 强制顶层（默认自动选择）
  maxTime?: number;        // 时间上限
  budget?: number;         // 执行步数预算
}): SimResult
// SimResult = { console: string[]; waveform: WaveSignal[]; errors: SimErrorInfo[]; finished: boolean; time: number }
```

错误（ParseError/LexError/SimError）不会抛出——统一转为 `errors` 数组，行号相对拼接后的完整源码；练习页用启发式把行号归属到「你的代码」或「测试台」。

---

## 8. 测试

| 套件 | 数量 | 内容 |
| --- | --- | --- |
| `src/sim/sim.test.ts` | 17 | 仿真器：四值逻辑、宽度语义、组合/时序进程、NBA、模块例化、函数、系统任务等 |
| `src/content/content.test.ts` | 3 | 章节数 = 23；全部 solution 过 testbench；starter 含 TODO |

合计 20/20 通过；`npm run build`（tsc strict + vite）通过。构建产物约 798 KB（gzip 258 KB，主要是 CodeMirror）。

---

## 9. 已知限制与注意事项

1. **仿真器为教学子集**：见 7.3 的边界列表；不支持的设计会得到带行号的 SimError，而非静默错误结果；
2. React Router v6 会在控制台输出 relative splat path 的**弃用警告**（无害，仅 dev 下出现）；
3. 波形记录所有非隐藏信号全量 `changes`，超长仿真（数十万时间单位）下 SVG 会较大——受 `maxTime` 限制实际影响可控；
4. 代码草稿永久保留在 localStorage（重置进度不会清草稿，「恢复初始」会）。

---

## 10. 部署

纯静态站点：

```bash
npm run build    # 产出 dist/
```

将 `dist/` 发布到任意静态托管（GitHub Pages / Netlify / Vercel / Nginx）即可。使用 HashRouter，**无需服务端 SPA 重写规则**。

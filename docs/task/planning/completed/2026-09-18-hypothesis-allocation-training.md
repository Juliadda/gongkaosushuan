# Plan: 增加“假设分配”速算训练

> **Status:** Complete
> **Created:** 2026-09-18
> **Estimated steps:** 7
> **Risk level:** Medium

## Context

现有网站提供加、减、乘、除、自定义、计时和历史记录。下一步只新增一个“假设分配”专项，用于训练“已知现期量 `B` 与正增长率 `R`，求基期量 `A` 或增长量 `X`”的速算过程。

本任务不修改用户正在处理的基线问题。当前除法与乘法估算的 1% 容差视为已确认产品规则；本计划不调整相关常量、文案或测试。

## Current State

- `src/domain/types.ts:5-12` 的 `Question` 只支持四则运算、操作数和字符串答案，没有方法题题干、选项、目标量、估算值和解析步骤。
- `src/domain/types.ts:18-34` 与 `src/domain/presets.ts:3-31` 只定义加减、乘法和除法预设。
- `src/core/generator.ts:125-190` 通过预设 `switch` 生成单题，没有会卡死的全局重试机制。
- `src/views/PracticeView.tsx:16-26` 在进入练习页时一次性生成整组题目；因此新方法题可在页面显示前完成有界生成，不需要答题过程中持续生成。
- `src/views/PracticeView.tsx:71-110` 目前只接受纯数字输入。
- `src/components/QuestionDisplay.tsx:10-49` 只显示算式或分数。
- 现有结果、历史、计时和答题记录可以继续复用。

## Target State

- 首页“资料速算”分组中出现一个“假设分配”卡片。
- 题目只覆盖 `B、R → A` 和 `B、R → X` 两类自然适用结构。
- 每题展示现期量、正增长率、所求目标和四个选项，用户点击 A–D 作答。
- 错题反馈展示 `A:X=100:R`、首次分配、尾差、尾差再分配和合并结果。
- 出题采用“最多 20 次候选尝试 + 保底构造器”，不存在无上限 `while`。
- 数学有效性永不放宽；达到尝试上限时，只允许放宽最近题目相似度，不允许放宽唯一答案、方法误差和选项安全性。
- 10、20、30、50 题都应在进入练习页时快速完成生成，无明显等待或页面卡死。

## Confirmed Inputs

- 本次只增加“假设分配”，不同时实现 415、化除为乘、等比放缩或分数比较。
- 本轮只提交计划，用户确认后才允许修改源码。
- 现有除法/乘法估算 1% 容差为用户主动调整的规则，不属于本任务。
- 不增加后端、数据库、大模型实时出题、外部依赖或静态大题库。
- 新题使用四选一，因为假设分配的停止精度依赖选项间距。
- 现有四则运算模式、自定义模式、计时和历史记录必须保持兼容。

## Open Questions for User — BLOCKING

无。默认采用四选一、难度混合、求基期与求增长量约各半的最小版本。

## Generation Design

### 1. 候选参数

- 正增长率以一位小数为主，按低、中、高三个区间抽样；产品默认范围约为 3%–25%，这只是出题范围，不是方法理论边界。
- 现期量覆盖 4 位和 5 位整数，少量 3 位或带“万/亿”展示的题延后，不在首版引入单位换算。
- 所求目标在基期量与增长量之间近似均衡。
- 过滤可以被 415 特殊分数轻松、安全锁定的候选，避免假设分配训练退化成 415 题。

### 2. 方法有效性

对候选题计算：

- 精确基期 `A = B / (1 + R)`。
- 精确增长量 `X = B - A`。
- 从精确基期附近选择一个一位或两位有效数字的整十、整百或整千作为首次假设值 `A0`。
- 首次增长量 `X0 = A0 × R`。
- 尾差 `T = B - A0 - X0`。
- 按 `100:R` 对尾差做一次再分配，得到方法估算值。

候选必须满足：

- 尾差大于 0，不能第一次分配就完全结束。
- 尾差不能小到没有训练价值，也不能大到需要三轮以上修正。
- 首次假设值必须比直接高精度除法更便于口算。
- 一次首次分配加一次尾差分配后，应能锁定正确选项。

### 3. 选项与安全校验

- 四个选项使用相同单位和精度。
- 正确选项必须同时是精确答案和方法估算值的唯一最近选项。
- 方法估算误差不超过正确选项与最近错误选项间距的 25%。
- 错误选项优先来自真实错误：只做首次分配、把现期直接乘增长率、遗漏尾差、基期与增长量混淆。
- 去重后不足四个选项、出现并列最近答案或边界舍入争议时，废弃候选。

### 4. 有界生成与防卡死

每题生成流程：

1. 最多尝试 20 个随机候选。
2. 记录第一个通过数学与选项校验的候选作为 `validCandidate`。
3. 如果后续候选同时通过防重复校验，立即返回。
4. 20 次结束仍没有更好的多样化候选，则返回 `validCandidate`，只放宽相似度要求。
5. 如果 20 次内没有任何数学有效候选，使用按种子轮换的保底参数配方生成，并再次执行同一数学校验；保底配方不是固定题目，仍会变化所求目标、数量级和正确选项位置。

该流程没有无界循环。50 题的理论上限为 1000 次简单数值候选计算，不涉及网络、DOM 或异步任务。

### 5. 防机械化

- 为每题生成指纹：`target + rateBucket + magnitude + firstAllocationScale + tailBucket + difficulty`。
- 最近 5 题内优先不重复指纹；达到尝试上限时可重复指纹，但数值本身仍不得重复。
- 同一个增长率一轮最多出现 3 次。
- 求基期、求增长量大致各半。
- 首次分配单位在整十、整百、整千间随数量级变化，不能始终从 3000 或 5000 开始。
- 难度默认约 25% 简单、50% 中等、25% 困难。
- A、B、C、D 正确位置在整轮中尽量均衡，差值不超过 1。
- 仅更换数字单位不计入结构多样性。

## Implementation Steps

- [x] **Step 1: 扩展题目与预设类型，同时保持旧历史兼容**
  - Files: `src/domain/types.ts`, `src/domain/presets.ts`
  - What: 把现有四则题定义为算术题分支，新增假设分配题分支；为预设增加 `hypothesis-allocation` 和 `speed-method` 分类。旧记录缺少新判别字段时继续按算术题处理。
  - Why: 避免把现期量和增长率伪装成普通除法操作数，也避免破坏已有 localStorage 历史。

- [x] **Step 2: 实现有界假设分配出题器**
  - Files: `src/core/hypothesisAllocation.ts` (new)
  - What: 实现候选生成、精确计算、首次分配、尾差再分配、415 可用性过滤、四选项生成、唯一答案校验、指纹、多样性检查、20 次上限和保底构造器。
  - Why: 将复杂规则集中在一个纯函数模块；不向现有四则生成器塞入大量方法特例。

- [x] **Step 3: 接入现有预设生成入口与统一判题**
  - Files: `src/core/generator.ts`, `src/core/checker.ts`
  - What: `generatePresetQuestion` 增加假设分配分支；增加按题目种类分派的统一判题入口，算术题继续走原有逻辑，方法题比较选项标识。
  - Why: 复用现有练习创建流程，并保证不改变 1% 估算规则。

- [x] **Step 4: 首页增加单个“假设分配”入口**
  - Files: `src/views/HomeView.tsx`, `src/views/HomeView.css`
  - What: 增加“资料速算”分组并显示“假设分配”卡片；暂不为未来四种方法预留空按钮或额外配置界面。
  - Why: 满足当前范围，避免提前搭建未使用的通用方法系统。

- [x] **Step 5: 支持四选一作答和方法反馈**
  - Files: `src/components/QuestionDisplay.tsx`, `src/components/QuestionDisplay.css`, `src/views/PracticeView.tsx`, `src/views/PracticeView.css`
  - What: 方法题显示现期、增长率、所求目标和 A–D 选项；点击选项即提交。正确题可快速进入下一题；错误题暂停自动跳转并展示首次分配、尾差、尾差再分配和合并结果。普通题仍显示数字输入框。
  - Why: 选项是判断所需精度的一部分，错误时必须看得到方法过程。

- [x] **Step 6: 复用结果页和历史记录展示方法题**
  - Files: `src/views/ResultView.tsx`, `src/views/HistoryView.tsx`, related CSS only if required
  - What: 确保方法题在错题列表、全部答题详情和历史记录中能显示题干、四个选项、用户选择、正确选择、精确结果及解析；不改变现有存储键和训练结果版本，除非兼容测试证明必须升级。
  - Why: 保留现有计时与复盘价值，并避免另建存储系统。

- [x] **Step 7: 增加数学、性能和回归验证**
  - Files: `src/core/hypothesisAllocation.test.ts` (new), `src/core/generator.test.ts`, existing component/view tests if present
  - What: 用固定随机种子批量验证唯一答案、方法安全、415 过滤、目标/增长率/数量级多样性、20 次上限、保底路径、50 题整组生成，以及旧预设不回归。
  - Why: 出题器是否正确不能只靠页面抽看。

## Files Affected

| File | Action | Description |
| --- | --- | --- |
| `src/domain/types.ts` | Modify | 增加方法题数据结构并兼容旧题 |
| `src/domain/presets.ts` | Modify | 增加假设分配预设和资料速算分类 |
| `src/core/hypothesisAllocation.ts` | Add | 有界出题、选项、解析和校验 |
| `src/core/hypothesisAllocation.test.ts` | Add | 生成器属性与边界测试 |
| `src/core/generator.ts` | Modify | 接入新预设 |
| `src/core/generator.test.ts` | Modify | 新预设与旧模式回归 |
| `src/core/checker.ts` | Modify | 按题目种类判题，保持现有 1% 规则 |
| `src/views/HomeView.tsx` | Modify | 增加资料速算入口 |
| `src/views/HomeView.css` | Modify if needed | 新分组样式复用或最小补充 |
| `src/components/QuestionDisplay.tsx` | Modify | 显示方法题和选项 |
| `src/components/QuestionDisplay.css` | Modify | 选项和方法题响应式样式 |
| `src/views/PracticeView.tsx` | Modify | 选项提交和错误解析 |
| `src/views/PracticeView.css` | Modify | 选择态、正确态、错误态 |
| `src/views/ResultView.tsx` | Modify | 方法题复盘展示 |
| `src/views/HistoryView.tsx` | Modify | 方法题历史展示 |

## Dependencies & Risks

- 不新增 npm 依赖，全部使用现有 TypeScript、React 和随机数工具。
- 主要风险是“选项看似唯一但方法估算跨选项”；由双重最近选项校验和 25% 安全余量阻断。
- 次要风险是过严筛选导致尝试次数升高；通过保存首个数学有效候选、20 次上限和保底构造器消除卡死风险。
- 防重复规则属于体验约束，可以在达到上限时放宽；数学正确性、方法适用性和唯一答案不能放宽。
- 方法题写入现有历史记录，需要验证旧记录没有新字段时仍正常展示。
- 本任务明确不顺带修改当前容差、文案或其他基线问题。

## Testing Plan — BLOCKING

### Automated Checks

- `npm run typecheck`
- `npm run test`
- `npm run build`
- 固定种子生成至少 1,000 道候选题，逐题断言：
  - 四个选项互不相同。
  - 精确值与方法估算值选择同一个唯一选项。
  - 估算误差不超过最近选项间距的 25%。
  - 首次分配后存在有效尾差。
  - 不属于可安全使用415的结构。
  - 没有超过 20 次候选尝试。
- 分别生成 10、20、30、50 题训练组，确认全部返回且无重复数值题。
- 用可控随机数强制走到尝试上限和保底路径，确认不会无限循环或抛出未处理异常。

### Browser Verification

- 桌面端约 `1280×720`：选择“假设分配”，完成一轮10题。
- 移动端 `390×844`：选项无横向溢出，四个选项可点击，长数字不遮挡。
- 验证求基期量与求增长量都实际出现。
- 验证答对后快速继续，答错后停留并显示完整假设分配过程。
- 验证每题用时、结果页、历史记录和再次练习。
- 用浏览器性能时间线或简单计时确认50题整组生成无可感知停顿；建议目标低于100ms，但不把硬件相关时间写成脆弱单元测试。
- 检查控制台无 error/warning。

### Regression Checks

- 原有所有预设和自定义训练仍能开始、判题和完成。
- 除法与乘法估算继续使用当前已确认的1%规则。
- 旧版 localStorage 历史记录可以读取和展开。
- 普通题仍使用数字输入，不显示 A–D 选项。

### Edge Cases

- 生成器连续抽到无效候选。
- 干扰项四舍五入后重复。
- 精确答案位于两个选项中点附近。
- 尾差为零、负数、过小或过大。
- 增长率接近415特殊分数。
- 求增长量与求基期量的正确选项数值碰巧接近。
- 正确选项位置均衡器与防重复规则同时受限。

## Rollback Plan

- 新功能只通过一个新增预设入口接入；若验收失败，可移除该预设分支和方法题文件，原有四则训练保持不变。
- 不迁移或清空 localStorage，不部署前修改历史数据。
- 实施前备份将要修改的 UI/CSS 文件，或在可用 Git 仓库中用独立分支保存改动。

## Post-Implementation Checklist

**Gate 1 — Code complete:**
- [x] All implementation steps complete

**Gate 2 — Testing (BLOCKING):**
- [x] All checks passed

**Gate 3 — Documentation (only after Gate 2):**
- [x] README 的功能和技术栈信息与实际一致
- [x] QA 记录包含生成器批量校验与浏览器验收结果

**Gate 4 — Close out:**
- [x] Plan → Complete, moved to `completed/`

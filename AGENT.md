# AGENT.md - 项目优化指南

> 本文档专为未来优化此项目的编程助手（Agent）准备。
> 项目目录：`./`

---

## 📋 项目概述

**项目名称**：洛克王国：世界 - 家园精灵交配排布助手

**核心问题**：在平面中放置 n 个 2×2 的小窝（k 个雌性 ♀、m 个雄性 ♂），使得异性小窝中心曼哈顿距离 ≤ 5 的配对数最大化，同时满足小窝之间不重叠（切比雪夫距离 ≥ 2）的约束。

**代码形态**：单文件 HTML 应用（`index.html`），内嵌 CSS 和 JavaScript，可直接在浏览器中打开运行。

---

## 📁 文件结构

```
out/
├── index.html      # 完整的单文件应用（约 71KB）
├── README.md       # 用户友好的项目说明文档
└── AGENT.md        # 本文件 - 技术优化指南
```

> ⚠️ **重要**：所有功能代码都在 `index.html` 中。没有外部依赖，没有分包，没有构建流程。

---

## 🏗️ 代码架构

### 1. HTML 结构

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <!-- 完整的 CSS 样式（内联） -->
</head>
<body>
    <!-- UI 结构 -->
    <script>
        // JavaScript 代码
    </script>
</body>
</html>
```

### 2. JavaScript 模块划分

代码按逻辑分为以下几个部分（按出现顺序）：

#### A. 工具函数（第 750-812 行）
- `manhattanDistance(p1, p2)` - 曼哈顿距离计算
- `chebyshevDistance(p1, p2)` - 切比雪夫距离计算
- `isOverlapping(p1, p2)` - 检测小窝是否重叠
- `countEdges(type0, type1)` - 计算有效配对数
- `getConnections(type0, type1)` - 获取所有连接详情
- `normalizeCoordinates(type0, type1)` - 归一化坐标到第一象限

#### B. 算法常数（第 814-831 行）
```javascript
const BOUNDARY_BASE = 20;              // 边界基准
const BOUNDARY_SCALE = 1.6;            // 边界缩放因子
const SOLVER_ATTEMPTS_BASE = 20;       // 小规模问题尝试次数
const SOLVER_ATTEMPTS_LARGE = 10;      // 大规模问题尝试次数
const SA_INITIAL_TEMP = 15.0;          // 模拟退火初始温度
const SA_COOLING_RATE = 0.997;         // 冷却率
const SA_MAX_ITERATIONS = 8000;        // 最大迭代次数
const LOCAL_MAX_ITERATIONS = 800;      // 局部搜索最大迭代
const MANHATTAN_THRESHOLD = 5;         // 有效配对距离阈值
const CHEBYSHEV_DISTANCE = 2;          // 不重叠的最小距离
```

#### C. 邻域操作函数（第 834-970 行）
- `getChebyshev2Candidates()` - 生成候选位置（切比雪夫距离=2）
- `generateNeighbor()` - 生成邻域解（单点移动）
- `swapTypes()` - 交换雌雄小窝类型
- `randomPerturbation()` - 随机扰动多个点

#### D. 优化算法（第 971-1099 行）
- `saOptimize()` - 模拟退火主算法
- `localOptimize()` - 局部搜索精修

#### E. Solver 类（第 1101-1399 行）
```javascript
class Solver {
    constructor(n, k, boundary)   // 初始化
    tryGridPattern()              // 网格模式
    tryStaggeredRows()            // 交错行模式
    tryTwoColumn()                // 双列模式
    tryLShape()                   // L型模式
    tryDiagonalLine()             // 对角线模式
    tryDiagonalBands()            // 对角带状模式
    tryRandomInitial()            // 随机初始化
    tryDifferentPatterns()        // 尝试所有模式，返回最优
}
```

#### F. 主求解函数（第 1401-1540 行）
- `solve(n, k, updateProgress)` - 主求解入口
- `startSolving()` - UI 触发函数

#### G. 可视化与交互（第 1541-1914 行）
- `renderVisualization()` - 渲染 SVG 可视化
- `renderLines()` - 渲染连接线
- `renderSquares()` - 渲染小窝方块
- `createSquare()` - 创建单个方块元素
- `isValidMove()` / `moveSquareTo()` - 移动验证和执行
- 拖拽相关：`handleTouchStart/Move/End`, `handleMouseDown/Move/Up`
- `selectSquare()`, `startDrag()`, `performDrag()`, `endDrag()`

#### H. 工具函数（第 1863-1914 行）
- `updateConnectionsList()` - 更新连接列表
- `resetSolution()` - 重置到初始解
- `exportSolution()` - 导出 JSON
- `updateType1Count()` - 更新雄性数量显示

#### I. 事件监听（第 1916-1933 行）
- DOMContentLoaded 初始化
- 输入框变化监听
- 键盘快捷键（Enter 触发计算，WASD 移动选中小窝）

---

## 🔧 关键数据结构

### State 对象（全局状态）

```javascript
const State = {
    n: 0,                     // 总数
    k: 0,                     // 雌性数量
    m: 0,                     // 雄性数量
    type0: [],                // 雌性小窝坐标 [[x,y], ...]
    type1: [],                // 雄性小窝坐标 [[x,y], ...]
    originalType0: [],        // 原始雌性坐标（用于重置）
    originalType1: [],        // 原始雄性坐标
    selected: { type: null, index: null },  // 当前选中的小窝
    dragging: {               // 拖拽状态
        active: false,
        startX: 0, startY: 0,
        startClientX: 0, startClientY: 0,
        type: null, index: null
    },
    solving: false            // 是否正在计算
};
```

---

## 🎯 算法流程

```
solve(n, k)
├── boundary = max(20, ceil(n * 1.6))
├── numAttempts = n <= 10 ? 20 : 10
└── for attempt in 1..numAttempts
    ├── result = solver.tryDifferentPatterns()
    ├── {type0, type1} = saOptimize(...)   // 模拟退火
    ├── optResult = localOptimize(...)     // 局部搜索
    └── update best if improved
└── return normalized solution
```

---

## 🚨 修改注意事项

### 1. 文件体积控制

当前 `index.html` 约 71KB。如需添加更多功能，注意控制文件大小，避免浏览器加载过慢。

### 2. 单文件限制

- 没有模块化系统（import/export）
- 所有变量/函数都在全局作用域
- 修改时注意命名冲突
- 函数定义顺序很重要 - 后面的函数可以调用前面的，反之可能导致 "未定义" 错误

### 3. SVG 坐标系

可视化使用 SVG，注意坐标转换：
```javascript
const toSvgX = (x) => x * scale;           // scale = 50
const toSvgY = (y) => -y * scale;          // Y轴翻转（屏幕坐标）
```

### 4. 移动端兼容性

- 已设置 `touch-action: none` 和 `-webkit-tap-highlight-color: transparent`
- 触摸事件使用 passive: false 以支持 preventDefault
- 视口已限制缩放：`maximum-scale=1.0`

### 5. 语法检查建议

修改后建议检查：
```bash
# 提取 JS 并检查括号平衡
python3 -c "
import re
with open('index.html') as f:
    js = re.search(r'<script>(.*?)</script>', f.read(), re.DOTALL).group(1)
print(f'Brackets: {js.count(chr(123))} open, {js.count(chr(125))} close')
print(f'Parens: {js.count(chr(40))} open, {js.count(chr(41))} close')
"
```

---

## 🔍 常见问题排查

### "函数未定义" 错误
- 检查函数定义是否在调用之前
- 确认函数名拼写一致

### 可视化显示异常
- 检查 `renderVisualization()` 中的 `viewMinX/Y`, `viewMaxX/Y` 计算
- 确认 SVG viewBox 属性格式正确

### 求解结果不如预期
- 调整 `SOLVER_ATTEMPTS_BASE` 增加尝试次数
- 调整 `SA_MAX_ITERATIONS` 增加模拟退火迭代
- 调整 `SA_INITIAL_TEMP` 或 `SA_COOLING_RATE` 改变退火策略

### 移动端拖拽不流畅
- 检查 `e.preventDefault()` 是否被正确调用
- 确认 `touch-action: none` 已应用到相关元素

---

## 💡 可优化的方向

1. **算法改进**
   - 尝试基于梯度的局部搜索
   - 引入禁忌搜索避免循环
   - 多线程 Web Worker 并行搜索（当前是单线程）

2. **可视化增强**
   - 添加动画效果展示求解过程
   - 支持缩放/平移查看大图
   - 高亮显示选中元素的连接关系

3. **交互优化**
   - 撤销/重做功能
   - 保存多个方案对比
   - 导入自定义初值

4. **性能优化**
   - 缓存候选位置计算
   - 使用 TypedArray 存储坐标
   - requestAnimationFrame 优化渲染

5. **功能扩展**
   - 考虑蛋组限制的高级模式
   - 支持保存/分享排布方案
   - 批量计算多种 (n,k) 组合

---

## 📝 编码规范

- 使用 4 空格缩进
- 函数命名：camelCase
- 常量命名：UPPER_SNAKE_CASE
- 注释风格：`// 中文注释`
- 字符串引号：单引号优先

---

## 🔗 相关参考

- 项目背景：README.md
- 生蛋机制说明：见 README.md 第一节

---

*本文档最后更新：2026-04-15*

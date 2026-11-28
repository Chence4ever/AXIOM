# Axiom

Axiom 是本地优先的交互式教材工作台。打开 [在线工作台](https://chence4ever.github.io/AXIOM/) 即可学习两章原创投资学教材，也可以从侧栏导入自己的章节。浏览器内完成计算与保存。

## 第一次试用

1. 在「资本资产定价模型」中把市场风险溢价从 6% 调至 6.5%，β 为 1.2 时，必要收益率应从 10.20% 变为 10.80%。
2. 点「保存情景」，切换手写笔，在资产点旁画圈。切回「阅读」调节参数，再通过情景菜单找回原图和笔迹。
3. 在普通段落上书写，试用橡皮、撤销与重做。刷新后，笔迹会从 IndexedDB 重新加载。
4. 进入「备份与恢复」导出完整 JSON。使用另一浏览器导入，可验证迁移结果。恢复时合并记录，同 ID 内容覆盖前会要求确认。

## 本地开发

安装 Node.js 24 和 pnpm 11.25.0，在项目目录执行以下命令。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

```sh
pnpm test
pnpm schema
pnpm build
node scripts/preview.mjs
```

生产预览位于 http://127.0.0.1:4173/AXIOM/。浏览器回归测试在生产构建后运行 `pnpm test:browser`。Windows 默认使用已安装的 Edge；其他系统可设置环境变量 `AXIOM_BROWSER=chromium`，并先运行 `pnpm exec playwright install chromium`。

## 发布

仓库 Settings → Pages → Build and deployment → Source 选择 GitHub Actions。main 分支上的应用修改将触发 Publish Axiom。工作流安装锁定依赖，运行单元测试，执行 TypeScript 检查并构建，将 dist 作为 Pages artifact 发布。亦可从 Actions 手动运行。资源、离线缓存和教材路径均相对于发布目录。

## 教材和数据

- [教材规范](CONTENT_SCHEMA.md) · [正式 JSON Schema](public/chapter.schema.json) · [给 ChatGPT 的生成提示词](教材生成提示词.md)
- [CAPM 与 SML 示例](public/examples/capm.json) · [双风险资产组合示例](public/examples/portfolio.json)
- [产品要求](PRD.md) · [架构](ARCHITECTURE.md) · [路线图](ROADMAP.md) · [人工验收清单](TESTING.md)

教材、笔迹、情景、书签和进度属于当前浏览器与站点地址。学习工作台中每门课程可单独导出；侧栏支持全库备份。清理浏览器、迁移设备、切换站点地址前先导出。备份含学习内容，请自行保存在可靠位置。初次打开并缓存完成后可离线阅读。

## 首版范围

已实现多课程与章节、顺序调整、搜索、书签、进度、十二种内容块、两种模型、选区文字高亮（普通段落）、笔压矢量笔迹、荧光笔、整笔擦除、会话内撤销重做、模型情景、自动保存、JSON 导入及备份恢复。教材改版后，同 ID 块内容改变会提示复核旧批注。

已提供基础打印样式。桌面使用浏览器打印并保存 PDF；iPad Safari 可尝试「共享 → 打印 → 打开打印预览 → 共享 → 存储到文件」。打印分页和真机效果仍待验收。手写区域采用固定逻辑宽度，小屏可用工具栏放大，再横向移动。浏览器与系统字体差异、快速书写延迟、防误触与长期存储需在真实设备上测试。下一阶段优先完善 iPad 书写、PDF 分页和旧批注重新定位。跨设备自动同步与 AI API 接入留待后续阶段。

手写时先选「手写笔」或「荧光笔」。触控笔在正文上书写，手指默认翻页。如果浏览器把电容笔识别为手指，可以开启「手指书写」。阅读模式可操作模型滑块。长章节可通过「本章目录」跳至小节。

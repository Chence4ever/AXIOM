# Axiom Content Schema 1.0

每个 UTF-8 JSON 文件包含一章。完整机器规范见 [chapter.schema.json](public/chapter.schema.json)，可导入的章节见 [CAPM](public/examples/capm.json) 与 [双资产组合](public/examples/portfolio.json)。

| 字段 | 约定 |
| --- | --- |
| schemaVersion | 固定字符串 `1.0` |
| courseId、chapterId | 1 至 96 个 ASCII 字母、数字、下划线或连字符。章节键由两个 ID 组成 |
| courseTitle、chapterTitle | 显示名称 |
| contentVersion | 教材作者维护的版本字符串 |
| subtitle、number | 可选副标题和正整数组成的章节编号 |
| blocks | 按阅读顺序排列的 1 至 2000 个块，章内 id 唯一 |

| 块类型 | 专用字段 |
| --- | --- |
| heading | content、level（2–4） |
| paragraph、markdown、callout、question、answer | content。段落支持选区高亮，Markdown 支持列表、强调、引用与代码 |
| equation | latex，使用 KaTeX 支持的 LaTeX 子集 |
| table | headers 字符串数组，rows 二维字符串数组 |
| image | src 仅接受内嵌 PNG、JPEG、WebP 的 base64 data URL，alt、width、height 必填 |
| derivation | steps，按顺序列出的文本步骤 |
| interactive_model | model 取自下方注册表。公式由阅读器实现 |
| blank_space | height 为 80–800 个逻辑像素，默认 160 |

不要改变同一概念的块 ID。修改块内容后旧版笔迹和高亮保留，引擎使用稳定序列化的 SHA-256 指纹检查绑定，列出待复核记录。未知块类型在阅读器中有降级提示并随备份原样保存。导入同时检查 Schema 难以表达的条件，例如块 ID 唯一性。单次文件上限 64 MiB。

备份使用独立的 format = axiom-backup 和 version = 1，包含课程元数据、整章文档、矢量笔迹、文字高亮、参数快照、进度、设置。单课程备份使用相同格式，省略用户全局设置。
## 交互模型与行内公式

基础模型为 capm_sml 和 two_assets。下列模型还接受可选的 setup，其中 ranges 将参数名映射到 min、max、step、initial，constants 为数值常量。利率和标准差按百分数输入，相关系数与权重按小数输入。

| model | 滑块 | 常量 |
| --- | --- | --- |
| risk_pricing | beta | rf、premium |
| market_beta | vol、rho | marketVol |
| two_asset_curve | rho | volA、volB、retA、retB |
| market_allocation | weight | rf、premium、marketVol |
| pricing_gap | beta、forecast | rf、premium |
| discounted_project | beta、cash | rf、premium、cost |

Markdown 和表格单元格里的行内公式使用 LaTeX 圆括号分隔符。在 JSON 字符串中按 JSON 规则转义反斜杠。
# brainstorm: 优化简历 DOCX 导出格式样式

## Goal

对比导出的 4 份 PDF 与 4 份 DOCX，找出 DOCX 导出与 PDF 预期效果之间的版式、样式、内容位置差距，并修复项目中的 DOCX 导出逻辑，使北极星、纯序、墨流、网格石板模板在头像、年龄、个人信息布局、教育经历、工作经历等关键区域尽量与 PDF 保持一致。

## What I already know

* 用户提供了 4 个 PDF 和 4 个 DOCX 作为对照样本。
* 样本按同名文件配对：`北极星`、`纯序`、`墨流`、`网格石板`。
* 北极星：个人信息处背景色应为 `#3157a4`，头像丢失，个人信息字体大小及布局不一致，年龄缺失。
* 纯序：头像丢失，个人信息字体大小及布局不一致，年龄缺失。
* 墨流：内容布局存在问题，例如教育经历的专业和学位、工作经历的角色等；头像丢失，年龄缺失。
* 网格石板：内容布局存在问题，例如教育经历的专业和学位、工作经历的角色等；头像丢失，年龄缺失。
* 用户要求尤其注意每个信息内容所在的位置；如果不确定应询问，而不是直接修改。
* DOCX 样本的 `word/media/` 为空，头像不是渲染失败，而是导出时没有嵌入图片。
* PDF 文本坐标确认：年龄与电话/邮箱/城市/期望薪资同级；北极星/纯序/墨流头像位于顶部右侧，网格石板头像位于左侧栏姓名上方。
* PDF 结构确认：教育经历使用“学校 + 学历/专业”同排；工作经历/项目经历的角色位于公司/项目名下一行，日期位于条目右侧。

## Assumptions (temporary)

* PDF 是期望的视觉基准，DOCX 是需要优化的导出结果。
* 同名或近似命名的 PDF/DOCX 互为对照组。
* 修复应优先落在现有 DOCX 导出代码中，而不是手工修改样本文件。

## Open Questions

* 样本文件的 PDF/DOCX 配对关系如果无法从文件名可靠推断，需要向用户确认。
* 某些内容位置如果 PDF 与 DOCX 差异无法从代码和样本自动判断，应向用户确认预期位置。

## Requirements (evolving)

* 对 4 套模板逐一比较 PDF 与 DOCX 导出差异。
* 修复 DOCX 中头像缺失问题。
* 修复 DOCX 中年龄缺失问题。
* 调整北极星个人信息区域背景色为 `#3157a4`。
* 调整北极星、纯序个人信息字体大小和布局，使其与 PDF 基准一致。
* 调整墨流、网格石板中教育经历、工作经历等字段的位置和布局。
* 保留现有服务端 DOCX 导出链路，不引入新依赖。

## Acceptance Criteria (evolving)

* [x] 4 套模板的 PDF/DOCX 配对明确。
* [x] 北极星 DOCX 个人信息背景色为 `#3157a4`。
* [x] 4 套模板 DOCX 均能在传入 data URL 头像时嵌入头像图片。
* [x] 4 套模板 DOCX 均能显示年龄。
* [x] 北极星、纯序个人信息布局改为带右侧头像的头部表格，联系信息按 PDF 同级排列。
* [x] 墨流、网格石板教育经历和工作经历字段位置按 PDF 规则调整。
* [x] 最小必要验证已执行，并记录结果。

## Definition of Done (team quality bar)

* Tests added/updated where appropriate.
* Lint / typecheck / relevant export verification green where feasible.
* Docs/notes updated if behavior changes.
* Rollout/rollback considered if risky.

## Out of Scope (explicit)

* 不重设计模板整体视觉风格。
* 不优化用户未提及且与 PDF/DOCX 对比无关的导出能力。
* 不手工篡改样本作为最终交付；样本仅用于对比和验证。

## Technical Notes

* 修改后端 DOCX 导出：`backend/src/main/java/com/smartresume/export/service/DocxResumeWriter.java`、`DocxExportService.java`、`DocxFonts.java`。
* 更新测试：`backend/src/test/java/com/smartresume/export/service/DocxExportServiceTest.java`。
* 样本对比方法：DOCX 用 OOXML/`python-docx` 检查文字、表格和 `word/media/`；PDF 用 `pdfjs-dist` 抽取文本坐标，并用 Playwright 查看本地 HTTP 服务下的 PDF 视觉位置。
* 验证命令：`mvn "-Dtest=com.smartresume.export.service.*Test" test`，结果 15 tests passed。
* 收口验证：`mvn test`，结果 94 tests passed。

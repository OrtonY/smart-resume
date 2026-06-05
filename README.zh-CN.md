# Smart Resume

[English](./README.md)

Smart Resume 是一个支持多用户的私有化简历工作台，用于创建、优化、分享、导出简历，并结合 AI 完成简历评分、翻译和模拟面试。项目由 Spring Boot 后端与 React + Vite 前端组成，覆盖账号访问、结构化编辑、实时预览、模板管理、公开分享、PDF 导出、投递记录和面试练习等完整流程。

## 核心亮点

- 多用户登录与注册，支持管理员控制公开注册开关
- 简历工作台支持创建、编辑、复制、删除、恢复、版本管理和分享
- 结构化编辑器支持实时预览、A4 预览、模块设置和模板管理
- 支持 AI 提供方配置、简历对话、简历评分、简历翻译和面试辅助
- 面试工作台支持目标公司信息、AI 回答建议、对话历史和面试报告
- 支持记录求职投递和简历交付进度
- BOSS 直聘浏览器插件支持抓取岗位信息、保存投递记录和生成 AI 求职信
- 提供两种 PDF 导出方式：
  - 浏览器端快速导出：基于 `html2canvas` 和 `jspdf`
  - 服务端高质量导出：基于 Playwright 和 Chromium

## 产品截图

### Web 端体验

#### 访问与工作台

| 登录 | 简历首页 |
|---|---|
| <img src="./docs/web/login.png" alt="Web 登录" width="420"> | <img src="./docs/web/resume-homepage.png" alt="Web 简历首页" width="420"> |

| AI 配置 | 回收站 |
|---|---|
| <img src="./docs/web/AI-config.png" alt="Web AI 配置" width="420"> | <img src="./docs/web/Recycle.png" alt="Web 回收站" width="420"> |

#### 简历编辑与预览

| 简历编辑器 | A4 预览 |
|---|---|
| <img src="./docs/web/resume-edit.png" alt="Web 简历编辑器" width="420"> | <img src="./docs/web/resume-a4-preview.png" alt="Web A4 简历预览" width="420"> |

| 简历对话 | 简历翻译 |
|---|---|
| <img src="./docs/web/resume-chat.png" alt="Web 简历对话" width="420"> | <img src="./docs/web/resume-translate.png" alt="Web 简历翻译" width="420"> |

| 评分概览 | 评分详情 | 评分建议 |
|---|---|---|
| <img src="./docs/web/resume-score1.png" alt="Web 简历评分概览" width="300"> | <img src="./docs/web/resume-score2.png" alt="Web 简历评分详情" width="300"> | <img src="./docs/web/resume-score3.png" alt="Web 简历评分建议" width="300"> |

| 简历版本 | 简历分享 | 分享详情 |
|---|---|---|
| <img src="./docs/web/resume-version.png" alt="Web 简历版本" width="300"> | <img src="./docs/web/resume-share.png" alt="Web 简历分享" width="300"> | <img src="./docs/web/resume-share-detail.png" alt="Web 分享详情" width="300"> |

#### 模板与投递

| 模板首页 | 模板编辑器 | 简历导入 |
|---|---|---|
| <img src="./docs/web/template-homepage.png" alt="Web 模板首页" width="300"> | <img src="./docs/web/template-edit.png" alt="Web 模板编辑器" width="300"> | <img src="./docs/web/template-resume-import.png" alt="Web 从模板导入简历" width="300"> |

| 投递记录 |
|---|
| <img src="./docs/web/submission.png" alt="Web 投递记录" width="420"> |

#### 面试练习

| 面试首页 | 面试对话 |
|---|---|
| <img src="./docs/web/interview-homepage.png" alt="Web 面试首页" width="420"> | <img src="./docs/web/interview-chat.png" alt="Web 面试对话" width="420"> |

| AI 回答 | 面试报告 1 | 面试报告 2 |
|---|---|---|
| <img src="./docs/web/interview-ai-answer.png" alt="Web 面试 AI 回答" width="300"> | <img src="./docs/web/interview-report1.png" alt="Web 面试报告概览" width="300"> | <img src="./docs/web/interview-report2.png" alt="Web 面试报告详情" width="300"> |

### Mobile 端体验

#### 访问与工作台

| 登录 | 简历首页 | AI 配置 |
|---|---|---|
| <img src="./docs/mobile/login.png" alt="Mobile 登录" width="220"> | <img src="./docs/mobile/resume-homepage.png" alt="Mobile 简历首页" width="220"> | <img src="./docs/mobile/AI-config.png" alt="Mobile AI 配置" width="220"> |

| 回收站 | 投递记录 | 简历设置 |
|---|---|---|
| <img src="./docs/mobile/Recycle.png" alt="Mobile 回收站" width="220"> | <img src="./docs/mobile/submission.png" alt="Mobile 投递记录" width="220"> | <img src="./docs/mobile/resume-settings.png" alt="Mobile 简历设置" width="220"> |

#### 简历编辑与分享

| 简历编辑器 | 简历预览 | 简历对话 |
|---|---|---|
| <img src="./docs/mobile/resume-edit.png" alt="Mobile 简历编辑器" width="220"> | <img src="./docs/mobile/resume-preview.png" alt="Mobile 简历预览" width="220"> | <img src="./docs/mobile/resume-chat.png" alt="Mobile 简历对话" width="220"> |

| 评分概览 | 评分详情 | 分享详情 |
|---|---|---|
| <img src="./docs/mobile/resume-score1.png" alt="Mobile 简历评分概览" width="220"> | <img src="./docs/mobile/resume-score2.png" alt="Mobile 简历评分详情" width="220"> | <img src="./docs/mobile/resume-share-detail.png" alt="Mobile 分享详情" width="220"> |

| 版本列表 | 版本详情 |
|---|---|
| <img src="./docs/mobile/resume-version1.png" alt="Mobile 简历版本列表" width="220"> | <img src="./docs/mobile/resume-version2.png" alt="Mobile 简历版本详情" width="220"> |

#### 模板与面试

| 模板首页 | 模板编辑器 |
|---|---|
| <img src="./docs/mobile/template-homepage.png" alt="Mobile 模板首页" width="220"> | <img src="./docs/mobile/template-edit.png" alt="Mobile 模板编辑器" width="220"> |

| 面试首页 | 目标公司 | 面试对话 |
|---|---|---|
| <img src="./docs/mobile/interview-homepage.png" alt="Mobile 面试首页" width="220"> | <img src="./docs/mobile/interview-target-company.png" alt="Mobile 目标公司" width="220"> | <img src="./docs/mobile/interview-chat.png" alt="Mobile 面试对话" width="220"> |

| AI 回答 | 面试报告 |
|---|---|
| <img src="./docs/mobile/interview-ai-answer.png" alt="Mobile 面试 AI 回答" width="220"> | <img src="./docs/mobile/interview-report.png" alt="Mobile 面试报告" width="220"> |

### 浏览器插件

| 登录 | 服务地址 |
|---|---|
| <img src="./docs/extension/login.png" alt="浏览器插件登录" width="220"> | <img src="./docs/extension/url-config.png" alt="浏览器插件服务地址配置" width="220"> |

| 岗位抓取 | AI 求职信 |
|---|---|
| <img src="./docs/extension/control-page.png" alt="浏览器插件 BOSS 岗位抓取" width="420"> | <img src="./docs/extension/ai-cover-letter.png" alt="浏览器插件 AI 求职信" width="420"> |

## 技术栈

### 后端

- Java 21
- Spring Boot 3.5.14
- PostgreSQL
- Flyway
- MyBatis-Flex
- Spring AI
- Playwright 1.60.0，用于高质量 PDF 导出

### 前端

- React 19.2
- TypeScript
- Vite 8
- Ant Design 6
- React Router 7
- `html2canvas` 和 `jspdf`，用于浏览器端快速 PDF 导出

### 浏览器插件

- TypeScript
- Vite
- Chrome extension APIs

## 仓库结构

```text
smart-resume/
|-- backend/   Spring Boot API、数据库迁移、领域服务和 PDF 导出
|-- browser-extension/  BOSS 直聘岗位抓取与求职信生成浏览器插件
|-- docs/      README 截图与辅助资源
|-- frontend/  工作台、编辑器、分享页、模板和面试流程前端应用
`-- .trellis/  项目流程、规范与任务记录
```

## 快速开始

### 环境要求

- Java 21
- Node.js 20.19+ 和 npm
- PostgreSQL

如需使用 AI 功能，还需要以下任意一种：

- OpenAI 兼容接口的 API Key
- DeepSeek API Key
- 本地 Ollama 服务

### 1. 克隆仓库

```bash
git clone <your-repo-url>
cd smart-resume
```

### 2. 准备 PostgreSQL

创建名为 `smart_resume` 的数据库：

```sql
CREATE DATABASE smart_resume;
```

后端默认配置如下：

- 数据库地址：`jdbc:postgresql://localhost:5432/smart_resume`
- 用户名：`postgres`
- 密码：`postgres`
- 后端端口：`8080`

可以通过环境变量覆盖：

```bash
export SMART_RESUME_DB_URL=jdbc:postgresql://localhost:5432/smart_resume
export SMART_RESUME_DB_USERNAME=postgres
export SMART_RESUME_DB_PASSWORD=postgres
export SMART_RESUME_BACKEND_PORT=8080
export SMART_RESUME_TOKEN_SECRET=change-this-secret
```

如果使用 PowerShell，请用 `$env:NAME='value'` 代替 `export`。

### 3. 安装前端依赖

```bash
cd frontend
npm install
cd ..
```

## 启动项目

### 方式 A：一键脚本

在项目根目录执行：

```bash
./start.sh
```

脚本会检查 Node.js 与 Java 版本、安装前端依赖、构建前端、把 `frontend/dist/` 同步到后端静态资源目录、构建后端 JAR、在缺失时安装 Playwright Chromium，并启动服务。

如果只想构建而不启动：

```bash
./build.sh
```

### 方式 B：开发模式

启动后端：

```bash
cd backend
./mvnw spring-boot:run
```

另开一个终端启动前端：

```bash
cd frontend
npm run dev
```

然后打开终端中输出的 Vite 地址，通常是 `http://localhost:5173`。

前端默认请求 `http://localhost:8080`。如果需要指向其他后端地址：

```bash
cd frontend
echo 'VITE_API_BASE_URL=http://localhost:8080' > .env.local
npm run dev
```

## 浏览器插件使用方式

BOSS 直聘助手是一个本地 Chrome/Edge 插件。它会读取当前打开的 BOSS 岗位页面，把抓取到的岗位信息发送到你的 Smart Resume 服务，并基于选中的简历创建投递记录或生成 AI 求职信。

### 构建与安装

1. 先启动 Smart Resume，可以使用一键脚本，也可以确保后端运行在 `http://localhost:8080`。
2. 构建插件：

```bash
cd browser-extension
npm install
npm run build
```

3. 打开 `chrome://extensions` 或 `edge://extensions`。
4. 开启开发者模式。
5. 选择“加载已解压的扩展程序”，并选择 `browser-extension/dist` 目录。

### 在 BOSS 直聘中使用

1. 打开 BOSS 直聘岗位页面，例如 `https://www.zhipin.com/web/geek/job*` 或 `https://www.zhipin.com/job_detail/*`。
2. 打开 Smart Resume BOSS Helper 插件。
3. 首次使用时填写 Smart Resume 服务地址，例如 `http://localhost:8080`，并保存配置。
4. 使用 Smart Resume 账号登录。
5. 选择一份简历。插件会从当前岗位页填充公司、岗位、JD、薪资、学历要求和工作时长备注。
6. 在同一个 BOSS 页面里切换不同岗位后，保存或生成前请点击插件里的“刷新”。
7. 点击“投递记录入库”可创建或复用 BOSS 投递记录；点击“生成求职信”可生成 AI 求职信。
8. 求职信生成后，可通过“职位信息 / 求职信”切换页返回查看，并重复复制已生成内容。

## 首次使用

1. 在浏览器中打开前端页面。
2. 使用默认管理员账号登录：用户名 `admin`，密码 `admin123`。
3. 登录后请立即在系统设置中修改默认密码。
4. 公开注册开启时，其他用户可以自行注册新账号。

## AI 提供方

AI 功能通过应用内界面配置。当前后端支持 OpenAI 兼容接口、DeepSeek 和 Ollama，主要用于简历对话、简历评分、简历翻译、面试生成、AI 回答建议和面试报告生成。

## PDF 导出说明

- 公开分享页支持无密码访问，也支持密码保护。
- 快速导出完全在浏览器端生成，输出为图片型 PDF。
- 高质量导出在后端通过 Playwright 和 Chromium 生成，输出真实文本、ATS 友好的 PDF。
- 开发模式下，如果尚未构建并复制 `frontend/dist/` 到后端静态资源目录，高质量导出可能返回 503。
- 前端还有单独的包级文档：[frontend/README.md](./frontend/README.md)。

## 开源协议

Smart Resume 基于 Apache License 2.0 发布。完整协议见 [LICENSE](./LICENSE)，归属说明见 [NOTICE](./NOTICE)。

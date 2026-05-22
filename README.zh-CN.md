# Smart Resume

[English](./README.md)

Smart Resume 是一个支持多用户的私有化简历工作台，用于编写、优化、分享简历，并结合 AI 完成评分和模拟面试。仓库由 Spring Boot 后端与 React + Vite 前端组成，围绕一条完整工作流展开：账号注册与登录、结构化编辑、实时预览、模板切换、简历评分、公开分享、PDF 导出与模拟面试。

## 核心亮点

- 多用户账号体系，支持注册与登录，管理员可控制是否开放注册
- 简历工作台支持多份简历的创建、复制、删除与恢复
- 结构化编辑器配合实时预览，支持模块显隐与布局调整
- 支持内置模板与自定义模板
- 内置 AI 配置、简历助手对话、简历评分与模拟面试能力
- 支持生成公开分享链接，并可选密码保护
- 支持浏览器端导出当前简历为 PDF

## 产品导览

### 访问与工作台

![登录页](./docs/login.png)

注册新账号或使用用户名密码登录，进入你的私人简历工作台。

![系统配置](./docs/System-Config.png)

在工作台中管理系统设置：开关公开注册（仅管理员）、修改密码、配置 AI 提供方。

![简历工作台](./docs/Resume-Homepage.png)

在主工作台中管理多份简历，并快速进入模板中心、面试中心、AI 配置与回收桶。

![回收桶](./docs/Resume-Recycle-Bin.png)

已删除的简历会进入回收桶，方便在同一工作流里直接恢复。

### 编辑与模板

![简历编辑器](./docs/Resume-Edit.png)

左侧维护结构化简历内容，右侧实时查看渲染后的简历预览效果。

![标准 A4 预览](./docs/Resume-Preview.png)

可打开标准 A4 预览窗口，在导出或分享前检查版式细节。

![模板中心](./docs/Resume-Template.png)

可以在内置模板之间切换，也可以从现有模板出发创建自定义版本。

### AI 辅助流程

![AI 配置](./docs/AI-Config.png)

通过界面配置 OpenAI 兼容接口、DeepSeek 或 Ollama，无需把提供方信息写死在前端代码中。

![AI 简历助手](./docs/Resume-Edit-AI-Chat.png)

在编辑器内直接与 AI 简历助手多轮对话，并按建议定向优化简历内容。

![简历评分](./docs/Resume-Score.png)

支持按通用质量标准或目标 JD 对简历进行评分，并查看结构化反馈结果。

### 分享与面试

![简历分享](./docs/Resume-Share.png)

生成公开分享链接，选择分享模式，并可按需启用密码保护。

![面试中心](./docs/Interview-Hompage.png)

创建模拟面试、跟踪面试进度，并查看生成后的面试报告。

![进行中的面试](./docs/Interview2.png)

在面试工作区中进行计时答题、查看企业信息补充，并直接提交当前轮回答。

![历史轮次回看](./docs/Interview.png)

需要复盘时，可以只读方式查看之前轮次的问题与回答记录。

![面试报告](./docs/Interview-Report.png)

查看生成后的面试报告，包括总分、维度评估、亮点总结和改进建议。

## 技术栈

### 后端

- Java 21
- Spring Boot 3.5
- PostgreSQL
- Flyway
- MyBatis-Flex
- Spring AI

### 前端

- React 19
- TypeScript
- Vite
- Ant Design
- React Router 7
- `html2canvas` + `jspdf`，用于前端侧 PDF 导出

## 仓库结构

```text
smart-resume/
|-- backend/   Spring Boot API、数据库迁移与领域服务
|-- docs/      README 截图与辅助资源
|-- frontend/  简历工作台、编辑器、分享页与面试流程前端应用
`-- .trellis/  项目流程、规范与任务记录
```

## 快速开始

### 环境要求

- Java 21
- Node.js 20.19+ 与 npm
- PostgreSQL

如需使用 AI 能力，还需要以下之一：

- OpenAI 兼容接口的 API Key
- DeepSeek API Key
- 或本地 Ollama 服务

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

如果本地环境不同，可以通过环境变量覆盖：

```bash
export SMART_RESUME_DB_URL=jdbc:postgresql://localhost:5432/smart_resume
export SMART_RESUME_DB_USERNAME=postgres
export SMART_RESUME_DB_PASSWORD=postgres
export SMART_RESUME_BACKEND_PORT=8080
export SMART_RESUME_TOKEN_SECRET=change-this-secret
```

如果你使用 PowerShell，请把 `export` 换成 `$env:变量名='值'`。

### 3. 安装前端依赖

```bash
cd frontend
npm install
cd ..
```

## 启动项目

请打开两个终端窗口。

### 终端 1：启动后端

```bash
cd backend
./mvnw spring-boot:run
```

启动时会自动执行 Flyway 数据库迁移。

### 终端 2：启动前端

```bash
cd frontend
npm run dev
```

然后在浏览器中打开 Vite 输出的地址，通常是 `http://localhost:5173`。

前端默认请求 `http://localhost:8080`。如果你需要改为其他后端地址，可以这样配置：

```bash
cd frontend
echo 'VITE_API_BASE_URL=http://localhost:8080' > .env.local
npm run dev
```

## 首次使用

当前后端与前端都启动后：

1. 在浏览器中打开前端页面。
2. 使用默认管理员账号登录：用户名 `admin`，密码 `admin123`。
3. 登录后请立即在系统配置中修改默认密码。
4. 公开注册默认开启，其他用户可自行注册新账号。

## AI 提供方

AI 功能通过应用内界面进行配置。当前后端支持：

- OpenAI 兼容接口
- DeepSeek
- Ollama

这些能力主要用于简历对话助手、简历评分、面试生成与面试报告生成。

## 补充说明

- 公开分享页既支持无密码访问，也支持密码保护。
- PDF 导出目前由前端完成，而不是依赖服务端渲染管线。
- 前端还有单独的包级文档可参考：[frontend/README.md](./frontend/README.md)。

## 开源协议

Smart Resume 基于 Apache License 2.0 发布。完整协议见 [LICENSE](./LICENSE)，归属说明见 [NOTICE](./NOTICE)。
